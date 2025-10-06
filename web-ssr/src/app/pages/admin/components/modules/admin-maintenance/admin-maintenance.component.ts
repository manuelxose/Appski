import { Component, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AdminStatCardComponent } from "../../shared/admin-stat-card/admin-stat-card.component";

// Interfaces
export interface MaintenanceAsset {
  id: string;
  name: string;
  type: "chairlift" | "snowgun" | "groomer" | "building" | "infrastructure";
  category: string; // e.g., "Telesilla 4 plazas", "Cañón de nieve", "Vehículo pisapistas"
  location: string;
  status: "operational" | "maintenance" | "broken" | "retired";
  installationDate: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  totalMaintenanceHours: number;
  totalMaintenanceCost: number;
  mtbf: number; // Mean Time Between Failures (días)
  criticality: "critical" | "high" | "medium" | "low";
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
}

export interface WorkOrder {
  id: string;
  assetId: string;
  assetName: string;
  title: string;
  description: string;
  type: "preventive" | "corrective" | "inspection" | "upgrade";
  priority: "urgent" | "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  assignedTo: string;
  createdBy: string;
  createdDate: string;
  scheduledDate: string;
  completedDate?: string;
  estimatedHours: number;
  actualHours?: number;
  estimatedCost: number;
  actualCost?: number;
  parts: MaintenancePart[];
  notes?: string;
}

export interface MaintenancePart {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  supplier?: string;
}

export interface MaintenanceSchedule {
  id: string;
  assetId: string;
  assetName: string;
  taskName: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual";
  lastPerformed: string;
  nextDue: string;
  assignedTo: string;
  estimatedDuration: number; // horas
  status: "on-schedule" | "due-soon" | "overdue";
}

@Component({
  selector: "app-admin-maintenance",
  standalone: true,
  imports: [CommonModule, AdminStatCardComponent],
  templateUrl: "./admin-maintenance.component.html",
  styleUrl: "./admin-maintenance.component.css",
})
export class AdminMaintenanceComponent implements OnInit {
  // Signals de datos
  readonly assets = signal<MaintenanceAsset[]>([]);
  readonly workOrders = signal<WorkOrder[]>([]);
  readonly schedules = signal<MaintenanceSchedule[]>([]);

  // Signals de filtros
  readonly selectedAssetType = signal<string>("all");
  readonly selectedStatus = signal<string>("all");
  readonly selectedPriority = signal<string>("all");
  readonly searchTerm = signal<string>("");

  // Signals computadas - estadísticas
  readonly totalAssets = computed(() => this.assets().length);
  readonly operationalAssets = computed(
    () => this.assets().filter((a) => a.status === "operational").length
  );
  readonly activeWorkOrders = computed(
    () => this.workOrders().filter((wo) => wo.status === "in-progress").length
  );
  readonly overdueSchedules = computed(
    () => this.schedules().filter((s) => s.status === "overdue").length
  );
  readonly totalMaintenanceCost = computed(() =>
    this.workOrders()
      .filter((wo) => wo.status === "completed")
      .reduce((sum, wo) => sum + (wo.actualCost || 0), 0)
  );
  readonly averageMTBF = computed(() => {
    const assets = this.assets();
    if (assets.length === 0) return 0;
    return assets.reduce((sum, a) => sum + a.mtbf, 0) / assets.length;
  });

