/**
 * Contratos de proveedor — 05b §1, §2, §4.
 *
 * Tipos PUROS: sin `express`, sin `node:*`, sin `@angular/*`. Es lo único de
 * este módulo que puede cruzar al navegador (junto a `snow/models`).
 * Sin `enum` (TS erasable), sin dependencias.
 */

export type LicenseStatus =
  | 'allowed'
  | 'allowed-with-attribution'
  | 'restricted'
  | 'blocked'
  | 'unverified';

/** Un tipo por columna de la matriz de datos (05b §1). */
export type SnowDataType =
  | 'station-master'
  | 'operational-status'
  | 'snow-depth'
  | 'forecast'
  | 'weather-alert'
  | 'avalanche'
  | 'basemap'
  | 'image';

export type DataQuality = 'official' | 'editorial' | 'derived';

/**
 * Por qué no hay dato. Valor de dominio, NUNCA se convierte en 0 ni en -1/-99.
 */
export type NoDataReason =
  | 'outside-season'
  | 'source-silent'
  | 'not-yet-published'
  | 'not-covered'
  | 'license-prohibits';

/** Identificador estable de proveedor (05b §4.1). */
export type ProviderId =
  | 'aemet'
  | 'aemet-bpa'
  | 'meteofrance'
  | 'copernicus-c3s'
  | 'copernicus-clms'
  | 'ign-es'
  | 'ign-fr'
  | 'osm'
  | 'protomaps'
  | 'editorial-stations'
  | 'editorial-report'
  // Declarados pero SIEMPRE bloqueados (existen para que la guarda los rechace):
  | 'infonieve'
  | 'ipma'
  | 'meteoandorra'
  | 'maptiler'
  | 'stadia'
  | 'mapbox'
  | 'opentopomap'
  | 'aramon'
  | 'baqueira'
  | 'grandvalira'
  | 'fgc'
  | 'feratel'
  | 'osm-tiles'
  | 'meteofrance-bpa-html';

export interface Authorization {
  /** Referencia al registro: "05#aemet" etc. Trazabilidad doc↔código. */
  readonly registryRef: string;
  readonly licenseId: string;
  readonly commercialUse: boolean;
  readonly storageAllowed: boolean;
  readonly attributionRequired: boolean;
}

/** Tupla de procedencia OBLIGATORIA (05b §1.1). Presente incluso sin dato. */
export interface Provenance {
  readonly source: ProviderId;
  readonly observedAt: string; // ISO 8601 UTC
  readonly updatedAt: string | null;
  readonly status: 'live' | 'cached' | 'stale' | 'degraded';
  readonly licenseStatus: LicenseStatus;
  readonly freshness: number; // segundos
  readonly authorization: Authorization;
  readonly attribution: string | null;
}

/**
 * Resultado de una lectura, discriminado por `status`: el consumidor NO puede
 * leer `data` sin estrechar en 'ok' (o 'stale').
 */
export type ProviderResult<T> =
  | { readonly status: 'ok'; readonly data: T; readonly provenance: Provenance }
  | { readonly status: 'no_data'; readonly provenance: Provenance; readonly reason: NoDataReason }
  | { readonly status: 'not_configured'; readonly provenance: Provenance; readonly missingEnv: readonly string[] }
  | { readonly status: 'blocked'; readonly provenance: Provenance; readonly reason: string }
  | { readonly status: 'rate_limited'; readonly provenance: Provenance; readonly retryAfterMs: number }
  | { readonly status: 'stale'; readonly data: T; readonly provenance: Provenance }
  | { readonly status: 'error'; readonly provenance: Provenance; readonly message: string; readonly retryable: boolean };

export type StationRef = {
  readonly slug: string;
  readonly country: 'ES' | 'AD' | 'FR' | 'PT';
  readonly lat: number;
  readonly lng: number;
  readonly sourceIds?: Readonly<Partial<Record<ProviderId, string>>>;
};

export interface ProviderInput {
  readonly stationRef: StationRef;
  readonly requestedAt: Date;
  readonly dataType: SnowDataType;
}

export interface ProviderAdapter<T = unknown> {
  readonly id: ProviderId;
  readonly provides: readonly SnowDataType[];
  readonly licenseByType: Readonly<Partial<Record<SnowDataType, LicenseStatus>>>;
  /** true si es el último eslabón (editorial) y no devuelve 'not_configured'. */
  readonly isTerminal: boolean;
  canServe(input: ProviderInput): boolean;
  fetch(input: ProviderInput): Promise<ProviderResult<T>>;
  attribution(): string | null;
}

export interface ConfigStatus {
  readonly id: ProviderId;
  readonly configured: boolean;
  readonly missingEnv: readonly string[];
}

export interface RateLimit {
  readonly requestsPerMinute: number;
  readonly maxConcurrent: number;
  readonly verified: boolean;
  readonly note?: string;
}

export interface BreakerConfig {
  readonly failureThreshold: number;
  readonly openMs: number;
  readonly halfOpenProbes: number;
}
