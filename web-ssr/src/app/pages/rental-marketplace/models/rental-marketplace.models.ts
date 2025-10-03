/**
 * Rental Marketplace Models
 *
 * Type definitions for rental shop marketplace page data.
 */

/**
 * Equipment type available for rent
 */
export type EquipmentType =
  | "ski"
  | "snowboard"
  | "snowshoes"
  | "sleds"
  | "thermal-clothing"
  | "helmets"
  | "goggles"
  | "accessories";

/**
 * Availability level of rental shop
 */
export type AvailabilityLevel = "high" | "medium" | "low";

/**
 * Rental shop in the marketplace
 */
export interface RentalShop {
  id: string;
  slug: string;
  name: string;
  location: string;
  address: string;
  lat: number;
  lng: number;
  nearStations: string[];
  rating: number;
  reviewCount: number;
  priceRange: string;
  services: string[];
  image: string;
  distance: number;
  specialties: string[];
  availability: AvailabilityLevel;
}

/**
 * Filter state for rental shops
 */
export interface RentalFilters {
  station: string;
  zone: string;
  equipmentType: string;
  priceRange: string;
  rating: number;
  availability: AvailabilityLevel | "";
}

/**
 * Configuration for station filter
 */
export interface StationConfig {
  value: string;
  label: string;
  region: string;
}

/**
 * Configuration for zone/city filter
 */
export interface ZoneConfig {
  value: string;
  label: string;
  type: "mountain" | "city";
}

/**
 * Configuration for equipment type filter
 */
export interface EquipmentTypeConfig {
  value: EquipmentType;
  label: string;
  icon: string;
}

/**
 * Configuration for price range filter
 */
export interface PriceRangeConfig {
  value: string;
  label: string;
  min: number;
  max: number;
}

/**
 * Configuration for availability filter
 */
export interface AvailabilityConfig {
  value: AvailabilityLevel;
  label: string;
  color: string;
}

/**
 * Sort options for rental shops
 */
export type SortOption =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "distance"
  | "availability";

/**
 * Sort configuration
 */
export interface SortConfig {
  value: SortOption;
  label: string;
}

/**
 * View mode for shop display
 */
export type ViewMode = "grid" | "list" | "map";

/**
 * Station context (if marketplace is filtered by station)
 */
export interface StationContext {
  slug: string;
  name: string;
  region: string;
  nearbyShops: number;
}

/**
 * Price statistics for all shops
 */
export interface PriceStats {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  currency: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Complete page data for rental marketplace
 */
export interface RentalMarketplacePageData {
  rentalShops: RentalShop[];
  stations: StationConfig[];
  zones: ZoneConfig[];
  equipmentTypes: EquipmentTypeConfig[];
  priceRanges: PriceRangeConfig[];
  availabilityLevels: AvailabilityConfig[];
  sortOptions: SortConfig[];
  station?: StationContext;
  priceStats: PriceStats;
  meta: PaginationMeta;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
