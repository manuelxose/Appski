import type { ProviderId } from '../contracts/provider-contracts';

/**
 * Caché y retención por proveedor (05b §4.2). `ttlMs: 0` = NO cachear.
 */
export interface CachePolicyEntry {
  readonly ttlMs: number;
  readonly persistHistory: boolean;
  readonly mustStoreUpdatedAt?: boolean;
  readonly noImpliedEndorsement?: boolean;
  readonly deepLinkOnly?: boolean;
  readonly shareAlike?: boolean;
  readonly maxRevalidateMs?: number;
}

export const CACHE_POLICY: Readonly<Partial<Record<ProviderId, CachePolicyEntry>>> = {
  aemet: {
    ttlMs: 30 * 60_000,
    maxRevalidateMs: 3 * 3_600_000,
    persistHistory: true,
    mustStoreUpdatedAt: true,
  },
  'aemet-bpa': {
    ttlMs: 6 * 3_600_000,
    persistHistory: true,
    mustStoreUpdatedAt: true,
  },
  meteofrance: {
    ttlMs: 60 * 60_000,
    persistHistory: true,
    mustStoreUpdatedAt: true,
    noImpliedEndorsement: true,
  },
  'meteofrance-bpa-html': {
    ttlMs: 0,
    persistHistory: false,
    deepLinkOnly: true,
  },
  meteoandorra: {
    ttlMs: 0,
    persistHistory: false,
  },
  ipma: {
    ttlMs: 0,
    persistHistory: false,
  },
  osm: {
    ttlMs: 90 * 86_400_000,
    persistHistory: true,
    shareAlike: true,
  },
  protomaps: {
    ttlMs: 0, // immutable por digest de versión, no TTL temporal
    persistHistory: true,
    shareAlike: true,
  },
  'ign-es': { ttlMs: 0, persistHistory: true },
  'ign-fr': { ttlMs: 0, persistHistory: true },
  'copernicus-clms': { ttlMs: 0, persistHistory: true },
  'osm-tiles': { ttlMs: 0, persistHistory: false },
  'editorial-report': { ttlMs: 0, persistHistory: true },
  'editorial-stations': { ttlMs: 0, persistHistory: true },
};
