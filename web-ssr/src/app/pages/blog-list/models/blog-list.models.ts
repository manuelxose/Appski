/**
 * ==============================================
 * BLOG LIST MODELS
 * ==============================================
 * Interfaces y tipos para la página de blog.
 */

/**
 * Autor de un artículo
 */
export interface BlogAuthor {
  name: string;
  avatar: string;
  bio?: string;
  social?: {
    twitter?: string;
    linkedin?: string;
  };
}

/**
 * Artículo de blog
 */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverImage: string;
  author: BlogAuthor;
  publishedAt: string; // ISO date
  readingTime: number; // minutos
  category: string;
  tags: string[];
  featured: boolean;
  views?: number;
  likes?: number;
}

/**
 * Categoría de blog
 */
export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  count: number; // número de artículos
  color?: string; // Tailwind class
}

/**
 * Filtros de búsqueda
 */
export interface BlogFilters {
  searchQuery: string;
  selectedCategory: string;
  selectedTags: string[];
}

/**
 * Configuración de ordenación
 */
export interface BlogSortConfig {
  field: "publishedAt" | "readingTime" | "views" | "likes";
  direction: "asc" | "desc";
}

/**
 * Metadatos de paginación
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

/**
 * Datos completos de la página Blog List
 */
export interface BlogListPageData {
  articles: BlogPost[];
  categories: BlogCategory[];
  tags: string[];
  featuredArticles: BlogPost[];
  popularTags: string[];
  meta: {
    totalArticles: number;
    lastUpdated: string;
  };
}

/**
 * Respuesta genérica de API
 */
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    version: string;
  };
}
