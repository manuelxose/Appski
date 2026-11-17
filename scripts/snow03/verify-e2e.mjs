#!/usr/bin/env node
/**
 * SNOW-03 · FASE F — Verificación REAL end-to-end del borde de nieve.
 *
 * Arranca el servidor de nieve desde FUENTE (sin build de Angular, mismo router
 * que producción) y verifica contra la red y el disco reales:
 *
 *   F1  /v1/config expone meteoalarm como fuente con licencia y cobertura medida
 *   F2  /v1/stations/:slug/alerts sirve avisos REALES con atribución y antigüedad
 *   F3  /v1/stations/:slug/forecast degrada honestamente (Open-Meteo NO cableado)
 *   F4  persistencia tras SIGKILL: lo escrito sobrevive a un reinicio brutal
 *
 * Uso (evento TypeScript desde fuente):
 *   node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
 *        scripts/snow03/verify-e2e.mjs
 *
 * Salida: exit 0 sólo si TODOS los checks pasan. Evidencia en
 *   docs/snow/snow03-evidence/real/e2e-<fecha>.json
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, mkdtempSync, openSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createServer as httpCreateServer } from 'node:http';
import { meteoalarmAdapter } from '../../web-ssr/src/snow/providers/meteoalarm.adapter.ts';
import { globalFetchClient } from '../../web-ssr/src/snow/providers/http-client.ts';
import {
  authorizationFor,
  METEOALARM_DISCLAIMER,
  METEOALARM_SOURCE_URL,
  meteoalarmAttribution,
} from '../../web-ssr/src/snow/providers/authorizations.ts';
import { Breaker } from '../../web-ssr/src/snow/cache/breaker.ts';
import { CACHE_POLICY } from '../../web-ssr/src/snow/cache/cache-policy.ts';
import { IngestPipeline } from '../../web-ssr/src/snow/ingest/pipeline.ts';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'docs/snow/snow03-evidence/real');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const CANARY_TOKEN = 'snow03-e2e-canary-token';

const results = [];
let failures = 0;
const check = (name, ok, detail) => {
  results.push({ name, ok: Boolean(ok), detail: detail ?? null });
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === undefined ? '' : ` :: ${JSON.stringify(detail).slice(0, 200)}`}`);
};

const freePort = () =>
  new Promise((res, rej) => {
    const s = createServer();
    s.unref();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Arranca el servidor de nieve desde fuente.
 *
 * Los logs del servidor van a `logDir`, un temporal PROPIO del driver, NUNCA a
 * `SNOW_DATA_DIR`: ese directorio es el almacén de dominio y sólo debe contener
 * colecciones `.json`.
 */
const startServer = async (dataDir, logDir) => {
  const port = await freePort();
  const logPath = join(logDir, `server-${port}.log`);
  const fd = openSync(logPath, 'w');
  const proc = spawn(
    process.execPath,
    [
      '--experimental-transform-types',
      '--import',
      './scripts/snow/ts-loader.mjs',
      'scripts/snow02/snow-api-server.mjs',
    ],
    {
      cwd: ROOT,
      env: { ...process.env, SNOW_DATA_DIR: dataDir, SNOW_ADMIN_TOKEN: CANARY_TOKEN, PORT: String(port), TEMP: dataDir, TMP: dataDir },
      stdio: ['ignore', fd, fd],
      windowsHide: true,
    },
  );
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`servidor terminó (code ${proc.exitCode}): ${safeLog(logPath)}`);
    const text = safeLog(logPath);
    if (text.includes('SNOW_READY')) break;
    await sleep(200);
  }
  if (!safeLog(logPath).includes('SNOW_READY')) throw new Error(`timeout esperando SNOW_READY: ${safeLog(logPath)}`);
  const base = `http://127.0.0.1:${port}/api/snow`;
  // Sonda de disponibilidad real.
  for (let i = 0; i < 50; i += 1) {
    try {
      const r = await fetch(`${base}/v1/config`);
      if (r.status > 0) return { proc, port, base, logPath };
    } catch {
      /* aún no escucha */
    }
    await sleep(200);
  }
  throw new Error('el servidor no respondió a /v1/config');
};

function safeLog(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
}

