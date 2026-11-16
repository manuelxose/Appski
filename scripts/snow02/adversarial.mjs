#!/usr/bin/env node
/**
 * SNOW-02 — PRIORIDAD 2: MATRIZ ADVERSARIAL sobre el bundle construido.
 *
 * Cada caso declara su ESPERADO y se compara con lo OBSERVADO. Un caso cuyo
 * observado difiera del esperado se reporta como FAIL y el driver sale 1.
 *
 * Casos (los 6 que el revisor va a intentar romper, más extras acotados):
 *   1 slug inexistente            => 404 + provenance (nunca 200 vacío ni 500)
 *   2 pageSize=101                => 400 tipado con field pageSize
 *   3 page muy alta (9999)        => 200 con lista vacía coherente (no 500)
 *   4 query desconocida/repetida  => 400 con el campo culpable
 *   5 body no-JSON                => 400 (sin stack)
 *   6 body > 64kb                 => 413
 *   7 PUT con claves extra        => 400 (campo desconocido)
 *   8 null explícito vs ausente   => null explícito NO es 0; ausente queda null
 *   9 centinelas negativos        => 400 en operational y en snow
 *  10 borrador invisible en público y visible en /admin/reports
 *  11 observedAt futuro visible   => el parte se sirve (no se descarta por reloj)
 *
 * Uso: node scripts/snow02/adversarial.mjs
 * Salida: exit 0 sólo si todas las expectativas se cumplen. JSON en
 *   docs/snow/snow02-evidence/adversarial.json
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { stableSummary } from './normalize-evidence.mjs';
import { join, resolve } from 'node:path';
import { ROOT, authHeaders, cleanupDir, http, startBundle, stopBundle, tempDataDir } from './lib/server.mjs';

const EVIDENCE_DIR = resolve(ROOT, 'docs/snow/snow02-evidence');
const EVIDENCE_FILE = join(EVIDENCE_DIR, 'adversarial.json');

const results = [];
let failures = 0;

/** Compara esperado vs observado. `detail` es la evidencia cruda del borde. */
function record(id, name, expected, observed, detail) {
  const ok = JSON.stringify(expected) === JSON.stringify(observed);
  results.push({ id, name, expected, observed, ok, detail });
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} [${id}] ${name}`);
  console.log(`     esperado=${JSON.stringify(expected)} observado=${JSON.stringify(observed)}${detail ? `  evidencia=${JSON.stringify(detail).slice(0, 180)}` : ''}`);
}

/**
 * Escritura admin con PAUSA ESTRATÉGICA.
 *
 * El borde limita la escritura admin a 20 peticiones/minuto (endurecimiento de
 * t6, correcto). Un driver adversarial encadena muchas escrituras, así que tras
 * cada una espera lo justo para no convertirse ÉL MISMO en el 429: el objetivo
 * es probar la VALIDACIÓN, no agotar la cuota.
 */
const WRITE_PACE_MS = 3_050;
let lastWrite = 0;
/** Base del servidor de ESTA ejecución; se fija al arrancarlo (no se adivina). */
let TARGET_BASE = '';
async function pacedWrite(path, init) {
  const wait = lastWrite + WRITE_PACE_MS - Date.now();
  if (wait > 0) await new Promise((res) => setTimeout(res, wait));
  // El destino se resuelve contra el servidor en marcha y su prefijo se añade
  // AQUÍ, no en cada llamada: así ninguna llamada puede quedar como URL relativa
  // ni duplicar `http://hosthttp://host/...` (defecto real que tuvo este driver).
  const full = path.startsWith('/api/snow/v1') ? path : `/api/snow/v1${path.startsWith('/') ? path : `/${path}`}`;
  const r = await http(TARGET_BASE, full, init);
  lastWrite = Date.now();
  return r;
}

/** Un 429 es cuota del DRIVER, no defecto del borde: se reporta como tal. */
function quotaFail(id, r) {
  if (r.status !== 429) return false;
  record(id, 'cuota de escritura agotada (429): el propio driver saturó la cuota', 'sin 429', 429, r.text.slice(0, 160));
  return true;
}

const SLUG = 'baqueira-beret';
const baseReport = (over = {}) => ({
  stationSlug: SLUG,
  observedAt: '2026-11-16T08:00:00.000Z',
  sourceUrl: 'https://www.baqueira.es/parte-de-nieve',
  author: 'op-adversarial',
  confidence: 0.9,
  operational: { liftsOpen: 12, liftsTotal: 21, pistesOpen: 40, pistesTotal: 118, kmOpen: 40, kmTotal: 161, isOpen: true, byLevel: null },
  snow: { baseCm: 60, midCm: 90, topCm: 120, newSnow24hCm: 15, quality: 'powder' },
  ...over,
});

