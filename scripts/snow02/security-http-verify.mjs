#!/usr/bin/env node
/**
 * SNOW-02 — verificación HTTP de SEGURIDAD del borde v1 (antiabuso, no filtrado).
 *
 * Arranca el servidor nieve (source, el MISMO router que producción) con un
 * dataDir temporal y un token canario, y demuestra con CÓDIGOS REALES:
 *
 *   401  escritura admin sin token / token inválido / solo whitespace / formato
 *        erróneo / esquema `bearer` minúsculas / `Basic` — con recuento de
 *        registros ANTES/DESPUÉS (un rechazo no persiste nada);
 *   400  cuerpo inválido (400 tipado) y JSON malformado;
 *   413  cuerpo >64kb (tipado, sin stack);
 *   429  límite de tasa sobre escritura admin y lectura costosa;
 *   /config NO filtra nombres de variables de entorno ni el token.
 *
 * Uso: node scripts/snow02/security-http-verify.mjs
 * Salida: exit 0 sólo si todos los checks pasan.
 */
import { createServer } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnNoPipe, waitUntilReady } from './lib/child.mjs';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
// Rutas RELATIVAS desde ROOT (el `cwd` del proceso hijo): es exactamente la forma
// que usan las pruebas y el verify canónico. Una ruta Windows absoluta en
// `--import` se interpretaría como esquema `c:` y fallaría.
const SERVER = './scripts/snow02/snow-api-server.mjs';
const LOADER = './scripts/snow/ts-loader.mjs';
const TOKEN = 'snow02-security-canary-token';
const SECRET_PATTERNS = ['_API_KEY', '_TOKEN', 'BASE_URL', 'SNOW_ADMIN_TOKEN'];

const results = [];
let failures = 0;

function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  if (!ok) {
    failures += 1;
    console.error(`FAIL ${name} :: ${detail}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

function freePort() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.unref();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

async function startServer(port, dataDir) {
  // Sin pipes: el runner confined de ENGINE-04 deniega crear pipes (EPERM medido).
  const child = spawnNoPipe(
    process.execPath,
    ['--experimental-transform-types', '--import', LOADER, SERVER],
    {
      cwd: ROOT,
      env: { ...process.env, PORT: String(port), SNOW_DATA_DIR: dataDir, SNOW_ADMIN_TOKEN: TOKEN, NODE_ENV: 'production' },
      stdio: 'ignore',
    },
  );
  const base = `http://127.0.0.1:${port}`;
  await waitUntilReady(
    async () => {
      const r = await fetch(`${base}/api/snow/v1/stations`);
      return r.status > 0 ? true : null;
    },
    {
      timeoutMs: 30_000,
      onDead: () => (child.exited ? new Error('el servidor terminó antes de escuchar') : null),
    },
  );
  return { child, base, getLog: () => '(stdio no capturado en contexto confined)' };
}

async function stopServer(srv) {
  if (!srv?.child || srv.child.exited) return;
  srv.child.kill('SIGKILL');
  await srv.child.wait();
}

async function getJson(url, init) {
  const r = await fetch(url, init);
  let body = null;
  const text = await r.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _nonJson: text.slice(0, 200) };
  }
  return { status: r.status, body, text, headers: r.headers };
}

function assertNoLeak(text, label) {
  for (const p of SECRET_PATTERNS) check(`${label} no filtra '${p}'`, !text.includes(p), 'pattern in body');
  check(`${label} no filtra el token`, !text.includes(TOKEN), 'token in body');
  check(`${label} no filtra stack`, !text.includes('node_modules') && !text.includes('at Object.'), 'stack markers in body');
}

function validReport() {
  return {
    stationSlug: 'baqueira-beret',
    observedAt: '2026-11-16T08:00:00.000Z',
    sourceUrl: 'https://www.baqueira.es/parte-de-nieve',
    author: 'Servicio de nieve Baqueira',
    confidence: 1,
    operational: { liftsOpen: 12, liftsTotal: 33, slopesOpen: 40, slopesTotal: 120, kmOpen: 35, kmTotal: 160 },
    snow: { baseCm: 60, midCm: 90, topCm: 120, quality: 'powder' },
  };
}

function validStation() {
  return {
    slug: 'baqueira-beret', name: 'Baqueira Beret', country: 'ES', region: 'Valle de Arán',
    discipline: 'alpine', lat: 42.7, lng: 0.93, altitudeBaseM: 1500, altitudeTopM: 2510,
    website: null, seasonOpen: null, seasonClose: null, seasonConfirmed: false,
  };
}

