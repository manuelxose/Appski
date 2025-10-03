/**
 * Admin Blog Module - Type Definitions
 *
 * Interfaces y tipos para la gestión del blog/noticias
 */

/**
 * Article status
 */
export type ArticleStatus = "draft" | "published" | "scheduled" | "archived";

/**
 * Article visibility
 */
export type ArticleVisibility = "public" | "private" | "password";

/**
 * Article format
 */
export type ArticleFormat = "standard" | "gallery" | "video" | "quote" | "link";

/**
 * Multilingual text content
 */
export interface MultilingualText {
  es: string;
  en: string;
  fr: string;
}

/**
 * Image metadata
 */
export interface ImageMetadata {
  url: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

/**
 * Blog author
 */
export interface BlogAuthor {
  id: string;
  name: string;
  slug: string;
  email: string;
  avatar: string;
  bio: MultilingualText;
  role: string;
  social?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    facebook?: string;
  };
  stats: {
    totalArticles: number;
    totalViews: number;
    totalLikes: number;
  };
  createdAt?: string;
}

/**
 * Blog category
 */
export interface BlogCategory {
  id: string;
  slug: string;
  name: MultilingualText;
  description: MultilingualText;
  color: string;
  icon: string;
  parent?: string;
  articleCount: number;
  order?: number;
  createdAt?: string;
}

/**
 * Blog tag
 */
export interface BlogTag {
  id: string;
  slug: string;
  name: string;
  articleCount: number;
  createdAt?: string;
}

/**
 * SEO metadata
 */
export interface BlogSEO {
  metaTitle: MultilingualText;
  metaDescription: MultilingualText;
  keywords: string[];
  ogImage?: string;
  canonical?: string;
  noindex: boolean;
  nofollow: boolean;
}

/**
 * Article statistics
 */
export interface BlogStats {
  views: number;
  likes: number;
  shares: number;
  comments: number;
  readingTime: number; // minutes
  avgTimeOnPage: number; // seconds
}

/**
 * Blog article interface
 */
export interface BlogArticle {
  id: string;
  slug: string;
  status: ArticleStatus;
  visibility: ArticleVisibility;
  format: ArticleFormat;
  title: MultilingualText;
  excerpt: MultilingualText;
  content: MultilingualText;
  featuredImage: ImageMetadata;
  gallery?: ImageMetadata[];
  author: BlogAuthor;
  categories: BlogCategory[];
  tags: BlogTag[];
  seo: BlogSEO;
  publishedAt?: string;
  scheduledAt?: string;
  updatedAt: string;
  createdAt: string;
  stats: BlogStats;
  allowComments: boolean;
  featured: boolean;
  sticky: boolean;
}

/**
 * Form data para crear/editar artículos
 */
export interface BlogFormData {
  id?: string;
  slug: string;
  status: ArticleStatus;
  visibility: ArticleVisibility;
  format: ArticleFormat;
  title: MultilingualText;
  excerpt: MultilingualText;
  content: MultilingualText;
  featuredImage: ImageMetadata;
  authorId: string;
  categoryIds: string[];
  tags: string[];
  seo: BlogSEO;
  scheduledAt?: string;
  allowComments: boolean;
  featured: boolean;
  sticky: boolean;
}

/**
 * Blog overview statistics
 */
export interface BlogOverviewStats {
  totalArticles: number;
  published: number;
  drafts: number;
  scheduled: number;
  archived: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgReadingTime: number;
}

/**
 * Article creation request
 */
export interface CreateArticleRequest {
  slug: string;
  title: MultilingualText;
  excerpt: MultilingualText;
  content: MultilingualText;
  featuredImage: ImageMetadata;
  authorId: string;
  categoryIds: string[];
  tags: string[];
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  format?: ArticleFormat;
  scheduledAt?: string;
  allowComments?: boolean;
  featured?: boolean;
  sticky?: boolean;
}

/**
 * Article update request
 */
export interface UpdateArticleRequest {
  title?: MultilingualText;
  excerpt?: MultilingualText;
  content?: MultilingualText;
  featuredImage?: ImageMetadata;
  categoryIds?: string[];
  tags?: string[];
  status?: ArticleStatus;
  visibility?: ArticleVisibility;
  scheduledAt?: string;
  allowComments?: boolean;
  featured?: boolean;
  sticky?: boolean;
}
