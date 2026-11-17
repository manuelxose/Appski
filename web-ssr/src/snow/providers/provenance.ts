import type { Authorization, LicenseStatus, Provenance, ProviderId } from '../contracts/provider-contracts';

/** Construye la tupla de procedencia (05b §1.1). Siempre presente. */
export function makeProvenance(
  source: ProviderId,
  licenseStatus: LicenseStatus,
  observedAt: string,
  updatedAt: string | null,
  requestedAt: Date,
  authorization: Authorization,
  attribution: string | null,
  status: 'live' | 'cached' | 'stale' | 'degraded' = 'live',
): Provenance {
  const observedMs = Date.parse(observedAt);
  const freshness = Number.isFinite(observedMs)
    ? Math.max(0, Math.round((requestedAt.getTime() - observedMs) / 1000))
    : 0;
  return {
    source,
    observedAt,
    updatedAt,
    status,
    licenseStatus,
    freshness,
    authorization,
    attribution,
  };
}
