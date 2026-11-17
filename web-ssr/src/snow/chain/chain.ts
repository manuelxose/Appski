import type { ProviderId, ProviderResult, Provenance, SnowDataType } from '../contracts/provider-contracts';
import type { DataTypeMap } from '../contracts/data-type-map';
import type { NoDataReason } from '../contracts/provider-contracts';
import type { ProviderAdapter, ProviderInput } from '../contracts/provider-contracts';
import { createAdapters, type AdapterDeps } from '../providers/registry';
import { Breaker } from '../cache/breaker';
import { FALLBACK_CHAINS } from './fallback-chains';

export function classifyNoData(dataType: SnowDataType): NoDataReason {
  if (dataType === 'operational-status' || dataType === 'snow-depth') return 'outside-season';
  if (dataType === 'image') return 'license-prohibits';
  if (dataType === 'avalanche') return 'not-yet-published';
  return 'not-covered';
}

/**
 * Orquestador de la cadena de fallback (05b §3.1). Devuelve SIEMPRE un
 * `ProviderResult`; nunca `null`/`undefined`. El único `as unknown as` es el
 * borde tipado entre `ProviderAdapter<unknown>` y `DataTypeMap[T]`.
 */
export class SnowDataService {
  private readonly adapters: Readonly<Partial<Record<ProviderId, ProviderAdapter>>>;
  private readonly breaker = new Breaker();
  private readonly chains: Readonly<Record<SnowDataType, readonly ProviderId[]>>;

  /**
   * `overrides` permite inyectar adaptadores y cadenas en tests (Fase E) sin
   * tocar la red ni el registry real. En producción no se pasa.
   */
  constructor(deps: AdapterDeps, overrides?: {
    readonly adapters?: Readonly<Partial<Record<ProviderId, ProviderAdapter>>>;
    readonly chains?: Readonly<Record<SnowDataType, readonly ProviderId[]>>;
  }) {
    this.adapters = overrides?.adapters ?? createAdapters(deps);
    this.chains = overrides?.chains ?? FALLBACK_CHAINS;
  }

  async fetch<T extends SnowDataType>(dataType: T, input: ProviderInput): Promise<ProviderResult<DataTypeMap[T]>> {
    const chain = this.chains[dataType];
    let lastProvenance: Provenance | null = null;
    for (const id of chain) {
      const adapter = this.adapters[id];
      if (!adapter) continue;
      const r = await adapter.fetch(input);
      lastProvenance = r.provenance;
      if (r.status === 'ok' || r.status === 'stale') {
        return r as unknown as ProviderResult<DataTypeMap[T]>;
      }
      if (r.status === 'not_configured' || r.status === 'blocked') continue;
      if (r.status === 'rate_limited') {
        this.breaker.open(id, r.retryAfterMs);
        continue;
      }
      if (r.status === 'error') {
        if (r.retryable) this.breaker.recordFailure(id);
        continue;
      }
    }
    const fallbackProv = lastProvenance ?? this.emptyProvenance(input);
    if (dataType === 'image') {
      return {
        status: 'blocked',
        provenance: fallbackProv,
        reason: 'license-prohibits',
      } as unknown as ProviderResult<DataTypeMap[T]>;
    }
    return {
      status: 'no_data',
      provenance: fallbackProv,
      reason: classifyNoData(dataType),
    } as unknown as ProviderResult<DataTypeMap[T]>;
  }

  breakerSnapshot(): ReturnType<Breaker['snapshot']> {
    return this.breaker.snapshot();
  }

  private emptyProvenance(input: ProviderInput): Provenance {
    return {
      source: 'editorial-report',
      observedAt: input.requestedAt.toISOString(),
      updatedAt: null,
      status: 'degraded',
      licenseStatus: 'allowed',
      freshness: 0,
      authorization: {
        registryRef: '05#editorial',
        licenseId: 'editorial-own',
        commercialUse: true,
        storageAllowed: true,
        attributionRequired: false,
      },
      attribution: null,
    };
  }
}
