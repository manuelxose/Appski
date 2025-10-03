import { Injectable, signal, PLATFORM_ID, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import {
  MeteoNow,
  MeteoForecast,
  WebcamItem,
  RadarInfo,
  WebcamHistory,
} from "../models/meteo.models";

/**
 * Servicio de acceso a datos meteorológicos
 * MVP: usa mocks locales
 * Producción: reemplazar fetch por HttpClient
 */
@Injectable({ providedIn: "root" })
export class MeteoDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private lang = signal<"es" | "en">("es");

  /**
   * Obtiene la URL base dependiendo del entorno (servidor o navegador)
   */
  private getBaseUrl(): string {
    if (this.isBrowser) {
      return window.location.origin;
    }
    // En SSR usamos localhost:4200 por defecto (dev server)
    return "http://localhost:4200";
  }

  /**
   * Obtiene observación actual de una estación
   * @param stationSlug - Slug de la estación (usado en producción con HTTP)
   */
  async getNow(stationSlug: string): Promise<MeteoNow> {
    try {
      // TODO: En producción usar: `${apiUrl}/v1/meteo/${stationSlug}/now`
      const url = `${this.getBaseUrl()}/assets/mocks/now.mock.json`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      // En producción: validar que data.stationSlug === stationSlug
      console.log(`Loaded meteo data for station: ${stationSlug}`);
      return data;
    } catch (error) {
      console.error("Error fetching meteo now:", error);
      throw error;
    }
  }

  /**
   * Obtiene previsión de 72h por cotas
   * @param stationSlug - Slug de la estación (usado en producción con HTTP)
   */
  async getForecast72(stationSlug: string): Promise<MeteoForecast> {
    try {
      // TODO: En producción usar: `${apiUrl}/v1/meteo/${stationSlug}/forecast?hours=72`
      const url = `${this.getBaseUrl()}/assets/mocks/forecast72.mock.json`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log(`Loaded forecast for station: ${stationSlug}`);
      return data;
    } catch (error) {
      console.error("Error fetching forecast:", error);
      throw error;
    }
  }

  /**
   * Obtiene lista de webcams de una estación
   * @param stationSlug - Slug de la estación (usado en producción con HTTP)
   */
  async getWebcams(stationSlug: string): Promise<WebcamItem[]> {
    try {
      // TODO: En producción usar: `${apiUrl}/v1/meteo/${stationSlug}/webcams`
      const url = `${this.getBaseUrl()}/assets/mocks/webcams.mock.json`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log(`Loaded webcams for station: ${stationSlug}`);
      return data;
    } catch (error) {
      console.error("Error fetching webcams:", error);
      throw error;
    }
  }

  /**
   * Obtiene información del radar meteorológico
   * @param stationSlug - Slug de la estación (usado en producción con HTTP)
   */
  async getRadar(stationSlug: string): Promise<RadarInfo> {
    try {
      // TODO: En producción usar: `${apiUrl}/v1/meteo/${stationSlug}/radar`
      const url = `${this.getBaseUrl()}/assets/mocks/radar.mock.json`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log(`Loaded radar for station: ${stationSlug}`);
      return data;
    } catch (error) {
      console.error("Error fetching radar:", error);
      throw error;
    }
  }

  /**
   * Obtiene histórico de imágenes de una webcam
   * @param stationSlug - Slug de la estación
   * @param webcamId - ID de la webcam
   * @param webcamName - Nombre de la webcam
   * @param date - Fecha en formato YYYY-MM-DD (opcional, por defecto hoy)
   */
  async getWebcamHistory(
    stationSlug: string,
    webcamId: string,
    webcamName: string,
    date?: string
  ): Promise<WebcamHistory> {
    try {
      // TODO: En producción usar: `${apiUrl}/v1/meteo/${stationSlug}/webcams/${webcamId}/history?date=${date}`

      const dateStr = date || this.getTodayDate();
      const baseUrl = this.getBaseUrl();

      // Intentar cargar mock específico por fecha
      const dateSpecificUrl = `${baseUrl}/assets/mocks/webcam-history-${dateStr}.mock.json`;

      console.log(`📅 Loading webcam history for date: ${dateStr}`);

      let data: WebcamHistory;

      // Primero intentar cargar el archivo específico de fecha
      try {
        const res = await fetch(dateSpecificUrl);
        if (res.ok) {
          data = await res.json();
          console.log(
            `✅ Loaded date-specific mock: webcam-history-${dateStr}.mock.json`
          );
        } else {
          throw new Error("Date-specific mock not found");
        }
      } catch {
        // Si no existe, usar el mock genérico como fallback
        console.log(`⚠️ Date-specific mock not found, using generic mock`);
        const fallbackUrl = `${baseUrl}/assets/mocks/webcam-history.mock.json`;
        const res = await fetch(fallbackUrl);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        data = await res.json();
      }

      // Sobrescribir el nombre con el de la webcam seleccionada
      data.webcamName = webcamName;
      data.webcamId = webcamId;

      return data;
    } catch (error) {
      console.error("Error fetching webcam history:", error);
      throw error;
    }
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  /**
   * Configura el idioma para las peticiones
   */
  setLanguage(lang: "es" | "en"): void {
    this.lang.set(lang);
  }

  /**
   * Obtiene el idioma actual
   */
  getLanguage(): "es" | "en" {
    return this.lang();
  }
}

/**
 * MIGRACIÓN A HTTP REAL:
 *
 * 1. Inyectar HttpClient:
 *    private readonly http = inject(HttpClient);
 *
 * 2. Reemplazar fetch por http.get:
 *    getNow(stationSlug: string): Observable<MeteoNow> {
 *      return this.http.get<MeteoNow>(`${environment.apiUrl}/v1/meteo/${stationSlug}/now`);
 *    }
 *
 * 3. Añadir parámetros query para idioma:
 *    const params = new HttpParams().set('lang', this.lang());
 *    return this.http.get<MeteoNow>(..., { params });
 *
 * 4. Configurar interceptor para:
 *    - Añadir headers de autenticación
 *    - Manejar caché con ETag
 *    - Reintentos automáticos
 *    - Manejo de errores global
 *
 * 5. Endpoints esperados:
 *    GET /v1/meteo/:station/now
 *    GET /v1/meteo/:station/forecast?hours=72
 *    GET /v1/meteo/:station/webcams
 *    GET /v1/meteo/:station/radar
 */