const stopServer = async (proc) => {
  if (!proc || proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  await sleep(500);
  if (proc.exitCode === null) proc.kill('SIGKILL');
};

const killServer = async (proc) => {
  if (!proc || proc.exitCode !== null) return;
  // SIGKILL REAL: sin cierre ordenado.
  proc.kill('SIGKILL');
  for (let i = 0; i < 50 && proc.exitCode === null; i += 1) await sleep(100);
};

const json = async (url, init) => {
  const res = await fetch(url, init);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
};

const main = async () => {
  mkdirSync(OUT_DIR, { recursive: true });

  // ── Proxy LOCAL de inyección de fallos ──────────────────────────────────────
  // Primer intento ⇒ 503; siguientes ⇒ 200 con el feed REAL capturado en disco.
  // Permite provocar «proveedor caído» de verdad desde el adapter, sin tocar la
  // red pública ni el código de producción.
  let proxyHits = 0;
  const feedBody = readFileSync(join(ROOT, 'web-ssr/src/snow/providers/fixtures/meteoalarm-portugal.xml'), 'utf8');
  const proxy = httpCreateServer((req, res) => {
    proxyHits += 1;
    if (proxyHits === 1) {
      res.writeHead(503, { 'content-type': 'text/plain' });
      res.end('upstream unavailable');
      return;
    }
    res.writeHead(200, { 'content-type': 'application/atom+xml; charset=utf-8' });
    res.end(feedBody);
  });
  await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
  const proxyPort = proxy.address().port;
  const proxyBase = `http://127.0.0.1:${proxyPort}/feeds/x`;

  // Adapter REAL apuntando al proxy: 1er intento 503 (retryable), 2º sirve.
  const proxied = meteoalarmAdapter(authorizationFor('meteoalarm'), {
    http: globalFetchClient,
    baseUrl: proxyBase,
    timeoutMs: 5_000,
  });
  const at = new Date('2026-11-17T00:30:00.000Z');
  const probeInput = {
    stationRef: { slug: 'baqueira-beret', country: 'PT', lat: 42.638, lng: 0.766 },
    requestedAt: at,
    dataType: 'weather-alert',
  };
  const firstHit = await proxied.fetch(probeInput);
  check('F5a: primer intento contra upstream 503 ⇒ error retryable', firstHit.status === 'error' && firstHit.retryable === true, {
    status: firstHit.status,
    retryable: firstHit.retryable ?? null,
  });
  const secondHit = await proxied.fetch(probeInput);
  check('F5a: segundo intento (upstream recuperado) ⇒ sirve datos reales', secondHit.status === 'ok' && secondHit.data.alerts.length > 0, {
    status: secondHit.status,
    alerts: secondHit.status === 'ok' ? secondHit.data.alerts.length : 0,
  });

  // Y a través del PIPELINE: reintenta el 503 y acaba OK, con métricas.
  proxyHits = 0;
  const injPipeline = new IngestPipeline({
    breaker: new Breaker(),
    now: () => at.getTime(),
    sleep: async () => {},
    policy: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 },
  });
  const piped = await injPipeline.execute('meteoalarm', 'weather-alert', () => proxied.fetch(probeInput));
  check('F5a: el pipeline reintenta el 503 y termina en ok', piped.status === 'ok', { status: piped.status, hits: proxyHits });
  check('F5a: las métricas cuentan el fallo y el acierto reales', (injPipeline.metricsFor('meteoalarm')?.attempts ?? 0) === 2, {
    attempts: injPipeline.metricsFor('meteoalarm')?.attempts ?? null,
  });

  const dataDir = mkdtempSync(join(tmpdir(), 'snow03-e2e-'));
  // Temporales del driver SEPARADOS del almacén de dominio.
  const logDir = mkdtempSync(join(tmpdir(), 'snow03-e2e-logs-'));
  let server = await startServer(dataDir, logDir);
  console.log(`SERVER up base=${server.base} dataDir=${dataDir}`);

  // ---------------------------------------------------------------- F1 config
  // /v1/config es una ruta ADMIN (requiere bearer), por eso 401 sin cabecera.
  const adminHeaders = { authorization: `Bearer ${CANARY_TOKEN}` };
  const cfg = await json(`${server.base}/v1/config`, { headers: adminHeaders });
  check('F1: /v1/config responde 200', cfg.status === 200, { status: cfg.status });
  const providers = Array.isArray(cfg.body?.providers) ? cfg.body.providers : [];
  const mal = providers.find((p) => p.id === 'meteoalarm');
  check('F1: meteoalarm declarado como fuente', Boolean(mal), mal ? { configured: mal.configured } : null);
  check('F1: meteoalarm con licencia con atribución', mal?.licenseStatus === 'allowed-with-attribution', {
    licenseStatus: mal?.licenseStatus ?? null,
  });
  check('F1: meteoalarm declara weather-alert', Array.isArray(mal?.dataTypes) && mal.dataTypes.includes('weather-alert'), {
    dataTypes: mal?.dataTypes ?? null,
  });
  const cov = cfg.body?.coverage;
  check('F1: /v1/config incluye cobertura medida', Boolean(cov?.byDataType?.length), {
    dataTypes: cov?.byDataType?.length ?? 0,
    countries: cov?.byCountry?.length ?? 0,
  });
  const wa = cov?.byDataType?.find((d) => d.dataType === 'weather-alert');
  check('F1: weather-alert en cobertura con eslabones (nunca inventada)', Boolean(wa), { state: wa?.state ?? null });
  check('F1: no se exponen nombres de variables de entorno', !/API_KEY|_KEY|TOKEN|SECRET/i.test(JSON.stringify(cfg.body)), null);

  // ---------------------------------------------------------------- F2 alerts
  const alerts = await json(`${server.base}/v1/stations/baqueira-beret/alerts`);
  check('F2: /alerts responde 200', alerts.status === 200, { status: alerts.status });
  const a = alerts.body ?? {};
  check('F2: /alerts sirve estado tipado', ['ok', 'no_data', 'not_configured', 'blocked', 'stale'].includes(a.status), {
    status: a.status ?? null,
  });
  const prov = a.provenance ?? {};
  const PROV_FIELDS = ['source', 'observedAt', 'updatedAt', 'status', 'licenseStatus', 'freshness', 'authorization', 'attribution'];
  const missingProv = PROV_FIELDS.filter((f) => !(f in prov));
  check('F2: procedencia completa', missingProv.length === 0, { missing: missingProv });
  if (a.status === 'ok') {
    check('F2: avisos REALES servidos', Array.isArray(a.alerts) && a.alerts.length > 0, { n: a.alerts?.length ?? 0 });
    check('F2: fuente meteoalarm', prov.source === 'meteoalarm', { source: prov.source });
    // T1 (t8): la atribución se comprueba por TEXTO obligatorio, no por «no vacío».
    // La consulta es de UN país (baqueira-beret → ES) ⇒ NMHS de ese país.
    check(
      'F2: atribución es el TEXTO obligatorio del NMHS del país',
      prov.attribution === meteoalarmAttribution(['ES']),
      { attribution: prov.attribution ?? null, expected: meteoalarmAttribution(['ES']) },
    );
    // CONFORMIDAD LEGAL (t8/L1): la API debe entregar el disclaimer LITERAL y el
    // enlace, de modo que un cliente pueda cumplir los T&C SÓLO con la respuesta.
    check('F2: /alerts publica el disclaimer LITERAL de los T&C', a.disclaimer === METEOALARM_DISCLAIMER, {
      matches: a.disclaimer === METEOALARM_DISCLAIMER,
    });
    check('F2: /alerts publica el sourceUrl obligatorio', a.sourceUrl === METEOALARM_SOURCE_URL, {
      sourceUrl: a.sourceUrl ?? null,
    });
    check(
      'F2: el disclaimer publicado no trae restos de Markdown',
      typeof a.disclaimer === 'string' && !/\]\(|\[|\]/.test(a.disclaimer),
      null,
    );
    check(
      'F2: cada aviso trae enlace utilizable (obligación «must include a link»)',
      (a.alerts ?? []).every((x) => typeof x.link === 'string' && /^https?:\/\//.test(x.link)),
      { sample: (a.alerts ?? [])[0]?.link ?? null },
    );
    // LATENCIA (t8): los T&C exigen media <5 min y NUNCA >10 min. La garantía es
    // el TTL de la caché. OJO: `freshness` mide ANTIGÜEDAD DE LA EMISIÓN, no la
    // latencia de redistribución — un aviso puede emitirse hace horas y seguir
    // vigente (MeteoAlarm sólo republica cuando cambia). Por eso aquí se verifica
    // el TTL EFECTIVO (que acota cuánto se reutiliza la copia) y no freshness.
    const ttlMs = CACHE_POLICY.meteoalarm?.ttlMs ?? Number.NaN;
    check('F2: el TTL efectivo del feed es ≤10 min (nunca supera el máximo legal)', Number.isFinite(ttlMs) && ttlMs <= 10 * 60_000, {
      ttlMs: Number.isFinite(ttlMs) ? ttlMs : null,
      maxLegalMs: 10 * 60_000,
    });
    check('F2: el TTL efectivo es el techo declarado (10 min)', ttlMs === 10 * 60_000, { ttlMs });
    // ANTI-VACUIDAD: `freshness` debe MEDIR la emisión real del feed. Si vuelve
    // a ser 0 significa que observedAt se está poniendo al instante de la
    // petición y la antigüedad es estructuralmente falsa ⇒ este check FALLA.
    //
    // NOTA MEDIDA: la emisión más reciente del feed ES puede tener horas de
    // antigüedad aunque el aviso siga VIGENTE (MeteoAlarm republica el boletín
    // sólo cuando cambia). Por eso el techo correcto es «la emisión no es
    // futura ni anterior a la ventana de validez del propio aviso», no el TTL de
    // caché (ese TTL limita cuánto se REUTILIZA el feed, no su antigüedad).
    const sentMs = Date.parse(prov.observedAt);
    const updatedOk = typeof prov.updatedAt === 'string' && prov.updatedAt === prov.observedAt;
    const nowMs = Date.now();
    const oldestValidUntil = Math.min(...(a.alerts ?? []).map((x) => Date.parse(x.validUntil)).filter(Number.isFinite));
    const freshnessS = typeof prov.freshness === 'number' ? prov.freshness : -1;
    const expectedS = Number.isFinite(sentMs) ? Math.max(0, Math.round((nowMs - sentMs) / 1000)) : -1;

    check('F2: observedAt es una emisión real (no el instante de la petición)', Number.isFinite(sentMs), {
      observedAt: prov.observedAt,
    });
    check('F2: updatedAt refleja la emisión (cap:sent)', updatedOk, { updatedAt: prov.updatedAt ?? null });
    check('F2: antigüedad MEDIDA > 0 (no se recalcula desde la petición)', freshnessS > 0, {
      freshness: prov.freshness,
    });
    // La antigüedad debe COINCIDIR con la emisión real (±120 s de holgura por el
    // instante de la llamada). Si observedAt fuese «ahora», esto valdría ~0.
    check(
      'F2: antigüedad coherente con la emisión real (±120 s)',
      expectedS > 0 && Math.abs(freshnessS - expectedS) <= 120,
      { freshness: freshnessS, fromEmission: expectedS },
    );
    check('F2: la emisión no es futura', Number.isFinite(sentMs) && sentMs <= nowMs + 60_000, {
      observedAt: prov.observedAt,
    });
    check(
      'F2: la emisión cae dentro de la ventana de validez de los avisos servidos',
      Number.isFinite(oldestValidUntil) && sentMs <= oldestValidUntil,
      { observedAt: prov.observedAt, oldestValidUntil: Number.isFinite(oldestValidUntil) ? new Date(oldestValidUntil).toISOString() : null },
    );
    const lvl = (a.alerts ?? []).map((x) => x.level);
    check('F2: niveles dentro del contrato', lvl.every((l) => ['yellow', 'orange', 'red', 'green'].includes(l)), {
      levels: [...new Set(lvl)],
    });
  } else {
    // T2 (t8): NO se salta en silencio. Si no hay avisos, la degradación debe ser
    // EXPLÍCITA y tipada, y no puede haber disclaimer inventado sobre un estado
    // vacío: se comprueba en vez de imprimir una nota y seguir.
    check(
      'F2: sin avisos el estado es de degradación tipada con motivo',
      ['no_data', 'not_configured', 'blocked', 'stale'].includes(a.status) &&
        (a.reason !== undefined || a.status === 'stale'),
      { status: a.status ?? null, reason: a.reason ?? null },
    );
    check('F2: sin avisos la lista está vacía (no se inventan)', Array.isArray(a.alerts) && a.alerts.length === 0, {
      n: a.alerts?.length ?? null,
    });
    check('F2: sin avisos no se publica un disclaimer huérfano de datos', a.disclaimer === undefined, {
      disclaimerPresent: a.disclaimer !== undefined,
    });
  }

  // ------------------------------------------------------ F2b catálogo (Fase B)
  // El catálogo maestro es de data-engineer (t2). Este bloque comprueba lo que
  // /v1/stations SIRVE contra el artefacto publicado en disco: si el JSON trae
  // 589 registros y la API sirve 3, la integración está PENDIENTE y el check
  // FALLA (no se declara cobertura que no se está sirviendo).
  const stations = await json(`${server.base}/v1/stations`);
  check('F2b: /v1/stations responde 200', stations.status === 200, { status: stations.status });
  // El contrato devuelve `stations`, no `items`.
  const items = Array.isArray(stations.body?.stations) ? stations.body.stations : [];
  check('F2b: /v1/stations devuelve estaciones', items.length > 0, { n: items.length });
  const stationProv = stations.body?.provenance ?? null;
  check('F2b: /v1/stations expone procedencia', Boolean(stationProv), {
    source: stationProv?.source ?? null,
  });
  const withProvenance = items.filter((s) => s && typeof s.country === 'string' && typeof s.slug === 'string');
  check('F2b: cada estación trae identidad (slug+country)', withProvenance.length === items.length, {
    ok: withProvenance.length,
    total: items.length,
  });
  const countries = [...new Set(items.map((s) => s.country))].sort();
  check('F2b: cobertura por país declarada, sin inventar', countries.every((c) => ['ES', 'AD', 'FR', 'PT'].includes(c)), {
    countries,
  });
  // ── Integración del catálogo de Fase B (t2) ──────────────────────────────
  const catalogPath = join(ROOT, 'web-ssr/src/snow/catalog/station-catalog.json');
  let catalog = null;
  if (existsSync(catalogPath)) {
    try {
      const raw = JSON.parse(readFileSync(catalogPath, 'utf8'));
      catalog = Array.isArray(raw) ? raw : (raw.records ?? null);
    } catch {
      catalog = null;
    }
  }
  const servedSlugs = new Set(items.map((s) => s.slug));
  // ── IMPORTANTE (defecto del propio check, corregido) ──────────────────────
  // `/v1/stations` está PAGINADO (20 por defecto, tope 100). Contar `items` de una
  // sola respuesta mide el tamaño de página, no la integración: con el catálogo
  // cargado y sirviéndose, este check reportaba `served: 20` y FALLABA igual.
  // Se recorre la paginación COMPLETA para conocer el conjunto realmente servido.
  const servedAll = new Set(servedSlugs);
  let pageNo = 1;
  let totalReported = stations.body?.pagination?.total ?? null;
  for (;;) {
    const r = await json(`${server.base}/v1/stations?pageSize=100&page=${pageNo}`);
    for (const s of r.body?.stations ?? []) servedAll.add(s.slug);
    totalReported = r.body?.pagination?.total ?? totalReported;
    if (!r.body?.pagination?.hasNext) break;
    pageNo += 1;
    if (pageNo > 50) break;
  }
  const catalogSlugs = new Set((catalog ?? []).map((r) => r.slug));
  const missing = [...catalogSlugs].filter((s) => !servedAll.has(s));
  const overlap = [...servedAll].filter((s) => catalogSlugs.has(s)).length;
  const integrated = Array.isArray(catalog) && catalog.length > 0 && missing.length === 0;

  check('F2b: el catálogo de Fase B existe en disco', Array.isArray(catalog) && catalog.length > 0, {
    records: catalog?.length ?? null,
  });
  // La procedencia debe declarar la fuente del maestro servido.
  check('F2b: /v1/stations declara la fuente del maestro', typeof stationProv?.source === 'string' && stationProv.source.length > 0, {
    source: stationProv?.source ?? null,
  });
  // Una estación del catálogo (no del seed) debe resolver su detalle.
  const firstCatalogSlug = [...catalogSlugs].find((s) => !['baqueira-beret', 'formigal-panticosa', 'grandvalira'].includes(s));
  if (firstCatalogSlug !== undefined) {
    const det = await json(`${server.base}/v1/stations/${firstCatalogSlug}`);
    check('F2b: el detalle de una estación del catálogo resuelve (200)', det.status === 200, {
      slug: firstCatalogSlug,
      status: det.status,
    });
  }
  if (!integrated) {
    // HALLAZGO BLOQUEANTE de integración (t2 ↔ borde): se reporta como FALLO, no
    // como aviso. La verificación correcta NO puede pasar en verde afirmando que
    // el catálogo está conectado cuando faltan registros.
    check('F2b: /v1/stations sirve TODOS los registros del catálogo (integración real)', false, {
      served: servedAll.size,
      catalog: catalog?.length ?? null,
      missing: missing.length,
      sample: missing.slice(0, 5),
      blocking:
        'el catálogo de Fase B existe en disco pero /v1/stations no sirve todos sus registros: ' +
        'revisar el loader de `catalog/station-loader.ts` y su montaje en el bootstrap del almacén.',
    });
  } else {
    check('F2b: /v1/stations sirve TODOS los registros del catálogo (integración real)', true, {
      served: servedAll.size,
      catalog: catalog?.length ?? null,
      total: totalReported,
      overlap,
    });
  }
  console.log(
    `note: catálogo Fase B=${catalog?.length ?? 'ausente'} · servido=${servedAll.size} · países=${countries.join('/') || '-'} · integrado=${integrated}`,
  );

  // -------------------------------------------------- F5 degradación en HTTP
  // Failure-injection a NIVEL HTTP (lo que faltaba): un proveedor caído inyectado
  // desde el propio endpoint. `/forecast` consulta la cadena aemet→meteofrance→
  // copernicus-c3s; ninguno tiene credencial, así que el borde debe degradar con
  // estado TIPADO, sin 500 y sin ceros. Se repite para probar idempotencia.
  const seen = [];
  for (let i = 0; i < 2; i += 1) {
    const r = await fetch(`${server.base}/v1/stations/baqueira-beret/forecast`);
    let body = null;
    try {
      body = await r.json();
    } catch {
      body = null;
    }
    seen.push({ http: r.status, status: body?.status ?? null, hasProv: Boolean(body?.provenance), data: body?.data });
  }
  check('F5: proveedor caído ⇒ el endpoint NUNCA devuelve 500', seen.every((s) => s.http !== 500), {
    http: seen.map((s) => s.http),
  });
  check('F5: responde 200 con estado de DATO tipado (no error de transporte)', seen.every((s) => s.http === 200 && ['no_data', 'not_configured', 'stale', 'ok'].includes(s.status)), {
    status: seen.map((s) => s.status),
  });
  check('F5: sin dato no se devuelven ceros ni payload inventado', seen.every((s) => s.data === undefined || s.data === null), {
    data: seen.map((s) => (s.data === undefined ? 'absent' : 'present')),
  });
  check('F5: la procedencia sigue presente en la degradación', seen.every((s) => s.hasProv), {
    hasProv: seen.map((s) => s.hasProv),
  });
  check('F5: la degradación es idempotente entre llamadas', seen[0].status === seen[1].status, {
    statuses: seen.map((s) => s.status),
  });

  // -------------------------------------------------------------- F3 forecast
  const fc = await json(`${server.base}/v1/stations/baqueira-beret/forecast`);
  check('F3: /forecast responde 200 (degradación, no error)', fc.status === 200, { status: fc.status });
  const f = fc.body ?? {};
  check('F3: /forecast degrada de forma tipada', ['not_configured', 'no_data', 'ok', 'stale'].includes(f.status), {
    status: f.status ?? null,
  });
  check('F3: Open-Meteo NO aparece como fuente de pronóstico', f.provenance?.source !== 'open-meteo', {
    source: f.provenance?.source ?? null,
  });
  check('F3: sin dato no hay bundle inventado', f.status === 'ok' ? true : f.data === undefined || f.data === null, {
    status: f.status ?? null,
  });

  // ------------------------------------------------------------ F4 persistence
  const observedAt = new Date().toISOString();
  const payload = {
    stationSlug: 'baqueira-beret',
    observedAt,
    sourceUrl: 'https://www.baqueira.es/parte-de-nieve',
    author: 'snow03-e2e-driver',
    confidence: 0.91,
    operational: { liftsOpen: 17, liftsTotal: 30, pistesOpen: 22, pistesTotal: 70, kmOpen: 40, kmTotal: 120 },
    snow: { baseCm: 60, midCm: 80, topCm: 110, newSnow24hCm: 5 },
  };
  const post = await json(`${server.base}/v1/admin/reports`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${CANARY_TOKEN}` },
    body: JSON.stringify(payload),
  });
  check('F4: POST /admin/reports acepta el parte', post.status === 200 || post.status === 201, { status: post.status });

  const before = await json(`${server.base}/v1/stations/baqueira-beret/report`);
  // El contrato de /report anida el parte en `report`.
  const beforeLifts = before.body?.report?.operational?.liftsOpen ?? null;
  check('F4: el parte se lee ANTES del kill', beforeLifts === 17, { liftsOpen: beforeLifts });

  await killServer(server.proc);
  check('F4: proceso terminado con SIGKILL (sin cierre ordenado)', server.proc.exitCode !== null || server.proc.signalCode !== null, {
    code: server.proc.exitCode,
    signal: server.proc.signalCode,
  });

  // Reinicio sobre el MISMO dataDir.
  server = await startServer(dataDir, logDir);
  const after = await json(`${server.base}/v1/stations/baqueira-beret/report`);
  const afterLifts = after.body?.report?.operational?.liftsOpen ?? null;
  check('F4: tras SIGKILL el parte sigue ahí', afterLifts === 17, { liftsOpen: afterLifts });
  check('F4: se conserva la atribución del parte', after.body?.report?.provenance?.source === 'editorial-report' || after.body?.provenance?.source === 'editorial-report', {
    source: after.body?.report?.provenance?.source ?? after.body?.provenance?.source ?? null,
  });

  // /v1/config sigue sano tras el reinicio.
  const cfg2 = await json(`${server.base}/v1/config`, { headers: adminHeaders });
  check('F4: /v1/config responde tras el reinicio', cfg2.status === 200, { status: cfg2.status });

  const files = existsSync(dataDir) ? readdirSync(dataDir) : [];
  // El almacén sólo debe contener colecciones `.json`. Se admite el marcador de seed
  // `.seed-applied.json` (dotfile de METADATOS del bootstrap: dice qué ficheros copió
  // el seed, y es lo que decide si el catálogo maestro se aplica a este directorio).
  // No es una colección y no lleva datos de dominio.
  const METADATA_FILES = ['.seed-applied.json'];
  const nonCollection = files.filter((f) => !f.endsWith('.json') && !METADATA_FILES.includes(f));
  const strayJson = files.filter((f) => f.endsWith('.json') && METADATA_FILES.includes(f) === false && !f.includes('.v2.'));
  check('F4: el almacén sólo contiene colecciones .json', files.length > 0 && nonCollection.length === 0, {
    files: files.slice(0, 12),
    nonCollection,
    collections: strayJson.slice(0, 12),
  });
  // Y el marcador NO puede aparecer si no se aplicó seed (no se inventa metadatos).
  const hasMarker = files.includes('.seed-applied.json');
  check('F4: el almacén declara si su seed se aplicó (marcador de arranque)', hasMarker, { hasMarker });

  await stopServer(server.proc);
  // Cierre del proxy de inyección de fallos.
  await new Promise((r) => proxy.close(r));

  // EVIDENCIA NORMALIZADA: sólo checks y resultados estables. Se omiten
  // deliberadamente `generatedAt`, el puerto efímero y los instantes medidos,
  // para que dos corridas sobre el mismo contenido produzcan el mismo JSON y el
  // árbol no derive en cada ejecución.
  const volatile = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
  const normalize = (v) => {
    if (typeof v === 'string' && volatile.test(v)) return '<timestamp>';
    if (Array.isArray(v)) return v.map(normalize);
    if (v && typeof v === 'object') {
      const o = {};
      for (const [k, val] of Object.entries(v)) o[k] = normalize(val);
      return o;
    }
    return v;
  };
  const evidence = {
    note:
      'Verificación REAL end-to-end de SNOW-03 sobre el servidor de nieve ejecutado desde fuente. ' +
      'Consultas HTTP reales, red real y SIGKILL real. Evidencia normalizada: sin timestamps ni puertos.',
    kind: 'snow03-e2e',
    results: normalize(results),
    summary: { total: results.length, passed: results.filter((r) => r.ok).length, failed: failures },
  };
  // UNA sola evidencia canónica por corrida válida: se borran las `e2e-*.json`
  // anteriores antes de escribir. Las repeticiones no se acumulan.
  for (const f of existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : []) {
    if (f.startsWith('e2e-') && f.endsWith('.json')) rmSync(join(OUT_DIR, f), { force: true });
  }
  const path = join(OUT_DIR, `e2e-${STAMP}.json`);
  writeFileSync(path, JSON.stringify(evidence, null, 2), 'utf8');
  console.log(`EVIDENCE ${path}`);
  console.log(`SUMMARY ${evidence.summary.passed}/${evidence.summary.total} checks OK`);

  if (failures > 0) {
    console.error(`FAIL ${failures} check(s) no cumplieron`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`FAIL verify-e2e: ${error?.stack ?? error}`);
  process.exit(1);
});
