import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * AdminEmailMarketingComponent
 *
 * Módulo D1 - Email Marketing
 *
 * Features:
 * - Gestión de campañas email
 * - Segmentación de usuarios
 * - Templates personalizables
 * - A/B Testing
 * - Automatizaciones (welcome, cart abandon, post-booking)
 * - Estadísticas de apertura, clicks, conversiones
 * - Lista de contactos y segmentos
 *
 * Signals:
 * - 7 data signals
 * - 3 filter signals
 * - 12 computed values
 */

// ========================================
// Interfaces
// ========================================

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  previewText: string;

  // Type & Status
  type: "newsletter" | "promotional" | "transactional" | "automated";
  status: "draft" | "scheduled" | "sending" | "sent" | "paused";

  // Audience
  segmentId: string;
  segmentName: string;
  recipientCount: number;

  // Template
  templateId: string;
  templateName: string;

  // Scheduling
  scheduledAt?: string;
  sentAt?: string;

  // Stats
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;

  // Rates
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;

  // A/B Testing
  isABTest: boolean;
  variantA?: EmailVariant;
  variantB?: EmailVariant;

  // Metadata
  createdBy: string;
  createdAt: string;
  lastModifiedAt: string;
}

export interface EmailVariant {
  subject: string;
  sent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: "newsletter" | "promotional" | "transactional" | "seasonal";
  thumbnailUrl: string;
  htmlContent: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  userCount: number;
  isActive: boolean;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface SegmentCriteria {
  type: "all" | "custom";
  rules: SegmentRule[];
}

export interface SegmentRule {
  field: string;
  operator: "equals" | "contains" | "greater_than" | "less_than";
  value: string | number;
}

export interface Automation {
  id: string;
  name: string;
  type: "welcome" | "abandoned_cart" | "post_booking" | "birthday" | "custom";
  trigger: string;
  status: "active" | "paused" | "draft";

  // Flow
  steps: AutomationStep[];

  // Stats
  triggered: number;
  completed: number;
  conversionRate: number;

  createdAt: string;
}

export interface AutomationStep {
  id: string;
  type: "email" | "wait" | "condition";
  order: number;
  config: Record<string, unknown>;
}

export interface EmailStats {
  totalCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  avgBounceRate: number;
  totalSubscribers: number;
  activeAutomations: number;
}

@Component({
  selector: "app-admin-email-marketing",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-email-marketing.component.html",
  styleUrl: "./admin-email-marketing.component.css",
})
export class AdminEmailMarketingComponent implements OnInit {
  // ========================================
  // Data Signals
  // ========================================

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly campaigns = signal<EmailCampaign[]>([]);
  readonly templates = signal<EmailTemplate[]>([]);
  readonly segments = signal<Segment[]>([]);
  readonly automations = signal<Automation[]>([]);
  readonly stats = signal<EmailStats | null>(null);

  // ========================================
  // Filter Signals
  // ========================================

  readonly selectedStatus = signal<string>("all");
  readonly selectedType = signal<string>("all");
  readonly searchTerm = signal<string>("");

  // ========================================
  // Computed Values
  // ========================================

  readonly totalCampaigns = computed(() => this.stats()?.totalCampaigns ?? 0);
  readonly totalSent = computed(() => this.stats()?.totalSent ?? 0);
  readonly avgOpenRate = computed(() => this.stats()?.avgOpenRate ?? 0);
  readonly avgClickRate = computed(() => this.stats()?.avgClickRate ?? 0);
  readonly totalSubscribers = computed(
    () => this.stats()?.totalSubscribers ?? 0
  );

  readonly filteredCampaigns = computed(() => {
    let filtered = this.campaigns();

    if (this.selectedStatus() !== "all") {
      filtered = filtered.filter((c) => c.status === this.selectedStatus());
    }

    if (this.selectedType() !== "all") {
      filtered = filtered.filter((c) => c.type === this.selectedType());
    }

    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.subject.toLowerCase().includes(term)
      );
    }

