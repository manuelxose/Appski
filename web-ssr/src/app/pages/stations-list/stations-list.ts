import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject,
  OnInit,
} from "@angular/core";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import {
  StationsFiltersComponent,
  StationFilters,
} from "./components/stations-filters/stations-filters.component";
import {
  StationsSortBarComponent,
  SortOption,
  ViewMode,
} from "./components/stations-sort-bar/stations-sort-bar.component";
import { StationCardGridComponent } from "./components/station-card-grid/station-card-grid.component";
import { StationsListDataService } from "./services/stations-list.data.service";
import type { Station, SortConfig } from "./models/stations-list.models";

@Component({
  selector: "app-stations-list",
  imports: [
    SiteHeaderComponent,
    SiteFooterComponent,
    StationsFiltersComponent,
    StationsSortBarComponent,
    StationCardGridComponent,
  ],
  templateUrl: "./stations-list.html",
  styleUrl: "./stations-list.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationsList implements OnInit {
  private readonly dataService = inject(StationsListDataService);

  // State signals
  filteredStations = signal<Station[]>([]);
  currentSort = signal<SortOption>("relevance");
  currentView = signal<ViewMode>("grid");
  isLoading = signal<boolean>(false);
  mobileFiltersOpen = signal<boolean>(false);
  currentFilters = signal<StationFilters | undefined>(undefined);
  /** Regiones REALES del maestro (del borde): no se ofrecen comarcas ficticias. */
  regionOptions = signal<ReadonlyArray<{ value: string; label: string }>>([
    { value: "", label: "Todas las regiones" },
  ]);
  /** `true` ⇒ el borde no devolvió filas: se dice, no se finge una lista. */
  unavailable = signal<boolean>(false);

  async ngOnInit(): Promise<void> {
    await this.loadStations();
    const options = await this.dataService.loadFilterOptions();
    this.regionOptions.set([{ value: "", label: "Todas las regiones" }, ...options.regions]);
  }

  private async loadStations(): Promise<void> {
    this.isLoading.set(true);
    try {
      const sortConfig: SortConfig = {
        field: this.currentSort(),
        direction: "desc",
      };
      const stations = await this.dataService.loadStations(
        this.currentFilters(),
        sortConfig
      );
      this.filteredStations.set(stations);
      // Lista vacía viene del borde (no_data o filtro sin resultados).
      this.unavailable.set(stations.length === 0);
    } catch (error) {
      console.error("Error loading stations:", error);
      this.filteredStations.set([]);
      this.unavailable.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onFiltersChanged(filters: StationFilters): Promise<void> {
    console.log("Filters changed:", filters);
    this.currentFilters.set(filters);
    await this.loadStations();
  }

  async onFiltersReset(): Promise<void> {
    console.log("Filters reset");
    this.currentFilters.set(undefined);
    await this.loadStations();
  }

  async onSortChanged(sort: SortOption): Promise<void> {
    console.log("Sort changed:", sort);
    this.currentSort.set(sort);
    await this.loadStations();
  }

  onViewModeChanged(view: ViewMode): void {
    console.log("View mode changed:", view);
    this.currentView.set(view);
  }

  toggleMobileFilters(): void {
    this.mobileFiltersOpen.set(!this.mobileFiltersOpen());
  }
}
