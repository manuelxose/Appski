import type { StationMaster } from '../contracts/data-type-map';
import type {
  LicenseStatus,
  ProviderAdapter,
  ProviderInput,
  ProviderResult,
  SnowDataType,
} from '../contracts/provider-contracts';
import type { StationRepository } from '../store/repository';
import { authorizationFor, attributionFor } from './authorizations';
import { makeProvenance } from './provenance';

/** [E] maestro de estaciones. `isTerminal: true` (no devuelve not_configured). */
export class EditorialStationsAdapter implements ProviderAdapter<StationMaster> {
  readonly id = 'editorial-stations' as const;
  readonly provides = ['station-master'] as const;
  readonly licenseByType: Readonly<Partial<Record<SnowDataType, LicenseStatus>>> = {
    'station-master': 'allowed',
  };
  readonly isTerminal = true;

  constructor(private readonly stations: StationRepository) {}

  canServe(input: ProviderInput): boolean {
    return input.dataType === 'station-master';
  }

  async fetch(input: ProviderInput): Promise<ProviderResult<StationMaster>> {
    const s = await this.stations.findBySlug(input.stationRef.slug);
    const prov = makeProvenance(
      this.id,
      'allowed',
      input.requestedAt.toISOString(),
      input.requestedAt.toISOString(),
      input.requestedAt,
      authorizationFor(this.id),
      null,
    );
    if (!s) {
      return { status: 'no_data', provenance: prov, reason: 'not-covered' };
    }
    return {
      status: 'ok',
      data: {
        slug: s.slug,
        name: s.name,
        country: s.country,
        region: s.region,
        lat: s.lat,
        lng: s.lng,
        altitudeBaseM: s.altitudeBaseM,
        altitudeTopM: s.altitudeTopM,
        website: s.website,
      },
      provenance: prov,
    };
  }

  attribution(): string | null {
    return attributionFor(this.id);
  }
}
