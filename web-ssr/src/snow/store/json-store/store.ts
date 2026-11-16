import type { SnowStore } from '../repository-v2';
import { JsonStationRepository } from './json-station-repository';
import { JsonSnowReportRepository } from './json-report-repository';
import { JsonForecastCacheRepository } from './json-forecast-repository';
import { JsonObservationRepository } from './json-observation-repository';
import { JsonAlertRepository } from './json-alert-repository';
import { JsonWebcamRepository } from './json-webcam-repository';
import { JsonProviderRepository } from './json-provider-repository';
import { JsonProvenanceRepository } from './json-provenance-repository';
import { defaultDataDir, migrateStoreDir, type MigrationOutcome } from './file-io';

export { defaultDataDir, migrateStoreDir, type MigrationOutcome };

/**
 * Construye el bundle completo de repositorios v2 sobre `dataDir`
 * (`SNOW_DATA_DIR` por defecto). Es lo que el borde inyecta:
 *
 * ```ts
 * const store = createJsonStore(dataDir);
 * store.stations.findBySlug('baqueira-beret'); // StationRepository V1+V2
 * store.reports.latestPublishedForStation('baqueira-beret', new Date());
 * store.alerts.listActive('baqueira-beret', new Date());
 * ```
 *
 * No lee ni escribe en disco al construirse: cada método abre el fichero, lo
 * normaliza (v1 → v2 en memoria) y escribe atómicamente si procede.
 */
export function createJsonStore(dataDir: string = defaultDataDir()): SnowStore {
  return {
    stations: new JsonStationRepository(dataDir),
    reports: new JsonSnowReportRepository(dataDir),
    forecasts: new JsonForecastCacheRepository(dataDir),
    observations: new JsonObservationRepository(dataDir),
    alerts: new JsonAlertRepository(dataDir),
    webcams: new JsonWebcamRepository(dataDir),
    providers: new JsonProviderRepository(dataDir),
    provenance: new JsonProvenanceRepository(dataDir),
  };
}

export { JsonStationRepository, JsonSnowReportRepository, JsonForecastCacheRepository };
export { JsonObservationRepository, JsonAlertRepository, JsonWebcamRepository };
export { JsonProviderRepository, JsonProvenanceRepository };
