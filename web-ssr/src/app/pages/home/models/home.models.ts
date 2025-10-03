/**
 * ==============================================
 * HOME PAGE - DATA CONTRACTS (API & MOCK)
 * ==============================================
 * Interfaces for Home page components data.
 * These contracts are shared between Mock and API responses.
 */

// ==================== STATS OVERVIEW ====================

/**
 * Colores temáticos para badges de estadísticas.
 */
export type StatColor = "primary" | "success" | "warning" | "teal" | "danger";

/**
 * Estadística de la plataforma mostrada en el overview.
 * @example { value: '50+', label: 'Estaciones', icon: '🎿', trend: '+5 este año', color: 'primary' }
 */
export interface PlatformStat {
  /** Valor numérico o texto (ej: '50+', '1.2M', '24/7') */
  value: string;
  /** Descripción de la métrica */
  label: string;
  /** Emoji o ícono visual */
  icon: string;
  /** Texto de tendencia (ej: '+15% vs año anterior') */
  trend: string;
  /** Color temático del badge */
  color: StatColor;
}

// ==================== TESTIMONIALS ====================

/**
 * Testimonio de usuario verificado.
 * @example { name: 'María González', location: 'Madrid', avatar: '👩‍🦰', rating: 5, text: '...', date: 'Hace 2 días' }
 */
export interface Testimonial {
  /** Nombre del usuario */
  name: string;
  /** Ciudad o región */
  location: string;
  /** Emoji avatar o URL imagen */
  avatar: string;
  /** Puntuación de 1-5 estrellas */
  rating: 1 | 2 | 3 | 4 | 5;
  /** Texto del testimonio (max 200 caracteres recomendado) */
  text: string;
  /** Fecha relativa (ej: 'Hace 2 días') o ISO string */
  date: string;
}

// ==================== FEATURES GRID ====================

/**
 * Feature de la plataforma para el grid principal.
 * @example { title: 'Parte de Nieve', description: '...', icon: '❄️', link: '/estaciones', gradient: 'from-blue-500 to-cyan-500' }
 */
export interface Feature {
  /** Título de la feature */
  title: string;
  /** Descripción breve (max 100 caracteres recomendado) */
  description: string;
  /** Emoji o ícono visual */
  icon: string;
  /** Ruta relativa de navegación */
  link: string;
  /** Clases Tailwind para gradiente (ej: 'from-blue-500 to-cyan-500') */
  gradient: string;
}

// ==================== HERO SEARCH ====================

/**
 * Tipo de resultado en búsqueda de estaciones.
 */
export type SearchSuggestionType = "station" | "region" | "resort";

/**
 * Sugerencia de autocompletado en búsqueda del hero.
 * @example { name: 'Sierra Nevada', type: 'station', location: 'Granada', openStatus: true }
 */
export interface SearchSuggestion {
  /** Nombre de la estación, región o resort */
  name: string;
  /** Tipo de resultado */
  type: SearchSuggestionType;
  /** Ubicación geográfica */
  location: string;
  /** Estado de apertura (solo para estaciones) */
  openStatus?: boolean;
  /** Altura base en cm (opcional, solo estaciones) */
  snowBaseCm?: number;
  /** Nueva nieve en 24h en cm (opcional, solo estaciones) */
  snowNew24hCm?: number;
}

// ==================== FEATURED STATIONS ====================

/**
 * Estado de apertura de estación.
 */
export type StationStatus = "open" | "closed" | "seasonal" | "maintenance";

/**
 * Estación destacada para el carrusel de home.
 * @example { id: 'sierra-nevada', name: 'Sierra Nevada', slug: 'sierra-nevada', status: 'open', ... }
 */
export interface FeaturedStation {
  /** ID único */
  id: string;
  /** Nombre de la estación */
  name: string;
  /** Slug para URL */
  slug: string;
  /** Estado actual */
  status: StationStatus;
  /** Región geográfica */
  region: string;
  /** URL imagen hero */
  imageUrl: string;
  /** Altura base en cm */
  snowBaseCm: number;
  /** Nueva nieve 24h en cm */
  snowNew24hCm: number;
  /** Pistas abiertas / total */
  pistasOpen: number;
  pistasTotal: number;
  /** Remontes abiertos / total */
  remontesOpen: number;
  remontesTotal: number;
  /** Temperatura en °C */
  tempC: number;
  /** Viento en km/h */
  windKmh: number;
  /** Confianza del dato (0-1) */
  confidence: number;
}

// ==================== API RESPONSE WRAPPERS ====================

/**
 * Respuesta API completa de la página Home.
 * Agrupa todos los datos necesarios en una sola llamada.
 */
export interface HomePageData {
  /** Estadísticas de plataforma */
  stats: PlatformStat[];
  /** Testimonios de usuarios */
  testimonials: Testimonial[];
  /** Features del grid */
  features: Feature[];
  /** Estaciones destacadas */
  featuredStations: FeaturedStation[];
  /** Sugerencias de búsqueda (precargadas) */
  searchSuggestions: SearchSuggestion[];
}

/**
 * Metadatos de respuesta API (paginación, filtros).
 */
export interface ApiResponseMeta {
  /** Timestamp de respuesta ISO */
  timestamp: string;
  /** Versión de API */
  version: string;
  /** Caché TTL en segundos */
  cacheTtl?: number;
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
