import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';

const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:4010';
const OUT = 'C:/Users/Admin/Documents/workspace/appski/docs/snow/captures-snow01';

const [t] = (await (await fetch(`${CDP}/json/list`)).json()).filter(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const consoleMsgs = [];
const net = [];
const reqs = new Map();

ws.onmessage = (m0) => {
  const m = JSON.parse(m0.data);
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
    consoleMsgs.push({ type: 'log.' + p.entry.level, text: p.entry.text });
  if (m.method === 'Network.requestWillBeSent') reqs.set(p.requestId, p.request.url);
  if (m.method === 'Network.responseReceived') net.push({ url: p.response.url, status: p.response.status });
};
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id; pending.set(n, { res, rej, method }); ws.send(JSON.stringify({ id: n, method, params }));
});
await new Promise(r => (ws.onopen = r));
await send('Runtime.enable'); await send('Log.enable');
await send('Page.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return r.exceptionDetails ? { error: JSON.stringify(r.exceptionDetails) } : r.result.value;
};
const reset = () => { consoleMsgs.length = 0; net.length = 0; reqs.clear(); };

async function clickLink(hrefIncludes, label) {
  reset();
  const before = await ev('location.href');
  const box = await ev(`(() => {
    const el = [...document.querySelectorAll('a')].find(a => (a.getAttribute('href')||'') === ${JSON.stringify(hrefIncludes)});
    if (!el) return null;
    el.scrollIntoView({block:'center'});
    const r = el.getBoundingClientRect();
    return JSON.stringify({x: r.x + r.width/2, y: r.y + r.height/2, text: el.textContent.trim().slice(0,60), href: el.getAttribute('href')});
  })()`);
  if (!box) return { label, error: 'LINK NOT FOUND: ' + hrefIncludes, hrefBefore: before };
  const b = JSON.parse(box);
  for (const type of ['mousePressed', 'mouseReleased'])
    await send('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
  await sleep(3500);
  return {
    label, clickedText: b.text, clickedHref: b.href,
    hrefBefore: before,
    hrefAfter: await ev('location.href'),
    h1: await ev(`document.querySelector('h1')?.textContent?.trim() ?? null`),
    documentRequestsAfter: net.filter(n => n.url.endsWith('/') || /^http:\/\/localhost:4010\/[a-z\/-]+$/.test(n.url) && !/\.(js|css|jpg|png)$/.test(n.url)),
    console: [...consoleMsgs],
  };
}

const out = {};

// Step 1: load /nieve directly (entry point of the SNOW module), then do CLIENT-SIDE clicks.
await reset();
await send('Page.navigate', { url: BASE + '/nieve' });
await sleep(4000);
out.entry = { url: await ev('location.href'), h1: await ev(`document.querySelector('h1')?.textContent?.trim()`) };

// Step 2: click "Explorar todas las estaciones" -> /nieve/estaciones
out.click_dashboard_to_estaciones = await clickLink('/nieve/estaciones', 'dashboard -> estaciones');

// Step 3: click station card "Baqueira Beret" -> detail
out.click_estaciones_to_detalle = await clickLink('/nieve/estaciones/baqueira-beret', 'estaciones -> detalle baqueira');

// Step 4: click back link -> /nieve/estaciones
out.click_detalle_back = await clickLink('/nieve/estaciones', 'detalle -> estaciones (volver)');

// Step 5: browser back button (history API client nav)
await reset();
const beforeBack = await ev('location.href');
await ev('history.back()');
await sleep(3000);
out.history_back = { from: beforeBack, to: await ev('location.href'), h1: await ev(`document.querySelector('h1')?.textContent?.trim()`), console: [...consoleMsgs] };

writeFileSync(`${OUT}/qa-clicks.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
ws.close();
