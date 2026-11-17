import type { Authorization, ProviderId, SnowDataType } from '../contracts/provider-contracts';
import { CACHE_POLICY } from './cache-policy';
import type { ForecastCacheEntry } from '../store/repository';

/**
 * Política de caché aplicada al resultado de un proveedor (SNOW-03, Fase E).
 *
 * Separa tres preguntas que NO deben confundirse:
 *   1. ¿La licencia permite ALMACENAR? → `storageAllowed` + `licenseId !== 'blocked'`.
 *      Si no, no se escribe nada en disco (ni siquiera un cacné "temporal").
 *   2. ¿Cuánto tiempo sigue siendo válido? → `CACHE_POLICY[id].ttlMs` (0 = no cachear).
 *   3. ¿Qué se devuelve si la entrada caducó? → `stale` con su procedencia real;
 *      NUNCA se presenta como `ok`/`live`, y NUNCA se inventa un valor.
 */

export type CacheDecision =
  | { readonly kind: 'write'; readonly expiresAt: string }
  | { readonly kind: 'skip'; readonly reason: 'license-prohibits-storage' | 'no-ttl' | 'provider-not-cacheable' };

/** ¿Se puede persistir este resultado según licencia + política? */
export function decideCacheWrite(
  providerId: ProviderId,
  authorization: Authorization,
  now: Date,
): CacheDecision {
  if (!authorization.storageAllowed || authorization.licenseId === 'blocked') {
    return { kind: 'skip', reason: 'license-prohibits-storage' };
  }
  const ttlMs = CACHE_POLICY[providerId]?.ttlMs ?? 0;
  if (ttlMs <= 0) return { kind: 'skip', reason: 'no-ttl' };
  return { kind: 'write', expiresAt: new Date(now.getTime() + ttlMs).toISOString() };
}

export interface CacheReadOutcome<T> {
  /** `fresh`: dentro del TTL. `stale`: caducada (se puede servir marcándolo). */
  readonly state: 'fresh' | 'stale';
  readonly data: T;
  readonly entry: ForecastCacheEntry;
  /** Segundos transcurridos desde `observedAt` hasta `now`. */
  readonly ageSeconds: number;
}

/**
 * Lee una entrada y decide `fresh`/`stale` con el reloj inyectado.
 * `null` si no hay entrada o el payload no es JSON válido (no se "repara").
 */
export function readCacheEntry<T>(entry: ForecastCacheEntry | null, now: Date): CacheReadOutcome<T> | null {
  if (entry === null) return null;
  const expiresMs = Date.parse(entry.expiresAt);
  const observedMs = Date.parse(entry.observedAt);
  if (!Number.isFinite(expiresMs) || !Number.isFinite(observedMs)) return null;

  let data: T;
  try {
    data = JSON.parse(entry.payloadJson) as T;
  } catch {
    return null;
  }

  const ageSeconds = Math.max(0, Math.round((now.getTime() - observedMs) / 1000));
  return {
    state: now.getTime() < expiresMs ? 'fresh' : 'stale',
    data,
    entry,
    ageSeconds,
  };
}

/** Construye la entidad a persistir. `payloadJson` es el payload serializable. */
export function buildCacheEntry(input: {
  readonly stationSlug: string;
  readonly source: ProviderId;
  readonly lat: number;
  readonly lng: number;
  readonly observedAt: string;
  readonly updatedAt: string | null;
  readonly expiresAt: string;
  readonly payload: unknown;
}): ForecastCacheEntry {
  return {
    stationSlug: input.stationSlug,
    source: input.source,
    lat: input.lat,
    lng: input.lng,
    observedAt: input.observedAt,
    // La entidad guarda `updatedAt` como string (contrato del almacén). Sin
    // fecha real del proveedor se usa `observedAt`, nunca la hora actual: eso
    // fingiría una actualización que no ocurrió.
    updatedAt: input.updatedAt ?? input.observedAt,
    expiresAt: input.expiresAt,
    payloadJson: JSON.stringify(input.payload),
  };
}

/** Tipos de dato que este módulo cachea hoy (sólo pronóstico). */
export const CACHEABLE_DATA_TYPES: readonly SnowDataType[] = ['forecast'];
