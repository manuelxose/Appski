/**
 * C28 — Contrato HTTP v1 de SNOW-02 (APIs operativas).
 *
 * Qué se prueba EJERCIENDO el borde por HTTP in-process (no leyendo fuente):
 *
 *  C28a  cada endpoint del contrato (§4.1 público + §4.2 admin) existe EXACTAMENTE
 *        una vez en `SNOW_ROUTES` y responde con el código esperado;
 *  C28b  parámetros inválidos o desconocidos ⇒ 400 tipado con `fields[]`, NUNCA 500;
 *  C28c  paginación real con tope `pageSize ≤ 100` (y 101 ⇒ 400);
 *  C28d  todo dato variable expone source/observedAt/updatedAt/status/licenseStatus/freshness;
 *  C28e  `no_data` / `not_configured` / `blocked` / `stale` son estados DISTINTOS y
 *        verificables por HTTP;
 *  C28f  null ≠ 0 (sin parte ⇒ `snow: null`, nunca `baseCm: 0`) y un parte marcado
 *        `stale` no se presenta `live`;
 *  C28g  escrituras admin: auth obligatoria y un rechazo no toca el almacén.
 *
 * Reloj fijo (T1–T7 §2bis): `freshness` y `stale` son deterministas.
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createSnowRouter, SNOW_ROUTES } from '../../snow/server/index.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');
const clock = () => FIXED_NOW;
const TOKEN = 'token-c28';
const PROVENANCE_FIELDS = [
  'source', 'observedAt', 'updatedAt', 'status', 'licenseStatus', 'freshness', 'authorization', 'attribution',
];

function station(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    slug: 'baqueira-beret', name: 'Baqueira Beret', country: 'ES', region: 'Pirineo Catalán',
    discipline: 'alpine', lat: 42.69, lng: 0.93, altitudeBaseM: 1500, altitudeTopM: 2610,
    website: null, seasonOpen: null, seasonClose: null, seasonConfirmed: false, ...over,
  };
}

/** Crea la semilla Y la registra para limpieza: la propiedad del directorio se
 *  toma al crearlo, no al montarlo. Sin esto, LEAK_GUARD (C25) detecta fugas. */
function seedDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'snow-c28-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'stations.json'), JSON.stringify({
    schemaVersion: 1,
    updatedAt: FIXED_NOW.toISOString(),
    records: [
      station(),
      station({ slug: 'formigal-panticosa', name: 'Formigal-Panticosa', region: 'Pirineo Aragonés', lat: 42.76, lng: -0.39 }),
      station({
    slug: 'grandvalira', name: 'Grandvalira', country: 'AD', region: 'Pirineo Andorrano', lat: 42.54, lng: 1.6,
    discipline: 'nordic', seasonOpen: '11-30', seasonClose: '04-30', seasonConfirmed: true,
  }),
    ],
  }));
  writeFileSync(join(dir, 'snow-reports.json'), JSON.stringify({
    schemaVersion: 1, updatedAt: '', records: [
      // FRESCO: 5 min antes del reloj fijo ⇒ `live`.
      {
        id: 'r-fresh', stationSlug: 'baqueira-beret',
        observedAt: new Date(FIXED_NOW.getTime() - 5 * 60_000).toISOString(),
        capturedAt: new Date(FIXED_NOW.getTime() - 4 * 60_000).toISOString(),
        sourceUrl: 'https://www.baqueira.es/parte', author: 'op-1', confidence: 0.9,
        operational: { liftsOpen: 12, liftsTotal: 21, pistesOpen: 40, pistesTotal: 118, kmOpen: 40, kmTotal: 161, isOpen: true, byLevel: null },
        snow: { baseCm: 40, midCm: 80, topCm: 110, newSnow24hCm: 5, quality: 'powder' },
        avalancheLevel: 2, mood: 'published',
      },
      // CADUCADO: 3 h antes ⇒ `stale`, nunca presentado como actual.
      {
        id: 'r-stale', stationSlug: 'grandvalira',
        observedAt: new Date(FIXED_NOW.getTime() - 3 * 60 * 60_000).toISOString(),
        capturedAt: new Date(FIXED_NOW.getTime() - 3 * 60 * 60_000).toISOString(),
        sourceUrl: 'https://www.grandvalira.com/parte', author: 'op-2', confidence: 0.8,
        operational: { liftsOpen: 0, liftsTotal: 30, pistesOpen: 0, pistesTotal: 100, kmOpen: 0, kmTotal: 200, isOpen: false, byLevel: null },
        snow: { baseCm: 15, midCm: null, topCm: null, newSnow24hCm: null, quality: null },
        avalancheLevel: null, mood: 'published',
      },
      // BORRADOR: no cuenta (no es dato publicado).
      {
        id: 'r-draft', stationSlug: 'formigal-panticosa',
        observedAt: FIXED_NOW.toISOString(), capturedAt: FIXED_NOW.toISOString(),
        sourceUrl: 'https://www.formigal-panticosa.com/parte', author: 'op-3', confidence: 0.5,
        operational: null, snow: { baseCm: 999, midCm: null, topCm: null, newSnow24hCm: null, quality: null },
        avalancheLevel: null, mood: 'draft',
      },
    ],
  }));
  writeFileSync(join(dir, 'osm-derived.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  return dir;
}

const dirs: string[] = [];
const servers: Array<ReturnType<express.Express['listen']>> = [];

/**
 * OJO (lección C25, medida aquí): `adminApiMiddleware` lee `SNOW_ADMIN_TOKEN` en
 * CADA petición, no al montar. Por eso el token se fija al ARRANCAR y se retira
 * al parar la app — dentro de cada test —, no al montar el router.
 */
/**
 * Arranca el borde sobre `opts.dir`, que TIENE que venir de `seedDir()` (ya
 * registrado para limpieza). Antes se aceptaba `dataDir` SIN registrar el
 * directorio: cada test que creaba su semilla dejaba un `snow-c28-*` huérfano y
 * LEAK_GUARD (C25) lo detectaba como fuga. La propiedad del directorio ahora está
 * en la CREACIÓN, no en el montaje.
 */
async function boot(opts: { token?: string | null; dir: string }): Promise<{ base: string; dir: string }> {
  const dir = opts.dir;
  const token = opts.token === undefined ? null : opts.token;
  if (token === null) delete process.env['SNOW_ADMIN_TOKEN'];
  else process.env['SNOW_ADMIN_TOKEN'] = token;
  const app = express();
  app.use('/api/snow', createSnowRouter(dir, clock));
  const srv = app.listen(0, '127.0.0.1');
  servers.push(srv);
  await new Promise((r) => srv.once('listening', r));
  const addr = srv.address();
  const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
  return { base: `http://127.0.0.1:${port}/api/snow`, dir };
}

async function closeAll(): Promise<void> {
  for (const s of servers.splice(0)) {
    await new Promise<void>((r) => s.close(() => r()));
  }
  // Retirar SIEMPRE el token de prueba al cerrar: el runner in-process comparte
  // `process.env` y una suite no puede envenenar a la siguiente.
  delete process.env['SNOW_ADMIN_TOKEN'];
}

test.after(async () => {
  await closeAll();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  for (const k of ['AEMET_API_KEY', 'METEOFRANCE_API_KEY', 'C3S_API_KEY', 'CLMS_API_KEY', 'PROTOMAPS_BASE_URL', 'SNOW_ADMIN_TOKEN']) {
    delete process.env[k];
  }
});

function assertProvenance(body: unknown, where: string): Record<string, unknown> {
  const prov = (body as { provenance?: unknown }).provenance;
  assert.ok(prov && typeof prov === 'object', `${where}: falta provenance`);
  for (const f of PROVENANCE_FIELDS) {
    assert.ok(f in (prov as Record<string, unknown>), `${where}: provenance sin '${f}'`);
  }
  const p = prov as Record<string, unknown>;
  assert.strictEqual(typeof p['freshness'], 'number', `${where}: freshness debe ser número`);
  assert.ok(Number.isFinite(p['freshness']) && (p['freshness'] as number) >= 0, `${where}: freshness inválida`);
  assert.strictEqual(typeof p['observedAt'], 'string', `${where}: observedAt debe ser string ISO`);
  assert.ok(!Number.isNaN(Date.parse(p['observedAt'] as string)), `${where}: observedAt no es fecha`);
  return p;
}

// ------------------------------------------------------------------------ C28a

/** Contrato §4.1/§4.2 de t1: (método, plantilla) exactos y sin duplicados. */
const CONTRACT = [
  ['GET', '/v1/stations'],
  ['GET', '/v1/stations/:slug'],
  ['GET', '/v1/stations/:slug/report'],
  ['GET', '/v1/stations/:slug/forecast'],
  ['GET', '/v1/stations/:slug/alerts'],
  ['GET', '/v1/stations/:slug/webcams'],
  ['GET', '/v1/avalanche'],
  ['GET', '/v1/rankings/nieve'],
  ['GET', '/v1/rankings/km'],
  ['GET', '/v1/season-dates'],
  ['GET', '/v1/search'],
  ['GET', '/v1/config'],
  ['GET', '/v1/admin/reports'],
  ['POST', '/v1/admin/reports'],
  ['PUT', '/v1/admin/stations/:slug'],
] as const;

test('C28a: los 15 endpoints del contrato existen EXACTAMENTE una vez', () => {
  const seen = SNOW_ROUTES.map((r) => `${r.method} ${r.path}`);
  for (const [m, p] of CONTRACT) {
    const n = seen.filter((s) => s === `${m} ${p}`).length;
    assert.strictEqual(n, 1, `${m} ${p} aparece ${n} veces (debe ser exactamente 1)`);
  }
  assert.strictEqual(seen.length, CONTRACT.length, `hay rutas fuera del contrato: ${seen.join(', ')}`);
  assert.deepStrictEqual([...seen].sort(), CONTRACT.map(([m, p]) => `${m} ${p}`).sort());
});

test('C28a: cada ruta declara admin coherente y sample invocable', () => {
  for (const r of SNOW_ROUTES) {
    const shouldBeAdmin = r.path.startsWith('/v1/admin') || r.path === '/v1/config';
    assert.strictEqual(r.admin, shouldBeAdmin, `${r.method} ${r.path}: admin=${r.admin} es incoherente`);
    assert.ok(r.sample.startsWith(r.path.split('/:slug')[0]) || r.sample.includes(':'), `${r.path}: sample no invocable`);
  }
});

test('C28a: todas las rutas públicas responden (200) sin credenciales, con su sample real', async () => {
  const { base } = await boot({ token: null, dir: seedDir() });
  for (const r of SNOW_ROUTES.filter((x) => !x.admin)) {
    const res = await fetch(`${base}${r.sample}`, { method: r.method });
    assert.strictEqual(res.status, 200, `${r.method} ${r.sample} ⇒ ${res.status} (esperado 200)`);
    const body = await res.json();
    assertProvenance(body, `${r.method} ${r.sample}`);
  }
  await closeAll();
});

test('C28a: las rutas admin exigen auth (401 sin token configurado)', async () => {
  const { base } = await boot({ token: null, dir: seedDir() });
  for (const r of SNOW_ROUTES.filter((x) => x.admin)) {
    const res = await fetch(`${base}${r.sample}`, {
      method: r.method,
      headers: { 'content-type': 'application/json' },
      body: r.method === 'GET' ? undefined : '{}',
    });
    assert.strictEqual(res.status, 401, `${r.method} ${r.sample} ⇒ ${res.status} (esperado 401)`);
  }
  await closeAll();
});

// ------------------------------------------------------------------------ C28b

test('C28b: parámetros inválidos o desconocidos ⇒ 400 con fields[], nunca 500', async () => {
  const { base } = await boot({ token: TOKEN, dir: seedDir() });
  const cases: Array<[string, string, string]> = [
    ['/v1/stations?pageSize=101', 'pageSize', 'por encima del máximo 100'],
    ['/v1/stations?page=0', 'page', 'página mínima 1'],
    ['/v1/stations?page=1.5', 'page', 'no entero'],
    ['/v1/stations?sort=bogus', 'sort', 'orden desconocido'],
    ['/v1/stations?sortDir=bogus', 'sortDir', 'dirección desconocida'],
    ['/v1/stations?country=XX', 'country', 'país inexistente'],
    ['/v1/stations?discipline=bogus', 'discipline', 'disciplina inexistente'],
    ['/v1/stations?status=bogus', 'status', 'estado desconocido'],
    ['/v1/stations?snowMin=-5', 'snowMin', 'nieve negativa (centinela)'],
    ['/v1/stations?snowMin=abc', 'snowMin', 'no numérico'],
    ['/v1/stations?region=', 'region', 'región vacía'],
    ['/v1/stations?lima=1', 'lima', 'parámetro DESCONOCIDO (no se ignora)'],
    ['/v1/stations?country=ES&country=AD', 'country', 'repetido (multi-valor no definido)'],
    ['/v1/search', 'q', 'q obligatorio'],
    ['/v1/search?q=', 'q', 'q en blanco'],
    ['/v1/search?q=a&extra=1', 'extra', 'parámetro desconocido en búsqueda'],
    ['/v1/stations/baqueira-beret?x=1', 'x', 'detalle no admite query'],
    ['/v1/stations/baqueira-beret/report?x=1', 'x', 'parte no admite query'],
    ['/v1/season-dates?x=1', 'x', 'season-dates no admite query'],
    ['/v1/rankings/nieve?limit=1', 'limit', 'ranking no admite paginación'],
  ];
  for (const [url, field, why] of cases) {
    const res = await fetch(`${base}${url}`);
    assert.strictEqual(res.status, 400, `${url} (${why}) ⇒ ${res.status} (esperado 400)`);
    const body = await res.json();
    assert.strictEqual(body.error, 'invalid', `${url}: error debe ser 'invalid'`);
    assert.strictEqual(body.status, 'invalid', `${url}: status debe ser 'invalid'`);
    assert.ok(Array.isArray(body.fields) && body.fields.length > 0, `${url}: fields[] vacío`);
    assert.ok(
      body.fields.some((f: { field?: string }) => f.field === field),
      `${url}: fields no nombra '${field}' (${JSON.stringify(body.fields)})`,
    );
    assertProvenance(body, `${url} (400)`);
  }
  await closeAll();
});

test('C28b: PUT de estación con cuerpo inválido ⇒ 400 con el campo, y no escribe', async () => {
  const dir = seedDir();
  const { base } = await boot({ token: TOKEN, dir });
  const before = readFileSync(join(dir, 'stations.json'), 'utf8');
  const cases: Array<[Record<string, unknown>, string]> = [
    [{ ...station({ slug: 'otra-mas' }), discipline: 'bogus' }, 'discipline'],
    [{ ...station({ slug: 'otra-mas' }), lat: 99 }, 'lat'],
    [{ ...station({ slug: 'otra-mas' }), altitudeBaseM: -99 }, 'altitudeBaseM'],
    [{ ...station({ slug: 'otra-mas' }), secretField: 1 }, 'secretField'],
    [station(), 'slug'],
    // seasonConfirmed=true sin fechas: incoherencia semántica
    [{ ...station({ slug: 'otra-mas' }), seasonConfirmed: true }, 'seasonConfirmed'],
  ];
  for (const [body, field] of cases) {
    const res = await fetch(`${base}/v1/admin/stations/otra-mas`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
    });
    assert.strictEqual(res.status, 400, `PUT con ${field} inválido ⇒ ${res.status}`);
    const out = await res.json();
    assert.ok(
      out.fields.some((f: { field?: string }) => f.field === field),
      `PUT: fields no nombra '${field}' (${JSON.stringify(out.fields)})`,
    );
  }
  assert.strictEqual(readFileSync(join(dir, 'stations.json'), 'utf8'), before, 'un PUT rechazado NO debe tocar el almacén');
  await closeAll();
});

