/**
 * SNOW-03 · Fase E — Caché de pronóstico en disco (store JSON v2).
 *
 * Contrato cubierto (reloj inyectado, sin Date.now() implícito):
 *   FC1  la escritura se DENIEGA si la licencia no permite almacenar
 *   FC2  TTL 0 ⇒ no se cachea (nunca)
 *   FC3  dentro del TTL ⇒ fresh; pasada la caducidad ⇒ stale (nunca "ok")
 *   FC4  identidad por (proveedor, lat, lng): un punto distinto NO reutiliza
 *   FC5  payload JSON corrupto ⇒ null (no se "repara" sirviendo basura)
 *   FC6  persistencia REAL en disco v2 + idempotencia por identidad
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildCacheEntry,
  decideCacheWrite,
  readCacheEntry,
} from '../cache/forecast-cache.ts';
import { JsonForecastCacheRepository } from '../store/json-store/json-forecast-repository.ts';
import type { Authorization } from '../contracts/provider-contracts.ts';

const NOW = new Date('2026-11-16T12:00:00.000Z');

const ALLOWED_STORE: Authorization = {
  registryRef: 'test#open-meteo',
  licenseId: 'test-cacheable',
  commercialUse: true,
  storageAllowed: true,
  attributionRequired: true,
};

const NO_STORE: Authorization = {
  registryRef: '06#open-meteo',
  licenseId: 'unverified',
  commercialUse: false,
  storageAllowed: false,
  attributionRequired: false,
};

const PAYLOAD = { points: [{ validAt: '2026-11-16T12:00:00.000Z', tempC: -2.9 }], horizonHours: 1 };

// ------------------------------------------------------------------- FC1 / FC2

test('FC1: sin permiso de almacenamiento la escritura se deniega', () => {
  const d = decideCacheWrite('open-meteo', NO_STORE, NOW);
  assert.strictEqual(d.kind, 'skip');
  assert.strictEqual((d as { reason: string }).reason, 'license-prohibits-storage');
});

test('FC1: licenseId "blocked" también deniega aunque storageAllowed sea true', () => {
  const d = decideCacheWrite('open-meteo', { ...ALLOWED_STORE, licenseId: 'blocked' }, NOW);
  assert.strictEqual(d.kind, 'skip');
});

test('FC2: un proveedor sin TTL (0) no se cachea', () => {
  // 'editorial-report' tiene ttlMs: 0 en CACHE_POLICY.
  const d = decideCacheWrite('editorial-report', ALLOWED_STORE, NOW);
  assert.strictEqual(d.kind, 'skip');
  assert.strictEqual((d as { reason: string }).reason, 'no-ttl');
});

test('FC2: open-meteo declara TTL de 30 min ⇒ expiresAt = now + 30 min', () => {
  const d = decideCacheWrite('open-meteo', ALLOWED_STORE, NOW);
  assert.strictEqual(d.kind, 'write');
  assert.strictEqual((d as { expiresAt: string }).expiresAt, '2026-11-16T12:30:00.000Z');
});

// ------------------------------------------------------------------- FC3

const entryAt = (observedAt: string, expiresAt: string) =>
  buildCacheEntry({
    stationSlug: 'baqueira-beret',
    source: 'open-meteo',
    lat: 42.638,
    lng: 0.766,
    observedAt,
    updatedAt: null,
    expiresAt,
    payload: PAYLOAD,
  });

test('FC3: dentro del TTL la entrada es fresh y conserva el payload', () => {
  const e = entryAt('2026-11-16T11:50:00.000Z', '2026-11-16T12:20:00.000Z');
  const read = readCacheEntry<typeof PAYLOAD>(e, NOW);
  assert.ok(read);
  assert.strictEqual(read.state, 'fresh');
  assert.deepStrictEqual(read.data, PAYLOAD);
  assert.strictEqual(read.ageSeconds, 600, '10 min desde observedAt');
});

test('FC3: caducada ⇒ stale (nunca se presenta como fresca)', () => {
  const e = entryAt('2026-11-16T10:00:00.000Z', '2026-11-16T11:00:00.000Z');
  const read = readCacheEntry<typeof PAYLOAD>(e, NOW);
  assert.ok(read);
  assert.strictEqual(read.state, 'stale');
  assert.strictEqual(read.ageSeconds, 7200);
});

test('FC3: el borde exacto de caducidad NO es fresco', () => {
  const e = entryAt('2026-11-16T11:30:00.000Z', '2026-11-16T12:00:00.000Z');
  const read = readCacheEntry<typeof PAYLOAD>(e, NOW);
  assert.ok(read);
  assert.strictEqual(read.state, 'stale', 'now === expiresAt ya no es vigente');
});

test('FC3: una fecha inválida nunca se considera fresca', () => {
  const e = entryAt('no-es-fecha', 'tampoco');
  assert.strictEqual(readCacheEntry<typeof PAYLOAD>(e, NOW), null);
});

// ------------------------------------------------------------------- FC5

test('FC5: payload corrupto ⇒ null (no se sirve basura ni se "repara")', () => {
  const e = { ...entryAt('2026-11-16T11:50:00.000Z', '2026-11-16T12:20:00.000Z'), payloadJson: '{roto' };
  assert.strictEqual(readCacheEntry<typeof PAYLOAD>(e, NOW), null);
});

test('FC5: sin entrada ⇒ null (no se inventa un pronóstico vacío)', () => {
  assert.strictEqual(readCacheEntry<typeof PAYLOAD>(null, NOW), null);
});

// ------------------------------------------------------------- FC4 / FC6 (disco real)

const withDir = async (fn: (dir: string) => Promise<void>): Promise<void> => {
  const dir = mkdtempSync(join(tmpdir(), 'snow03-cache-'));
  try {
    await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('FC6: persiste en disco v2 y sobrevive a un repositorio nuevo (idempotente)', async () => {
  await withDir(async (dir) => {
    const repo = new JsonForecastCacheRepository(dir);
    const e = entryAt('2026-11-16T11:50:00.000Z', '2026-11-16T12:20:00.000Z');
    await repo.put(e);

    const file = join(dir, 'forecast-cache.v2.json');
    assert.ok(existsSync(file), 'debe escribirse el fichero v2');
    const onDisk = JSON.parse(readFileSync(file, 'utf8')) as { records: Array<{ record: Record<string, unknown> }> };
    assert.strictEqual(onDisk.records.length, 1);
    assert.strictEqual(onDisk.records[0].record['source'], 'open-meteo');
    assert.strictEqual(onDisk.records[0].record['lat'], 42.638, 'las coordenadas se persisten');

    // Un repositorio NUEVO (proceso distinto) lee lo mismo.
    const fresh = new JsonForecastCacheRepository(dir);
    const hit = await fresh.get('baqueira-beret', 'open-meteo');
    assert.ok(hit);
    assert.strictEqual(hit.lat, 42.638);

    // Idempotencia: volver a escribir la misma identidad no duplica.
    await repo.put(e);
    const again = JSON.parse(readFileSync(file, 'utf8')) as { records: unknown[] };
    assert.strictEqual(again.records.length, 1, 'no debe duplicar la entrada');
  });
});

test('FC4: getForPoint sólo devuelve la entrada de las MISMAS coordenadas', async () => {
  await withDir(async (dir) => {
    const repo = new JsonForecastCacheRepository(dir);
    await repo.put(entryAt('2026-11-16T11:50:00.000Z', '2026-11-16T12:20:00.000Z'));

    const same = await repo.getForPoint('baqueira-beret', 'open-meteo', 42.638, 0.766);
    assert.ok(same, 'mismo punto ⇒ entrada');

    const moved = await repo.getForPoint('baqueira-beret', 'open-meteo', 42.7001, 0.766);
    assert.strictEqual(moved, null, 'un punto distinto NO reutiliza el pronóstico');

    const otherProvider = await repo.getForPoint('baqueira-beret', 'aemet', 42.638, 0.766);
    assert.strictEqual(otherProvider, null, 'otra fuente ⇒ sin entrada');
  });
});

test('FC4: una entrada SIN coordenadas (previa a SNOW-03) no se sirve por punto', async () => {
  await withDir(async (dir) => {
    const repo = new JsonForecastCacheRepository(dir);
    await repo.put({
      stationSlug: 'baqueira-beret',
      source: 'open-meteo',
      lat: null,
      lng: null,
      observedAt: '2026-11-16T11:50:00.000Z',
      updatedAt: '2026-11-16T11:50:00.000Z',
      expiresAt: '2026-11-16T12:20:00.000Z',
      payloadJson: JSON.stringify(PAYLOAD),
    });
    assert.strictEqual(await repo.getForPoint('baqueira-beret', 'open-meteo', 42.638, 0.766), null);
    // Pero sí se puede leer con la firma antigua (compatibilidad).
    assert.ok(await repo.get('baqueira-beret', 'open-meteo'));
  });
});

test('FC6: updatedAt ausente del proveedor cae en observedAt, nunca en la hora actual', () => {
  const e = entryAt('2026-11-16T11:50:00.000Z', '2026-11-16T12:20:00.000Z');
  assert.strictEqual(e.updatedAt, '2026-11-16T11:50:00.000Z');
});
