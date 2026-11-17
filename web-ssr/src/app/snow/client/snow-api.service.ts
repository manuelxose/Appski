/**
 * Cliente tipado del borde `/api/snow/v1/**`.
 *
 * Decisión de diseño: usa `HttpClient` (ya en `app.config.ts` con `withFetch()`),
 * no `fetch` a pelo. Motivos: en SSR pasa por el mismo pipeline que el resto de
 * la app, se puede interceptar, y `TransferState` evita que el navegador repita
 * la petición que el servidor ya hizo.
 *
 * El servicio **no decide negocio**: devuelve `FetchOutcome<T>` y deja que la
 * página lo traduzca a estados visuales (`client/ui/view-state.ts`).
 */
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { firstValueFrom } from "rxjs";
import type { SnowReportDto } from "../models/dto";
import {
  MAX_PAGE_SIZE,
  SNOW_ENDPOINTS,
  classifyHttp,
  type AlertsResponse,
  type FetchOutcome,
  type ForecastResponse,
  type WebcamsResponse,
  type RankingKmResponse,
  type RankingNieveResponse,
  type SearchStationResponse,
  type SeasonDatesResponse,
  type StationListResponse,
  type StationQuery,
  type StationResponse,
} from "./snow-endpoints";

/**
 * Serializa SÓLO los parámetros que el contrato declara, y nunca `undefined`.
 * Enviar una clave desconocida o vacía haría que el borde respondiera 400.
 */
export function stationQueryString(q: StationQuery): string {
  const p = new URLSearchParams();
  if (q.country) p.set("country", q.country);
  if (q.region && q.region.trim().length > 0) p.set("region", q.region.trim());
  if (q.discipline) p.set("discipline", q.discipline);
  if (q.status) p.set("status", q.status);
  if (typeof q.snowMin === "number" && Number.isFinite(q.snowMin) && q.snowMin >= 0) {
    p.set("snowMin", String(q.snowMin));
  }
  if (q.sort) p.set("sort", q.sort);
  if (q.sortDir) p.set("sortDir", q.sortDir);
  if (typeof q.page === "number" && Number.isFinite(q.page)) {
    p.set("page", String(Math.max(1, Math.trunc(q.page))));
  }
  if (typeof q.pageSize === "number" && Number.isFinite(q.pageSize)) {
    p.set("pageSize", String(Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(q.pageSize)))));
  }
  return p.toString();
}

@Injectable({ providedIn: "root" })
export class SnowApi {
  private readonly http = inject(HttpClient);

  /** `GET /v1/stations/:slug/report` — el DTO central del producto. */
  report(slug: string): Promise<FetchOutcome<SnowReportDto>> {
    return this.get<SnowReportDto>(SNOW_ENDPOINTS.report(slug));
  }

  /**
   * `GET /v1/stations` — directorio PAGINADO con nieve observada.
   *
   * Los filtros/orden/paginación viajan como query REAL: el borde los valida y
   * filtra; el cliente no re-filtra en memoria (filtrar en cliente lo que el
   * borde ya filtraba fue el defecto del camino mock). `pageSize` se acota a
   * 1..100 y `page` a ≥1 antes de enviar, para no provocar un 400 evitable.
   */
  stations(query: StationQuery = {}): Promise<FetchOutcome<StationListResponse>> {
    const qs = stationQueryString(query);
    return this.get<StationListResponse>(qs ? `${SNOW_ENDPOINTS.stations}?${qs}` : SNOW_ENDPOINTS.stations);
  }

  /** `GET /v1/stations/:slug` — ficha con `season` y nieve observada; 404 si no existe. */
  station(slug: string): Promise<FetchOutcome<StationResponse>> {
    return this.get<StationResponse>(SNOW_ENDPOINTS.station(slug));
  }

  /** `GET /v1/stations/:slug/alerts` — sin proveedor A1/A2 ⇒ `alerts: []` tipado. */
  alerts(slug: string): Promise<FetchOutcome<AlertsResponse>> {
    return this.get<AlertsResponse>(SNOW_ENDPOINTS.alerts(slug));
  }

  /** `GET /v1/stations/:slug/forecast` — sin proveedor ⇒ `not_configured` (es un DATO). */
  forecast(slug: string): Promise<FetchOutcome<ForecastResponse>> {
    return this.get<ForecastResponse>(SNOW_ENDPOINTS.forecast(slug));
  }

  /** `GET /v1/stations/:slug/webcams` — siempre `blocked` (la imagen está prohibida). */
  webcams(slug: string): Promise<FetchOutcome<WebcamsResponse>> {
    return this.get<WebcamsResponse>(SNOW_ENDPOINTS.webcams(slug));
  }

  /** `GET /v1/search?q=` — `q` es OBLIGATORIO en el borde (sin él ⇒ 400). */
  async search(q: string): Promise<FetchOutcome<SearchStationResponse>> {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      // No se llama al borde con una query que sabe inválida: se devuelve un
      // resultado vacío explícito, que la UI pinta como "sin resultados".
      return { ok: true, body: { status: "no_data", stations: [] }, httpStatus: 200 };
    }
    const query = new URLSearchParams({ q: trimmed }).toString();
    return this.get<SearchStationResponse>(`${SNOW_ENDPOINTS.search}?${query}`);
  }

  /** `GET /v1/rankings/nieve` — puede llegar `status: 'no_data'` (es un dato). */
  rankingSnow(): Promise<FetchOutcome<RankingNieveResponse>> {
    return this.get<RankingNieveResponse>(SNOW_ENDPOINTS.rankingNieve);
  }

  /** `GET /v1/rankings/km`. */
  rankingKm(): Promise<FetchOutcome<RankingKmResponse>> {
    return this.get<RankingKmResponse>(SNOW_ENDPOINTS.rankingKm);
  }

  /** `GET /v1/season-dates` — calendario editorial. */
  seasonDates(): Promise<FetchOutcome<SeasonDatesResponse>> {
    return this.get<SeasonDatesResponse>(SNOW_ENDPOINTS.seasonDates);
  }

  /**
   * Lectura genérica con la regla única de `classifyHttp`.
   * `fetch` nunca lanza por causas esperables: devuelve `ok: false` y el motivo.
   */
  private async get<T>(url: string): Promise<FetchOutcome<T>> {
    try {
      const response = await firstValueFrom(
        this.http.get<T>(url, { observe: "response" })
      );
      const cls = classifyHttp(response.status);
      if (!cls.ok) return cls;
      return { ok: true, body: response.body as T, httpStatus: response.status };
    } catch (err: unknown) {
      const status = err instanceof HttpErrorResponse ? err.status : null;
      const cls = classifyHttp(status === 0 ? null : status);
      if (!cls.ok) return cls;
      // 2xx sin cuerpo o error de deserialización: es un fallo del servidor.
      return { ok: false, kind: "server", httpStatus: status };
    }
  }
}
