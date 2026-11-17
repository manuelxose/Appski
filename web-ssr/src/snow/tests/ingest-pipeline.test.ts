/**
 * SNOW-03 · Fase E — Pipeline de ingesta resistente a fallos.
 *
 * Contrato cubierto:
 *   E1  reintenta fallos retryables con backoff exponencial acotado y termina bien
 *   E2  NO reintenta fallos no retryables (un intento)
 *   E3  un 429 fija la ventana del breaker y no reintenta antes
 *   E4  breaker abierto ⇒ no se llama al proveedor (corte contabilizado)
 *   E5  una excepción del adapter se convierte en `error` retryable (nunca escapa)
 *   E6  el resultado terminal no se reintenta (ok/no_data/not_configured/blocked)
 *   E7  métricas por proveedor: intentos, éxitos, fallos, cortes, latencia
 *   E8  backoffDelay es exponencial y respeta el techo
 */
import test from 'node:test';
import assert from 'node:assert';
import { Breaker } from '../cache/breaker.ts';
import {
  DEFAULT_INGEST_POLICY,
  backoffDelay,
  IngestPipeline,
  isRetryable,
} from '../ingest/pipeline.ts';
import type { ProviderId, ProviderResult } from '../contracts/provider-contracts.ts';

const T0 = 5_000_000;
const POLICY = { maxRetries: 2, baseDelayMs: 100, maxDelayMs: 250 };

/** Reloj monótono falso: cada llamada avanza `step` ms. */
const fakeClock = (step = 10) => {
  let t = T0;
  return () => {
    const v = t;
    t += step;
    return v;
  };
};

const prov = (id: ProviderId): ProviderResult<unknown>['provenance'] => ({
  source: id,
  observedAt: new Date(T0).toISOString(),
  updatedAt: null,
  status: 'degraded',
  licenseStatus: 'unverified',
  freshness: 0,
  authorization: {
    registryRef: `test#${id}`,
    licenseId: 'test',
    commercialUse: false,
    storageAllowed: false,
    attributionRequired: false,
  },
  attribution: null,
});

const errRetryable = (id: ProviderId): ProviderResult<unknown> => ({
  status: 'error',
  provenance: prov(id),
  message: 'transient',
  retryable: true,
});

const errFinal = (id: ProviderId): ProviderResult<unknown> => ({
  status: 'error',
  provenance: prov(id),
  message: 'permanent',
  retryable: false,
});

const ok = (id: ProviderId): ProviderResult<unknown> => ({
  status: 'ok',
  data: { value: 1 },
  provenance: prov(id),
});

interface Harness {
  pipeline: IngestPipeline;
  sleeps: number[];
  breaker: Breaker;
}

const harness = (breaker = new Breaker({ failureThreshold: 3, openMs: 60_000, halfOpenProbes: 1 })): Harness => {
  const sleeps: number[] = [];
  const pipeline = new IngestPipeline({
    breaker,
    now: fakeClock(10),
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    policy: POLICY,
  });
  return { pipeline, sleeps, breaker };
};

test('E8: el backoff es exponencial desde baseDelayMs y respeta maxDelayMs', () => {
  assert.strictEqual(backoffDelay(1, POLICY), 100);
  assert.strictEqual(backoffDelay(2, POLICY), 200);
  assert.strictEqual(backoffDelay(3, POLICY), 250, '2^2*100=400 se recorta a 250');
  assert.strictEqual(backoffDelay(10, POLICY), 250);
  assert.strictEqual(DEFAULT_INGEST_POLICY.maxRetries, 2);
});

test('E8: isRetryable sólo acepta error+retryable', () => {
  assert.strictEqual(isRetryable(errRetryable('open-meteo')), true);
  assert.strictEqual(isRetryable(errFinal('open-meteo')), false);
  assert.strictEqual(isRetryable(ok('open-meteo')), false);
  assert.strictEqual(isRetryable({ status: 'no_data', provenance: prov('open-meteo'), reason: 'source-silent' }), false);
});

test('E1: reintenta fallos transitorios y termina en ok tras 3 intentos', async () => {
  const { pipeline, sleeps } = harness();
  let calls = 0;
  const result = await pipeline.execute('open-meteo', 'forecast', async () => {
    calls += 1;
    return calls < 3 ? errRetryable('open-meteo') : ok('open-meteo');
  });
  assert.strictEqual(result.status, 'ok');
  assert.strictEqual(calls, 3, '1 intento + 2 reintentos');
  assert.deepStrictEqual(sleeps, [100, 200], 'backoff exponencial entre intentos');
});

test('E1: agotados los reintentos devuelve el último error retryable', async () => {
  const { pipeline, sleeps } = harness();
  let calls = 0;
  const result = await pipeline.execute('open-meteo', 'forecast', async () => {
    calls += 1;
    return errRetryable('open-meteo');
  });
  assert.strictEqual(calls, 3, 'no supera maxRetries+1 intentos');
  assert.strictEqual(result.status, 'error');
  assert.strictEqual((result as { retryable: boolean }).retryable, true);
  assert.strictEqual(sleeps.length, 2);
});

test('E2: un error no retryable no se reintenta', async () => {
  const { pipeline, sleeps } = harness();
  let calls = 0;
  const result = await pipeline.execute('open-meteo', 'forecast', async () => {
    calls += 1;
    return errFinal('open-meteo');
  });
  assert.strictEqual(calls, 1);
  assert.strictEqual(result.status, 'error');
  assert.deepStrictEqual(sleeps, []);
});

