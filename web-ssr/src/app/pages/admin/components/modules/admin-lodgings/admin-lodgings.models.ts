/**
 * Admin Lodgings Module - Type Definitions
 *
 * Interfaces y tipos para la gestión de alojamientos
 */

/**
 * Lodging type
 */
export type LodgingType = "hotel" | "apartment" | "hostel" | "rural" | "chalet";

/**
 * Lodging status
 */
export type LodgingStatus =
  | "active"
  | "inactive"
  | "maintenance"
  | "pending_approval";

/**
 * Room type
 */
export type RoomType =
  | "single"
  | "double"
  | "triple"
  | "suite"
  | "apartment"
  | "family";

/**
 * Lodging owner details
 */
export interface LodgingOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  commissionRate: number; // Percentage (e.g., 15)
  registeredAt?: string;
}

/**
 * Lodging statistics
 */
export interface LodgingStats {
  totalBookings: number;
  revenue: number;
  occupancyRate: number; // 0-100
  avgResponseTime: number; // hours
  lastBooking: string;
  monthlyRevenue?: number;
  avgRating?: number;
}

/**
 * Lodging interface
 */
export interface Lodging {
  id: string;
  name: string;
  type: LodgingType;
  station: string;
  stationName: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  rating: number;
  totalReviews: number;
  totalRooms: number;
  availableRooms: number;
  priceFrom: number;
  amenities: string[];
  images: string[];
  featured: boolean;
  status: LodgingStatus;
  owner: LodgingOwner;
  stats: LodgingStats;
  createdAt: string;
  updatedAt: string;
  description?: string;
  checkInTime?: string;
  checkOutTime?: string;
  cancellationPolicy?: string;
}

/**
 * Room details
 */
export interface Room {
  id: string;
  lodgingId: string;
  name: string;
  type: RoomType;
  capacity: number;
  beds: number;
  bathrooms: number;
  size: number; // m²
  price: number;
  amenities: string[];
  images: string[];
  available: boolean;
  description?: string;
}

/**
 * Form data para crear/editar alojamientos
 */
export interface LodgingFormData {
  id?: string;
  name: string;
  type: LodgingType;
  station: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  totalRooms: number;
  priceFrom: number;
  amenities: string[];
  featured: boolean;
  status: LodgingStatus;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  commissionRate: number;
  description?: string;
}

/**
 * Lodging creation request
 */
export interface CreateLodgingRequest {
  name: string;
  type: LodgingType;
  station: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  totalRooms: number;
  priceFrom: number;
  amenities?: string[];
  featured?: boolean;
  owner: {
    name: string;
    email: string;
    phone: string;
    commissionRate: number;
  };
  description?: string;
}

/**
 * Lodging update request
 */
export interface UpdateLodgingRequest {
  name?: string;
  type?: LodgingType;
  address?: string;
  phone?: string;
  email?: string;
  totalRooms?: number;
  availableRooms?: number;
  priceFrom?: number;
  amenities?: string[];
  featured?: boolean;
  status?: LodgingStatus;
  description?: string;
}
