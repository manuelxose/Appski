/**
 * Lodging Detail Models
 *
 * Type definitions for the lodging detail page following Angular 18+ patterns.
 * All models use strict typing with no 'any' types.
 */

/**
 * Lodging type enum
 */
export type LodgingType = "hotel" | "apartment" | "hostel" | "rural";

/**
 * Main lodging detail entity
 */
export interface LodgingDetail {
  id: string;
  name: string;
  type: LodgingType;
  image: string;
  images: string[]; // Gallery
  location: string;
  distanceToSlopes: number; // km
  pricePerNight: number;
  rating: number;
  reviewsCount: number;
  services: string[];
  description: string;
  hasOffer: boolean;
  offerPercentage?: number;
  freeCancellation: boolean;
  available: boolean;
  // Specific details
  capacity: number;
  bedrooms?: number;
  bathrooms?: number;
  area?: number; // m²
  checkIn: string;
  checkOut: string;
  policies: string[];
  nearbyAttractions: string[];
  cancellationPolicy: string;
}

/**
 * Gallery image
 */
export interface GalleryImage {
  url: string;
  alt: string;
  type:
    | "exterior"
    | "interior"
    | "bedroom"
    | "bathroom"
    | "kitchen"
    | "amenity"
    | "view";
}

/**
 * Amenity/Service configuration
 */
export interface AmenityConfig {
  value: string;
  label: string;
  icon: string;
  category: "basic" | "comfort" | "entertainment" | "safety" | "accessibility";
}

/**
 * Policy item
 */
export interface Policy {
  id: string;
  title: string;
  description: string;
  type: "rule" | "requirement" | "restriction";
}

/**
 * Nearby attraction
 */
export interface NearbyAttraction {
  name: string;
  distance: number; // km
  type: "ski-resort" | "viewpoint" | "restaurant" | "supermarket" | "other";
}

/**
 * Booking information
 */
export interface BookingInfo {
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  nights: number;
  subtotal: number;
  cleaningFee?: number;
  serviceFee?: number;
  taxes?: number;
  discount?: number;
  total: number;
}

/**
 * Price breakdown
 */
export interface PriceBreakdown {
  pricePerNight: number;
  nights: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  discount: number;
  total: number;
}

/**
 * Review summary
 */
export interface ReviewSummary {
  overall: number;
  cleanliness: number;
  location: number;
  valueForMoney: number;
  service: number;
  facilities: number;
  totalReviews: number;
}

/**
 * Host information
 */
export interface Host {
  id: string;
  name: string;
  avatar?: string;
  joinedDate: string;
  responseRate?: number;
  responseTime?: string; // e.g., "within 1 hour"
  isSuperhost?: boolean;
  totalListings?: number;
}

/**
 * Complete page data structure
 */
export interface LodgingDetailPageData {
  lodging: LodgingDetail;
  amenities: AmenityConfig[];
  host?: Host;
  reviewSummary?: ReviewSummary;
  relatedLodgings?: LodgingDetail[];
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    version: string;
  };
}
