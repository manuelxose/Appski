#!/usr/bin/env node
/**
 * SNOW-02 — INTEGRACIÓN HTTP COMPLETA del borde v1.
 *
 * Complementa (no duplica) a `captain-http-verify.mjs`: aquel es el driver del
 * capitán; este recorre los **15 endpoints del contrato** y exige, para CADA uno:
 *   - el código esperado con cero credenciales de proveedor,
 *   - la tupla de procedencia completa (source/observedAt/updatedAt/status/
 *     licenseStatus/freshness/authorization/attribution),
 *   - el cuerpo tipado del contrato (`status` de dato, `fields[]` en 400,
 *     `provenance` también en los 404).
 * Además comprueba que un RECHAZO no cambia el número de registros persistidos
 * (conteo antes/después por HTTP y en disco).
 *
 * Uso: node scripts/snow02/integration-http.mjs
 * Salida: exit 0 sólo si todos los checks pasan.
 * Evidencia: docs/snow/snow02-evidence/integration-http.json
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { stableSummary } from './normalize-evidence.mjs';
import { join, resolve } from 'node:path';
import {
  ROOT,
  authHeaders,
  cleanupDir,
  http,
  startBundle,
  stopBundle,
  tempDataDir,
} from './lib/server.mjs';

const EVIDENCE_DIR = resolve(ROOT, 'docs/snow/snow02-evidence');
const EVIDENCE_FILE = join(EVIDENCE_DIR, 'integration-http.json');
const PROVENANCE_FIELDS = [
  'source', 'observedAt', 'updatedAt', 'status', 'licenseStatus', 'freshness', 'authorization', 'attribution',
];

const results = [];
let failures = 0;
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: detail === undefined ? null : detail });
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === undefined ? '' : ` :: ${JSON.stringify(detail).slice(0, 200)}`}`);
}

function provenanceErrors(body) {
  const p = body?.provenance;
  if (!p || typeof p !== 'object') return ['sin provenance'];
  const missing = PROVENANCE_FIELDS.filter((f) => !(f in p));
  const bad = [];
  if (typeof p.freshness !== 'number' || !Number.isFinite(p.freshness) || p.freshness < 0) bad.push('freshness');
  if (typeof p.observedAt !== 'string' || Number.isNaN(Date.parse(p.observedAt))) bad.push('observedAt');
  return [...missing, ...bad];
}

const dataDir = tempDataDir('snow02-integ-');
let srv = null;
try {
  srv = await startBundle({ dataDir });
  const B = (p) => '/api/snow/v1' + p;
  const auth = authHeaders(srv.token);
  const get = (p, init) => http(srv.base, B(p), init ?? {});
  const pace = { last: 0 };
  const write = async (p, init) => {
    const wait = pace.last + 3050 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const res = await http(srv.base, B(p), init);
    pace.last = Date.now();
    return res;
  };

  // ---- los 15 endpoints del contrato, sin credenciales de proveedor -------
  const endpoints = [
    { m: 'GET', p: '/stations', want: 200, admin: false },
    { m: 'GET', p: '/stations/baqueira-beret', want: 200, admin: false },
    { m: 'GET', p: '/stations/baqueira-beret/report', want: 200, admin: false },
    { m: 'GET', p: '/stations/baqueira-beret/forecast', want: 200, admin: false },
    { m: 'GET', p: '/stations/baqueira-beret/alerts', want: 200, admin: false },
    { m: 'GET', p: '/stations/baqueira-beret/webcams', want: 200, admin: false },
    { m: 'GET', p: '/avalanche', want: 200, admin: false },
    { m: 'GET', p: '/rankings/nieve', want: 200, admin: false },
    { m: 'GET', p: '/rankings/km', want: 200, admin: false },
    { m: 'GET', p: '/season-dates', want: 200, admin: false },
    { m: 'GET', p: '/search?q=baqueira', want: 200, admin: false },
    { m: 'GET', p: '/config', want: 200, admin: true },
    { m: 'GET', p: '/admin/reports', want: 200, admin: true },
    { m: 'POST', p: '/admin/reports', want: 201, admin: true },
    { m: 'PUT', p: '/admin/stations/port-aine', want: 201, admin: true },
  ];

  const POST_BODY = {
    stationSlug: 'baqueira-beret',
    observedAt: '2026-11-16T08:00:00.000Z',
    sourceUrl: 'https://www.baqueira.es/parte-de-nieve',
    author: 'op-integration',
    confidence: 0.91,
    operational: { liftsOpen: 12, liftsTotal: 21, pistesOpen: 40, pistesTotal: 118, kmOpen: 40, kmTotal: 161, isOpen: true, byLevel: null },
    snow: { baseCm: 60, midCm: 90, topCm: 120, newSnow24hCm: 15, quality: 'powder' },
  };
  const PUT_BODY = {
    slug: 'port-aine', name: 'Port Ainé', country: 'ES', region: 'Pirineo Catalán', discipline: 'alpine',
    lat: 42.52, lng: 1.19, altitudeBaseM: 1650, altitudeTopM: 2440, website: 'https://www.portaine.cat/',
    seasonOpen: null, seasonClose: null, seasonConfirmed: false,
  };

  for (const e of endpoints) {
    const init = { method: e.m, headers: e.admin ? auth : { 'content-type': 'application/json' } };
    if (e.m === 'POST') init.body = JSON.stringify(POST_BODY);
    if (e.m === 'PUT') init.body = JSON.stringify(PUT_BODY);
    const res = e.m === 'GET' ? await get(e.p, e.admin ? { headers: auth } : {}) : await write(e.p, init);
    check(`[${e.m} ${e.p}] => ${e.want}`, res.status === e.want, { status: res.status, body: res.text.slice(0, 140) });
    const errs = provenanceErrors(res.json);
    check(`[${e.m} ${e.p}] procedencia completa`, errs.length === 0, errs.length ? errs : res.json?.provenance?.source);
  }

  // ---- rutas admin sin token: 401 y ninguna escritura --------------------
  const before = (await get('/admin/reports', { headers: auth })).json?.reports?.length ?? -1;
  for (const [m, p, body] of [
    ['GET', '/config', undefined],
    ['GET', '/admin/reports', undefined],
    ['POST', '/admin/reports', JSON.stringify(POST_BODY)],
    ['PUT', '/admin/stations/baqueira-beret', JSON.stringify({ ...PUT_BODY, slug: 'baqueira-beret' })],
  ]) {
    const res = await http(srv.base, B(p), { method: m, headers: { 'content-type': 'application/json' }, ...(body ? { body } : {}) });
    check(`[${m} ${p} sin token] => 401`, res.status === 401, res.status);
  }
  const afterRejects = (await get('/admin/reports', { headers: auth })).json?.reports?.length ?? -2;
  check('los rechazos NO cambian el conteo de registros', before === afterRejects, { before, after: afterRejects });

  // ---- rechazos 400/404 también llevan procedencia -----------------------
  for (const [label, url] of [
    ['400 pageSize=101', '/stations?pageSize=101'],
    ['400 query desconocida', '/stations?lima=1'],
    ['404 slug', '/stations/no-existe-xyz'],
    ['404 report', '/stations/no-existe-xyz/report'],
    ['404 alerts', '/stations/no-existe-xyz/alerts'],
    ['404 webcams', '/stations/no-existe-xyz/webcams'],
    ['400 search sin q', '/search'],
  ]) {
    const res = await get(url);
    const wantStatus = label.startsWith('404') ? 404 : 400;
    check(`${label} => ${wantStatus}`, res.status === wantStatus, res.status);
    check(`${label} con procedencia`, provenanceErrors(res.json).length === 0, provenanceErrors(res.json));
    if (wantStatus === 400) {
      check(`${label} con fields[]`, Array.isArray(res.json?.fields) && res.json.fields.length > 0, res.json?.fields);
    }
  }

  // ---- conteo en DISCO tras una escritura + un rechazo -------------------
  const reportsPath = join(dataDir, 'snow-reports.json');
  const countOnDisk = () => {
    if (!existsSync(reportsPath)) return -1;
    try {
      return (JSON.parse(readFileSync(reportsPath, 'utf8')).records ?? []).length;
    } catch {
      return -2;
    }
  };
  const diskBefore = countOnDisk();
  const badWrite = await write('/admin/reports', {
    method: 'POST', headers: auth,
    body: JSON.stringify({ ...POST_BODY, snow: { baseCm: -99 } }),
  });
  check('escritura con centinela => 400', badWrite.status === 400, { status: badWrite.status, fields: badWrite.json?.fields });
  const diskAfterBad = countOnDisk();
  check('el rechazo NO cambia el conteo EN DISCO', diskBefore === diskAfterBad, { before: diskBefore, after: diskAfterBad });

  // ---- degradación honesta sin credenciales de proveedor -----------------
  const fc = (await get('/stations/baqueira-beret/forecast')).json;
  check('forecast: estado tipado sin proveedor', ['not_configured', 'no_data'].includes(fc?.status), fc?.status);
  check('forecast: NO inventa datos', fc?.data === undefined, fc?.data ?? null);
  const al = (await get('/stations/baqueira-beret/alerts')).json;
  check('alerts: sin alertas inventadas', Array.isArray(al?.alerts) && al.alerts.length === 0, al?.alerts?.length);
  const wc = (await get('/stations/baqueira-beret/webcams')).json;
  check('webcams: bloqueado por licencia, sin enlaces', wc?.status === 'blocked' && Array.isArray(wc?.grants) && wc.grants.length === 0, { status: wc?.status, grants: wc?.grants?.length });

  // ---- /config: sin nombres de variables de entorno ----------------------
  const cfg = await get('/config', { headers: auth });
  const cfgText = cfg.text;
  const envLeak = ['AEMET_API_KEY', 'METEOFRANCE_API_KEY', 'C3S_API_KEY', 'CLMS_API_KEY', 'PROTOMAPS_BASE_URL', srv.token].filter((s) => cfgText.includes(s));
  check('/config no expone nombres de variables de entorno ni el token', envLeak.length === 0, envLeak);
  check('/config declara proveedores', Array.isArray(cfg.json?.providers) && cfg.json.providers.length > 0, cfg.json?.providers?.length);
} catch (e) {
  check('ejecución del driver sin excepción', false, String(e?.message ?? e));
} finally {
  if (srv) await stopBundle(srv);
  cleanupDir(dataDir);
}

const summary = {
  driver: 'integration-http',
  ranAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: failures,
  exitCode: failures === 0 ? 0 : 1,
  checks: results,
};
mkdirSync(EVIDENCE_DIR, { recursive: true });
writeFileSync(EVIDENCE_FILE, JSON.stringify(stableSummary(summary) ?? summary, null, 2) + '\n', 'utf8');
console.log(`\nchecks=${summary.total} passed=${summary.passed} failed=${summary.failed}`);
console.log(`evidencia: ${EVIDENCE_FILE}`);
process.exit(summary.exitCode);
