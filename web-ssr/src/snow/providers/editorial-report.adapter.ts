import type { OperationalStatus, SnowDepthReport } from '../contracts/data-type-map';
import type {
  LicenseStatus,
  ProviderAdapter,
  ProviderInput,
  ProviderResult,
  SnowDataType,
} from '../contracts/provider-contracts';
import type { SnowReportRepository } from '../store/repository';
import { authorizationFor, attributionFor } from './authorizations';
import { makeProvenance } from './provenance';

/**
 * [E] parte editorial. Única fuente legal de `operational-status` y `snow-depth`
 * (05b §3). `isTerminal: true`: termina la cadena con un motivo, nunca null.
 */
export class EditorialReportAdapter implements ProviderAdapter<OperationalStatus | SnowDepthReport> {
  readonly id = 'editorial-report' as const;
  readonly provides = ['operational-status', 'snow-depth'] as const;
  readonly licenseByType: Readonly<Partial<Record<SnowDataType, LicenseStatus>>> = {
    'operational-status': 'allowed',
    'snow-depth': 'allowed',
  };
  readonly isTerminal = true;

  constructor(private readonly reports: SnowReportRepository) {}

  canServe(input: ProviderInput): boolean {
    return input.dataType === 'operational-status' || input.dataType === 'snow-depth';
  }

  async fetch(input: ProviderInput): Promise<ProviderResult<OperationalStatus | SnowDepthReport>> {
    const report = await this.reports.latestPublishedForStation(input.stationRef.slug, input.requestedAt);
    const observedAt = report?.capturedAt ?? input.requestedAt.toISOString();
    const prov = makeProvenance(
      this.id,
      'allowed',
      observedAt,
      report?.capturedAt ?? null,
      input.requestedAt,
      authorizationFor(this.id),
      null,
    );
    if (!report) {
      return { status: 'no_data', provenance: prov, reason: 'outside-season' };
    }
    if (input.dataType === 'operational-status') {
      if (!report.operational) {
        return { status: 'no_data', provenance: prov, reason: 'source-silent' };
      }
      return { status: 'ok', data: report.operational, provenance: prov };
    }
    // snow-depth
    if (!report.snow) {
      return { status: 'no_data', provenance: prov, reason: 'source-silent' };
    }
    return { status: 'ok', data: report.snow, provenance: prov };
  }

  attribution(): string | null {
    return attributionFor(this.id);
  }
}
