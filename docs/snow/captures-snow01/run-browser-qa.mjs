// SNOW-01 browser QA driver over raw CDP (Chrome headless 9222).
// Captures console/network/screenshots for desktop 1440x900 and mobile 390x844.
import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CDP = 'http://127.0.0.1:9222';
const BASE = 'http://localhost:4010';
const OUT = 'C:/Users/Admin/Documents/workspace/appski/docs/snow/captures-snow01';
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false, ua: null },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
};

let ws, msgId = 0;
const pending = new Map();
const events = [];
const consoleMsgs = [];
const network = [];
const requests = new Map();

function send(method, params = {}, sessionId) {
  const id = ++msgId;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, method });
    ws.send(JSON.stringify(payload));
  });
}

function connect(url) {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(url);
    ws.onopen = () => resolve();
    ws.onerror = (e) => reject(new Error('ws error ' + e.message));
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) {
        const { resolve, reject, method } = pending.get(m.id);
        pending.delete(m.id);
        m.error ? reject(new Error(`${method}: ${JSON.stringify(m.error)}`)) : resolve(m.result);
        return;
      }
      onEvent(m);
    };
  });
}

let sessionId = null;
function onEvent(m) {
  const p = m.params || {};
  switch (m.method) {
    case 'Runtime.consoleAPICalled':
      consoleMsgs.push({
        type: p.type,
        text: (p.args || []).map(a => a.value ?? a.description ?? a.unserializableValue ?? a.type).join(' '),
        url: p.stackTrace?.callFrames?.[0]?.url || null,
        line: p.stackTrace?.callFrames?.[0]?.lineNumber ?? null,
      });
      break;
    case 'Runtime.exceptionThrown': {
      const d = p.exceptionDetails || {};
      consoleMsgs.push({ type: 'exceptionThrown', text: d.exception?.description || d.text, url: d.url, line: d.lineNumber });
      break;
    }
    case 'Log.entryAdded': {
      const e = p.entry || {};
      if (e.level === 'error' || e.level === 'warning')
        consoleMsgs.push({ type: `log.${e.level}`, text: e.text, url: e.url, line: e.lineNumber });
      break;
    }
    case 'Network.requestWillBeSent':
      requests.set(p.requestId, { url: p.request.url, method: p.request.method, type: p.type });
      break;
    case 'Network.responseReceived': {
      const r = requests.get(p.requestId) || { url: p.response.url };
      network.push({ url: p.response.url, status: p.response.status, mime: p.response.mimeType, type: p.type, resource: r.type });
      break;
    }
    case 'Network.loadingFailed':
      network.push({ url: requests.get(p.requestId)?.url || p.requestId, status: null, failed: p.errorText, type: p.type });
      break;
  }
}

async function main() {
  const [target] = (await (await fetch(`${CDP}/json/list`)).json()).filter(t => t.type === 'page');
  await connect(target.webSocketDebuggerUrl);

  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });

  const results = {};

  async function setViewport(vp) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width, height: vp.height, deviceScaleFactor: vp.deviceScaleFactor,
      mobile: vp.mobile, screenWidth: vp.width, screenHeight: vp.height,
    });
    if (vp.ua) await send('Network.setUserAgentOverride', { userAgent: vp.ua, acceptLanguage: 'es-ES,es' });
    else await send('Network.setUserAgentOverride', { userAgent: '' , acceptLanguage: 'es-ES,es' });
  }

  async function reset() { consoleMsgs.length = 0; network.length = 0; requests.clear(); }

  async function navigate(url) {
    const loaded = new Promise(res => {
      const h = (m) => { if (m.method === 'Page.loadEventFired') { ws.removeEventListener('message', h); res(); } };
      // handled via onEvent below
    });
    await send('Page.navigate', { url });
    await sleep(4000); // SSR + hydration settle
  }

  async function evalJs(expr) {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }

  async function shot(name) {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const buf = Buffer.from(r.data, 'base64');
    writeFileSync(`${OUT}/${name}`, buf);
    return buf.length;
  }

  const pages = [
    { key: 'portada', url: '/' },
    { key: 'nieve-dashboard', url: '/nieve' },
    { key: 'nieve-estaciones', url: '/nieve/estaciones' },
    { key: 'nieve-detalle', url: '/nieve/estaciones/baqueira-beret' },
  ];

  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    results[vpName] = {};
    await setViewport(vp);
    for (const page of pages) {
      await reset();
      await navigate(BASE + page.url);
      const name = `snow01-${page.key}-${vpName}.png`;
      const bytes = await shot(name);
      const dom = await evalJs(`JSON.stringify({
        title: document.title,
        url: location.href,
        h1: document.querySelector('h1')?.textContent?.trim() ?? null,
        bodyLen: document.body.innerText.length,
        ssrBeforeJs: window.__snowQaSsrMarker ?? null,
        hasNgServer: !!document.querySelector('[ng-server-context]'),
        text: document.body.innerText.slice(0, 1200)
      })`);
      // hydrate check: Angular removes ng-server-context after hydration
      results[vpName][page.key] = {
        file: name, bytes,
        console: [...consoleMsgs],
        http: network.filter(n => n.resource === 'Document' || n.resource === 'XHR' || n.resource === 'Fetch'),
        badStatus: network.filter(n => n.status === null || n.status >= 400),
        jsCss: network.filter(n => /\.(js|css)(\?|$)/.test(n.url)),
        dom: JSON.parse(dom),
      };
    }
  }

  writeFileSync(`${OUT}/qa-results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  await send('Emulation.clearDeviceMetricsOverride');
  ws.close();
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
