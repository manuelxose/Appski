import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { BlogPost } from "../../models/blog-list.models";

@Component({
  selector: "app-blog-card",
  templateUrl: "./blog-card.component.html",
  styleUrls: ["./blog-card.component.css"],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class BlogCardComponent {
  article = input.required<BlogPost>();
  variant = input<"default" | "featured">("default");

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return date.toLocaleDateString("es-ES", options);
  }

  getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      Consejos: "bg-blue-100 text-blue-800",
      Destinos: "bg-green-100 text-green-800",
      Equipamiento: "bg-purple-100 text-purple-800",
      Seguridad: "bg-red-100 text-red-800",
      Noticias: "bg-yellow-100 text-yellow-800",
      Eventos: "bg-pink-100 text-pink-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  }
}
