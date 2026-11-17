/**
 * SNOW-03 · Fase E — Circuit breaker con half-open REAL.
 *
 * El breaker previo abría pero nunca se recuperaba (no había transición a
 * half-open ni cierre por éxito). Aquí se fija el contrato de estados con un
 * reloj inyectado, sin `Date.now()` implícito.
 *
 *   BR1  cerrado: permite y acumula fallos hasta el umbral
 *   BR2  abierto: deniega sin consumir probes
 *   BR3  half-open: concede exactamente `halfOpenProbes` intento(s)
 *   BR4  éxito en half-open ⇒ cierra y resetea contadores
 *   BR5  fallo en half-open ⇒ reabre de inmediato
 *   BR6  config por defecto = umbral 5, 5 min, 1 probe
 *   BR7  snapshot refleja fase, fallos y apertura
 */
import test from 'node:test';
import assert from 'node:assert';
import { BREAKER, Breaker } from '../cache/breaker.ts';

const T0 = 1_000_000;
const CFG = { failureThreshold: 3, openMs: 60_000, halfOpenProbes: 1 };

test('BR6: la configuración por defecto no cambia (5 fallos, 5 min, 1 probe)', () => {
  assert.strictEqual(BREAKER.failureThreshold, 5);
  assert.strictEqual(BREAKER.openMs, 5 * 60_000);
  assert.strictEqual(BREAKER.halfOpenProbes, 1);
});

test('BR1: cerrado permite siempre y acumula fallos bajo el umbral', () => {
  const b = new Breaker(CFG);
  for (let i = 0; i < CFG.failureThreshold - 1; i += 1) {
    assert.strictEqual(b.allow('open-meteo', T0), true);
    b.recordFailure('open-meteo', T0);
  }
  assert.strictEqual(b.phase('open-meteo', T0), 'closed');
  assert.strictEqual(b.isOpen('open-meteo', T0), false);
});

test('BR2: al alcanzar el umbral se abre y deniega sin consumir probes', () => {
  const b = new Breaker(CFG);
  for (let i = 0; i < CFG.failureThreshold; i += 1) b.recordFailure('aemet', T0);
  assert.strictEqual(b.phase('aemet', T0), 'open');
  assert.strictEqual(b.isOpen('aemet', T0), true);
  assert.strictEqual(b.allow('aemet', T0 + 1), false);
  assert.strictEqual(b.allow('aemet', T0 + 59_999), false, 'antes de openMs sigue abierto');
});

test('BR3: vencido openMs entra en half-open y concede un solo probe', () => {
  const b = new Breaker(CFG);
  for (let i = 0; i < CFG.failureThreshold; i += 1) b.recordFailure('aemet', T0);
  assert.strictEqual(b.phase('aemet', T0 + CFG.openMs), 'half-open');
  assert.strictEqual(b.allow('aemet', T0 + CFG.openMs), true, 'primer probe concedido');
  assert.strictEqual(b.allow('aemet', T0 + CFG.openMs), false, 'segundo probe denegado');
});

test('BR4: un éxito tras el half-open cierra el circuit y resetea fallos', () => {
  const b = new Breaker(CFG);
  for (let i = 0; i < CFG.failureThreshold; i += 1) b.recordFailure('aemet', T0);
  b.allow('aemet', T0 + CFG.openMs);
  b.recordSuccess('aemet');
  assert.strictEqual(b.phase('aemet', T0 + CFG.openMs), 'closed');
  assert.strictEqual(b.isOpen('aemet', T0 + CFG.openMs), false);
  assert.strictEqual(b.allow('aemet', T0 + CFG.openMs), true);

  // Tras el reset hacen falta de nuevo `failureThreshold` fallos para abrir.
  b.recordFailure('aemet', T0 + CFG.openMs);
  b.recordFailure('aemet', T0 + CFG.openMs);
  assert.strictEqual(b.phase('aemet', T0 + CFG.openMs), 'closed', '2 fallos < umbral 3');
});

test('BR5: un fallo en half-open reabre de inmediato (no espera al umbral)', () => {
  const b = new Breaker(CFG);
  for (let i = 0; i < CFG.failureThreshold; i += 1) b.recordFailure('aemet', T0);
  const afterExpiry = T0 + CFG.openMs;
  assert.strictEqual(b.allow('aemet', afterExpiry), true);
  b.recordFailure('aemet', afterExpiry);
  assert.strictEqual(b.phase('aemet', afterExpiry), 'open');
  assert.strictEqual(b.isOpen('aemet', afterExpiry), true);
  assert.strictEqual(b.allow('aemet', afterExpiry + CFG.openMs), true, 'se vuelve a sondear tras otra ventana');
});

test('BR7: snapshot refleja fase, fallos y estado de apertura por proveedor', () => {
  const b = new Breaker(CFG);
  b.recordSuccess('osm');
  b.recordFailure('aemet', T0);
  for (let i = 0; i < CFG.failureThreshold; i += 1) b.recordFailure('open-meteo', T0);

  const snap = b.snapshot(T0);
  const byId = Object.fromEntries(snap.map((s) => [s.id, s]));
  assert.strictEqual(byId.aemet.failures, 1);
  assert.strictEqual(byId.aemet.phase, 'closed');
  assert.strictEqual(byId['open-meteo'].phase, 'open');
  assert.strictEqual(byId['open-meteo'].open, true);
  assert.strictEqual(byId.osm.failures, 0);
});

test('BR7: open() explícito (cuota 429) abre por la ventana indicada', () => {
  const b = new Breaker(CFG);
  b.open('open-meteo', 30_000, T0);
  assert.strictEqual(b.isOpen('open-meteo', T0 + 29_999), true);
  assert.strictEqual(b.isOpen('open-meteo', T0 + 30_000), false);
});
