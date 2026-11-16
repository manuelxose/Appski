import type { ProviderAdapter, ProviderId, ProviderInput, ProviderResult } from '../contracts/provider-contracts';
import { authorizationFor } from './authorizations';
import { makeProvenance } from './provenance';

/**
 * Proveedores SIEMPRE bloqueados (05 §2 / 05b §4.1): existen en el union para que
 * la guarda los rechace. Ninguno tiene adapter funcional.
 */
export const BLOCKED_PROVIDER_IDS: readonly ProviderId[] = [
  'infonieve',
  'ipma',
  'meteoandorra',
  'maptiler',
  'stadia',
  'mapbox',
  'opentopomap',
  'aramon',
  'baqueira',
  'grandvalira',
  'fgc',
  'feratel',
  'osm-tiles',
  'meteofrance-bpa-html',
];

export function isBlockedProvider(id: ProviderId): boolean {
  return (BLOCKED_PROVIDER_IDS as readonly string[]).includes(id);
}

/** Adapter bloqueado: devuelve `blocked` SIN tocar la red (05b §2.1(2)). */
export function blockedAdapter(id: ProviderId): ProviderAdapter<never> {
  return {
    id,
    provides: [],
    licenseByType: {},
    isTerminal: false,
    canServe: () => false,
    async fetch(input: ProviderInput): Promise<ProviderResult<never>> {
      return {
        status: 'blocked',
        provenance: makeProvenance(
          id,
          'blocked',
          input.requestedAt.toISOString(),
          null,
          input.requestedAt,
          authorizationFor(id),
          null,
        ),
        reason: 'license-prohibits',
      };
    },
    attribution: () => null,
  };
}
