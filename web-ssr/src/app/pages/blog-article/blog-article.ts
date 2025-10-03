import { Component, signal, OnInit, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { ArticleContentComponent } from "./components/article-content/article-content.component";
import { ArticleSidebarComponent } from "./components/article-sidebar/article-sidebar.component";
import {
  ArticleSection,
  TableOfContentsItem,
  RelatedArticle,
  Author,
} from "./models/blog-article.models";
import { BlogPost } from "../blog-list/models/blog-list.models";
import { BlogArticleDataService } from "./services/blog-article.data.service";

@Component({
  selector: "app-blog-article",
  templateUrl: "./blog-article.html",
  styleUrl: "./blog-article.css",
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    SiteFooterComponent,
    ArticleContentComponent,
    ArticleSidebarComponent,
  ],
})
export class BlogArticle implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(BlogArticleDataService);

  // Article data signals
  article = signal<BlogPost | null>(null);
  articleSections = signal<ArticleSection[]>([]);
  tableOfContents = signal<TableOfContentsItem[]>([]);
  relatedArticles = signal<RelatedArticle[]>([]);
  author = signal<Author | null>(null);

  async ngOnInit(): Promise<void> {
    // Get slug from route
    const slug = this.route.snapshot.paramMap.get("slug");

    if (!slug) {
      console.error("No slug provided in route");
      return;
    }

    try {
      // Load article data from service
      const articleData = await this.dataService.loadArticleBySlug(slug);

      // Set all signals from loaded data
      this.article.set(articleData.article);
      this.articleSections.set(articleData.sections);
      this.tableOfContents.set(articleData.tableOfContents);
      this.relatedArticles.set(articleData.relatedArticles);
      this.author.set(articleData.author);

      // Optional: Increment view count (analytics)
      if (articleData.article.id) {
        void this.dataService.incrementViewCount(articleData.article.id);
      }
    } catch (error) {
      console.error("Error loading article data:", error);
      // Set default/empty state on error
      this.article.set(null);
      this.articleSections.set([]);
      this.tableOfContents.set([]);
      this.relatedArticles.set([]);
      this.author.set(null);
    }
  }

  onScrollToSection(id: string): void {
    // In a real app, implement smooth scrolling to section
    console.log("Scroll to section:", id);
  }
}
