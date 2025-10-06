import { Component, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { BreadcrumbItem } from "../../shared/admin-breadcrumbs/admin-breadcrumbs.component";

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
  imports: [CommonModule],
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
    { label: "Dashboard", path: "/admin" },
    { label: "Analytics", path: "/admin/analytics" },
    { label: "Usuarios", path: "/admin/analytics/users" },
  ];

  // Filter fields - Custom HTML implementation

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
    const response = await fetch(
      "/assets/mocks/admin/analytics/user-kpis.json"
    );
    const data: UserKPIs = await response.json();
    this.kpis.set(data);
  }

  private async loadCohorts(): Promise<void> {
    const response = await fetch(
      "/assets/mocks/admin/analytics/user-cohorts.json"
    );
    const data: UserCohort[] = await response.json();
    this.cohorts.set(data);
  }

  private async loadRetentionMetrics(): Promise<void> {
    const response = await fetch(
      "/assets/mocks/admin/analytics/user-retention.json"
    );
    const data: RetentionMetrics = await response.json();
    this.retentionMetrics.set(data);
  }

  private async loadChurnData(): Promise<void> {
    const response = await fetch(
      "/assets/mocks/admin/analytics/user-churn.json"
    );
    const data: ChurnData = await response.json();
    this.churnData.set(data);
  }

  private async loadLTVMetrics(): Promise<void> {
    const response = await fetch("/assets/mocks/admin/analytics/user-ltv.json");
    const data: LTVMetrics = await response.json();
    this.ltvMetrics.set(data);
  }

  private async loadUserSegments(): Promise<void> {
    const response = await fetch(
      "/assets/mocks/admin/analytics/user-segments.json"
    );
    const data: UserSegment[] = await response.json();
    this.userSegments.set(data);
  }

  private async loadEngagementMetrics(): Promise<void> {
    const response = await fetch(
      "/assets/mocks/admin/analytics/user-engagement.json"
    );
    const data: EngagementMetrics = await response.json();
    this.engagementMetrics.set(data);
  }

  private async loadJourneyData(): Promise<void> {
    const response = await fetch(
      "/assets/mocks/admin/analytics/user-journey.json"
    );
    const data: JourneyStep[] = await response.json();
    this.journeySteps.set(data);
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
