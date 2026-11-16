import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:4010';
const OUT = 'C:/Users/Admin/Documents/workspace/appski/docs/snow/captures-snow01';

const [t] = (await (await fetch(`${CDP}/json/list`)).json()).filter(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0, sid = null;
const pending = new Map();
const consoleMsgs = [];
const net = [];
const reqs = new Map();

ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej, method } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result);
    return;
  }
  const p = m.params || {};
  if (m.method === 'Runtime.consoleAPICalled')
    consoleMsgs.push({ type: p.type, text: (p.args || []).map(a => a.value ?? a.description ?? a.type).join(' ') });
  if (m.method === 'Runtime.exceptionThrown')
    consoleMsgs.push({ type: 'exceptionThrown', text: p.exceptionDetails?.exception?.description || p.exceptionDetails?.text });
  if (m.method === 'Log.entryAdded' && ['error', 'warning'].includes(p.entry?.level))
    consoleMsgs.push({ type: 'log.' + p.entry.level, text: p.entry.text, url: p.entry.url });
  if (m.method === 'Network.requestWillBeSent') reqs.set(p.requestId, p.request.url);
  if (m.method === 'Network.responseReceived') net.push({ url: p.response.url, status: p.response.status });
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id; pending.set(n, { res, rej, method }); ws.send(JSON.stringify({ id: n, method, params }));
});
await new Promise(r => (ws.onopen = r));
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Network.enable');

const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) return { error: JSON.stringify(r.exceptionDetails) };
  return r.result.value;
};
const reset = () => { consoleMsgs.length = 0; net.length = 0; reqs.clear(); };
const out = {};

// --- TEST A: pure SSR, JavaScript disabled ---
await send('Emulation.setScriptExecutionDisabled', { value: true });
reset();
await send('Page.navigate', { url: BASE + '/nieve/estaciones' });
await sleep(2500);
out.ssrNoJs = await ev(`JSON.stringify({
  h1: document.querySelector('h1')?.textContent?.trim(),
  hasStations: document.body.innerText.includes('Baqueira Beret') && document.body.innerText.includes('Formigal-Panticosa') && document.body.innerText.includes('Grandvalira'),
  ngServerContext: document.querySelector('[ng-server-context]')?.getAttribute('ng-server-context') || null,
  innerTextLen: document.body.innerText.length,
  hasAppRoot: !!document.querySelector('app-root'),
  scriptsCount: document.querySelectorAll('script').length
})`);
await send('Emulation.setScriptExecutionDisabled', { value: false });

// --- TEST B: deep-link refresh (F5) on detail route ---
reset();
await send('Page.navigate', { url: BASE + '/nieve/estaciones/baqueira-beret' });
await sleep(4000);
const beforeReload = await ev(`JSON.stringify({ url:location.href, h1:document.querySelector('h1')?.textContent?.trim() })`);
await send('Page.reload', { ignoreCache: true });
await sleep(4000);
out.deepLinkF5 = {
  before: JSON.parse(beforeReload),
  after: await ev(`JSON.stringify({
    url: location.href,
    h1: document.querySelector('h1')?.textContent?.trim(),
    ngServerContextAfterHydration: document.querySelector('[ng-server-context]')?.getAttribute('ng-server-context') ?? 'REMOVED(hydrated)',
    bodyHasBaqueira: document.body.innerText.includes('Baqueira Beret'),
    docStatus: null
  })`),
  docResponse: net.filter(n => reqs.get([...reqs.keys()].find(k => reqs.get(k) === n.url)) ? true : false).find(n => n.url.includes('baqueira')),
  console: [...consoleMsgs],
};

// --- TEST C: real CLICK navigation client side ---
reset();
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: BASE + '/' });
await sleep(4000);
const linkInfo = await ev(`(() => {
  const as = [...document.querySelectorAll('a')];
  const snow = as.filter(a => (a.getAttribute('href')||'').includes('/nieve'));
  return JSON.stringify({ total: as.length, snowLinks: snow.slice(0,10).map(a => ({href: a.getAttribute('href'), text: a.textContent.trim().slice(0,50)})) });
})()`);
out.linksOnHome = JSON.parse(linkInfo);

async function clickNav(selectorExpr, label) {
  reset();
  const before = await ev('location.href');
  const box = await ev(`(() => {
    const el = ${selectorExpr};
    if (!el) return null;
    el.scrollIntoView({block:'center'});
    const r = el.getBoundingClientRect();
    return JSON.stringify({x: r.x + r.width/2, y: r.y + r.height/2, text: el.textContent.trim().slice(0,60), href: el.getAttribute('href')});
  })()`);
  if (!box) return { label, error: 'element not found', selectorExpr };
  const b = JSON.parse(box);
  for (const type of ['mousePressed', 'mouseReleased'])
    await send('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await sleep(3500);
  return {
    label, clicked: b,
    hrefBefore: before,
    hrefAfter: await ev('location.href'),
    h1: await ev(`document.querySelector('h1')?.textContent?.trim() ?? null`),
    clientNavDocs: net.filter(n => n.url.includes('/nieve') && n.status),
    console: [...consoleMsgs],
  };
}

// click a /nieve link on the home page
out.clickToNieve = await clickNav(`[...document.querySelectorAll('a')].find(a => (a.getAttribute('href')||'').match(/^\\/nieve\\/?$/))`, 'home -> /nieve');
// from dashboard, click stations link
out.clickToEstaciones = await clickNav(`[...document.querySelectorAll('a')].find(a => (a.getAttribute('href')||'').includes('/nieve/estaciones'))`, '/nieve -> /nieve/estaciones');

writeFileSync(`${OUT}/qa-nav.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await send('Emulation.clearDeviceMetricsOverride');
ws.close();
