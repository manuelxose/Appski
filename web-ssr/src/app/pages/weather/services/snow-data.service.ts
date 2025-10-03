import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import {
  SnowConditions,
  DetailedForecastDay,
  WeekForecastDay,
  SeasonStats,
  SeasonChartData,
} from "../models/meteo.models";

/**
 * Servicio para obtener datos de estado de la nieve
 * SSR-safe con absolute URLs
 */
@Injectable({
  providedIn: "root",
})
export class SnowDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Obtiene la base URL para fetch SSR-safe
   */
  private getBaseUrl(): string {
    if (this.isBrowser && typeof window !== "undefined") {
      return window.location.origin;
    }
    // Fallback para SSR
    return "http://localhost:4200";
  }

  /**
   * Obtiene las condiciones actuales de la nieve
   */
  async getSnowConditions(_stationSlug: string): Promise<SnowConditions> {
    const url = `${this.getBaseUrl()}/assets/mocks/snow-conditions.json`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }

  /**
   * Obtiene la previsión meteorológica detallada (5 días x 4 bloques)
   */
  async getDetailedForecast(
    _stationSlug: string
  ): Promise<DetailedForecastDay[]> {
    const url = `${this.getBaseUrl()}/assets/mocks/snow-detailed-forecast.json`;
    const response = await fetch(url);
    const data = await response.json();
    return data.days;
  }

  /**
   * Obtiene la previsión resumida para 8 días
   */
  async getWeekForecast(_stationSlug: string): Promise<WeekForecastDay[]> {
    const url = `${this.getBaseUrl()}/assets/mocks/snow-week-forecast.json`;
    const response = await fetch(url);
    const data = await response.json();
    return data.days;
  }

  /**
   * Obtiene estadísticas de la temporada
   */
  async getSeasonStats(_stationSlug: string): Promise<SeasonStats> {
    const url = `${this.getBaseUrl()}/assets/mocks/snow-season-stats.json`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }

  /**
   * Obtiene datos para gráficos de temporada
   */
  async getSeasonChartData(_stationSlug: string): Promise<SeasonChartData> {
    const url = `${this.getBaseUrl()}/assets/mocks/snow-season-charts.json`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  }
}
