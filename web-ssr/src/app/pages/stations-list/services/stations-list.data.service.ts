/**
 * ==============================================
 * STATIONS LIST DATA SERVICE
 * ==============================================
 * Directorio de estaciones contra el BORDE REAL (`/api/snow/v1/stations`).
 *
 * Antes: `USE_MOCK_DATA: true` + `fetch` a `/assets/mocks/stations-list/*`, con
 * filtros y orden RE-APLICADOS en el cliente sobre datos ficticios.
 *
 * Ahora:
 *  - el filtrado, el orden y la paginación los hace el BORDE (query real); el
 *    cliente NO re-filtra en memoria lo que el servidor ya filtró;
 *  - la ausencia de parte es `null` (nunca 0 cm) y la UI la pinta como
 *    "sin datos";
 *  - ningún valor de relleno (precio, imagen, pistas) se inventa: va `null` y
 *    el componente lo oculta.
 */
import { Injectable, inject } from "@angular/core";
import type { StationDetailDto } from "../../../snow/models/dto";
import { SnowApi } from "../../../snow/client/snow-api.service";
import type { StationQuery } from "../../../snow/client/snow-endpoints";
import type {
  FilterOption,
  FilterOptions,
  SortConfig,
  SortOption,
  Station,
  StationFilters,
  StationStatus,
  StationsListPageData,
} from "../models/stations-list.models";

/** Tope del borde (`pageSize ≤ 100`). */
const PAGE_SIZE = 100;
/** Guarda contra un maestro patológico: 10 páginas = 1000 estaciones. */
const MAX_PAGES = 10;

@Injectable({ providedIn: "root" })
export class StationsListDataService {
  private readonly api = inject(SnowApi);

  /** Carga el directorio + opciones de filtro derivadas del maestro real. */
  async loadStationsListPageData(
    filters?: StationFilters,
    sort?: SortConfig,
  ): Promise<StationsListPageData> {
    const stations = await this.loadStations(filters, sort);
    const filterOptions = await this.loadFilterOptions();
    return {
      stations,
      filterOptions,
      // Sin datos no hay estadísticas: se omite en vez de afirmar 0.
      ...(stations.length > 0
        ? {
            stats: {
              totalStations: stations.length,
              openStations: stations.filter((s) => s.status === "open").length,
              // Se promedia sólo sobre observaciones EXISTENTES (ausencia ≠ 0).
              avgSnowBase: average(stations.map((s) => s.snowBase).filter((v): v is number => v !== null)),
            },
          }
        : {}),
    };
  }

  /** Directorio: recorre las páginas del borde con los filtros de la UI. */
  async loadStations(filters?: StationFilters, sort?: SortConfig): Promise<Station[]> {
    const query: StationQuery = {
      ...toBorderQuery(filters),
      ...toBorderSort(sort),
      pageSize: PAGE_SIZE,
    };
    const first = await this.api.stations({ ...query, page: 1 });
    // Red/5xx o `no_data`: la página muestra su estado; aquí no se inventa nada.
    if (!first.ok || first.body.status !== "ok") return [];

    const rows: StationDetailDto[] = [...first.body.stations];
    const { totalPages } = first.body.pagination;
    for (let page = 2; page <= totalPages && page <= MAX_PAGES; page++) {
      const next = await this.api.stations({ ...query, page });
      if (!next.ok || next.body.status !== "ok") break;
      rows.push(...next.body.stations);
    }
    return rows.map(toPageStation);
  }

  /**
   * Opciones de filtro derivadas del MAESTRO REAL. No hay endpoint de
   * "filter-options" y fabricar opciones de servicios sería inventar datos.
   */
  async loadFilterOptions(): Promise<FilterOptions> {
    const res = await this.api.stations({ pageSize: PAGE_SIZE });
    const rows = res.ok && res.body.status === "ok" ? res.body.stations : [];

    const regions: FilterOption[] = uniqueSorted(rows.map((s) => s.region)).map((r) => ({ value: r, label: r }));
    const stationTypes: FilterOption[] = uniqueSorted(rows.map((s) => s.discipline)).map((d) => ({
      value: d,
      label: d === "alpine" ? "Esquí alpino" : "Esquí nórdico",
    }));
    const statusOptions: FilterOption[] = [
      { value: "open", label: "Abierta" },
      { value: "closed", label: "Cerrada" },
      { value: "unknown", label: "Sin confirmar" },
    ];

    return {
      regions,
      stationTypes,
      // El borde no expone servicios por estación: NO se inventan opciones.
      services: [],
      statusOptions,
    };
  }

  /** Búsqueda por texto: la hace el borde (`/v1/search`); `q` vacío ⇒ sin resultados. */
  async searchStations(query: string): Promise<Station[]> {
    const res = await this.api.search(query);
    if (!res.ok || res.body.status !== "ok") return [];
    return res.body.stations.map(toPageStation);
  }
}

// ---------------------------------------------------------------------------
// Mapeo contrato del borde → modelo de la página
// ---------------------------------------------------------------------------

/** Filtros de la UI → query del borde. Lo que el borde no admite no se envía. */
function toBorderQuery(f: StationFilters | undefined): Partial<StationQuery> {
  if (!f) return {};
  const q: { -readonly [K in keyof StationQuery]?: StationQuery[K] } = {};
  if (f.region) q.region = f.region;
  if (f.type) q.discipline = f.type === "nordic" ? "nordic" : "alpine";
  if (f.status === "open" || f.status === "closed") q.status = f.status;
  // `snowMin` 0 significa "sin filtro" en la UI: no se envía.
  if (f.snowMin > 0) q.snowMin = f.snowMin;
  return q;
}

function toBorderSort(s: SortConfig | undefined): Partial<StationQuery> {
  if (!s) return {};
  const map: Record<SortOption, StationQuery["sort"] | null> = {
    name: "name",
    snowBase: "snow",
    altitude: "altitude",
    // El borde no ordena por precio/pistas: se mantiene el orden por nombre.
    price: null,
    slopesOpen: null,
    relevance: null,
  };
  const sort = map[s.field];
  return sort === null ? {} : { sort, sortDir: s.direction };
}

function toPageStation(d: StationDetailDto): Station {
  return {
    id: d.slug,
    slug: d.slug,
    name: d.name,
    // Se pinta el nombre REAL del maestro (la `Region` del mock era un enum ficticio).
    region: d.region,
    location: d.region,
    image: "", // el borde no sirve imágenes
    status: toStatus(d.season),
    type: d.discipline,
    // Ausencia de parte ⇒ `null`, NUNCA 0 cm.
    snowBase: d.snow?.baseCm ?? null,
    snowTop: null,
    snowNew24h: null,
    // El directorio no trae estado operativo por estación: sin dato, sin relleno.
    liftsOpen: null,
    liftsTotal: null,
    slopesOpen: null,
    slopesTotal: null,
    altitude: { base: d.altitudeBaseM, top: d.altitudeTopM },
    price: null,
    features: [],
    lastUpdate: d.snow?.updatedAt ?? d.snow?.observedAt,
  };
}

function toStatus(season: StationDetailDto["season"]): StationStatus {
  if (season === "open") return "open";
  if (season === "closed") return "closed";
  return "seasonal"; // `unknown` = temporada sin confirmar
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values.filter((v) => v.trim().length > 0))].sort((a, b) => a.localeCompare(b));
}
