import { Component, output, signal, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { BlogFilters } from "../../models/blog-list.models";

@Component({
  selector: "app-blog-filters",
  templateUrl: "./blog-filters.component.html",
  styleUrls: ["./blog-filters.component.css"],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class BlogFiltersComponent {
  // Input data from parent
  categories = input<string[]>([]);
  popularTags = input<string[]>([]);

  // Output events
  filtersChange = output<BlogFilters>();

  // Filter state
  searchQuery = signal("");
  selectedCategory = signal("Todos");
  selectedTags = signal<string[]>([]);

  onSearchChange(): void {
    this.emitFilters();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory.set(category);
    this.emitFilters();
  }

  toggleTag(tag: string): void {
    const currentTags = this.selectedTags();
    if (currentTags.includes(tag)) {
      this.selectedTags.set(currentTags.filter((t) => t !== tag));
    } else {
      this.selectedTags.set([...currentTags, tag]);
    }
    this.emitFilters();
  }

  isTagSelected(tag: string): boolean {
    return this.selectedTags().includes(tag);
  }

  resetFilters(): void {
    this.searchQuery.set("");
    this.selectedCategory.set("Todos");
    this.selectedTags.set([]);
    this.emitFilters();
  }

  hasActiveFilters(): boolean {
    return (
      this.searchQuery() !== "" ||
      this.selectedCategory() !== "Todos" ||
      this.selectedTags().length > 0
    );
  }

  private emitFilters(): void {
    this.filtersChange.emit({
      searchQuery: this.searchQuery(),
      selectedCategory: this.selectedCategory(),
      selectedTags: this.selectedTags(),
    });
  }
}
