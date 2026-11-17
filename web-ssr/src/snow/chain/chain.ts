import type { ProviderId, ProviderResult, Provenance, SnowDataType } from '../contracts/provider-contracts';
import type { DataTypeMap } from '../contracts/data-type-map';
import type { NoDataReason } from '../contracts/provider-contracts';
import type { ProviderAdapter, ProviderInput } from '../contracts/provider-contracts';
import { createAdapters, type AdapterDeps } from '../providers/registry';
import { Breaker } from '../cache/breaker';
import { FALLBACK_CHAINS, NOT_A_FORECAST_PROVIDER } from './fallback-chains';

export function classifyNoData(dataType: SnowDataType): NoDataReason {
  if (dataType === 'operational-status' || dataType === 'snow-depth') return 'outside-season';
  if (dataType === 'image') return 'license-prohibits';
  if (dataType === 'avalanche') return 'not-yet-published';
  return 'not-covered';
}

/**
 * ¿Puede este proveedor representar `dataType` en la procedencia de la
 * respuesta? Devuelve el motivo de rechazo o `null` si es apto.
 *
 * Añadido en SNOW-03b tras un defecto GRAVE real: `copernicus-c3s` (reanálisis
 * histórico) estaba al final de la cadena de `forecast`, y cuando AEMET no
 * servía el bucle llegaba a C3S y `/forecast` publicaba
 * `source: 'copernicus-c3s'` con su atribución y **0 puntos**. La procedencia es
 * una AFIRMACIÓN sobre quién produjo el dato: si el proveedor no puede producir
 * ese tipo de dato, su nombre no puede aparecer en la respuesta.
 */
export function nonForecastProviderReason(id: ProviderId, dataType: SnowDataType): string | null {
  if (dataType !== 'forecast') return null;
  return NOT_A_FORECAST_PROVIDER[id] ?? null;
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
    let blockedProvider: { id: ProviderId; reason: string } | null = null;
    /** El primer proveedor que dijo «espera» (cuota), con su ventana. */
    let rateLimited: { provenance: Provenance; retryAfterMs: number } | null = null;

    for (const id of chain) {
      // GUARDA: un proveedor incapaz de producir este tipo de dato no entra en
      // la cadena. Si lo hiciera, su nombre acabaría en la procedencia y la
      // respuesta afirmaría una fuente que no produjo el dato (defecto grave de
      // SNOW-03b: /forecast atribuido a Copernicus C3S con 0 puntos).
      const refusal = nonForecastProviderReason(id, dataType);
      if (refusal !== null) {
        blockedProvider = { id, reason: refusal };
        continue;
      }

      const adapter = this.adapters[id];
      if (!adapter) continue;
      const r = await adapter.fetch(input);
      if (r.status === 'not_configured' || r.status === 'blocked') continue;
      if (r.status === 'rate_limited') {
        // La cuota es una condición EXTERNA y transitiva: no es «esta estación
        // no existe» ni «no tiene cobertura». Se recuerda para propagarla tal
        // cual si ninguna otra fuente sirve, en vez de colapsarla en un
        // `no_data/not-covered` que mentiría sobre el motivo (defecto de la 3ª
        // verificación real: Formigal decía «sin cobertura» teniendo 22204).
        rateLimited = rateLimited ?? { provenance: r.provenance, retryAfterMs: r.retryAfterMs };
        this.breaker.open(id, r.retryAfterMs);
        continue;
      }
      if (r.status === 'error') {
        lastProvenance = r.provenance;
        if (r.retryable) this.breaker.recordFailure(id);
        continue;
      }
      if (r.status === 'ok' || r.status === 'stale') {
        // Un `ok` con cero puntos no es un pronóstico: se trata como «sin dato»
        // para no devolver `live` con un bundle vacío (y su procedencia).
        const isEmptyBundle =
          dataType === 'forecast' &&
          Array.isArray((r.data as { points?: unknown }).points) &&
          (r.data as { points: unknown[] }).points.length === 0;
        if (isEmptyBundle) {
          lastProvenance = r.provenance;
          continue;
        }
        return r as unknown as ProviderResult<DataTypeMap[T]>;
      }
      // `no_data`: no aporta dato; su procedencia no debe presentarse como la
      // fuente final si otro proveedor sí se degraba con un motivo más preciso.
      lastProvenance = lastProvenance ?? r.provenance;
    }

    // Cuota agotada y ninguna fuente sirvió: se propaga el estado REAL. Va antes
    // que el resto de degradaciones porque «vuelve más tarde» es más cierto y
    // más útil que «no hay cobertura».
    if (rateLimited !== null) {
      return {
        status: 'rate_limited',
        provenance: rateLimited.provenance,
        retryAfterMs: rateLimited.retryAfterMs,
      } as unknown as ProviderResult<DataTypeMap[T]>;
    }

    const fallbackProv = lastProvenance ?? this.emptyProvenance(input);
    if (dataType === 'image') {
      return {
        status: 'blocked',
        provenance: fallbackProv,
        reason: 'license-prohibits',
      } as unknown as ProviderResult<DataTypeMap[T]>;
    }
    // Si el único rechazo fue de aptitud del proveedor, se deja constancia en el
    // resultado en vez de servir su procedencia como si hubiera sido la fuente.
    if (blockedProvider !== null) {
      return {
        status: 'no_data',
        provenance: this.emptyProvenance(input),
        reason: classifyNoData(dataType),
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
