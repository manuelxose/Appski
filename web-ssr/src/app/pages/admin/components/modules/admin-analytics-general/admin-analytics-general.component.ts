import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

// Shared Components
import { AdminBreadcrumbsComponent } from "../../shared/admin-breadcrumbs/admin-breadcrumbs.component";
import { AdminStatCardComponent } from "../../shared/admin-stat-card/admin-stat-card.component";
import { AdminLoaderComponent } from "../../shared/admin-loader/admin-loader.component";

// Types
export interface AnalyticsMetrics {
  totalUsers: MetricValue;
  activeUsers: MetricValue;
  totalBookings: MetricValue;
  conversionRate: MetricValue;
  totalRevenue: MetricValue;
  trafficSessions: MetricValue;
}

export interface MetricValue {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "neutral";
}

export interface ChartData {
  id: string;
  type: "line" | "bar" | "donut" | "area" | "heatmap" | "funnel";
  title: string;
  data: unknown;
  options?: Record<string, unknown>;
}

export interface FunnelStage {
  stage: string;
  value: number;
  percentage: number;
  dropOff: number;
}

export interface MonthlyData {
  month: string;
  current: number;
  previous: number;
}

export type ComparisonPeriod = "none" | "yoy" | "mom" | "wow";
export type DateRangePreset =
  | "today"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "custom";

export interface DailyUserData {
  date: string;
  users: number;
}

export interface HeatmapPoint {
  day: string;
  hour: string;
  value: number;
}

@Component({
  selector: "app-admin-analytics-general",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminBreadcrumbsComponent,
    AdminStatCardComponent,
    AdminLoaderComponent,
  ],
  templateUrl: "./admin-analytics-general.component.html",
  styleUrls: ["./admin-analytics-general.component.css"],
})
export class AdminAnalyticsGeneralComponent implements OnInit {
  // State signals
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Metrics
  metrics = signal<AnalyticsMetrics>({
    totalUsers: {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: "neutral",
    },
    activeUsers: {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: "neutral",
    },
    totalBookings: {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: "neutral",
    },
    conversionRate: {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: "neutral",
    },
    totalRevenue: {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: "neutral",
    },
    trafficSessions: {
      current: 0,
      previous: 0,
      change: 0,
      changePercent: 0,
      trend: "neutral",
    },
  });

  // Charts
  charts = signal<ChartData[]>([]);

  // Filters
  dateRangePreset = signal<DateRangePreset>("month");
  comparisonPeriod = signal<ComparisonPeriod>("yoy");
  selectedStations = signal<string[]>([]);

  // Custom date range
  customStartDate = signal<string>("");
  customEndDate = signal<string>("");

  // Funnel data
  funnelData = signal<FunnelStage[]>([]);

  // Monthly revenue data
  monthlyRevenue = signal<MonthlyData[]>([]);

  // Breadcrumbs
  breadcrumbs = [
    { label: "Dashboard", url: "/admin/dashboard" },
    { label: "Analytics", url: "/admin/analytics" },
    { label: "General", url: "/admin/analytics/general" },
  ];

  // Computed
  hasComparison = computed(() => this.comparisonPeriod() !== "none");

  comparisonLabel = computed(() => {
    const period = this.comparisonPeriod();
    switch (period) {
      case "yoy":
        return "vs. año anterior";
      case "mom":
        return "vs. mes anterior";
      case "wow":
        return "vs. semana anterior";
      default:
        return "";
    }
  });

  ngOnInit(): void {
    this.loadAnalytics();
  }

