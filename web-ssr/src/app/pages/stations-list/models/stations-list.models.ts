/**
 * ==============================================
 * STATIONS LIST PAGE - DATA CONTRACTS
 * ==============================================
 * Interfaces for Stations List page and components.
 * Shared between Mock and API responses.
 */

// ==================== STATION ====================

/**
 * Estado de apertura de una estación.
 */
export type StationStatus = "open" | "closed" | "seasonal" | "maintenance";

/**
 * Tipo de estación de esquí.
 */
export type StationType = "alpine" | "nordic" | "freeride" | "family";

/**
 * Región geográfica de España.
 */
export type Region =
  | "pyrenees"
  | "sierra-nevada"
  | "sistema-central"
  | "cordillera-cantabrica"
  | "sistema-iberico";

/**
 * Servicios disponibles en una estación.
 */
export type StationService =
  | "ski-school"
  | "equipment-rental"
  | "restaurant"
  | "parking"
  | "kids-area"
  | "snow-park";

/**
 * Estación de esquí completa para el listado.
 * @example {
 *   id: '1',
 *   slug: 'baqueira-beret',
 *   name: 'Baqueira Beret',
 *   region: 'pyrenees',
 *   location: 'Val d\'Aran, Lleida',
 *   status: 'open',
 *   snowBase: 120,
 *   snowTop: 180,
 *   snowNew24h: 15,
 *   liftsOpen: 35,
 *   liftsTotal: 39,
 *   slopesOpen: 110,
 *   slopesTotal: 120,
 *   altitude: { base: 1500, top: 2610 },
 *   price: { adult: 62, currency: '€' },
 *   features: ['ski-school', 'equipment-rental', 'snow-park']
 * }
 */
export interface Station {
  /** ID único */
  id: string;
  /** Slug para URL */
  slug: string;
  /** Nombre de la estación */
  name: string;
  /** Región geográfica */
  region: Region;
  /** Ubicación detallada */
  location: string;
  /** URL de imagen */
  image: string;
  /** Estado actual */
  status: StationStatus;
  /** Tipo de estación */
  type?: StationType;
  /** Nieve base en cm */
  snowBase: number;
  /** Nieve cima en cm */
  snowTop: number;
  /** Nieve nueva 24h en cm */
  snowNew24h: number;
  /** Remontes abiertos */
  liftsOpen: number;
  /** Remontes totales */
  liftsTotal: number;
  /** Pistas abiertas */
  slopesOpen: number;
  /** Pistas totales */
  slopesTotal: number;
  /** Altitudes */
  altitude: {
    /** Altitud base en m */
    base: number;
    /** Altitud cima en m */
    top: number;
  };
  /** Precio forfait */
  price: {
    /** Precio adulto */
    adult: number;
    /** Moneda */
    currency: string;
  };
  /** Servicios disponibles */
  features: StationService[];
  /** Temperatura actual en °C (opcional) */
  temperature?: number;
  /** Viento en km/h (opcional) */
  wind?: number;
  /** Última actualización ISO (opcional) */
  lastUpdate?: string;
}

// ==================== FILTERS ====================

/**
 * Filtros aplicables al listado de estaciones.
 * @example {
 *   region: 'pyrenees',
 *   type: 'alpine',
 *   minAltitude: 1500,
 *   snowMin: 100,
 *   services: ['ski-school', 'snow-park'],
 *   status: 'open'
 * }
 */
export interface StationFilters {
  /** Filtrar por región */
  region: Region | "";
  /** Filtrar por tipo */
  type: StationType | "";
  /** Altitud mínima en m */
  minAltitude: number;
  /** Nieve mínima en cm */
  snowMin: number;
  /** Servicios requeridos */
  services: StationService[];
  /** Estado de apertura */
  status: StationStatus | "";
}

// ==================== FILTER OPTIONS ====================

/**
 * Opciones disponibles para selectores de filtros.
 */
export interface FilterOption {
  /** Valor del filtro */
  value: string;
  /** Etiqueta visible */
  label: string;
  /** Icono emoji (opcional) */
  icon?: string;
}

/**
 * Todas las opciones de filtros disponibles.
 */
export interface FilterOptions {
  /** Regiones disponibles */
  regions: FilterOption[];
  /** Tipos de estación */
  stationTypes: FilterOption[];
  /** Servicios disponibles */
  services: FilterOption[];
  /** Estados de apertura */
  statusOptions: FilterOption[];
}

// ==================== SORT OPTIONS ====================

/**
 * Opciones de ordenación disponibles.
 */
export type SortOption =
  | "relevance"
  | "name"
  | "snowBase"
  | "price"
  | "altitude"
  | "slopesOpen";

/**
 * Modos de visualización.
 */
export type ViewMode = "grid" | "list";

/**
 * Configuración de ordenación.
 */
export interface SortConfig {
  /** Campo de ordenación */
  field: SortOption;
  /** Dirección */
  direction: "asc" | "desc";
}

// ==================== PAGE DATA ====================

/**
 * Datos completos de la página Stations List.
 * Agrupa estaciones, opciones de filtros y configuración.
 */
export interface StationsListPageData {
  /** Listado de estaciones */
  stations: Station[];
  /** Opciones de filtros */
  filterOptions: FilterOptions;
  /** Estadísticas de la plataforma */
  stats?: {
    /** Total de estaciones disponibles */
    totalStations: number;
    /** Estaciones abiertas */
    openStations: number;
    /** Nieve base promedio en cm */
    avgSnowBase: number;
  };
}

// ==================== API RESPONSE ====================

/**
 * Metadatos de respuesta API.
 */
export interface ApiResponseMeta {
  /** Timestamp ISO */
  timestamp: string;
  /** Versión de API */
  version: string;
  /** Total de registros */
  total?: number;
  /** Página actual */
  page?: number;
  /** Tamaño de página */
  pageSize?: number;
}

/**
 * Wrapper genérico para respuestas de API.
 */
export interface ApiResponse<T> {
  /** Payload de datos */
  data: T;
  /** Metadatos opcionales */
  meta?: ApiResponseMeta;
}
