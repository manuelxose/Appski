import type { ProviderId } from '../contracts/provider-contracts';
import type { ObservationRecord } from '../models/persistence';
import type { SnowReport } from '../models/snow-report';
import type { Station } from '../models/station';
import type {
  ForecastCacheEntry,
  ForecastCacheRepository,
  SnowReportRepository,
  StationRepository,
} from './repository';

/**
 * Interfaces de persistencia SNOW-02 (v2), ADITIVAS respecto a las ya existentes
 * en `store/repository.ts` (que se mantienen tal cual para no romper a sus
 * consumidores: `snow.service.ts:20-25`). Los repositorios JSON v2 implementan
 * AMBAS superficies: `StationRepositoryV2 extends StationRepository` y
 * `SnowReportRepositoryV2 extends SnowReportRepository`.
 *
 * Convenciones comunes:
 * - `id` = id INTERNO estable asignado por el almacén (string; no se reutiliza
 *   tras un borrado). El slug / la clave lógica es lo legible.
 * - Ausencia = `null` en todo método que devuelve "uno". NUNCA `0`, `''` ni -1.
 * - Escritura atómica por fichero (tmp + fsync + rename): sobrevive al reinicio.
 */

// ---------------------------------------------------------------------------
// Estaciones / regiones / ubicación (§3.1)
// ---------------------------------------------------------------------------

export interface StationQuery {
  readonly country?: 'ES' | 'AD' | 'FR' | 'PT';
  readonly region?: string;
  readonly discipline?: 'alpine' | 'nordic';
  /** Búsqueda libre sobre name/slug/region (normalizada: minúsculas + sin tildes). */
  readonly q?: string;
  readonly sort?: 'name' | 'region' | 'altitudeBaseM' | 'altitudeTopM' | 'slug';
  readonly sortDir?: 'asc' | 'desc';
  /** 1-based. */
  readonly page?: number;
  readonly pageSize?: number;
}

export interface StationPage {
  readonly items: readonly Station[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface StationRepositoryV2 extends StationRepository {
  /** Id interno estable de la estación; `null` si el slug no existe. */
  findIdBySlug(slug: string): Promise<string | null>;
  /** Maestro filtrado/ordenado/paginado (`GET /v1/stations`). */
  search(query: StationQuery): Promise<StationPage>;
  /** Regiones distintas del maestro, ordenadas (`region=` / `/v1/regions`). */
  listRegions(): Promise<readonly string[]>;
}

// ---------------------------------------------------------------------------
// Partes operativos / informes editoriales (`snow_report`, §3.1)
// ---------------------------------------------------------------------------

export interface SnowReportRepositoryV2 extends SnowReportRepository {
  /** Por id interno o por `SnowReport.id` (UUID) — lo que se pasó. */
  findById(id: string): Promise<SnowReport | null>;
}

// ---------------------------------------------------------------------------
// Pronóstico en caché con caducidad (§3.1 `forecast_cache`)
// ---------------------------------------------------------------------------

export interface ForecastCacheRepositoryV2 extends ForecastCacheRepository {
  /** `false` si `expiresAt` ya pasó o no es fecha válida (nunca "fresca"). */
  isFresh(e: ForecastCacheEntry, at: Date): boolean;
  /** Entradas vigentes en `at` para la estación. */
  listFresh(stationSlug: string, at: Date): Promise<readonly ForecastCacheEntry[]>;
}

// ---------------------------------------------------------------------------
// Observaciones, alertas, webcams autorizadas, proveedores, procedencia
// ---------------------------------------------------------------------------

export interface ObservationRepository {
  /** Observación más reciente por `observedAt`; `null` si no hay ninguna. */
  latest(stationSlug: string): Promise<ObservationRecord | null>;
  list(stationSlug: string, limit?: number): Promise<readonly ObservationRecord[]>;
  put(o: ObservationRecord): Promise<void>;
}

export type StoredAlertInput = {
  /** Id del PROVEEDOR (no se fabrica si la fuente no lo da). */
  readonly id: string;
  readonly stationSlug: string;
  readonly source: ProviderId;
  readonly level: 'green' | 'yellow' | 'orange' | 'red';
  readonly phenomenon: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly area: string;
  readonly observedAt: string;
  readonly updatedAt: string;
  /** `null` = sin caducidad declarada por la fuente. */
  readonly expiresAt: string | null;
  readonly licenseStatus: 'allowed' | 'allowed-with-attribution' | 'restricted' | 'blocked' | 'unverified';
  readonly attribution: string | null;
};

/** Alerta persistida: entrada + id INTERNO del almacén. */
export type StoredAlert = StoredAlertInput & { readonly internalId: string };

export interface AlertRepository {
  /** Alertas NO caducadas en `at` para la estación (orden por nivel desc). */
  listActive(stationSlug: string, at: Date): Promise<readonly StoredAlert[]>;
  upsert(a: StoredAlertInput): Promise<StoredAlert>;
}

export interface AuthorizedWebcam {
  readonly stationSlug: string;
  readonly operatorName: string;
  readonly linkUrl: string;
  /** Siempre `false`: la imagen está prohibida por licencia (05b §3). */
  readonly embedAllowed: false;
  readonly addedAt: string;
  readonly sourceUrl: string;
}

export interface WebcamRepository {
  listForStation(stationSlug: string): Promise<readonly AuthorizedWebcam[]>;
  add(w: AuthorizedWebcam): Promise<void>;
}

export interface ProviderState {
  readonly providerId: ProviderId;
  readonly configured: boolean;
  readonly missingEnv: readonly string[];
  readonly note: string | null;
  /** Denegación administrativa: con `true` el adapter no debe servir. */
  readonly disabled: boolean;
  readonly updatedAt: string;
}

export interface ProviderRepository {
  get(providerId: ProviderId): Promise<ProviderState | null>;
  list(): Promise<readonly ProviderState[]>;
  upsert(p: ProviderState): Promise<void>;
}

export interface ProvenanceRecord {
  readonly stationSlug: string;
  readonly dataType: string;
  readonly source: ProviderId;
  readonly observedAt: string;
  /** `null` si no hubo actualización de operador; NUNCA `observedAt` como sustituto. */
  readonly updatedAt: string | null;
  readonly status: 'live' | 'cached' | 'stale' | 'degraded';
  readonly licenseStatus: 'allowed' | 'allowed-with-attribution' | 'restricted' | 'blocked' | 'unverified';
  readonly attribution: string | null;
}

export interface ProvenanceRepository {
  get(stationSlug: string, dataType: string, source: ProviderId): Promise<ProvenanceRecord | null>;
  record(p: ProvenanceRecord): Promise<void>;
  /** Historial de la estación, más reciente primero. */
  history(stationSlug: string, limit?: number): Promise<readonly ProvenanceRecord[]>;
}

/** Bundle de almacenes para inyectar en el borde (t3/t4). */
export interface SnowStore {
  readonly stations: StationRepositoryV2;
  readonly reports: SnowReportRepositoryV2;
  readonly forecasts: ForecastCacheRepositoryV2;
  readonly observations: ObservationRepository;
  readonly alerts: AlertRepository;
  readonly webcams: WebcamRepository;
  readonly providers: ProviderRepository;
  readonly provenance: ProvenanceRepository;
}
