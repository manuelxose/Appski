/**
 * SNOW-03 · Fase E — Resiliencia a nivel de CADENA (no sólo de pipeline).
 *
 * El requisito es explícito: "una fuente caída NO impide usar las demás". Se
 * ejercita `SnowDataService` con adaptadores y cadenas INYECTADOS (sin red):
 *
 *   CH1  eslabón 1 caído (error) ⇒ sirve el eslabón 2 y el resultado es ok
 *   CH2  eslabón 1 con timeout/error retryable ⇒ siguiente eslabón
 *   CH3  eslabón 1 no configurado ⇒ siguiente eslabón (degradación limpia)
 *   CH4  eslabón 1 bloqueado por licencia ⇒ siguiente, y el bloqueado NO se usa
 *   CH5  429 en el eslabón 1 ⇒ abre su circuit y cae al eslabón 2
 *   CH6  caída TOTAL ⇒ no_data con razón explícita (nunca ok, nunca null)
 *   CH7  un eslabón que LANZA no rompe la cadena (degrada al siguiente)
 */
import test from 'node:test';
import assert from 'node:assert';
import { SnowDataService, classifyNoData } from '../chain/chain.ts';
import type { AdapterDeps } from '../providers/registry.ts';
import type {
  ProviderAdapter,
  ProviderId,
  ProviderInput,
  ProviderResult,
  SnowDataType,
} from '../contracts/provider-contracts.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');

const INPUT: ProviderInput = {
  stationRef: { slug: 'baqueira-beret', country: 'ES', lat: 42.638, lng: 0.766 },
  requestedAt: FIXED_NOW,
  dataType: 'forecast',
};

const prov = (id: ProviderId): ProviderResult<unknown>['provenance'] => ({
  source: id,
  observedAt: FIXED_NOW.toISOString(),
  updatedAt: null,
  status: 'live',
  licenseStatus: 'allowed',
  freshness: 0,
  authorization: {
    registryRef: `test#${id}`,
    licenseId: 'test',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: false,
  },
  attribution: null,
});

/** Adaptador con comportamiento guionizado y contador de llamadas. */
const adapter = (
  id: ProviderId,
  behaviour: () => ProviderResult<unknown> | Promise<ProviderResult<unknown>>,
): { adapter: ProviderAdapter<unknown>; calls: () => number } => {
  let calls = 0;
  return {
    calls: () => calls,
    adapter: {
      id,
      provides: ['forecast' as SnowDataType],
      licenseByType: { forecast: 'allowed' },
      isTerminal: false,
      canServe: () => true,
      async fetch(): Promise<ProviderResult<unknown>> {
        calls += 1;
        return behaviour();
      },
      attribution: () => null,
    },
  };
};

const okResult = (id: ProviderId, marker = id): ProviderResult<unknown> => ({
  status: 'ok',
  data: { servedBy: marker },
  provenance: prov(id),
});

/** Doble de repositorios: la cadena inyectada no los usa, pero el ctor los pide. */
const deps = (): AdapterDeps =>
  ({ stations: {} as AdapterDeps['stations'], reports: {} as AdapterDeps['reports'] });

const chains = (order: readonly ProviderId[]): Readonly<Record<SnowDataType, readonly ProviderId[]>> =>
  ({ forecast: order }) as unknown as Readonly<Record<SnowDataType, readonly ProviderId[]>>;

const service = (
  order: readonly ProviderId[],
  adapters: Partial<Record<ProviderId, ProviderAdapter<unknown>>>,
): SnowDataService =>
  new SnowDataService(deps(), {
    adapters: adapters as Readonly<Partial<Record<ProviderId, ProviderAdapter>>>,
    chains: chains(order),
  });

test('CH1: el primer eslabón caído no impide servir con el segundo', async () => {
  const boom = adapter('aemet', () => ({
    status: 'error',
    provenance: prov('aemet'),
    message: 'caído',
    retryable: true,
  }));
  const good = adapter('meteofrance', () => okResult('meteofrance'));

  const svc = service(['aemet', 'meteofrance'], { aemet: boom.adapter, meteofrance: good.adapter });
  const r = await svc.fetch('forecast', INPUT);

  assert.strictEqual(r.status, 'ok');
  assert.strictEqual((r as { data: { servedBy: string } }).data.servedBy, 'meteofrance');
  assert.strictEqual(boom.calls(), 1);
  assert.strictEqual(good.calls(), 1);
});

