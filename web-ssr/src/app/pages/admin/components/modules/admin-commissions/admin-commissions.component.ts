import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * AdminCommissionsComponent
 *
 * Módulo C3 - Gestión de Comisiones y Pagos a Partners
 *
 * Features:
 * - Configuración % comisión por partner
 * - Métodos de pago (transfer, bizum, cash)
 * - Frecuencia de pago (weekly, monthly, quarterly)
 * - Reportes de comisiones pendientes/pagadas
 * - Histórico de pagos
 * - Desglose por estación/servicio
 * - Cálculo automático de comisiones
 *
 * Signals:
 * - 5 data signals
 * - 3 filter signals
 * - 10 computed values
 */

// ========================================
// Interfaces
// ========================================

export interface Partner {
  id: string;
  name: string;
  type: "hotel" | "shop" | "school" | "transport" | "other";
  email: string;
  taxId: string;

  // Commission config
  commissionRate: number; // % (5.5 = 5.5%)
  paymentMethod: "transfer" | "bizum" | "cash";
  paymentFrequency: "weekly" | "monthly" | "quarterly";
  bankAccount?: string;

  // Stats
  totalEarned: number;
  totalPaid: number;
  pendingAmount: number;

  // Metadata
  isActive: boolean;
  joinedAt: string;
  lastPaymentAt?: string;
}

export interface Commission {
  id: string;
  partnerId: string;
  partnerName: string;

  // Booking info
  bookingId: string;
  bookingDate: string;
  serviceName: string;
  serviceType: "lodging" | "rental" | "lessons" | "transport" | "other";

  // Amounts
  bookingAmount: number;
  commissionRate: number;
  commissionAmount: number;

  // Status
  status: "pending" | "approved" | "paid" | "cancelled";
  approvedAt?: string;
  paidAt?: string;

  // Payment
  paymentId?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  partnerId: string;
  partnerName: string;

  // Period
  periodStart: string;
  periodEnd: string;

  // Amounts
  totalCommissions: number;
  deductions: number; // Taxes, fees
  netAmount: number;

  // Details
  commissionsCount: number;
  commissionIds: string[];

  // Payment info
  method: "transfer" | "bizum" | "cash";
  reference?: string;
  paidAt: string;

  // Metadata
  createdAt: string;
  notes?: string;
}

export interface CommissionStats {
  totalCommissions: number;
  totalAmount: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  avgCommissionRate: number;
  topPartner: string;
}

export interface CommissionByType {
  type: string;
  count: number;
  totalAmount: number;
  avgRate: number;
}