  // Work Orders filtradas
  readonly filteredWorkOrders = computed(() => {
    let filtered = this.workOrders();

    // Filtro por estado
    const status = this.selectedStatus();
    if (status !== "all") {
      filtered = filtered.filter((wo) => wo.status === status);
    }

    // Filtro por prioridad
    const priority = this.selectedPriority();
    if (priority !== "all") {
      filtered = filtered.filter((wo) => wo.priority === priority);
    }

    // Filtro por búsqueda
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (wo) =>
          wo.title.toLowerCase().includes(search) ||
          wo.assetName.toLowerCase().includes(search) ||
          wo.assignedTo.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  // Assets filtrados
  readonly filteredAssets = computed(() => {
    let filtered = this.assets();

    const assetType = this.selectedAssetType();
    if (assetType !== "all") {
      filtered = filtered.filter((a) => a.type === assetType);
    }

    return filtered;
  });

  // Top 5 assets con más mantenimiento
  readonly topMaintenanceAssets = computed(() =>
    [...this.assets()]
      .sort((a, b) => b.totalMaintenanceCost - a.totalMaintenanceCost)
      .slice(0, 5)
  );

  // Próximos mantenimientos programados
  readonly upcomingSchedules = computed(() =>
    [...this.schedules()]
      .filter((s) => s.status === "due-soon" || s.status === "overdue")
      .sort(
        (a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime()
      )
      .slice(0, 10)
  );

  // Work orders urgentes
  readonly urgentWorkOrders = computed(() =>
    this.workOrders().filter(
      (wo) =>
        wo.priority === "urgent" &&
        wo.status !== "completed" &&
        wo.status !== "cancelled"
    )
  );

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      const [assetsData, workOrdersData, schedulesData] = await Promise.all([
        fetch("/assets/mocks/admin/maintenance-assets.json").then((r) =>
          r.json()
        ),
        fetch("/assets/mocks/admin/maintenance-work-orders.json").then((r) =>
          r.json()
        ),
        fetch("/assets/mocks/admin/maintenance-schedules.json").then((r) =>
          r.json()
        ),
      ]);

      this.assets.set(assetsData);
      this.workOrders.set(workOrdersData);
      this.schedules.set(schedulesData);
    } catch (error) {
      console.error("Error loading maintenance data:", error);
    }
  }

  // Métodos de utilidad
  getAssetTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      chairlift: "🚡",
      snowgun: "❄️",
      groomer: "🚜",
      building: "🏢",
      infrastructure: "🏗️",
    };
    return icons[type] || "⚙️";
  }

  getAssetTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      chairlift: "Telesilla",
      snowgun: "Cañón de nieve",
      groomer: "Pisapistas",
      building: "Edificio",
      infrastructure: "Infraestructura",
    };
    return labels[type] || type;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      operational: "bg-green-50 border-green-200 text-green-700",
      maintenance: "bg-yellow-50 border-yellow-200 text-yellow-700",
      broken: "bg-red-50 border-red-200 text-red-700",
      retired: "bg-gray-50 border-gray-200 text-gray-700",
    };
    return classes[status] || "bg-gray-50 border-gray-200 text-gray-700";
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      operational: "Operativo",
      maintenance: "Mantenimiento",
      broken: "Averiado",
      retired: "Retirado",
      pending: "Pendiente",
      "in-progress": "En Progreso",
      completed: "Completado",
      cancelled: "Cancelado",
      "on-schedule": "Programado",
      "due-soon": "Próximo",
      overdue: "Atrasado",
    };
    return labels[status] || status;
  }

  getPriorityClass(priority: string): string {
    const classes: Record<string, string> = {
      urgent: "bg-red-50 border-red-300 text-red-700",
      high: "bg-orange-50 border-orange-300 text-orange-700",
      medium: "bg-yellow-50 border-yellow-200 text-yellow-700",
      low: "bg-blue-50 border-blue-200 text-blue-700",
    };
    return classes[priority] || "bg-gray-50 border-gray-200 text-gray-700";
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      urgent: "🚨 Urgente",
      high: "⚠️ Alta",
      medium: "📋 Media",
      low: "📝 Baja",
    };
    return labels[priority] || priority;
  }

  getWorkOrderTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      preventive: "🛡️",
      corrective: "🔧",
      inspection: "🔍",
      upgrade: "⬆️",
    };
    return icons[type] || "📋";
  }

  getWorkOrderTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      preventive: "Preventivo",
      corrective: "Correctivo",
      inspection: "Inspección",
      upgrade: "Mejora",
    };
    return labels[type] || type;
  }

  getCriticalityClass(criticality: string): string {
    const classes: Record<string, string> = {
      critical: "bg-red-50 border-red-300 text-red-700",
      high: "bg-orange-50 border-orange-200 text-orange-700",
      medium: "bg-yellow-50 border-yellow-200 text-yellow-700",
      low: "bg-green-50 border-green-200 text-green-700",
    };
    return classes[criticality] || "bg-gray-50 border-gray-200 text-gray-700";
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

  getDaysUntil(date: string): number {
    const now = new Date();
    const target = new Date(date);
    const diff = target.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Métodos de acción (placeholders)
  createWorkOrder(): void {
    console.log("Crear orden de trabajo");
  }

  editWorkOrder(workOrderId: string): void {
    console.log("Editar orden de trabajo:", workOrderId);
  }

  completeWorkOrder(workOrderId: string): void {
    console.log("Completar orden de trabajo:", workOrderId);
  }

  viewAssetHistory(assetId: string): void {
    console.log("Ver historial del activo:", assetId);
  }

  generateMaintenanceReport(): void {
    console.log("Generar informe de mantenimiento");
  }

  exportMaintenanceData(): void {
    console.log("Exportar datos de mantenimiento");
  }
}