  async loadAnalytics(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [metrics, funnel, monthly] = await Promise.all([
        fetch("/assets/mocks/analytics-general.json").then((r) => r.json()),
        fetch("/assets/mocks/funnel-conversion.json").then((r) => r.json()),
        fetch("/assets/mocks/charts-revenue-monthly.json").then((r) =>
          r.json()
        ),
      ]);

      this.metrics.set(metrics);
      this.funnelData.set(funnel.stages);
      this.monthlyRevenue.set(monthly.data);

      this.generateCharts();
    } catch (err) {
      this.error.set("Error al cargar los datos de analytics");
      console.error("Error loading analytics:", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  generateCharts(): void {
    const charts: ChartData[] = [
      {
        id: "revenue-monthly",
        type: "line",
        title: "Revenue Mensual",
        data: this.monthlyRevenue(),
        options: {
          showComparison: this.hasComparison(),
        },
      },
      {
        id: "bookings-by-station",
        type: "bar",
        title: "Bookings por Estación",
        data: [
          { station: "Baqueira-Beret", bookings: 1245 },
          { station: "Sierra Nevada", bookings: 987 },
          { station: "Formigal", bookings: 856 },
          { station: "Candanchú", bookings: 654 },
          { station: "La Molina", bookings: 543 },
        ],
      },
      {
        id: "revenue-distribution",
        type: "donut",
        title: "Distribución de Revenue",
        data: [
          { label: "Bookings", value: 125000, color: "#3b82f6" },
          { label: "Premium", value: 45000, color: "#8b5cf6" },
          { label: "Comisiones", value: 28000, color: "#10b981" },
          { label: "Publicidad", value: 12000, color: "#f59e0b" },
        ],
      },
      {
        id: "active-users-daily",
        type: "area",
        title: "Usuarios Activos Diarios",
        data: this.generateDailyActiveUsersData(),
      },
      {
        id: "activity-heatmap",
        type: "heatmap",
        title: "Actividad por Día/Hora",
        data: this.generateHeatmapData(),
      },
      {
        id: "conversion-funnel",
        type: "funnel",
        title: "Embudo de Conversión",
        data: this.funnelData(),
      },
    ];

    this.charts.set(charts);
  }

  generateDailyActiveUsersData(): DailyUserData[] {
    const data: DailyUserData[] = [];
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Simulate DAU data with some variance
      const baseValue = 2500;
      const variance = Math.floor(Math.random() * 800) - 400;
      const weekendBoost = date.getDay() === 0 || date.getDay() === 6 ? 600 : 0;

      data.push({
        date: date.toISOString().split("T")[0],
        users: baseValue + variance + weekendBoost,
      });
    }

    return data;
  }

  generateHeatmapData(): HeatmapPoint[] {
    const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const data: HeatmapPoint[] = [];

    days.forEach((day, dayIndex) => {
      hours.forEach((hour, hourIndex) => {
        // Simulate activity patterns
        let activity = 0;

        // Business hours boost (9-18)
        if (hourIndex >= 9 && hourIndex <= 18) {
          activity += 50;
        }

        // Evening boost (19-22)
        if (hourIndex >= 19 && hourIndex <= 22) {
          activity += 70;
        }

        // Weekend boost
        if (dayIndex >= 5) {
          activity += 30;
        }

        // Random variance
        activity += Math.floor(Math.random() * 30);

        data.push({
          day,
          hour,
          value: activity,
        });
      });
    });

    return data;
  }

  setDateRangePreset(preset: DateRangePreset): void {
    this.dateRangePreset.set(preset);

    if (preset !== "custom") {
      this.loadAnalytics();
    }
  }

  setComparisonPeriod(period: ComparisonPeriod): void {
    this.comparisonPeriod.set(period);
    this.generateCharts();
  }

  applyCustomDateRange(): void {
    const start = this.customStartDate();
    const end = this.customEndDate();

    if (!start || !end) {
      this.error.set("Selecciona un rango de fechas válido");
      return;
    }

    if (new Date(start) > new Date(end)) {
      this.error.set("La fecha de inicio debe ser anterior a la fecha de fin");
      return;
    }

    this.loadAnalytics();
  }

  exportData(format: "csv" | "excel" | "pdf"): void {
    console.log(`Exporting analytics data as ${format}...`);

    // TODO: Implement export functionality
    const metrics = this.metrics();
    const data = {
      metrics,
      funnel: this.funnelData(),
      monthlyRevenue: this.monthlyRevenue(),
      exportDate: new Date().toISOString(),
      format,
    };

    // Simulate export
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-general-${new Date().toISOString()}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  refreshData(): void {
    this.loadAnalytics();
  }

  // Chart interaction handlers
  onChartClick(chartId: string, dataPoint: unknown): void {
    console.log("Chart clicked:", chartId, dataPoint);
    // TODO: Navigate to detailed view or show drill-down
  }

  // Helper methods
  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat("es-ES").format(value);
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  }

  getTrendIcon(trend: "up" | "down" | "neutral"): string {
    switch (trend) {
      case "up":
        return "📈";
      case "down":
        return "📉";
      default:
        return "➡️";
    }
  }

  getTrendClass(trend: "up" | "down" | "neutral"): string {
    switch (trend) {
      case "up":
        return "trend-up";
      case "down":
        return "trend-down";
      default:
        return "trend-neutral";
    }
  }
}
