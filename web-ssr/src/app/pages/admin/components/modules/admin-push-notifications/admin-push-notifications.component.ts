import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

// ========================================
// INTERFACES
// ========================================

export interface PushNotification {
  id: string;
  title: string;
  message: string;
  type: "marketing" | "transactional" | "alert" | "reminder";
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduledFor?: string;
  sentAt?: string;
  targetSegment: string;
  targetCount: number;
  deliveryStats: {
    sent: number;
    delivered: number;
    failed: number;
    clicked: number;
    ctr: number; // %
  };
  deepLink?: string;
  imageUrl?: string;
  actionButtons?: { label: string; action: string }[];
  createdBy: string;
  createdAt: string;
}

export interface PushSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    platform?: ("ios" | "android" | "web")[];
    location?: string[];
    userType?: ("free" | "premium" | "vip")[];
    lastActivityDays?: number;
    hasBooking?: boolean;
  };
  usersCount: number;
  isActive: boolean;
}

export interface PushTemplate {
  id: string;
  name: string;
  category: "weather" | "booking" | "promotion" | "alert" | "engagement";
  titleTemplate: string;
  messageTemplate: string;
  variables: string[];
  deepLinkTemplate?: string;
  imageUrl?: string;
  usageCount: number;
}

export interface PushStats {
  totalSent: number;
  totalDelivered: number;
  avgDeliveryRate: number; // %
  avgClickRate: number; // %
  activeSegments: number;
  scheduledNotifications: number;
}

// ========================================
// COMPONENT
// ========================================

@Component({
  selector: "app-admin-push-notifications",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-push-notifications.component.html",
  styleUrl: "./admin-push-notifications.component.css",
})
export class AdminPushNotificationsComponent implements OnInit {
  // Data Signals
  notifications = signal<PushNotification[]>([]);
  segments = signal<PushSegment[]>([]);
  templates = signal<PushTemplate[]>([]);
  stats = signal<PushStats>({
    totalSent: 0,
    totalDelivered: 0,
    avgDeliveryRate: 0,
    avgClickRate: 0,
    activeSegments: 0,
    scheduledNotifications: 0,
  });
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Filter Signals
  selectedStatus = signal<
    "all" | "draft" | "scheduled" | "sending" | "sent" | "failed"
  >("all");
  selectedType = signal<
    "all" | "marketing" | "transactional" | "alert" | "reminder"
  >("all");
  selectedSegment = signal<string>("all");
  searchTerm = signal("");

  // Computed Values
  filteredNotifications = computed(() => {
    let filtered = this.notifications();

    if (this.selectedStatus() !== "all") {
      filtered = filtered.filter((n) => n.status === this.selectedStatus());
    }

    if (this.selectedType() !== "all") {
      filtered = filtered.filter((n) => n.type === this.selectedType());
    }

    if (this.selectedSegment() !== "all") {
      filtered = filtered.filter(
        (n) => n.targetSegment === this.selectedSegment()
      );
    }

    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.message.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  scheduledNotifications = computed(
    () => this.notifications().filter((n) => n.status === "scheduled").length
  );
  failedNotifications = computed(
    () => this.notifications().filter((n) => n.status === "failed").length
  );

  activeSegments = computed(() => this.segments().filter((s) => s.isActive));
  totalSegmentUsers = computed(() =>
    this.activeSegments().reduce((sum, seg) => sum + seg.usersCount, 0)
  );

  topTemplates = computed(() =>
    [...this.templates()]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
  );

  // ========================================
  // LIFECYCLE
  // ========================================

  ngOnInit(): void {
    this.loadPushData();
  }

  async loadPushData(): Promise<void> {
    try {
      this.isLoading.set(true);

      // Parallel fetch
      const [notificationsData, segmentsData, templatesData] =
        await Promise.all([
          fetch("/assets/mocks/admin/push-notifications.json").then((r) =>
            r.json()
          ),
          fetch("/assets/mocks/admin/push-segments.json").then((r) => r.json()),
          fetch("/assets/mocks/admin/push-templates.json").then((r) =>
            r.json()
          ),
        ]);

      this.notifications.set(notificationsData.notifications || []);
      this.segments.set(segmentsData.segments || []);
      this.templates.set(templatesData.templates || []);
      this.stats.set(notificationsData.stats || this.stats());
    } catch (err) {
      this.error.set(
        "Error cargando notificaciones: " + (err as Error).message
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // ========================================
  // ACTIONS - Notifications
  // ========================================

  createNotification(): void {
    console.log("Crear notificación");
  }

  editNotification(id: string): void {
    console.log("Editar notificación", id);
  }

  scheduleNotification(id: string): void {
    console.log("Programar notificación", id);
  }

  sendNow(id: string): void {
    console.log("Enviar ahora", id);
  }

  cancelNotification(id: string): void {
    console.log("Cancelar notificación", id);
  }

  duplicateNotification(id: string): void {
    console.log("Duplicar notificación", id);
  }

  viewReport(id: string): void {
    console.log("Ver informe", id);
  }

  deleteNotification(id: string): void {
    console.log("Eliminar notificación", id);
  }

  // ========================================
  // ACTIONS - Segments
  // ========================================

  createSegment(): void {
    console.log("Crear segmento");
  }

  editSegment(id: string): void {
    console.log("Editar segmento", id);
  }

  viewSegmentUsers(id: string): void {
    console.log("Ver usuarios del segmento", id);
  }

  testSegment(id: string): void {
    console.log("Probar notificación con segmento", id);
  }

  // ========================================
  // ACTIONS - Templates
  // ========================================

  createTemplate(): void {
    console.log("Crear plantilla");
  }

  useTemplate(id: string): void {
    console.log("Usar plantilla", id);
  }

  editTemplate(id: string): void {
    console.log("Editar plantilla", id);
  }

  // ========================================
  // ACTIONS - Reports
  // ========================================

  exportPushReport(): void {
    console.log("Exportar informe de notificaciones");
  }

  // ========================================
  // HELPERS
  // ========================================

  getStatusLabel(status: PushNotification["status"]): string {
    const labels: Record<PushNotification["status"], string> = {
      draft: "Borrador",
      scheduled: "Programada",
      sending: "Enviando",
      sent: "Enviada",
      failed: "Fallida",
    };
    return labels[status];
  }

  getStatusClass(status: PushNotification["status"]): string {
    return `status-${status}`;
  }

  getTypeLabel(type: PushNotification["type"]): string {
    const labels: Record<PushNotification["type"], string> = {
      marketing: "Marketing",
      transactional: "Transaccional",
      alert: "Alerta",
      reminder: "Recordatorio",
    };
    return labels[type];
  }

  getTypeIcon(type: PushNotification["type"]): string {
    const icons: Record<PushNotification["type"], string> = {
      marketing: "📢",
      transactional: "💳",
      alert: "⚠️",
      reminder: "🔔",
    };
    return icons[type];
  }

  getCategoryLabel(category: PushTemplate["category"]): string {
    const labels: Record<PushTemplate["category"], string> = {
      weather: "Meteorología",
      booking: "Reservas",
      promotion: "Promociones",
      alert: "Alertas",
      engagement: "Engagement",
    };
    return labels[category];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getDeliveryRateClass(rate: number): string {
    if (rate >= 95) return "rate-excellent";
    if (rate >= 85) return "rate-good";
    if (rate >= 70) return "rate-fair";
    return "rate-poor";
  }

  getCTRClass(ctr: number): string {
    if (ctr >= 10) return "ctr-excellent";
    if (ctr >= 5) return "ctr-good";
    if (ctr >= 2) return "ctr-fair";
    return "ctr-poor";
  }
}
