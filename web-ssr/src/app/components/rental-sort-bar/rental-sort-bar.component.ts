import { Component, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

export type RentalSortOption =
  | "relevance"
  | "price-asc"
  | "price-desc"
  | "rating"
  | "distance";

@Component({
  selector: "app-rental-sort-bar",
  templateUrl: "./rental-sort-bar.component.html",
  styleUrls: ["./rental-sort-bar.component.css"],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class RentalSortBarComponent {
  // Output events
  sortChanged = output<RentalSortOption>();

  // State
  currentSort = signal<RentalSortOption>("relevance");
  resultsCount = signal(0);

  readonly sortOptions: Array<{ value: RentalSortOption; label: string }> = [
    { value: "relevance", label: "Relevancia" },
    { value: "price-asc", label: "Precio: Menor a Mayor" },
    { value: "price-desc", label: "Precio: Mayor a Menor" },
    { value: "rating", label: "Mejor Valorados" },
    { value: "distance", label: "Más Cercanos" },
  ];

  onSortChange(sort: RentalSortOption): void {
    this.currentSort.set(sort);
    this.sortChanged.emit(sort);
  }

  setResultsCount(count: number): void {
    this.resultsCount.set(count);
  }
}
