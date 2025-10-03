/**
 * Tipos y modelos para datos meteorológicos
 * Alineados con contratos del backend
 */

export type Cota = "base" | "mid" | "top";

/**
 * Información de una estación de esquí
 */
export interface SkiStation {
  slug: string; // "baqueira-beret", "formigal", etc.
  name: string; // "Baqueira Beret", "Formigal", etc.
  region: string; // "Valle de Arán", "Huesca", etc.
  country: string; // "España", "Andorra", etc.
  altitudes: {
    base: number; // metros
    mid: number; // metros
    top: number; // metros
  };
  location: {
    lat: number;
    lng: number;
  };
  website?: string;
  status?: "open" | "closed" | "seasonal" | "maintenance";
}

export type WeatherCondition =
  | "snow"
  | "rain"
  | "mix"
  | "clear"
  | "cloudy"
  | "fog"
  | "storm";

/**
 * Observación meteorológica actual fusionada
 */
export interface MeteoNow {
  stationSlug: string;
  observedAt: string; // ISO 8601
  tempC: number;
  windKmh: number;
  gustKmh: number;
  visibilityM: number | null;
  snowBaseCm: number | null;
  snowTopCm: number | null;
  snowNew24hCm: number | null;
  iso0M: number | null; // Isoterma 0ºC en metros
  condition: WeatherCondition;
  confidence: number; // 0..1
  sources: MeteoSource[];
}

export interface MeteoSource {
  name: string;
  weight: number;
}

/**
 * Punto de previsión meteorológica
 */
export interface MeteoForecastPoint {
  validAt: string; // ISO 8601
  cota: Cota;
  tempC: number;
  windKmh: number;
  gustKmh: number;
  precipSnowCm: number; // Nieve prevista en el intervalo
  precipRainMm: number; // Lluvia prevista
  iso0M: number | null;
  cloudPct: number | null; // 0..100
  visibilityM: number | null;
  confidence: number; // 0..1
}

/**
 * Previsión meteorológica completa
 */
export interface MeteoForecast {
  stationSlug: string;
  hours: number; // 24 | 48 | 72
  points: MeteoForecastPoint[];
  snowAccu24hCm: number; // Acumulados totales
  snowAccu72hCm: number;
  snowAccu7dCm?: number; // Opcional para 7 días
}

/**
 * Webcam de estación
 */
export interface WebcamItem {
  id: string;
  name: string;
  snapshotUrl: string;
  lastUpdated: string; // ISO 8601
  freshnessS: number; // Segundos desde última actualización
  active: boolean;
  cota?: Cota; // Opcional: ubicación de la webcam
}

/**
 * Snapshot histórico de webcam
 */
export interface WebcamSnapshot {
  id: string;
  webcamId: string;
  imageUrl: string;
  timestamp: string; // ISO 8601
  conditions?: {
    tempC?: number;
    snowCm?: number;
    visibility?: "excellent" | "good" | "moderate" | "poor";
    weather?: WeatherCondition;
  };
}

/**
 * Histórico de webcam con snapshots
 */
export interface WebcamHistory {
  webcamId: string;
  webcamName: string;
  snapshots: WebcamSnapshot[];
  dateRange: {
    from: string; // ISO 8601
    to: string; // ISO 8601
  };
}

/**
 * Información de radar meteorológico
 */
export interface RadarInfo {
  tileUrlTemplate: string; // e.g. https://tiles.example/{z}/{x}/{y}.png
  timestamp: string; // ISO 8601
  legendUrl?: string;
  centerLat?: number;
  centerLon?: number;
  zoom?: number;
}

/**
 * Resumen de condiciones por periodo
 */
export interface WeatherSummary {
  period: "today" | "tomorrow" | "weekend";
  label: string;
  tempMaxC: number;
  tempMinC: number;
  snowAccuCm: number;
  condition: WeatherCondition;
  windMaxKmh: number;
  confidence: number;
}

/**
 * Alerta meteorológica
 */
export interface WeatherAlert {
  id: string;
  type: "info" | "warning" | "danger";
  title: string;
  message: string;
  icon: string;
  validFrom: string; // ISO 8601
  validUntil: string; // ISO 8601
  affectedCotas: Cota[];
}

/**
 * Estado de la nieve en estación
 */
