/**
 * SNOW-02 R3 (reparación) — Un parte PUBLICADO con `observedAt` en el FUTURO del
 * reloj del servidor debe ser visible: es el más reciente.
 *
 * Bug medido en el bundle: 4 POST /admin/reports ⇒ 201 y `GET /admin/reports`
 * devolvía los 4, pero `/report` servía el parte viejo (`baseCm:null`) y
 * `/rankings/nieve` / `/stations` caían a `no_data`, porque `listPublished`
 * descartaba los partes posteriores al reloj (`notAfter`). Un operador con la
 * hora adelantada hacía invisible todo parte recién transcrito.
 *
 * Regla fijada: la VISIBILIDAD la decide `mood === 'published'`; la frescura la
 * decide `editorialFreshness` (informativa: `stale`, nunca oculta).
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonSnowReportRepository } from '../store/json-store/json-report-repository.ts';

const dirs = [];

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'snow-store-v2-'));
  dirs.push(dir);
  return dir;
}

test.after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

/** Reloj del servidor: 2026-11-16T12:00:00Z. */
const NOW = new Date('2026-11-16T12:00:00.000Z');

function report(overrides) {
  return {
    id: 'r-viejo',
    stationSlug: 'baqueira-beret',
    observedAt: '2026-11-15T08:00:00.000Z',
    capturedAt: '2026-11-15T09:00:00.000Z',
    sourceUrl: 'https://example.invalid/parte',
    author: 'operador-1',
    confidence: 0.9,
    operational: null,
    snow: { baseCm: 30, midCm: null, topCm: null, newSnow24hCm: null, quality: null },
    avalancheLevel: null,
    mood: 'published',
    ...overrides,
  };
}

test('R3a: un parte publicado con observedAt FUTURO es el último publicado (el reloj no decide visibilidad)', async () => {
  const dir = tempDir();
  const repo = new JsonSnowReportRepository(dir);
  await repo.insert(report({}));
  await repo.insert(
    report({
      id: 'r-futuro',
      observedAt: '2026-11-16T12:05:00.000Z', // 5 min por delante del reloj del servidor
      capturedAt: '2026-11-16T11:59:00.000Z',
      snow: { baseCm: 55, midCm: null, topCm: null, newSnow24hCm: null, quality: null },
    }),
  );

  const latest = await repo.latestPublishedForStation('baqueira-beret', NOW);
  assert.ok(latest, 'un parte publicado NO puede quedar invisible por su fecha');
  assert.strictEqual(latest.id, 'r-futuro', 'gana el más reciente por observedAt, aunque esté en el futuro');
  assert.strictEqual(latest.snow.baseCm, 55, 'el espesor recién transcrito debe llegar al consumidor');

  const published = await repo.listPublished(NOW);
  assert.strictEqual(published.length, 2, 'ambos publicados cuentan, sin filtrar por reloj');
});

test('R3b: listPublished selecciona por mood (published), no por fecha', async () => {
  const dir = tempDir();
  const repo = new JsonSnowReportRepository(dir);
  await repo.insert(report({ id: 'ok', observedAt: '2026-11-16T13:00:00.000Z' }));
  await repo.insert(report({ id: 'borrador', observedAt: '2026-11-16T11:00:00.000Z', mood: 'draft' }));
  await repo.insert(report({ id: 'rechazado', observedAt: '2026-11-16T11:30:00.000Z', mood: 'rejected' }));
  await repo.insert(report({ id: 'pendiente', observedAt: '2026-11-16T11:45:00.000Z', mood: 'pending' }));

  const ids = (await repo.listPublished(NOW)).map((r) => r.id);
  assert.deepStrictEqual(ids, ['ok'], 'sólo los publicados; draft/rejected/pending quedan fuera por motivo');
});

test('R3c: un parte antiguo sigue publicado (stale es informativo, no un filtro)', async () => {
  const dir = tempDir();
  const repo = new JsonSnowReportRepository(dir);
  await repo.insert(report({ id: 'antiguo', observedAt: '2026-11-01T08:00:00.000Z', capturedAt: '2026-11-01T09:00:00.000Z' }));

  const latest = await repo.latestPublishedForStation('baqueira-beret', NOW);
  assert.strictEqual(latest.id, 'antiguo', 'un parte viejo sigue siendo el último publicado de la estación');
  assert.strictEqual(latest.snow.baseCm, 30);
});

test('R3d: sin partes de la estación ⇒ null (ausencia honesta, no un parte fabricado)', async () => {
  const dir = tempDir();
  const repo = new JsonSnowReportRepository(dir);
  await repo.insert(report({ stationSlug: 'grandvalira' }));
  assert.strictEqual(await repo.latestPublishedForStation('baqueira-beret', NOW), null);
});
