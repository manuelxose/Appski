import { Component, output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";

export interface RentalFilters {
  equipmentTypes: string[];
  level: string;
  duration: number;
  services: string[];
}

@Component({
  selector: "app-rental-filters",
  templateUrl: "./rental-filters.component.html",
  styleUrls: ["./rental-filters.component.css"],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class RentalFiltersComponent {
  // Output event for filter changes
  filtersChanged = output<RentalFilters>();

  // Filter state
  selectedEquipmentTypes = signal<string[]>([]);
  selectedLevel = signal<string>("all");
  duration = signal(1);
  selectedServices = signal<string[]>([]);

  // Available options
  readonly equipmentTypes = [
    { value: "skis", label: "Esquís", icon: "⛷️" },
    { value: "snowboard", label: "Snowboard", icon: "🏂" },
    { value: "boots", label: "Botas", icon: "👢" },
    { value: "poles", label: "Bastones", icon: "🎿" },
    { value: "helmet", label: "Casco", icon: "⛑️" },
    { value: "goggles", label: "Gafas", icon: "🥽" },
    { value: "snowshoes", label: "Raquetas", icon: "🥾" },
    { value: "clothing", label: "Ropa", icon: "🧥" },
  ];

  readonly levels = [
    { value: "all", label: "Todos los niveles" },
    { value: "beginner", label: "Principiante" },
    { value: "intermediate", label: "Intermedio" },
    { value: "advanced", label: "Avanzado" },
    { value: "expert", label: "Experto" },
  ];

  readonly services = [
    { value: "delivery", label: "Entrega en hotel", icon: "🚚" },
    { value: "insurance", label: "Seguro incluido", icon: "🛡️" },
    { value: "online-booking", label: "Reserva online", icon: "💻" },
    { value: "fitting-service", label: "Ajuste personalizado", icon: "🔧" },
    { value: "storage", label: "Guardado nocturno", icon: "🏪" },
    { value: "exchange", label: "Cambio gratuito", icon: "🔄" },
  ];

  onEquipmentTypeToggle(type: string): void {
    const current = this.selectedEquipmentTypes();
    if (current.includes(type)) {
      this.selectedEquipmentTypes.set(current.filter((t) => t !== type));
    } else {
      this.selectedEquipmentTypes.set([...current, type]);
    }
    this.emitFilters();
  }

  onLevelChange(): void {
    this.emitFilters();
  }

  onDurationChange(): void {
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

  resetFilters(): void {
    this.selectedEquipmentTypes.set([]);
    this.selectedLevel.set("all");
    this.duration.set(1);
    this.selectedServices.set([]);
    this.emitFilters();
  }

  private emitFilters(): void {
    this.filtersChanged.emit({
      equipmentTypes: this.selectedEquipmentTypes(),
      level: this.selectedLevel(),
      duration: this.duration(),
      services: this.selectedServices(),
    });
  }
}
