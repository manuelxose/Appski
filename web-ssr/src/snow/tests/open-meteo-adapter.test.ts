/**
 * SNOW-03 · Fase C — Adapter real de Open-Meteo con fixtures GRABADAS.
 *
 * Los cuerpos de fixture se capturaron de la API real
 * (`scripts/snow03/capture-open-meteo-fixtures.mjs`) y su procedencia está en
 * `fixtures/PROVENANCE.json` (URL, instante, sha256). Estos tests NO tocan la
 * red: inyectan un `HttpClient` que replayea esos bytes exactos.
 *
 * Lo que se demuestra:
 *   OM1  el adapter rehíle la licencia: sin autorización verificada NO llama a la red;
 *   OM2  parseo de datos reales: 48 puntos, tipos correctos, `snowLineM` siempre null;
 *   OM3  ausencia de variable ⇒ null, nunca 0/-1/-99;
 *   OM4  los fixtures son íntegros (sha256 coincide con PROVENANCE.json);
 *   OM5  degradación honesta: timeout / 5xx / 4xx / 429 / JSON roto / sin `hourly`.
 */
import test from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildForecastUrl,
  isLicenseCleared,
  openMeteoAdapter,
  parseForecastBody,
  wmoCondition,
} from '../providers/open-meteo.adapter.ts';
import type { HttpClient } from '../providers/http-client.ts';
import type { Authorization, ProviderInput } from '../contracts/provider-contracts.ts';

const HERE = fileURLToPath(import.meta.url);
const FIXTURES = join(HERE, '..', '..', 'providers', 'fixtures');

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');

const readFixture = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8');

const okClient = (bodyText: string): HttpClient => async () => ({
  kind: 'ok',
  status: 200,
  bodyText,
  contentType: 'application/json; charset=utf-8',
});

/** Autorización verificada SÓLO para ejercitar el camino de red en tests. */
const CLEARED: Authorization = {
  registryRef: 'TEST#open-meteo',
  licenseId: 'test-only-cleared',
  commercialUse: true,
  storageAllowed: true,
  attributionRequired: true,
};

const UNCLEARED: Authorization = {
  registryRef: '06#open-meteo',
  licenseId: 'unverified',
  commercialUse: false,
  storageAllowed: false,
  attributionRequired: false,
};

const input = (over: Partial<ProviderInput> = {}): ProviderInput => ({
  stationRef: { slug: 'baqueira-beret', country: 'ES', lat: 42.638, lng: 0.766 },
  requestedAt: FIXED_NOW,
  dataType: 'forecast',
  ...over,
});

// ------------------------------------------------------------------- OM4 (primero: valida los bytes que usan los demás)

test('OM4: las fixtures coinciden byte a byte con PROVENANCE.json (sha256)', () => {
  const provText = readFixture('PROVENANCE.json');
  const prov = JSON.parse(provText) as {
    records: Array<{ file: string; sha256: string; bytes: number }>;
  };
  assert.ok(prov.records.length > 0, 'PROVENANCE.json no lista fixtures');

  for (const record of prov.records) {
    const body = readFixture(record.file);
    const digest = createHash('sha256').update(body).digest('hex');
    assert.strictEqual(digest, record.sha256, `${record.file}: sha256 no coincide con la captura`);
    assert.strictEqual(Buffer.byteLength(body, 'utf8'), record.bytes, `${record.file}: tamaño distinto`);
  }
});

// ------------------------------------------------------------------- OM1

test('OM1: sin licencia verificada el adapter devuelve blocked y NO llama a la red', async () => {
  let called = false;
  const adapter = openMeteoAdapter(UNCLEARED, {
    http: async () => {
      called = true;
      return { kind: 'ok', status: 200, bodyText: '{}', contentType: null };
    },
  });

  const result = await adapter.fetch(input());
  assert.strictEqual(called, false, 'el cliente HTTP no debe invocarse sin licencia verificada');
  assert.strictEqual(result.status, 'blocked');
  assert.strictEqual(result.provenance.licenseStatus, 'unverified');
  assert.match((result as { reason: string }).reason, /license not verified/);
});

