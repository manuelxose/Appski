#!/usr/bin/env node
/**
 * SNOW-03b t1 — VERIFICACIÓN REAL de AEMET OpenData de punta a punta.
 *
 * Ejecuta el ADAPTER real (sin dobles) contra `opendata.aemet.es`, arranca el
 * servidor de nieve desde fuente y comprueba que `GET /v1/stations/:slug/forecast`
 * sirve datos AUTÉNTICOS de AEMET con su atribución.
 *
 * Uso:
 *   AEMET_API_KEY=... node --experimental-transform-types \
 *     --import ./scripts/snow/ts-loader.mjs scripts/snow03/verify-aemet.mjs
 *
 * Salidas:
 *   docs/snow/snow03-evidence/real/aemet-<fecha>.json   (evidencia canónica)
 *   docs/snow/snow03-evidence/real/aemet-raw/           (respuestas auténticas)
 * exit 0 sólo si TODOS los checks pasan. exit 2 si falta la clave.
 *
 * Reglas duras:
 * - La clave NUNCA se imprime ni se escribe: toda URL se publica con
 *   `redactUrl()`, y al final se COMPRUEBA que la clave no aparece en la
 *   evidencia ni en los ficheros de respuesta.
 * - Máximo 2 municipios (AEMET limita por minuto). Si llega un 429 se ESPERA
 *   (respetando `Retry-After`) y se reintenta; no se inventa nada.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync, openSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { aemetAdapter, aemetCoverage, AEMET_DEFAULT_RATE_RETRY_MS } from '../../web-ssr/src/snow/providers/aemet.adapter.ts';
import { aemetMunicipioEntryFor, aemetMappingInfo } from '../../web-ssr/src/snow/providers/aemet-municipios.ts';
import { globalFetchClient } from '../../web-ssr/src/snow/providers/http-client.ts';
import { authorizationFor, attributionFor } from '../../web-ssr/src/snow/providers/authorizations.ts';
import { redactUrl } from '../../web-ssr/src/snow/config/env.ts';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'docs/snow/snow03-evidence/real');
const RAW_DIR = join(OUT_DIR, 'aemet-raw');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');
const KEY = process.env['AEMET_API_KEY'];

/**
 * Dos municipios, elegidos por cobertura real de estaciones de esquí:
 * - 25025 Naut Aran  → Baqueira Beret (Pirineo catalán)
 * - 22204 Sallent de Gállego → Formigal-Panticosa (Pirineo aragonés)
 */
const PROBES = [
  { slug: 'baqueira-beret', municipio: '25025' },
  { slug: 'formigal-panticosa', municipio: '22204' },
];

/** Espera máxima por un 429 antes de rendirse (el límite es por minuto). */
const MAX_RATE_WAIT_MS = 180_000;

