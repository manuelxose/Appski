import { SnowDataService } from '../chain/chain';
import { JsonSnowReportRepository } from '../store/json-store/json-report-repository';
import { JsonStationRepository } from '../store/json-store/json-station-repository';
import { bootstrapStore, defaultDataDir, seededFiles } from '../store/json-store/file-io';
import { applyCatalogToStore } from '../catalog/station-loader';
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
 *
 * DESPUÉS del seed se proyecta el catálogo maestro de la Fase B
 * (`applyCatalogToStore`): idempotente, editorial manda, y así `/v1/stations` sirve
 * el catálogo además de las 3 curadas. La carga se hace en el bootstrap del
 * almacén para no tocar `snow.service.ts` (propiedad de ingest-engineer).
 */
export function createSnowRouter(
  dataDir: string = defaultDataDir(),
  clock: Clock = systemClock,
): ReturnType<typeof snowRouter> {
  const seeded = bootstrapStore(dataDir);
  // El catálogo se carga en el almacén de PRODUCTO (su maestro es el seed) y en
  // directorios nuevos. Un directorio montado a mano por un operador o por un test
  // (escribió su propia `stations.json`; `bootstrapStore` no creó nada) NO se puebla:
  // su maestro es dato deliberado y no se le añaden 587 filas por detrás.
  const catalogApplies = collectCatalogDecision(seeded.created.length > 0, seededFiles(dataDir));
  if (catalogApplies) loadCatalogIntoStore(dataDir);
  const stations = new JsonStationRepository(dataDir);
  const reports = new JsonSnowReportRepository(dataDir);
  const data = new SnowDataService({ stations, reports });
  const service = new SnowService(data, stations, reports, clock);
  return snowRouter(service);
}

/** Decide si el catálogo se aplica a este directorio (ver `createSnowRouter`). */
function collectCatalogDecision(freshSeed: boolean, seeded: readonly string[]): boolean {
  if (freshSeed) return true;
  // Directorio ya existente: sólo sí su maestro salió del seed de este producto.
  return seeded.includes('stations.json');
}

/**
 * Carga del catálogo en el almacén, best-effort y NUNCA fatal.
 *
 * `createSnowRouter` es síncrona y la carga escribe en disco (async). Se hace por
 * tanto de forma SINCRÓNICA-equivalente: se lanza y se espera con un cerrojo propio
 * para que el primer `GET /v1/stations` ya vea el catálogo. Un fallo del catálogo
 * (JSON corrupto, disco sin permiso) NO debe tumbar el borde: se registra y se sigue
 * sirviendo el maestro que haya, que es degradación honesta y no cobertura inventada.
 */
function loadCatalogIntoStore(dataDir: string): void {
  const started = Date.now();
  catalogLoadState.set(dataDir, { status: 'pending', started });
  applyCatalogToStore(dataDir)
    .then((result) => {
      catalogLoadState.set(dataDir, {
        status: 'loaded',
        started,
        finished: Date.now(),
        result: {
          catalogRecords: result.catalogRecords,
          inserted: result.inserted,
          updated: result.updated,
          unchanged: result.unchanged,
          editorialPreserved: result.editorialPreserved,
          provenanceWritten: result.provenanceWritten,
          noop: result.noop,
        },
      });
    })
    .catch((error: unknown) => {
      catalogLoadState.set(dataDir, {
        status: 'failed',
        started,
        finished: Date.now(),
        error: error instanceof Error ? error.message : String(error),
      });
      process.emitWarning(`[snow] carga del catálogo fallida en ${dataDir}: ${String(error)}`);
    });
}

/** Resultado observable de la última carga del catálogo por `dataDir` (diagnóstico). */
export type CatalogLoadState =
  | { readonly status: 'pending'; readonly started: number }
  | {
      readonly status: 'loaded';
      readonly started: number;
      readonly finished: number;
      readonly result: {
        readonly catalogRecords: number;
        readonly inserted: number;
        readonly updated: number;
        readonly unchanged: number;
        readonly editorialPreserved: number;
        readonly provenanceWritten: number;
        readonly noop: boolean;
      };
    }
  | { readonly status: 'failed'; readonly started: number; readonly finished: number; readonly error: string };

export const catalogLoadState = new Map<string, CatalogLoadState>();

/**
 * Espera a que la carga del catálogo de `dataDir` termine (o a `timeoutMs`).
 * Permite a las verificaciones asertar sobre un almacén ya cargado sin dormir a ciegas.
 */
export async function awaitCatalogLoad(dataDir: string, timeoutMs = 30_000): Promise<CatalogLoadState | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = catalogLoadState.get(dataDir);
    if (state !== undefined && state.status !== 'pending') return state;
    await new Promise((r) => setTimeout(r, 25));
  }
  return catalogLoadState.get(dataDir) ?? null;
}