test('OM1: isLicenseCleared exige comercial + almacenamiento + licenseId distinto de blocked', () => {
  assert.strictEqual(isLicenseCleared(CLEARED), true);
  assert.strictEqual(isLicenseCleared(UNCLEARED), false);
  assert.strictEqual(isLicenseCleared({ ...CLEARED, storageAllowed: false }), false);
  assert.strictEqual(isLicenseCleared({ ...CLEARED, commercialUse: false }), false);
  assert.strictEqual(isLicenseCleared({ ...CLEARED, licenseId: 'blocked' }), false);
});

// ------------------------------------------------------------------- OM2

test('OM2: parsea la fixture real en 48 puntos horarios válidos', () => {
  const bundle = parseForecastBody(readFixture('forecast-ok.json'));
  assert.ok(bundle !== null, 'la fixture real debe parsear');
  assert.strictEqual(bundle.points.length, 48, 'forecast_days=2 ⇒ 48 horas');
  assert.strictEqual(bundle.horizonHours, 48);

  for (const p of bundle.points) {
    assert.match(p.validAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/, `validAt no es ISO UTC: ${p.validAt}`);
    assert.ok(Number.isFinite(Date.parse(p.validAt)), `validAt no parseable: ${p.validAt}`);
    assert.strictEqual(p.snowLineM, null, 'Open-Meteo no publica cota de nieve: debe ser null, no un valor inventado');
  }

  // Primer punto: medido en la captura (2026-11-16T00:00, -2.9 °C, 3.5 km/h, 3 → nublado).
  const first = bundle.points[0];
  assert.strictEqual(first.validAt, '2026-11-16T00:00:00.000Z');
  assert.strictEqual(first.tempC, -2.9);
  assert.strictEqual(first.windKmh, 3.5);
  assert.strictEqual(first.precipMm, 0);
  assert.strictEqual(first.condition, 'nublado');
});

test('OM2: los valores son números o null (nunca NaN/±Infinity)', () => {
  const bundle = parseForecastBody(readFixture('forecast-ok.json'));
  assert.ok(bundle);
  for (const p of bundle.points) {
    for (const v of [p.tempC, p.windKmh, p.precipMm]) {
      assert.ok(v === null || Number.isFinite(v), `valor no finito: ${String(v)}`);
    }
  }
});

test('OM2: wmoCondition mapea códigos reales y devuelve null para desconocidos', () => {
  assert.strictEqual(wmoCondition(0), 'despejado');
  assert.strictEqual(wmoCondition(3), 'nublado');
  assert.strictEqual(wmoCondition(71), 'nieve');
  assert.strictEqual(wmoCondition(95), 'tormenta');
  assert.strictEqual(wmoCondition(999), null);
  assert.strictEqual(wmoCondition(null), null);
});

// ------------------------------------------------------------------- OM3

test('OM3: una variable ausente produce null, jamás 0/-1/-99', () => {
  const body = JSON.stringify({
    hourly: { time: ['2026-11-16T00:00'], temperature_2m: [null], wind_speed_10m: [-99] },
  });
  const bundle = parseForecastBody(body);
  assert.ok(bundle);
  const p = bundle.points[0];
  assert.strictEqual(p.tempC, null, 'null se conserva como ausencia');
  assert.strictEqual(p.windKmh, null, 'el centinela -99 se normaliza a null');
  assert.strictEqual(p.precipMm, null, 'serie ausente ⇒ null');
  assert.strictEqual(p.condition, null, 'weather_code ausente ⇒ null');
});

test('OM3: la fixture mínima (sólo temperature_2m) parsea sin inventar el resto', () => {
  const bundle = parseForecastBody(readFixture('forecast-minimal.json'));
  assert.ok(bundle);
  assert.strictEqual(bundle.points.length, 24);
  for (const p of bundle.points) {
    assert.strictEqual(p.windKmh, null);
    assert.strictEqual(p.precipMm, null);
    assert.strictEqual(p.snowLineM, null);
  }
});

// ------------------------------------------------------------------- OM5

