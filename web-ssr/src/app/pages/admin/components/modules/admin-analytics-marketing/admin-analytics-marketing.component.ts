import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * INTERFACES - Analytics de Marketing
 */

interface TrafficSource {
  source: "organic" | "paid" | "social" | "email" | "direct" | "referral";
  label: string;
  sessions: number;
  users: number;
  bounceRate: number;
  avgSessionDuration: number; // segundos
  conversions: number;
  conversionRate: number;
  revenue: number;
  color: string;
}

interface ChannelPerformance {
  channel: string;
  clicks: number;
  impressions: number;
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  spend: number;
  conversions: number;
  cpa: number; // Cost per acquisition
  roi: number; // Return on investment
  revenue: number;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: "active" | "paused" | "completed";
  startDate: string;
  endDate: string;
  budget: number;
  spend: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roi: number;
}

interface EmailMetrics {
  campaignName: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface SocialMediaMetrics {
  platform: "facebook" | "instagram" | "twitter" | "linkedin" | "tiktok";
  followers: number;
  posts: number;
  reach: number;
  engagement: number;
  engagementRate: number;
  clicks: number;
  conversions: number;
}

interface AttributionModel {
  model:
    | "first-click"
    | "last-click"
    | "linear"
    | "time-decay"
    | "position-based";
  label: string;
  conversions: number;
  revenue: number;
}

/**
 * AdminAnalyticsMarketingComponent - B6
 *
 * Dashboard de analítica de marketing y adquisición.
 *
 * @author AI Assistant
 * @date 2025-10-03
 */
@Component({
  selector: "app-admin-analytics-marketing",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-analytics-marketing.component.html",
  styleUrl: "./admin-analytics-marketing.component.css",
})
export class AdminAnalyticsMarketingComponent implements OnInit {
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly trafficSources = signal<TrafficSource[]>([]);
  readonly channelPerformance = signal<ChannelPerformance[]>([]);
  readonly campaigns = signal<Campaign[]>([]);
  readonly emailMetrics = signal<EmailMetrics[]>([]);
  readonly socialMetrics = signal<SocialMediaMetrics[]>([]);
  readonly attributionModels = signal<AttributionModel[]>([]);

  readonly timeRange = signal<"7d" | "30d" | "90d" | "1y">("30d");
  readonly selectedChannel = signal<string | null>(null);

  readonly totalSessions = computed(() =>
    this.trafficSources().reduce((sum, s) => sum + s.sessions, 0)
  );

  readonly totalUsers = computed(() =>
    this.trafficSources().reduce((sum, s) => sum + s.users, 0)
  );

  readonly totalConversions = computed(() =>
    this.trafficSources().reduce((sum, s) => sum + s.conversions, 0)
  );

  readonly totalRevenue = computed(() =>
    this.trafficSources().reduce((sum, s) => sum + s.revenue, 0)
  );

  readonly totalSpend = computed(() =>
    this.channelPerformance().reduce((sum, c) => sum + c.spend, 0)
  );

  readonly overallROI = computed(() => {
    const spend = this.totalSpend();
    const revenue = this.totalRevenue();
    return spend > 0 ? ((revenue - spend) / spend) * 100 : 0;
  });

  readonly avgConversionRate = computed(() => {
    const sources = this.trafficSources();
    if (!sources.length) return 0;
    return (
      sources.reduce((sum, s) => sum + s.conversionRate, 0) / sources.length
    );
  });

  readonly topSource = computed(() => {
    const sources = this.trafficSources();
    if (!sources.length) return null;
    return sources.reduce((top, s) => (s.revenue > top.revenue ? s : top));
  });

  ngOnInit(): void {
    this.loadMarketingAnalytics();
  }

  async loadMarketingAnalytics(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/analytics-marketing.json"
      );
      if (!response.ok) throw new Error("Error loading marketing analytics");

      const data = await response.json();

      this.trafficSources.set(data.trafficSources || []);
      this.channelPerformance.set(data.channelPerformance || []);
      this.campaigns.set(data.campaigns || []);
      this.emailMetrics.set(data.emailMetrics || []);
      this.socialMetrics.set(data.socialMetrics || []);
      this.attributionModels.set(data.attributionModels || []);
    } catch (err) {
      console.error("Error loading marketing analytics:", err);
      this.error.set("Error al cargar analítica de marketing");
    } finally {
      this.isLoading.set(false);
    }
  }

  setTimeRange(range: "7d" | "30d" | "90d" | "1y"): void {
    this.timeRange.set(range);
    this.loadMarketingAnalytics();
  }

  selectChannel(channel: string | null): void {
    this.selectedChannel.set(channel);
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

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  getSourceIcon(source: string): string {
    const icons: Record<string, string> = {
      organic: "search",
      paid: "paid",
      social: "share",
      email: "email",
      direct: "trending_up",
      referral: "link",
    };
    return icons[source] || "language";
  }

  getCampaignStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: "Activa",
      paused: "Pausada",
      completed: "Completada",
    };
    return labels[status] || status;
  }

  getCampaignStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: "status-success",
      paused: "status-warning",
      completed: "status-info",
    };
    return classes[status] || "";
  }

  getROIClass(roi: number): string {
    if (roi >= 200) return "roi-excellent";
    if (roi >= 100) return "roi-good";
    if (roi >= 0) return "roi-neutral";
    return "roi-negative";
  }

  getPlatformIcon(platform: string): string {
    return platform; // Usar iconos personalizados en producción
  }

  exportMarketingAnalytics(format: "csv" | "excel" | "pdf"): void {
    console.log(`Exporting marketing analytics as ${format}`);
  }

  refreshData(): void {
    this.loadMarketingAnalytics();
  }
}
