/**
 * Lodging Detail Data Service
 *
 * SSR-safe service for lodging detail page data.
 * Follows Angular 18+ patterns with inject() and signals.
 */

import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import {
  LodgingDetailPageData,
  AmenityConfig,
  ApiResponse,
} from "../models/lodging-detail.models";

const USE_MOCK_DATA = true;
const MOCK_PATH = "/assets/mocks/lodging-detail";

@Injectable({
  providedIn: "root",
})
export class LodgingDetailDataService {
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
   * Load lodging detail by slug
   * @param slug Lodging slug or ID
   */
  async loadLodgingDetailBySlug(slug: string): Promise<LodgingDetailPageData> {
    if (USE_MOCK_DATA) {
      return this.loadFromMock(slug);
    }

    // Future: Real API call
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}/api/lodgings/${slug}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const apiResponse: ApiResponse<LodgingDetailPageData> =
        await response.json();
      return apiResponse.data;
    } catch (error) {
      console.error("Error loading lodging detail:", error);
      // Fallback to mock
      return this.loadFromMock(slug);
    }
  }

  /**
   * Load data from mock JSON files
   * Strategy 1: Try specific mock file
   * Strategy 2: Generate from marketplace data
   * Strategy 3: Return default fallback
   */
  private async loadFromMock(slug: string): Promise<LodgingDetailPageData> {
    const baseUrl = this.getBaseUrl();

    // Strategy 1: Try specific mock file (for featured lodgings)
    try {
      const mockFile = `${baseUrl}${MOCK_PATH}/lodging-detail-${slug}.mock.json`;
      const response = await fetch(mockFile);
      if (response.ok) {
        const data: ApiResponse<LodgingDetailPageData> = await response.json();
        return data.data;
      }
    } catch {
      // Continue to strategy 2
    }

    // Strategy 2: Generate from marketplace data
    try {
      const marketplaceFile = `${baseUrl}/assets/mocks/lodging-marketplace/lodging-marketplace-page.mock.json`;
      const marketplaceResponse = await fetch(marketplaceFile);
      if (marketplaceResponse.ok) {
        const marketplaceData = await marketplaceResponse.json();
        const lodging = marketplaceData.data.lodgings.find(
          (l: { id: string }) => l.id === slug
        );
        if (lodging) {
          return this.generateLodgingDetail(lodging);
        }
      }
    } catch (error) {
      console.error("Error loading from marketplace:", error);
    }

    // Strategy 3: Return default fallback
    return this.getDefaultLodgingDetail(slug);
  }

  /**
   * Generate full lodging detail from marketplace data
   */
  private generateLodgingDetail(lodging: {
    id: string;
    name: string;
    type: "hotel" | "apartment" | "hostel" | "rural";
    image: string;
    location: string;
    distanceToSlopes: number;
    pricePerNight: number;
    rating: number;
    reviewsCount: number;
    services: string[];
    hasOffer: boolean;
    offerPercentage?: number;
    freeCancellation: boolean;
    available: boolean;
  }): LodgingDetailPageData {
    // Generate 5 gallery images
    const images = [
      lodging.image,
      lodging.image.replace("?w=800", "?w=1200&fm=jpg&fit=crop&crop=entropy"),
      lodging.image.replace("?w=800", "?w=1200&fm=jpg&fit=crop&crop=top"),
      lodging.image.replace("?w=800", "?w=1200&fm=jpg&fit=crop&crop=bottom"),
      lodging.image.replace("?w=800", "?w=1200&fm=jpg&fit=crop&crop=left"),
    ];

    // Generate description based on type
    let description = "";
    switch (lodging.type) {
      case "hotel":
        description = `Elegante hotel situado en ${lodging.location}, a solo ${lodging.distanceToSlopes} km de las pistas. Con una valoración de ${lodging.rating} estrellas y ${lodging.reviewsCount} opiniones positivas, ofrece todas las comodidades para una estancia perfecta en la montaña. Instalaciones modernas, servicio excepcional y ubicación privilegiada.`;
        break;
      case "apartment":
        description = `Apartamento completamente equipado en ${lodging.location}, ideal para familias o grupos. A ${lodging.distanceToSlopes} km de las pistas de esquí. Cuenta con ${lodging.reviewsCount} opiniones con una puntuación de ${lodging.rating}/5. Cocina completa, espacios amplios y todas las comodidades para tu estancia.`;
        break;
      case "hostel":
        description = `Hostal acogedor en ${lodging.location}, perfecto para viajeros que buscan una opción económica sin renunciar a la comodidad. A ${lodging.distanceToSlopes} km de las pistas. Valorado con ${lodging.rating}/5 por ${lodging.reviewsCount} huéspedes. Ambiente familiar y excelente relación calidad-precio.`;
        break;
      case "rural":
        description = `Encantadora casa rural en ${lodging.location}, perfecta para desconectar y disfrutar de la naturaleza. A ${lodging.distanceToSlopes} km de las pistas de esquí. Con ${lodging.reviewsCount} opiniones y ${lodging.rating}/5 estrellas. Combina el encanto tradicional con comodidades modernas. Vistas espectaculares y tranquilidad garantizada.`;
        break;
    }

    // Generate capacity based on type
    const capacity =
      lodging.type === "hotel"
        ? 2
        : lodging.type === "hostel"
        ? 4
        : lodging.type === "apartment"
        ? 4
        : 6;
    const bedrooms =
      lodging.type === "hotel"
        ? undefined
        : lodging.type === "hostel"
        ? 1
        : lodging.type === "apartment"
        ? 2
        : 3;
    const bathrooms =
      lodging.type === "hotel" ? 1 : lodging.type === "hostel" ? 1 : 2;
    const area =
      lodging.type === "hotel"
        ? 35
        : lodging.type === "hostel"
        ? 25
        : lodging.type === "apartment"
        ? 80
        : 120;

    const detailedLodging = {
      ...lodging,
      images,
      description,
      capacity,
      bedrooms,
      bathrooms,
      area,
      checkIn: "15:00",
      checkOut: "11:00",
      policies: [
        "No se permiten fiestas ni eventos",
        "No fumar en el interior",
        "Respetar el horario de silencio (22:00 - 08:00)",
        lodging.type === "hotel" || lodging.type === "rural"
          ? "Depósito de seguridad: 200€"
          : "Depósito de seguridad: 100€",
      ],
      nearbyAttractions: [
        `Pistas de esquí - ${lodging.distanceToSlopes} km`,
        "Supermercado - 1 km",
        "Restaurantes - 500 m",
        "Centro del pueblo - 2 km",
      ],
      cancellationPolicy:
        "Cancelación gratuita hasta 7 días antes de la llegada. Después se aplica un cargo del 50% del total de la reserva.",
    };

    return {
      lodging: detailedLodging,
      amenities: this.getDefaultAmenities(),
      host: {
        id: "host-001",
        name: "María González",
        avatar: "https://i.pravatar.cc/150?img=45",
        joinedDate: "2020-01-15",
        responseRate: 95,
        responseTime: "dentro de 2 horas",
        isSuperhost: lodging.rating >= 4.5,
        totalListings: 3,
      },
      reviewSummary: {
        overall: lodging.rating,
        cleanliness: Math.min(5, lodging.rating + 0.1),
        location: Math.min(5, lodging.rating - 0.1),
        valueForMoney: Math.min(5, lodging.rating - 0.2),
        service: lodging.rating,
        facilities: Math.min(5, lodging.rating + 0.05),
        totalReviews: lodging.reviewsCount,
      },
    };
  }

  /**
   * Get default lodging detail (fallback)
   */
  private getDefaultLodgingDetail(slug: string): LodgingDetailPageData {
    return {
      lodging: {
        id: slug,
        name: "Alojamiento no encontrado",
        type: "hotel",
        image:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 400'%3E%3Crect fill='%23E2E8F0' width='800' height='400'/%3E%3Ctext fill='%23475569' font-family='Arial' font-size='24' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo disponible%3C/text%3E%3C/svg%3E",
        images: [],
        location: "No disponible",
        distanceToSlopes: 0,
        pricePerNight: 0,
        rating: 0,
        reviewsCount: 0,
        services: [],
        description: "Este alojamiento no está disponible actualmente.",
        hasOffer: false,
        freeCancellation: false,
        available: false,
        capacity: 0,
        checkIn: "15:00",
        checkOut: "11:00",
        policies: [],
        nearbyAttractions: [],
        cancellationPolicy: "No disponible",
      },
      amenities: this.getDefaultAmenities(),
    };
  }

  /**
   * Get default amenities configuration
   */
  private getDefaultAmenities(): AmenityConfig[] {
    return [
      { value: "wifi", label: "WiFi gratuito", icon: "📶", category: "basic" },
      {
        value: "parking",
        label: "Parking gratuito",
        icon: "🅿️",
        category: "basic",
      },
      {
        value: "spa",
        label: "Spa y wellness",
        icon: "💆",
        category: "comfort",
      },
      { value: "pool", label: "Piscina", icon: "🏊", category: "comfort" },
      {
        value: "restaurant",
        label: "Restaurante",
        icon: "🍽️",
        category: "comfort",
      },
      { value: "gym", label: "Gimnasio", icon: "💪", category: "comfort" },
      {
        value: "ski-storage",
        label: "Guardaesquís",
        icon: "⛷️",
        category: "basic",
      },
      {
        value: "pets",
        label: "Admite mascotas",
        icon: "🐕",
        category: "basic",
      },
    ];
  }

  /**
   * Check availability for dates
   */
  async checkAvailability(
    lodgingId: string,
    checkIn: string,
    checkOut: string
  ): Promise<boolean> {
    console.log("Check availability:", { lodgingId, checkIn, checkOut });
    // Future: API call to check availability
    return true;
  }

  /**
   * Calculate price for booking
   */
  calculateBookingPrice(
    pricePerNight: number,
    checkIn: string,
    checkOut: string
  ): {
    nights: number;
    subtotal: number;
    cleaningFee: number;
    serviceFee: number;
    taxes: number;
    total: number;
  } {
    if (!checkIn || !checkOut) {
      return {
        nights: 0,
        subtotal: 0,
        cleaningFee: 0,
        serviceFee: 0,
        taxes: 0,
        total: 0,
      };
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const nights = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const subtotal = nights * pricePerNight;
    const cleaningFee = 25; // Fixed fee
    const serviceFee = subtotal * 0.15; // 15% service fee
    const taxes = (subtotal + cleaningFee + serviceFee) * 0.1; // 10% tax
    const total = subtotal + cleaningFee + serviceFee + taxes;

    return {
      nights,
      subtotal,
      cleaningFee,
      serviceFee,
      taxes,
      total,
    };
  }

  /**
   * Submit booking request
   */
  async submitBooking(bookingData: {
    lodgingId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
  }): Promise<void> {
    console.log("Submit booking:", bookingData);
    // Future: API call to submit booking
  }
}
