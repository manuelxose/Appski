/**
 * Shop Detail Models
 *
 * Tipos y interfaces para la página de detalle de tienda de alquiler/venta de equipos.
 * Siguiendo Angular 18+ patterns y design system del proyecto Nieve.
 */

export interface RentalShop {
  id: number;
  slug: string;
  name: string;
  location: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  email: string;
  website: string;
  nearStations: string[];
  rating: number;
  reviewCount: number;
  priceRange: string;
  services: string[];
  offerType: "rental" | "sale" | "both";
  image: string;
  gallery: string[];
  distance: number;
  specialties: string[];
  availability: "high" | "medium" | "low";
  description: string;
  openingHours: string;
}

export interface EquipmentItem {
  id: number;
  name: string;
  category: "Esquís" | "Snowboard" | "Cascos" | "Ropa" | "Accesorios";
  subcategory?: string;
  pricePerDay?: number;
  salePrice?: number;
  offerType: "rental" | "sale" | "both";
  image: string;
  available: boolean;
  availableDates?: string[];
  description: string;
  brand: string;
  sizes?: string[];
  skiTypes?: string[];
  level?: string;
}

export interface BookingData {
  equipmentId: number;
  equipmentName: string;
  type: "rental" | "purchase";
  size?: string;
  skiType?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  totalPrice: number;
}

export type OfferTypeFilter = "rental" | "sale";
export type EquipmentCategory =
  | "all"
  | "Esquís"
  | "Snowboard"
  | "Cascos"
  | "Ropa"
  | "Accesorios";

export interface ShopDetailFilters {
  category: EquipmentCategory;
  offerType: OfferTypeFilter;
  showOnlyAvailable: boolean;
}
