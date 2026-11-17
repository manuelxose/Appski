import type { NoDataReason, ProviderResult, Provenance } from '../contracts/provider-contracts';
import type { ProvenanceDto } from '../models/dto';

export function toProvenanceDto(p: Provenance): ProvenanceDto {
  return {
    source: p.source,
    observedAt: p.observedAt,
    updatedAt: p.updatedAt,
    status: p.status,
    licenseStatus: p.licenseStatus,
    freshness: p.freshness,
    authorization: {
      registryRef: p.authorization.registryRef,
      licenseId: p.authorization.licenseId,
      commercialUse: p.authorization.commercialUse,
      storageAllowed: p.authorization.storageAllowed,
      attributionRequired: p.authorization.attributionRequired,
    },
    attribution: p.attribution,
  };
}

export type HttpOutcome = {
  readonly status: 200 | 400 | 404 | 500;
  readonly body: Record<string, unknown>;
};

/**
 * Mapeo `ProviderResult → HTTP` (02 §3.2). Nunca 500 por falta de credencial;
 * la ausencia es 200 con `reason`. El 500 queda solo para `error` (bug propio).
 */
export function resultToHttp<T>(r: ProviderResult<T>): HttpOutcome {
  switch (r.status) {
    case 'ok':
    case 'stale':
      return { status: 200, body: { status: r.status, data: r.data, provenance: toProvenanceDto(r.provenance) } };
    case 'no_data':
      return { status: 200, body: { status: 'no_data', reason: r.reason, provenance: toProvenanceDto(r.provenance) } };
    case 'not_configured':
      return { status: 200, body: { status: 'not_configured', reason: 'not-covered' as NoDataReason, provenance: toProvenanceDto(r.provenance) } };
    case 'blocked':
      return { status: 200, body: { status: 'blocked', reason: 'license-prohibits' as NoDataReason, provenance: toProvenanceDto(r.provenance) } };
    case 'rate_limited':
      // Estado PROPIO, no un `no_data` cualquiera: el cliente debe poder
      // distinguir «vuelve en N ms» de «no hay cobertura». Antes se aplastaba a
      // `no_data/source-silent`, que es honesto pero pierde la cuota; y el
      // orquestador podía reducirlo a `not-covered`, que era FALSO (una estación
      // mapeada tiene cobertura aunque estemos limitados). Se sirve 200 porque
      // no es un error de transporte, y `retryAfterMs` viaja para que el cliente
      // pueda reintentar en el momento correcto.
      return {
        status: 200,
        body: {
          status: 'rate_limited',
          reason: 'source-silent' as NoDataReason,
          retryAfterMs: r.retryAfterMs,
          provenance: toProvenanceDto(r.provenance),
        },
      };
    case 'error':
      return { status: 500, body: { error: 'internal' } };
  }
}
