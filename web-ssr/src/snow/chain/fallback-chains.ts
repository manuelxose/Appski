import type { ProviderId, SnowDataType } from '../contracts/provider-contracts';

/** Cadena de fallback por tipo de dato (05b §3.1). `image` vacía a propósito. */
export const FALLBACK_CHAINS: Readonly<Record<SnowDataType, readonly ProviderId[]>> = {
  'station-master': ['editorial-stations', 'osm'],
  'operational-status': ['editorial-report'],
  'snow-depth': ['editorial-report'],
  forecast: ['aemet', 'meteofrance', 'copernicus-c3s'],
  // MeteoAlarm se añade DESPUÉS de los existentes (SNOW-03): es un agregador
  // EUMETNET de avisos oficiales y no reemplaza a la fuente nacional.
  // `meteofrance-bpa-html` NUNCA entra en ninguna cadena.
  'weather-alert': ['aemet', 'meteofrance', 'meteoalarm'],
  avalanche: ['aemet-bpa', 'editorial-report'],
  basemap: ['protomaps', 'ign-es', 'ign-fr', 'copernicus-clms'],
  image: [],
} as const;