@Component({
  selector: "app-admin-commissions",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-commissions.component.html",
  styleUrl: "./admin-commissions.component.css",
})
export class AdminCommissionsComponent implements OnInit {
  // ========================================
  // Data Signals
  // ========================================

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly partners = signal<Partner[]>([]);
  readonly commissions = signal<Commission[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly stats = signal<CommissionStats | null>(null);
  readonly byType = signal<CommissionByType[]>([]);

  // ========================================
  // Filter Signals
  // ========================================

  readonly selectedStatus = signal<string>("all");
  readonly selectedPartner = signal<string>("all");
  readonly dateRange = signal<string>("30d");

  // ========================================
  // Computed Values
  // ========================================

  readonly totalCommissions = computed(
    () => this.stats()?.totalCommissions ?? 0
  );
  readonly totalAmount = computed(() => this.stats()?.totalAmount ?? 0);
  readonly pendingAmount = computed(() => this.stats()?.pendingAmount ?? 0);
  readonly paidAmount = computed(() => this.stats()?.paidAmount ?? 0);
  readonly avgCommissionRate = computed(
    () => this.stats()?.avgCommissionRate ?? 0
  );

  readonly filteredCommissions = computed(() => {
    let filtered = this.commissions();

    if (this.selectedStatus() !== "all") {
      filtered = filtered.filter((c) => c.status === this.selectedStatus());
    }

    if (this.selectedPartner() !== "all") {
      filtered = filtered.filter((c) => c.partnerId === this.selectedPartner());
    }

    return filtered;
  });

  readonly activePartners = computed(() =>
    this.partners().filter((p) => p.isActive)
  );

  readonly pendingCommissions = computed(() =>
    this.commissions().filter((c) => c.status === "pending")
  );

  readonly recentPayments = computed(() => this.payments().slice(0, 5));

  readonly topPartner = computed(() => {
    const sorted = [...this.partners()].sort(
      (a, b) => b.totalEarned - a.totalEarned
    );
    return sorted[0];
  });

  // ========================================
  // Lifecycle
  // ========================================

  ngOnInit(): void {
    this.loadCommissionsData();
  }

  // ========================================
  // Data Loading
  // ========================================

  private async loadCommissionsData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [commissionsData, partnersData, paymentsData] = await Promise.all([
        fetch("/assets/mocks/admin/commissions.json").then((r) => r.json()),
        fetch("/assets/mocks/admin/partners.json").then((r) => r.json()),
        fetch("/assets/mocks/admin/commission-payments.json").then((r) =>
          r.json()
        ),
      ]);

      this.commissions.set(commissionsData.commissions);
      this.stats.set(commissionsData.stats);
      this.byType.set(commissionsData.byType);

      this.partners.set(partnersData.partners);
      this.payments.set(paymentsData.payments);
    } catch (err) {
      this.error.set("Error al cargar datos de comisiones");
      console.error("Error loading commissions data:", err);
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

  setPartner(partnerId: string): void {
    this.selectedPartner.set(partnerId);
  }

  setDateRange(range: string): void {
    this.dateRange.set(range);
  }

  refreshData(): void {
    this.loadCommissionsData();
  }

  // Backend actions
  approveCommission(commissionId: string): void {
    console.log("Approve commission:", commissionId);
  }

  processPayment(partnerId: string): void {
    console.log("Process payment for partner:", partnerId);
  }

  exportReport(): void {
    console.log("Export commissions report");
  }

  editPartner(partnerId: string): void {
    console.log("Edit partner:", partnerId);
  }

  // ========================================
  // Helpers
  // ========================================

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  getPartnerTypeLabel(type: Partner["type"]): string {
    const labels: Record<Partner["type"], string> = {
      hotel: "Hotel",
      shop: "Tienda",
      school: "Escuela",
      transport: "Transporte",
      other: "Otro",
    };
    return labels[type];
  }

  getPartnerTypeIcon(type: Partner["type"]): string {
    const icons: Record<Partner["type"], string> = {
      hotel: "🏨",
      shop: "🛒",
      school: "🎿",
      transport: "🚌",
      other: "📦",
    };
    return icons[type];
  }

  getPaymentMethodLabel(method: Partner["paymentMethod"]): string {
    const labels: Record<Partner["paymentMethod"], string> = {
      transfer: "Transferencia",
      bizum: "Bizum",
      cash: "Efectivo",
    };
    return labels[method];
  }

  getFrequencyLabel(frequency: Partner["paymentFrequency"]): string {
    const labels: Record<Partner["paymentFrequency"], string> = {
      weekly: "Semanal",
      monthly: "Mensual",
      quarterly: "Trimestral",
    };
    return labels[frequency];
  }

  getStatusLabel(status: Commission["status"]): string {
    const labels: Record<Commission["status"], string> = {
      pending: "Pendiente",
      approved: "Aprobada",
      paid: "Pagada",
      cancelled: "Cancelada",
    };
    return labels[status];
  }

  getStatusClass(status: Commission["status"]): string {
    const classes: Record<Commission["status"], string> = {
      pending: "status-pending",
      approved: "status-approved",
      paid: "status-paid",
      cancelled: "status-cancelled",
    };
    return classes[status];
  }
}