async function main() {
  const dataDir = mkdtempSync(join(tmpdir(), 'snow02-security-'));
  const port = await freePort();
  const srv = await startServer(port, dataDir);
  const S = `${srv.base}/api/snow/v1`;
  console.log(`servidor ${srv.base} · SNOW_DATA_DIR=${dataDir} · token canario cargado`);

  const AUTH = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };
  const reportCount = async () => {
    const r = await getJson(`${S}/admin/reports`, { headers: { authorization: `Bearer ${TOKEN}` } });
    return Array.isArray(r.body?.reports) ? r.body.reports.length : -1;
  };

  try {
    // ---- sanidad ----
    const stations = await getJson(`${S}/stations`);
    check('GET /v1/stations => 200', stations.status === 200, `status=${stations.status}`);

    // ---- 1. Rechazos de AUTH (401) con conteo antes/después ----
    const beforeAuth = await reportCount();
    check('conteo de partes inicial legible', beforeAuth >= 0, `reports=${beforeAuth}`);
    const badAuths = [
      ['sin cabecera', undefined],
      ['token vacío', ''],
      ['solo whitespace', '   '],
      ['token sin esquema', TOKEN],
      ['esquema Token (no Bearer)', `Token ${TOKEN}`],
      ['Bearer sin valor', 'Bearer'],
      ['bearer minúsculas', `bearer ${TOKEN}`],
      ['Basic', `Basic ${Buffer.from(TOKEN).toString('base64')}`],
    ];
    for (const [label, header] of badAuths) {
      const headers = { 'content-type': 'application/json' };
      if (header !== undefined) headers['authorization'] = header;
      const r = await getJson(`${S}/admin/reports`, { method: 'POST', headers, body: JSON.stringify(validReport()) });
      check(`POST /admin/reports ${label} => 401`, r.status === 401, `status=${r.status}`);
    }
    const afterAuth = await reportCount();
    check('los 401 NO modifican registros (conteo antes/después)', afterAuth === beforeAuth, `before=${beforeAuth} after=${afterAuth}`);

    // ---- 2. 400 tipado (cuerpo inválido) y JSON malformado ----
    const bad = await getJson(`${S}/admin/reports`, {
      method: 'POST', headers: AUTH, body: JSON.stringify({ ...validReport(), confidence: 7 }),
    });
    check('POST confidence fuera de rango => 400 tipado', bad.status === 400 && bad.body?.error === 'invalid', `status=${bad.status}`);
    const malformed = await getJson(`${S}/admin/reports`, {
      method: 'POST', headers: AUTH, body: '{"stationSlug":',
    });
    check('POST JSON malformado => 400 tipado', malformed.status === 400 && malformed.body?.error === 'invalid', `status=${malformed.status}`);
    assertNoLeak(malformed.text, '400 malformado');
    const afterBad = await reportCount();
    check('los 400 NO modifican registros', afterBad === beforeAuth, `before=${beforeAuth} after=${afterBad}`);

    // ---- 3. 413 cuerpo >64kb ----
    const big = await getJson(`${S}/admin/reports`, {
      method: 'POST', headers: AUTH, body: JSON.stringify({ ...validReport(), author: 'x'.repeat(70 * 1024) }),
    });
    check('POST cuerpo >64kb => 413', big.status === 413, `status=${big.status}`);
    assertNoLeak(big.text, '413 tamaño');
    const afterBig = await reportCount();
    check('el 413 NO escribe', afterBig === beforeAuth, `before=${beforeAuth} after=${afterBig}`);

    // ---- 4. Límite de tasa en escritura admin (429) ----
    const stationBody = JSON.stringify(validStation());
    let putOk = true;
    for (let i = 1; i <= 20; i += 1) {
      const r = await getJson(`${S}/admin/stations/baqueira-beret`, { method: 'PUT', headers: AUTH, body: stationBody });
      if (r.status !== 200) putOk = false;
    }
    check('20 PUT admin dentro del límite => 200', putOk, '20 puts');
    const putBlocked = await getJson(`${S}/admin/stations/baqueira-beret`, { method: 'PUT', headers: AUTH, body: stationBody });
    check('21ª escritura admin => 429 con Retry-After', putBlocked.status === 429 && Boolean(putBlocked.headers.get('retry-after')), `status=${putBlocked.status}`);
    assertNoLeak(putBlocked.text, '429 escritura admin');

    // ---- 5. Límite de tasa en lectura costosa (429) ----
    let searchOk = true;
    for (let i = 1; i <= 100; i += 1) {
      const r = await getJson(`${S}/search?q=baqueira`);
      if (r.status !== 200) searchOk = false;
    }
    check('100 GET /search dentro del límite => 200', searchOk, '100 gets');
    const searchBlocked = await getJson(`${S}/search?q=baqueira`);
    check('101ª lectura costosa => 429', searchBlocked.status === 429, `status=${searchBlocked.status}`);
    assertNoLeak(searchBlocked.text, '429 lectura costosa');

    // ---- 6. /config no filtra ----
    const cfg = await getJson(`${S}/config`, { headers: { authorization: `Bearer ${TOKEN}` } });
    check('GET /config con token => 200', cfg.status === 200, `status=${cfg.status}`);
    assertNoLeak(cfg.text, '/config');
  } catch (err) {
    check('ejecución sin excepción', false, err instanceof Error ? err.message : String(err));
  } finally {
    await stopServer(srv);
    rmSync(dataDir, { recursive: true, force: true });
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\nchecks=${results.length} passed=${passed} failed=${failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
