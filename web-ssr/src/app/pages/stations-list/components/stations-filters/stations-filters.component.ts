import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
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
  /** Opciones de filtro REALES (regiones/tipos del maestro del borde). */
  readonly regionOptions = input<ReadonlyArray<{ value: string; label: string }>>([{ value: "", label: "Todas las regiones" }]);

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

  /**
   * Opciones de filtro: salen del MAESTRO REAL del borde, no de listas fijas.
   * El padre las inyecta tras `GET /v1/stations` (ver `stations-list.ts`). Una
   * lista hardcodeada aquí ofrecía comarcas ("Sierra Nevada", "Sistema Ibérico")
   * que no son regiones del maestro y no filtraban nada.
   */
  regions: ReadonlyArray<{ value: string; label: string }> = [{ value: "", label: "Todas las regiones" }];
  stationTypes: ReadonlyArray<{ value: string; label: string }> = [
    { value: "", label: "Todos los tipos" },
    { value: "alpine", label: "Alpino" },
    { value: "nordic", label: "Nórdico" },
  ];
  /** El borde no publica servicios por estación: no se ofrecen opciones. */
  services: ReadonlyArray<{ value: StationFilters["services"][number]; label: string }> = [];

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
