import {
  Component,
  signal,
  computed,
  effect,
  inject,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { BlogCardComponent } from "./components/blog-card/blog-card.component";
import { BlogFiltersComponent } from "./components/blog-filters/blog-filters.component";
import { BlogListDataService } from "./services/blog-list.data.service";
import {
  BlogPost,
  BlogFilters,
  BlogListPageData,
} from "./models/blog-list.models";

@Component({
  selector: "app-blog-list",
  templateUrl: "./blog-list.html",
  styleUrl: "./blog-list.css",
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    SiteFooterComponent,
    BlogCardComponent,
    BlogFiltersComponent,
  ],
})
export class BlogList implements OnInit {
  private readonly dataService = inject(BlogListDataService);

  // Page data
  pageData = signal<BlogListPageData | null>(null);

  // State
  currentFilters = signal<BlogFilters>({
    searchQuery: "",
    selectedCategory: "Todos",
    selectedTags: [],
  });
  currentPage = signal(1);
  articlesPerPage = 9;

  // Articles from service
  allArticles = signal<BlogPost[]>([]);

  async ngOnInit(): Promise<void> {
    try {
      const data = await this.dataService.loadBlogListPageData();
      this.pageData.set(data);
      this.allArticles.set(data.articles);
    } catch (error) {
      console.error("Error loading blog data:", error);
    }
  }

  // Computed helpers for template
  categoryNames = computed(() => {
    const data = this.pageData();
    return data ? data.categories.map((c) => c.name) : [];
  });

  popularTags = computed(() => {
    return this.pageData()?.popularTags || [];
  });

  // Computed properties
  filteredArticles = computed(() => {
    const filters = this.currentFilters();
    let articles = this.allArticles();

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      articles = articles.filter(
        (article) =>
          article.title.toLowerCase().includes(query) ||
          article.excerpt.toLowerCase().includes(query) ||
          article.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (filters.selectedCategory && filters.selectedCategory !== "Todos") {
      articles = articles.filter(
        (article) => article.category === filters.selectedCategory
      );
    }

    // Filter by tags
    if (filters.selectedTags.length > 0) {
      articles = articles.filter((article) =>
        filters.selectedTags.some((tag) => article.tags.includes(tag))
      );
    }

    return articles;
  });

  featuredArticle = computed(() => {
    return this.filteredArticles().find((article) => article.featured) || null;
  });

  regularArticles = computed(() => {
    return this.filteredArticles().filter((article) => !article.featured);
  });

  paginatedArticles = computed(() => {
    const articles = this.regularArticles();
    const page = this.currentPage();
    const start = (page - 1) * this.articlesPerPage;
    const end = start + this.articlesPerPage;
    return articles.slice(start, end);
  });

  totalPages = computed(() => {
    return Math.ceil(this.regularArticles().length / this.articlesPerPage);
  });

  // Effect to reset page when filters change
  constructor() {
    effect(() => {
      // When filters change, reset to page 1
      this.currentFilters();
      this.currentPage.set(1);
    });
  }

  onFiltersChange(filters: BlogFilters): void {
    this.currentFilters.set(filters);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  getPaginationRange(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const range: number[] = [];

    if (total <= 7) {
      // Show all pages
      for (let i = 1; i <= total; i++) {
        range.push(i);
      }
    } else {
      // Show first, last, and pages around current
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) range.push(i);
        range.push(-1); // ellipsis
        range.push(total);
      } else if (current >= total - 2) {
        range.push(1);
        range.push(-1); // ellipsis
        for (let i = total - 4; i <= total; i++) range.push(i);
      } else {
        range.push(1);
        range.push(-1); // ellipsis
        for (let i = current - 1; i <= current + 1; i++) range.push(i);
        range.push(-1); // ellipsis
        range.push(total);
      }
    }

    return range;
  }
}
