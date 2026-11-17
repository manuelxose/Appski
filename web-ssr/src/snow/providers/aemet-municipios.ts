import raw from './aemet-municipios.generated.json' with { type: 'json' };

/**
 * Mapa EXPLÍCITO estación → municipio AEMET (SNOW-03b t1).
 *
 * El fichero `aemet-municipios.generated.json` es el único origen de verdad y se
 * regenera con `scripts/snow03/build-aemet-municipios.mjs` contra la relación
 * oficial de municipios del INE; aquí sólo se consulta.
 *
 * Reglas:
 * - Ningún código se inventa ni se deriva de coordenadas. Una estación sin
 *   entrada aquí NO tiene pronóstico AEMET: el adapter devuelve
 *   `no_data/not-covered` en vez de buscar el municipio más cercano.
 * - `stationRef.sourceIds.aemet` (si existe) MANDA sobre este mapa: es el punto
 *   donde un operador puede corregir el municipio sin tocar código.
 */

export interface AemetMunicipioEntry {
  readonly slug: string;
  readonly municipio: string;
  /** Código INE de 5 dígitos: el `{id}` del endpoint de AEMET. */
  readonly code: string;
  readonly province: string;
}

export interface AemetMappingFile {
  readonly note: string;
  readonly source: { readonly id: string; readonly url: string; readonly sha256: string; readonly rows: number };
  readonly generatedAt: string;
  readonly unresolved: ReadonlyArray<{ readonly slug: string; readonly nombre: string; readonly problem: string }>;
  readonly notCovered: ReadonlyArray<{ readonly slug: string; readonly reason: string }>;
  readonly stations: readonly AemetMunicipioEntry[];
}

const FILE = raw as unknown as AemetMappingFile;

const BY_SLUG: ReadonlyMap<string, AemetMunicipioEntry> = new Map(FILE.stations.map((s) => [s.slug, s]));

/** Código INE del municipio de la estación, o `null` si no está declarado. */
export function aemetMunicipioFor(slug: string): string | null {
  return BY_SLUG.get(slug)?.code ?? null;
}

/** Entrada completa (con nombre del municipio) para diagnóstico/evidencia. */
export function aemetMunicipioEntryFor(slug: string): AemetMunicipioEntry | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Procedencia del mapa, para la evidencia de verificación. */
export function aemetMappingInfo(): AemetMappingFile {
  return FILE;
}
