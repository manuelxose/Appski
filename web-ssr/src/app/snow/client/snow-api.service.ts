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
  SNOW_ENDPOINTS,
  classifyHttp,
  type FetchOutcome,
  type RankingKmResponse,
  type RankingNieveResponse,
  type SeasonDatesResponse,
  type StationListResponse,
  type StationResponse,
} from "./snow-endpoints";

@Injectable({ providedIn: "root" })
export class SnowApi {
  private readonly http = inject(HttpClient);

  /** `GET /v1/stations/:slug/report` — el DTO central del producto. */
  report(slug: string): Promise<FetchOutcome<SnowReportDto>> {
    return this.get<SnowReportDto>(SNOW_ENDPOINTS.report(slug));
  }

  /** `GET /v1/stations` — maestro público (sin datos meteorológicos). */
  stations(): Promise<FetchOutcome<StationListResponse>> {
    return this.get<StationListResponse>(SNOW_ENDPOINTS.stations);
  }

  /** `GET /v1/stations/:slug` — ficha del maestro; 404 si no existe. */
  station(slug: string): Promise<FetchOutcome<StationResponse>> {
    return this.get<StationResponse>(SNOW_ENDPOINTS.station(slug));
  }

  /** `GET /v1/search?q=` — el servidor filtra; el cliente sólo normaliza. */
  search(q: string): Promise<FetchOutcome<StationListResponse>> {
    const query = new URLSearchParams({ q }).toString();
    return this.get<StationListResponse>(`${SNOW_ENDPOINTS.search}?${query}`);
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
