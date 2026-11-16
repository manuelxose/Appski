#!/usr/bin/env node
/**
 * SNOW-02 — sonda de SEGURIDAD del REVISOR independiente contra el BUNDLE real.
 *
 * A diferencia de `security-http-verify.mjs` (que arranca el SOURCE vía
 * `snow-api-server.mjs`), esta sonda arranca `dist/web-ssr/server/server.mjs`
 * (el bundle de producción) y comprueba, con códigos reales:
 *
 *   - matriz de auth (sin cabecera / inválido / vacío / whitespace / esquema
 *     erróneo / bearer minúsculas / Basic) ⇒ 401 y el conteo NO cambia;
 *   - los rechazos 400/413 no escriben (conteo en disco antes/después);
 *   - /config con token no filtra nombres de variables de entorno, token ni stack;
 *   - 413 cuerpo >64kb y 400 JSON malformado sin stack;
 *   - límite de tasa REAL sobre escritura admin (20 dentro / 21ª ⇒ 429 + Retry-After)
 *     y sobre lectura costosa (100 dentro / 101ª ⇒ 429), contra el BUNDLE;
 *   - un rechazo no persiste centinela (-99) y la honestidad null≠0 se conserva.
 *
 * Uso: node docs/snow/snow02-evidence/reviewer-security-bundle.mjs
 * Salida: exit 0 sólo si todos los checks pasan.
 * Evidencia: docs/snow/snow02-evidence/reviewer-security-bundle.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  authHeaders,
  cleanupDir,
  http,
  startBundle,
  stopBundle,
  tempDataDir,
} from '../../../scripts/snow02/lib/server.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'reviewer-security-bundle.json');
const CANARY = 'reviewer-canary-token-7f3a';
const SECRETS = ['AEMET_API_KEY', 'METEOFRANCE_API_KEY', 'C3S_API_KEY', 'CLMS_API_KEY', 'PROTOMAPS_BASE_URL', 'SNOW_ADMIN_TOKEN'];

const results = [];
let failures = 0;
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: detail ?? null });
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === undefined || detail === null ? '' : ` :: ${JSON.stringify(detail).slice(0, 180)}`}`);
}
function noStack(text) {
  return !/at .*\.(ts|mjs):\d+/.test(text) && !text.includes('node_modules');
}

const reportBody = () => ({
  stationSlug: 'baqueira-beret',
  observedAt: '2026-11-16T08:00:00.000Z',
  sourceUrl: 'https://www.baqueira.es/parte-de-nieve',
  author: 'revisor',
  confidence: 0.8,
  operational: { liftsOpen: 12, liftsTotal: 21, pistesOpen: 40, pistesTotal: 118, kmOpen: 40, kmTotal: 161, isOpen: true, byLevel: null },
  snow: { baseCm: 60, midCm: 90, topCm: 120, newSnow24hCm: 15, quality: 'powder' },
});
const stationBody = () => ({
  slug: 'baqueira-beret', name: 'Baqueira Beret', country: 'ES', region: 'Valle de Arán',
  discipline: 'alpine', lat: 42.7, lng: 0.93, altitudeBaseM: 1500, altitudeTopM: 2510,
  website: null, seasonOpen: null, seasonClose: null, seasonConfirmed: false,
});

const dataDir = tempDataDir('snow02-review-');
let srv = null;
try {
  srv = await startBundle({ dataDir, token: CANARY });
  const S = `${srv.base}/api/snow/v1`;
  const AUTH = { authorization: `Bearer ${CANARY}`, 'content-type': 'application/json' };

  const reportCount = async () => {
    const r = await http(srv.base, '/api/snow/v1/admin/reports', { headers: { authorization: `Bearer ${CANARY}` } });
    return Array.isArray(r.json?.reports) ? r.json.reports.length : -1;
  };
  const diskCount = () => {
    const p = join(dataDir, 'snow-reports.json');
    if (!existsSync(p)) return -1;
    try { return (JSON.parse(readFileSync(p, 'utf8')).records ?? []).length; } catch { return -2; }
  };

  // ---- sanidad ----
  const s0 = await http(srv.base, '/api/snow/v1/stations');
  check('GET /v1/stations => 200', s0.status === 200, s0.status);

  // ---- 1. matriz de auth ⇒ 401 y conteo inalterado ----
  const before = await reportCount();
  const auths = [
    ['sin cabecera', undefined],
    ['token vacío', ''],
    ['solo whitespace', '   '],
    ['token sin esquema', CANARY],
    ['esquema erróneo', `Token ${CANARY}`],
    ['Bearer sin valor', 'Bearer'],
    ['bearer minúsculas', `bearer ${CANARY}`],
    ['Basic', `Basic ${Buffer.from(CANARY).toString('base64')}`],
  ];
  for (const [label, header] of auths) {
    const headers = { 'content-type': 'application/json' };
    if (header !== undefined) headers['authorization'] = header;
    const r = await http(srv.base, '/api/snow/v1/admin/reports', { method: 'POST', headers, body: JSON.stringify(reportBody()) });
    check(`POST /admin/reports ${label} => 401`, r.status === 401, r.status);
  }
  const afterAuth = await reportCount();
  check('los 401 NO cambian el conteo de partes', afterAuth === before, { before, after: afterAuth });

  // ---- 2. 400 (centinela / malformado) y 413 no escriben ----
  const diskBefore = diskCount();
  const sentinel = await http(srv.base, '/api/snow/v1/admin/reports', {
    method: 'POST', headers: AUTH, body: JSON.stringify({ ...reportBody(), snow: { baseCm: -99 } }),
  });
  check('POST con snow.baseCm=-99 => 400 nombrando snow.baseCm', sentinel.status === 400 && sentinel.json?.fields?.some((f) => f.field === 'snow.baseCm'), { status: sentinel.status, fields: sentinel.json?.fields });
  const malformed = await http(srv.base, '/api/snow/v1/admin/reports', { method: 'POST', headers: AUTH, body: '{"stationSlug":' });
  check('POST JSON malformado => 400 sin stack', malformed.status === 400 && noStack(malformed.text), malformed.status);
  const big = await http(srv.base, '/api/snow/v1/admin/reports', { method: 'POST', headers: AUTH, body: JSON.stringify({ ...reportBody(), author: 'x'.repeat(70 * 1024) }) });
  check('POST >64kb => 413 sin stack', big.status === 413 && noStack(big.text), big.status);
  const diskAfter = diskCount();
  check('los rechazos 400/413 NO cambian el conteo EN DISCO', diskAfter === diskBefore, { before: diskBefore, after: diskAfter });

  // ---- 3. /config no filtra ----
  const cfg = await http(srv.base, '/api/snow/v1/config', { headers: { authorization: `Bearer ${CANARY}` } });
  check('GET /config => 200', cfg.status === 200, cfg.status);
  const leaks = SECRETS.filter((s) => cfg.text.includes(s));
  check('/config no filtra nombres de env ni token', leaks.length === 0, leaks);
  check('/config sin stack', noStack(cfg.text), 'stack');

  // ---- 4. límite de tasa admin (20 dentro, 21ª 429) ----
  let okWrites = true;
  for (let i = 0; i < 20; i += 1) {
    const r = await http(srv.base, '/api/snow/v1/admin/stations/baqueira-beret', { method: 'PUT', headers: AUTH, body: JSON.stringify(stationBody()) });
    if (r.status !== 200 && r.status !== 201) okWrites = false;
  }
  check('20 escrituras admin autenticadas dentro del límite => 200', okWrites, '20');
  const blocked = await http(srv.base, '/api/snow/v1/admin/stations/baqueira-beret', { method: 'PUT', headers: AUTH, body: JSON.stringify(stationBody()) });
  check('21ª escritura admin => 429 con Retry-After', blocked.status === 429 && Boolean(blocked.headers.get('retry-after')), { status: blocked.status, retryAfter: blocked.headers.get('retry-after') });

  // ---- 5. límite de tasa lectura costosa (100 dentro, 101ª 429) ----
  let okReads = true;
  for (let i = 0; i < 100; i += 1) {
    const r = await http(srv.base, '/api/snow/v1/search?q=baqueira');
    if (r.status !== 200) okReads = false;
  }
  check('100 lecturas costosas dentro del límite => 200', okReads, '100');
  const blockedRead = await http(srv.base, '/api/snow/v1/search?q=baqueira');
  check('101ª lectura costosa => 429', blockedRead.status === 429, blockedRead.status);

  // ---- 6. honestidad null≠0 tras un parte válido ----
  const good = await http(srv.base, '/api/snow/v1/admin/reports', { method: 'POST', headers: AUTH, body: JSON.stringify({ ...reportBody(), snow: { baseCm: null, midCm: null, topCm: null, newSnow24hCm: null, quality: null } }) });
  const id = good.json?.report?.id;
  const all = await http(srv.base, '/api/snow/v1/admin/reports', { headers: { authorization: `Bearer ${CANARY}` } });
  const ent = (all.json?.reports ?? []).find((r) => r.id === id);
  const snow = ent?.snow ?? null;
  check('null explícito se conserva como null (nunca 0)', good.status === 201 && snow !== null && Object.prototype.hasOwnProperty.call(snow, 'baseCm') && snow.baseCm === null && snow.topCm === null, snow);
} catch (e) {
  check('ejecución sin excepción', false, String(e?.stack ?? e));
} finally {
  if (srv) await stopBundle(srv);
  cleanupDir(dataDir);
}

const summary = {
  driver: 'reviewer-security-bundle',
  ranAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: failures,
  exitCode: failures === 0 ? 0 : 1,
  checks: results,
};
mkdirSync(HERE, { recursive: true });
writeFileSync(OUT, JSON.stringify(summary, null, 2) + '\n', 'utf8');
console.log(`\nchecks=${summary.total} passed=${summary.passed} failed=${summary.failed}`);
process.exit(summary.exitCode);
