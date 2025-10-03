import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

// Shared Components
import { AdminBreadcrumbsComponent } from "../../shared/admin-breadcrumbs/admin-breadcrumbs.component";
import { AdminStatCardComponent } from "../../shared/admin-stat-card/admin-stat-card.component";
import { AdminLoaderComponent } from "../../shared/admin-loader/admin-loader.component";
import { AdminEmptyStateComponent } from "../../shared/admin-empty-state/admin-empty-state.component";

// Types
export interface FinancialKPIs {
  totalRevenue: MetricValue;
  totalExpenses: MetricValue;
  netProfit: MetricValue;
  profitMargin: MetricValue;
  ebitda: MetricValue;
  operatingCashFlow: MetricValue;
}

export interface MetricValue {
  current: number;
  previous: number;
  budget: number;
  change: number;
  changePercent: number;
  budgetVariance: number;
  budgetVariancePercent: number;
  trend: "up" | "down" | "neutral";
}

export interface PLLineItem {
  category: string;
  subcategory?: string;
  actual: number;
  budget: number;
  variance: number;
  variancePercent: number;
  lastYear: number;
  yoyChange: number;
}

export interface CashFlowData {
  month: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
  percentage: number;
  budget: number;
  variance: number;
  color: string;
}

export interface RevenueStream {
  stream: string;
  amount: number;
  percentage: number;
  growth: number;
  color: string;
}

export interface FinancialRatio {
  name: string;
  value: number;
  benchmark: number;
  status: "good" | "warning" | "critical";
  description: string;
}

export interface BudgetComparison {
  category: string;
  actual: number;
  budget: number;
  variance: number;
  variancePercent: number;
}

export type PeriodFilter = "month" | "quarter" | "ytd" | "year";
export type ViewMode = "summary" | "detailed" | "variance";

@Component({
  selector: "app-admin-analytics-financial",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminBreadcrumbsComponent,
    AdminStatCardComponent,
    AdminLoaderComponent,
    AdminEmptyStateComponent,
  ],
  templateUrl: "./admin-analytics-financial.component.html",
  styleUrls: ["./admin-analytics-financial.component.css"],
})
export class AdminAnalyticsFinancialComponent implements OnInit {
  // State signals
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Financial metrics
  kpis = signal<FinancialKPIs>({
    totalRevenue: {
      current: 0,
      previous: 0,
      budget: 0,
      change: 0,
      changePercent: 0,
      budgetVariance: 0,
      budgetVariancePercent: 0,
      trend: "neutral",
    },
    totalExpenses: {
      current: 0,
      previous: 0,
      budget: 0,
      change: 0,
      changePercent: 0,
      budgetVariance: 0,
      budgetVariancePercent: 0,
      trend: "neutral",
    },
    netProfit: {
      current: 0,
      previous: 0,
      budget: 0,
      change: 0,
      changePercent: 0,
      budgetVariance: 0,
      budgetVariancePercent: 0,
      trend: "neutral",
    },
    profitMargin: {
      current: 0,
      previous: 0,
      budget: 0,
      change: 0,
      changePercent: 0,
      budgetVariance: 0,
      budgetVariancePercent: 0,
      trend: "neutral",
    },
    ebitda: {
      current: 0,
      previous: 0,
      budget: 0,
      change: 0,
      changePercent: 0,
      budgetVariance: 0,
      budgetVariancePercent: 0,
      trend: "neutral",
    },
    operatingCashFlow: {
      current: 0,
      previous: 0,
      budget: 0,
      change: 0,
      changePercent: 0,
      budgetVariance: 0,
      budgetVariancePercent: 0,
      trend: "neutral",
    },
  });

  // P&L Statement
  plStatement = signal<PLLineItem[]>([]);

  // Cash Flow
  cashFlowData = signal<CashFlowData[]>([]);

  // Expense breakdown
  expenseCategories = signal<ExpenseCategory[]>([]);

