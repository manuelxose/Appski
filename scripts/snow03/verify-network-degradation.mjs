#!/usr/bin/env node
/**
 * SNOW-03 · FASE F — DEGRADACIÓN CON LA RED CAÍDA, PROBADA DE VERDAD.
 *
 * Antes esto era un «límite no probado». Ahora se provoca el fallo REAL de red y
 * se mide la degradación del adapter contra el cliente HTTP de PRODUCCIÓN.
 *
 * Escenarios (ninguno usa dobles del cliente: se usa `globalFetchClient`):
 *   N1  host que RECHAZA la conexión (https://127.0.0.1:9/) ⇒ `error` retryable,
 *       NUNCA `ok`, NUNCA datos inventados, procedencia presente con mensaje.
 *   N2  host que NO RESUELVE (dominio inexistente) ⇒ `error` retryable.
 *   N3  timeout real (servidor que acepta y no responde) ⇒ `error` retryable.
 *   N4  a través de IngestPipeline: el fallo se reintenta y acaba en `error`
 *       tipado, no en excepción propagada ni en 500.
 *
 * Requisito del capitán: nada de 500, nada de ceros, procedencia SIEMPRE con motivo.
 *
 * Uso: node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
 *        scripts/snow03/verify-network-degradation.mjs
 */
import { mkdirSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { meteoalarmAdapter } from '../../web-ssr/src/snow/providers/meteoalarm.adapter.ts';
import { openMeteoAdapter } from '../../web-ssr/src/snow/providers/open-meteo.adapter.ts';
import { globalFetchClient } from '../../web-ssr/src/snow/providers/http-client.ts';
import { authorizationFor } from '../../web-ssr/src/snow/providers/authorizations.ts';
import { Breaker } from '../../web-ssr/src/snow/cache/breaker.ts';
import { IngestPipeline } from '../../web-ssr/src/snow/ingest/pipeline.ts';

const OUT_DIR = join(process.cwd(), 'docs/snow/snow03-evidence/real');

const results = [];
let failures = 0;
const check = (name, ok, detail) => {
  results.push({ name, ok: Boolean(ok), detail: detail ?? null });
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail === undefined ? '' : ` :: ${JSON.stringify(detail).slice(0, 210)}`}`);
};

const FIXED = new Date('2026-11-17T00:30:00.000Z');

const input = (country = 'ES') => ({
  stationRef: { slug: 'baqueira-beret', country, lat: 42.638, lng: 0.766 },
  requestedAt: FIXED,
  dataType: 'weather-alert',
});

/** Sonda de procedencia: debe existir SIEMPRE, incluso sin dato. */
const hasProvenance = (r) =>
  Boolean(r.provenance) &&
  typeof r.provenance.source === 'string' &&
  typeof r.provenance.observedAt === 'string' &&
  typeof r.provenance.licenseStatus === 'string';

/** Un resultado degradado NO puede traer datos (ni ceros que parezcan dato). */
const noData = (r) => r.data === undefined;

const main = async () => {
  mkdirSync(OUT_DIR, { recursive: true });

  // ── N1: conexión RECHAZADA (127.0.0.1:9, discard port cerrado) ────────────
  // Se usa el cliente de producción; sin tocar adapter.
  const rejected = meteoalarmAdapter(authorizationFor('meteoalarm'), {
    http: globalFetchClient,
    baseUrl: 'https://127.0.0.1:9/feeds/meteoalarm-legacy-atom',
    timeoutMs: 5_000,
  });
  const r1 = await rejected.fetch(input('ES'));
  check('N1: conexión rechazada ⇒ NO es `ok`', r1.status !== 'ok', { status: r1.status });
  check('N1: degrada a `error` retryable', r1.status === 'error' && r1.retryable === true, {
    status: r1.status,
    retryable: r1.retryable ?? null,
  });
  check('N1: sin datos inventados (ni ceros)', noData(r1), null);
  check('N1: procedencia presente con motivo', hasProvenance(r1) && r1.provenance.status === 'degraded' && /\w/.test(r1.message ?? ''), {
    source: r1.provenance?.source ?? null,
    provenanceStatus: r1.provenance?.status ?? null,
    message: (r1.message ?? '').slice(0, 90),
  });
  check('N1: el mensaje identifica un fallo de red (no una excepción cruda)', /network error|timeout/i.test(r1.message ?? ''), {
    message: (r1.message ?? '').slice(0, 110),
  });

  // ── N2: host que NO RESUELVE ─────────────────────────────────────────────
  const unresolvable = meteoalarmAdapter(authorizationFor('meteoalarm'), {
    http: globalFetchClient,
    baseUrl: 'https://meteoalarm-does-not-exist.invalid/feeds/x',
    timeoutMs: 5_000,
  });
  const r2 = await unresolvable.fetch(input('ES'));
  check('N2: DNS inexistente ⇒ error retryable, sin datos', r2.status === 'error' && r2.retryable === true && noData(r2), {
    status: r2.status,
    retryable: r2.retryable ?? null,
  });

  // ── N3: TIMEOUT REAL (servidor que acepta TCP y no responde nunca) ───────
  const silent = createServer(() => {
    /* acepta y no responde */
  });
  await new Promise((res) => silent.listen(0, '127.0.0.1', res));
  const silentPort = silent.address().port;
  const timedOut = meteoalarmAdapter(authorizationFor('meteoalarm'), {
    http: globalFetchClient,
    baseUrl: `http://127.0.0.1:${silentPort}/feeds/x`,
    timeoutMs: 700,
  });
  const r3 = await timedOut.fetch(input('ES'));
  silent.close();
  check('N3: timeout real ⇒ error retryable con mensaje de timeout', r3.status === 'error' && /timeout/i.test(r3.message ?? '') && noData(r3), {
    status: r3.status,
    message: (r3.message ?? '').slice(0, 80),
  });

  // ── N4: el PIPELINE tampoco propaga: reintenta y devuelve estado tipado ──
  const pipeline = new IngestPipeline({
    breaker: new Breaker(),
    now: () => FIXED.getTime(),
    sleep: async () => {},
    policy: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 },
  });
  let calls = 0;
  const r4 = await pipeline.execute('meteoalarm', 'weather-alert', async () => {
    calls += 1;
    return rejected.fetch(input('ES'));
  });
  check('N4: el pipeline reintenta un fallo de red (3 intentos)', calls === 3, { calls });
  check('N4: el pipeline devuelve `error` tipado, sin excepción', r4.status === 'error' && noData(r4), {
    status: r4.status,
  });
  const m = pipeline.metricsFor('meteoalarm');
  check('N4: las métricas cuentan los fallos reales', (m?.attempts ?? 0) === 3 && (m?.failures ?? 0) === 3, {
    attempts: m?.attempts ?? null,
    failures: m?.failures ?? null,
  });

  // ── N5: Open-Meteo con la red caída tampoco inventa datos ────────────────
  const om = openMeteoAdapter(
    { ...authorizationFor('open-meteo'), licenseId: 'test-cleared', commercialUse: true, storageAllowed: true },
    { http: globalFetchClient, baseUrl: 'https://127.0.0.1:9/v1/forecast', timeoutMs: 3_000 },
  );
  const r5 = await om.fetch({ ...input('ES'), dataType: 'forecast' });
  check('N5: Open-Meteo sin red ⇒ error retryable sin datos', r5.status === 'error' && noData(r5), {
    status: r5.status,
  });

  // ── N6: nada de 500 — el adapter nunca LANZA; se comprueba de verdad ─────
  // Se invoca el adapter con el cliente real contra un host muerto dentro de un
  // try/catch: si lanzase, el borde devolvería un 500. El check exige que las
  // cinco invocaciones hayan devuelto un resultado discriminado, no una excepción.
  const outcomes = [];
  for (const baseUrl of [
    'https://127.0.0.1:9/feeds/x',
    'https://meteoalarm-does-not-exist.invalid/feeds/x',
    'http://127.0.0.1:9/feeds/x',
  ]) {
    try {
      const a = meteoalarmAdapter(authorizationFor('meteoalarm'), { http: globalFetchClient, baseUrl, timeoutMs: 2_000 });
      const r = await a.fetch(input('ES'));
      outcomes.push({ threw: false, status: r.status, hasProv: hasProvenance(r) });
    } catch (error) {
      outcomes.push({ threw: true, message: String(error) });
    }
  }
  check(
    'N6: el adapter NUNCA lanza (ningún escenario daría 500)',
    outcomes.every((o) => o.threw === false && o.status !== 'ok' && o.hasProv),
    { outcomes },
  );

  // Evidencia normalizada: sólo checks, sin instantes.
  for (const f of existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : []) {
    if (f.startsWith('network-degradation-')) rmSync(join(OUT_DIR, f), { force: true });
  }
  const evidence = {
    note:
      'Degradación con la red CAÍDA, probada contra el cliente HTTP de producción: conexión rechazada, ' +
      'DNS inexistente, timeout real y pipeline con reintentos. Evidencia normalizada.',
    kind: 'snow03-network-degradation',
    results,
    summary: { total: results.length, passed: results.filter((r) => r.ok).length, failed: failures },
  };
  const path = join(OUT_DIR, 'network-degradation.json');
  writeFileSync(path, JSON.stringify(evidence, null, 2), 'utf8');
  console.log(`EVIDENCE ${path}`);
  console.log(`SUMMARY ${evidence.summary.passed}/${evidence.summary.total} checks OK`);

  if (failures > 0) {
    console.error(`FAIL ${failures} check(s) no cumplieron`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`FAIL verify-network-degradation: ${error?.stack ?? error}`);
  process.exit(1);
});
