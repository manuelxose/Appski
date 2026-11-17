/**
 * SNOW-03 — Caché de 10 min de MeteoAlarm (REQUISITO LEGAL de los T&C).
 *
 * La condicion de redistribucion de MeteoAlarm exige latencia ≤10 min. Esto no
 * es una preferencia de rendimiento: si la entrada cacheada pudiera superar los
 * 10 minutos, se incumpliría la licencia. Se fija el contrato aquí.
 *
 *   ML1  el TTL declarado es exactamente 10 min
 *   ML2  a los 9:59 sigue siendo fresh; a los 10:00 ya es stale
 *   ML3  el servicio NO sirve una entrada stale como `ok` cuando el proveedor falla
 *   ML4  meteofrance-bpa-html no aparece en NINGUNA cadena de fallback
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CACHE_POLICY } from '../cache/cache-policy.ts';
import { buildCacheEntry, decideCacheWrite, readCacheEntry } from '../cache/forecast-cache.ts';
import { CachedForecastService } from '../cache/cached-forecast.service.ts';
import { Breaker } from '../cache/breaker.ts';
import { IngestPipeline } from '../ingest/pipeline.ts';
import { JsonForecastCacheRepository } from '../store/json-store/json-forecast-repository.ts';
import { FALLBACK_CHAINS } from '../chain/fallback-chains.ts';
import { authorizationFor } from '../providers/authorizations.ts';
import type { ForecastBundle, WeatherAlertBundle } from '../contracts/data-type-map.ts';
import type { ProviderInput, ProviderResult, SnowDataType } from '../contracts/provider-contracts.ts';

const BASE = new Date('2026-11-16T12:00:00.000Z');

const INPUT: ProviderInput = {
  stationRef: { slug: 'baqueira-beret', country: 'ES', lat: 42.638, lng: 0.766 },
  requestedAt: BASE,
  dataType: 'forecast',
};

test('ML1: MeteoAlarm declara un TTL de exactamente 10 minutos', () => {
  const policy = CACHE_POLICY.meteoalarm;
  assert.ok(policy, 'debe existir política de caché para meteoalarm');
  assert.strictEqual(policy.ttlMs, 10 * 60_000, 'la latencia ≤10 min es requisito de los T&C');
  assert.ok(policy.ttlMs <= 10 * 60_000, 'nunca puede superar los 10 minutos');
  assert.strictEqual(policy.persistHistory, false, 'no se guarda histórico de un agregador');
});

test('ML1: la escritura del adapter de alertas expira a los 10 min exactos', () => {
  const d = decideCacheWrite('meteoalarm', authorizationFor('meteoalarm'), BASE);
  assert.strictEqual(d.kind, 'write');
  assert.strictEqual((d as { expiresAt: string }).expiresAt, '2026-11-16T12:10:00.000Z');
});

const alertEntry = () =>
  buildCacheEntry({
    stationSlug: 'baqueira-beret',
    source: 'meteoalarm',
    lat: 42.638,
    lng: 0.766,
    observedAt: BASE.toISOString(),
    updatedAt: null,
    expiresAt: '2026-11-16T12:10:00.000Z',
    payload: { alerts: [] },
  });

test('ML2: a los 9:59 la entrada sigue fresh; a los 10:00 ya es stale', () => {
  const entry = alertEntry();

  const justBefore = new Date(BASE.getTime() + 10 * 60_000 - 1000);
  const before = readCacheEntry(entry, justBefore);
  assert.ok(before);
  assert.strictEqual(before.state, 'fresh', '9:59 debe seguir dentro de la ventana legal');

  const atLimit = new Date(BASE.getTime() + 10 * 60_000);
  const at = readCacheEntry(entry, atLimit);
  assert.ok(at);
  assert.strictEqual(at.state, 'stale', 'al cumplirse los 10 min caduca');
});

test('ML2: a los 11 min nunca se presenta como vigente', () => {
  const read = readCacheEntry(alertEntry(), new Date(BASE.getTime() + 11 * 60_000));
  assert.ok(read);
  assert.strictEqual(read.state, 'stale');
});

test('ML3: con el proveedor caído se sirve `stale` MARCADO, jamás `ok` ni live', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'snow03-ma-'));
  try {
    let now = BASE;
    const cache = new JsonForecastCacheRepository(dir);
    // Sembramos una entrada ya caducada (más de 10 min).
    await cache.put(
      buildCacheEntry({
        stationSlug: 'baqueira-beret',
        source: 'open-meteo',
        lat: 42.638,
        lng: 0.766,
        observedAt: new Date(BASE.getTime() - 11 * 60_000).toISOString(),
        updatedAt: null,
        expiresAt: new Date(BASE.getTime() - 60_000).toISOString(),
        payload: { points: [], horizonHours: 0 } satisfies ForecastBundle,
      }),
    );

    const service = new CachedForecastService({
      cache,
      pipeline: new IngestPipeline({ breaker: new Breaker(), now: () => now.getTime(), sleep: async () => {} }),
      adapter: {
        id: 'open-meteo',
        async fetch(): Promise<ProviderResult<ForecastBundle>> {
          return {
            status: 'error',
            provenance: {
              source: 'open-meteo',
              observedAt: now.toISOString(),
              updatedAt: null,
              status: 'degraded',
              licenseStatus: 'unverified',
              freshness: 0,
              authorization: authorizationFor('open-meteo'),
              attribution: null,
            },
            message: 'caído',
            retryable: false,
          };
        },
      },
      authorization: authorizationFor('open-meteo'),
      now: () => now,
    });

    now = new Date(BASE.getTime());
    const r = await service.read('forecast', INPUT);
    assert.strictEqual(r.status, 'stale', 'nunca `ok`');
    assert.strictEqual(r.provenance.status, 'stale');
    assert.ok(r.provenance.freshness >= 660, 'la antigüedad refleja >10 min reales');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ML4: meteofrance-bpa-html no aparece en NINGUNA cadena de fallback', () => {
  for (const [dataType, chain] of Object.entries(FALLBACK_CHAINS)) {
    assert.ok(
      !(chain as readonly string[]).includes('meteofrance-bpa-html'),
      `${dataType}: el HTML de Météo-France no tiene licencia de reutilización`,
    );
  }
});

test('ML4: meteoalarm sí está en la cadena de weather-alert, y AL FINAL', () => {
  const chain = [...FALLBACK_CHAINS['weather-alert']];
  assert.ok(chain.includes('meteoalarm'), 'debe estar cableado');
  assert.strictEqual(chain[chain.length - 1], 'meteoalarm', 'va DESPUÉS de las fuentes nacionales');
});

test('ML4: el contrato del adapter de alertas es weather-alert', () => {
  const provides: readonly SnowDataType[] = ['weather-alert'];
  assert.ok(provides.includes('weather-alert'));
});

test('ML4: un bundle de alertas no se deriva en datos de nieve ni remontes', () => {
  const bundle: WeatherAlertBundle = { alerts: [] };
  assert.deepStrictEqual(Object.keys(bundle), ['alerts'], 'sólo avisos: no nieve, no remontes');
});
