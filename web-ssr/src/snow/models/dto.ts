import type { LicenseStatus, NoDataReason } from '../contracts/provider-contracts';
import type { OperationalStatus, SnowDepthReport } from '../contracts/data-type-map';
import type { StationSummary } from './station';

/** DTO del borde: lo único que cruza al navegador (02 §3.2). */
export interface ProvenanceDto {
  readonly source: string;
  readonly observedAt: string;
  readonly updatedAt: string | null;
  readonly status: 'live' | 'cached' | 'stale' | 'degraded';
  readonly licenseStatus: LicenseStatus;
  readonly freshness: number;
  readonly authorization: {
    readonly registryRef: string;
    readonly licenseId: string;
    readonly commercialUse: boolean;
    readonly storageAllowed: boolean;
    readonly attributionRequired: boolean;
  };
  readonly attribution: string | null;
}

export interface ReportPayload {
  readonly operational: OperationalStatus | null;
  readonly snow: SnowDepthReport | null;
  /** Nunca 0 como "sin dato": ausencia = null + reason. */
  readonly noDataFields: readonly (keyof ReportPayload)[];
}

/**
 * Procedencia editorial del parte (05b §7.3): el lector debe poder ver que es
 * "reportado por un operador, desde una URL, a una hora". Presente SOLO cuando
 * el dato viene de `editorial-report`; ausente (propiedad omitida) en el resto.
 */
export interface EditorialSourceDto {
  readonly sourceUrl: string;
  readonly author: string;
  readonly capturedAt: string;
  readonly confidence: number;
}

export interface SnowReportDto {
  readonly station: StationSummary;
  readonly report: ReportPayload;
  readonly provenance: ProvenanceDto;
  readonly status: 'ok' | 'stale' | 'no_data' | 'not_configured' | 'blocked';
  readonly reason?: NoDataReason;
  /** Editorial (05b §7.3): presentes SOLO si provenance.source === 'editorial-report'. */
  readonly sourceUrl?: string;
  readonly author?: string;
  readonly capturedAt?: string;
  readonly confidence?: number;
}
