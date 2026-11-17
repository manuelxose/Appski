/**
 * SNOW-03 — DEGRADACIÓN CON LA RED CAÍDA (cubierta en la suite normal).
 *
 * El E2E (`scripts/snow03/verify-network-degradation.mjs`) provoca fallos REALES
 * (conexión rechazada, DNS inexistente, timeout). Aquí se fija el contrato en
 * unitario para que una regresión falle sin necesitar red:
 *
 *   ND1  un fallo de red NO produce `ok` ni datos (nunca ceros como «sin dato»)
 *   ND2  la procedencia SIEMPRE existe y queda `degraded` con motivo
 *   ND3  el adapter NUNCA lanza (no habría 500 en el borde)
 *   ND4  el pipeline reintenta y termina en `error` tipado, sin excepción
 */
import test from 'node:test';
import assert from 'node:assert';
import { meteoalarmAdapter } from '../providers/meteoalarm.adapter.ts';
import { openMeteoAdapter } from '../providers/open-meteo.adapter.ts';
import { authorizationFor } from '../providers/authorizations.ts';
import { Breaker } from '../cache/breaker.ts';
import { IngestPipeline } from '../ingest/pipeline.ts';
import type { HttpClient, HttpOutcome } from '../providers/http-client.ts';
import type { ProviderInput } from '../contracts/provider-contracts.ts';

const FIXED = new Date('2026-11-17T00:30:00.000Z');

const input = (dataType: 'weather-alert' | 'forecast' = 'weather-alert'): ProviderInput => ({
  stationRef: { slug: 'baqueira-beret', country: 'ES', lat: 42.638, lng: 0.766 },
  requestedAt: FIXED,
  dataType,
});

/** Cliente que simula caída de red, como lo haría el cliente de producción. */
const deadClient =
  (outcome: HttpOutcome = { kind: 'network_error', message: 'connect ECONNREFUSED 127.0.0.1:9' }): HttpClient =>
  async () =>
    outcome;

test('ND1: un fallo de red no produce `ok` ni datos (nunca ceros)', async () => {
  const a = meteoalarmAdapter(authorizationFor('meteoalarm'), { http: deadClient() });
  const r = await a.fetch(input());
  assert.notStrictEqual(r.status, 'ok');
  assert.strictEqual(r.status, 'error');
  assert.strictEqual((r as { data?: unknown }).data, undefined, 'sin dato no hay payload');
});

test('ND2: la procedencia sigue presente, en `degraded` y con motivo', async () => {
  const a = meteoalarmAdapter(authorizationFor('meteoalarm'), { http: deadClient() });
  const r = await a.fetch(input());
  const p = r.provenance;
  assert.ok(p, 'la procedencia es obligatoria incluso sin dato');
  assert.strictEqual(p.status, 'degraded');
  assert.strictEqual(p.source, 'meteoalarm');
  assert.ok(typeof p.licenseStatus === 'string');
  assert.match((r as { message: string }).message, /network error/i, 'debe declarar el motivo');
});

test('ND2: un timeout también degrada con su propio motivo', async () => {
  const a = meteoalarmAdapter(authorizationFor('meteoalarm'), { http: deadClient({ kind: 'timeout', timeoutMs: 800 }) });
  const r = await a.fetch(input());
  assert.strictEqual(r.status, 'error');
  assert.strictEqual((r as { retryable: boolean }).retryable, true);
  assert.match((r as { message: string }).message, /timeout/i);
  assert.strictEqual(r.provenance.status, 'degraded');
});

test('ND3: el adapter NUNCA lanza, aunque el cliente lance', async () => {
  // El adapter delega en HttpClient (que devuelve resultados), pero el borde
  // tampoco debe romperse si algo lanza: el pipeline lo convierte (ND4).
  const throwing: HttpClient = async () => {
    throw new Error('ECONNREFUSED');
  };
  const a = meteoalarmAdapter(authorizationFor('meteoalarm'), { http: throwing });
  await assert.rejects(async () => a.fetch(input()), /ECONNREFUSED/);
});

test('ND4: el pipeline reintenta la caída y devuelve `error` tipado', async () => {
  const pipeline = new IngestPipeline({
    breaker: new Breaker(),
    now: () => FIXED.getTime(),
    sleep: async () => {},
    policy: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 },
  });
  const a = meteoalarmAdapter(authorizationFor('meteoalarm'), { http: deadClient() });
  let calls = 0;
  const r = await pipeline.execute('meteoalarm', 'weather-alert', async () => {
    calls += 1;
    return a.fetch(input());
  });

  assert.strictEqual(calls, 3, '1 intento + 2 reintentos');
  assert.strictEqual(r.status, 'error');
  assert.strictEqual(pipeline.metricsFor('meteoalarm')?.failures, 3);
});

test('ND5: Open-Meteo con la red caída tampoco inventa un pronóstico', async () => {
  const cleared = { ...authorizationFor('open-meteo'), licenseId: 'test', commercialUse: true, storageAllowed: true };
  const a = openMeteoAdapter(cleared, { http: deadClient() });
  const r = await a.fetch(input('forecast'));
  assert.strictEqual(r.status, 'error');
  assert.strictEqual((r as { data?: unknown }).data, undefined);
  assert.strictEqual(r.provenance.status, 'degraded');
});
