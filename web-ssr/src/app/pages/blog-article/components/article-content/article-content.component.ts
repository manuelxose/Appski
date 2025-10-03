import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ArticleSection } from "../../models/blog-article.models";

@Component({
  selector: "app-article-content",
  templateUrl: "./article-content.component.html",
  styleUrls: ["./article-content.component.css"],
  standalone: true,
  imports: [CommonModule],
})
export class ArticleContentComponent {
  sections = input.required<ArticleSection[]>();
}
