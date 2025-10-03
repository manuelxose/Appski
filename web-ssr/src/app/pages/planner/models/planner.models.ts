/**
 * ==============================================
 * PLANNER PAGE - DATA CONTRACTS
 * ==============================================
 * Interfaces for Trip Planner wizard and components.
 */

// ==================== TRIP PLAN ====================

/**
 * Tipo de alojamiento.
 */
export type AccommodationType =
  | "hotel"
  | "apartment"
  | "hostel"
  | "cottage"
  | "rural";

/**
 * Nivel de habilidad en esquí.
 */
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

/**
 * Actividades disponibles.
 */
export type Activity =
  | "ski-school"
  | "equipment-rental"
  | "snowboarding"
  | "cross-country"
  | "snowshoeing"
  | "sledding"
  | "spa"
  | "restaurants";

/**
 * Pasos del wizard del planificador.
 */
export type PlannerStep = "form" | "review" | "summary";

/**
 * Datos del plan de viaje.
 */
export interface TripPlanData {
  destination: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  adults: number;
  children: number;
  budget: number; // €
  accommodationType: AccommodationType;
  skillLevel: SkillLevel;
  activities: string[];
}

/**
 * Plan guardado (extends TripPlanData con metadata).
 */
export interface SavedPlan extends TripPlanData {
  id: string;
  createdAt: string; // ISO timestamp
  totalCost: number; // € calculado
}

// ==================== STATION INFO ====================

/**
 * Información de estación para selector visual.
 */
export interface StationOption {
  name: string;
  location: string;
  isOpen: boolean;
  snowBase: number; // cm
  snowFresh: number; // cm
  temperature: number; // °C
  quality: string;
  image: string; // URL
}

// ==================== TRIP SUMMARY ====================

/**
 * Desglose de costes del viaje.
 */
export interface CostBreakdown {
  accommodation: number; // €
  skiPasses: number; // €
  equipment: number; // €
  extras: number; // €
}

/**
 * Pronóstico meteorológico diario.
 */
export interface WeatherForecast {
  day: string; // Lun, Mar, Mié...
  date: string; // ISO date
  condition: string; // sunny, snowy, cloudy...
  temperature: number; // °C
  snowfall: number; // cm esperada
  icon: string; // emoji
}

/**
 * Recomendación de alojamiento.
 */
export interface LodgingRecommendation {
  id: string;
  name: string;
  type: string;
  image: string; // URL
  price: number; // € por noche
  rating: number; // 0-5
  distanceToSlopes: string; // ej: "500m"
}

/**
 * Item de checklist de equipamiento.
 */
export interface EquipmentItem {
  name: string;
  icon: string; // emoji
  required: boolean;
}

/**
 * Resumen completo del viaje.
 */
export interface TripSummary {
  duration: number; // días
  totalCost: number; // €
  costBreakdown: CostBreakdown;
  recommendations: string[];
  weatherForecast: WeatherForecast[];
  lodgingOptions: LodgingRecommendation[];
  equipmentChecklist: EquipmentItem[];
}

// ==================== PAGE DATA ====================

/**
 * Datos completos de la página Planner.
 */
export interface PlannerPageData {
  savedPlans: SavedPlan[];
  stations: StationOption[];
  defaultRecommendations: string[];
  defaultLodgingOptions: LodgingRecommendation[];
  defaultEquipmentChecklist: EquipmentItem[];
}

// ==================== API RESPONSE ====================

export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    version: string;
  };
}
