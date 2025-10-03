/**
 * Blog Article Data Service
 *
 * Handles loading blog article detail data with SSR support.
 * Uses mock data strategy with fallback to API.
 */

import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import {
  BlogArticleDetail,
  BlogArticleResponse,
  ArticleSection,
  TableOfContentsItem,
} from "../models/blog-article.models";
import { BlogPost } from "../../blog-list/models/blog-list.models";

/**
 * Service Configuration
 */
const CONFIG = {
  USE_MOCK_DATA: true,
  MOCK_PATH: "/assets/mocks/blog-article",
  API_BASE_URL: "/api/v1/blog",
} as const;

@Injectable({
  providedIn: "root",
})
export class BlogArticleDataService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Get base URL for SSR-safe fetch operations
   * Returns window.location.origin in browser, fallback for SSR
   */
  private getBaseUrl(): string {
    if (this.isBrowser && typeof window !== "undefined") {
      return window.location.origin;
    }
    // SSR fallback - use environment variable or default
    return process.env["BASE_URL"] || "http://localhost:4200";
  }

  /**
   * Load article detail by slug
   * @param slug - Article URL slug
   * @returns Complete article detail data
   */
  async loadArticleBySlug(slug: string): Promise<BlogArticleDetail> {
    if (CONFIG.USE_MOCK_DATA) {
      return this.loadFromMock(slug);
    }
    return this.loadFromAPI(slug);
  }

  /**
   * Load article from mock JSON file
   * Uses SSR-safe fetch with absolute URLs
   */
  private async loadFromMock(slug: string): Promise<BlogArticleDetail> {
    try {
      const baseUrl = this.getBaseUrl();

      // Strategy 1: Try specific mock (for featured articles with full content)
      const specificUrl = `${baseUrl}${CONFIG.MOCK_PATH}/${slug}.mock.json`;
      try {
        const response = await fetch(specificUrl);
        if (response.ok) {
          const data: BlogArticleResponse = await response.json();
          return data.data;
        }
      } catch {
        // Specific mock not found, continue to dynamic generation
      }

      // Strategy 2: Load article metadata from blog-list and generate content
      const blogListUrl = `${baseUrl}/assets/mocks/blog-list/blog-list-page.mock.json`;
      const blogListResponse = await fetch(blogListUrl);

      if (blogListResponse.ok) {
        const blogListData = await blogListResponse.json();
        const article = blogListData.data.articles.find(
          (a: BlogPost) => a.slug === slug
        );

        if (article) {
          // Generate dynamic article detail from blog-list data
          return this.generateArticleDetail(article);
        }
      }

      // Strategy 3: Fallback to default template
      const defaultUrl = `${baseUrl}${CONFIG.MOCK_PATH}/blog-article-default.mock.json`;
      const response = await fetch(defaultUrl);

      if (!response.ok) {
        throw new Error(`Failed to load mock data: ${response.statusText}`);
      }

      const data: BlogArticleResponse = await response.json();

      // Override slug in response if using default
      if (data.data.article) {
        data.data.article.slug = slug;
      }

      return data.data;
    } catch (error) {
      console.error("Error loading article mock data:", error);
      return this.getDefaultArticleData(slug);
    }
  }

  /**
   * Generate article detail from blog list article data
   * Creates dynamic content based on article metadata
   */
  private generateArticleDetail(article: BlogPost): BlogArticleDetail {
    // Generate dynamic sections based on category
    const sections = this.generateSections(article);
    const tableOfContents = this.generateTableOfContents(sections);

    return {
      article: {
        ...article,
        coverImage: article.coverImage.replace("?w=800", "?w=1200"), // Higher res for detail page
      },
      sections,
      tableOfContents,
      relatedArticles: [], // Would be populated from blog-list articles
      author: {
        ...article.author,
        bio: this.generateAuthorBio(article.author.name),
        articlesCount: Math.floor(Math.random() * 20) + 5, // Random 5-25
      },
      metadata: {
        title: `${article.title} | Nieve Platform`,
        description: article.excerpt,
        keywords: article.tags,
        ogImage: article.coverImage,
        publishedAt: article.publishedAt,
        author: article.author.name,
      },
      stats: {
        views: article.views || 0,
        likes: article.likes || 0,
        shares: Math.floor((article.likes || 0) * 0.3),
        comments: Math.floor((article.views || 0) * 0.01),
      },
    };
  }

  /**
   * Generate article sections based on category and title
   */
  private generateSections(article: BlogPost): ArticleSection[] {
    const sections: ArticleSection[] = [
      {
        type: "paragraph" as const,
        content: article.excerpt,
      },
    ];

    // Add category-specific sections
    if (article.category === "Consejos") {
      sections.push(
        {
          type: "heading" as const,
          content: "¿Por qué es importante?",
          level: 2,
        },
        {
          type: "paragraph" as const,
          content: `El tema de ${article.title.toLowerCase()} es fundamental para cualquier persona interesada en los deportes de nieve. En esta guía, exploraremos los aspectos más relevantes.`,
        },
        { type: "heading" as const, content: "Aspectos Clave", level: 2 },
        {
          type: "list" as const,
          items: [
            "Planificación y preparación adecuada",
            "Conocimiento de técnicas básicas",
            "Seguridad ante todo",
            "Equipamiento apropiado",
          ],
        },
        {
          type: "tip" as const,
          content:
            "Recuerda que la práctica constante y la paciencia son fundamentales para mejorar tus habilidades.",
        }
      );
    } else if (article.category === "Destinos") {
      sections.push(
        {
          type: "heading" as const,
          content: "Características Destacadas",
          level: 2,
        },
        {
          type: "paragraph" as const,
          content: `Este destino ofrece condiciones excepcionales para los amantes del esquí y la nieve, con instalaciones de primer nivel.`,
        },
        { type: "heading" as const, content: "Lo Mejor del Destino", level: 2 },
        {
          type: "list" as const,
          items: [
            "Pistas variadas para todos los niveles",
            "Servicios de calidad y comodidades",
            "Paisajes espectaculares",
            "Excelente relación calidad-precio",
          ],
        }
      );
    } else if (article.category === "Equipamiento") {
      sections.push(
        { type: "heading" as const, content: "Guía de Equipamiento", level: 2 },
        {
          type: "paragraph" as const,
          content: `Elegir el equipo adecuado es esencial para disfrutar al máximo de tu experiencia en la nieve.`,
        },
        { type: "heading" as const, content: "Elementos Esenciales", level: 2 },
        {
          type: "list" as const,
          items: [
            "Equipamiento básico y certificado",
            "Ropa técnica apropiada",
            "Accesorios de seguridad",
            "Mantenimiento y cuidado",
          ],
        },
        {
          type: "tip" as const,
          content:
            "Invierte en equipamiento de calidad. A largo plazo, tu comodidad y seguridad lo agradecerán.",
        }
      );
    }

    // Add closing sections
    sections.push(
      { type: "heading" as const, content: "Conclusión", level: 2 },
      {
        type: "paragraph" as const,
        content: `Esperamos que esta información te haya sido útil. Recuerda que la experiencia y el disfrute de la nieve dependen de una buena preparación y actitud positiva.`,
      },
      {
        type: "paragraph" as const,
        content: `¿Tienes más dudas? Explora nuestros otros artículos o contacta con nuestro equipo de expertos.`,
      }
    );

    return sections;
  }

  /**
   * Generate table of contents from sections
   */
  private generateTableOfContents(
    sections: ArticleSection[]
  ): TableOfContentsItem[] {
    return sections
      .filter((s) => s.type === "heading" && s.level === 2)
      .map((section) => ({
        id: (section.content || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: section.content || "",
        level: 2,
      }));
  }

  /**
   * Generate author bio based on name
   */
  private generateAuthorBio(name: string): string {
    const bios: Record<string, string> = {
      "María González":
        "Instructora de esquí con más de 10 años de experiencia. Apasionada por compartir conocimientos sobre deportes de nieve.",
      "Carlos Martínez":
        "Experto en estaciones de esquí y viajes de nieve. Ha visitado más de 50 estaciones en toda Europa.",
      "Laura Sánchez":
        "Especialista en snowboard y deportes extremos. Competidora profesional durante 8 años.",
      "Javier Torres":
        "Guía de montaña certificado. Enfocado en seguridad y prevención en deportes de nieve.",
      "Ana Ruiz":
        "Consultora de turismo de nieve. Experta en encontrar las mejores ofertas y destinos.",
    };

    return (
      bios[name] ||
      `Experto en deportes de nieve y colaborador habitual de Nieve Platform.`
    );
  }

  /**
   * Load article from API
   * @param slug - Article slug
   */
  private async loadFromAPI(slug: string): Promise<BlogArticleDetail> {
    try {
      const baseUrl = this.getBaseUrl();
      const url = `${baseUrl}${CONFIG.API_BASE_URL}/articles/${slug}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data: BlogArticleResponse = await response.json();
      return data.data;
    } catch (error) {
      console.error("Error loading article from API:", error);
      // Fallback to mock or default data
      return this.loadFromMock(slug);
    }
  }

  /**
   * Get default article data as fallback
   * Used when both mock and API fail
   */
  private getDefaultArticleData(slug: string): BlogArticleDetail {
    return {
      article: {
        id: "default",
        slug: slug,
        title: "Artículo no encontrado",
        excerpt: "El artículo que buscas no está disponible en este momento.",
        coverImage:
          "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200",
        author: {
          name: "Equipo Nieve",
          avatar: "https://i.pravatar.cc/150?img=0",
        },
        publishedAt: new Date().toISOString().split("T")[0],
        readingTime: 0,
        category: "General",
        tags: [],
        featured: false,
      },
      sections: [
        {
          type: "paragraph",
          content:
            "Lo sentimos, este artículo no está disponible en este momento. Por favor, regresa más tarde o explora otros artículos.",
        },
      ],
      tableOfContents: [],
      relatedArticles: [],
      author: {
        name: "Equipo Nieve",
        avatar: "https://i.pravatar.cc/150?img=0",
        bio: "Tu portal de información sobre deportes de nieve.",
        articlesCount: 0,
      },
    };
  }

  /**
   * Get related articles by category
   * @param category - Article category
   * @param excludeId - Article ID to exclude from results
   * @param limit - Maximum number of results
   */
  async getRelatedArticles(
    category: string,
    excludeId: string,
    limit = 3
  ): Promise<BlogArticleDetail["relatedArticles"]> {
    // This would typically call an API endpoint
    // For now, this is handled within the main article data
    void category;
    void excludeId;
    void limit;
    return [];
  }

  /**
   * Increment article view count
   * @param articleId - Article ID
   */
  async incrementViewCount(articleId: string): Promise<void> {
    if (!this.isBrowser) return;

    // In production, this would call an API endpoint
    console.log(`View count incremented for article: ${articleId}`);
  }

  /**
   * Like an article
   * @param articleId - Article ID
   */
  async likeArticle(articleId: string): Promise<void> {
    if (!this.isBrowser) return;

    // In production, this would call an API endpoint
    console.log(`Article liked: ${articleId}`);
  }
}
