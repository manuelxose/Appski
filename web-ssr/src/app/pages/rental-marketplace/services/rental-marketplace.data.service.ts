/**
 * Rental Marketplace Data Service
 *
 * SSR-safe service for rental marketplace page data.
 * Follows Angular 18+ patterns with inject() and signals.
 */

import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import {
  RentalMarketplacePageData,
  ApiResponse,
} from "../models/rental-marketplace.models";

const USE_MOCK_DATA = true;
const MOCK_PATH = "/assets/mocks/rental-marketplace";

@Injectable({
  providedIn: "root",
})
export class RentalMarketplaceDataService {
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
   * Load rental marketplace page data
   * @param stationSlug Optional station slug to filter results
   */
  async loadRentalMarketplacePageData(
    stationSlug?: string
  ): Promise<RentalMarketplacePageData> {
    if (USE_MOCK_DATA) {
      return this.loadFromMock(stationSlug);
    }

    // Future: Real API call
    const baseUrl = this.getBaseUrl();
    const url = stationSlug
      ? `${baseUrl}/api/rental-shops?station=${stationSlug}`
      : `${baseUrl}/api/rental-shops`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiResponse: ApiResponse<RentalMarketplacePageData> =
        await response.json();
      return apiResponse.data;
    } catch (error) {
      console.error("Error loading rental marketplace data:", error);
      // Fallback to mock
      return this.loadFromMock(stationSlug);
    }
  }

  /**
   * Load data from mock JSON files
   * @param stationSlug Optional station slug for filtered data
   */
  private async loadFromMock(
    stationSlug?: string
  ): Promise<RentalMarketplacePageData> {
    const baseUrl = this.getBaseUrl();
    const mockFile = `${baseUrl}${MOCK_PATH}/rental-marketplace-page.mock.json`;

    // Try station-specific mock first
    if (stationSlug) {
      try {
        const stationMockFile = `${baseUrl}${MOCK_PATH}/rental-marketplace-${stationSlug}.mock.json`;
        const response = await fetch(stationMockFile);
        if (response.ok) {
          const data: ApiResponse<RentalMarketplacePageData> =
            await response.json();
          return data.data;
        }
      } catch {
        // Continue to general mock
      }
    }

    // Load general mock
    try {
      const response = await fetch(mockFile);
      if (!response.ok) {
        throw new Error(`Mock file not found: ${mockFile}`);
      }
      const data: ApiResponse<RentalMarketplacePageData> =
        await response.json();

      // Filter by station if provided
      if (stationSlug && data.data.rentalShops) {
        const filteredShops = data.data.rentalShops.filter((shop) =>
          shop.nearStations.some((station) =>
            station.toLowerCase().includes(stationSlug.toLowerCase())
          )
        );
        return { ...data.data, rentalShops: filteredShops };
      }

      return data.data;
    } catch (error) {
      console.error("Error loading mock data:", error);
      throw error;
    }
  }

  /**
   * Get rental shop by ID
   */
  async getRentalShopById(id: string) {
    const pageData = await this.loadRentalMarketplacePageData();
    const shop = pageData.rentalShops.find((s) => s.id === id);
    if (!shop) {
      throw new Error(`Rental shop with id ${id} not found`);
    }
    return shop;
  }

  /**
   * Track shop view for analytics
   */
  trackShopView(shopId: string, shopName: string): void {
    if (!this.isBrowser) return;

    console.log("Track shop view:", {
      shopId,
      shopName,
      timestamp: new Date().toISOString(),
    });
    // Future: Send to analytics service
  }

  /**
   * Submit rental inquiry
   */
  async submitRentalInquiry(inquiryData: {
    shopId: string;
    equipmentType: string;
    startDate: string;
    endDate: string;
    customerEmail: string;
  }): Promise<void> {
    console.log("Submit rental inquiry:", inquiryData);
    // Future: API call to submit inquiry
  }
}
