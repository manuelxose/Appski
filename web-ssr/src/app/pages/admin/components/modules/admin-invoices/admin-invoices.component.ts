import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * AdminInvoicesComponent
 *
 * Módulo C2 - Sistema de Facturación
 *
 * Features:
 * - Generación automática de facturas
 * - Envío por email
 * - Descarga PDF
 * - Series de facturación
 * - Facturas rectificativas
 * - Gestión de estados (draft, sent, paid, overdue, cancelled)
 * - Recordatorios automáticos
 * - Filtros avanzados
 *
 * Signals:
 * - 6 data signals
 * - 5 filter signals
 * - 12 computed values
 */

// ========================================
// Interfaces
// ========================================

export interface Invoice {
  id: string;
  number: string; // e.g., "2025-001"
  series: string; // e.g., "A", "B", "REC" (rectificativa)
  type: "standard" | "rectificative" | "proforma";
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";

  // Dates
  issueDate: string;
  dueDate: string;
  paidDate?: string;

  // Client
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientTaxId: string; // NIF/CIF

  // Amounts
  subtotal: number;
  taxRate: number; // 21% IVA
  taxAmount: number;
  total: number;

  // Payment
  paymentMethod?: "card" | "transfer" | "cash" | "bizum";
  paymentReference?: string;

  // Related
  bookingId?: string;
  parentInvoiceId?: string; // For rectificative invoices

  // Metadata
  notes?: string;
  createdAt: string;
  lastSentAt?: string;
  remindersSent: number;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export interface InvoiceSeries {
  code: string;
  name: string;
  description: string;
  prefix: string; // e.g., "A", "B", "REC"
  currentNumber: number;
  isActive: boolean;
  isDefault: boolean;
}

export interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  avgPaymentDays: number;
  collectionRate: number; // % paid on time
}

export interface InvoiceReminder {
  id: string;
  invoiceId: string;
  sentAt: string;
  daysOverdue: number;
  emailSent: boolean;
}

export interface TaxSummary {
  period: string; // "2025-Q1"
  totalBase: number;
  totalTax: number;
  totalInvoiced: number;
  invoiceCount: number;
}

@Component({
  selector: "app-admin-invoices",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-invoices.component.html",
  styleUrl: "./admin-invoices.component.css",
})
export class AdminInvoicesComponent implements OnInit {
  // ========================================
  // Data Signals
  // ========================================

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly invoices = signal<Invoice[]>([]);
  readonly invoiceLines = signal<InvoiceLine[]>([]);
  readonly series = signal<InvoiceSeries[]>([]);
  readonly stats = signal<InvoiceStats | null>(null);
  readonly reminders = signal<InvoiceReminder[]>([]);
  readonly taxSummary = signal<TaxSummary[]>([]);

  // ========================================
  // Filter Signals
  // ========================================

  readonly selectedStatus = signal<string>("all");
  readonly selectedSeries = signal<string>("all");
  readonly selectedType = signal<string>("all");
  readonly searchTerm = signal<string>("");
  readonly dateRange = signal<string>("30d");

  // ========================================
  // Computed Values
  // ========================================

  readonly totalInvoices = computed(() => this.stats()?.totalInvoices ?? 0);
  readonly totalAmount = computed(() => this.stats()?.totalAmount ?? 0);
  readonly paidAmount = computed(() => this.stats()?.paidAmount ?? 0);
  readonly pendingAmount = computed(() => this.stats()?.pendingAmount ?? 0);
  readonly overdueAmount = computed(() => this.stats()?.overdueAmount ?? 0);
  readonly collectionRate = computed(() => this.stats()?.collectionRate ?? 0);

  readonly filteredInvoices = computed(() => {
    let filtered = this.invoices();

    // Filter by status
    if (this.selectedStatus() !== "all") {
      filtered = filtered.filter((inv) => inv.status === this.selectedStatus());
    }

    // Filter by series
    if (this.selectedSeries() !== "all") {
      filtered = filtered.filter((inv) => inv.series === this.selectedSeries());
    }

    // Filter by type
    if (this.selectedType() !== "all") {
      filtered = filtered.filter((inv) => inv.type === this.selectedType());
    }

    // Search
    const term = this.searchTerm().toLowerCase();
    if (term) {
      filtered = filtered.filter(
        (inv) =>
          inv.number.toLowerCase().includes(term) ||
          inv.clientName.toLowerCase().includes(term) ||
          inv.clientEmail.toLowerCase().includes(term)
      );
    }

    return filtered;
  });