const results = [];
let failures = 0;
const check = (name, ok, detail) => {
  results.push({ name, ok: Boolean(ok), detail: detail ?? null });
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === undefined ? '' : ` :: ${JSON.stringify(detail).slice(0, 300)}`}`);
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** Cliente que captura la respuesta cruda para la evidencia y redacta la URL. */
const capturingClient = (sink) => async (request) => {
  const startedMs = Date.now();
  const outcome = await globalFetchClient(request);
  const elapsedMs = Date.now() - startedMs;
  if (outcome.kind === 'ok') {
    const bytes = outcome.bodyBytes ?? Buffer.from(outcome.bodyText, 'utf8');
    sink.push({
      url: redactUrl(request.url),
      httpStatus: outcome.status,
      contentType: outcome.contentType,
      charset: outcome.charset ?? null,
      bytes: bytes.length,
      sha256: sha256(bytes),
      elapsedMs,
    });
  } else if (outcome.kind === 'http_error') {
    sink.push({
      url: redactUrl(request.url),
      httpStatus: outcome.status,
      contentType: outcome.contentType ?? null,
      bytes: outcome.bodyText === undefined ? null : Buffer.byteLength(outcome.bodyText, 'utf8'),
      sha256: outcome.bodyText === undefined ? null : sha256(outcome.bodyText),
      elapsedMs,
      note: 'respuesta de error (cuerpo no se publica)',
    });
  } else {
    sink.push({ url: redactUrl(request.url), httpStatus: null, kind: outcome.kind, elapsedMs });
  }
  return outcome;
};

/**
 * Ejecuta `fetch` reintentando SÓLO ante `rate_limited`, esperando lo que pide
 * el servicio. Devuelve el resultado y los intentos usados.
 */
async function fetchWithRateWait(adapter, input, label) {
  const attempts = [];
  let waitedMs = 0;
  for (let i = 0; i < 4; i += 1) {
    const result = await adapter.fetch(input);
    attempts.push({ status: result.status, retryAfterMs: result.status === 'rate_limited' ? result.retryAfterMs : null });
    if (result.status !== 'rate_limited') return { result, attempts, waitedMs };
    const wait = Math.min(Math.max(result.retryAfterMs, 1_000), AEMET_DEFAULT_RATE_RETRY_MS);
    if (waitedMs + wait > MAX_RATE_WAIT_MS) break;
    console.log(`wait ${label}: AEMET rate_limited, esperando ${Math.round(wait / 1000)} s (intento ${i + 1})`);
    await sleep(wait);
    waitedMs += wait;
  }
  const result = await adapter.fetch(input);
  attempts.push({ status: result.status, retryAfterMs: null });
  return { result, attempts, waitedMs };
}

/**
 * Arranca el servidor de nieve desde fuente, igual que `verify-e2e.mjs`:
 * `scripts/snow02/snow-api-server.mjs` monta el MISMO router que producción y
 * publica las rutas bajo `/api/snow`.
 */
async function startServer({ token, dataDir, logDir }) {
  const port = await freePort();
  const logPath = join(logDir, `server-aemet-${port}.log`);
  const fd = openSync(logPath, 'w');
  const proc = spawn(
    process.execPath,
    ['--experimental-transform-types', '--import', './scripts/snow/ts-loader.mjs', 'scripts/snow02/snow-api-server.mjs'],
    {
      cwd: ROOT,
      env: { ...process.env, SNOW_DATA_DIR: dataDir, SNOW_ADMIN_TOKEN: token, PORT: String(port), TEMP: dataDir, TMP: dataDir },
      stdio: ['ignore', fd, fd],
      windowsHide: true,
    },
  );
  const safeLog = () => {
    try {
      return readFileSync(logPath, 'utf8');
    } catch {
      return '';
    }
  };

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`servidor terminó (code ${proc.exitCode}): ${safeLog().slice(-800)}`);
    if (safeLog().includes('SNOW_READY')) break;
    await sleep(200);
  }
  if (!safeLog().includes('SNOW_READY')) throw new Error(`timeout esperando SNOW_READY: ${safeLog().slice(-800)}`);

  const base = `http://127.0.0.1:${port}/api/snow`;
  for (let i = 0; i < 50; i += 1) {
    try {
      const r = await fetch(`${base}/v1/config`);
      if (r.status > 0) return { proc, port, base };
    } catch {
      /* aún no escucha */
    }
    await sleep(200);
  }
  throw new Error('el servidor no respondió a /v1/config');
}

