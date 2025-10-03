/**
 * Admin Stations Module - Type Definitions
 *
 * Interfaces y tipos para la gestión de estaciones de esquí
 */

/**
 * Ski Station interface (imported from meteo.models)
 */
export interface SkiStation {
  id: string;
  name: string;
  slug: string;
  status?: "open" | "closed" | "seasonal" | "maintenance";
  altitudes: {
    base: number;
    mid: number;
    top: number;
  };
  location?: {
    lat: number;
    lon: number;
    region: string;
    country: string;
  };
  pistes?: {
    total: number;
    open: number;
    green: number;
    blue: number;
    red: number;
    black: number;
  };
  lifts?: {
    total: number;
    open: number;
  };
  snowDepth?: {
    top: number;
    mid: number;
    base: number;
  };
  contact?: {
    phone: string;
    email: string;
    website: string;
  };
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Form data para crear/editar estaciones
 */
export interface StationFormData {
  id?: string;
  name: string;
  slug: string;
  status: "open" | "closed" | "seasonal" | "maintenance";
  altitudeBase: number;
  altitudeMid: number;
  altitudeTop: number;
  totalPistes: number;
  openPistes: number;
  description: string;
  phoneContact: string;
  emailContact: string;
}

/**
 * Estadísticas de estaciones
 */
export interface StationStats {
  total: number;
  open: number;
  closed: number;
  seasonal: number;
  maintenance: number;
}

/**
 * Station creation request
 */
export interface CreateStationRequest {
  name: string;
  slug: string;
  status: "open" | "closed" | "seasonal" | "maintenance";
  altitudes: {
    base: number;
    mid: number;
    top: number;
  };
  pistes?: {
    total: number;
    open: number;
  };
  contact?: {
    phone: string;
    email: string;
  };
  description?: string;
}

/**
 * Station update request
 */
export interface UpdateStationRequest {
  name?: string;
  status?: "open" | "closed" | "seasonal" | "maintenance";
  altitudes?: {
    base?: number;
    mid?: number;
    top?: number;
  };
  pistes?: {
    total?: number;
    open?: number;
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  description?: string;
}
