import { Component, output, signal, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import {
  SortOption,
  ViewMode,
  SortConfig,
} from "../../models/lodging-marketplace.models";

@Component({
  selector: "app-lodging-sort-bar",
  templateUrl: "./lodging-sort-bar.component.html",
  styleUrls: ["./lodging-sort-bar.component.css"],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class LodgingSortBarComponent {
  // Input from parent - NO hardcoded data
  sortOptions = input<SortConfig[]>([]);

  // Output events
  sortChanged = output<SortOption>();
  viewModeChanged = output<ViewMode>();

  // State
  currentSort = signal<SortOption>("relevance");
  currentView = signal<ViewMode>("grid");
  resultsCount = signal(0);

  onSortChange(sort: SortOption): void {
    this.currentSort.set(sort);
    this.sortChanged.emit(sort);
  }

  onViewChange(view: ViewMode): void {
    this.currentView.set(view);
    this.viewModeChanged.emit(view);
  }

  setResultsCount(count: number): void {
    this.resultsCount.set(count);
  }
}
