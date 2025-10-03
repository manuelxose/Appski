/**
 * Lodging Marketplace Models
 *
 * Type definitions for the lodging marketplace page following Angular 18+ patterns.
 * All models use strict typing with no 'any' types.
 */

/**
 * Lodging type enum
 */
export type LodgingType = "hotel" | "apartment" | "hostel" | "rural";

/**
 * Main lodging entity
 */
export interface Lodging {
  id: string;
  name: string;
  type: LodgingType;
  image: string;
  location: string;
  distanceToSlopes: number; // km
  pricePerNight: number;
  rating: number;
  reviewsCount: number;
  services: string[];
  hasOffer: boolean;
  offerPercentage?: number;
  freeCancellation: boolean;
  available: boolean;
}

/**
 * Filter configuration
 */
export interface LodgingFilters {
  types: string[];
  priceRange: {
    min: number;
    max: number;
  };
  services: string[];
  maxDistance: number;
  minRating: number;
}

/**
 * Sort options for lodgings
 */
export type SortOption =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "distance"
  | "popularity";

/**
 * View mode for displaying lodgings
 */
export type ViewMode = "grid" | "list" | "map";

/**
 * Lodging type configuration
 */
export interface LodgingTypeConfig {
  value: LodgingType;
  label: string;
  icon: string;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  value: string;
  label: string;
  icon: string;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  value: SortOption;
  label: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

/**
 * Station context for marketplace
 */
export interface StationContext {
  slug: string;
  name: string;
  location: string;
}

/**
 * Price range statistics
 */
export interface PriceStats {
  min: number;
  max: number;
  average: number;
}

/**
 * Complete page data structure
 */
export interface LodgingMarketplacePageData {
  lodgings: Lodging[];
  lodgingTypes: LodgingTypeConfig[];
  services: ServiceConfig[];
  sortOptions: SortConfig[];
  station?: StationContext;
  priceStats: PriceStats;
  meta: PaginationMeta;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  meta: PaginationMeta;
}
