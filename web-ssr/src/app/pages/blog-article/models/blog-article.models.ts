/**
 * Blog Article Models
 *
 * Interfaces for blog article detail page including article content,
 * table of contents, related articles, and author information.
 */

import { BlogPost } from "../../blog-list/models/blog-list.models";

/**
 * Article Section Types
 * Different content blocks that compose an article
 */
export interface ArticleSection {
  type:
    | "heading"
    | "paragraph"
    | "image"
    | "quote"
    | "list"
    | "tip"
    | "warning"
    | "code";
  content?: string;
  items?: string[]; // for lists
  level?: number; // for headings (h2=2, h3=3, etc)
  caption?: string; // for images
  language?: string; // for code blocks
}

/**
 * Table of Contents Item
 * Navigation structure for article sections
 */
export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number; // 2 for h2, 3 for h3, etc
}

/**
 * Related Article
 * Simplified article data for recommendations
 */
export interface RelatedArticle {
  id: string;
  slug: string;
  title: string;
  coverImage: string;
  readingTime: number;
  category?: string;
}

/**
 * Author Information (Extended)
 * Complete author profile with social links
 */
export interface Author {
  name: string;
  avatar: string;
  bio: string;
  articlesCount: number;
  social?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
}

/**
 * Article Metadata
 * SEO and sharing information
 */
export interface ArticleMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  canonicalUrl?: string;
  publishedAt: string;
  modifiedAt?: string;
  author: string;
}

/**
 * Article Stats
 * Engagement metrics
 */
export interface ArticleStats {
  views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
}

/**
 * Complete Article Detail
 * Full article data for detail page
 */
export interface BlogArticleDetail {
  // Basic article info (from BlogPost)
  article: BlogPost;

  // Article content
  sections: ArticleSection[];

  // Navigation & related content
  tableOfContents: TableOfContentsItem[];
  relatedArticles: RelatedArticle[];

  // Author details
  author: Author;

  // Additional metadata
  metadata?: ArticleMetadata;
  stats?: ArticleStats;
}

/**
 * API Response wrapper
 */
export interface BlogArticleResponse {
  data: BlogArticleDetail;
  meta: {
    requestedAt: string;
    slug: string;
  };
}
