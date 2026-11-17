import type { ProviderId, ProviderInput, ProviderResult, SnowDataType } from '../contracts/provider-contracts';
import type { ForecastBundle } from '../contracts/data-type-map';
import type { ForecastCacheRepositoryV2 } from '../store/repository-v2';
import {
  buildCacheEntry,
  decideCacheWrite,
  readCacheEntry,
  type CacheReadOutcome,
} from './forecast-cache';
import type { IngestPipeline } from '../ingest/pipeline';

/**
 * Lectura de pronóstico con caché en disco (SNOW-03, Fase E).
 *
 * Orden de decisión (sin inventar nunca un dato):
 *   1. Entrada FRESCA en disco (misma estación y mismo punto) → `ok`/`cached`,
 *      sin tocar la red ni el pipeline.
 *   2. Sin entrada fresca → se ejecuta el proveedor por el `IngestPipeline`
 *      (reintentos + breaker + métricas).
 *   3. Éxito → se persiste si la licencia lo permite y se devuelve `ok`.
 *   4. Fallo (error/rate_limited) y hay entrada CADUCADA → se devuelve `stale`
 *      con la procedencia real y su antigüedad: el usuario ve dato viejo MARCADO.
 *   5. Fallo sin caché → el propio resultado de degradación (error/rate_limited).
 *
 * La caché NUNCA se escribe si la licencia no permite almacenar
 * (`decideCacheWrite`).
 */

export interface CachedForecastDeps {
  readonly cache: ForecastCacheRepositoryV2;
  readonly pipeline: IngestPipeline;
  readonly adapter: {
    id: ProviderId;
    fetch(input: ProviderInput): Promise<ProviderResult<ForecastBundle>>;
  };
  readonly authorization: import('../contracts/provider-contracts').Authorization;
  readonly now: () => Date;
}

export interface CacheMetrics {
  /** Lecturas resueltas desde disco sin red. */
  readonly hits: number;
  /** Lecturas sin entrada fresca (se fue al proveedor o hubo caducada). */
  readonly misses: number;
  /** Respuestas servidas como `stale` tras fallo del proveedor. */
  readonly staleServed: number;
  /** Escrituras efectivas en disco. */
  readonly writes: number;
  /** Escrituras DENEGADAS por licencia (licencia sin almacenamiento). */
  readonly writeSkips: number;
  readonly lastChangedAt: string | null;
}

const emptyMetrics = (): CacheMetrics => ({
  hits: 0,
  misses: 0,
  staleServed: 0,
  writes: 0,
  writeSkips: 0,
  lastChangedAt: null,
});

export class CachedForecastService {
  private metrics = emptyMetrics();

  constructor(private readonly deps: CachedForecastDeps) {}

  /** Pronóstico con caché. `dataType` debe ser 'forecast'. */
  async read(
    dataType: SnowDataType,
    input: ProviderInput,
  ): Promise<ProviderResult<ForecastBundle>> {
    const { cache, pipeline, adapter, authorization, now } = this.deps;
    const at = now();
    const { slug, lat, lng } = input.stationRef;

    const existing = await cache.getForPoint(slug, adapter.id, lat, lng);
    const cached: CacheReadOutcome<ForecastBundle> | null = readCacheEntry<ForecastBundle>(existing, at);

    if (cached !== null && cached.state === 'fresh') {
      this.bump((m) => ({ ...m, hits: m.hits + 1 }));
      return {
        status: 'ok',
        data: cached.data,
        provenance: this.provenanceFromCache(cached, input),
      };
    }

    this.bump((m) => ({ ...m, misses: m.misses + 1 }));

    const result = await pipeline.execute(adapter.id, dataType, () => adapter.fetch(input));

    if (result.status === 'ok') {
      const data = result.data as ForecastBundle;
      const decision = decideCacheWrite(adapter.id, authorization, at);
      if (decision.kind === 'write') {
        await cache.put(
          buildCacheEntry({
            stationSlug: slug,
            source: adapter.id,
            lat,
            lng,
            observedAt: result.provenance.observedAt,
            updatedAt: result.provenance.updatedAt,
            expiresAt: decision.expiresAt,
            payload: data,
          }),
        );
        this.bump((m) => ({ ...m, writes: m.writes + 1, lastChangedAt: at.toISOString() }));
      } else {
        this.bump((m) => ({ ...m, writeSkips: m.writeSkips + 1 }));
      }
      return { status: 'ok', data, provenance: result.provenance };
    }

    // Fallo del proveedor: si hay una entrada caducada válida, se sirve MARCADA.
    if (cached !== null) {
      this.bump((m) => ({ ...m, staleServed: m.staleServed + 1 }));
      return {
        status: 'stale',
        data: cached.data,
        provenance: this.provenanceFromCache(cached, input),
      };
    }

    return result as ProviderResult<ForecastBundle>;
  }

  cacheMetrics(): CacheMetrics {
    return this.metrics;
  }

  private provenanceFromCache(
    cached: CacheReadOutcome<ForecastBundle>,
    _input: ProviderInput,
  ): ProviderResult<ForecastBundle>['provenance'] {
    const auth = this.deps.authorization;
    return {
      source: this.deps.adapter.id,
      observedAt: cached.entry.observedAt,
      updatedAt: cached.entry.updatedAt,
      status: cached.state === 'fresh' ? 'cached' : 'stale',
      licenseStatus: auth.attributionRequired ? 'allowed-with-attribution' : 'allowed',
      freshness: cached.ageSeconds,
      authorization: auth,
      attribution: null,
    };
  }

  private bump(update: (m: CacheMetrics) => CacheMetrics): void {
    this.metrics = update(this.metrics);
  }
}
