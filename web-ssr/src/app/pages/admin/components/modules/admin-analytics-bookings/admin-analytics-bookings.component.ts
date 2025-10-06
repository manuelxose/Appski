import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * INTERFACES - Analytics de Bookings
 */

interface BookingTypeDistribution {
  type: "forfait" | "alojamiento" | "alquiler" | "clases" | "paquete";
  label: string;
  count: number;
  revenue: number;
  percentage: number;
  avgValue: number;
  color: string;
}

interface BookingStatus {
  status: "pending" | "confirmed" | "cancelled" | "completed";
  count: number;
  percentage: number;
}

interface OccupancyHeatmap {
  date: string;
  dayOfWeek: number; // 0-6
  weekOfMonth: number; // 1-5
  occupancy: number; // 0-100
  bookings: number;
}

interface DemandForecast {
  date: string;
  predictedBookings: number;
  confidence: number; // 0-100
  actualBookings?: number;
}

interface PriceElasticity {
  priceChange: number; // Porcentaje
  demandChange: number; // Porcentaje
  elasticity: number; // demandChange / priceChange
  optimalPrice: number;
}

interface LeadTime {
  range: string; // "0-7 días", "8-30 días", etc.
  bookings: number;
  percentage: number;
  avgValue: number;
}

/**
 * AdminAnalyticsBookingsComponent - B5
 *
 * Dashboard de analítica de reservas.
 *
 * @author AI Assistant
 * @date 2025-10-03
 */
@Component({
  selector: "app-admin-analytics-bookings",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-analytics-bookings.component.html",
  styleUrl: "./admin-analytics-bookings.component.css",
})
export class AdminAnalyticsBookingsComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly typeDistribution = signal<BookingTypeDistribution[]>([]);
  readonly statusDistribution = signal<BookingStatus[]>([]);
  readonly occupancyHeatmap = signal<OccupancyHeatmap[]>([]);
  readonly demandForecast = signal<DemandForecast[]>([]);
  readonly priceElasticity = signal<PriceElasticity | null>(null);
  readonly leadTimeDistribution = signal<LeadTime[]>([]);

  readonly timeRange = signal<"7d" | "30d" | "90d" | "1y">("30d");
  readonly selectedType = signal<string | null>(null);

  readonly totalBookings = computed(() =>
    this.typeDistribution().reduce((sum, t) => sum + t.count, 0)
  );

  readonly totalRevenue = computed(() =>
    this.typeDistribution().reduce((sum, t) => sum + t.revenue, 0)
  );

  readonly avgBookingValue = computed(() => {
    const total = this.totalBookings();
    return total > 0 ? this.totalRevenue() / total : 0;
  });

  readonly conversionRate = computed(() => {
    const confirmed = this.statusDistribution().find(
      (s) => s.status === "confirmed"
    );
    const total = this.statusDistribution().reduce(
      (sum, s) => sum + s.count,
      0
    );
    return total > 0 && confirmed ? (confirmed.count / total) * 100 : 0;
  });

  readonly cancellationRate = computed(() => {
    const cancelled = this.statusDistribution().find(
      (s) => s.status === "cancelled"
    );
    const total = this.statusDistribution().reduce(
      (sum, s) => sum + s.count,
      0
    );
    return total > 0 && cancelled ? (cancelled.count / total) * 100 : 0;
  });

  ngOnInit(): void {
    this.loadBookingsAnalytics();
  }

  async loadBookingsAnalytics(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [analytics, heatmap] = await Promise.all([
        fetch("/assets/mocks/admin/analytics-bookings.json").then((r) =>
          r.json()
        ),
        fetch("/assets/mocks/admin/occupancy-heatmap.json").then((r) =>
          r.json()
        ),
      ]);

      this.typeDistribution.set(analytics.typeDistribution || []);
      this.statusDistribution.set(analytics.statusDistribution || []);
      this.demandForecast.set(analytics.demandForecast || []);
      this.priceElasticity.set(analytics.priceElasticity || null);
      this.leadTimeDistribution.set(analytics.leadTimeDistribution || []);
      this.occupancyHeatmap.set(heatmap.data || []);
    } catch (err) {
      console.error("Error loading bookings analytics:", err);
      this.error.set("Error al cargar analítica de reservas");
    } finally {
      this.isLoading.set(false);
    }
  }

  setTimeRange(range: "7d" | "30d" | "90d" | "1y"): void {
    this.timeRange.set(range);
    this.loadBookingsAnalytics();
  }

  selectType(type: string | null): void {
    this.selectedType.set(type);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(value);
  }

  formatPercent(value: number, includeSign = false): string {
    const sign = includeSign && value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat("es-ES").format(value);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: "Pendiente",
      confirmed: "Confirmada",
      cancelled: "Cancelada",
      completed: "Completada",
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: "status-warning",
      confirmed: "status-success",
      cancelled: "status-danger",
      completed: "status-info",
    };
    return classes[status] || "";
  }

  getOccupancyClass(occupancy: number): string {
    if (occupancy >= 80) return "occupancy-high";
    if (occupancy >= 50) return "occupancy-medium";
    return "occupancy-low";
  }

  exportBookingsAnalytics(format: "csv" | "excel" | "pdf"): void {
    console.log(`Exporting bookings analytics as ${format}`);
  }

  refreshData(): void {
    this.loadBookingsAnalytics();
  }
}