test('E3: un 429 abre el breaker por retryAfterMs y no se reintenta', async () => {
  const { pipeline, sleeps, breaker } = harness();
  let calls = 0;
  const result = await pipeline.execute('open-meteo', 'forecast', async () => {
    calls += 1;
    return { status: 'rate_limited', provenance: prov('open-meteo'), retryAfterMs: 30_000 };
  });
  assert.strictEqual(result.status, 'rate_limited');
  assert.strictEqual(calls, 1, 'no reintenta dentro de la ventana de cuota');
  assert.deepStrictEqual(sleeps, []);
  // El breaker se consulta con su propio reloj: el pipeline le pasó el reloj
  // falso (`now`), no `Date.now()`. La ventana abre en fakeNow+retryAfterMs y el
  // fakeClock avanza 10 ms por lectura, así que se comprueba el borde con holgura
  // de un paso, no con un instante exacto.
  assert.strictEqual(breaker.isOpen('open-meteo', T0 + 1), true, 'abre la ventana de cuota');
  assert.strictEqual(breaker.isOpen('open-meteo', T0 + 30_000), true, 'sigue abierta dentro de la ventana');
  assert.strictEqual(breaker.isOpen('open-meteo', T0 + 30_000 + 1_000), false, 'y se cierra al vencer');
  assert.strictEqual(pipeline.metricsFor('open-meteo')?.rateLimited, 1);
});

test('E4: con el circuit abierto el proveedor NO se llama y se contabiliza el corte', async () => {
  const { pipeline, breaker } = harness();
  breaker.open('open-meteo', 60_000, T0);
  let calls = 0;
  const result = await pipeline.execute('open-meteo', 'forecast', async () => {
    calls += 1;
    return ok('open-meteo');
  });
  assert.strictEqual(calls, 0, 'la llamada se suprime');
  assert.strictEqual(result.status, 'error');
  assert.strictEqual((result as { retryable: boolean }).retryable, false);
  assert.match((result as { message: string }).message, /circuit open/);
  assert.strictEqual(pipeline.metricsFor('open-meteo')?.shortCircuits, 1);
  assert.strictEqual(breaker.isOpen('open-meteo', T0 + 1), true, 'el corte es por la ventana abierta');
});

test('E5: una excepción del adapter se convierte en error retryable (no escapa)', async () => {
  const { pipeline } = harness();
  let calls = 0;
  const result = await pipeline.execute('open-meteo', 'forecast', async () => {
    calls += 1;
    throw new Error('boom');
  });
  assert.strictEqual(calls, 3, 'se trata como transitorio');
  assert.strictEqual(result.status, 'error');
  assert.match((result as { message: string }).message, /boom/);
});

test('E6: resultados terminales no se reintentan', async () => {
  const cases: Array<ProviderResult<unknown>> = [
    ok('open-meteo'),
    { status: 'no_data', provenance: prov('open-meteo'), reason: 'outside-season' },
    { status: 'not_configured', provenance: prov('open-meteo'), missingEnv: ['X'] },
    { status: 'blocked', provenance: prov('open-meteo'), reason: 'license-prohibits' },
    { status: 'stale', data: {}, provenance: prov('open-meteo') },
  ];
  for (const expected of cases) {
    const { pipeline } = harness();
    let calls = 0;
    const result = await pipeline.execute('open-meteo', 'forecast', async () => {
      calls += 1;
      return expected;
    });
    assert.strictEqual(calls, 1, `${expected.status} no debe reintentarse`);
    assert.strictEqual(result.status, expected.status);
  }
});

test('E7: las métricas acumulan intentos, éxitos, fallos y latencia por proveedor', async () => {
  const { pipeline } = harness();
  let calls = 0;
  await pipeline.execute('open-meteo', 'forecast', async () => {
    calls += 1;
    return calls === 1 ? errRetryable('open-meteo') : ok('open-meteo');
  });
  await pipeline.execute('aemet', 'forecast', async () => errFinal('aemet'));

  const om = pipeline.metricsFor('open-meteo');
  assert.ok(om);
  assert.strictEqual(om.attempts, 2);
  assert.strictEqual(om.successes, 1);
  assert.strictEqual(om.failures, 1);
  assert.strictEqual(om.shortCircuits, 0);
  assert.ok(om.totalLatencyMs >= 0);
  assert.ok(om.lastLatencyMs !== null);

  const ae = pipeline.metricsFor('aemet');
  assert.ok(ae);
  assert.strictEqual(ae.attempts, 1);
  assert.strictEqual(ae.successes, 0);

  const snap = pipeline.metricsSnapshot();
  assert.strictEqual(snap.length, 2);
  assert.deepStrictEqual(snap.map((s) => s.id).sort(), ['aemet', 'open-meteo']);
  assert.strictEqual(pipeline.metricsFor('meteofrance'), null, 'proveedor nunca usado ⇒ sin métricas');
});

test('E7: un éxito tras fallos resetea el breaker (el pipeline alimenta el circuit)', async () => {
  const { pipeline, breaker } = harness();
  let calls = 0;
  await pipeline.execute('open-meteo', 'forecast', async () => {
    calls += 1;
    return calls === 1 ? errRetryable('open-meteo') : ok('open-meteo');
  });
  // Tras un éxito el breaker vuelve a estar cerrado y admite llamadas.
  assert.strictEqual(breaker.isOpen('open-meteo'), false);
  assert.strictEqual(breaker.phase('open-meteo'), 'closed');
});
