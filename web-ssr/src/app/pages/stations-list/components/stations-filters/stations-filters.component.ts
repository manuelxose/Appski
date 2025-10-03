import { ChangeDetectionStrategy, Component, output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import type { StationFilters } from "../../models/stations-list.models";

// Re-export para compatibilidad con otros componentes
export type { StationFilters };

@Component({
  selector: "app-stations-filters",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./stations-filters.component.html",
  styleUrls: ["./stations-filters.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationsFiltersComponent {
  // Outputs para emitir eventos al padre
  filtersChanged = output<StationFilters>();
  filtersReset = output<void>();

  // Estado de los filtros
  selectedRegion: StationFilters["region"] = "";
  selectedType: StationFilters["type"] = "";
  minAltitude: StationFilters["minAltitude"] = 0;
  snowMin: StationFilters["snowMin"] = 0;
  selectedServices: StationFilters["services"] = [];
  selectedStatus: StationFilters["status"] = "";

  // Opciones de filtros
  regions = [
    { value: "", label: "Todas las regiones" },
    { value: "pyrenees", label: "Pirineos" },
    { value: "sierra-nevada", label: "Sierra Nevada" },
    { value: "sistema-central", label: "Sistema Central" },
    { value: "cordillera-cantabrica", label: "Cordillera Cantábrica" },
    { value: "sistema-iberico", label: "Sistema Ibérico" },
  ];

  stationTypes = [
    { value: "", label: "Todos los tipos" },
    { value: "alpine", label: "Alpino" },
    { value: "nordic", label: "Nórdico" },
    { value: "freeride", label: "Freeride" },
    { value: "family", label: "Familiar" },
  ];

  services: Array<{
    value: StationFilters["services"][number];
    label: string;
  }> = [
    { value: "ski-school", label: "Escuela de esquí" },
    { value: "equipment-rental", label: "Alquiler de material" },
    { value: "restaurant", label: "Restaurantes" },
    { value: "parking", label: "Parking" },
    { value: "kids-area", label: "Zona infantil" },
    { value: "snow-park", label: "Snow park" },
  ];

  statusOptions = [
    { value: "", label: "Cualquier estado" },
    { value: "open", label: "Abierto" },
    { value: "closed", label: "Cerrado" },
  ];

  onServiceToggle(serviceValue: StationFilters["services"][number]): void {
    const index = this.selectedServices.indexOf(serviceValue);
    if (index > -1) {
      this.selectedServices = this.selectedServices.filter(
        (s: string) => s !== serviceValue
      );
    } else {
      this.selectedServices = [...this.selectedServices, serviceValue];
    }
  }

  applyFilters(): void {
    this.filtersChanged.emit({
      region: this.selectedRegion,
      type: this.selectedType,
      minAltitude: this.minAltitude,
      snowMin: this.snowMin,
      services: this.selectedServices,
      status: this.selectedStatus,
    });
  }

  resetFilters(): void {
    this.selectedRegion = "";
    this.selectedType = "";
    this.minAltitude = 0;
    this.snowMin = 0;
    this.selectedServices = [];
    this.selectedStatus = "";
    this.filtersReset.emit();
  }
}
