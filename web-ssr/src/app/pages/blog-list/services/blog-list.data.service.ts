import { Injectable, inject, PLATFORM_ID } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { isPlatformBrowser } from "@angular/common";
import { BlogListPageData, ApiResponse } from "../models/blog-list.models";

/**
 * ==============================================
 * BLOG LIST DATA SERVICE
 * ==============================================
 * Servicio para cargar datos de la página de blog.
 * Estrategia: Mock-first con URLs SSR-safe.
 */
@Injectable({
  providedIn: "root",
})
export class BlogListDataService {
  private readonly USE_MOCK_DATA = true;
  private readonly http = this.USE_MOCK_DATA ? null : inject(HttpClient);
  private readonly MOCK_PATH = "/assets/mocks/blog-list";
  private readonly API_URL = "/api/v1/blog";
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Obtiene la base URL para fetch SSR-safe
   */
  private getBaseUrl(): string {
    if (this.isBrowser && typeof window !== "undefined") {
      return window.location.origin;
    }
    return "http://localhost:4200";
  }

  /**
   * Carga todos los datos de la página de blog.
   */
  async loadBlogListPageData(): Promise<BlogListPageData> {
    if (this.USE_MOCK_DATA) {
      return this.loadFromMock();
    } else {
      return this.loadFromAPI();
    }
  }

  /**
   * Carga desde archivo mock.
   */
  private async loadFromMock(): Promise<BlogListPageData> {
    const baseUrl = this.getBaseUrl();
    try {
      const response = await fetch(
        `${baseUrl}${this.MOCK_PATH}/blog-list-page.mock.json`
      );
      if (!response.ok) {
        throw new Error("Failed to load blog mock data");
      }
      const json: ApiResponse<BlogListPageData> = await response.json();
      return json.data;
    } catch (error) {
      console.error("Error loading blog mock:", error);
      return this.getDefaultData();
    }
  }

  /**
   * Carga desde API real.
   */
  private async loadFromAPI(): Promise<BlogListPageData> {
    if (!this.http) {
      throw new Error("HttpClient not available");
    }

    try {
      const response = await this.http
        .get<ApiResponse<BlogListPageData>>(`${this.API_URL}/posts`)
        .toPromise();

      if (!response?.data) {
        throw new Error("Invalid API response");
      }

      return response.data;
    } catch (error) {
      console.error("Error loading blog from API:", error);
      throw new Error("Failed to load blog data");
    }
  }

  /**
   * Datos por defecto en caso de error.
   */
  private getDefaultData(): BlogListPageData {
    return {
      articles: [],
      categories: [
        { id: "1", name: "Todos", slug: "todos", count: 0 },
        { id: "2", name: "Consejos", slug: "consejos", count: 0 },
        { id: "3", name: "Destinos", slug: "destinos", count: 0 },
        { id: "4", name: "Equipamiento", slug: "equipamiento", count: 0 },
        { id: "5", name: "Seguridad", slug: "seguridad", count: 0 },
        { id: "6", name: "Eventos", slug: "eventos", count: 0 },
      ],
      tags: [],
      featuredArticles: [],
      popularTags: [],
      meta: {
        totalArticles: 0,
        lastUpdated: new Date().toISOString(),
      },
    };
  }
}
