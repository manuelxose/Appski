import type { ProviderAdapter, ProviderId } from '../contracts/provider-contracts';
import type { SnowReportRepository, StationRepository } from '../store/repository';
import { authorizationFor } from './authorizations';
import { BLOCKED_PROVIDER_IDS, blockedAdapter } from './blocked-providers';
import { EditorialReportAdapter } from './editorial-report.adapter';
import { EditorialStationsAdapter } from './editorial-stations.adapter';
import { envGatedAdapter } from './env-gated.adapter';
import { meteoalarmAdapter } from './meteoalarm.adapter';
import { osmAdapter } from './osm.adapter';

export interface AdapterDeps {
  readonly stations: StationRepository;
  readonly reports: SnowReportRepository;
}

export type AdapterRegistry = Readonly<Partial<Record<ProviderId, ProviderAdapter>>>;

/**
 * Registro de adaptadores. La guarda runtime de 05b §2.1(2) se materializa así:
 * los proveedores bloqueados NO están en ninguna cadena de fallback y su adapter
 * devuelve `blocked` sin tocar la red.
 */
export function createAdapters(deps: AdapterDeps): AdapterRegistry {
  const registry: Partial<Record<ProviderId, ProviderAdapter>> = {
    'editorial-stations': new EditorialStationsAdapter(deps.stations),
    'editorial-report': new EditorialReportAdapter(deps.reports),
    aemet: envGatedAdapter('aemet', ['AEMET_API_KEY'], ['forecast', 'weather-alert'], authorizationFor('aemet')),
    'aemet-bpa': envGatedAdapter('aemet-bpa', ['AEMET_API_KEY'], ['avalanche'], authorizationFor('aemet-bpa')),
    meteofrance: envGatedAdapter('meteofrance', ['METEOFRANCE_API_KEY'], ['forecast', 'weather-alert'], authorizationFor('meteofrance')),
    'copernicus-c3s': envGatedAdapter('copernicus-c3s', ['C3S_API_KEY'], ['forecast'], authorizationFor('copernicus-c3s')),
    'copernicus-clms': envGatedAdapter('copernicus-clms', ['CLMS_API_KEY'], ['basemap'], authorizationFor('copernicus-clms')),
    'ign-es': envGatedAdapter('ign-es', [], ['basemap'], authorizationFor('ign-es')),
    'ign-fr': envGatedAdapter('ign-fr', [], ['basemap'], authorizationFor('ign-fr')),
    osm: osmAdapter(),
    protomaps: envGatedAdapter('protomaps', ['PROTOMAPS_BASE_URL'], ['basemap'], authorizationFor('protomaps')),
    // MeteoAlarm: sin credencial, feed Atom público, licencia verificada en el
    // propio feed (elemento `<rights>`). Atribución obligatoria + caché ≤10 min.
    //
    // Open-Meteo NO se registra a propósito: su free tier es sólo NO comercial
    // (verificado en /en/terms) y este producto es comercial. El adapter existe
    // y está probado con fixtures, pero falla cerrado sin licencia verificada y
    // no debe alcanzarse desde el registry ni desde ninguna cadena.
    meteoalarm: meteoalarmAdapter(authorizationFor('meteoalarm')),
  };
  for (const id of BLOCKED_PROVIDER_IDS) {
    registry[id] = blockedAdapter(id);
  }
  return registry;
}
