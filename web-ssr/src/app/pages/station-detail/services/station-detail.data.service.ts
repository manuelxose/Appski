import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { isPlatformBrowser } from "@angular/common";
import {
  StationDetailPageData,
  ApiResponse,
} from "../models/station-detail.models";

/**
 * ==============================================
 * STATION DETAIL DATA SERVICE
 * ==============================================
 * Servicio para cargar datos de detalle de estación.
 * Estrategia: Mock-first con flag USE_MOCK_DATA.
 */
@Injectable({
  providedIn: "root",
})
export class StationDetailDataService {
  private readonly USE_MOCK_DATA = true;
  private readonly http = this.USE_MOCK_DATA ? null : inject(HttpClient);
  private readonly MOCK_PATH = "/assets/mocks/station-detail";
  private readonly API_URL = "/api/v1/stations";
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private getBaseUrl(): string {
    if (this.isBrowser && typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:4200";
  }

  /**
   * Carga los datos completos de una estación.
   * @param slug - Slug de la estación (ej: 'baqueira-beret')
   */
  async loadStationDetail(slug: string): Promise<StationDetailPageData> {
    if (this.USE_MOCK_DATA) {
      return this.loadFromMock(slug);
    } else {
      return this.loadFromAPI(slug);
    }
  }

  /**
   * Carga desde archivo mock.
   */
  private async loadFromMock(slug: string): Promise<StationDetailPageData> {
    const baseUrl = this.getBaseUrl();
    try {
      // Intenta cargar mock específico de la estación
      const response = await fetch(
        `${baseUrl}${this.MOCK_PATH}/${slug}.mock.json`
      );
      if (!response.ok) {
        // Si no existe, carga el mock por defecto
        console.warn(`Mock for ${slug} not found, loading default`);
        const fallbackResponse = await fetch(
          `${baseUrl}${this.MOCK_PATH}/baqueira-beret.mock.json`
        );
        const json: ApiResponse<StationDetailPageData> =
          await fallbackResponse.json();
        return json.data;
      }
      const json: ApiResponse<StationDetailPageData> = await response.json();
      return json.data;
    } catch (error) {
      console.error("Error loading station detail mock:", error);
      throw new Error("Failed to load station detail data");
    }
  }

  /**
   * Carga desde API real.
   */
  private async loadFromAPI(slug: string): Promise<StationDetailPageData> {
    if (!this.http) {
      throw new Error("HttpClient not available");
    }

    try {
      const response = await this.http
        .get<ApiResponse<StationDetailPageData>>(`${this.API_URL}/${slug}`)
        .toPromise();

      if (!response?.data) {
        throw new Error("Invalid API response");
      }

      return response.data;
    } catch (error) {
      console.error("Error loading station detail from API:", error);
      throw new Error("Failed to load station detail data");
    }
  }
}
