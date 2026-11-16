import type {
  Authorization,
  LicenseStatus,
  ProviderAdapter,
  ProviderId,
  ProviderInput,
  ProviderResult,
  SnowDataType,
} from '../contracts/provider-contracts';
import { requireEnv } from '../config/env';
import { attributionFor } from './authorizations';
import { makeProvenance } from './provenance';

/**
 * Adapter de proveedor automático NO cableado en v1. Degrada honestamente:
 * - sin credencial/config → `not_configured` (la cadena continúa);
 * - con credencial → `error` retryable:false (no hay integración real todavía).
 * Nunca devuelve datos inventados.
 */
export function envGatedAdapter(
  id: ProviderId,
  envNames: readonly string[],
  provides: readonly SnowDataType[],
  authorization: Authorization,
): ProviderAdapter<unknown> {
  const licenseByType: Partial<Record<SnowDataType, LicenseStatus>> = {};
  for (const t of provides) {
    licenseByType[t] = authorization.attributionRequired ? 'allowed-with-attribution' : 'allowed';
  }
  const attribution = attributionFor(id);
  return {
    id,
    provides,
    licenseByType,
    isTerminal: false,
    canServe: (input) => provides.includes(input.dataType),
    async fetch(input: ProviderInput): Promise<ProviderResult<unknown>> {
      const cfg = requireEnv(id, envNames);
      const prov = makeProvenance(
        id,
        licenseByType[input.dataType] ?? 'allowed',
        input.requestedAt.toISOString(),
        null,
        input.requestedAt,
        authorization,
        attribution,
      );
      if (!cfg.configured) {
        return { status: 'not_configured', provenance: prov, missingEnv: cfg.missingEnv };
      }
      return {
        status: 'error',
        provenance: prov,
        message: `provider '${id}' not wired in v1 (needs credential/contract action)`,
        retryable: false,
      };
    },
    attribution: () => attribution,
  };
}
