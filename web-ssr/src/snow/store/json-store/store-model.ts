import type { Authorization } from '../../contracts/provider-contracts';

/**
 * Almacén JSON v2 (SNOW-02 §3.2). Formato en DISCO de cada colección:
 *
 * ```json
 * {
 *   "schemaVersion": 2,
 *   "store": "snow",
 *   "collection": "snow-reports",
 *   "updatedAt": "2026-11-16T12:00:00.000Z",
 *   "seq": 3,
 *   "records": [ { "id": "3", "record": { ...dominio... } } ]
 * }
 * ```
 *
 * Reglas del formato (no negociables):
 * - `schemaVersion: 1` (formato histórico, `records` = array de dominios sin id)
 *   se migra a v2 SIN pérdida y SIN inventar: cada registro recibe un id interno
 *   nuevo (`seq`++) y su contenido viaja tal cual dentro de `record`. Si un
 *   registro v1 ya traía un `id` (p. ej. `SnowReport.id` = UUID) se CONSERVA.
 * - Los ids internos son `"1"`, `"2"`, … estables: una migración o un reinicio no
 *   los renumera; `seq` es el último número entregado y nunca retrocede.
 * - Una colección v2 sin `seq` recupera `seq = max(id numérico)`; un `id` opaco
 *   heredado cuenta como 0 (no se reutiliza ningún número ya visto).
 * - `updatedAt` sólo cambia al escribir. Un fichero v1 migrado NO se reescribe en
 *   la lectura: la migración en disco es explícita (`migrateStoreDir`).
 * - Se admiten colecciones donde la ENTIDAD es la tupla entera
 *   (p. ej. `forecast-cache.json`: `stationSlug` + `source`).
 */
export const STORE_SCHEMA_VERSION = 2 as const;

export type StoreSchemaVersion = typeof STORE_SCHEMA_VERSION | 1;

export interface StoreRecord {
  /** Id interno estable (string numérico o id opaco heredado, p. ej. UUID). */
  readonly id: string;
  /** Entidad de dominio tal cual; el almacén no la reinterpreta. */
  readonly record: Readonly<Record<string, unknown>>;
}

export interface StoreFileV2 {
  readonly schemaVersion: typeof STORE_SCHEMA_VERSION;
  readonly store: 'snow';
  readonly collection: string;
  readonly updatedAt: string;
  readonly seq: number;
  readonly records: readonly StoreRecord[];
}

/** Formato histórico: `records` es el array de entidades SIN envoltorio. */
export interface StoreFileV1 {
  readonly schemaVersion: 1;
  readonly updatedAt?: string;
  readonly records: readonly unknown[];
}

export interface StoreMigrationResult {
  readonly from: StoreSchemaVersion;
  readonly to: typeof STORE_SCHEMA_VERSION;
  readonly migrated: boolean;
  readonly recordsIn: number;
  readonly recordsOut: number;
}

export interface MigrationOutcome extends StoreMigrationResult {
  readonly collection: string;
  readonly path: string;
}

// ---------------------------------------------------------------------------
// Entidades de persistencia propia (no derivadas del dominio ya existente)
// ---------------------------------------------------------------------------

/** Webcam AUTORIZADA: sólo permiso de enlace saliente; nunca embed (05b §3). */
export interface AuthorizedWebcam {
  readonly stationSlug: string;
  readonly operatorName: string;
  readonly linkUrl: string;
  readonly embedAllowed: false;
  readonly licenseStatus: 'allowed-with-attribution' | 'restricted';
  readonly attribution: string;
  readonly addedAt: string;
  readonly sourceUrl: string;
}

/** Alerta meteorológica PERSISTIDA (ingesta de proveedor con procedencia). */
export interface StoredWeatherAlert {
  readonly stationSlug: string;
  readonly source: string;
  readonly level: 'green' | 'yellow' | 'orange' | 'red';
  readonly phenomenon: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly area: string;
  readonly observedAt: string;
  readonly updatedAt: string;
  /** null = declarada sin caducidad; nunca se interpreta como "vigente siempre". */
  readonly expiresAt: string | null;
}

/** Procedencia PERSISTIDA de un dato de proveedor (sin la autorización, que es estática). */
export interface StoredProvenance {
  readonly stationSlug: string;
  readonly dataType: string;
  readonly source: string;
  readonly observedAt: string;
  readonly updatedAt: string | null;
  readonly status: 'live' | 'cached' | 'stale' | 'degraded';
  readonly licenseStatus: 'allowed' | 'allowed-with-attribution' | 'restricted' | 'blocked' | 'unverified';
  readonly authorization: Authorization;
  readonly attribution: string | null;
}

/** Entrada del registro de proveedores, ADOSADA a la tabla estática `authorizations.ts`. */
export interface StoredProvider {
  readonly providerId: string;
  readonly configured: boolean;
  readonly missingEnv: readonly string[];
  readonly note: string | null;
  /** Denegación administrativa adicional: ningún adapter puede servir con esto. */
  readonly disabled: boolean;
  readonly updatedAt: string;
}
