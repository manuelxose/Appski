import type { ProviderAdapter, ProviderInput, ProviderResult } from '../contracts/provider-contracts';
import { authorizationFor, attributionFor } from './authorizations';
import { makeProvenance } from './provenance';

/**
 * [A] OSM (ODbL): solo geometría/nombres para el extracto `osm_derived_*`.
 * En v1 no hay extracción de geometría, así que devuelve `no_data`/`not-covered`
 * y deja el maestro en manos de `editorial-stations`.
 */
export function osmAdapter(): ProviderAdapter<unknown> {
  const authorization = authorizationFor('osm');
  const attribution = attributionFor('osm');
  return {
    id: 'osm',
    provides: ['station-master'],
    licenseByType: { 'station-master': 'allowed-with-attribution' },
    isTerminal: false,
    canServe: (input) => input.dataType === 'station-master',
    async fetch(input: ProviderInput): Promise<ProviderResult<unknown>> {
      const prov = makeProvenance(
        'osm',
        'allowed-with-attribution',
        input.requestedAt.toISOString(),
        null,
        input.requestedAt,
        authorization,
        attribution,
      );
      return { status: 'no_data', provenance: prov, reason: 'not-covered' };
    },
    attribution: () => attribution,
  };
}