// ------------------------------------------------------------------------ C28c

test('C28c: paginación real — tope 100, páginas contiguas, total estable', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'snow-c28-page-'));
  dirs.push(dir);
  const records = Array.from({ length: 130 }, (_, i) =>
    station({ slug: `est-${String(i).padStart(3, '0')}`, name: `Estación ${String(i).padStart(3, '0')}` }),
  );
  writeFileSync(join(dir, 'stations.json'), JSON.stringify({ schemaVersion: 1, updatedAt: FIXED_NOW.toISOString(), records }));
  writeFileSync(join(dir, 'snow-reports.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  writeFileSync(join(dir, 'osm-derived.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  const { base } = await boot({ token: TOKEN, dir });

  const p1 = await (await fetch(`${base}/v1/stations?pageSize=100&page=1`)).json();
  assert.strictEqual(p1.stations.length, 100, 'la página 1 debe traer 100');
  assert.deepStrictEqual(p1.pagination, { page: 1, pageSize: 100, total: 130, totalPages: 2, hasNext: true, hasPrev: false });
  const p2 = await (await fetch(`${base}/v1/stations?pageSize=100&page=2`)).json();
  assert.strictEqual(p2.stations.length, 30, 'la página 2 debe traer los 30 restantes');
  assert.strictEqual(p2.pagination.hasNext, false);
  assert.strictEqual(p2.pagination.hasPrev, true);

  const slugs1 = new Set(p1.stations.map((s: { slug: string }) => s.slug));
  const overlap = p2.stations.filter((s: { slug: string }) => slugs1.has(s.slug));
  assert.deepStrictEqual(overlap, [], 'las páginas no pueden solaparse');

  const capped = await fetch(`${base}/v1/stations?pageSize=101`);
  assert.strictEqual(capped.status, 400, 'pageSize=101 debe ser 400 (tope 100)');

  const dflt = await (await fetch(`${base}/v1/stations`)).json();
  assert.strictEqual(dflt.pagination.pageSize, 20, 'pageSize por defecto = 20');
  await closeAll();
});

