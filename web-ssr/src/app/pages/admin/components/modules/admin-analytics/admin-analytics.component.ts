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
    { label: "Admin", path: "/admin" },
    { label: "Analíticas", path: "/admin/analytics" },
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

    if (!general || !financial || !users || !bookings) {
      return [];
    }

    return [
      {
        label: "Ingresos Totales",
        value: financial.totalPayments,
        trend:
          financial.trends.revenue > 0 ? ("up" as const) : ("down" as const),
        change: financial.trends.revenue,
        icon: "💰",
        variant: "success" as const,
        valueFormat: "currency" as const,
      },
      {
        label: "Reservas Activas",
        value: bookings.confirmedBookings,
        trend: bookings.trends.total > 0 ? ("up" as const) : ("down" as const),
        change: bookings.trends.total,
        icon: "📋",
        variant: "primary" as const,
      },
      {
        label: "Nuevos Usuarios",
        value: users.newUsersThisMonth,
        trend: users.trends.new > 0 ? ("up" as const) : ("down" as const),
        change: users.trends.new,
        icon: "👥",
        variant: "info" as const,
      },
      {
        label: "Tasa Conversión",
        value: general.conversionRate,
        trend: general.conversionRate > 3 ? ("up" as const) : ("down" as const),
        change: general.trends.conversion,
        icon: "📈",
        variant: "warning" as const,
        suffix: "%",
      },
      {
        label: "Ticket Medio",
        value: general.averageTicket,
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
        change: users.trends.active,
        icon: "✅",
        variant: "success" as const,
      },
    ];
  });

  // Top Performing Stats
  readonly topPerformingStations = signal<
    Array<{ name: string; bookings: number; revenue: number; growth: number }>
  >([]);

  readonly topServices = signal<
    Array<{
      name: string;
      bookings: number;
      revenue: number;
      percentage: number;
    }>
  >([]);

  // Recent Activity
  readonly recentActivity = signal<
    Array<{ type: string; message: string; time: string; icon: string }>
  >([]);

  ngOnInit(): void {
    this.loadAnalytics();
  }

  async loadAnalytics(): Promise<void> {
    this.isLoading.set(true);
    try {
      await Promise.all([
        this.analyticsService.loadKPIDashboard(),
        this.analyticsService.loadCohortRetention(),
        this.loadTopStations(),
        this.loadTopServices(),
        this.loadRecentActivity(),
      ]);

      // TODO: Load chart data when ApexCharts is integrated
      this.loadChartData();
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadTopStations(): Promise<void> {
    const response = await fetch(
      "/assets/mocks/admin/analytics/top-stations.json"
    );
    const data = await response.json();
    this.topPerformingStations.set(data);
  }

  private async loadTopServices(): Promise<void> {
    const response = await fetch(
      "/assets/mocks/admin/analytics/top-services.json"
    );
    const data = await response.json();
    this.topServices.set(data);
  }

  private async loadRecentActivity(): Promise<void> {
    const response = await fetch(
      "/assets/mocks/admin/analytics/recent-activity.json"
    );
    const data = await response.json();
    this.recentActivity.set(data);
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
