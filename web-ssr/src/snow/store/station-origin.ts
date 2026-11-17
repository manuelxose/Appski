/**
 * Procedencia de las filas del maestro de estaciones.
 *
 * El almacén guarda la entidad de dominio tal cual. Para poder distinguir una estación
 * CURADA (seed editorial / endpoint admin) de una proyectada desde el catálogo de la
 * Fase B, y para trazar de dónde salió su coordenada, las filas llevan dos campos
 * ADITIVOS que `Station` no modela (no rompen el contrato: `shapeStation` los ignora y
 * `toRecord()` no los reescribe, por eso el loader los gestiona sobre la fila cruda):
 *
 *   - `origin: 'editorial' | 'catalog'`
 *     Ausente = `editorial` (compatibilidad con el seed v1 y con los PUT admin).
 *   - `catalogRef`: sólo en filas `catalog`. Lleva el id estable del catálogo, la ref
 *     canónica de la coordenada, la elevación publicada CON su método y fuente, y el
 *     sha256 + licencia de cada fuente citada.
 */
export type ProvinceOrigin = 'editorial' | 'catalog';

/** Fuente citada del catálogo (una por dataset capturado). */
export interface CatalogSourceRef {
  readonly dataset: string | null;
  readonly url: string | null;
  readonly sha256: string | null;
  readonly status: number | null;
  readonly capturedAt: string | null;
  readonly licenseId: string | null;
}

/** Trazabilidad de una estación proyectada desde el catálogo de Fase B. */
export interface CatalogRef {
  /** Id estable del catálogo (`snow03:es:baqueira-beret`). */
  readonly catalogId: string | null;
  /** Ref canónica de la coordenada (`osm:way/123` / `wikidata:Q123`). */
  readonly coordinateSource: string | null;
  /**
   * Elevación publicada por el catálogo, o `null` si no había una fuente fiable.
   * NO se copia a `altitudeBaseM`/`altitudeTopM`: ver cabecera de `station-loader.ts`.
   */
  readonly elevationM: number | null;
  readonly elevationMethod: string | null;
  readonly elevationSourceRef: string | null;
  /** Región verificada por la fuente, o `null` (nunca inferida). */
  readonly region: string | null;
  /** `'contract-default'`: el catálogo no declara disciplina; se usa el valor del contrato. */
  readonly discipline: 'contract-default';
  readonly licenseIds: readonly string[];
  readonly sources: readonly CatalogSourceRef[];
}
