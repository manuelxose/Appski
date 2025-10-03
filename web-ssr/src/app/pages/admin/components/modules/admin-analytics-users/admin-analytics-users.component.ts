import { Component, signal, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  AdminBreadcrumbsComponent,
  BreadcrumbItem,
} from "../../shared/admin-breadcrumbs/admin-breadcrumbs.component";
import { AdminStatCardComponent } from "../../shared/admin-stat-card/admin-stat-card.component";
import { AdminLoaderComponent } from "../../shared/admin-loader/admin-loader.component";
import { AdminEmptyStateComponent } from "../../shared/admin-empty-state/admin-empty-state.component";
import {
  AdminFiltersComponent,
  FilterField,
} from "../../shared/admin-filters/admin-filters.component";
import { AdminBadgeComponent } from "../../shared/admin-badge/admin-badge.component";

// Interfaces
interface UserCohort {
  cohortMonth: string;
  cohortSize: number;
  retention: {
    month0: number;
    month1: number;
    month2: number;
    month3: number;
    month6: number;
    month12: number;
  };
}

interface RetentionMetrics {
  day7: number;
  day30: number;
  day90: number;
  trend: "up" | "down" | "neutral";
}

interface ChurnData {
  totalChurned: number;
  churnRate: number;
  churnedThisMonth: number;
  predictedChurn: number;
  reasons: ChurnReason[];
}

interface ChurnReason {
  reason: string;
  percentage: number;
  count: number;
}

interface LTVMetrics {
  averageLTV: number;
  ltv30: number;
  ltv90: number;
  ltv365: number;
  ltvBySegment: SegmentLTV[];
}

interface SegmentLTV {
  segment: string;
  ltv: number;
  count: number;
  percentage: number;
}

interface UserSegment {
  id: string;
  name: string;
  description: string;
  userCount: number;
  percentage: number;
  avgLTV: number;
  avgEngagement: number;
  color: string;
}

interface EngagementMetrics {
  dau: number;
  mau: number;
  dauMauRatio: number;
  avgSessionDuration: number; // minutes
  avgSessionsPerUser: number;
  avgTimeOnSite: number; // minutes per day
}

interface JourneyStep {
  step: string;
  users: number;
  percentage: number;
  dropoff: number;
}

interface UserKPIs {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  churnRate: number;
  retentionRate: number;
  averageLTV: number;
  dauMauRatio: number;
  avgEngagementScore: number;
}

/**
 * AdminAnalyticsUsersComponent - B3
 *
 * Deep user analytics dashboard with:
 * - Cohort analysis and retention tracking
 * - Churn analysis and predictions
 * - Customer Lifetime Value (LTV) metrics
 * - User segmentation (demographics, behavior, value)
 * - Engagement metrics (DAU/MAU, session analytics)
 * - User journey and conversion funnel analysis
 */
@Component({
  selector: "app-admin-analytics-users",
  standalone: true,
  imports: [
    CommonModule,
    AdminBreadcrumbsComponent,
    AdminStatCardComponent,
    AdminLoaderComponent,
    AdminEmptyStateComponent,
    AdminFiltersComponent,
    AdminBadgeComponent,
  ],
  templateUrl: "./admin-analytics-users.component.html",
  styleUrl: "./admin-analytics-users.component.css",
})
export class AdminAnalyticsUsersComponent implements OnInit {
  // State
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  // Filters
  readonly periodFilter = signal<"7d" | "30d" | "90d" | "year">("30d");
  readonly segmentFilter = signal<string>("all");

  // Data signals
  readonly kpis = signal<UserKPIs>({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    churnRate: 0,
    retentionRate: 0,
    averageLTV: 0,
    dauMauRatio: 0,
    avgEngagementScore: 0,
  });

  readonly cohorts = signal<UserCohort[]>([]);
  readonly retentionMetrics = signal<RetentionMetrics>({
    day7: 0,
    day30: 0,
    day90: 0,
    trend: "neutral",
  });
  readonly churnData = signal<ChurnData>({
    totalChurned: 0,
    churnRate: 0,
    churnedThisMonth: 0,
    predictedChurn: 0,
    reasons: [],
  });
  readonly ltvMetrics = signal<LTVMetrics>({
    averageLTV: 0,
    ltv30: 0,
    ltv90: 0,
    ltv365: 0,
    ltvBySegment: [],
  });
  readonly userSegments = signal<UserSegment[]>([]);
  readonly engagementMetrics = signal<EngagementMetrics>({
    dau: 0,
    mau: 0,
    dauMauRatio: 0,
    avgSessionDuration: 0,
    avgSessionsPerUser: 0,
    avgTimeOnSite: 0,
  });
  readonly journeySteps = signal<JourneyStep[]>([]);

