import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * AdminFinancialReportsComponent
 *
 * Módulo C4 - Reportes Financieros
 *
 * Features:
 * - Balance General (Assets, Liabilities, Equity)
 * - Cuenta de Resultados (P&L)
 * - Cash Flow Statement
 * - Revenue/Costs Breakdown
 * - Tax Reports
 * - Export to accounting software
 * - Monthly/Quarterly/Annual views
 *
 * Signals:
 * - 6 data signals
 * - 2 filter signals
 * - 14 computed values
 */

// ========================================
// Interfaces
// ========================================

export interface BalanceSheet {
  period: string;

  // Assets
  currentAssets: number;
  fixedAssets: number;
  totalAssets: number;

  // Liabilities
  currentLiabilities: number;
  longTermLiabilities: number;
  totalLiabilities: number;

  // Equity
  equity: number;

  // Metadata
  generatedAt: string;
}

export interface IncomeStatement {
  period: string;

  // Revenue
  operatingRevenue: number;
  otherRevenue: number;
  totalRevenue: number;

  // Costs
  costOfSales: number;
  operatingExpenses: number;
  financialExpenses: number;
  taxes: number;
  totalExpenses: number;

  // Profit
  grossProfit: number;
  operatingProfit: number;
  netProfit: number;

  // Margins
  grossMargin: number; // %
  operatingMargin: number; // %
  netMargin: number; // %

  generatedAt: string;
}

export interface CashFlow {
  period: string;

  // Operating Activities
  operatingCashFlow: number;

  // Investing Activities
  investingCashFlow: number;

  // Financing Activities
  financingCashFlow: number;

  // Net Change
  netCashChange: number;

  // Beginning/Ending Balance
  beginningBalance: number;
  endingBalance: number;

  generatedAt: string;
}

export interface RevenueBreakdown {
  category: string;
  amount: number;
  percentage: number;
  growth: number; // % vs previous period
}

export interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: "up" | "down" | "stable";
}

export interface TaxReport {
  period: string;
  taxType: string;
  taxableBase: number;
  taxRate: number;
  taxAmount: number;
  isPaid: boolean;
  dueDate?: string;
  paidDate?: string;
}

export interface FinancialMetrics {
  period: string;

  // Profitability
  roi: number; // Return on Investment %
  roa: number; // Return on Assets %
  roe: number; // Return on Equity %

  // Liquidity
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;

  // Efficiency
  assetTurnover: number;
  inventoryTurnover: number;

  // Leverage
  debtToEquity: number;
  debtToAssets: number;
}

@Component({
  selector: "app-admin-financial-reports",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-financial-reports.component.html",
  styleUrl: "./admin-financial-reports.component.css",
})
export class AdminFinancialReportsComponent implements OnInit {
  // ========================================
  // Data Signals
  // ========================================

  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly balanceSheet = signal<BalanceSheet | null>(null);
  readonly incomeStatement = signal<IncomeStatement | null>(null);
  readonly cashFlow = signal<CashFlow | null>(null);
  readonly revenueBreakdown = signal<RevenueBreakdown[]>([]);
  readonly costBreakdown = signal<CostBreakdown[]>([]);
  readonly taxReports = signal<TaxReport[]>([]);
  readonly metrics = signal<FinancialMetrics | null>(null);

  // ========================================
  // Filter Signals
  // ========================================

  readonly selectedPeriod = signal<string>("2025-Q1");
  readonly reportType = signal<string>("all");

  // ========================================
  // Computed Values - Balance Sheet
  // ========================================

  readonly totalAssets = computed(() => this.balanceSheet()?.totalAssets ?? 0);
  readonly totalLiabilities = computed(
    () => this.balanceSheet()?.totalLiabilities ?? 0
  );
  readonly totalEquity = computed(() => this.balanceSheet()?.equity ?? 0);
  readonly assetsLiabilitiesBalance = computed(
    () =>
      Math.abs(
        this.totalAssets() - (this.totalLiabilities() + this.totalEquity())
      ) < 0.01
  );

  // ========================================
  // Computed Values - Income Statement
  // ========================================

  readonly totalRevenue = computed(
    () => this.incomeStatement()?.totalRevenue ?? 0
  );
  readonly totalExpenses = computed(
    () => this.incomeStatement()?.totalExpenses ?? 0
  );
  readonly netProfit = computed(() => this.incomeStatement()?.netProfit ?? 0);
  readonly grossMargin = computed(
    () => this.incomeStatement()?.grossMargin ?? 0
  );
  readonly operatingMargin = computed(
    () => this.incomeStatement()?.operatingMargin ?? 0
  );
  readonly netMargin = computed(() => this.incomeStatement()?.netMargin ?? 0);

  // ========================================
  // Computed Values - Cash Flow
  // ========================================

  readonly netCashChange = computed(() => this.cashFlow()?.netCashChange ?? 0);
  readonly endingBalance = computed(() => this.cashFlow()?.endingBalance ?? 0);
  readonly isCashPositive = computed(() => this.netCashChange() > 0);

  // ========================================
  // Computed Values - Metrics
  // ========================================

  readonly roi = computed(() => this.metrics()?.roi ?? 0);

  // ========================================
  // Lifecycle
  // ========================================

  ngOnInit(): void {
    this.loadFinancialData();
  }

  // ========================================
  // Data Loading
  // ========================================

  private async loadFinancialData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const data = await fetch(
        "/assets/mocks/admin/financial-reports.json"
      ).then((r) => r.json());

      this.balanceSheet.set(data.balanceSheet);
      this.incomeStatement.set(data.incomeStatement);
      this.cashFlow.set(data.cashFlow);
      this.revenueBreakdown.set(data.revenueBreakdown);
      this.costBreakdown.set(data.costBreakdown);
      this.taxReports.set(data.taxReports);
      this.metrics.set(data.metrics);
    } catch (err) {
      this.error.set("Error al cargar reportes financieros");
      console.error("Error loading financial reports:", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ========================================
  // Actions
  // ========================================

  setPeriod(period: string): void {
    this.selectedPeriod.set(period);
    this.loadFinancialData();
  }

  setReportType(type: string): void {
    this.reportType.set(type);
  }

  refreshData(): void {
    this.loadFinancialData();
  }

  exportBalanceSheet(): void {
    console.log("Export balance sheet");
  }

  exportIncomeStatement(): void {
    console.log("Export income statement");
  }

  exportCashFlow(): void {
    console.log("Export cash flow");
  }

  exportToAccounting(): void {
    console.log("Export to accounting software");
  }

  // ========================================
  // Helpers
  // ========================================

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatRatio(value: number): string {
    return value.toFixed(2);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  }

  getTrendIcon(trend: CostBreakdown["trend"]): string {
    const icons: Record<CostBreakdown["trend"], string> = {
      up: "📈",
      down: "📉",
      stable: "➡️",
    };
    return icons[trend];
  }

  getTrendClass(trend: CostBreakdown["trend"]): string {
    const classes: Record<CostBreakdown["trend"], string> = {
      up: "trend-up",
      down: "trend-down",
      stable: "trend-stable",
    };
    return classes[trend];
  }

  getGrowthClass(growth: number): string {
    if (growth > 10) return "growth-high";
    if (growth > 0) return "growth-positive";
    if (growth < -10) return "growth-low";
    return "growth-negative";
  }

  getMetricStatus(
    value: number,
    threshold: number,
    higherIsBetter = true
  ): string {
    if (higherIsBetter) {
      return value >= threshold ? "metric-good" : "metric-bad";
    }
    return value <= threshold ? "metric-good" : "metric-bad";
  }
}
