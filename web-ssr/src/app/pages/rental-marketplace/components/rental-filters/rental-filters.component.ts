import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  RentalFilters,
  StationConfig,
  ZoneConfig,
  EquipmentTypeConfig,
} from "../../models/rental-marketplace.models";

@Component({
  selector: "app-rental-filters",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./rental-filters.component.html",
  styleUrls: ["./rental-filters.component.css"],
})
export class RentalFiltersComponent {
  // Inputs - configuration from parent
  stations = input<StationConfig[]>([]);
  zones = input<ZoneConfig[]>([]);
  equipmentTypes = input<EquipmentTypeConfig[]>([]);
  filters = input.required<RentalFilters>();
  showFilters = input<boolean>(false);

  // Outputs - emit filter changes to parent
  filterChange = output<{
    field: keyof RentalFilters;
    value: string | number;
  }>();
  clearFilters = output<void>();
}
