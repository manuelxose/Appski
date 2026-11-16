/**
 * Sonda de verificación SSR (SNOW-01 / t2).
 * Uso: node scripts/snow-ssr-probe.mjs [baseUrl]
 * Imprime, por ruta: status, bytes, <h1>, y señales de contenido SSR real.
 * NO ejecuta JS del cliente: analiza el HTML CRUDO devuelto por el servidor.
 */
const base = process.argv[2] ?? 'http://127.0.0.1:4010';

const ROUTES = [
  '/',
  '/nieve',
  '/nieve/estaciones',
  '/nieve/estaciones/baqueira-beret',
  '/nieve/comparar',
  '/nieve/mapa',
  '/nieve/webcams',
  '/ruta-que-no-existe',
];

const API = [
  '/api/snow/v1/stations',
  '/api/snow/v1/stations/baqueira-beret',
  '/api/snow/v1/stations/baqueira-beret/report',
];

const strip = (s) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

function firstMatch(html, re) {
  const m = html.match(re);
  return m ? strip(m[1]) : null;
}

async function probe(path) {
  const res = await fetch(base + path, { redirect: 'manual' });
  const html = await res.text();
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => strip(m[1]));
  const h2s = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => strip(m[1]));
  // Shell vacío = el app-root no contiene marcado renderizado.
  const appRoot = firstMatch(html, /<app-root\b[^>]*>([\s\S]*?)<\/app-root>/i);
  const appRootEmpty = appRoot === null || appRoot.length === 0;
  return {
    path,
    status: res.status,
    bytes: Buffer.byteLength(html, 'utf8'),
    contentType: res.headers.get('content-type'),
    h1: h1s,
    h2: h2s.slice(0, 6),
    appRootEmpty,
    appRootChars: appRoot === null ? 0 : appRoot.length,
    mentionsBaqueira: /Baqueira/i.test(html),
    mentionsFormigal: /Formigal/i.test(html),
    mentionsGrandvalira: /Grandvalira/i.test(html),
    noData: /no_data|No hay datos|sin datos|Sin datos/i.test(html),
    html,
  };
}

const out = [];
for (const path of ROUTES) {
  const r = await probe(path);
  const { html, ...rest } = r; // no volcar el HTML completo en la salida
  out.push(rest);
  console.log(
    `${path.padEnd(32)} status=${String(r.status).padEnd(3)} bytes=${String(r.bytes).padEnd(7)} appRootEmpty=${r.appRootEmpty ? 'YES' : 'no'} rootChars=${r.appRootChars}`
  );
  console.log(`   h1: ${JSON.stringify(r.h1)}`);
  if (r.h2.length) console.log(`   h2: ${JSON.stringify(r.h2)}`);
  const flags = [];
  if (r.mentionsBaqueira) flags.push('Baqueira');
  if (r.mentionsFormigal) flags.push('Formigal');
  if (r.mentionsGrandvalira) flags.push('Grandvalira');
  if (r.noData) flags.push('no_data');
  console.log(`   señales: ${flags.length ? flags.join(', ') : '(ninguna)'}`);
}

console.log('\n=== API /api/snow/v1 ===');
for (const path of API) {
  const res = await fetch(base + path);
  const body = await res.text();
  console.log(`${path.padEnd(52)} status=${res.status} bytes=${Buffer.byteLength(body, 'utf8')}`);
  if (body.length <= 2000) console.log(`   ${body}`);
  else console.log(`   ${body.slice(0, 1200)}…`);
}
