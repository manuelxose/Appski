import { Component, signal, inject, OnInit, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute } from "@angular/router";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { RentalFiltersComponent } from "./components/rental-filters/rental-filters.component";
import { RentalCardComponent } from "./components/rental-card/rental-card.component";
import { RentalToolbarComponent } from "./components/rental-toolbar/rental-toolbar.component";
import {
  RentalFilters,
  RentalMarketplacePageData,
  ViewMode,
} from "./models/rental-marketplace.models";
import { RentalMarketplaceDataService } from "./services/rental-marketplace.data.service";

@Component({
  selector: "app-rental-marketplace",
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    SiteFooterComponent,
    RentalFiltersComponent,
    RentalCardComponent,
    RentalToolbarComponent,
  ],
  templateUrl: "./rental-marketplace.component.html",
  styleUrls: ["./rental-marketplace.component.css"],
})
export class RentalMarketplaceComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(RentalMarketplaceDataService);

  // Page data from service
  pageData = signal<RentalMarketplacePageData | null>(null);

  // Computed properties for template-safe access
  rentalShops = computed(() => this.pageData()?.rentalShops || []);
  stations = computed(() => this.pageData()?.stations || []);
  zones = computed(() => this.pageData()?.zones || []);
  equipmentTypes = computed(() => this.pageData()?.equipmentTypes || []);
  priceRanges = computed(() => this.pageData()?.priceRanges || []);
  availabilityLevels = computed(
    () => this.pageData()?.availabilityLevels || []
  );
  sortOptions = computed(() => this.pageData()?.sortOptions || []);
  priceStats = computed(() => this.pageData()?.priceStats);
  stationContext = computed(() => this.pageData()?.station);

  // Filters
  filters = signal<RentalFilters>({
    station: "",
    zone: "",
    equipmentType: "",
    priceRange: "",
    rating: 0,
    availability: "",
  });

  showFilters = signal(false);
  viewMode = signal<ViewMode>("grid");

  // Filtered shops based on current filters
  filteredShops = computed(() => {
    const shops = this.rentalShops();
    const f = this.filters();

    let filtered = shops;

    if (f.station) {
      filtered = filtered.filter((shop) =>
        shop.nearStations.some((s) =>
          s.toLowerCase().includes(f.station.toLowerCase())
        )
      );
    }

    if (f.zone) {
      filtered = filtered.filter(
        (shop) =>
          shop.location.toLowerCase().includes(f.zone.toLowerCase()) ||
          shop.address.toLowerCase().includes(f.zone.toLowerCase())
      );
    }

    if (f.equipmentType) {
      filtered = filtered.filter((shop) =>
        shop.services.some((s) =>
          s.toLowerCase().includes(f.equipmentType.toLowerCase())
        )
      );
    }

    if (f.rating > 0) {
      filtered = filtered.filter((shop) => shop.rating >= f.rating);
    }

    if (f.availability) {
      filtered = filtered.filter(
        (shop) => shop.availability === f.availability
      );
    }

    return filtered;
  });

  /**
   * Load data on component initialization
   */
  async ngOnInit(): Promise<void> {
    const stationSlug = this.route.snapshot.paramMap.get("station");
    const data = await this.dataService.loadRentalMarketplacePageData(
      stationSlug || undefined
    );
    this.pageData.set(data);
  }

  toggleFilters() {
    this.showFilters.update((v) => !v);
  }

  setViewMode(mode: ViewMode) {
    this.viewMode.set(mode);
  }

  updateFilter(field: keyof RentalFilters, value: string | number) {
    this.filters.update((f) => ({ ...f, [field]: value }));
  }

  clearFilters() {
    this.filters.set({
      station: "",
      zone: "",
      equipmentType: "",
      priceRange: "",
      rating: 0,
      availability: "",
    });
  }

  viewShopDetail(slug: string) {
    console.log("RentalMarketplace - viewShopDetail called with slug:", slug);
    console.log("Navigating to:", ["/tienda", slug]);
    this.router.navigate(["/tienda", slug]);
  }
}
