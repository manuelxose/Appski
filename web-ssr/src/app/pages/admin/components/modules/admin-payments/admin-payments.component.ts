import { Component, computed, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

import { AdminPaginationComponent } from "../../shared/admin-pagination/admin-pagination.component";
import { AdminSearchBarComponent } from "../../shared/admin-search-bar/admin-search-bar.component";
import { AdminBadgeComponent } from "../../shared/admin-badge/admin-badge.component";
import { AdminBreadcrumbsComponent } from "../../shared/admin-breadcrumbs/admin-breadcrumbs.component";
import { AdminToastComponent } from "../../shared/admin-toast/admin-toast.component";
import { AdminLoaderComponent } from "../../shared/admin-loader/admin-loader.component";
import { AdminEmptyStateComponent } from "../../shared/admin-empty-state/admin-empty-state.component";
import { AdminModalComponent } from "../../shared/admin-modal/admin-modal.component";
import { AdminConfirmDialogComponent } from "../../shared/admin-confirm-dialog/admin-confirm-dialog.component";
import { AdminDateRangePickerComponent } from "../../shared/admin-date-range-picker/admin-date-range-picker.component";

import type {
  Invoice,
  Payout,
  Refund,
  PaymentStatus,
  PaymentMethod,
  PaymentWithDetails,
} from "./admin-payments.models";

@Component({
  selector: "app-admin-payments",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminPaginationComponent,
    AdminSearchBarComponent,
    AdminBadgeComponent,
    AdminBreadcrumbsComponent,
    AdminToastComponent,
    AdminLoaderComponent,
    AdminEmptyStateComponent,
    AdminModalComponent,
    AdminConfirmDialogComponent,
    AdminDateRangePickerComponent,
  ],
  templateUrl: "./admin-payments.component.html",
  styleUrl: "./admin-payments.component.css",
})
export class AdminPaymentsComponent implements OnInit {
  // State
  readonly isLoading = signal(false);
  readonly activeTab = signal<"payments" | "invoices" | "refunds" | "payouts">(
    "payments"
  );
  readonly searchQuery = signal("");
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);

  // Filters
  readonly statusFilter = signal<PaymentStatus | "all">("all");
  readonly methodFilter = signal<PaymentMethod | "all">("all");
  readonly dateRange = signal<{ start: Date; end: Date } | null>(null);

  // Modals
  readonly showRefundModal = signal(false);
  readonly showInvoiceModal = signal(false);
  readonly showPayoutModal = signal(false);
  readonly showDetailsModal = signal(false);

  // Confirmation dialogs
  readonly showCancelDialog = signal(false);
  readonly confirmationTitle = signal("");
  readonly confirmationMessage = signal("");
  readonly confirmationAction = signal<(() => void) | null>(null);

  // Selected items
  readonly selectedPayment = signal<PaymentWithDetails | null>(null);
  readonly selectedInvoice = signal<Invoice | null>(null);
  readonly selectedPayout = signal<Payout | null>(null);

  // Form data
  readonly refundForm = signal({
    amount: 0,
    reason: "",
    notes: "",
  });

  readonly invoiceForm = signal({
    bookingId: "",
    dueDate: "",
    items: [] as Array<{ description: string; amount: number; tax: number }>,
    notes: "",
  });

  readonly payoutForm = signal({
    stationId: "",
    amount: 0,
    method: "bank_transfer" as PaymentMethod,
    reference: "",
    notes: "",
  });

  // Toast
  readonly showToast = signal(false);
  readonly toastMessage = signal("");
  readonly toastType = signal<"success" | "error" | "info">("success");

  // Breadcrumbs
  readonly breadcrumbs = [
    { label: "Admin", url: "/admin" },
    { label: "Pagos y Finanzas", url: "/admin/payments" },
  ];

  // Mock data - will be replaced with service calls
  readonly allPayments = signal<PaymentWithDetails[]>([
    {
      id: "PAY001",
      bookingId: "BK001",
      userId: "USR001",
      amount: 450.0,
      currency: "EUR",
      status: "completed",
      method: "card",
      createdAt: "2024-01-15T10:30:00Z",
      completedAt: "2024-01-15T10:30:00Z",
      customerName: "Carlos Martínez",
      stationName: "Sierra Nevada",
      invoiceNumber: "INV-2024-001",
    },
    {
      id: "PAY002",
      bookingId: "BK002",
      userId: "USR002",
      amount: 320.0,
      currency: "EUR",
      status: "pending",
      method: "paypal",
      createdAt: "2024-01-16T14:20:00Z",
      customerName: "Ana García",
      stationName: "Baqueira Beret",
    },
    {
      id: "PAY003",
      bookingId: "BK003",
      userId: "USR003",
      amount: 580.0,
      currency: "EUR",
      status: "completed",
      method: "bank_transfer",
      createdAt: "2024-01-14T09:15:00Z",
      completedAt: "2024-01-14T09:15:00Z",
      customerName: "Luis Fernández",
      stationName: "Formigal",
      invoiceNumber: "INV-2024-002",
    },
    {
      id: "PAY004",
      bookingId: "BK004",
      userId: "USR004",
      amount: 250.0,
      currency: "EUR",
      status: "failed",
      method: "card",
      createdAt: "2024-01-17T11:45:00Z",
      failedAt: "2024-01-17T11:45:00Z",
      customerName: "María López",
      stationName: "Sierra Nevada",
    },
  ]);

  readonly allInvoices = signal<Invoice[]>([
    {
      id: "INV-2024-001",
      invoiceNumber: "INV-2024-001",
      paymentId: "PAY001",
      customerId: "USR001",
      customerName: "Carlos Martínez",
      customerEmail: "carlos@example.com",
      amount: 450.0,
      taxAmount: 94.5,
      totalAmount: 544.5,
      currency: "EUR",
      status: "paid",
      issuedAt: "2024-01-15T00:00:00Z",
      dueAt: "2024-01-30T00:00:00Z",
      paidAt: "2024-01-15T10:30:00Z",
      createdAt: "2024-01-15T00:00:00Z",
    },
    {
      id: "INV-2024-002",
      invoiceNumber: "INV-2024-002",
      paymentId: "PAY003",
      customerId: "USR003",
      customerName: "Luis Fernández",
      customerEmail: "luis@example.com",
      amount: 580.0,
      taxAmount: 121.8,
      totalAmount: 701.8,
      currency: "EUR",
      status: "paid",
      issuedAt: "2024-01-14T00:00:00Z",
      dueAt: "2024-01-29T00:00:00Z",
      paidAt: "2024-01-14T09:15:00Z",
      createdAt: "2024-01-14T00:00:00Z",
    },
    {
      id: "INV-2024-003",
      invoiceNumber: "INV-2024-003",
      paymentId: "PAY005",
      customerId: "USR005",
      customerName: "Pedro Gómez",
      customerEmail: "pedro@example.com",
      amount: 390.0,
      taxAmount: 81.9,
      totalAmount: 471.9,
      currency: "EUR",
      status: "sent",
      issuedAt: "2024-01-18T00:00:00Z",
      dueAt: "2024-02-02T00:00:00Z",
      createdAt: "2024-01-18T00:00:00Z",
    },
  ]);

  readonly allRefunds = signal<Refund[]>([
    {
      id: "REF001",
      paymentId: "PAY001",
      amount: 100.0,
      currency: "EUR",
      reason: "customer_request",
      status: "completed",
      createdAt: "2024-01-16T15:00:00Z",
      completedAt: "2024-01-16T16:30:00Z",
    },
  ]);

  readonly allPayouts = signal<Payout[]>([
    {
      id: "PAYOUT001",
      stationId: "sierra-nevada",
      stationName: "Sierra Nevada",
      amount: 12500.0,
      currency: "EUR",
      status: "completed",
      createdAt: "2024-01-10T00:00:00Z",
      scheduledAt: "2024-01-10T00:00:00Z",
      completedAt: "2024-01-10T09:00:00Z",
    },
    {
      id: "PAYOUT002",
      stationId: "baqueira-beret",
      stationName: "Baqueira Beret",
      amount: 8750.0,
      currency: "EUR",
      status: "pending",
      createdAt: "2024-01-20T00:00:00Z",
      scheduledAt: "2024-01-20T00:00:00Z",
    },
  ]);

  // Filter options
  readonly statusOptions = [
    { value: "all", label: "Todos los estados" },
    { value: "pending", label: "Pendiente" },
    { value: "completed", label: "Completado" },
    { value: "failed", label: "Fallido" },
    { value: "refunded", label: "Reembolsado" },
    { value: "cancelled", label: "Cancelado" },
  ];

  readonly methodOptions = [
    { value: "all", label: "Todos los métodos" },
    { value: "card", label: "Tarjeta" },
    { value: "paypal", label: "PayPal" },
    { value: "bank_transfer", label: "Transferencia" },
    { value: "cash", label: "Efectivo" },
    { value: "bizum", label: "Bizum" },
  ];

  // Computed
  readonly filteredPayments = computed(() => {
    let payments = this.allPayments();
    const query = this.searchQuery().toLowerCase();
    const status = this.statusFilter();
    const method = this.methodFilter();
    const range = this.dateRange();

    if (query) {
      payments = payments.filter(
        (p) =>
          p.id.toLowerCase().includes(query) ||
          p.customerName.toLowerCase().includes(query) ||
          p.stationName.toLowerCase().includes(query) ||
          p.invoiceNumber?.toLowerCase().includes(query)
      );
    }

    if (status !== "all") {
      payments = payments.filter((p) => p.status === status);
    }

    if (method !== "all") {
      payments = payments.filter((p) => p.method === method);
    }

    if (range) {
      const { start, end } = range;
      payments = payments.filter((p) => {
        const date = new Date(p.createdAt);
        return date >= start && date <= end;
      });
    }

    return payments;
  });

  readonly paginatedPayments = computed(() => {
    const payments = this.filteredPayments();
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return payments.slice(start, end);
  });

  readonly totalPayments = computed(() => this.filteredPayments().length);

  readonly stats = computed(() => {
    const payments = this.allPayments();
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingRefunds = this.allRefunds().filter(
      (r) => r.status === "pending"
    ).length;
    const monthlyRevenue = payments
      .filter((p) => {
        const date = new Date(p.createdAt);
        const now = new Date();
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const commissions = totalPayments * 0.15; // 15% commission

    return {
      totalPayments,
      pendingRefunds,
      monthlyRevenue,
      commissions,
    };
  });

  readonly paymentColumns = [
    { key: "id", label: "ID Pago", sortable: true },
    { key: "customerName", label: "Cliente", sortable: true },
    { key: "stationName", label: "Estación", sortable: true },
    { key: "amount", label: "Importe", sortable: true },
    { key: "method", label: "Método", sortable: true },
    { key: "status", label: "Estado", sortable: true },
    { key: "processedAt", label: "Fecha", sortable: true },
    { key: "actions", label: "Acciones", sortable: false },
  ];

  readonly invoiceColumns = [
    { key: "id", label: "Número", sortable: true },
    { key: "amount", label: "Importe", sortable: true },
    { key: "status", label: "Estado", sortable: true },
    { key: "issueDate", label: "Fecha emisión", sortable: true },
    { key: "dueDate", label: "Vencimiento", sortable: true },
    { key: "actions", label: "Acciones", sortable: false },
  ];

  readonly refundColumns = [
    { key: "id", label: "ID", sortable: true },
    { key: "paymentId", label: "Pago original", sortable: true },
    { key: "amount", label: "Importe", sortable: true },
    { key: "reason", label: "Motivo", sortable: true },
    { key: "status", label: "Estado", sortable: true },
    { key: "requestedAt", label: "Solicitado", sortable: true },
    { key: "actions", label: "Acciones", sortable: false },
  ];

  readonly payoutColumns = [
    { key: "id", label: "ID", sortable: true },
    { key: "stationId", label: "Estación", sortable: true },
    { key: "amount", label: "Importe", sortable: true },
    { key: "method", label: "Método", sortable: true },
    { key: "status", label: "Estado", sortable: true },
    { key: "scheduledAt", label: "Programado", sortable: true },
    { key: "actions", label: "Acciones", sortable: false },
  ];

  ngOnInit(): void {
    this.loadPayments();
  }

  async loadPayments(): Promise<void> {
    this.isLoading.set(true);
    try {
      // TODO: Load from service
      // const payments = await this.financialService.getPayments();
      // this.allPayments.set(payments);

      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
    } catch {
      this.showErrorToast("Error al cargar los pagos");
    } finally {
      this.isLoading.set(false);
    }
  }

  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status as PaymentStatus | "all");
    this.currentPage.set(1);
  }

  onMethodFilterChange(method: string): void {
    this.methodFilter.set(method as PaymentMethod | "all");
    this.currentPage.set(1);
  }

  onDateRangeChange(range: { start: Date; end: Date } | null): void {
    this.dateRange.set(range);
    this.currentPage.set(1);
  }

  onTabChange(tab: "payments" | "invoices" | "refunds" | "payouts"): void {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  // Payment actions
  viewPaymentDetails(payment: PaymentWithDetails): void {
    this.selectedPayment.set(payment);
    this.showDetailsModal.set(true);
  }

  openRefundModal(payment: PaymentWithDetails): void {
    this.selectedPayment.set(payment);
    this.refundForm.set({
      amount: payment.amount,
      reason: "",
      notes: "",
    });
    this.showRefundModal.set(true);
  }

  async processRefund(): Promise<void> {
    const payment = this.selectedPayment();
    const form = this.refundForm();

    if (!payment || !form.reason) {
      this.showErrorToast("Por favor completa todos los campos obligatorios");
      return;
    }

    this.isLoading.set(true);
    try {
      // TODO: Process refund via service
      // await this.financialService.processRefund(payment.id, form);

      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      this.showRefundModal.set(false);
      this.showSuccessToast("Reembolso procesado correctamente");
      await this.loadPayments();
    } catch {
      this.showErrorToast("Error al procesar el reembolso");
    } finally {
      this.isLoading.set(false);
    }
  }

  cancelPayment(payment: PaymentWithDetails): void {
    this.confirmationTitle.set("Cancelar pago");
    this.confirmationMessage.set(
      `¿Estás seguro de que quieres cancelar el pago ${payment.id}?`
    );
    this.confirmationAction.set(async () => {
      this.isLoading.set(true);
      try {
        // TODO: Cancel payment via service
        // await this.financialService.cancelPayment(payment.id);

        await new Promise((resolve) => setTimeout(resolve, 500));

        this.showSuccessToast("Pago cancelado correctamente");
        await this.loadPayments();
      } catch {
        this.showErrorToast("Error al cancelar el pago");
      } finally {
        this.isLoading.set(false);
      }
    });
    this.showCancelDialog.set(true);
  }

  // Invoice actions
  openInvoiceModal(): void {
    this.invoiceForm.set({
      bookingId: "",
      dueDate: "",
      items: [],
      notes: "",
    });
    this.showInvoiceModal.set(true);
  }

  async generateInvoice(): Promise<void> {
    const form = this.invoiceForm();

    if (!form.bookingId || !form.dueDate) {
      this.showErrorToast("Por favor completa todos los campos obligatorios");
      return;
    }

    this.isLoading.set(true);
    try {
      // TODO: Generate invoice via service
      // await this.financialService.generateInvoice(form);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.showInvoiceModal.set(false);
      this.showSuccessToast("Factura generada correctamente");
    } catch {
      this.showErrorToast("Error al generar la factura");
    } finally {
      this.isLoading.set(false);
    }
  }

  downloadInvoice(invoice: Invoice): void {
    // TODO: Download invoice PDF
    this.showSuccessToast(`Descargando factura ${invoice.id}...`);
  }

  // Payout actions
  openPayoutModal(): void {
    this.payoutForm.set({
      stationId: "",
      amount: 0,
      method: "bank_transfer",
      reference: "",
      notes: "",
    });
    this.showPayoutModal.set(true);
  }

  async createPayout(): Promise<void> {
    const form = this.payoutForm();

    if (!form.stationId || form.amount <= 0) {
      this.showErrorToast("Por favor completa todos los campos obligatorios");
      return;
    }

    this.isLoading.set(true);
    try {
      // TODO: Create payout via service
      // await this.financialService.createPayout(form);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.showPayoutModal.set(false);
      this.showSuccessToast("Pago a estación creado correctamente");
    } catch {
      this.showErrorToast("Error al crear el pago");
    } finally {
      this.isLoading.set(false);
    }
  }

  // Export
  async exportData(): Promise<void> {
    const tab = this.activeTab();
    this.isLoading.set(true);
    try {
      // TODO: Export data via service (xlsx format)
      // await this.financialService.exportFinancialData(tab);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.showSuccessToast(`Datos de ${tab} exportados correctamente`);
    } catch {
      this.showErrorToast("Error al exportar los datos");
    } finally {
      this.isLoading.set(false);
    }
  }

  // Helpers
  formatCurrency(amount: number, currency = "EUR"): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatMethod(method: PaymentMethod): string {
    const methods: Record<PaymentMethod, string> = {
      card: "Tarjeta",
      paypal: "PayPal",
      bank_transfer: "Transferencia",
      cash: "Efectivo",
      bizum: "Bizum",
    };
    return methods[method] || method;
  }

  formatStatus(status: PaymentStatus): string {
    const statuses: Record<PaymentStatus, string> = {
      pending: "Pendiente",
      processing: "Procesando",
      completed: "Completado",
      failed: "Fallido",
      refunded: "Reembolsado",
      cancelled: "Cancelado",
    };
    return statuses[status] || status;
  }

  getStatusBadgeType(
    status: PaymentStatus
  ): "success" | "warning" | "danger" | "info" {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
      case "processing":
        return "warning";
      case "failed":
      case "cancelled":
        return "danger";
      case "refunded":
        return "info";
      default:
        return "info";
    }
  }

  // Toast
  showSuccessToast(message: string): void {
    this.toastMessage.set(message);
    this.toastType.set("success");
    this.showToast.set(true);
  }

  showErrorToast(message: string): void {
    this.toastMessage.set(message);
    this.toastType.set("error");
    this.showToast.set(true);
  }

  closeModal(): void {
    this.showRefundModal.set(false);
    this.showInvoiceModal.set(false);
    this.showPayoutModal.set(false);
    this.showDetailsModal.set(false);
    this.showCancelDialog.set(false);
  }

  async confirmAction(): Promise<void> {
    const action = this.confirmationAction();
    if (action) {
      await action();
    }
    this.showCancelDialog.set(false);
  }
}