export interface SnowConditions {
  stationSlug: string;
  updatedAt: string; // ISO 8601
  avalancheRisk: AvalancheRisk;
  // Datos por cota
  base: SnowConditionsByCota;
  mid: SnowConditionsByCota;
  top: SnowConditionsByCota;
}

/**
 * Condiciones de nieve por cota específica
 */
export interface SnowConditionsByCota {
  altitudeM: number; // Altitud en metros
  depthCm: number | null;
  quality: SnowQuality | null;
  tempC: number | null;
  windKmh: number | null;
  lastSnowfall: string | null; // ISO 8601 o null si no hay
}

export type SnowQuality =
  | "powder" // Polvo
  | "fresh" // Reciente
  | "packed" // Pisada
  | "spring" // Primavera
  | "icy" // Helada
  | "wet"; // Húmeda

export type AvalancheRisk =
  | "none" // Sin información
  | "low" // 1 - Débil
  | "moderate" // 2 - Limitado
  | "considerable" // 3 - Notable
  | "high" // 4 - Fuerte
  | "very-high"; // 5 - Muy Fuerte

/**
 * Previsión meteorológica detallada por hora
 */
export interface DetailedForecastDay {
  date: string; // YYYY-MM-DD
  blocks: DetailedForecastBlock[]; // 4 bloques: 0-6, 6-12, 12-18, 18-24
}

export interface DetailedForecastBlock {
  timeRange: string; // "0-6", "6-12", "12-18", "18-24"
  // Temperaturas por cota (top/bottom)
  tempTopC: number;
  tempBottomC: number;
  // Sensación térmica
  feelsLikeTopC: number;
  feelsLikeBottomC: number;
  // Isoterma y cota de nieve
  iso0M: number;
  snowLineM: number | null;
  // Visibilidad
  visibilityMin: number; // km
  visibilityMax: number; // km
  // Viento por cota
  windTopKmh: number;
  windBottomKmh: number;
  // Nieve acumulada por cota
  snowTopCm: number;
  snowBottomCm: number;
  // Precipitación
  precipMm: number;
  // Condición general
  condition: WeatherCondition;
}

/**
 * Previsión resumida para 8 días
 */
export interface WeekForecastDay {
  date: string; // YYYY-MM-DD
  tempTopC: number;
  tempBottomC: number;
  iso0M: number;
  snowLineM: number | null;
  windTopKmh: number;
  windBottomKmh: number;
  snowTopCm: number;
  snowBottomCm: number;
  precipMm: number;
  condition: WeatherCondition;
}

/**
 * Estadísticas de temporada
 */
export interface SeasonStats {
  season: string; // "2022-2023"
  openingDate: string; // ISO 8601
  closingDate: string; // ISO 8601
  daysOpen: number;
  totalPrecipMm: number;
  daysWithPrecip: number;
  // Nieve en cima
  snowTopCm: number;
  daysSnowTop: number;
  intenseDaysTop: number; // >=10cm
  // Nieve en base
  snowBaseCm: number;
  daysSnowBase: number;
  intenseDaysBase: number; // >=10cm
}

/**
 * Datos históricos para gráficos de temporada
 */
export interface SeasonChartData {
  season: string; // "2022-2023"
  // Espesor de nieve
  snowDepthData: SeasonDataPoint[];
  // Kilómetros abiertos
  kmOpenData: SeasonDataPoint[];
  // Pistas abiertas
  pistesOpenData: SeasonDataPoint[];
  // Total de estación
  totalKm: number;
  totalPistes: number;
  // Tipos de nieve
  snowTypes: {
    powder: number; // Porcentaje
    packed: number;
    spring: number;
  };
}

export interface SeasonDataPoint {
  date: string; // ISO 8601
  min: number | null; // Para espesor mínimo
  max: number | null; // Para espesor máximo
  value: number; // Valor principal (km, pistas, etc.)
  status: "open" | "closed" | "touristic"; // Estado de la estación
}

/**
 * Sistema de Alertas
 */
export type AlertType = "info" | "warning" | "danger";
export type AlertCategory = "station" | "weather" | "snow" | "safety";

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  message: string;
  timestamp: string; // ISO 8601
  priority: number; // 1 (highest) to 5 (lowest)
  dismissible: boolean;
  actionLabel?: string;
  actionUrl?: string;
  icon?: string; // emoji or icon name
}
