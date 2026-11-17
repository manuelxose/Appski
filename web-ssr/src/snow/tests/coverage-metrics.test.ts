/**
 * SNOW-03 · Fase E — Métricas de cobertura por tipo de dato y país.
 *
 * Lo que se demuestra:
 *   CV1  un tipo SIN cadena legal ⇒ state 'none' (p. ej. image)
 *   CV2  cadena con eslabón servible ⇒ 'available'
 *   CV3  eslabón caído pero otro servible ⇒ 'degraded' (no se oculta)
 *   CV4  ningún eslabón utilizable ⇒ 'none' con razón explícita
 *   CV5  licencia 'unverified'/'restricted' NO cuenta como servible
 *   CV6  un eslabón ausente del estado runtime NO se asume disponible
 *   CV7  el informe agrega los 8 tipos y los 4 países, sin inventar ceros
 */
import test from 'node:test';
import assert from 'node:assert';
import {
  COUNTRIES,
  buildCoverageReport,
  canServe,
  coverageFor,
  type ProviderRuntimeState,
} from '../cache/coverage-metrics.ts';
import type { ProviderId } from '../contracts/provider-contracts.ts';

const STUB = {
  missingEnvCount: 0,
  licenseStatus: 'allowed' as const,
  breakerOpenUntil: null,
  lastSuccessAt: '2026-11-16T11:00:00.000Z',
  lastLatencyMs: 42,
  attempts: 3,
  failures: 1,
  stalenessSeconds: 3600,
};

const runtime = (id: ProviderId, over: Partial<ProviderRuntimeState> = {}): ProviderRuntimeState => ({
  ...STUB,
  id,
  configured: true,
  breakerPhase: 'closed',
  ...over,
});

const mapOf = (states: readonly ProviderRuntimeState[]) =>
  new Map<ProviderId, ProviderRuntimeState>(states.map((s) => [s.id, s]));

test('CV1: un tipo sin cadena (image) siempre es none', () => {
  const cov = coverageFor('image', mapOf([]));
  assert.strictEqual(cov.state, 'none');
  assert.deepStrictEqual([...cov.chain], []);
  assert.match(cov.reason ?? '', /sin cadena/);
});

test('CV2: forecast con un eslabón servible es available', () => {
  const cov = coverageFor('forecast', mapOf([runtime('aemet')]));
  assert.strictEqual(cov.state, 'available');
  assert.deepStrictEqual([...cov.serving], ['aemet']);
  assert.strictEqual(cov.reason, null);
});

test('CV3: si un eslabón está abierto, el tipo queda degraded (se ve)', () => {
  const cov = coverageFor(
    'forecast',
    mapOf([runtime('aemet', { breakerPhase: 'open' }), runtime('meteofrance')]),
  );
  assert.strictEqual(cov.state, 'degraded');
  assert.deepStrictEqual([...cov.open], ['aemet']);
  assert.deepStrictEqual([...cov.serving], ['meteofrance'], 'el otro sigue sirviendo');
  assert.match(cov.reason ?? '', /aemet/);
});

test('CV4: sin ningún eslabón utilizable ⇒ none con razón', () => {
  const cov = coverageFor(
    'forecast',
    mapOf([
      runtime('aemet', { configured: false }),
      runtime('meteofrance', { configured: false }),
    ]),
  );
  assert.strictEqual(cov.state, 'none');
  assert.deepStrictEqual([...cov.serving], []);
  assert.match(cov.reason ?? '', /ningún eslabón/);
});

test('CV5: licencia unverified o restricted NO cuenta como servible', () => {
  assert.strictEqual(canServe(runtime('aemet', { licenseStatus: 'unverified' })), false);
  assert.strictEqual(canServe(runtime('aemet', { licenseStatus: 'restricted' })), false);
  assert.strictEqual(canServe(runtime('aemet', { licenseStatus: 'blocked' })), false);
  assert.strictEqual(canServe(runtime('aemet', { licenseStatus: 'allowed' })), true);
  assert.strictEqual(canServe(runtime('aemet', { licenseStatus: 'allowed-with-attribution' })), true);

  const cov = coverageFor('forecast', mapOf([
    runtime('aemet', { licenseStatus: 'restricted' }),
    runtime('meteofrance', { licenseStatus: 'unverified' }),
  ]));
  assert.strictEqual(cov.state, 'none');
});

test('CV6: un eslabón sin estado runtime no se asume disponible', () => {
  // La cadena de forecast declara aemet, meteofrance, copernicus-c3s; si sólo
  // hay estado de un proveedor ajeno al tipo, no hay cobertura.
  const cov = coverageFor('forecast', mapOf([runtime('open-meteo')]));
  assert.strictEqual(cov.state, 'none');
  assert.deepStrictEqual([...cov.serving], []);
});

test('CV7: el informe agrega los 8 tipos de dato y los 4 países', () => {
  const report = buildCoverageReport({
    generatedAt: '2026-11-16T12:00:00.000Z',
    providers: [runtime('aemet')],
    stationsByCountry: {
      ES: { total: 12, withSnowData: 5 },
      AD: { total: 2, withSnowData: 1 },
      FR: { total: 3, withSnowData: 0 },
      PT: { total: 0, withSnowData: 0 },
    },
  });

  assert.strictEqual(report.byDataType.length, 8);
  assert.strictEqual(report.byCountry.length, 4);
  assert.deepStrictEqual(report.byCountry.map((c) => c.country), [...COUNTRIES]);

  const es = report.byCountry.find((c) => c.country === 'ES');
  assert.ok(es);
  assert.strictEqual(es.stations, 12);
  assert.strictEqual(es.withSnowData, 5);

  const pt = report.byCountry.find((c) => c.country === 'PT');
  assert.ok(pt);
  assert.strictEqual(pt.stations, 0, 'PT sin estaciones es un 0 REAL, no un dato inventado');
});

test('CV7: ningún campo del informe expone nombres de variables de entorno', () => {
  const report = buildCoverageReport({
    generatedAt: '2026-11-16T12:00:00.000Z',
    providers: [runtime('aemet', { configured: false, missingEnvCount: 1 })],
    stationsByCountry: {
      ES: { total: 1, withSnowData: 0 },
      AD: { total: 0, withSnowData: 0 },
      FR: { total: 0, withSnowData: 0 },
      PT: { total: 0, withSnowData: 0 },
    },
  });
  const serialized = JSON.stringify(report);
  assert.ok(!/API_KEY|_KEY|TOKEN|SECRET/.test(serialized), 'no debe filtrar nombres de env');
  assert.match(serialized, /missingEnvCount/, 'sólo el CONTEO, no los nombres');
});
