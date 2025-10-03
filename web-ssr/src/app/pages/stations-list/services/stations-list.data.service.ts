/**
 * ==============================================
 * STATIONS LIST DATA SERVICE
 * ==============================================
 * Orquesta datos de la página Stations List (estaciones, filtros, ordenación).
 * Estrategia: Mock por defecto en DEV, API en PROD.
 */

import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { isPlatformBrowser } from "@angular/common";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import {
  StationsListPageData,
  Station,
  FilterOptions,
  StationFilters,
  SortConfig,
  ApiResponse,
} from "../models/stations-list.models";

/**
 * Configuración del servicio (mock vs API).
 * Cambiar USE_MOCK_DATA a false cuando API esté lista.
 */
const CONFIG = {
  USE_MOCK_DATA: true, // ⚠️ Cambiar a false para usar API real
  API_BASE_URL: "/api/v1", // Base URL de la API
  MOCK_PATH: "/assets/mocks/stations-list", // Path de mocks (también soporta pages/stations-list/mocks/)
};

@Injectable({
  providedIn: "root",
})
export class StationsListDataService {
  private readonly http = CONFIG.USE_MOCK_DATA ? null : inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private getBaseUrl(): string {
    if (this.isBrowser && typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:4200";
  }

  // ==================== PUBLIC API ====================

  /**
   * Carga todos los datos de la página Stations List.
   * @returns Promise con datos completos de la página
   */
  async loadStationsListPageData(): Promise<StationsListPageData> {
    if (CONFIG.USE_MOCK_DATA) {
      return this.loadMockData();
    }
    return this.loadApiData();
  }

  /**
   * Carga solo el listado de estaciones.
   * @param filters Filtros opcionales
   * @param sort Configuración de ordenación opcional
   * @returns Promise con array de estaciones
   */
  async loadStations(
    filters?: StationFilters,
    sort?: SortConfig
  ): Promise<Station[]> {
    if (CONFIG.USE_MOCK_DATA) {
      const data = await this.loadMockData();
      let stations = data.stations;

      // Aplicar filtros si existen
      if (filters) {
        stations = this.applyFilters(stations, filters);
      }

      // Aplicar ordenación si existe
      if (sort) {
        stations = this.applySort(stations, sort);
      }

      return stations;
    }

    if (!this.http) throw new Error("HttpClient not available");

    // En API real, enviar filtros y sort como query params
    const params = this.buildQueryParams(filters, sort);
    return firstValueFrom(
      this.http
        .get<ApiResponse<Station[]>>(`${CONFIG.API_BASE_URL}/stations`, {
          params,
        })
        .pipe(map((res) => res.data))
    );
  }

  /**
   * Carga opciones de filtros disponibles.
   * @returns Promise con opciones de filtros
   */
  async loadFilterOptions(): Promise<FilterOptions> {
    if (CONFIG.USE_MOCK_DATA) {
      const data = await this.loadMockData();
      return data.filterOptions;
    }

    if (!this.http) throw new Error("HttpClient not available");
    return firstValueFrom(
      this.http
        .get<ApiResponse<FilterOptions>>(
          `${CONFIG.API_BASE_URL}/stations/filter-options`
        )
        .pipe(map((res) => res.data))
    );
  }

  /**
   * Busca estaciones por texto.
   * @param query Texto de búsqueda
   * @returns Promise con estaciones que coinciden
   */
  async searchStations(query: string): Promise<Station[]> {
    if (CONFIG.USE_MOCK_DATA) {
      const data = await this.loadMockData();
      const lowerQuery = query.toLowerCase();
      return data.stations.filter(
        (s) =>
          s.name.toLowerCase().includes(lowerQuery) ||
          s.location.toLowerCase().includes(lowerQuery)
      );
    }

    if (!this.http) throw new Error("HttpClient not available");
    return firstValueFrom(
      this.http
        .get<ApiResponse<Station[]>>(`${CONFIG.API_BASE_URL}/stations/search`, {
          params: { q: query },
        })
        .pipe(map((res) => res.data))
    );
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Carga datos desde mock JSON.
   * @private
   */
  private async loadMockData(): Promise<StationsListPageData> {
    const baseUrl = this.getBaseUrl();

    // Intentar primero desde assets (producción), luego pages (desarrollo)
    try {
      const response = await fetch(
        `${baseUrl}${CONFIG.MOCK_PATH}/stations-list-page.mock.json`
      );
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Intentar ruta alternativa
    }

    // Ruta alternativa (desarrollo)
    const response = await fetch(
      `${baseUrl}/pages/stations-list/mocks/stations-list-page.mock.json`
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load mock data: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  }

  /**
   * Carga datos desde API real.
   * @private
   */
  private async loadApiData(): Promise<StationsListPageData> {
    if (!this.http) throw new Error("HttpClient not available");
    return firstValueFrom(
      this.http
        .get<ApiResponse<StationsListPageData>>(
          `${CONFIG.API_BASE_URL}/stations/page-data`
        )
        .pipe(map((res) => res.data))
    );
  }

  /**
   * Aplica filtros al array de estaciones (solo para modo mock).
   * @private
   */
  private applyFilters(
    stations: Station[],
    filters: StationFilters
  ): Station[] {
    return stations.filter((station) => {
      // Filtro por región
      if (filters.region && station.region !== filters.region) {
        return false;
      }

      // Filtro por tipo
      if (filters.type && station.type !== filters.type) {
        return false;
      }

      // Filtro por altitud mínima
      if (filters.minAltitude && station.altitude.base < filters.minAltitude) {
        return false;
      }

      // Filtro por nieve mínima
      if (filters.snowMin && station.snowBase < filters.snowMin) {
        return false;
      }

      // Filtro por estado
      if (filters.status && station.status !== filters.status) {
        return false;
      }

      // Filtro por servicios (todos los seleccionados deben estar presentes)
      if (
        filters.services.length > 0 &&
        !filters.services.every((service) => station.features.includes(service))
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Aplica ordenación al array de estaciones (solo para modo mock).
   * @private
   */
  private applySort(stations: Station[], sort: SortConfig): Station[] {
    const sorted = [...stations];
    const multiplier = sort.direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sort.field) {
        case "name":
          return multiplier * a.name.localeCompare(b.name);
        case "snowBase":
          return multiplier * (a.snowBase - b.snowBase);
        case "price":
          return multiplier * (a.price.adult - b.price.adult);
        case "altitude":
          return multiplier * (a.altitude.base - b.altitude.base);
        case "slopesOpen":
          return multiplier * (a.slopesOpen - b.slopesOpen);
        default:
          return 0; // relevance = orden original
      }
    });

    return sorted;
  }

  /**
   * Construye query params para llamadas a API.
   * @private
   */
  private buildQueryParams(
    filters?: StationFilters,
    sort?: SortConfig
  ): Record<string, string> {
    const params: Record<string, string> = {};

    if (filters) {
      if (filters.region) params["region"] = filters.region;
      if (filters.type) params["type"] = filters.type;
      if (filters.minAltitude)
        params["minAltitude"] = filters.minAltitude.toString();
      if (filters.snowMin) params["snowMin"] = filters.snowMin.toString();
      if (filters.status) params["status"] = filters.status;
      if (filters.services.length > 0)
        params["services"] = filters.services.join(",");
    }

    if (sort) {
      params["sortBy"] = sort.field;
      params["sortDir"] = sort.direction;
    }

    return params;
  }
}

/**
 * ==============================================
 * CÓMO CAMBIAR DE MOCK A API REAL
 * ==============================================
 *
 * 1. Cambiar CONFIG.USE_MOCK_DATA a false
 * 2. Configurar CONFIG.API_BASE_URL con tu endpoint (o usar environment.apiUrl)
 * 3. Asegurarse de que API devuelve contratos de stations-list.models.ts
 * 4. La API debe soportar filtros y ordenación via query params:
 *    - GET /api/v1/stations?region=pyrenees&snowMin=100&sortBy=name&sortDir=asc
 * 5. Verificar que HttpClient esté configurado en app.config.ts
 * 6. Añadir interceptores si es necesario (auth, cache, error handling)
 *
 * Ejemplo con environment:
 *
 * import { environment } from '../../../environments/environment';
 * const CONFIG = {
 *   USE_MOCK_DATA: !environment.production,
 *   API_BASE_URL: environment.apiBaseUrl,
 *   ...
 * };
 *
 * ==============================================
 */
