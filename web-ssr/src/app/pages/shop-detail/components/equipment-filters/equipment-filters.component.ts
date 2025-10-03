import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type {
  EquipmentCategory,
  OfferTypeFilter,
} from "../../models/shop-detail.models";

@Component({
  selector: "app-equipment-filters",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./equipment-filters.component.html",
  styleUrl: "./equipment-filters.component.css",
})
export class EquipmentFiltersComponent {
  // Inputs
  categories = input.required<EquipmentCategory[]>();
  selectedCategory = input.required<EquipmentCategory>();
  offerType = input.required<OfferTypeFilter>();
  showOnlyAvailable = input.required<boolean>();
  totalCount = input.required<number>();
  getCategoryCount = input.required<(category: string) => number>();

  // Outputs
  categoryChange = output<EquipmentCategory>();
  offerTypeChange = output<OfferTypeFilter>();
  availabilityToggle = output<void>();

  onCategoryClick(category: EquipmentCategory): void {
    this.categoryChange.emit(category);
  }

  onOfferTypeClick(type: OfferTypeFilter): void {
    this.offerTypeChange.emit(type);
  }

  onAvailabilityChange(): void {
    this.availabilityToggle.emit();
  }

  getCategoryLabel(category: EquipmentCategory): string {
    const labels: Record<EquipmentCategory, string> = {
      all: "Todo",
      Esquís: "Esquís",
      Snowboard: "Snowboard",
      Cascos: "Cascos",
      Ropa: "Ropa",
      Accesorios: "Accesorios",
    };
    return labels[category];
  }

  getCategoryIcon(category: EquipmentCategory): string {
    const icons: Record<EquipmentCategory, string> = {
      all: "inventory_2",
      Esquís: "downhill_skiing",
      Snowboard: "snowboarding",
      Cascos: "sports_motorsports",
      Ropa: "checkroom",
      Accesorios: "shopping_bag",
    };
    return icons[category];
  }
}