  readonly draftInvoices = computed(() =>
    this.invoices().filter((inv) => inv.status === "draft")
  );

  readonly overdueInvoices = computed(() =>
    this.invoices().filter((inv) => inv.status === "overdue")
  );

  readonly recentInvoices = computed(() => this.invoices().slice(0, 10));

  readonly activeSeries = computed(() =>
    this.series().filter((s) => s.isActive)
  );

  readonly defaultSeries = computed(() =>
    this.series().find((s) => s.isDefault)
  );

  readonly sentInvoicesCount = computed(
    () => this.invoices().filter((i) => i.status === "sent").length
  );

  // ========================================
  // Lifecycle
  // ========================================

  ngOnInit(): void {
    this.loadInvoicesData();
  }

  // ========================================
  // Data Loading
  // ========================================

  private async loadInvoicesData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [invoicesData, seriesData, taxData] = await Promise.all([
        fetch("/assets/mocks/admin/invoices.json").then((r) => r.json()),
        fetch("/assets/mocks/admin/invoice-series.json").then((r) => r.json()),
        fetch("/assets/mocks/admin/tax-summary.json").then((r) => r.json()),
      ]);

      this.invoices.set(invoicesData.invoices);
      this.invoiceLines.set(invoicesData.lines);
      this.stats.set(invoicesData.stats);
      this.reminders.set(invoicesData.reminders);

      this.series.set(seriesData.series);
      this.taxSummary.set(taxData.quarters);
    } catch (err) {
      this.error.set("Error al cargar datos de facturación");
      console.error("Error loading invoices data:", err);
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

  setSeries(series: string): void {
    this.selectedSeries.set(series);
  }

  setType(type: string): void {
    this.selectedType.set(type);
  }

  setSearchTerm(term: string): void {
    this.searchTerm.set(term);
  }

  setDateRange(range: string): void {
    this.dateRange.set(range);
  }

  refreshData(): void {
    this.loadInvoicesData();
  }

  // Actions that would trigger backend calls
  createInvoice(): void {
    console.log("Create invoice");
    // Navigate to invoice creation form
  }

  sendInvoice(invoiceId: string): void {
    console.log("Send invoice:", invoiceId);
    // Backend call to send email
  }

  downloadPDF(invoiceId: string): void {
    console.log("Download PDF:", invoiceId);
    // Generate and download PDF
  }

  sendReminder(invoiceId: string): void {
    console.log("Send reminder:", invoiceId);
    // Backend call to send payment reminder
  }

  markAsPaid(invoiceId: string): void {
    console.log("Mark as paid:", invoiceId);
    // Update invoice status
  }

  createRectificative(invoiceId: string): void {
    console.log("Create rectificative invoice for:", invoiceId);
    // Navigate to rectificative invoice form
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

  getStatusLabel(status: Invoice["status"]): string {
    const labels: Record<Invoice["status"], string> = {
      draft: "Borrador",
      sent: "Enviada",
      paid: "Pagada",
      overdue: "Vencida",
      cancelled: "Cancelada",
    };
    return labels[status];
  }

  getStatusClass(status: Invoice["status"]): string {
    const classes: Record<Invoice["status"], string> = {
      draft: "status-draft",
      sent: "status-sent",
      paid: "status-paid",
      overdue: "status-overdue",
      cancelled: "status-cancelled",
    };
    return classes[status];
  }

  getTypeLabel(type: Invoice["type"]): string {
    const labels: Record<Invoice["type"], string> = {
      standard: "Estándar",
      rectificative: "Rectificativa",
      proforma: "Proforma",
    };
    return labels[type];
  }

  getDaysOverdue(invoice: Invoice): number {
    if (invoice.status !== "overdue") return 0;
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    return Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  canSendReminder(invoice: Invoice): boolean {
    return invoice.status === "overdue" && invoice.remindersSent < 3;
  }
}
