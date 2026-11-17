#!/usr/bin/env node
/**
 * SNOW-02 — PRIORIDAD 1: PERSISTENCIA TRAS REINICIO BRUTAL (SIGKILL).
 *
 * Criterio central del hito: un parte editorial escrito por HTTP debe seguir
 * ahí después de matar el proceso SIN cierre ordenado.
 *
 * Secuencia REAL:
 *   1. arranca `dist/web-ssr/server/server.mjs` (bundle construido) en puerto
 *      libre, SNOW_DATA_DIR temporal y SNOW_ADMIN_TOKEN canario;
 *   2. POST /api/snow/v1/admin/reports con liftsOpen=12 y atribución completa;
 *   3. lee el fichero en DISCO (no la respuesta) y comprueba el registro;
 *   4. mata el proceso con SIGKILL;
 *   5. arranca de nuevo sobre el MISMO SNOW_DATA_DIR;
 *   6. GET /stations/baqueira-beret/report y /rankings/nieve: liftsOpen===12,
 *      author, sourceUrl, capturedAt, confidence persistidos y ranking incluido.
 *
 * Uso: node scripts/snow02/persistence-restart.mjs
 * Salida: exit 0 sólo si TODOS los checks pasan. JSON en
 *   docs/snow/snow02-evidence/persistence-restart.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { stableSummary } from './normalize-evidence.mjs';
import { join, resolve } from 'node:path';
import {
  ROOT,
  CANARY_TOKEN,
  authHeaders,
  cleanupDir,
  http,
  killBundle,
  startBundle,
  stopBundle,
  tempDataDir,
} from './lib/server.mjs';

const EVIDENCE_DIR = resolve(ROOT, 'docs/snow/snow02-evidence');
const EVIDENCE_FILE = join(EVIDENCE_DIR, 'persistence-restart.json');

const results = [];
let failures = 0;
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === undefined ? '' : ` :: ${JSON.stringify(detail).slice(0, 220)}`}`);
}

const SLUG = 'baqueira-beret';
const OBSERVED_AT = '2026-11-16T08:00:00.000Z';
const SOURCE_URL = 'https://www.baqueira.es/parte-de-nieve';
const AUTHOR = 'operador-persistencia-t5';
const CONFIDENCE = 0.87;
const PAYLOAD = {
  stationSlug: SLUG,
  observedAt: OBSERVED_AT,
  sourceUrl: SOURCE_URL,
  author: AUTHOR,
  confidence: CONFIDENCE,
  operational: {
    liftsOpen: 12,
    liftsTotal: 21,
    pistesOpen: 40,
    pistesTotal: 118,
    kmOpen: 40,
    kmTotal: 161,
    isOpen: true,
    byLevel: { green: { open: 10, total: 10 }, blue: { open: 20, total: 25 }, red: { open: 10, total: 60 }, black: { open: 0, total: 23 } },
  },
  snow: { baseCm: 60, midCm: 90, topCm: 120, newSnow24hCm: 15, quality: 'powder' },
  avalancheLevel: 3,
  mood: 'published',
};

const dataDir = tempDataDir('snow02-persist-');
let srv = null;
const log = [];
try {
  // ---- 1. primer arranque -------------------------------------------------
  srv = await startBundle({ dataDir });
  log.push(`arranque#1 pid=${srv.child.pid} puerto=${srv.port} dir=${dataDir}`);
  check('arranque#1 del bundle construido', true, { port: srv.port });

  const seed = await http(srv.base, '/api/snow/v1/season-dates');
  check('bootstrap sembró el maestro (season-dates 200)', seed.status === 200, { status: seed.status });

  // ---- 2. escritura por HTTP ---------------------------------------------
  const created = await http(srv.base, '/api/snow/v1/admin/reports', {
    method: 'POST',
    headers: authHeaders(srv.token),
    body: JSON.stringify(PAYLOAD),
  });
  check('POST /admin/reports => 201', created.status === 201, { status: created.status, body: created.text.slice(0, 200) });
  const reportId = created.json?.report?.id;
  check('la respuesta trae id de parte', typeof reportId === 'string' && reportId.length > 0, reportId);

  // ---- 3. lectura del FICHERO en disco ------------------------------------
  const onDiskPath = join(dataDir, 'snow-reports.json');
  let disk = null;
  try {
    disk = JSON.parse(readFileSync(onDiskPath, 'utf8'));
  } catch (e) {
    check('el fichero snow-reports.json existe y es JSON', false, String(e));
  }
  if (disk) {
    check('el fichero existe y es JSON', true, { schemaVersion: disk.schemaVersion, records: disk.records?.length });
    const rec = (disk.records ?? []).find((r) => (r.record ?? r).id === reportId);
    const entity = rec?.record ?? rec;
    check('el parte está EN DISCO antes del reinicio', Boolean(entity), entity ? { id: entity.id } : null);
    if (entity) {
      check('disco: liftsOpen === 12', entity.operational?.liftsOpen === 12, entity.operational?.liftsOpen);
      check('disco: author/sourceUrl/capturedAt/confidence', entity.author === AUTHOR && entity.sourceUrl === SOURCE_URL && typeof entity.capturedAt === 'string' && entity.confidence === CONFIDENCE, {
        author: entity.author,
        sourceUrl: entity.sourceUrl,
        capturedAt: entity.capturedAt,
        confidence: entity.confidence,
      });
    }
  }

  // ---- 4. SIGKILL --------------------------------------------------------
  const killed = await killBundle(srv);
  srv = null;
  log.push(`SIGKILL: ${JSON.stringify(killed)}`);
  check('proceso terminado con SIGKILL (sin cierre ordenado)', killed.code !== 0 || killed.signal !== null || killed.alreadyExited === true, killed);

  // ---- 5. segundo arranque sobre el MISMO dataDir ------------------------
  srv = await startBundle({ dataDir });
  log.push(`arranque#2 pid=${srv.child.pid} puerto=${srv.port} (mismo dir=${srv.dataDir === dataDir})`);
  check('arranque#2 sobre el MISMO SNOW_DATA_DIR', srv.dataDir === dataDir, { sameDir: srv.dataDir === dataDir });

  // ---- 6. verificación pública tras el reinicio --------------------------
  const report = await http(srv.base, `/api/snow/v1/stations/${SLUG}/report`);
  const body = report.json ?? {};
  check('GET /stations/:slug/report => 200 tras reinicio', report.status === 200, { status: report.status });
  check('report: liftsOpen === 12 (no 0, no null)', body.report?.operational?.liftsOpen === 12, body.report?.operational?.liftsOpen ?? null);
  check('report: parte con espesores persistidos', body.report?.snow?.baseCm === 60 && body.report?.snow?.topCm === 120, body.report?.snow ?? null);
  check('report: atribución persistida (author/sourceUrl/capturedAt/confidence)', body.author === AUTHOR && body.sourceUrl === SOURCE_URL && typeof body.capturedAt === 'string' && body.confidence === CONFIDENCE, {
    author: body.author,
    sourceUrl: body.sourceUrl,
    capturedAt: body.capturedAt,
    confidence: body.confidence,
  });
  check('report: procedencia con source/licenseStatus/freshness', body.provenance?.source === 'editorial-report' && typeof body.provenance?.freshness === 'number' && typeof body.provenance?.licenseStatus === 'string', body.provenance ?? null);

  const ranking = await http(srv.base, '/api/snow/v1/rankings/nieve');
  const entry = (ranking.json?.ranking ?? []).find((r) => r.stationSlug === SLUG);
  check('ranking incluye la estación con baseCm 60', entry?.baseCm === 60, entry ?? (ranking.json?.status ?? null));
  check('ranking no convierte ausencia en 0', !(ranking.json?.ranking ?? []).some((r) => r.baseCm === 0 && r.baseCm !== 60), ranking.json?.ranking ?? null);

  const admin = await http(srv.base, '/api/snow/v1/admin/reports', { headers: authHeaders(srv.token) });
  const persisted = (admin.json?.reports ?? []).find((r) => r.id === reportId);
  check('/admin/reports devuelve el parte tras reinicio', Boolean(persisted), { status: admin.status, count: admin.json?.reports?.length });
} catch (e) {
  check('ejecución del driver sin excepción', false, String(e?.stack ?? e));
} finally {
  if (srv) await stopBundle(srv);
  cleanupDir(dataDir);
}

const summary = {
  driver: 'persistence-restart',
  ranAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: failures,
  exitCode: failures === 0 ? 0 : 1,
  log,
  checks: results,
};
mkdirSync(EVIDENCE_DIR, { recursive: true });
writeFileSync(EVIDENCE_FILE, JSON.stringify(stableSummary(summary) ?? summary, null, 2) + '\n', 'utf8');
console.log(`\nchecks=${summary.total} passed=${summary.passed} failed=${summary.failed}`);
console.log(`evidencia: ${EVIDENCE_FILE}`);
process.exit(summary.exitCode);
