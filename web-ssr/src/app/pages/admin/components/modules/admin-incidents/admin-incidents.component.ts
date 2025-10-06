import { Component, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AdminStatCardComponent } from "../../shared/admin-stat-card/admin-stat-card.component";

// Interfaces
export interface Incident {
  id: string;
  title: string;
  description: string;
  category:
    | "accident"
    | "equipment-failure"
    | "safety"
    | "weather"
    | "infrastructure"
    | "other";
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "resolved" | "closed";
  location: string;
  reportedBy: string;
  reportedDate: string;
  assignedTo?: string;
  resolvedDate?: string;
  resolutionTime?: number; // minutos
  affectedEquipment?: string;
  affectedPeople?: number;
  injuries?: boolean;
  actions: IncidentAction[];
  rootCause?: string;
  preventiveMeasures?: string;
  cost?: number;
  priority: number; // 1 (highest) to 5 (lowest)
}

export interface IncidentAction {
  id: string;
  timestamp: string;
  performedBy: string;
  action: string;
  notes?: string;
}

export interface IncidentStats {
  category: string;
  totalIncidents: number;
  criticalIncidents: number;
  averageResolutionTime: number; // minutos
  resolved: number;
  open: number;
}

@Component({
  selector: "app-admin-incidents",
  standalone: true,
  imports: [CommonModule, AdminStatCardComponent],
  templateUrl: "./admin-incidents.component.html",
  styleUrl: "./admin-incidents.component.css",
})
export class AdminIncidentsComponent implements OnInit {
  // Signals de datos
  readonly incidents = signal<Incident[]>([]);
  readonly stats = signal<IncidentStats[]>([]);

  // Signals de filtros
  readonly selectedCategory = signal<string>("all");
  readonly selectedSeverity = signal<string>("all");
  readonly selectedStatus = signal<string>("all");
  readonly searchTerm = signal<string>("");

  // Signals computadas - estadísticas generales
  readonly totalIncidents = computed(() => this.incidents().length);
  readonly openIncidents = computed(
    () =>
      this.incidents().filter(
        (i) => i.status === "open" || i.status === "in-progress"
      ).length
  );
  readonly criticalIncidents = computed(
    () =>
      this.incidents().filter(
        (i) =>
          i.severity === "critical" &&
          i.status !== "resolved" &&
          i.status !== "closed"
      ).length
  );
  readonly averageResolutionTime = computed(() => {
    const resolved = this.incidents().filter((i) => i.resolutionTime);
    if (resolved.length === 0) return 0;
    const total = resolved.reduce((sum, i) => sum + (i.resolutionTime || 0), 0);
    return Math.round(total / resolved.length);
  });
  readonly totalInjuries = computed(
    () => this.incidents().filter((i) => i.injuries).length
  );
  readonly totalCost = computed(() =>
    this.incidents().reduce((sum, i) => sum + (i.cost || 0), 0)
  );

  // Incidentes filtrados
  readonly filteredIncidents = computed(() => {
    let filtered = this.incidents();

    // Filtro por categoría
    const category = this.selectedCategory();
    if (category !== "all") {
      filtered = filtered.filter((i) => i.category === category);
    }

    // Filtro por gravedad
    const severity = this.selectedSeverity();
    if (severity !== "all") {
      filtered = filtered.filter((i) => i.severity === severity);
    }

    // Filtro por estado
    const status = this.selectedStatus();
    if (status !== "all") {
      filtered = filtered.filter((i) => i.status === status);
    }

    // Filtro por búsqueda
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (i) =>
          i.title.toLowerCase().includes(search) ||
          i.location.toLowerCase().includes(search) ||
          i.description.toLowerCase().includes(search)
      );
    }

    return filtered.sort((a, b) => {
      // Ordenar por prioridad (críticos primero) y fecha
      if (a.severity !== b.severity) {
        const severityOrder = { critical: 1, high: 2, medium: 3, low: 4 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return (
        new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime()
      );
    });
  });

  // Incidentes críticos activos
  readonly activeCriticalIncidents = computed(() =>
    this.incidents().filter(
      (i) =>
        i.severity === "critical" &&
        (i.status === "open" || i.status === "in-progress")
    )
  );

  // Incidentes recientes (últimos 7 días)
  readonly recentIncidents = computed(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return this.incidents().filter(
      (i) => new Date(i.reportedDate) >= sevenDaysAgo
    ).length;
  });

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      const [incidentsData, statsData] = await Promise.all([
        fetch("/assets/mocks/admin/incidents.json").then((r) => r.json()),
        fetch("/assets/mocks/admin/incident-stats.json").then((r) => r.json()),
      ]);

      this.incidents.set(incidentsData);
      this.stats.set(statsData);
    } catch (error) {
      console.error("Error loading incidents data:", error);
    }
  }

  // Métodos de utilidad
  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      accident: "🚑",
      "equipment-failure": "⚙️",
      safety: "⚠️",
      weather: "🌨️",
      infrastructure: "🏗️",
      other: "📋",
    };
    return icons[category] || "📋";
  }

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      accident: "Accidente",
      "equipment-failure": "Avería Equipo",
      safety: "Seguridad",
      weather: "Climatología",
      infrastructure: "Infraestructura",
      other: "Otro",
    };
    return labels[category] || category;
  }

  getSeverityClass(severity: string): string {
    const classes: Record<string, string> = {
      critical: "bg-red-50 border-red-300 text-red-700",
      high: "bg-orange-50 border-orange-300 text-orange-700",
      medium: "bg-yellow-50 border-yellow-200 text-yellow-700",
      low: "bg-blue-50 border-blue-200 text-blue-700",
    };
    return classes[severity] || "bg-gray-50 border-gray-200 text-gray-700";
  }

  getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      critical: "🔴 Crítico",
      high: "🟠 Alto",
      medium: "🟡 Medio",
      low: "🔵 Bajo",
    };
    return labels[severity] || severity;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      open: "bg-red-50 border-red-200 text-red-700",
      "in-progress": "bg-yellow-50 border-yellow-200 text-yellow-700",
      resolved: "bg-green-50 border-green-200 text-green-700",
      closed: "bg-gray-50 border-gray-200 text-gray-700",
    };
    return classes[status] || "bg-gray-50 border-gray-200 text-gray-700";
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: "Abierto",
      "in-progress": "En Progreso",
      resolved: "Resuelto",
      closed: "Cerrado",
    };
    return labels[status] || status;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  formatDateTime(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }

  getTimeSinceReport(reportDate: string): string {
    const now = new Date();
    const reported = new Date(reportDate);
    const diff = now.getTime() - reported.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `Hace ${days} día${days > 1 ? "s" : ""}`;
    } else if (hours > 0) {
      return `Hace ${hours} hora${hours > 1 ? "s" : ""}`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `Hace ${minutes} min`;
    }
  }

  // Métodos de acción (placeholders)
  createIncident(): void {
    console.log("Crear nuevo incidente");
  }

  viewIncidentDetails(incidentId: string): void {
    console.log("Ver detalles del incidente:", incidentId);
  }

  assignIncident(incidentId: string): void {
    console.log("Asignar incidente:", incidentId);
  }

  updateIncidentStatus(incidentId: string, newStatus: string): void {
    console.log("Actualizar estado del incidente:", incidentId, newStatus);
  }

  generateIncidentReport(): void {
    console.log("Generar informe de incidentes");
  }

  exportIncidentsData(): void {
    console.log("Exportar datos de incidentes");
  }
}