test('OM5: timeout ⇒ error retryable sin datos', async () => {
  const adapter = openMeteoAdapter(CLEARED, {
    http: async () => ({ kind: 'timeout', timeoutMs: 8000 }),
  });
  const r = await adapter.fetch(input());
  assert.strictEqual(r.status, 'error');
  assert.strictEqual((r as { retryable: boolean }).retryable, true);
  assert.match((r as { message: string }).message, /timeout/);
});

test('OM5: HTTP 503 ⇒ error retryable; HTTP 400 ⇒ error NO retryable', async () => {
  const err = (status: number): HttpClient => async () => ({ kind: 'http_error', status, retryAfterMs: null });
  const a503 = await openMeteoAdapter(CLEARED, { http: err(503) }).fetch(input());
  const a400 = await openMeteoAdapter(CLEARED, { http: err(400) }).fetch(input());
  assert.strictEqual(a503.status, 'error');
  assert.strictEqual((a503 as { retryable: boolean }).retryable, true, '5xx es transitorio');
  assert.strictEqual(a400.status, 'error');
  assert.strictEqual((a400 as { retryable: boolean }).retryable, false, '4xx no se arregla reintentando');
});

test('OM5: HTTP 429 ⇒ rate_limited con retryAfterMs', async () => {
  const adapter = openMeteoAdapter(CLEARED, {
    http: async () => ({ kind: 'http_error', status: 429, retryAfterMs: 30_000 }),
  });
  const r = await adapter.fetch(input());
  assert.strictEqual(r.status, 'rate_limited');
  assert.strictEqual((r as { retryAfterMs: number }).retryAfterMs, 30_000);
});

test('OM5: JSON roto y cuerpo sin hourly ⇒ no_data/source-silent (nunca datos inventados)', async () => {
  for (const body of ['no soy json', JSON.stringify({ latitude: 1 }), JSON.stringify({ error: true, reason: 'bad' })]) {
    const adapter = openMeteoAdapter(CLEARED, { http: okClient(body) });
    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'no_data', `cuerpo ${body.slice(0, 20)} debía ser no_data`);
    assert.strictEqual((r as { reason: string }).reason, 'source-silent');
  }
});

test('OM5: el adapter NO captura; la resiliencia vive en IngestPipeline', async () => {
  // Contrato explícito: openMeteoAdapter delega en HttpClient, que ya devuelve
  // resultados discriminados. Si el cliente inyectado lanza, la excepción sale;
  // IngestPipeline la convierte en `error` retryable (ver pipeline.test.ts).
  const adapter = openMeteoAdapter(CLEARED, {
    http: async () => {
      throw new Error('boom');
    },
  });
  await assert.rejects(async () => adapter.fetch(input()), /boom/);
});

test('OM5: la URL de petición incluye coordenadas fijas, variables y timezone=UTC', () => {
  const url = new URL(buildForecastUrl(42.638123, 0.766987, 2));
  assert.strictEqual(url.origin + url.pathname, 'https://api.open-meteo.com/v1/forecast');
  assert.strictEqual(url.searchParams.get('latitude'), '42.6381', 'redondeo a 4 decimales');
  assert.strictEqual(url.searchParams.get('longitude'), '0.7670');
  assert.strictEqual(url.searchParams.get('timezone'), 'UTC');
  assert.strictEqual(url.searchParams.get('forecast_days'), '2');
  const hourly = url.searchParams.get('hourly') ?? '';
  for (const v of ['temperature_2m', 'wind_speed_10m', 'precipitation']) {
    assert.ok(hourly.includes(v), `falta ${v} en hourly`);
  }
});

test('OM5: canServe sólo responde a forecast y la licencia por tipo es coherente', () => {
  const adapter = openMeteoAdapter(CLEARED);
  assert.strictEqual(adapter.id, 'open-meteo');
  assert.strictEqual(adapter.canServe(input()), true);
  assert.strictEqual(adapter.canServe(input({ dataType: 'snow-depth' })), false);
  assert.deepStrictEqual([...adapter.provides], ['forecast']);
  assert.strictEqual(adapter.licenseByType.forecast, 'allowed-with-attribution');

  const unclear = openMeteoAdapter(UNCLEARED);
  assert.strictEqual(unclear.licenseByType.forecast, 'unverified');
  assert.strictEqual(unclear.attribution(), null, 'sin licencia verificada no se emite atribución');
});