  // Revenue streams
  revenueStreams = signal<RevenueStream[]>([]);

  // Financial ratios
  financialRatios = signal<FinancialRatio[]>([]);

  // Budget comparison
  budgetComparison = signal<BudgetComparison[]>([]);

  // Filters
  periodFilter = signal<PeriodFilter>("month");
  viewMode = signal<ViewMode>("summary");
  showBudgetComparison = signal(true);
  showYoYComparison = signal(true);

  // Breadcrumbs
  breadcrumbs = [
    { label: "Dashboard", url: "/admin/dashboard" },
    { label: "Analytics", url: "/admin/analytics" },
    { label: "Financiero", url: "/admin/analytics/financial" },
  ];

  // Computed values
  totalRevenueFormatted = computed(() =>
    this.formatCurrency(this.kpis().totalRevenue.current)
  );

  totalExpensesFormatted = computed(() =>
    this.formatCurrency(this.kpis().totalExpenses.current)
  );

  netProfitFormatted = computed(() =>
    this.formatCurrency(this.kpis().netProfit.current)
  );

  profitMarginFormatted = computed(
    () => `${this.kpis().profitMargin.current.toFixed(1)}%`
  );

  revenueVsBudget = computed(() => {
    const kpi = this.kpis().totalRevenue;
    const variance = kpi.current - kpi.budget;
    const percent = ((variance / kpi.budget) * 100).toFixed(1);
    return {
      variance,
      percent: parseFloat(percent),
      isPositive: variance >= 0,
    };
  });

  expensesVsBudget = computed(() => {
    const kpi = this.kpis().totalExpenses;
    const variance = kpi.current - kpi.budget;
    const percent = ((variance / kpi.budget) * 100).toFixed(1);
    return {
      variance,
      percent: parseFloat(percent),
      isPositive: variance <= 0, // Lower expenses is positive
    };
  });

  ngOnInit(): void {
    this.loadFinancialData();
  }

  async loadFinancialData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [kpis, plStatement, cashFlow, expenses, revenue, ratios, budget] =
        await Promise.all([
          fetch("/assets/mocks/financial-kpis.json").then((r) => r.json()),
          fetch("/assets/mocks/pl-statement.json").then((r) => r.json()),
          fetch("/assets/mocks/cash-flow.json").then((r) => r.json()),
          fetch("/assets/mocks/expense-breakdown.json").then((r) => r.json()),
          fetch("/assets/mocks/revenue-streams.json").then((r) => r.json()),
          fetch("/assets/mocks/financial-ratios.json").then((r) => r.json()),
          fetch("/assets/mocks/budget-comparison.json").then((r) => r.json()),
        ]);