    return filtered;
  });

  readonly draftCampaigns = computed(() =>
    this.campaigns().filter((c) => c.status === "draft")
  );

  readonly scheduledCampaigns = computed(() =>
    this.campaigns().filter((c) => c.status === "scheduled")
  );

  readonly recentCampaigns = computed(() =>
    this.campaigns()
      .filter((c) => c.status === "sent")
      .slice(0, 5)
  );

  readonly activeTemplates = computed(() =>
    this.templates().filter((t) => t.isActive)
  );

  readonly activeSegments = computed(() =>
    this.segments().filter((s) => s.isActive)
  );

  readonly activeAutomations = computed(() =>
    this.automations().filter((a) => a.status === "active")
  );

  // ========================================
  // Lifecycle
  // ========================================

  ngOnInit(): void {
    this.loadEmailMarketingData();
  }

  // ========================================
  // Data Loading
  // ========================================

  private async loadEmailMarketingData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [campaignsData, templatesData, segmentsData, automationsData] =
        await Promise.all([
          fetch("/assets/mocks/admin/email-campaigns.json").then((r) =>
            r.json()
          ),
          fetch("/assets/mocks/admin/email-templates.json").then((r) =>
            r.json()
          ),
          fetch("/assets/mocks/admin/email-segments.json").then((r) =>
            r.json()
          ),
          fetch("/assets/mocks/admin/email-automations.json").then((r) =>
            r.json()
          ),
        ]);

      this.campaigns.set(campaignsData.campaigns);
      this.stats.set(campaignsData.stats);

      this.templates.set(templatesData.templates);
      this.segments.set(segmentsData.segments);
      this.automations.set(automationsData.automations);
    } catch (err) {
      this.error.set("Error al cargar datos de email marketing");
      console.error("Error loading email marketing data:", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ========================================
  // Actions
  // ========================================

  setStatus(status: string): void {
    this.selectedStatus.set(status);
  }

  setType(type: string): void {
    this.selectedType.set(type);
  }

  setSearchTerm(term: string): void {
    this.searchTerm.set(term);
  }

  refreshData(): void {
    this.loadEmailMarketingData();
  }

  // Campaign actions
  createCampaign(): void {
    console.log("Create campaign");
  }

  editCampaign(campaignId: string): void {
    console.log("Edit campaign:", campaignId);
  }

  duplicateCampaign(campaignId: string): void {
    console.log("Duplicate campaign:", campaignId);
  }

  sendTestEmail(campaignId: string): void {
    console.log("Send test email:", campaignId);
  }

  scheduleCampaign(campaignId: string): void {
    console.log("Schedule campaign:", campaignId);
  }

  sendCampaign(campaignId: string): void {
    console.log("Send campaign:", campaignId);
  }

  pauseCampaign(campaignId: string): void {
    console.log("Pause campaign:", campaignId);
  }

  viewReport(campaignId: string): void {
    console.log("View campaign report:", campaignId);
  }

  // Template actions
  createTemplate(): void {
    console.log("Create template");
  }

  editTemplate(templateId: string): void {
    console.log("Edit template:", templateId);
  }

  // Segment actions
  createSegment(): void {
    console.log("Create segment");
  }

  editSegment(segmentId: string): void {
    console.log("Edit segment:", segmentId);
  }

  // Automation actions
  createAutomation(): void {
    console.log("Create automation");
  }

  editAutomation(automationId: string): void {
    console.log("Edit automation:", automationId);
  }

  toggleAutomation(automationId: string): void {
    console.log("Toggle automation:", automationId);
  }

  // ========================================
  // Helpers
  // ========================================

  formatNumber(value: number): string {
    return new Intl.NumberFormat("es-ES").format(value);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  formatDateShort(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
    }).format(date);
  }

  getStatusLabel(status: EmailCampaign["status"]): string {
    const labels: Record<EmailCampaign["status"], string> = {
      draft: "Borrador",
      scheduled: "Programada",
      sending: "Enviando",
      sent: "Enviada",
      paused: "Pausada",
    };
    return labels[status];
  }

  getStatusClass(status: EmailCampaign["status"]): string {
    const classes: Record<EmailCampaign["status"], string> = {
      draft: "status-draft",
      scheduled: "status-scheduled",
      sending: "status-sending",
      sent: "status-sent",
      paused: "status-paused",
    };
    return classes[status];
  }

  getTypeLabel(type: EmailCampaign["type"]): string {
    const labels: Record<EmailCampaign["type"], string> = {
      newsletter: "Newsletter",
      promotional: "Promocional",
      transactional: "Transaccional",
      automated: "Automatizada",
    };
    return labels[type];
  }

  getTypeIcon(type: EmailCampaign["type"]): string {
    const icons: Record<EmailCampaign["type"], string> = {
      newsletter: "📰",
      promotional: "🎁",
      transactional: "📧",
      automated: "🤖",
    };
    return icons[type];
  }

  getRateClass(rate: number, threshold: number): string {
    if (rate >= threshold * 1.5) return "rate-excellent";
    if (rate >= threshold) return "rate-good";
    if (rate >= threshold * 0.5) return "rate-fair";
    return "rate-poor";
  }
}
