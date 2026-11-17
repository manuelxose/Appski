/**
 * SNOW-03 · Fase E — Servicio de pronóstico con caché (integración de módulos).
 *
 * Une caché en disco + pipeline + adapter con reloj y proveedor INYECTADOS:
 *
 *   CS1  primera lectura: miss → proveedor → escribe en disco → ok
 *   CS2  segunda lectura dentro del TTL: hit desde disco, SIN llamar al proveedor
 *   CS3  caducidad + proveedor caído ⇒ `stale` con antigüedad real (nunca 'ok')
 *   CS4  caducidad + proveedor sano ⇒ refetch y refresco del TTL
 *   CS5  licencia que prohíbe almacenar ⇒ NUNCA escribe en disco
 *   CS6  métricas de caché cuentan hits/misses/writes/staleServed
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CachedForecastService } from '../cache/cached-forecast.service.ts';
import { Breaker } from '../cache/breaker.ts';
import { IngestPipeline } from '../ingest/pipeline.ts';
import { JsonForecastCacheRepository } from '../store/json-store/json-forecast-repository.ts';
import type { Authorization, ProviderInput, ProviderResult } from '../contracts/provider-contracts.ts';
import type { ForecastBundle } from '../contracts/data-type-map.ts';

const BASE = new Date('2026-11-16T12:00:00.000Z');
const INPUT: ProviderInput = {
  stationRef: { slug: 'baqueira-beret', country: 'ES', lat: 42.638, lng: 0.766 },
  requestedAt: BASE,
  dataType: 'forecast',
};

const CLEARED: Authorization = {
  registryRef: 'test#open-meteo',
  licenseId: 'test-cacheable',
  commercialUse: true,
  storageAllowed: true,
  attributionRequired: true,
};

const NO_STORE: Authorization = { ...CLEARED, storageAllowed: false, licenseId: 'unverified' };

const BUNDLE = (tempC: number): ForecastBundle => ({
  points: [{ validAt: '2026-11-16T12:00:00.000Z', tempC, windKmh: 3.5, precipMm: 0, snowLineM: null, condition: 'nublado' }],
  horizonHours: 1,
});

interface Rig {
  service: CachedForecastService;
  calls: () => number;
  setNow: (d: Date) => void;
  setBehaviour: (b: 'ok' | 'fail') => void;
  dir: string;
}

const rig = (dir: string, authorization: Authorization = CLEARED): Rig => {
  let now = BASE;
  let behaviour: 'ok' | 'fail' = 'ok';
  let calls = 0;

  const adapter = {
    id: 'open-meteo' as const,
    async fetch(input: ProviderInput): Promise<ProviderResult<ForecastBundle>> {
      calls += 1;
      const prov = {
        source: 'open-meteo' as const,
        observedAt: now.toISOString(),
        updatedAt: null,
        status: 'live' as const,
        licenseStatus: 'allowed-with-attribution' as const,
        freshness: 0,
        authorization,
        attribution: 'test',
      };
      if (behaviour === 'fail') {
        return { status: 'error', provenance: { ...prov, status: 'degraded' }, message: 'caído', retryable: false };
      }
      return { status: 'ok', data: BUNDLE(-1), provenance: prov };
    },
  };

  const pipeline = new IngestPipeline({
    breaker: new Breaker(),
    now: () => now.getTime(),
    sleep: async () => {},
    policy: { maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1 },
  });

  const service = new CachedForecastService({
    cache: new JsonForecastCacheRepository(dir),
    pipeline,
    adapter,
    authorization,
    now: () => now,
  });

  return {
    service,
    dir,
    calls: () => calls,
    setNow: (d) => {
      now = d;
    },
    setBehaviour: (b) => {
      behaviour = b;
    },
  };
};

const withDir = async (fn: (dir: string) => Promise<void>): Promise<void> => {
  const dir = mkdtempSync(join(tmpdir(), 'snow03-svc-'));
  try {
    await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('CS1: la primera lectura va al proveedor, responde ok y escribe la caché', async () => {
  await withDir(async (dir) => {
    const r = rig(dir);
    const res = await r.service.read('forecast', INPUT);
    assert.strictEqual(res.status, 'ok');
    assert.strictEqual(r.calls(), 1);
    assert.ok(existsSync(join(dir, 'forecast-cache.v2.json')), 'la caché debe existir en disco');
    assert.strictEqual(r.service.cacheMetrics().writes, 1);
  });
});

test('CS2: dentro del TTL se sirve de disco SIN llamar al proveedor', async () => {
  await withDir(async (dir) => {
    const r = rig(dir);
    await r.service.read('forecast', INPUT);
    assert.strictEqual(r.calls(), 1);

    r.setNow(new Date(BASE.getTime() + 10 * 60_000)); // +10 min (< 30 de TTL)
    const second = await r.service.read('forecast', INPUT);

    assert.strictEqual(second.status, 'ok');
    assert.strictEqual(r.calls(), 1, 'no debe volver a llamar al proveedor');
    assert.strictEqual(r.service.cacheMetrics().hits, 1);
    assert.strictEqual(second.provenance.status, 'cached');
  });
});

test('CS3: caducado + proveedor caído ⇒ stale con antigüedad real (nunca ok)', async () => {
  await withDir(async (dir) => {
    const r = rig(dir);
    await r.service.read('forecast', INPUT);
    assert.strictEqual(r.calls(), 1);

    r.setNow(new Date(BASE.getTime() + 31 * 60_000)); // > TTL 30 min
    r.setBehaviour('fail');
    const res = await r.service.read('forecast', INPUT);

    assert.strictEqual(res.status, 'stale');
    assert.strictEqual(r.calls(), 2, 'sí intentó refetchar');
    assert.strictEqual(res.provenance.status, 'stale');
    assert.strictEqual(res.provenance.freshness, 31 * 60, 'antigüedad en segundos desde observedAt');
    assert.strictEqual(r.service.cacheMetrics().staleServed, 1);
    // El dato servido es el cacheado, no inventado.
    assert.strictEqual((res as { data: ForecastBundle }).data.points[0].tempC, -1);
  });
});

test('CS4: caducado + proveedor sano ⇒ refetch y refresco del TTL', async () => {
  await withDir(async (dir) => {
    const r = rig(dir);
    await r.service.read('forecast', INPUT);
    r.setNow(new Date(BASE.getTime() + 31 * 60_000));

    const res = await r.service.read('forecast', INPUT);
    assert.strictEqual(res.status, 'ok');
    assert.strictEqual(r.calls(), 2);
    assert.strictEqual(r.service.cacheMetrics().writes, 2);

    // Recién refrescada: una lectura inmediata vuelve a ser hit.
    const again = await r.service.read('forecast', INPUT);
    assert.strictEqual(again.status, 'ok');
    assert.strictEqual(r.calls(), 2, 'no vuelve al proveedor tras refrescar');
  });
});

test('CS5: si la licencia prohíbe almacenar NUNCA se escribe en disco', async () => {
  await withDir(async (dir) => {
    const r = rig(dir, NO_STORE);
    const res = await r.service.read('forecast', INPUT);

    assert.strictEqual(res.status, 'ok', 'el dato real se sirve igual');
    assert.strictEqual(existsSync(join(dir, 'forecast-cache.v2.json')), false, 'no debe crear caché');
    assert.strictEqual(r.service.cacheMetrics().writes, 0);
    assert.strictEqual(r.service.cacheMetrics().writeSkips, 1);
  });
});

test('CS5: sin caché y sin permiso de almacenar, cada lectura va al proveedor', async () => {
  await withDir(async (dir) => {
    const r = rig(dir, NO_STORE);
    await r.service.read('forecast', INPUT);
    await r.service.read('forecast', INPUT);
    assert.strictEqual(r.calls(), 2, 'sin caché persistida no hay hit');
  });
});

test('CS6: las métricas de caché reflejan la actividad real', async () => {
  await withDir(async (dir) => {
    const r = rig(dir);
    await r.service.read('forecast', INPUT); // miss + write
    r.setNow(new Date(BASE.getTime() + 5 * 60_000));
    await r.service.read('forecast', INPUT); // hit
    r.setNow(new Date(BASE.getTime() + 40 * 60_000));
    r.setBehaviour('fail');
    await r.service.read('forecast', INPUT); // miss + stale

    const m = r.service.cacheMetrics();
    assert.strictEqual(m.hits, 1);
    assert.strictEqual(m.misses, 2);
    assert.strictEqual(m.writes, 1);
    assert.strictEqual(m.staleServed, 1);
    assert.strictEqual(m.writeSkips, 0);
  });
});
