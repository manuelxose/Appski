import {
  Component,
  OnInit,
  signal,
  effect,
  viewChild,
  inject,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { LodgingFiltersComponent } from "./components/lodging-filters/lodging-filters.component";
import { LodgingSortBarComponent } from "./components/lodging-sort-bar/lodging-sort-bar.component";
import { LodgingCardComponent } from "./components/lodging-card/lodging-card.component";
import { LodgingMapViewComponent } from "./components/lodging-map-view/lodging-map-view.component";
import {
  Lodging,
  LodgingFilters,
  SortOption,
  ViewMode,
  LodgingMarketplacePageData,
} from "./models/lodging-marketplace.models";
import { LodgingMarketplaceDataService } from "./services/lodging-marketplace.data.service";

@Component({
  selector: "app-lodging-marketplace",
  templateUrl: "./lodging-marketplace.html",
  styleUrls: ["./lodging-marketplace.css"],
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    SiteFooterComponent,
    LodgingFiltersComponent,
    LodgingSortBarComponent,
    LodgingCardComponent,
    LodgingMapViewComponent,
  ],
})
export class LodgingMarketplace implements OnInit {
  // Inject dependencies
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly dataService = inject(LodgingMarketplaceDataService);

  // Route parameter
  stationSlug = signal<string>("");

  // Page data from service
  pageData = signal<LodgingMarketplacePageData | null>(null);

  // View state
  currentFilters = signal<LodgingFilters>({
    types: [],
    priceRange: { min: 0, max: 500 },
    services: [],
    maxDistance: 10,
    minRating: 0,
  });
  currentSort = signal<SortOption>("relevance");
  currentView = signal<ViewMode>("grid");
  mobileFiltersOpen = signal(false);

  // Data
  allLodgings = signal<Lodging[]>([]);
  filteredLodgings = signal<Lodging[]>([]);

  // Computed properties for template-safe data
  lodgingTypes = computed(() => this.pageData()?.lodgingTypes || []);
  services = computed(() => this.pageData()?.services || []);
  sortOptions = computed(() => this.pageData()?.sortOptions || []);

  // Reference to sort bar for updating count
  sortBar = viewChild(LodgingSortBarComponent);

  constructor() {
    // Effect to update filtered lodgings when filters or sort changes
    effect(() => {
      this.applyFiltersAndSort();
    });
  }

  async ngOnInit(): Promise<void> {
    // Get station slug from route
    this.activatedRoute.params.subscribe(async (params) => {
      const slug = params["station"] || "";
      this.stationSlug.set(slug);
      await this.loadLodgings(slug);
    });
  }

  private async loadLodgings(stationSlug?: string): Promise<void> {
    try {
      const data = await this.dataService.loadLodgingMarketplacePageData(
        stationSlug
      );
      this.pageData.set(data);
      this.allLodgings.set(data.lodgings);
      this.filteredLodgings.set(data.lodgings);
    } catch (error) {
      console.error("Error loading lodging marketplace data:", error);
      // Set empty states
      this.pageData.set(null);
      this.allLodgings.set([]);
      this.filteredLodgings.set([]);
    }
  }

  onFiltersChange(filters: LodgingFilters): void {
    this.currentFilters.set(filters);
  }

  onSortChange(sort: SortOption): void {
    this.currentSort.set(sort);
  }

  onViewModeChange(view: ViewMode): void {
    this.currentView.set(view);
  }

  toggleMobileFilters(): void {
    this.mobileFiltersOpen.set(!this.mobileFiltersOpen());
  }

  private applyFiltersAndSort(): void {
    let results = [...this.allLodgings()];
    const filters = this.currentFilters();

    // Apply type filter
    if (filters.types.length > 0) {
      results = results.filter((l) => filters.types.includes(l.type));
    }

    // Apply price filter
    results = results.filter(
      (l) =>
        l.pricePerNight >= filters.priceRange.min &&
        l.pricePerNight <= filters.priceRange.max
    );

    // Apply distance filter
    results = results.filter((l) => l.distanceToSlopes <= filters.maxDistance);

    // Apply rating filter
    if (filters.minRating > 0) {
      results = results.filter((l) => l.rating >= filters.minRating);
    }

    // Apply services filter
    if (filters.services.length > 0) {
      results = results.filter((l) =>
        filters.services.every((s) => l.services.includes(s))
      );
    }

    // Apply sorting
    const sort = this.currentSort();
    switch (sort) {
      case "price-asc":
        results.sort((a, b) => a.pricePerNight - b.pricePerNight);
        break;
      case "price-desc":
        results.sort((a, b) => b.pricePerNight - a.pricePerNight);
        break;
      case "rating":
        results.sort((a, b) => b.rating - a.rating);
        break;
      case "distance":
        results.sort((a, b) => a.distanceToSlopes - b.distanceToSlopes);
        break;
      case "popularity":
        results.sort((a, b) => b.reviewsCount - a.reviewsCount);
        break;
      case "relevance":
      default:
        // Keep original order or apply relevance algorithm
        break;
    }

    this.filteredLodgings.set(results);

    // Update sort bar count
    const sortBarComponent = this.sortBar();
    if (sortBarComponent) {
      sortBarComponent.setResultsCount(results.length);
    }
  }
}
