/**
 * ==============================================
 * STATION DETAIL PAGE - DATA CONTRACTS
 * ==============================================
 * Interfaces for Station Detail page components.
 */

// ==================== STATION HERO ====================

/**
 * Estado de apertura de la estación.
 */
export type StationStatus = "open" | "closed" | "seasonal" | "maintenance";

/**
 * Datos para el hero de la estación.
 */
export interface StationHeroData {
  name: string;
  slug: string;
  region: string;
  location: string;
  heroImage: string;
  status: StationStatus;
  price: {
    adult: number;
    currency: string;
  };
  altitude: {
    base: number; // m
    top: number; // m
  };
  rating?: number; // 0-5
  reviews?: number;
}

// ==================== SNOW REPORT ====================

/**
 * Calidad de la nieve.
 */
export type SnowQuality =
  | "powder"
  | "packed-powder"
  | "hard"
  | "icy"
  | "spring";

/**
 * Visibilidad.
 */
export type Visibility = "excellent" | "good" | "moderate" | "poor";

/**
 * Parte de nieve de la estación.
 */
export interface SnowReport {
  /** Nieve base en cm */
  snowBase: number;
  /** Nieve cima en cm */
  snowTop: number;
  /** Nieve nueva 24h en cm */
  snowNew24h: number;
  /** Nieve nueva 48h en cm */
  snowNew48h: number;
  /** Nieve nueva 7 días en cm */
  snowNew7days: number;
  /** Calidad de la nieve */
  snowQuality: SnowQuality;
  /** Última nevada */
  lastSnowfall: string;
  /** Temperaturas en °C */
  temperature: {
    current: number;
    min: number;
    max: number;
  };
  /** Viento */
  wind: {
    speed: number; // km/h
    direction: string; // N, NE, E, SE, S, SW, W, NW
  };
  /** Visibilidad */
  visibility: Visibility;
  /** Fecha de actualización */
  updatedAt: string;
}

// ==================== LIFTS & SLOPES ====================

/**
 * Tipo de remonte.
 */
export type LiftType = "chairlift" | "gondola" | "t-bar" | "magic-carpet";

/**
 * Estado de un remonte o pista.
 */
export type FacilityStatus = "open" | "closed" | "maintenance";

/**
 * Dificultad de pista.
 */
export type SlopeDifficulty = "green" | "blue" | "red" | "black";

/**
 * Remonte individual.
 */
export interface Lift {
  id: string;
  name: string;
  type: LiftType;
  status: FacilityStatus;
  capacity: number; // personas/hora
}

/**
 * Pista individual.
 */
export interface Slope {
  id: string;
  name: string;
  difficulty: SlopeDifficulty;
  status: FacilityStatus;
  length: number; // metros
}

/**
 * Datos de remontes y pistas.
 */
export interface LiftsSlopesData {
  lifts: {
    open: number;
    total: number;
    list: Lift[];
  };
  slopes: {
    open: number;
    total: number;
    list: Slope[];
  };
}

// ==================== WEBCAMS ====================

/**
 * Webcam en directo.
 */
export interface Webcam {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  lastUpdate: string;
  isLive: boolean;
}

// ==================== WEATHER FORECAST ====================

/**
 * Pronóstico diario.
 */
export interface DailyForecast {
  date: string; // ISO
  dayName: string; // Lun, Mar, etc.
  temp: number; // °C
  icon: string; // emoji
  snowCm: number; // cm de nieve esperada
}

// ==================== STATION INFO ====================

/**
 * Información adicional de la estación.
 */
export interface StationInfo {
  about: string;
  services: string[];
  access: {
    car: string;
    publicTransport: string;
    parking: string;
  };
  prices: {
    adult: number;
    child: number;
    senior: number;
    season: number;
    currency: string;
  };
}

// ==================== PAGE DATA ====================

/**
 * Datos completos de la página Station Detail.
 */
export interface StationDetailPageData {
  hero: StationHeroData;
  snowReport: SnowReport;
  liftsSlopes: LiftsSlopesData;
  webcams: Webcam[];
  forecast: DailyForecast[];
  info: StationInfo;
}

// ==================== API RESPONSE ====================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    version: string;
  };
}
