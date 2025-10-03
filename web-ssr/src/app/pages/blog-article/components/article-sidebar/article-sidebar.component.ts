import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
  TableOfContentsItem,
  RelatedArticle,
  Author,
} from "../../models/blog-article.models";

@Component({
  selector: "app-article-sidebar",
  templateUrl: "./article-sidebar.component.html",
  styleUrls: ["./article-sidebar.component.css"],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class ArticleSidebarComponent {
  tableOfContents = input<TableOfContentsItem[]>([]);
  relatedArticles = input<RelatedArticle[]>([]);
  author = input.required<Author>();
  articleUrl = input<string>("");

  scrollToSection = output<string>();

  onSectionClick(id: string): void {
    this.scrollToSection.emit(id);
  }

  shareOnTwitter(): void {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent("Interesante artículo sobre esquí y nieve");
    window.open(
      `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      "_blank"
    );
  }

  shareOnFacebook(): void {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank"
    );
  }

  shareOnLinkedIn(): void {
    const url = encodeURIComponent(window.location.href);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank"
    );
  }

  copyLink(): void {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => alert("🔗 Enlace copiado al portapapeles"))
      .catch(() => alert("❌ No se pudo copiar el enlace"));
  }
}
