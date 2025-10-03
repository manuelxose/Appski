import { Injectable, signal, computed } from "@angular/core";
import type {
  RentalShop,
  EquipmentItem,
  ShopDetailFilters,
  EquipmentCategory,
  OfferTypeFilter,
} from "../models/shop-detail.models";

/**
 * ShopDetailService
 *
 * Servicio para gestionar datos de tienda de alquiler/venta de equipos.
 * Usa signals para estado reactivo siguiendo Angular 18+ patterns.
 */
@Injectable({
  providedIn: "root",
})
export class ShopDetailService {
  // State signals
  private shop = signal<RentalShop | null>(null);
  private allEquipment = signal<EquipmentItem[]>([]);
  private filters = signal<ShopDetailFilters>({
    category: "all",
    offerType: "rental",
    showOnlyAvailable: false,
  });

  // Public computed signals
  readonly currentShop = this.shop.asReadonly();
  readonly equipment = this.allEquipment.asReadonly();
  readonly currentFilters = this.filters.asReadonly();

  // Filtered equipment based on current filters
  readonly filteredEquipment = computed(() => {
    const items = this.allEquipment();
    const { category, offerType, showOnlyAvailable } = this.filters();

    return items.filter((item) => {
      // Filter by offer type
      const offerTypeMatch =
        (offerType === "rental" &&
          (item.offerType === "rental" || item.offerType === "both") &&
          item.pricePerDay !== undefined) ||
        (offerType === "sale" &&
          (item.offerType === "sale" || item.offerType === "both") &&
          item.salePrice !== undefined);

      // Filter by category
      const categoryMatch = category === "all" || item.category === category;

      // Filter by availability
      const availabilityMatch = !showOnlyAvailable || item.available;

      return offerTypeMatch && categoryMatch && availabilityMatch;
    });
  });

  // Available categories
  readonly categories = computed(() => {
    const cats = new Set(this.allEquipment().map((item) => item.category));
    return Array.from(cats);
  });

  // Statistics
  readonly stats = computed(() => {
    const filtered = this.filteredEquipment();
    const offerType = this.filters().offerType;

    const prices = filtered.map((item) =>
      offerType === "rental" ? item.pricePerDay || 0 : item.salePrice || 0
    );

    return {
      totalCount: filtered.length,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
      availableCount: filtered.filter((item) => item.available).length,
    };
  });

  /**
   * Load shop data by slug from mock JSON
   */
  async loadShop(slug: string): Promise<boolean> {
    try {
      const response = await fetch("/assets/mocks/shop-detail.mock.json");
      const data = await response.json();

      const foundShop = data.shops.find((s: RentalShop) => s.slug === slug);

      if (foundShop) {
        this.shop.set(foundShop);
        this.allEquipment.set(data.equipment);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error loading shop data:", error);
      return false;
    }
  }

  /**
   * Update filter category
   */
  setCategory(category: EquipmentCategory): void {
    this.filters.update((f) => ({ ...f, category }));
  }

  /**
   * Update filter offer type (rental vs sale)
   */
  setOfferType(offerType: OfferTypeFilter): void {
    this.filters.update((f) => ({ ...f, offerType }));
  }

  /**
   * Toggle availability filter
   */
  toggleAvailability(): void {
    this.filters.update((f) => ({
      ...f,
      showOnlyAvailable: !f.showOnlyAvailable,
    }));
  }

  /**
   * Get equipment count by category
   */
  getCountByCategory(category: string): number {
    const items = this.allEquipment();
    const { offerType, showOnlyAvailable } = this.filters();

    return items.filter((item) => {
      const offerTypeMatch =
        (offerType === "rental" &&
          (item.offerType === "rental" || item.offerType === "both") &&
          item.pricePerDay !== undefined) ||
        (offerType === "sale" &&
          (item.offerType === "sale" || item.offerType === "both") &&
          item.salePrice !== undefined);
      const categoryMatch = item.category === category;
      const availabilityMatch = !showOnlyAvailable || item.available;

      return offerTypeMatch && categoryMatch && availabilityMatch;
    }).length;
  }

  /**
   * Reset filters to default
   */
  resetFilters(): void {
    this.filters.set({
      category: "all",
      offerType: "rental",
      showOnlyAvailable: false,
    });
  }

  /**
   * Clear all data (useful for cleanup)
   */
  clear(): void {
    this.shop.set(null);
    this.allEquipment.set([]);
    this.resetFilters();
  }
}
