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
import type { NoDataReason, StationSummary } from "../models/dto";

/** Rutas públicas que consume el cliente (las `admin: true` quedan fuera). */
export const SNOW_ENDPOINTS = {
  stations: "/api/snow/v1/stations",
  search: "/api/snow/v1/search",
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

/** Respuesta de `GET /v1/stations` y de `/v1/search` (`SnowService.listStations`). */
export interface StationListDto {
  readonly status: "ok";
  readonly stations: readonly StationSummary[];
}

/**
 * `status` en el listado: el servicio hoy devuelve siempre `'ok'`, pero el borde
 * puede degradar. Se tipa como opcional para no fingir una garantía que el
 * contrato no da.
 */
export interface StationListResponse {
  readonly status?: "ok" | "no_data";
  readonly reason?: NoDataReason;
  readonly stations?: readonly StationSummary[];
}

/** Respuesta de `GET /v1/stations/:slug`. */
export interface StationResponse {
  readonly status: "ok";
  readonly station: StationSummary;
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
