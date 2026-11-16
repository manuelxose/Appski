import type { ProviderId, RateLimit } from '../contracts/provider-contracts';

/**
 * Cuotas por proveedor (05b §4.3). Todas `verified:false` salvo Protomaps
 * (autohospedado): ningún proveedor publica una cuota legible.
 */
export const RATE_LIMITS: Readonly<Partial<Record<ProviderId, RateLimit>>> = {
  aemet: { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified: AEMET no publica tabla de cuotas; valor conservador propio' },
  'aemet-bpa': { requestsPerMinute: 6, maxConcurrent: 1, verified: false, note: 'unverified: boletín diario; PDF ~179 KB' },
  meteofrance: { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified: portal SPA, cuota no legible' },
  'copernicus-c3s': { requestsPerMinute: 20, maxConcurrent: 2, verified: false, note: 'unverified' },
  'copernicus-clms': { requestsPerMinute: 20, maxConcurrent: 2, verified: false, note: 'unverified' },
  'ign-es': { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified' },
  'ign-fr': { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified' },
  osm: { requestsPerMinute: 10, maxConcurrent: 1, verified: false, note: 'unverified: Overpass/Nominatim tienen política propia; NO se usan en runtime' },
  protomaps: { requestsPerMinute: 600, maxConcurrent: 8, verified: true, note: 'autohospedado: el límite es el del bucket propio' },
};
