/**
 * Financial Service - Nieve Platform
 * Servicio para gestión financiera: pagos, facturas, comisiones y reportes
 * Angular 18+ con Signals
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
// Note: Parameters prefixed with _ are reserved for production API calls

import { Injectable, signal, computed } from "@angular/core";
import type {
  Payment,
  PaymentFilters,
  PaymentStats,
  RefundRequest,
  DisputeCase,
  Invoice,
  InvoiceStatus,
  InvoiceSeries,
  RectificationInvoice,
  Commission,
  CommissionStatus,
  CommissionStats,
  Partner,
  Payout,
  PayoutMethod,
  FinancialReport,
  ReportType,
  ReportPeriod,
  TaxConfiguration,
  TaxReport,
  Budget,
  FinancialForecast,
  BankReconciliation,
  ReconciliationItem,
  AccountingExport,
  AccountingIntegration,
} from "../models/financial.models";

@Injectable({
  providedIn: "root",
})
export class FinancialService {
  // ========== PRIVATE SIGNALS (State) ==========

  // Payments & Transactions
  private readonly _payments = signal<Payment[]>([]);
  private readonly _paymentStats = signal<PaymentStats | null>(null);
  private readonly _refundRequests = signal<RefundRequest[]>([]);
  private readonly _disputes = signal<DisputeCase[]>([]);

  // Invoices
  private readonly _invoices = signal<Invoice[]>([]);
  private readonly _invoiceSeries = signal<InvoiceSeries[]>([]);
  private readonly _rectifications = signal<RectificationInvoice[]>([]);

  // Commissions & Partners
  private readonly _commissions = signal<Commission[]>([]);
  private readonly _commissionStats = signal<CommissionStats | null>(null);
  private readonly _partners = signal<Partner[]>([]);
  private readonly _payouts = signal<Payout[]>([]);

  // Reports
  private readonly _financialReports = signal<FinancialReport[]>([]);
  private readonly _currentReport = signal<FinancialReport | null>(null);

  // Tax
  private readonly _taxConfig = signal<TaxConfiguration | null>(null);
  private readonly _taxReports = signal<TaxReport[]>([]);

  // Budget & Forecast
  private readonly _budgets = signal<Budget[]>([]);
  private readonly _forecasts = signal<FinancialForecast[]>([]);

  // Reconciliation
  private readonly _reconciliations = signal<BankReconciliation[]>([]);
  private readonly _reconciliationItems = signal<ReconciliationItem[]>([]);

  // Integration
  private readonly _accountingExports = signal<AccountingExport[]>([]);
  private readonly _accountingIntegration =
    signal<AccountingIntegration | null>(null);

  // Filters
  private readonly _paymentFilters = signal<PaymentFilters>({});

  // UI State
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ========== PUBLIC COMPUTED (Read-only access) ==========

  // Payments
  readonly payments = this._payments.asReadonly();
  readonly paymentStats = this._paymentStats.asReadonly();
  readonly refundRequests = this._refundRequests.asReadonly();
  readonly disputes = this._disputes.asReadonly();

  // Invoices
  readonly invoices = this._invoices.asReadonly();
  readonly invoiceSeries = this._invoiceSeries.asReadonly();
  readonly rectifications = this._rectifications.asReadonly();

  // Commissions
  readonly commissions = this._commissions.asReadonly();
  readonly commissionStats = this._commissionStats.asReadonly();
  readonly partners = this._partners.asReadonly();
  readonly payouts = this._payouts.asReadonly();

  // Reports
  readonly financialReports = this._financialReports.asReadonly();
  readonly currentReport = this._currentReport.asReadonly();

  // Tax
  readonly taxConfig = this._taxConfig.asReadonly();
  readonly taxReports = this._taxReports.asReadonly();

  // Budget & Forecast
  readonly budgets = this._budgets.asReadonly();
  readonly forecasts = this._forecasts.asReadonly();

  // Reconciliation
  readonly reconciliations = this._reconciliations.asReadonly();
  readonly reconciliationItems = this._reconciliationItems.asReadonly();

  // Integration
  readonly accountingExports = this._accountingExports.asReadonly();
  readonly accountingIntegration = this._accountingIntegration.asReadonly();

  // Filters
  readonly paymentFilters = this._paymentFilters.asReadonly();

  // UI State
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly errorMessage = this._error.asReadonly();

  // Computed properties
  readonly totalPayments = computed(() => this._payments().length);
  readonly pendingRefunds = computed(
    () => this._refundRequests().filter((r) => r.status === "pending").length
  );
  readonly openDisputes = computed(
    () =>
      this._disputes().filter(
        (d) => d.status === "open" || d.status === "under_review"
      ).length
  );
  readonly unpaidInvoices = computed(
    () =>
      this._invoices().filter(
        (i) => i.status !== "paid" && i.status !== "cancelled"
      ).length
  );
  readonly pendingCommissions = computed(
    () => this._commissions().filter((c) => c.status === "pending").length
  );
  readonly totalPendingCommissionAmount = computed(() =>
    this._commissions()
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.commissionAmount, 0)
  );

  // ========== PAYMENTS METHODS ==========

  /**
   * Load all payments with optional filters
   */
  async loadPayments(filters?: PaymentFilters): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, pasar filters como query params
      const response = await fetch("/assets/mocks/admin/payments.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Payment[] = await response.json();
      this._payments.set(data);

      if (filters) {
        this._paymentFilters.set(filters);
      }
    } catch (error) {
      this._error.set("Error al cargar pagos");
      console.error("Error loading payments:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load payment statistics
   */
  async loadPaymentStats(period?: ReportPeriod): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, usar period como query parameter
      const response = await fetch("/assets/mocks/admin/payment-stats.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: PaymentStats = await response.json();
      this._paymentStats.set(data);
    } catch (error) {
      this._error.set("Error al cargar estadísticas de pagos");
      console.error("Error loading payment stats:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Process a refund request
   */
  async processRefund(
    paymentId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      const refund: RefundRequest = {
        paymentId,
        amount,
        reason,
        requestedBy: "current-admin-id",
        requestedAt: new Date().toISOString(),
        status: "pending",
      };

      this._refundRequests.update((requests) => [...requests, refund]);
    } catch (error) {
      this._error.set("Error al procesar reembolso");
      console.error("Error processing refund:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load refund requests
   */
  async loadRefundRequests(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/refund-requests.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: RefundRequest[] = await response.json();
      this._refundRequests.set(data);
    } catch (error) {
      this._error.set("Error al cargar solicitudes de reembolso");
      console.error("Error loading refund requests:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load payment disputes
   */
  async loadDisputes(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/disputes.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DisputeCase[] = await response.json();
      this._disputes.set(data);
    } catch (error) {
      this._error.set("Error al cargar disputas");
      console.error("Error loading disputes:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== INVOICES METHODS ==========

  /**
   * Load all invoices
   */
  async loadInvoices(status?: InvoiceStatus): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, usar status como query parameter
      const response = await fetch("/assets/mocks/admin/invoices.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Invoice[] = await response.json();

      // Filter by status if provided
      const filteredData = status
        ? data.filter((inv) => inv.status === status)
        : data;

      this._invoices.set(filteredData);
    } catch (error) {
      this._error.set("Error al cargar facturas");
      console.error("Error loading invoices:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Generate a new invoice
   */
  async generateInvoice(
    invoiceData: Partial<Invoice>
  ): Promise<Invoice | null> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API para generar factura
      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-2025-${String(this._invoices().length + 1).padStart(
          4,
          "0"
        )}`,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currency: "EUR",
        language: "es",
        ...invoiceData,
      } as Invoice;

      this._invoices.update((invoices) => [...invoices, newInvoice]);
      return newInvoice;
    } catch (error) {
      this._error.set("Error al generar factura");
      console.error("Error generating invoice:", error);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    invoiceId: string,
    status: InvoiceStatus
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      this._invoices.update((invoices) =>
        invoices.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, status, updatedAt: new Date().toISOString() }
            : inv
        )
      );
    } catch (error) {
      this._error.set("Error al actualizar estado de factura");
      console.error("Error updating invoice status:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoicePDF(invoiceId: string): Promise<void> {
    // TODO: En producción, generar y descargar PDF
    console.log("Downloading invoice PDF:", invoiceId);
  }

  /**
   * Send invoice by email
   */
  async sendInvoiceEmail(
    invoiceId: string,
    recipientEmail: string
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API para enviar email
      console.log(`Sending invoice ${invoiceId} to ${recipientEmail}`);

      // Update invoice status to 'sent'
      await this.updateInvoiceStatus(invoiceId, "sent");
    } catch (error) {
      this._error.set("Error al enviar factura por email");
      console.error("Error sending invoice email:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== COMMISSIONS METHODS ==========

  /**
   * Load all commissions
   */
  async loadCommissions(status?: CommissionStatus): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, usar status como query parameter
      const response = await fetch("/assets/mocks/admin/commissions.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Commission[] = await response.json();

      // Filter by status if provided
      const filteredData = status
        ? data.filter((comm) => comm.status === status)
        : data;

      this._commissions.set(filteredData);
    } catch (error) {
      this._error.set("Error al cargar comisiones");
      console.error("Error loading commissions:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load commission statistics
   */
  async loadCommissionStats(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/commission-stats.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: CommissionStats = await response.json();
      this._commissionStats.set(data);
    } catch (error) {
      this._error.set("Error al cargar estadísticas de comisiones");
      console.error("Error loading commission stats:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Approve commission
   */
  async approveCommission(commissionId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      this._commissions.update((commissions) =>
        commissions.map((comm) =>
          comm.id === commissionId
            ? {
                ...comm,
                status: "approved",
                approvedAt: new Date().toISOString(),
              }
            : comm
        )
      );
    } catch (error) {
      this._error.set("Error al aprobar comisión");
      console.error("Error approving commission:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load partners
   */
  async loadPartners(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/partners.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Partner[] = await response.json();
      this._partners.set(data);
    } catch (error) {
      this._error.set("Error al cargar partners");
      console.error("Error loading partners:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Create payout for partner
   */
  async createPayout(
    partnerId: string,
    commissionIds: string[]
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      const selectedCommissions = this._commissions().filter((c) =>
        commissionIds.includes(c.id)
      );

      const totalAmount = selectedCommissions.reduce(
        (sum, c) => sum + c.commissionAmount,
        0
      );
      const partner = this._partners().find((p) => p.id === partnerId);

      if (!partner) {
        throw new Error("Partner not found");
      }

      const payout: Payout = {
        id: `payout-${Date.now()}`,
        partnerId,
        partnerName: partner.name,
        method: partner.payoutMethod,
        commissions: selectedCommissions,
        totalAmount,
        fees: totalAmount * 0.02, // 2% processing fee
        netAmount: totalAmount * 0.98,
        currency: "EUR",
        status: "pending",
        requestedAt: new Date().toISOString(),
      };

      this._payouts.update((payouts) => [...payouts, payout]);

      // Update commission status to 'paid'
      commissionIds.forEach((id) => {
        this._commissions.update((commissions) =>
          commissions.map((comm) =>
            comm.id === id
              ? {
                  ...comm,
                  status: "paid",
                  paidAt: new Date().toISOString(),
                  payoutId: payout.id,
                }
              : comm
          )
        );
      });
    } catch (error) {
      this._error.set("Error al crear pago");
      console.error("Error creating payout:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load payouts
   */
  async loadPayouts(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/payouts.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Payout[] = await response.json();
      this._payouts.set(data);
    } catch (error) {
      this._error.set("Error al cargar pagos a partners");
      console.error("Error loading payouts:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== REPORTS METHODS ==========

  /**
   * Generate financial report
   */
  async generateReport(type: ReportType, period: ReportPeriod): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API para generar reporte
      const response = await fetch(`/assets/mocks/admin/reports/${type}.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: FinancialReport = await response.json();
      this._currentReport.set(data);
      this._financialReports.update((reports) => [...reports, data]);
    } catch (error) {
      this._error.set("Error al generar reporte financiero");
      console.error("Error generating report:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load financial reports history
   */
  async loadReports(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/financial-reports.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: FinancialReport[] = await response.json();
      this._financialReports.set(data);
    } catch (error) {
      this._error.set("Error al cargar reportes");
      console.error("Error loading reports:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Export report to file
   */
  async exportReport(
    reportId: string,
    format: "pdf" | "excel" | "csv"
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, generar y descargar archivo
      console.log(`Exporting report ${reportId} as ${format}`);
    } catch (error) {
      this._error.set("Error al exportar reporte");
      console.error("Error exporting report:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== TAX METHODS ==========

  /**
   * Load tax configuration
   */
  async loadTaxConfig(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/tax-config.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: TaxConfiguration = await response.json();
      this._taxConfig.set(data);
    } catch (error) {
      this._error.set("Error al cargar configuración de impuestos");
      console.error("Error loading tax config:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Generate tax report
   */
  async generateTaxReport(period: ReportPeriod): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API para generar reporte de impuestos
      const response = await fetch("/assets/mocks/admin/tax-report.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: TaxReport = await response.json();
      this._taxReports.update((reports) => [...reports, data]);
    } catch (error) {
      this._error.set("Error al generar reporte de impuestos");
      console.error("Error generating tax report:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load tax reports
   */
  async loadTaxReports(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/tax-reports.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: TaxReport[] = await response.json();
      this._taxReports.set(data);
    } catch (error) {
      this._error.set("Error al cargar reportes de impuestos");
      console.error("Error loading tax reports:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== BUDGET & FORECAST METHODS ==========

  /**
   * Load budgets
   */
  async loadBudgets(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/budgets.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Budget[] = await response.json();
      this._budgets.set(data);
    } catch (error) {
      this._error.set("Error al cargar presupuestos");
      console.error("Error loading budgets:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load financial forecasts
   */
  async loadForecasts(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/financial-forecasts.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: FinancialForecast[] = await response.json();
      this._forecasts.set(data);
    } catch (error) {
      this._error.set("Error al cargar pronósticos financieros");
      console.error("Error loading forecasts:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== RECONCILIATION METHODS ==========

  /**
   * Load bank reconciliations
   */
  async loadReconciliations(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/reconciliations.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: BankReconciliation[] = await response.json();
      this._reconciliations.set(data);
    } catch (error) {
      this._error.set("Error al cargar reconciliaciones bancarias");
      console.error("Error loading reconciliations:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load reconciliation items
   */
  async loadReconciliationItems(reconciliationId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, pasar reconciliationId como query param
      const response = await fetch(
        "/assets/mocks/admin/reconciliation-items.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ReconciliationItem[] = await response.json();
      this._reconciliationItems.set(data);
    } catch (error) {
      this._error.set("Error al cargar items de reconciliación");
      console.error("Error loading reconciliation items:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== INTEGRATION & EXPORT METHODS ==========

  /**
   * Export accounting data
   */
  async exportAccountingData(
    format: "csv" | "excel" | "xml" | "json",
    period: ReportPeriod
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API para generar exportación
      const exportData: AccountingExport = {
        id: `export-${Date.now()}`,
        format,
        period,
        includePayments: true,
        includeInvoices: true,
        includeCommissions: true,
        generatedAt: new Date().toISOString(),
      };

      this._accountingExports.update((exports) => [...exports, exportData]);
    } catch (error) {
      this._error.set("Error al exportar datos contables");
      console.error("Error exporting accounting data:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load accounting integration settings
   */
  async loadAccountingIntegration(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/accounting-integration.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: AccountingIntegration = await response.json();
      this._accountingIntegration.set(data);
    } catch (error) {
      this._error.set("Error al cargar integración contable");
      console.error("Error loading accounting integration:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update accounting integration settings
   */
  async updateAccountingIntegration(
    settings: Partial<AccountingIntegration>
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      const current = this._accountingIntegration();
      if (current) {
        this._accountingIntegration.set({ ...current, ...settings });
      }
    } catch (error) {
      this._error.set("Error al actualizar integración contable");
      console.error("Error updating accounting integration:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== COMPREHENSIVE LOAD METHODS ==========

  /**
   * Load all payment-related data
   */
  async loadAllPaymentData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadPayments(),
        this.loadPaymentStats(),
        this.loadRefundRequests(),
        this.loadDisputes(),
      ]);
    } catch (error) {
      this._error.set("Error al cargar datos de pagos");
      console.error("Error loading payment data:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load all invoice-related data
   */
  async loadAllInvoiceData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([this.loadInvoices()]);
    } catch (error) {
      this._error.set("Error al cargar datos de facturas");
      console.error("Error loading invoice data:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load all commission-related data
   */
  async loadAllCommissionData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadCommissions(),
        this.loadCommissionStats(),
        this.loadPartners(),
        this.loadPayouts(),
      ]);
    } catch (error) {
      this._error.set("Error al cargar datos de comisiones");
      console.error("Error loading commission data:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load all financial data
   */
  async loadAllFinancialData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadPayments(),
        this.loadInvoices(),
        this.loadCommissions(),
        this.loadReports(),
        this.loadTaxConfig(),
        this.loadBudgets(),
      ]);
    } catch (error) {
      this._error.set("Error al cargar datos financieros");
      console.error("Error loading financial data:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Update payment filters
   */
  updatePaymentFilters(filters: Partial<PaymentFilters>): void {
    const current = this._paymentFilters();
    this._paymentFilters.set({ ...current, ...filters });
  }

  /**
   * Reset payment filters
   */
  resetPaymentFilters(): void {
    this._paymentFilters.set({});
  }

  /**
   * Clear all financial data
   */
  clearData(): void {
    this._payments.set([]);
    this._paymentStats.set(null);
    this._refundRequests.set([]);
    this._disputes.set([]);
    this._invoices.set([]);
    this._invoiceSeries.set([]);
    this._rectifications.set([]);
    this._commissions.set([]);
    this._commissionStats.set(null);
    this._partners.set([]);
    this._payouts.set([]);
    this._financialReports.set([]);
    this._currentReport.set(null);
    this._taxConfig.set(null);
    this._taxReports.set([]);
    this._budgets.set([]);
    this._forecasts.set([]);
    this._reconciliations.set([]);
    this._reconciliationItems.set([]);
    this._accountingExports.set([]);
    this._accountingIntegration.set(null);
    this._error.set(null);
  }

  /**
   * Refresh all loaded data
   */
  async refresh(): Promise<void> {
    await this.loadAllFinancialData();
  }
}
