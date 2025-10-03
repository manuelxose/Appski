/**
 * Lodging Marketplace Data Service
 *
 * SSR-safe service for loading lodging marketplace page data.
 * Follows Angular 18+ patterns with inject() and signals.
 */

import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import {
  LodgingMarketplacePageData,
  ApiResponse,
} from "../models/lodging-marketplace.models";

const USE_MOCK_DATA = true;
const MOCK_PATH = "/assets/mocks/lodging-marketplace";

@Injectable({
  providedIn: "root",
})
export class LodgingMarketplaceDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Get base URL for API/mock requests (SSR-safe)
   */
  private getBaseUrl(): string {
    if (this.isBrowser) {
      return window.location.origin;
    }
    // SSR fallback
    return "http://localhost:4200";
  }

  /**
   * Load complete lodging marketplace page data
   * @param stationSlug Optional station context
   */
  async loadLodgingMarketplacePageData(
    stationSlug?: string
  ): Promise<LodgingMarketplacePageData> {
    if (USE_MOCK_DATA) {
      return this.loadFromMock(stationSlug);
    }

    // Future: Real API call
    const baseUrl = this.getBaseUrl();
    const url = stationSlug
      ? `${baseUrl}/api/lodgings?station=${stationSlug}`
      : `${baseUrl}/api/lodgings`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiResponse: ApiResponse<LodgingMarketplacePageData> =
        await response.json();
      return apiResponse.data;
    } catch (error) {
      console.error("Error loading lodging marketplace data:", error);
      // Fallback to mock
      return this.loadFromMock(stationSlug);
    }
  }

  /**
   * Load data from mock JSON files
   */
  private async loadFromMock(
    stationSlug?: string
  ): Promise<LodgingMarketplacePageData> {
    const baseUrl = this.getBaseUrl();
    const mockFile = stationSlug
      ? `${baseUrl}${MOCK_PATH}/lodging-marketplace-${stationSlug}.mock.json`
      : `${baseUrl}${MOCK_PATH}/lodging-marketplace-page.mock.json`;

    try {
      const response = await fetch(mockFile);
      if (!response.ok) {
        // Try default if station-specific not found
        if (stationSlug) {
          const defaultResponse = await fetch(
            `${baseUrl}${MOCK_PATH}/lodging-marketplace-page.mock.json`
          );
          const data: ApiResponse<LodgingMarketplacePageData> =
            await defaultResponse.json();
          return data.data;
        }
        throw new Error(`Mock file not found: ${mockFile}`);
      }
      const data: ApiResponse<LodgingMarketplacePageData> =
        await response.json();
      return data.data;
    } catch (error) {
      console.error("Error loading mock data:", error);
      // Return empty data structure
      return {
        lodgings: [],
        lodgingTypes: [
          { value: "hotel", label: "Hotel", icon: "🏨" },
          { value: "apartment", label: "Apartamento", icon: "🏢" },
          { value: "hostel", label: "Hostal", icon: "🛏️" },
          { value: "rural", label: "Casa Rural", icon: "🏡" },
        ],
        services: [
          { value: "wifi", label: "WiFi", icon: "📶" },
          { value: "parking", label: "Parking", icon: "🅿️" },
          { value: "spa", label: "Spa", icon: "💆" },
          { value: "pool", label: "Piscina", icon: "🏊" },
          { value: "restaurant", label: "Restaurante", icon: "🍽️" },
          { value: "gym", label: "Gimnasio", icon: "💪" },
          { value: "ski-storage", label: "Guardaesquís", icon: "⛷️" },
          { value: "pets", label: "Mascotas", icon: "🐕" },
        ],
        sortOptions: [
          { value: "relevance", label: "Relevancia" },
          { value: "price-asc", label: "Precio: Menor a Mayor" },
          { value: "price-desc", label: "Precio: Mayor a Menor" },
          { value: "rating", label: "Mejor Valorados" },
          { value: "distance", label: "Más Cercanos" },
          { value: "popularity", label: "Más Populares" },
        ],
        priceStats: {
          min: 0,
          max: 500,
          average: 150,
        },
        meta: {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 20,
        },
      };
    }
  }

  /**
   * Get lodging by ID
   * Future: Navigate to lodging detail page
   */
  async getLodgingById(lodgingId: string): Promise<void> {
    console.log("Navigate to lodging detail:", lodgingId);
    // Future: Router navigation or data loading
  }

  /**
   * Track lodging view for analytics
   */
  trackLodgingView(lodgingId: string): void {
    console.log("Track lodging view:", lodgingId);
    // Future: Analytics call
  }

  /**
   * Submit booking inquiry
   */
  async submitBookingInquiry(lodgingId: string, data: unknown): Promise<void> {
    console.log("Submit booking inquiry:", lodgingId, data);
    // Future: API call
  }
}
