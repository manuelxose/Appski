/**
 * ==============================================
 * HOME DATA SERVICE
 * ==============================================
 * Orquesta datos de la página Home (stats, testimonials, features, stations).
 * Estrategia: Mock por defecto en DEV, API en PROD.
 */

import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { isPlatformBrowser } from "@angular/common";
import { firstValueFrom } from "rxjs";
import { map } from "rxjs/operators";
import {
  HomePageData,
  PlatformStat,
  Testimonial,
  Feature,
  FeaturedStation,
  SearchSuggestion,
  ApiResponse,
} from "../models/home.models";

/**
 * Configuración del servicio (mock vs API).
 * Cambiar USE_MOCK_DATA a false cuando API esté lista.
 */
const CONFIG = {
  USE_MOCK_DATA: true, // ⚠️ Cambiar a false para usar API real
  API_BASE_URL: "/api/v1", // Base URL de la API (configurar con environment)
  MOCK_PATH: "/assets/mocks/home", // Path de mocks
};

@Injectable({
  providedIn: "root",
})
export class HomeDataService {
  private readonly http = CONFIG.USE_MOCK_DATA ? null : inject(HttpClient);
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

  // ==================== PUBLIC API ====================

  /**
   * Carga todos los datos de la página Home en una sola llamada.
   * @returns Promise con datos completos de Home
   */
  async loadHomePageData(): Promise<HomePageData> {
    if (CONFIG.USE_MOCK_DATA) {
      return this.loadMockData();
    }
    return this.loadApiData();
  }

  /**
   * Carga solo estadísticas de plataforma.
   * @returns Promise con array de stats
   */
  async loadStats(): Promise<PlatformStat[]> {
    if (CONFIG.USE_MOCK_DATA) {
      const data = await this.loadMockData();
      return data.stats;
    }
    if (!this.http) throw new Error("HttpClient not available");
    return firstValueFrom(
      this.http
        .get<ApiResponse<PlatformStat[]>>(`${CONFIG.API_BASE_URL}/home/stats`)
        .pipe(map((res) => res.data))
    );
  }

  /**
   * Carga solo testimonios.
   * @returns Promise con array de testimonios
   */
  async loadTestimonials(): Promise<Testimonial[]> {
    if (CONFIG.USE_MOCK_DATA) {
      const data = await this.loadMockData();
      return data.testimonials;
    }
    if (!this.http) throw new Error("HttpClient not available");
    return firstValueFrom(
      this.http
        .get<ApiResponse<Testimonial[]>>(
          `${CONFIG.API_BASE_URL}/home/testimonials`
        )
        .pipe(map((res) => res.data))
    );
  }

  /**
   * Carga solo features del grid.
   * @returns Promise con array de features
   */
  async loadFeatures(): Promise<Feature[]> {
    if (CONFIG.USE_MOCK_DATA) {
      const data = await this.loadMockData();
      return data.features;
    }
    if (!this.http) throw new Error("HttpClient not available");
    return firstValueFrom(
      this.http
        .get<ApiResponse<Feature[]>>(`${CONFIG.API_BASE_URL}/home/features`)
        .pipe(map((res) => res.data))
    );
  }

  /**
   * Carga estaciones destacadas.
   * @returns Promise con array de estaciones
   */
  async loadFeaturedStations(): Promise<FeaturedStation[]> {
    if (CONFIG.USE_MOCK_DATA) {
      const data = await this.loadMockData();
      return data.featuredStations;
    }
    if (!this.http) throw new Error("HttpClient not available");
    return firstValueFrom(
      this.http
        .get<ApiResponse<FeaturedStation[]>>(
          `${CONFIG.API_BASE_URL}/home/featured-stations`
        )
        .pipe(map((res) => res.data))
    );
  }

  /**
   * Carga sugerencias de búsqueda.
   * @returns Promise con array de sugerencias
   */
  async loadSearchSuggestions(): Promise<SearchSuggestion[]> {
    if (CONFIG.USE_MOCK_DATA) {
      const data = await this.loadMockData();
      return data.searchSuggestions;
    }
    if (!this.http) throw new Error("HttpClient not available");
    return firstValueFrom(
      this.http
        .get<ApiResponse<SearchSuggestion[]>>(
          `${CONFIG.API_BASE_URL}/search/suggestions`
        )
        .pipe(map((res) => res.data))
    );
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Carga datos desde mock JSON.
   * @private
   */
  private async loadMockData(): Promise<HomePageData> {
    const url = `${this.getBaseUrl()}${CONFIG.MOCK_PATH}/home-page.mock.json`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to load mock data: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  }

  /**
   * Carga datos desde API real (endpoint unificado).
   * @private
   */
  private async loadApiData(): Promise<HomePageData> {
    if (!this.http) throw new Error("HttpClient not available");
    return firstValueFrom(
      this.http
        .get<ApiResponse<HomePageData>>(`${CONFIG.API_BASE_URL}/home`)
        .pipe(map((res) => res.data))
    );
  }
}

/**
 * ==============================================
 * CÓMO CAMBIAR DE MOCK A API REAL
 * ==============================================
 *
 * 1. Cambiar CONFIG.USE_MOCK_DATA a false
 * 2. Configurar CONFIG.API_BASE_URL con tu endpoint (o usar environment.apiUrl)
 * 3. Asegurarse de que API devuelve contratos de home.models.ts
 * 4. Verificar que HttpClient esté configurado en app.config.ts
 * 5. Añadir interceptores si es necesario (auth, cache, error handling)
 *
 * Ejemplo de configuración con environment:
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
