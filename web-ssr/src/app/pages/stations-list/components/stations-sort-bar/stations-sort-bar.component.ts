import { ChangeDetectionStrategy, Component, output } from "@angular/core";
import type { SortOption, ViewMode } from "../../models/stations-list.models";

// Re-export para compatibilidad con otros componentes
export type { SortOption, ViewMode };

@Component({
  selector: "app-stations-sort-bar",
  standalone: true,
  imports: [],
  templateUrl: "./stations-sort-bar.component.html",
  styleUrls: ["./stations-sort-bar.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationsSortBarComponent {
  // Outputs
  sortChanged = output<SortOption>();
  viewModeChanged = output<ViewMode>();

  // Estado
  currentSort: SortOption = "relevance";
  currentView: ViewMode = "grid";
  resultsCount = 0;

  sortOptions = [
    { value: "relevance" as SortOption, label: "Relevancia" },
    { value: "snowBase" as SortOption, label: "Nieve base" },
    { value: "altitude" as SortOption, label: "Altitud" },
    { value: "slopesOpen" as SortOption, label: "Pistas abiertas" },
    { value: "price" as SortOption, label: "Precio" },
  ];

  onSortChange(sort: SortOption): void {
    this.currentSort = sort;
    this.sortChanged.emit(sort);
  }

  onViewToggle(view: ViewMode): void {
    this.currentView = view;
    this.viewModeChanged.emit(view);
  }

  setResultsCount(count: number): void {
    this.resultsCount = count;
  }
}