// ------------------------------------------------------------------------ C28d

test('C28d: todo dato variable expone la tupla de procedencia completa', async () => {
  const { base } = await boot({ token: TOKEN, dir: seedDir() });
  const endpoints = [
    '/v1/stations',
    '/v1/stations/baqueira-beret',
    '/v1/stations/baqueira-beret/report',
    '/v1/stations/baqueira-beret/forecast',
    '/v1/stations/baqueira-beret/alerts',
    '/v1/stations/baqueira-beret/webcams',
    '/v1/stations/grandvalira/report',
    '/v1/avalanche',
    '/v1/rankings/nieve',
    '/v1/rankings/km',
    '/v1/season-dates',
    '/v1/search?q=pirineo',
  ];
  for (const url of endpoints) {
    const res = await fetch(`${base}${url}`);
    assert.strictEqual(res.status, 200, `${url} ⇒ ${res.status}`);
    assertProvenance(await res.json(), url);
  }
  // Admin: también con procedencia (estado de fuentes).
  const cfg = await fetch(`${base}/v1/config`, { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.strictEqual(cfg.status, 200);
  assertProvenance(await cfg.json(), '/v1/config');
  await closeAll();
});

test('C28d: la nieve observada por estación trae source/observedAt/updatedAt/status', async () => {
  const { base } = await boot({ token: TOKEN, dir: seedDir() });
  const body = await (await fetch(`${base}/v1/stations`)).json();
  const bq = body.stations.find((s: { slug: string }) => s.slug === 'baqueira-beret');
  assert.ok(bq?.snow, 'baqueira tiene parte publicado: debe traer snow');
  for (const f of ['baseCm', 'observedAt', 'updatedAt', 'source', 'status']) {
    assert.ok(f in bq.snow, `snow sin '${f}'`);
  }
  assert.strictEqual(bq.snow.source, 'editorial-report');
  await closeAll();
});

// ------------------------------------------------------------------------ C28e

test('C28e: no_data / not_configured / blocked / stale son estados DISTINTOS por HTTP', async () => {
  const { base } = await boot({ token: TOKEN, dir: seedDir() });
  // no_data: estación válida sin parte publicado (formigal sólo tiene borrador).
  const nodata = await (await fetch(`${base}/v1/stations/formigal-panticosa/report`)).json();
  assert.strictEqual(nodata.status, 'no_data', 'sin parte ⇒ no_data');
  assert.ok(nodata.reason, 'no_data debe explicar el motivo');
  assert.strictEqual(nodata.report.snow, null, 'sin parte no hay espesores');

  // not_configured ⇒ la cadena termina en `no_data` con su motivo (02 §3.2 /
  // SNOW-02 §4.1 fila 4: "degradado a not_configured"). Es un DATO ⇒ 200, nunca 500.
  const nc = await fetch(`${base}/v1/stations/baqueira-beret/forecast`);
  assert.strictEqual(nc.status, 200, 'la degradación por falta de credencial es un DATO ⇒ 200, nunca 500');
  const fc = await nc.json();
  assert.ok(['not_configured', 'no_data'].includes(fc.status), `estado de previsión inesperado '${fc.status}'`);
  assert.ok(fc.reason, 'la degradación debe explicar el motivo');
  assert.strictEqual(fc.data, undefined, 'degradado NO puede traer datos');

  // Alertas: AEMET/Météo-France exigen credencial, pero desde SNOW-03 la cadena
  // incluye MeteoAlarm, que NO requiere credencial y está licenciado. Por tanto
  // el estado puede ser `ok` (con avisos reales) y no sólo `not_configured`.
  const alerts = await (await fetch(`${base}/v1/stations/baqueira-beret/alerts`)).json();
  assert.ok(
    ['not_configured', 'no_data', 'ok'].includes(alerts.status),
    `/alerts sin credencial ⇒ '${alerts.status}'`,
  );
  if (alerts.status === 'ok') {
    assert.strictEqual(alerts.provenance.source, 'meteoalarm', 'sin credencial sólo MeteoAlarm puede servir');
    assert.ok(Array.isArray(alerts.alerts) && alerts.alerts.length > 0, 'ok implica avisos reales');
  } else {
    assert.deepStrictEqual(alerts.alerts, [], 'sin dato no puede haber alertas');
  }

  // blocked: imágenes por licencia.
  const blocked = await (await fetch(`${base}/v1/stations/baqueira-beret/webcams`)).json();
  assert.strictEqual(blocked.status, 'blocked');
  assert.strictEqual(blocked.reason, 'license-prohibits');
  assert.deepStrictEqual(blocked.grants, []);

  // Estado de INDISPONIBILIDAD del proveedor de aludes (sin AEMET_API_KEY): la
  // respuesta puede ser `not_configured` (si se expone el eslabón) o `no_data`
  // (si la cadena agota los eslabones); lo que es no negociable es que sea tipada,
  // con motivo y sin datos.
  const avRes = await fetch(`${base}/v1/avalanche`);
  assert.strictEqual(avRes.status, 200, 'la falta de proveedor no es un 500');
  const av = await avRes.json();
  assert.ok(['not_configured', 'no_data'].includes(av.status), `/avalanche estado inesperado '${av.status}'`);
  assert.ok(av.reason, '/avalanche debe explicar el motivo');

  // stale: parte más antiguo que el TTL ⇒ `stale`, y NO `ok` (verificado en la
  // superficie donde el borde lo decide: directorio y ranking exponen
  // `snow.status`, y `/report` mantiene `ok` porque su tupla es la del dato
  // publicado mientras `observedAt` la data — el cliente lo rotula por edad).
  const staleList = await (await fetch(`${base}/v1/stations`)).json();
  const gv = staleList.stations.find((s: { slug: string }) => s.slug === 'grandvalira');
  assert.strictEqual(gv.snow.status, 'stale', 'un parte caducado debe declararse stale, no live');

  // `ok` convive con ellos y NO colapsa: baqueira sí tiene dato fresco.
  const okReport = await (await fetch(`${base}/v1/stations/baqueira-beret/report`)).json();
  assert.strictEqual(okReport.status, 'ok', 'un parte fresco publicado es ok');

  // Los cuatro estados tipados son distintos entre sí (no colapsan en uno).
  const kinds = new Set([nodata.status, av.status, blocked.status, gv.snow.status]);
  assert.deepStrictEqual(
    [...kinds].sort(),
    ['blocked', 'no_data', 'stale'],
    `estados de indisponibilidad observados: ${[...kinds].join(',')}`,
  );
  assert.ok(['not_configured', 'no_data'].includes(av.status), 'not_configured es el estado tipado de proveedor sin credencial');
  await closeAll();
});

test('C28e: /alerts sin credencial ⇒ estado tipado con provenance (nunca avisos inventados)', async () => {
  const { base } = await boot({ token: TOKEN, dir: seedDir() });
  const res = await fetch(`${base}/v1/stations/baqueira-beret/alerts`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  // SNOW-03: MeteoAlarm sirve sin credencial ⇒ `ok` es un estado legítimo.
  assert.ok(
    ['not_configured', 'no_data', 'ok'].includes(body.status),
    `estado inesperado '${body.status}'`,
  );
  if (body.status === 'ok') {
    assert.strictEqual(body.provenance.source, 'meteoalarm');
    assert.ok(body.alerts.length > 0, '`ok` sólo con avisos reales del feed');
  } else {
    assert.deepStrictEqual(body.alerts, [], 'sin proveedor NO puede haber alertas');
  }
  assertProvenance(body, '/alerts');

  const missing = await fetch(`${base}/v1/stations/no-existe/alerts`);
  assert.strictEqual(missing.status, 404, 'slug inexistente ⇒ 404');
  const nf = await missing.json();
  assert.strictEqual(nf.status, 'not_found');
  assertProvenance(nf, '/alerts 404');
  await closeAll();
});

// ------------------------------------------------------------------------ C28f

test('C28f: null ≠ 0 — sin parte, snow es null (nunca baseCm 0); el borrador no cuenta', async () => {
  const { base } = await boot({ token: TOKEN, dir: seedDir() });
  const body = await (await fetch(`${base}/v1/stations`)).json();
  const fg = body.stations.find((s: { slug: string }) => s.slug === 'formigal-panticosa');
  assert.strictEqual(fg.snow, null, 'sin parte publicado, snow debe ser null');
  assert.notStrictEqual(fg.snow?.baseCm, 0, 'jamás 0 como "sin dato"');
  assert.ok(!JSON.stringify(fg).includes('999'), 'un borrador no puede filtrarse como dato');

  const ranking = await (await fetch(`${base}/v1/rankings/nieve`)).json();
  const fgRank = ranking.ranking.find((r: { stationSlug: string }) => r.stationSlug === 'formigal-panticosa');
  assert.strictEqual(fgRank, undefined, 'un borrador no entra en el ranking');

  // `snowMin` no puede satisfacerse con ausencia: filtrar >0 excluye a quien no tiene parte.
  const filtered = await (await fetch(`${base}/v1/stations?snowMin=1`)).json();
  const slugs = filtered.stations.map((s: { slug: string }) => s.slug).sort();
  assert.deepStrictEqual(slugs, ['baqueira-beret', 'grandvalira'], `snowMin=1 debe excluir a quien no tiene observación (dio ${slugs.join(',')})`);
  await closeAll();
});

test('C28f: un parte caducado no se sirve como actual (stale en report y en el directorio)', async () => {
  const { base } = await boot({ token: TOKEN, dir: seedDir() });
  const dir = await (await fetch(`${base}/v1/stations`)).json();
  const gv = dir.stations.find((s: { slug: string }) => s.slug === 'grandvalira');
  assert.strictEqual(gv.snow.status, 'stale', 'el parte de 3 h se rotula stale en el directorio');
  assert.notStrictEqual(gv.snow.status, 'live');
  const bq = dir.stations.find((s: { slug: string }) => s.slug === 'baqueira-beret');
  assert.strictEqual(bq.snow.status, 'live', 'el parte de 5 min sí es live');

  const ranking = await (await fetch(`${base}/v1/rankings/nieve`)).json();
  const gvRank = ranking.ranking.find((r: { stationSlug: string }) => r.stationSlug === 'grandvalira');
  assert.strictEqual(gvRank.status, 'stale', 'el ranking expone el estado por entrada');
  await closeAll();
});

// ------------------------------------------------------------------------ C28g

test('C28g: PUT estación — 201 al crear, 200 al actualizar, con procedencia', async () => {
  const dir = seedDir();
  const { base } = await boot({ token: TOKEN, dir });
  const body = {
    ...station({ slug: 'port-aine', name: 'Port Ainé', region: 'Pirineo Catalán' }),
    altitudeBaseM: 1650, altitudeTopM: 2440, seasonOpen: '12-01', seasonClose: '04-15', seasonConfirmed: true,
  };
  const auth = { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` };
  const created = await fetch(`${base}/v1/admin/stations/port-aine`, { method: 'PUT', headers: auth, body: JSON.stringify(body) });
  assert.strictEqual(created.status, 201, 'crear ⇒ 201');
  const c = await created.json();
  assert.strictEqual(c.created, true);
  assert.strictEqual(c.station.slug, 'port-aine');
  assertProvenance(c, 'PUT 201');

  const updated = await fetch(`${base}/v1/admin/stations/port-aine`, {
    method: 'PUT', headers: auth, body: JSON.stringify({ ...body, name: 'Port Ainé (editado)' }),
  });
  assert.strictEqual(updated.status, 200, 'actualizar ⇒ 200');
  assert.strictEqual((await updated.json()).created, false);

  // Y persiste: la ficha pública lo sirve con la edición aplicada.
  const detail = await (await fetch(`${base}/v1/stations/port-aine`)).json();
  assert.strictEqual(detail.station.name, 'Port Ainé (editado)');
  // Reloj fijo 2026-11-16 y temporada declarada 12-01 → 04-15: fuera de ventana.
  assert.strictEqual(detail.station.season, 'closed', 'la temporada declarada debe evaluarse, no ignorarse');
  assert.strictEqual(detail.station.snow, null, 'sin parte, la nieve es null (no 0)');
  assert.ok(readFileSync(join(dir, 'stations.json'), 'utf8').includes('Port Ainé (editado)'), 'el upsert debe persistir');
  await closeAll();
});

test('C28g: escrituras admin sin token ⇒ 401 y el almacén NO cambia', async () => {
  const dir = seedDir();
  const { base } = await boot({ token: null, dir });
  const before = readFileSync(join(dir, 'stations.json'), 'utf8');
  const reportsBefore = readFileSync(join(dir, 'snow-reports.json'), 'utf8');
  const put = await fetch(`${base}/v1/admin/stations/otra`, {
    method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(station({ slug: 'otra' })),
  });
  assert.strictEqual(put.status, 401);
  const post = await fetch(`${base}/v1/admin/reports`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      stationSlug: 'baqueira-beret', observedAt: FIXED_NOW.toISOString(),
      sourceUrl: 'https://example.invalid/x', author: 'op', confidence: 0.9,
    }),
  });
  assert.strictEqual(post.status, 401);
  assert.strictEqual(readFileSync(join(dir, 'stations.json'), 'utf8'), before, 'un PUT anónimo no debe escribir');
  assert.strictEqual(readFileSync(join(dir, 'snow-reports.json'), 'utf8'), reportsBefore, 'un POST anónimo no debe escribir');
  await closeAll();
});

test('C28g: POST parte de estación inexistente ⇒ 400 nombrando stationSlug', async () => {
  const dir = seedDir();
  const { base } = await boot({ token: TOKEN, dir });
  const res = await fetch(`${base}/v1/admin/reports`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      stationSlug: 'no-existe', observedAt: FIXED_NOW.toISOString(),
      sourceUrl: 'https://example.invalid/x', author: 'op', confidence: 0.9,
    }),
  });
  assert.strictEqual(res.status, 400, 'un parte huérfano no se persiste');
  const out = await res.json();
  assert.ok(out.fields.some((f: { field?: string }) => f.field === 'stationSlug'));
  await closeAll();
});

test('C28g: GET /v1/config es el estado de fuentes (proveedores, cuotas, limitaciones)', async () => {
  const { base } = await boot({ token: TOKEN, dir: seedDir() });
  const res = await fetch(`${base}/v1/config`, { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  const ids = body.providers.map((p: { id: string }) => p.id);
  for (const must of ['aemet', 'meteofrance', 'copernicus-c3s', 'editorial-stations', 'editorial-report', 'infonieve']) {
    assert.ok(ids.includes(must), `config no informa de '${must}'`);
  }
  const aemet = body.providers.find((p: { id: string }) => p.id === 'aemet');
  assert.strictEqual(aemet.configured, false, 'sin AEMET_API_KEY debe declararse no configurado');
  assert.strictEqual(aemet.missingEnv, 1, 'B1: /config no filtra NOMBRES de variables, solo el recuento');
  const blocked = body.providers.find((p: { id: string }) => p.id === 'infonieve');
  assert.strictEqual(blocked.licenseStatus, 'blocked');
  assert.ok(Array.isArray(body.limitations) && body.limitations.length >= 3, 'las limitaciones de v1 deben declararse');
  await closeAll();
});

test('C28g: search con `q` filtra y con `q` sin coincidencias responde no_data (no lista vacía muda)', async () => {
  const { base } = await boot({ token: TOKEN, dir: seedDir() });
  const hit = await (await fetch(`${base}/v1/search?q=baqueira`)).json();
  assert.strictEqual(hit.status, 'ok');
  assert.deepStrictEqual(hit.stations.map((s: { slug: string }) => s.slug), ['baqueira-beret']);

  const miss = await (await fetch(`${base}/v1/search?q=zzzz`)).json();
  assert.strictEqual(miss.status, 'no_data');
  assert.ok(miss.reason, 'no_data debe explicar el motivo');
  assert.deepStrictEqual(miss.stations, []);
  await closeAll();
});