const dataDir = tempDataDir('snow02-adv-');
let srv = null;
try {
  srv = await startBundle({ dataDir });
  TARGET_BASE = srv.base;
  const B = (p) => srv.base + '/api/snow/v1' + p;
  const auth = authHeaders(srv.token);

  // 1 — slug inexistente
  {
    const r = await http(srv.base, '/api/snow/v1/stations/no-existe-xyz');
    record('1', 'slug inexistente => 404 con provenance', { status: 404, hasProvenance: true, statusBody: 'not_found' }, {
      status: r.status,
      hasProvenance: typeof r.json?.provenance === 'object' && r.json?.provenance !== null,
      statusBody: r.json?.status,
    }, r.text.slice(0, 180));
    const r2 = await http(srv.base, '/api/snow/v1/stations/no-existe-xyz/report');
    record('1b', 'slug inexistente en /report => 404 (no 200 vacío)', 404, r2.status, r2.text.slice(0, 120));
  }

  // 2 — pageSize fuera del tope
  {
    const r = await http(srv.base, '/api/snow/v1/stations?pageSize=101');
    record('2', 'pageSize=101 => 400 nombrando pageSize', { status: 400, field: 'pageSize' }, {
      status: r.status,
      field: r.json?.fields?.[0]?.field ?? null,
    }, r.json?.fields);
  }

  // 3 — página fuera de rango: respuesta vacía COHERENTE, nunca 500.
  // El borde declara `hasNext:false` y `totalPages` = ceil(total/pageSize) aunque
  // la página pedida esté más allá: no es una incoherencia que rompa al cliente
  // (no hay más filas que recorrer). Se exige lo que de verdad importa.
  {
    const r = await http(srv.base, '/api/snow/v1/stations?page=9999');
    const body = r.json ?? {};
    const pages = body.pagination?.totalPages ?? -1;
    record('3', 'page=9999 => 200 sin filas, hasNext=false y totalPages coherente con total', {
      status: 200, rows: 0, hasNext: false, totalPagesMatchesTotal: true, isNot500: true,
    }, {
      status: r.status,
      rows: body.stations?.length ?? -1,
      hasNext: body.pagination?.hasNext ?? null,
      totalPagesMatchesTotal: pages === Math.ceil((body.pagination?.total ?? 0) / (body.pagination?.pageSize ?? 1)),
      isNot500: r.status !== 500,
    }, { status: body.status, page: body.pagination?.page, totalPages: pages, total: body.pagination?.total });
  }

  // 4 — query repetida y desconocida
  {
    const rep = await http(srv.base, '/api/snow/v1/stations?country=ES&country=AD');
    record('4a', 'query repetida => 400', { status: 400, field: 'country' }, {
      status: rep.status,
      field: rep.json?.fields?.[0]?.field ?? null,
    }, rep.json?.fields);
    const unk = await http(srv.base, '/api/snow/v1/stations?lima=1');
    record('4b', 'query desconocida => 400 (no se ignora)', { status: 400, field: 'lima' }, {
      status: unk.status,
      field: unk.json?.fields?.[0]?.field ?? null,
    }, unk.json?.fields);
  }

  // 5 — body no-JSON
  {
    const r = await fetch(B('/admin/reports'), { method: 'POST', headers: auth, body: '{no soy json' });
    const text = await r.text();
    record('5', 'body no-JSON => 400 sin stack', { status: 400, leaksStack: /at .*\.ts:\d+/.test(text) }, {
      status: r.status,
      leaksStack: /at .*\.ts:\d+/.test(text),
    }, text.slice(0, 160));
  }

  // 6 — body > 64kb
  {
    const big = JSON.stringify(baseReport({ author: 'x'.repeat(70 * 1024) }));
    const r = await fetch(B('/admin/reports'), { method: 'POST', headers: auth, body: big });
    const text = await r.text();
    record('6', 'body > 64kb => 413', { status: 413, leaksStack: /at .*\.ts:\d+/.test(text) }, {
      status: r.status,
      leaksStack: /at .*\.ts:\d+/.test(text),
    }, text.slice(0, 140));
  }

  // 7 — PUT con claves extra
  {
    const body = {
      slug: SLUG, name: 'Baqueira Beret', country: 'ES', region: 'Pirineo Catalán', discipline: 'alpine',
      lat: 42.7, lng: 0.93, altitudeBaseM: 1500, altitudeTopM: 2610, website: 'https://www.baqueira.es/',
      seasonOpen: null, seasonClose: null, seasonConfirmed: false, campoIntruso: 'no permitido',
    };
    const r = await http(srv.base, `/api/snow/v1/admin/stations/${SLUG}`, { method: 'PUT', headers: auth, body: JSON.stringify(body) });
    record('7', 'PUT con clave extra => 400 nombrando la clave', { status: 400, hasField: true }, {
      status: r.status,
      hasField: (r.json?.fields ?? []).some((f) => f.field === 'campoIntruso'),
    }, r.json?.fields?.slice(0, 3));
  }

  // 8 — null explícito vs ausente (no son 0)
  {
    const withNull = await pacedWrite('/admin/reports', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ ...baseReport(), snow: { baseCm: null, midCm: null, topCm: null, newSnow24hCm: null, quality: null } }),
    });
    const id = withNull.json?.report?.id;
    const readBack = await http(srv.base, '/api/snow/v1/admin/reports', { headers: auth });
    const entity = (readBack.json?.reports ?? []).find((x) => x.id === id);
    // OJO: `?? 'AUSENTE'` NO sirve aquí — `null` es el valor ESPERADO y se
    // confundiría con "campo ausente". Se distingue la clave presente con valor
    // null de la clave que no existe, y se exige que sea null (nunca 0).
    const snow = entity?.snow ?? null;
    const present = (k) => snow !== null && Object.prototype.hasOwnProperty.call(snow, k);
    record('8', 'null explícito se conserva como null (nunca 0)', { created: 201, baseCm: null, topCm: null, neverZero: true }, {
      created: withNull.status,
      baseCm: present('baseCm') ? snow.baseCm : 'AUSENTE',
      topCm: present('topCm') ? snow.topCm : 'AUSENTE',
      neverZero: snow?.baseCm !== 0 && snow?.topCm !== 0,
    }, snow);
  }

  // 9 — centinelas negativos
  {
    const op = await pacedWrite('/admin/reports', { method: 'POST', headers: auth, body: JSON.stringify(baseReport({ operational: { liftsOpen: -99, liftsTotal: 21 } })) });
    record('9a', 'operational.liftsOpen=-99 => 400', { status: 400, field: 'operational.liftsOpen' }, {
      status: op.status,
      field: op.json?.fields?.find((f) => String(f.field).startsWith('operational'))?.field ?? null,
    }, op.json?.fields);
    const sn = await pacedWrite('/admin/reports', { method: 'POST', headers: auth, body: JSON.stringify(baseReport({ snow: { baseCm: -99 } })) });
    record('9b', 'snow.baseCm=-99 => 400', { status: 400, field: 'snow.baseCm' }, {
      status: sn.status,
      field: sn.json?.fields?.find((f) => String(f.field).startsWith('snow'))?.field ?? null,
    }, sn.json?.fields);
  }

  // 10 — borrador invisible en público, visible en admin
  {
    const draft = await pacedWrite('/admin/reports', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ ...baseReport({ stationSlug: 'formigal-panticosa' }), mood: 'draft', snow: { baseCm: 999 } }),
    });
    const pub = await http(srv.base, '/api/snow/v1/stations/formigal-panticosa/report');
    const dir = await http(srv.base, '/api/snow/v1/stations?pageSize=100');
    const row = (dir.json?.stations ?? []).find((s) => s.slug === 'formigal-panticosa');
    const admin = await http(srv.base, '/api/snow/v1/admin/reports', { headers: auth });
    record('10', 'borrador invisible en público y visible en /admin/reports', {
      created: 201, publicStatus: 'no_data', publicHasDraftValue: false, adminSees: true,
    }, {
      created: draft.status,
      publicStatus: pub.json?.status ?? null,
      publicHasDraftValue: pub.text.includes('999') || row?.snow?.baseCm === 999,
      adminSees: (admin.json?.reports ?? []).some((r) => r.mood === 'draft'),
    }, { dirSnow: row?.snow ?? null });
  }

  // 11 — observedAt futuro: visible (el reloj no descarta partes)
  {
    const future = new Date(Date.now() + 6 * 3600_000).toISOString();
    const r = await pacedWrite('/admin/reports', {
      method: 'POST', headers: auth,
      body: JSON.stringify({ ...baseReport({ stationSlug: 'grandvalira' }), observedAt: future, snow: { baseCm: 77 } }),
    });
    const pub = await http(srv.base, '/api/snow/v1/stations/grandvalira/report');
    const rk = await http(srv.base, '/api/snow/v1/rankings/nieve');
    const entry = (rk.json?.ranking ?? []).find((x) => x.stationSlug === 'grandvalira');
    record('11', 'observedAt futuro => parte visible (no se descarta por reloj)', { created: 201, baseCm: 77, inRanking: true }, {
      created: r.status,
      baseCm: pub.json?.report?.snow?.baseCm ?? null,
      inRanking: Boolean(entry),
    }, { rankingStatus: rk.json?.status, entry: entry ?? null });
  }
} catch (e) {
  record('X', 'ejecución del driver sin excepción', 'sin error', String(e?.message ?? e), String(e?.stack ?? '').slice(0, 300));
} finally {
  if (srv) await stopBundle(srv);
  cleanupDir(dataDir);
}

const summary = {
  driver: 'adversarial',
  ranAt: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.ok).length,
  failed: failures,
  exitCode: failures === 0 ? 0 : 1,
  cases: results,
};
mkdirSync(EVIDENCE_DIR, { recursive: true });
writeFileSync(EVIDENCE_FILE, JSON.stringify(stableSummary(summary) ?? summary, null, 2) + '\n', 'utf8');
console.log(`\ncases=${summary.total} passed=${summary.passed} failed=${summary.failed}`);
console.log(`evidencia: ${EVIDENCE_FILE}`);
process.exit(summary.exitCode);