const main = async () => {
  if (!KEY) {
    console.error('FAIL verify-aemet: falta AEMET_API_KEY. Sin clave NO se puede verificar el servicio real.');
    console.error('      (el adapter degrada a not_configured, que ya cubre qa-unit; esto es la prueba E2E real)');
    process.exit(2);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(RAW_DIR, { recursive: true });

  const mapping = aemetMappingInfo();
  const coverage = aemetCoverage();
  check(
    'M1: el mapa estación→municipio cubre las dos estaciones sondeadas',
    PROBES.every((p) => aemetMunicipioEntryFor(p.slug)?.code === p.municipio),
    {
      probes: PROBES.map((p) => ({ slug: p.slug, code: aemetMunicipioEntryFor(p.slug)?.code ?? null })),
      coverage,
      source: mapping.source.id,
      sourceSha256: mapping.source.sha256,
    },
  );

  const authorization = authorizationFor('aemet');
  const attribution = attributionFor('aemet');
  check('M2: AEMET está autorizado con atribución obligatoria', authorization.attributionRequired === true && Boolean(attribution), {
    registryRef: authorization.registryRef,
    licenseId: authorization.licenseId,
    attribution,
  });

  // ---- Fase 1: adapter REAL contra el servicio (máx. 2 municipios)
  const rawFiles = [];
  const probeResults = [];
  for (const probe of PROBES) {
    const raw = [];
    const adapter = aemetAdapter(authorization, {
      http: capturingClient(raw),
      // Se respeta la cuota propia del adapter: 20 s entre llamadas.
      minSpacingMs: 20_000,
    });
    const requestedAt = new Date();
    const { result, attempts, waitedMs } = await fetchWithRateWait(
      adapter,
      {
        stationRef: { slug: probe.slug, country: 'ES', lat: 0, lng: 0 },
        requestedAt,
        dataType: 'forecast',
      },
      probe.slug,
    );

    // Respuesta auténtica guardada con su sha256 (nunca con la clave).
    const file = join(RAW_DIR, `${probe.slug}-${probe.municipio}.json`);
    const dump = {
      note: 'Respuesta AUTÉNTICA de AEMET OpenData (adapter real). Urls redactadas.',
      generatedAt: new Date().toISOString(),
      stationSlug: probe.slug,
      municipio: probe.municipio,
      requestedAt: requestedAt.toISOString(),
      attempts,
      waitedMs,
      http: raw,
      result: {
        status: result.status,
        reason: result.status === 'no_data' ? result.reason : null,
        message: result.status === 'error' ? result.message : null,
        retryAfterMs: result.status === 'rate_limited' ? result.retryAfterMs : null,
        provenance: result.provenance,
        points: result.status === 'ok' ? result.data.points.length : 0,
        horizonHours: result.status === 'ok' ? result.data.horizonHours : null,
        // Muestra del dato servido, para que la evidencia sea verificable a ojo.
        sample: result.status === 'ok' ? result.data.points.slice(0, 3) : [],
      },
    };
    writeFileSync(file, `${JSON.stringify(dump, null, 2)}\n`, 'utf8');
    rawFiles.push({ file: file.replace(`${ROOT}/`, '').replace(`${ROOT}\\`, ''), sha256: sha256(readFileSync(file)) });

    const ok = result.status === 'ok';
    if (!ok) failures += 1;
    check(
      `A1·${probe.slug}: el adapter REAL devuelve datos auténticos (${probe.municipio})`,
      ok,
      {
        status: result.status,
        reason: result.status === 'no_data' ? result.reason : undefined,
        retryAfter: result.status === 'rate_limited' ? result.retryAfterMs : undefined,
        points: result.status === 'ok' ? result.data.points.length : 0,
        http: raw.map((r) => r.httpStatus),
      },
    );
    if (result.status !== 'ok') {
      probeResults.push({ ...probe, status: result.status, ok: false });
      continue;
    }

    const p = result.data.points;
    const hasMagnitudes = p.some((x) => x.tempC !== null) && p.some((x) => x.windKmh !== null);
    check(`A2·${probe.slug}: el bundle trae magnitudes reales y 24+ tramos horarios`, p.length >= 24 && hasMagnitudes, {
      points: p.length,
      withTemp: p.filter((x) => x.tempC !== null).length,
      withWind: p.filter((x) => x.windKmh !== null).length,
      withGust: p.filter((x) => x.gustKmh !== null && x.gustKmh !== undefined).length,
      withPrecip: p.filter((x) => x.precipMm !== null).length,
      withProbSnow: p.filter((x) => x.probSnowPct !== null && x.probSnowPct !== undefined).length,
    });

    // Diagnóstico del parseo: tramos descartados (periodos «todo el día») y la
    // forma REAL de `fecha` que devolvió el servicio. Un fallo de conversión de
    // hora se ve AQUÍ en vez de manifestarse como un no_data sin explicación.
    check(
      `A2b·${probe.slug}: los tramos no se pierden por conversión de hora`,
      p.every((x) => Number.isFinite(Date.parse(x.validAt))),
      {
        firstValidAt: p[0]?.validAt ?? null,
        lastValidAt: p[p.length - 1]?.validAt ?? null,
        distinctHours: new Set(p.map((x) => new Date(x.validAt).getUTCHours())).size,
      },
    );

    // `observedAt` = `elaborado` de AEMET, no el instante de la petición.
    const observedMs = Date.parse(result.provenance.observedAt);
    const requestMs = requestedAt.getTime();
    check(
      `A3·${probe.slug}: observedAt = hora de emisión REAL de AEMET (no el instante de la petición)`,
      Number.isFinite(observedMs) && observedMs < requestMs + 60_000,
      { observedAt: result.provenance.observedAt, requestedAt: requestedAt.toISOString(), freshnessS: result.provenance.freshness },
    );
    check(`A4·${probe.slug}: procedencia con origen aemet, licencia y atribución «© AEMET»`, (
      result.provenance.source === 'aemet' &&
      result.provenance.licenseStatus === 'allowed-with-attribution' &&
      /AEMET/.test(String(result.provenance.attribution)) &&
      result.provenance.authorization.registryRef === '05#aemet'
    ), { source: result.provenance.source, attribution: result.provenance.attribution });
    check(`A5·${probe.slug}: snowLineM null (AEMET no publica cota de nieve en este producto)`, p.every((x) => x.snowLineM === null), {
      nonNull: p.filter((x) => x.snowLineM !== null).length,
    });
    check(`A6·${probe.slug}: ningún centinela -99 se sirve como valor`, p.every((x) => x.tempC !== -99 && x.windKmh !== -99), {});

    probeResults.push({ ...probe, status: result.status, ok: true, points: p.length });
  }

  // ---- Fase 2: el BORDE sirve datos AEMET con atribución
  const ADMIN_TOKEN = 'verify-aemet-admin-token';
  const dataDir = mkdtempSync(join(tmpdir(), 'snow-aemet-store-'));
  const logDir = mkdtempSync(join(tmpdir(), 'snow-aemet-log-'));
  const server = await startServer({ token: ADMIN_TOKEN, dataDir, logDir });
  const adminHeaders = { authorization: `Bearer ${ADMIN_TOKEN}` };
  try {
    // `/v1/config` es ruta ADMIN (causa del «defecto 3» de la re-verificación
    // real): sin token responde 401 y `effect`/`configured` se leían como null.
    // Se AFIRMA el status HTTP para que un 401 no pueda pasar otra vez por «null».
    const configRes = await fetch(`${server.base}/v1/config`, { headers: adminHeaders });
    const config = await configRes.json();
    const aemetStatus = (config.providers ?? []).find((x) => x.id === 'aemet');
    check('B1: /v1/config responde 200 con el token de administración', configRes.status === 200, {
      http: configRes.status,
      note: configRes.status === 401 ? 'sin token admin: la lectura siguiente NO sería válida' : null,
    });
    check('B1b: /v1/config declara AEMET con effect y configured (no null)', (
      typeof aemetStatus?.effect === 'string' &&
      typeof aemetStatus?.configured === 'boolean' &&
      aemetStatus.effect === 'serves' &&
      aemetStatus.configured === true
    ), {
      effect: aemetStatus?.effect ?? null,
      configured: aemetStatus?.configured ?? null,
      rateLimit: aemetStatus?.rateLimit ?? null,
    });

    for (const probe of PROBES) {
      const res = await fetch(`${server.base}/v1/stations/${probe.slug}/forecast`);
      const body = await res.json();
      const served = body.status === 'ok' || body.status === 'stale';
      const fromAemet = served && body.provenance?.source === 'aemet';
      // La procedencia del borde debe llevar la atribución obligatoria de AEMET
      // (con `cached`/`stale` el borde puede dejar `attribution:null`, así que se
      // exige el texto cuando el dato es `live` y el ORIGEN `aemet` siempre).
      const attributionOk = body.provenance?.status === 'live'
        ? /AEMET/.test(String(body.provenance?.attribution))
        : fromAemet;
      check(`B2·${probe.slug}: /forecast responde 200 con dato`, res.status === 200 && served, {
        http: res.status,
        status: body.status,
        reason: body.reason ?? null,
      });
      check(
        `B3·${probe.slug}: /forecast sirve datos AUTÉNTICOS de AEMET con su atribución`,
        fromAemet && attributionOk && Array.isArray(body.data?.points) && body.data.points.length > 0,
        {
          source: body.provenance?.source ?? null,
          attribution: body.provenance?.attribution ?? null,
          licenseStatus: body.provenance?.licenseStatus ?? null,
          provStatus: body.provenance?.status ?? null,
          observedAt: body.provenance?.observedAt ?? null,
          points: Array.isArray(body.data?.points) ? body.data.points.length : 0,
          firstPoint: Array.isArray(body.data?.points) ? body.data.points[0] : null,
        },
      );
    }
  } finally {
    server.proc.kill('SIGKILL');
    await sleep(300);
    rmSync(dataDir, { recursive: true, force: true });
    rmSync(logDir, { recursive: true, force: true });
  }

  // ---- Fase 3: la clave no ha quedado escrita en NINGÚN sitio
  const leaks = [];
  const scan = (dir) => {
    for (const f of existsSync(dir) ? readdirSync(dir) : []) {
      const full = join(dir, f);
      if (f.endsWith('.json')) {
        if (readFileSync(full, 'utf8').includes(KEY)) leaks.push(full);
      }
    }
  };
  scan(RAW_DIR);
  scan(OUT_DIR);
  check('S1: la clave NO aparece en ninguna respuesta ni evidencia guardada', leaks.length === 0, { leaks });

  const evidence = {
    note:
      'Verificación REAL end-to-end de AEMET OpenData (SNOW-03b t1). Sin dobles: adapter real contra ' +
      'opendata.aemet.es y el borde /v1/stations/:slug/forecast servido desde fuente. Las URLs se publican ' +
      'REDACTADAS (redactUrl) y se comprueba que la clave no aparece en ningún fichero.',
    generatedAt: new Date().toISOString(),
    adapter: 'aemet',
    dataType: 'forecast',
    endpoint: 'prediccion/especifica/municipio/horaria/{id} (dos pasos: sobre → datos)',
    licenseRef: '05#aemet',
    attribution,
    mapping: { source: mapping.source, coverage, unresolved: mapping.unresolved, notCovered: mapping.notCovered },
    rateLimit: { selfSpacingMs: 20_000, maxRateWaitMs: MAX_RATE_WAIT_MS, probes: PROBES.length },
    probes: PROBES,
    rawFiles,
    results,
    summary: { checks: results.length, passed: results.filter((r) => r.ok).length, failed: failures, probes: probeResults },
  };

  // UNA sola evidencia canónica: se borran las `aemet-*.json` previas de nivel raíz.
  for (const f of existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : []) {
    if (f.startsWith('aemet-') && f.endsWith('.json')) rmSync(join(OUT_DIR, f), { force: true });
  }
  const evidencePath = join(OUT_DIR, `aemet-${STAMP}.json`);
  writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`EVIDENCE ${evidencePath}`);
  console.log(`SUMMARY ${evidence.summary.passed}/${evidence.summary.checks} checks OK · ${probeResults.filter((p) => p.ok).length}/${PROBES.length} municipios con dato`);

  if (failures > 0) {
    console.error(`FAIL ${failures} check(s) no cumplieron los criterios`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`FAIL verify-aemet: ${error.message}`);
  process.exit(1);
});
