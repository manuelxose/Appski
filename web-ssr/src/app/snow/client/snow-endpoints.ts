/**
 * Contrato del borde `/api/snow/v1/**` tal como lo sirve el backend.
 *
 * **De dónde sale esto:** no de mi memoria ni de `02` §3.2 a solas, sino del
 * array `SNOW_ROUTES` de `web-ssr/src/snow/server/snow.routes.ts` — la fuente
 * única que declara `path`, `method`, `admin` y `expectedNoCredential` de cada
 * ruta. `scripts/snow/tests/api-client.test.mjs` compara este fichero con ese
 * array y falla si divergen: si el backend añade o renombra una ruta, el test
 * lo dice en vez de que lo descubra un usuario con un 404.
 *
 * Regla de degradación (02 §3.2): un `200` cuya carga indica ausencia de dato
 * (`no_data`, `not_configured`, `blocked`) es un DATO, no un error. Por eso
 * `classifyHttp` devuelve `ok: true` con el cuerpo tal cual y sólo marca
 * `ok: false` cuando hubo fallo de red, 5xx o un 404 de estación.
 */
import type {
  AlertsDto,
  ForecastBundle,
  ImageGrant,
  NoDataReason,
  ProvenanceDto,
  SnowObservationDto,
  SnowReportDto,
  StationDetailDto,
  StationListDto,
  StationSummary,
} from "../models/dto";

/** Rutas públicas que consume el cliente (las `admin: true` quedan fuera). */
export const SNOW_ENDPOINTS = {
  stations: "/api/snow/v1/stations",
  search: "/api/snow/v1/search",
  alerts: (slug: string) => `/api/snow/v1/stations/${encodeURIComponent(slug)}/alerts`,
  report: (slug: string) => `/api/snow/v1/stations/${encodeURIComponent(slug)}/report`,
  forecast: (slug: string) => `/api/snow/v1/stations/${encodeURIComponent(slug)}/forecast`,
  webcams: (slug: string) => `/api/snow/v1/stations/${encodeURIComponent(slug)}/webcams`,
  avalanche: "/api/snow/v1/avalanche",
  rankingNieve: "/api/snow/v1/rankings/nieve",
  rankingKm: "/api/snow/v1/rankings/km",
  seasonDates: "/api/snow/v1/season-dates",
  station: (slug: string) => `/api/snow/v1/stations/${encodeURIComponent(slug)}`,
} as const;

export type SnowEndpointKey = keyof typeof SNOW_ENDPOINTS;

/**
 * Filtros/orden/paginación del directorio, EXACTAMENTE los que el borde acepta
 * (`/v1/stations`, SNOW-02 §4.1). Un parámetro fuera de esta lista lo rechaza el
 * borde con 400: el cliente no puede inventarse el contrato.
 */
export interface StationQuery {
  readonly country?: "ES" | "AD" | "FR" | "PT";
  readonly region?: string;
  readonly discipline?: "alpine" | "nordic";
  readonly status?: "open" | "closed" | "unknown";
  readonly snowMin?: number;
  readonly sort?: "name" | "region" | "altitude" | "snow";
  readonly sortDir?: "asc" | "desc";
  /** 1-based. */
  readonly page?: number;
  /** 1..100 (tope del borde). */
  readonly pageSize?: number;
}

export const MAX_PAGE_SIZE = 100;

/**
 * Respuesta de `GET /v1/stations`: paginada y con `provenance` (t3). El tipo
 * `StationListDto` del borde define la forma; aquí sólo se declara la vista.
 */
export type StationListResponse = StationListDto;

/**
 * Respuesta de `GET /v1/stations/:slug` (ficha con `season` + nieve observada).
 * `status` es `'ok'` o, si el fichero faltara, el borde responde 404 tipado.
 */
export type StationResponse = { readonly status: "ok"; readonly station: StationDetailDto };

/** Alias de compatibilidad con el nombre anterior (`/search` reutiliza el borde). */
export type SearchStationResponse = { readonly status: "ok" | "no_data"; readonly stations: readonly StationDetailDto[] };

/** Respuesta de `GET /v1/stations/:slug/alerts` (sin proveedor ⇒ `alerts: []`). */
export type AlertsResponse = AlertsDto;

/** Re-export de lo que consume la UI, sin duplicar dominio. */
export type { StationDetailDto, StationListDto, SnowObservationDto, AlertsDto };
export type StationReportResponse = SnowReportDto;

/**
 * Respuesta de `GET /v1/stations/:slug/forecast`: `data` SÓLO existe con
 * `ok`/`stale`. Se tipa `data` opcional para que nadie lea cifras sin
 * discriminar el estado (el borde nunca manda `data` degradado).
 */
export type ForecastResponse =
  | {
      readonly status: "ok" | "stale";
      readonly data?: ForecastBundle;
      readonly provenance: ProvenanceDto;
    }
  | {
      readonly status: "no_data" | "not_configured" | "blocked";
      readonly reason?: NoDataReason;
      readonly provenance: ProvenanceDto;
    };

/** Respuesta de `GET /v1/stations/:slug/webcams`: siempre `blocked` en v1. */
export interface WebcamsResponse {
  readonly status: "blocked";
  readonly reason: NoDataReason;
  readonly provenance: ProvenanceDto;
  readonly grants: readonly ImageGrant[];
}

/** Respuesta de `GET /v1/rankings/nieve`. */
export interface RankingNieveResponse {
  readonly status: "ok" | "no_data";
  readonly reason?: NoDataReason;
  readonly ranking: readonly { readonly stationSlug: string; readonly baseCm: number }[];
}

/** Respuesta de `GET /v1/rankings/km`. */
export interface RankingKmResponse {
  readonly status: "ok" | "no_data";
  readonly reason?: NoDataReason;
  readonly ranking: readonly { readonly stationSlug: string; readonly kmOpen: number }[];
}

/** Respuesta de `GET /v1/season-dates`. */
export interface SeasonDatesResponse {
  readonly status: "ok";
  readonly dates: readonly {
    readonly slug: string;
    readonly name: string;
    readonly seasonOpen: string | null;
    readonly seasonClose: string | null;
    readonly confirmed: boolean;
  }[];
}

/** Cuerpo de 404 de estación (`SnowService.notFound`). */
export interface StationNotFoundBody {
  readonly error: "station-not-found";
}

/**
 * Resultado de una lectura del borde. `ok: true` incluye los estados
 * `no_data`/`not_configured`/`blocked`, que **no** son fallos.
 */
export type FetchOutcome<T> =
  | { readonly ok: true; readonly body: T; readonly httpStatus: number }
  | {
      readonly ok: false;
      readonly kind: "not-found" | "network" | "server";
      readonly httpStatus: number | null;
    };

/** Clasificación de un código HTTP; `null` = no hubo respuesta (red caída). */
export type HttpClass =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly kind: "not-found" | "network" | "server";
      readonly httpStatus: number | null;
    };

/**
 * Una sola regla para todo el cliente:
 *  - 2xx → lectura válida (aunque el cuerpo diga `no_data`);
 *  - 404 → estación inexistente (el borde devuelve `station-not-found`);
 *  - 5xx → fallo del servidor;
 *  - sin respuesta → red.
 * Nunca se mira el cuerpo para decidir esto: el cuerpo describe DATOS.
 */
export function classifyHttp(httpStatus: number | null): HttpClass {
  if (httpStatus === null) return { ok: false, kind: "network", httpStatus: null };
  if (httpStatus === 404) return { ok: false, kind: "not-found", httpStatus };
  if (httpStatus >= 500) return { ok: false, kind: "server", httpStatus };
  return { ok: true };
}
