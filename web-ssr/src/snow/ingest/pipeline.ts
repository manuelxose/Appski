import type { ProviderId, ProviderResult, SnowDataType } from '../contracts/provider-contracts';
import { Breaker } from '../cache/breaker';

/**
 * Pipeline de ingesta resistente a fallos (SNOW-03, Fase E).
 *
 * Envuelve UNA ejecución de proveedor con:
 *   1. consulta al circuit breaker ANTES de tocar la red;
 *   2. reintentos acotados con backoff exponencial para fallos RETRYABLES;
 *   3. respeto de `retryAfterMs` (cuota) — nunca reintenta antes;
 *   4. métricas por proveedor (intentos, éxitos, fallos, cortes, latencia).
 *
 * Garantías:
 * - El resultado es SIEMPRE un `ProviderResult`; ningún error escapa.
 * - Un proveedor con el circuit abierto NO se llama: se devuelve `error` no
 *   retryable indicando el corte (degradación honesta, sin datos inventados).
 * - Reloj y espera son inyectables → determinismo en tests (sin sleeps reales).
 */

export interface IngestPolicy {
  /** Reintentos ADICIONALES tras el primer intento (0 = un solo intento). */
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

export const DEFAULT_INGEST_POLICY: IngestPolicy = {
  maxRetries: 2,
  baseDelayMs: 250,
  maxDelayMs: 4_000,
};

export interface ProviderMetrics {
  readonly attempts: number;
  readonly successes: number;
  readonly failures: number;
  /** Veces que el breaker impidió la llamada. */
  readonly shortCircuits: number;
  readonly rateLimited: number;
  /** Latencia acumulada de los intentos que sí llamaron al proveedor. */
  readonly totalLatencyMs: number;
  readonly lastLatencyMs: number | null;
  /** ISO del último resultado `ok`/`stale` observado (antigüedad en /v1/config). */
  readonly lastSuccessAt: string | null;
}

export interface IngestDeps {
  readonly breaker: Breaker;
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
  readonly policy?: Partial<IngestPolicy>;
  readonly onAttempt?: (event: IngestAttemptEvent) => void;
}

export interface IngestAttemptEvent {
  readonly providerId: ProviderId;
  readonly dataType: SnowDataType;
  readonly attempt: number;
  readonly status: ProviderResult<unknown>['status'];
  readonly latencyMs: number;
}

const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Backoff exponencial con techo, determinista (sin jitter: reproducible). */
export function backoffDelay(attempt: number, policy: IngestPolicy): number {
  const raw = policy.baseDelayMs * 2 ** Math.max(0, attempt - 1);
  return Math.min(raw, policy.maxDelayMs);
}

/** Clasifica si un resultado merece otro intento. */
export function isRetryable(result: ProviderResult<unknown>): boolean {
  return result.status === 'error' && result.retryable;
}

export class IngestPipeline {
  private readonly breaker: Breaker;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly policy: IngestPolicy;
  private readonly onAttempt?: (event: IngestAttemptEvent) => void;
  private readonly metrics = new Map<ProviderId, ProviderMetrics>();

  constructor(deps: IngestDeps) {
    this.breaker = deps.breaker;
    this.now = deps.now ?? Date.now;
    this.sleep = deps.sleep ?? realSleep;
    this.policy = { ...DEFAULT_INGEST_POLICY, ...deps.policy };
    this.onAttempt = deps.onAttempt;
  }

  /** Ejecuta una llamada con reintentos y breaker. Nunca lanza. */
  async execute(
    providerId: ProviderId,
    dataType: SnowDataType,
    call: () => Promise<ProviderResult<unknown>>,
  ): Promise<ProviderResult<unknown>> {
    const maxAttempts = this.policy.maxRetries + 1;
    let last: ProviderResult<unknown> | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (!this.breaker.allow(providerId, this.now())) {
        this.bump(providerId, (m) => ({ ...m, shortCircuits: m.shortCircuits + 1 }));
        const blocked = last;
        return {
          status: 'error',
          provenance: blocked?.provenance ?? this.unavailableProvenance(providerId, dataType),
          message: `circuit open for '${providerId}'; call suppressed`,
          retryable: false,
        };
      }

      const startedAt = this.now();
      let result: ProviderResult<unknown>;
      try {
        result = await call();
      } catch (error) {
        // Un adapter que lanza se trata como fallo retryable: el pipeline no propaga.
        result = {
          status: 'error',
          provenance: this.unavailableProvenance(providerId, dataType),
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
        };
      }
      const latencyMs = Math.max(0, this.now() - startedAt);

      this.recordOutcome(providerId, result, latencyMs);
      this.onAttempt?.({ providerId, dataType, attempt, status: result.status, latencyMs });
      last = result;

      if (result.status === 'ok' || result.status === 'stale' || result.status === 'no_data' ||
          result.status === 'not_configured' || result.status === 'blocked') {
        return result;
      }

      if (result.status === 'rate_limited') {
        this.breaker.open(providerId, result.retryAfterMs, this.now());
        return result; // no se reintenta antes de la ventana de cuota
      }

      if (!isRetryable(result) || attempt === maxAttempts) {
        return result;
      }

      await this.sleep(backoffDelay(attempt, this.policy));
    }

    return last ?? {
      status: 'error',
      provenance: this.unavailableProvenance(providerId, dataType),
      message: `no attempt executed for '${providerId}'`,
      retryable: false,
    };
  }

  metricsFor(providerId: ProviderId): ProviderMetrics | null {
    return this.metrics.get(providerId) ?? null;
  }

  metricsSnapshot(): ReadonlyArray<{ id: ProviderId } & ProviderMetrics> {
    return [...this.metrics.entries()].map(([id, m]) => ({ id, ...m }));
  }

  private recordOutcome(providerId: ProviderId, result: ProviderResult<unknown>, latencyMs: number): void {
    const succeeded = result.status === 'ok' || result.status === 'stale';
    this.bump(providerId, (m) => ({
      ...m,
      attempts: m.attempts + 1,
      successes: m.successes + (succeeded ? 1 : 0),
      failures: m.failures + (result.status === 'error' ? 1 : 0),
      rateLimited: m.rateLimited + (result.status === 'rate_limited' ? 1 : 0),
      totalLatencyMs: m.totalLatencyMs + latencyMs,
      lastLatencyMs: latencyMs,
      lastSuccessAt: succeeded ? new Date(this.now()).toISOString() : m.lastSuccessAt,
    }));

    if (succeeded) {
      this.breaker.recordSuccess(providerId);
    } else if (result.status === 'error' && result.retryable) {
      this.breaker.recordFailure(providerId, this.now());
    }
  }

  private bump(providerId: ProviderId, update: (m: ProviderMetrics) => ProviderMetrics): void {
    const current = this.metrics.get(providerId) ?? {
      attempts: 0,
      successes: 0,
      failures: 0,
      shortCircuits: 0,
      rateLimited: 0,
      totalLatencyMs: 0,
      lastLatencyMs: null,
      lastSuccessAt: null,
    };
    this.metrics.set(providerId, update(current));
  }

  private unavailableProvenance(providerId: ProviderId, _dataType: SnowDataType): ProviderResult<unknown>['provenance'] {
    const at = new Date(this.now()).toISOString();
    return {
      source: providerId,
      observedAt: at,
      updatedAt: null,
      status: 'degraded',
      licenseStatus: 'unverified',
      freshness: 0,
      authorization: {
        registryRef: `06#${providerId}`,
        licenseId: 'unverified',
        commercialUse: false,
        storageAllowed: false,
        attributionRequired: false,
      },
      attribution: null,
    };
  }
}
