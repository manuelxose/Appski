import type { StationMaster } from '../contracts/data-type-map';

/**
 * Maestro EDITORIAL (nuestra curaduría; 02 §3.3 tabla `station`). No proviene de
 * OSM ni de infonieve. Los campos derivados de OSM, si algún día se extraen,
 * viven en `osm_derived_*`, nunca aquí.
 */
export interface Station extends StationMaster {
  readonly discipline: 'alpine' | 'nordic';
  readonly seasonOpen: string | null; // 'MM-DD'
  readonly seasonClose: string | null;
  readonly seasonConfirmed: boolean;
}

/** Proyección pública del maestro que cruza el borde HTTP. */
export interface StationSummary extends StationMaster {
  readonly discipline: 'alpine' | 'nordic';
}