      this.kpis.set(kpis);
      this.plStatement.set(plStatement.items || []);
      this.cashFlowData.set(cashFlow.data || []);
      this.expenseCategories.set(expenses.categories || []);
      this.revenueStreams.set(revenue.streams || []);
      this.financialRatios.set(ratios.ratios || []);
      this.budgetComparison.set(budget.items || []);
    } catch (err) {
      this.error.set("Error al cargar los datos financieros");
      console.error("Error loading financial data:", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  setPeriodFilter(period: PeriodFilter): void {
    this.periodFilter.set(period);
    this.loadFinancialData();
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  toggleBudgetComparison(): void {
    this.showBudgetComparison.set(!this.showBudgetComparison());
  }

  toggleYoYComparison(): void {
    this.showYoYComparison.set(!this.showYoYComparison());
  }

  // P&L calculations
  calculateGrossProfit(): number {
    const revenue = this.plStatement().find((item) =>
      item.category.includes("Revenue")
    );
    const cogs = this.plStatement().find((item) =>
      item.category.includes("COGS")
    );
    return (revenue?.actual || 0) - (cogs?.actual || 0);
  }

  calculateOperatingIncome(): number {
    const grossProfit = this.calculateGrossProfit();
    const opex = this.plStatement()
      .filter((item) => item.category.includes("Operating"))
      .reduce((sum, item) => sum + item.actual, 0);
    return grossProfit - opex;
  }

  // Cash flow calculations
  getTotalCashFlow(): number {
    return this.cashFlowData().reduce(
      (sum, month) => sum + month.netCashFlow,
      0
    );
  }

  getAverageMonthlyCashFlow(): number {
    const data = this.cashFlowData();
    if (data.length === 0) return 0;
    return this.getTotalCashFlow() / data.length;
  }

  // Expense analysis
  getLargestExpenseCategory(): ExpenseCategory | undefined {
    return this.expenseCategories().reduce((max, cat) =>
      cat.amount > (max?.amount || 0) ? cat : max
    );
  }

  getExpenseOverBudget(): ExpenseCategory[] {
    return this.expenseCategories().filter((cat) => cat.variance > 0);
  }

  // Revenue analysis
  getTopRevenueStream(): RevenueStream | undefined {
    return this.revenueStreams().reduce((max, stream) =>
      stream.amount > (max?.amount || 0) ? stream : max
    );
  }

  getFastestGrowingStream(): RevenueStream | undefined {
    return this.revenueStreams().reduce((max, stream) =>
      stream.growth > (max?.growth || 0) ? stream : max
    );
  }

  // Financial ratios analysis
  getCriticalRatios(): FinancialRatio[] {
    return this.financialRatios().filter(
      (ratio) => ratio.status === "critical"
    );
  }

  getWarningRatios(): FinancialRatio[] {
    return this.financialRatios().filter((ratio) => ratio.status === "warning");
  }

  // Budget variance analysis
  getLargestBudgetVariance(): BudgetComparison | undefined {
    return this.budgetComparison().reduce((max, item) =>
      Math.abs(item.variancePercent) > Math.abs(max?.variancePercent || 0)
        ? item
        : max
    );
  }

  // Export functionality
  exportFinancialReport(format: "csv" | "excel" | "pdf"): void {
    console.log(`Exporting financial report as ${format}...`);

    const data = {
      kpis: this.kpis(),
      plStatement: this.plStatement(),
      cashFlow: this.cashFlowData(),
      expenses: this.expenseCategories(),
      revenue: this.revenueStreams(),
      ratios: this.financialRatios(),
      budget: this.budgetComparison(),
      exportDate: new Date().toISOString(),
      period: this.periodFilter(),
      format,
    };

    // Simulate export
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report-${new Date().toISOString()}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  refreshData(): void {
    this.loadFinancialData();
  }

  // Formatting helpers
  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  absValue(value: number): number {
    return Math.abs(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat("es-ES").format(value);
  }

  formatPercent(value: number): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  }

  formatCompactCurrency(value: number): string {
    if (value >= 1000000) {
      return `€${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `€${(value / 1000).toFixed(1)}K`;
    }
    return this.formatCurrency(value);
  }

  getTrendIcon(trend: "up" | "down" | "neutral"): string {
    switch (trend) {
      case "up":
        return "📈";
      case "down":
        return "📉";
      default:
        return "➡️";
    }
  }

  getTrendClass(trend: "up" | "down" | "neutral"): string {
    switch (trend) {
      case "up":
        return "trend-up";
      case "down":
        return "trend-down";
      default:
        return "trend-neutral";
    }
  }

  getVarianceClass(variance: number, isExpense = false): string {
    // For expenses, negative variance is good (under budget)
    // For revenue, positive variance is good (over budget)
    const isPositive = isExpense ? variance < 0 : variance > 0;
    return isPositive ? "variance-positive" : "variance-negative";
  }

  getRatioStatusIcon(status: "good" | "warning" | "critical"): string {
    switch (status) {
      case "good":
        return "✅";
      case "warning":
        return "⚠️";
      case "critical":
        return "❌";
    }
  }

  getRatioStatusClass(status: "good" | "warning" | "critical"): string {
    return `ratio-${status}`;
  }
}
