import { Component, output, signal, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import {
  LodgingFilters,
  LodgingTypeConfig,
  ServiceConfig,
} from "../../models/lodging-marketplace.models";

@Component({
  selector: "app-lodging-filters",
  templateUrl: "./lodging-filters.component.html",
  styleUrls: ["./lodging-filters.component.css"],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class LodgingFiltersComponent {
  // Inputs from parent - NO hardcoded data
  lodgingTypes = input<LodgingTypeConfig[]>([]);
  services = input<ServiceConfig[]>([]);

  // Output event for filter changes
  filtersChanged = output<LodgingFilters>();

  // Filter state
  selectedTypes = signal<string[]>([]);
  priceMin = signal(0);
  priceMax = signal(500);
  selectedServices = signal<string[]>([]);
  maxDistance = signal(10);
  minRating = signal(0);

  onTypeToggle(type: string): void {
    const current = this.selectedTypes();
    if (current.includes(type)) {
      this.selectedTypes.set(current.filter((t) => t !== type));
    } else {
      this.selectedTypes.set([...current, type]);
    }
    this.emitFilters();
  }

  onServiceToggle(service: string): void {
    const current = this.selectedServices();
    if (current.includes(service)) {
      this.selectedServices.set(current.filter((s) => s !== service));
    } else {
      this.selectedServices.set([...current, service]);
    }
    this.emitFilters();
  }

  onPriceChange(): void {
    this.emitFilters();
  }

  onDistanceChange(): void {
    this.emitFilters();
  }

  onRatingChange(rating: number): void {
    this.minRating.set(rating);
    this.emitFilters();
  }

  resetFilters(): void {
    this.selectedTypes.set([]);
    this.priceMin.set(0);
    this.priceMax.set(500);
    this.selectedServices.set([]);
    this.maxDistance.set(10);
    this.minRating.set(0);
    this.emitFilters();
  }

  private emitFilters(): void {
    this.filtersChanged.emit({
      types: this.selectedTypes(),
      priceRange: { min: this.priceMin(), max: this.priceMax() },
      services: this.selectedServices(),
      maxDistance: this.maxDistance(),
      minRating: this.minRating(),
    });
  }
}
