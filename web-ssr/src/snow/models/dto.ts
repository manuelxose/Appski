import type { LicenseStatus, NoDataReason } from '../contracts/provider-contracts';
import type { OperationalStatus, SnowDepthReport, WeatherAlertItem } from '../contracts/data-type-map';
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

// ---------------------------------------------------------------------------
// Observación de nieve del maestro (filtro/orden `snowMin` y `sort=snow`)
// ---------------------------------------------------------------------------

/**
 * Nieve OBSERVADA de una estación en el directorio. `null` en vez de esta forma
 * significa "sin parte publicado": nunca 0 cm. `status: 'stale'` es un dato
 * caducado, y el cliente debe rotularlo como tal (no como actual).
 */
export interface SnowObservationDto {
  readonly baseCm: number;
  readonly observedAt: string;
  readonly updatedAt: string | null;
  readonly source: string;
  readonly status: 'live' | 'stale';
  readonly reason: NoDataReason | null;
}

export interface StationDetailDto extends StationSummary {
  /** Estado de temporada (`MM-DD` sin confirmar ⇒ `unknown`). */
  readonly season: 'open' | 'closed' | 'unknown';
  /** Nieve observada o `null` (sin parte). Ausencia ≠ 0. */
  readonly snow: SnowObservationDto | null;
}

export interface PaginationDto {
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

export interface StationListDto {
  readonly status: 'ok' | 'no_data';
  /** Motivo cuando no hay ninguna estación que cumplir el filtro. */
  readonly reason?: NoDataReason;
  readonly provenance: ProvenanceDto;
  readonly stations: readonly StationDetailDto[];
  readonly pagination: PaginationDto;
  /** Parámetros ya validados que se aplicaron (eco explícito, no inferencia). */
  readonly filters: {
    readonly country: string | null;
    readonly region: string | null;
    readonly discipline: string | null;
    readonly status: string | null;
    readonly snowMin: number | null;
    readonly sort: string;
    readonly sortDir: string;
  };
}

// ---------------------------------------------------------------------------
// Estado de fuentes (GET /v1/config, admin)
// ---------------------------------------------------------------------------

export type BreakerState = 'closed' | 'open' | 'half_open';
/** Fase del circuit tal como la expone `/v1/config` (SNOW-03). */
export type BreakerPhaseName = 'closed' | 'open' | 'half-open';
export type SourceEffect =
  | 'serves'
  | 'terminal-no-data'
  | 'not-configured'
  | 'always-blocked'
  | 'not-wired-in-v1';

export interface SourceStatusDto {
  readonly id: string;
  readonly declaredInRegistry: boolean;
  readonly configured: boolean;
  readonly missingEnv: readonly string[];
  readonly requiredEnv: readonly string[];
  readonly provides: readonly string[];
  readonly dataTypes: readonly string[];
  readonly breaker: { readonly state: BreakerState; readonly failures: number; readonly openUntil: string | null };
  readonly rateLimit: { readonly requestsPerMinute: number; readonly maxConcurrent: number; readonly verified: boolean } | null;
  readonly licenseStatus: LicenseStatus;
  readonly effect: SourceEffect;
}

export interface ConfigDto {
  readonly status: 'ok';
  readonly provenance: ProvenanceDto;
  readonly providers: readonly SourceStatusDto[];
  readonly breaker: readonly {
    readonly id: string;
    readonly open: boolean;
    readonly failures: number;
    /** Fase observable del circuit (SNOW-03): closed / open / half-open. */
    readonly phase?: BreakerPhaseName;
    /** Fin de la ventana de apertura (ISO) o null si nunca se abrió. */
    readonly openUntil?: string | null;
    /** Último éxito observado (ISO) y latencia del último intento. */
    readonly lastSuccessAt?: string | null;
    readonly lastLatencyMs?: number | null;
  }[];
  readonly rateLimits: Readonly<Record<string, { readonly requestsPerMinute: number; readonly verified: boolean }>>;
  /** Limitaciones declaradas del borde v1 (no errores). */
  readonly limitations: readonly { readonly dataType: string; readonly reason: NoDataReason; readonly detail: string }[];
  /**
   * Cobertura MEDIDA por tipo de dato y país (SNOW-03). Describe lo que hoy
   * podría servirse; no promete cobertura. No expone nombres de env ni secretos.
   */
  readonly coverage?: {
    readonly generatedAt: string;
    readonly byDataType: readonly {
      readonly dataType: string;
      readonly state: 'available' | 'degraded' | 'none';
      readonly chain: readonly string[];
      readonly serving: readonly string[];
      readonly open: readonly string[];
      readonly reason: string | null;
    }[];
    readonly byCountry: readonly { readonly country: string; readonly stations: number; readonly withSnowData: number }[];
  };
  /** Métricas de la caché de pronóstico en disco (SNOW-03). */
  readonly cache?: {
    readonly hits: number;
    readonly misses: number;
    readonly staleServed: number;
    readonly writes: number;
    readonly writeSkips: number;
    readonly lastChangedAt: string | null;
  };
}

// ---------------------------------------------------------------------------
// Alertas meteorológicas (GET /v1/stations/:slug/alerts)
// ---------------------------------------------------------------------------

/**
 * Alertas de una estación. Sin proveedor A1/A2 autorizado (AEMET/Météo-France)
 * el estado es `not_configured` o `no_data` y `alerts` queda VACÍO: nunca se
 * inventan avisos. Con dato: `ok`/`stale` y cada aviso con su procedencia y si
 * su ventana de validez sigue vigente (`expired: false` solo si `validUntil` es
 * futuro).
 */
export interface AlertsDto {
  readonly status: 'ok' | 'stale' | 'no_data' | 'not_configured' | 'blocked';
  readonly reason?: NoDataReason;
  readonly provenance: ProvenanceDto;
  readonly alerts: readonly (WeatherAlertItem & {
    readonly provenance: ProvenanceDto;
    readonly expired: boolean;
  })[];
  /**
   * DISCLAIMER LITERAL exigido por los T&C de MeteoAlarm. Se publica siempre que
   * haya avisos de MeteoAlarm: todo redistribuidor debe publicarlo. Texto PLANO
   * (Markdown resuelto), nunca HTML con corchetes.
   */
  readonly disclaimer?: string;
  /**
   * Enlace que la licencia obliga a incluir en toda redistribución. Con este
   * campo y `disclaimer`, un cliente cumple las obligaciones de los T&C usando
   * SÓLO la respuesta de la API. Cada aviso lleva además su propio `link`.
   */
  readonly sourceUrl?: string;
}
