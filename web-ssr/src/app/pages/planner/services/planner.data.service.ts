import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { isPlatformBrowser } from "@angular/common";
import {
  PlannerPageData,
  SavedPlan,
  ApiResponse,
} from "../models/planner.models";

/**
 * ==============================================
 * PLANNER DATA SERVICE
 * ==============================================
 * Servicio para cargar datos iniciales del planificador.
 * Estrategia: Mock-first con flag USE_MOCK_DATA.
 *
 * Nota: Los planes guardados se gestionan con localStorage
 * en el componente principal por ser datos del cliente.
 */
@Injectable({
  providedIn: "root",
})
export class PlannerDataService {
  private readonly USE_MOCK_DATA = true;
  private readonly http = this.USE_MOCK_DATA ? null : inject(HttpClient);
  private readonly MOCK_PATH = "/assets/mocks/planner";
  private readonly API_URL = "/api/v1/planner";
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private getBaseUrl(): string {
    if (this.isBrowser && typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:4200";
  }

  /**
   * Carga los datos iniciales del planificador.
   * Incluye estaciones, recomendaciones y opciones predeterminadas.
   */
  async loadInitialData(): Promise<PlannerPageData> {
    if (this.USE_MOCK_DATA) {
      return this.loadFromMock();
    } else {
      return this.loadFromAPI();
    }
  }

  /**
   * Carga desde archivo mock.
   */
  private async loadFromMock(): Promise<PlannerPageData> {
    const baseUrl = this.getBaseUrl();
    try {
      const response = await fetch(
        `${baseUrl}${this.MOCK_PATH}/planner-initial-data.mock.json`
      );
      if (!response.ok) {
        throw new Error("Failed to load planner mock data");
      }
      const json: ApiResponse<PlannerPageData> = await response.json();
      return json.data;
    } catch (error) {
      console.error("Error loading planner mock:", error);
      // Devolver datos por defecto en caso de error
      return this.getDefaultData();
    }
  }

  /**
   * Carga desde API real.
   */
  private async loadFromAPI(): Promise<PlannerPageData> {
    if (!this.http) {
      throw new Error("HttpClient not available");
    }

    try {
      const response = await this.http
        .get<ApiResponse<PlannerPageData>>(`${this.API_URL}/initial-data`)
        .toPromise();

      if (!response?.data) {
        throw new Error("Invalid API response");
      }

      return response.data;
    } catch (error) {
      console.error("Error loading planner from API:", error);
      throw new Error("Failed to load planner data");
    }
  }

  /**
   * Datos por defecto en caso de error.
   */
  private getDefaultData(): PlannerPageData {
    return {
      savedPlans: [],
      stations: [],
      defaultRecommendations: [
        "Reserva con al menos 2 semanas de antelación para mejores precios",
        "Consulta el parte de nieve 24h antes de tu viaje",
        "Considera contratar seguro de esquí para mayor tranquilidad",
      ],
      defaultLodgingOptions: [],
      defaultEquipmentChecklist: [
        { name: "Ropa térmica", icon: "🧥", required: true },
        { name: "Gafas de sol/nieve", icon: "🕶️", required: true },
        { name: "Protector solar", icon: "🧴", required: true },
        { name: "Guantes", icon: "🧤", required: true },
        { name: "Gorro", icon: "🎩", required: true },
        { name: "Forfait", icon: "🎫", required: false },
        { name: "Botiquín", icon: "💊", required: false },
        { name: "Cámara", icon: "📸", required: false },
      ],
    };
  }

  /**
   * Gestión de planes guardados en localStorage.
   * Estos métodos son helpers para el componente.
   */

  loadSavedPlansFromStorage(): SavedPlan[] {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return [];
    }

    try {
      const stored = localStorage.getItem("trip-plans");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  savePlansToStorage(plans: SavedPlan[]): void {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    try {
      localStorage.setItem("trip-plans", JSON.stringify(plans));
    } catch (error) {
      console.error("Error saving plans to localStorage:", error);
    }
  }
}