  // Breadcrumbs
  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/admin" },
    { label: "Analytics", href: "/admin/analytics" },
    { label: "Usuarios", href: "/admin/analytics/users" },
  ];

  // Filter fields
  readonly filterFields: FilterField[] = [
    {
      key: "segment",
      label: "Segmento",
      type: "select",
      options: [
        { value: "all", label: "Todos los usuarios" },
        { value: "new", label: "Nuevos (< 30 días)" },
        { value: "active", label: "Activos" },
        { value: "at_risk", label: "En riesgo" },
        { value: "churned", label: "Abandonados" },
        { value: "power", label: "Power users" },
      ],
    },
  ];

  // Computed values
  readonly totalUsersFormatted = computed(() =>
    this.formatNumber(this.kpis().totalUsers)
  );

  readonly activeUsersFormatted = computed(() =>
    this.formatNumber(this.kpis().activeUsers)
  );

  readonly avgLTVFormatted = computed(() =>
    this.formatCurrency(this.kpis().averageLTV)
  );

  readonly retentionRateFormatted = computed(
    () => `${this.kpis().retentionRate.toFixed(1)}%`
  );

  readonly churnRateFormatted = computed(
    () => `${this.kpis().churnRate.toFixed(1)}%`
  );

  readonly dauMauRatioFormatted = computed(
    () => `${(this.kpis().dauMauRatio * 100).toFixed(1)}%`
  );

  // Lifecycle
  ngOnInit(): void {
    this.loadAnalyticsData();
  }

  // Data loading
  async loadAnalyticsData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await Promise.all([
        this.loadKPIs(),
        this.loadCohorts(),
        this.loadRetentionMetrics(),
        this.loadChurnData(),
        this.loadLTVMetrics(),
        this.loadUserSegments(),
        this.loadEngagementMetrics(),
        this.loadJourneyData(),
      ]);
    } catch (err) {
      console.error("Error loading user analytics:", err);
      this.error.set("Error al cargar datos de analytics");
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadKPIs(): Promise<void> {
    // TODO: Replace with actual API call
    const mockKPIs: UserKPIs = {
      totalUsers: 45678,
      activeUsers: 12456,
      newUsers: 3421,
      churnRate: 5.2,
      retentionRate: 68.5,
      averageLTV: 245.8,
      dauMauRatio: 0.42,
      avgEngagementScore: 7.8,
    };

    this.kpis.set(mockKPIs);
  }

  private async loadCohorts(): Promise<void> {
    // TODO: Load from /assets/mocks/admin/analytics/user-cohorts.json
    const mockCohorts: UserCohort[] = [
      {
        cohortMonth: "2024-10",
        cohortSize: 1250,
        retention: {
          month0: 100,
          month1: 68,
          month2: 52,
          month3: 45,
          month6: 38,
          month12: 32,
        },
      },
      {
        cohortMonth: "2024-09",
        cohortSize: 1180,
        retention: {
          month0: 100,
          month1: 72,
          month2: 56,
          month3: 48,
          month6: 40,
          month12: 35,
        },
      },
      {
        cohortMonth: "2024-08",
        cohortSize: 1320,
        retention: {
          month0: 100,
          month1: 65,
          month2: 50,
          month3: 42,
          month6: 36,
          month12: 30,
        },
      },
      {
        cohortMonth: "2024-07",
        cohortSize: 1420,
        retention: {
          month0: 100,
          month1: 70,
          month2: 54,
          month3: 46,
          month6: 39,
          month12: 33,
        },
      },
      {
        cohortMonth: "2024-06",
        cohortSize: 1560,
        retention: {
          month0: 100,
          month1: 75,
          month2: 60,
          month3: 52,
          month6: 45,
          month12: 38,
        },
      },
      {
        cohortMonth: "2024-05",
        cohortSize: 1280,
        retention: {
          month0: 100,
          month1: 68,
          month2: 53,
          month3: 44,
          month6: 37,
          month12: 31,
        },
      },
    ];

    this.cohorts.set(mockCohorts);
  }

  private async loadRetentionMetrics(): Promise<void> {
    const mockRetention: RetentionMetrics = {
      day7: 72.5,
      day30: 58.3,
      day90: 42.1,
      trend: "up",
    };

    this.retentionMetrics.set(mockRetention);
  }

  private async loadChurnData(): Promise<void> {
    const mockChurn: ChurnData = {
      totalChurned: 2380,
      churnRate: 5.2,
      churnedThisMonth: 245,
      predictedChurn: 312,
      reasons: [
        { reason: "Precio alto", percentage: 32, count: 762 },
        { reason: "Falta de uso", percentage: 28, count: 666 },
        { reason: "Mejor alternativa", percentage: 18, count: 428 },
        { reason: "Mala experiencia", percentage: 12, count: 286 },
        { reason: "Otros", percentage: 10, count: 238 },
      ],
    };

    this.churnData.set(mockChurn);
  }

  private async loadLTVMetrics(): Promise<void> {
    const mockLTV: LTVMetrics = {
      averageLTV: 245.8,
      ltv30: 85.2,
      ltv90: 156.4,
      ltv365: 245.8,
      ltvBySegment: [
        { segment: "Power Users", ltv: 485.2, count: 2340, percentage: 5 },
        { segment: "Activos", ltv: 298.5, count: 12456, percentage: 27 },
        { segment: "Ocasionales", ltv: 142.3, count: 18567, percentage: 41 },
        { segment: "En Riesgo", ltv: 85.6, count: 8923, percentage: 20 },
        { segment: "Inactivos", ltv: 32.1, count: 3392, percentage: 7 },
      ],
    };

    this.ltvMetrics.set(mockLTV);
  }

  private async loadUserSegments(): Promise<void> {
    const mockSegments: UserSegment[] = [
      {
        id: "power",
        name: "Power Users",
        description: "> 10 sesiones/mes, alto engagement",
        userCount: 2340,
        percentage: 5.1,
        avgLTV: 485.2,
        avgEngagement: 9.5,
        color: "#10b981",
      },
      {
        id: "active",
        name: "Usuarios Activos",
        description: "3-10 sesiones/mes",
        userCount: 12456,
        percentage: 27.3,
        avgLTV: 298.5,
        avgEngagement: 7.8,
        color: "#3b82f6",
      },
      {
        id: "occasional",
        name: "Ocasionales",
        description: "1-2 sesiones/mes",
        userCount: 18567,
        percentage: 40.7,
        avgLTV: 142.3,
        avgEngagement: 5.2,
        color: "#f59e0b",
      },
      {
        id: "at_risk",
        name: "En Riesgo",
        description: "Sin actividad en 14+ días",
        userCount: 8923,
        percentage: 19.5,
        avgLTV: 85.6,
        avgEngagement: 3.1,
        color: "#ef4444",
      },
      {
        id: "churned",
        name: "Abandonados",
        description: "Sin actividad en 90+ días",
        userCount: 3392,
        percentage: 7.4,
        avgLTV: 32.1,
        avgEngagement: 0.5,
        color: "#6b7280",
      },
    ];

    this.userSegments.set(mockSegments);
  }

  private async loadEngagementMetrics(): Promise<void> {
    const mockEngagement: EngagementMetrics = {
      dau: 5234,
      mau: 12456,
      dauMauRatio: 0.42,
      avgSessionDuration: 12.5,
      avgSessionsPerUser: 4.8,
      avgTimeOnSite: 35.2,
    };

    this.engagementMetrics.set(mockEngagement);
  }

  private async loadJourneyData(): Promise<void> {
    const mockJourney: JourneyStep[] = [
      { step: "Visitantes", users: 50000, percentage: 100, dropoff: 0 },
      { step: "Registro", users: 12500, percentage: 25, dropoff: 75 },
      { step: "Primer Login", users: 10000, percentage: 20, dropoff: 20 },
      { step: "Exploración", users: 7500, percentage: 15, dropoff: 25 },
      { step: "Primera Reserva", users: 3750, percentage: 7.5, dropoff: 50 },
      {
        step: "Cliente Recurrente",
        users: 1875,
        percentage: 3.75,
        dropoff: 50,
      },
    ];

    this.journeySteps.set(mockJourney);
  }

  // Filter handlers
  onPeriodChange(period: "7d" | "30d" | "90d" | "year"): void {
    this.periodFilter.set(period);
    this.loadAnalyticsData();
  }

  onSegmentChange(segment: string): void {
    this.segmentFilter.set(segment);
    // Filter data based on segment
  }

  onFilterChange(filters: Record<string, unknown>): void {
    if (filters["segment"]) {
      this.onSegmentChange(filters["segment"] as string);
    }
  }

  // Actions
  refreshData(): void {
    this.loadAnalyticsData();
  }

  exportReport(format: "csv" | "excel" | "pdf" = "excel"): void {
    console.log(`Exporting user analytics report as ${format}`);
    // TODO: Implement export functionality
  }

  downloadCohortData(): void {
    console.log("Downloading cohort analysis data");
    // TODO: Implement cohort data export
  }

  // Formatters
  formatNumber(value: number): string {
    return value.toLocaleString("es-ES");
  }

  formatCurrency(value: number): string {
    return `€${value.toFixed(2)}`;
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes.toFixed(1)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  }

  // Helpers
  getCohortRetentionColor(percentage: number): string {
    if (percentage >= 70) return "success";
    if (percentage >= 50) return "warning";
    if (percentage >= 30) return "danger";
    return "neutral";
  }

  getSegmentBadgeVariant(
    segmentId: string
  ): "success" | "primary" | "warning" | "danger" | "secondary" {
    switch (segmentId) {
      case "power":
        return "success";
      case "active":
        return "primary";
      case "occasional":
        return "warning";
      case "at_risk":
        return "danger";
      case "churned":
        return "secondary";
      default:
        return "primary";
    }
  }

  getTrendIcon(trend: "up" | "down" | "neutral"): string {
    switch (trend) {
      case "up":
        return "📈";
      case "down":
        return "📉";
      case "neutral":
        return "➡️";
      default:
        return "➡️";
    }
  }

  getEngagementLevel(score: number): string {
    if (score >= 8) return "Muy Alto";
    if (score >= 6) return "Alto";
    if (score >= 4) return "Medio";
    if (score >= 2) return "Bajo";
    return "Muy Bajo";
  }
}
