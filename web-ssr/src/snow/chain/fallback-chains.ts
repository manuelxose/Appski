import type { ProviderId, SnowDataType } from '../contracts/provider-contracts';

/**
 * Cadena de fallback por tipo de dato (05b §3.1). `image` vacía a propósito.
 *
 * ⚠️ SNOW-03b: `copernicus-c3s` se ha RETIRADO de `forecast`.
 *
 * C3S es reanálisis/observación climática HISTÓRICA (ERA5), no un pronóstico. Al
 * estar al final de la cadena ocurría esto: si AEMET no servía (sin clave, sin
 * municipio o rate_limited), el bucle seguía hasta C3S y
 * `/v1/stations/:slug/forecast` respondía con
 * `provenance.source: 'copernicus-c3s'` y
 * `attribution: 'Datos: Copernicus Climate Data Store'` — atribuyendo a
 * Copernicus un pronóstico que no existía. Un dato FALSO con apariencia
 * legítima: el peor error posible en este hito.
 *
 * Un proveedor de clima histórico no puede ser fuente de pronóstico ni como
 * último recurso. Si no hay pronóstico, la respuesta correcta es `no_data` con
 * la procedencia de quien realmente lo intentó.
 */
export const FALLBACK_CHAINS: Readonly<Record<SnowDataType, readonly ProviderId[]>> = {
  'station-master': ['editorial-stations', 'osm'],
  'operational-status': ['editorial-report'],
  'snow-depth': ['editorial-report'],
  forecast: ['aemet', 'meteofrance'],
  // MeteoAlarm se añade DESPUÉS de los existentes (SNOW-03): es un agregador
  // EUMETNET de avisos oficiales y no reemplaza a la fuente nacional.
  // `meteofrance-bpa-html` NUNCA entra en ninguna cadena.
  'weather-alert': ['aemet', 'meteofrance', 'meteoalarm'],
  avalanche: ['aemet-bpa', 'editorial-report'],
  basemap: ['protomaps', 'ign-es', 'ign-fr', 'copernicus-clms'],
  image: [],
} as const;

/**
 * Proveedores que NO pueden representar un PRONÓSTICO, con el motivo.
 *
 * Es una GUARDA del orquestador, independiente de cómo esté compuesta la
 * cadena: cualquier cadena (incluidas las inyectadas en tests o modificadas en
 * el futuro) que incluya uno de estos para `forecast` falla cerrada en vez de
 * servir atribución falsa.
 */
export const NOT_A_FORECAST_PROVIDER: Readonly<Partial<Record<ProviderId, string>>> = {
  'copernicus-c3s': 'reanálisis climático histórico (ERA5), no pronóstico',
  'copernicus-clms': 'observación/cobertura del suelo, no pronóstico',
  osm: 'cartografía, no meteorología',
  'osm-tiles': 'teselas de mapa, no meteorología',
  'editorial-report': 'parte editorial de estación, no pronóstico meteorológico',
  'editorial-stations': 'directorio de estaciones, no pronóstico',
};
