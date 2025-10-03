import { Component, signal, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AnalyticsService } from "../../../services/analytics.service";
import { AdminBadgeComponent } from "../../shared/admin-badge/admin-badge.component";
import {
  AdminBreadcrumbsComponent,
  BreadcrumbItem,
} from "../../shared/admin-breadcrumbs/admin-breadcrumbs.component";
import {
  AdminDateRangePickerComponent,
  DateRange,
} from "../../shared/admin-date-range-picker/admin-date-range-picker.component";
import { AdminLoaderComponent } from "../../shared/admin-loader/admin-loader.component";
import { AdminStatCardComponent } from "../../shared/admin-stat-card/admin-stat-card.component";

/**
 * AdminAnalyticsComponent
 *
 * Dashboard principal de analíticas del sistema
 * - KPIs generales y financieros
 * - Gráficos de tendencias
 * - Análisis de usuarios y reservas
 * - Métricas de marketing
 * - Reportes personalizables
 */
@Component({
  selector: "app-admin-analytics",
  standalone: true,
  imports: [
    CommonModule,
    AdminStatCardComponent,
    AdminBreadcrumbsComponent,
    AdminLoaderComponent,
    AdminDateRangePickerComponent,
    AdminBadgeComponent,
  ],
  templateUrl: "./admin-analytics.component.html",
  styleUrl: "./admin-analytics.component.css",
})
export class AdminAnalyticsComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);

  // State
  readonly isLoading = signal(true);
  readonly dateRange = signal<DateRange>({
    startDate: this.getDefaultStartDate(),
    endDate: new Date(),
  });

  // Breadcrumbs
  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: "Admin", url: "/admin" },
    { label: "Analíticas", url: "/admin/analytics" },
  ];

  // General KPIs
  readonly generalKPIs = computed(() => this.analyticsService.generalKPIs());
  readonly financialKPIs = computed(() =>
    this.analyticsService.financialKPIs()
  );
  readonly userKPIs = computed(() => this.analyticsService.userKPIs());
  readonly bookingKPIs = computed(() => this.analyticsService.bookingKPIs());
  readonly marketingKPIs = computed(() =>
    this.analyticsService.marketingKPIs()
  );

  // Chart Data Placeholders (For future ApexCharts integration)
  readonly revenueChartData = signal<unknown>(null);
  readonly bookingsChartData = signal<unknown>(null);
  readonly usersChartData = signal<unknown>(null);
  readonly conversionChartData = signal<unknown>(null);

  // Quick Stats
  readonly quickStats = computed(() => {
    const general = this.generalKPIs();
    const financial = this.financialKPIs();
    const users = this.userKPIs();
    const bookings = this.bookingKPIs();

    return [
      {
        label: "Ingresos Totales",
        value: financial.revenue,
        trend:
          financial.revenueGrowth > 0 ? ("up" as const) : ("down" as const),
        change: financial.revenueGrowth,
        icon: "💰",
        variant: "success" as const,
        valueFormat: "currency" as const,
      },
      {
        label: "Reservas Activas",
        value: bookings.activeBookings,
        trend: bookings.bookingGrowth > 0 ? ("up" as const) : ("down" as const),
        change: bookings.bookingGrowth,
        icon: "📋",
        variant: "primary" as const,
      },
      {
        label: "Nuevos Usuarios",
        value: users.newUsers,
        trend: users.userGrowth > 0 ? ("up" as const) : ("down" as const),
        change: users.userGrowth,
        icon: "👥",
        variant: "info" as const,
      },
      {
        label: "Tasa Conversión",
        value: general.conversionRate,
        trend: general.conversionRate > 3 ? ("up" as const) : ("down" as const),
        change: 0.5,
        icon: "📈",
        variant: "warning" as const,
        suffix: "%",
      },
      {
        label: "Ticket Medio",
        value: financial.averageOrderValue,
        trend: "up" as const,
        change: 8.2,
        icon: "🎫",
        variant: "success" as const,
        valueFormat: "currency" as const,
      },
      {
        label: "Usuarios Activos",
        value: users.activeUsers,
        trend: "up" as const,
        change: 12.5,
        icon: "✅",
        variant: "success" as const,
      },
    ];
  });

  // Top Performing Stats
  readonly topPerformingStations = signal([
    { name: "Sierra Nevada", bookings: 1247, revenue: 124700, growth: 15.3 },
    { name: "Baqueira Beret", bookings: 1098, revenue: 142800, growth: 12.7 },
    { name: "Formigal", bookings: 876, revenue: 98400, growth: 8.9 },
  ]);

  readonly topServices = signal([
    { name: "Forfaits", bookings: 2156, revenue: 215600, percentage: 45 },
    { name: "Paquetes", bookings: 987, revenue: 197400, percentage: 30 },
    { name: "Clases", bookings: 654, revenue: 98100, percentage: 15 },
    { name: "Alquiler", bookings: 424, revenue: 42400, percentage: 10 },
  ]);

  // Recent Activity
  readonly recentActivity = signal([
    {
      type: "booking",
      message: "Nueva reserva: Sierra Nevada - Juan García",
      time: "Hace 5 minutos",
      icon: "📋",
    },
    {
      type: "user",
      message: "Nuevo registro: María López",
      time: "Hace 12 minutos",
      icon: "👤",
    },
    {
      type: "payment",
      message: "Pago confirmado: 240.00€",
      time: "Hace 25 minutos",
      icon: "💳",
    },
    {
      type: "review",
      message: "Nueva valoración 5★ - Baqueira Beret",
      time: "Hace 1 hora",
      icon: "⭐",
    },
  ]);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  async loadAnalytics(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.analyticsService.loadKPIDashboard();
      await this.analyticsService.loadCohortRetention();

      // TODO: Load chart data when ApexCharts is integrated
      this.loadChartData();
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private loadChartData(): void {
    // Placeholder for future ApexCharts data
    // Will be populated when ApexCharts is installed
    this.revenueChartData.set({});
    this.bookingsChartData.set({});
    this.usersChartData.set({});
    this.conversionChartData.set({});
  }

  onDateRangeChange(range: DateRange): void {
    this.dateRange.set(range);
    this.loadAnalytics();
  }

  private getDefaultStartDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Last 30 days
    return date;
  }

  // Export functionality
  async exportReport(): Promise<void> {
    // TODO: Implement with jsPDF when installed
    console.log("Exporting analytics report...");
  }

  // Refresh data
  async refreshData(): Promise<void> {
    await this.loadAnalytics();
  }
}
