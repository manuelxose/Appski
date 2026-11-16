import { SnowDataService } from '../chain/chain';
import { JsonSnowReportRepository } from '../store/json-store/json-report-repository';
import { JsonStationRepository } from '../store/json-store/json-station-repository';
import { bootstrapStore, defaultDataDir } from '../store/json-store/file-io';
import { SnowService } from './snow.service';
import { snowRouter } from './snow.routes';
import { systemClock, type Clock } from './clock';

export { SNOW_ROUTES } from './snow.routes';

/**
 * Bootstrap del borde snow. Inyecta el almacén JSON v1 (R2), la cadena de
 * adaptadores y el reloj. `SNOW_DATA_DIR` (o `data/snow`) es el dir de runtime.
 *
 * Antes de construirse el router se importa el seed editorial si el directorio
 * de runtime aún no tiene los ficheros (`bootstrapStore`): sin eso el maestro de
 * estaciones se servía vacío y toda ruta de detalle daba 404.
 */
export function createSnowRouter(
  dataDir: string = defaultDataDir(),
  clock: Clock = systemClock,
): ReturnType<typeof snowRouter> {
  bootstrapStore(dataDir);
  const stations = new JsonStationRepository(dataDir);
  const reports = new JsonSnowReportRepository(dataDir);
  const data = new SnowDataService({ stations, reports });
  const service = new SnowService(data, stations, reports, clock);
  return snowRouter(service);
}
