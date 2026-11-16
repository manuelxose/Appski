/**
 * SNOW-02 — Regresión ANTI-SENTINEL en el borde editorial.
 *
 * HALLAZGO DEL CAPITÁN: `POST /api/snow/v1/admin/reports` con
 * `snow: { baseCm: -99 }` devolvía **201** y PERSISTÍA `-99`; después `/report`
 * lo servía y el ranking lo publicaba. Un valor negativo no es un dato
 * (regla anti-sentinel, SNOW-02 §5.2).
 *
 * Causa medida: `parseNewReportInput` (store/repository.ts:116-117) hacía
 * `(b['snow'] ?? null) as NewSnowReportInput['snow']` — un `as` que se salta el
 * validador. `parseSnowDepthReport` (store/editorial-payload.ts) SÍ rechaza -99.
 *
 * Este fichero fija el contrato en la PUERTA (la función que el borde invoca),
 * para que el arreglo no pueda revertirse en silencio.
 */
import test from 'node:test';
import assert from 'node:assert';
import { parseNewReportInput } from '../store/repository.ts';
import { parseEditorialPayload, parseSnowDepthReport } from '../store/editorial-payload.ts';

const BASE = {
  stationSlug: 'baqueira-beret',
  observedAt: '2026-11-16T08:00:00.000Z',
  sourceUrl: 'https://example.invalid/parte',
  author: 'operador-1',
  confidence: 1,
};

// ------------------------------------------------------------ puerta del borde

test('S1: POST admin con snow.baseCm=-99 ⇒ 400 nombrando snow.baseCm (no 201, no persistir -99)', () => {
  const parsed = parseNewReportInput({ ...BASE, snow: { baseCm: -99 } });
  assert.strictEqual(parsed.ok, false, 'un centinela negativo NO puede pasar la validación del borde');
  assert.deepStrictEqual(
    parsed.errors.map((e) => e.field),
    ['snow.baseCm'],
    'el 400 debe nombrar el campo exacto (fields[] del borde)',
  );
});

test('S2: POST admin con operational.liftsOpen=-99 ⇒ 400 nombrando operational.liftsOpen', () => {
  const parsed = parseNewReportInput({ ...BASE, operational: { liftsOpen: -99 } });
  assert.strictEqual(parsed.ok, false, 'liftsOpen=-99 es centinela, no dato');
  assert.deepStrictEqual(parsed.errors.map((e) => e.field), ['operational.liftsOpen']);
});

test('S3: snow.baseCm=null ⇒ null (ausencia honesta, NO se rellena con 0)', () => {
  const parsed = parseNewReportInput({ ...BASE, snow: { baseCm: null, topCm: 120, midCm: null, newSnow24hCm: null, quality: null } });
  assert.strictEqual(parsed.ok, true, 'null es una ausencia válida, no un error');
  assert.strictEqual(parsed.input.snow.baseCm, null, 'null debe sobrevivir como null');
  assert.strictEqual(parsed.input.snow.midCm, null);
  assert.strictEqual(parsed.input.snow.topCm, 120);
});

test('S4: snow ausente ⇒ null (sin bloque no se fabrican ceros)', () => {
  const parsed = parseNewReportInput({ ...BASE });
  assert.strictEqual(parsed.ok, true);
  assert.strictEqual(parsed.input.snow, null);
  assert.strictEqual(parsed.input.operational, null);
});

test('S5: un parte válido sigue pasando y conserva sus números', () => {
  const parsed = parseNewReportInput({
    ...BASE,
    operational: { liftsOpen: 12, liftsTotal: 21, pistesOpen: 40, pistesTotal: 118, kmOpen: 40, kmTotal: 161, isOpen: true, byLevel: null },
    snow: { baseCm: 40, midCm: 80, topCm: 110, newSnow24hCm: 5, quality: 'powder' },
  });
  assert.strictEqual(parsed.ok, true, 'la validación no puede romper el camino feliz');
  assert.strictEqual(parsed.input.snow.baseCm, 40);
  assert.strictEqual(parsed.input.operational.liftsOpen, 12);
});

// ------------------------------------------------------------ piezas del validador

test('S6: parseSnowDepthReport rechaza -99 y -1, acepta null', () => {
  assert.strictEqual(parseSnowDepthReport({ baseCm: -99 }).ok, false);
  assert.strictEqual(parseSnowDepthReport({ topCm: -1 }).ok, false);
  const ok = parseSnowDepthReport({ baseCm: null });
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.value.baseCm, null);
});

test('S7: parseEditorialPayload agrega los errores de ambas cargas y tipa campos', () => {
  const bad = parseEditorialPayload({ liftsOpen: -99 }, { baseCm: -99 });
  assert.strictEqual(bad.ok, false);
  assert.deepStrictEqual(bad.errors.map((e) => e.field).sort(), ['operational.liftsOpen', 'snow.baseCm']);

  const good = parseEditorialPayload(null, { baseCm: null });
  assert.strictEqual(good.ok, true);
  assert.strictEqual(good.value.operational, null);
  assert.strictEqual(good.value.snow.baseCm, null);
});