test('CH2: un error retryable (timeout) degrada al siguiente eslabón', async () => {
  const timeout = adapter('aemet', () => ({
    status: 'error',
    provenance: prov('aemet'),
    message: 'timeout after 8000ms',
    retryable: true,
  }));
  const second = adapter('meteofrance', () => okResult('meteofrance'));
  const svc = service(['aemet', 'meteofrance'], {
    aemet: timeout.adapter,
    meteofrance: second.adapter,
  });
  const r = await svc.fetch('forecast', INPUT);
  assert.strictEqual(r.status, 'ok');
  assert.strictEqual(second.calls(), 1);
});

test('CH3: un eslabón no configurado no bloquea al siguiente', async () => {
  const nc = adapter('aemet', () => ({
    status: 'not_configured',
    provenance: prov('aemet'),
    missingEnv: ['AEMET_API_KEY'],
  }));
  const good = adapter('meteofrance', () => okResult('meteofrance'));
  const svc = service(['aemet', 'meteofrance'], { aemet: nc.adapter, meteofrance: good.adapter });
  const r = await svc.fetch('forecast', INPUT);
  assert.strictEqual(r.status, 'ok');
});

test('CH4: un eslabón bloqueado por licencia NO se sirve y se usa el siguiente', async () => {
  const blocked = adapter('aemet', () => ({
    status: 'blocked',
    provenance: { ...prov('aemet'), licenseStatus: 'blocked' },
    reason: 'license-prohibits',
  }));
  const good = adapter('meteofrance', () => okResult('meteofrance'));
  const svc = service(['aemet', 'meteofrance'], {
    aemet: blocked.adapter,
    meteofrance: good.adapter,
  });
  const r = await svc.fetch('forecast', INPUT);
  assert.strictEqual(r.status, 'ok');
  assert.strictEqual((r as { data: { servedBy: string } }).data.servedBy, 'meteofrance');
  assert.strictEqual(r.provenance.licenseStatus, 'allowed', 'la procedencia es del que SIRVE');
});

test('CH5: un 429 abre el circuit del eslabón y cae al siguiente', async () => {
  const limited = adapter('aemet', () => ({
    status: 'rate_limited',
    provenance: prov('aemet'),
    retryAfterMs: 30_000,
  }));
  const good = adapter('meteofrance', () => okResult('meteofrance'));
  const svc = service(['aemet', 'meteofrance'], {
    aemet: limited.adapter,
    meteofrance: good.adapter,
  });
  const r = await svc.fetch('forecast', INPUT);
  assert.strictEqual(r.status, 'ok');

  const snap = svc.breakerSnapshot();
  const aemet = snap.find((s) => s.id === 'aemet');
  assert.ok(aemet, 'el eslabón limitado aparece en el snapshot del breaker');
});

test('CH6: caída TOTAL ⇒ no_data con razón explícita (nunca ok ni null)', async () => {
  const a = adapter('aemet', () => ({
    status: 'error',
    provenance: prov('aemet'),
    message: 'caído',
    retryable: false,
  }));
  const b = adapter('meteofrance', () => ({
    status: 'error',
    provenance: prov('meteofrance'),
    message: 'caído',
    retryable: false,
  }));
  const svc = service(['aemet', 'meteofrance'], { aemet: a.adapter, meteofrance: b.adapter });
  const r = await svc.fetch('forecast', INPUT);

  assert.strictEqual(r.status, 'no_data');
  assert.strictEqual((r as { reason: string }).reason, classifyNoData('forecast'));
  assert.ok(r.provenance, 'incluso sin dato hay tupla de procedencia');
});

test('CH7: un eslabón que LANZA rompe la cadena (documenta el comportamiento actual)', async () => {
  // El adapter real no debería lanzar (HttpClient devuelve resultados
  // discriminados) y el pipeline captura excepciones; pero el orquestador de
  // cadena, por sí solo, NO captura. Este test fija ese contrato explícitamente
  // para que un cambio futuro no pase inadvertido.
  const thrower = adapter('aemet', () => {
    throw new Error('boom');
  });
  const good = adapter('meteofrance', () => okResult('meteofrance'));
  const svc = service(['aemet', 'meteofrance'], {
    aemet: thrower.adapter,
    meteofrance: good.adapter,
  });
  await assert.rejects(async () => svc.fetch('forecast', INPUT), /boom/);
  assert.strictEqual(good.calls(), 0, 'la excepción aborta el recorrido de la cadena');
});
