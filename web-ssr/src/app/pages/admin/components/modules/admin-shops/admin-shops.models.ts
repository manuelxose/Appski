/**
 * Admin Shops Module - Type Definitions
 *
 * Interfaces y tipos para la gestión de tiendas de alquiler/retail
 */

/**
 * Shop type
 */
export type ShopType = "rental" | "retail" | "rental_retail";

/**
 * Shop status
 */
export type ShopStatus =
  | "active"
  | "inactive"
  | "maintenance"
  | "pending_approval";

/**
 * Equipment category
 */
export type EquipmentCategory =
  | "skis"
  | "snowboard"
  | "boots"
  | "poles"
  | "helmet"
  | "goggles"
  | "clothing"
  | "snowshoes"
  | "backpack"
  | "arva"
  | "shovel"
  | "probe"
  | "crampons"
  | "ice_axe";

/**
 * Equipment condition
 */
export type EquipmentCondition = "excellent" | "good" | "fair" | "poor";

/**
 * Equipment status
 */
export type EquipmentStatus =
  | "available"
  | "rented"
  | "maintenance"
  | "retired";

/**
 * Shop owner details
 */
export interface ShopOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  commissionRate: number; // Percentage (e.g., 12)
  registeredAt?: string;
}

/**
 * Shop statistics
 */
export interface ShopStats {
  totalRentals: number;
  revenue: number;
  avgRating: number;
  inventoryValue: number;
  lastRental: string;
  monthlyRevenue?: number;
  totalReviews?: number;
}

/**
 * Opening hours per day
 */
export interface DayHours {
  open: string;
  close: string;
  closed?: boolean;
}

/**
 * Weekly opening hours
 */
export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

/**
 * Shop interface
 */
export interface Shop {
  id: string;
  name: string;
  station: string;
  stationName: string;
  type: ShopType;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  rating: number;
  totalReviews: number;
  featured: boolean;
  status: ShopStatus;
  owner: ShopOwner;
  stats: ShopStats;
  openingHours: OpeningHours;
  services: string[];
  createdAt: string;
  updatedAt: string;
  description?: string;
  images?: string[];
}

/**
 * Inventory item
 */
export interface InventoryItem {
  id: string;
  shopId: string;
  category: EquipmentCategory;
  brand: string;
  model: string;
  size: string;
  condition: EquipmentCondition;
  status: EquipmentStatus;
  purchaseDate: string;
  purchasePrice: number;
  rentalPricePerDay: number;
  quantity: number;
  quantityAvailable: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  notes?: string;
}

/**
 * Form data para crear/editar tiendas
 */
export interface ShopFormData {
  id?: string;
  name: string;
  station: string;
  type: ShopType;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  website: string;
  featured: boolean;
  status: ShopStatus;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  commissionRate: number;
  services: string[];
  description?: string;
}

/**
 * Shop creation request
 */
export interface CreateShopRequest {
  name: string;
  station: string;
  type: ShopType;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  website?: string;
  featured?: boolean;
  owner: {
    name: string;
    email: string;
    phone: string;
    commissionRate: number;
  };
  services?: string[];
  description?: string;
}

/**
 * Shop update request
 */
export interface UpdateShopRequest {
  name?: string;
  type?: ShopType;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  featured?: boolean;
  status?: ShopStatus;
  services?: string[];
  description?: string;
}

/**
 * Inventory item creation request
 */
export interface CreateInventoryRequest {
  category: EquipmentCategory;
  brand: string;
  model: string;
  size: string;
  condition: EquipmentCondition;
  purchaseDate: string;
  purchasePrice: number;
  rentalPricePerDay: number;
  quantity: number;
}
