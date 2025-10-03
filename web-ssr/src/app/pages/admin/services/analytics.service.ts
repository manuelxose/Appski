/**
 * Analytics Service - Nieve Platform
 * Servicio para gestionar analytics, KPIs y Business Intelligence
 * Angular 18+ con Signals
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
// Note: Parameters prefixed with _ are reserved for production API calls

import { Injectable, signal, computed } from "@angular/core";
import type {
  KPIDashboard,
  TimePeriod,
  TimeSeriesChart,
  DonutChart,
  BarChart,
  HeatmapChart,
  CohortRetention,
  ConversionFunnel,
  RFMAnalysis,
  GeographicData,
  TopPerformers,
  AttributionAnalysis,
  AttributionModel,
  ProfitLossStatement,
  CashFlowStatement,
  BalanceSheet,
  DemandForecast,
  YearOverYearComparison,
  AnalyticsFilters,
  CustomDateRange,
} from "../models/analytics.models";

@Injectable({
  providedIn: "root",
})
export class AnalyticsService {
  // ========== PRIVATE SIGNALS (State) ==========

  // KPIs Dashboard
  private readonly _kpiDashboard = signal<KPIDashboard | null>(null);

  // Charts
  private readonly _revenueChart = signal<TimeSeriesChart | null>(null);
  private readonly _usersGrowthChart = signal<TimeSeriesChart | null>(null);
  private readonly _bookingsDistribution = signal<DonutChart | null>(null);
  private readonly _stationsComparison = signal<BarChart | null>(null);
  private readonly _activityHeatmap = signal<HeatmapChart | null>(null);

  // Cohort & Retention
  private readonly _cohortRetention = signal<CohortRetention | null>(null);

  // Conversion Funnel
  private readonly _conversionFunnel = signal<ConversionFunnel | null>(null);

  // RFM Analysis
  private readonly _rfmAnalysis = signal<RFMAnalysis | null>(null);

  // Geographic Data
  private readonly _geographicData = signal<GeographicData | null>(null);

  // Top Performers
  private readonly _topPerformers = signal<TopPerformers | null>(null);

  // Attribution
  private readonly _attribution = signal<AttributionAnalysis | null>(null);

  // Financial Statements
  private readonly _profitLoss = signal<ProfitLossStatement | null>(null);
  private readonly _cashFlow = signal<CashFlowStatement | null>(null);
  private readonly _balanceSheet = signal<BalanceSheet | null>(null);

  // Forecasts
  private readonly _demandForecast = signal<DemandForecast[]>([]);

  // Year over Year
  private readonly _yoyComparison = signal<YearOverYearComparison[]>([]);

  // Filters
  private readonly _currentFilters = signal<AnalyticsFilters>({
    period: "30d",
  });

  // UI State
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ========== PUBLIC COMPUTED (Read-only access) ==========

  // Main KPI Dashboard
  readonly kpiDashboard = this._kpiDashboard.asReadonly();

  // Individual KPI groups (computed from dashboard)
  readonly generalKPIs = computed(() => this._kpiDashboard()?.general ?? null);
  readonly financialKPIs = computed(
    () => this._kpiDashboard()?.financial ?? null
  );
  readonly userKPIs = computed(() => this._kpiDashboard()?.users ?? null);
  readonly bookingKPIs = computed(() => this._kpiDashboard()?.bookings ?? null);
  readonly marketingKPIs = computed(
    () => this._kpiDashboard()?.marketing ?? null
  );

  // Charts
  readonly revenueChart = this._revenueChart.asReadonly();
  readonly usersGrowthChart = this._usersGrowthChart.asReadonly();
  readonly bookingsDistribution = this._bookingsDistribution.asReadonly();
  readonly stationsComparison = this._stationsComparison.asReadonly();
  readonly activityHeatmap = this._activityHeatmap.asReadonly();

  // Analysis
  readonly cohortRetention = this._cohortRetention.asReadonly();
  readonly conversionFunnel = this._conversionFunnel.asReadonly();
  readonly rfmAnalysis = this._rfmAnalysis.asReadonly();
  readonly geographicData = this._geographicData.asReadonly();
  readonly topPerformers = this._topPerformers.asReadonly();
  readonly attribution = this._attribution.asReadonly();

  // Financial
  readonly profitLoss = this._profitLoss.asReadonly();
  readonly cashFlow = this._cashFlow.asReadonly();
  readonly balanceSheet = this._balanceSheet.asReadonly();

  // Forecasts & Comparisons
  readonly demandForecast = this._demandForecast.asReadonly();
  readonly yoyComparison = this._yoyComparison.asReadonly();

  // Filters
  readonly currentFilters = this._currentFilters.asReadonly();

  // UI State
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly errorMessage = this._error.asReadonly();

  // Additional computed properties
  readonly hasKPIData = computed(() => this._kpiDashboard() !== null);
  readonly currentPeriod = computed(
    () => this._kpiDashboard()?.period ?? "30d"
  );
  readonly lastUpdated = computed(() => this._kpiDashboard()?.updatedAt ?? "");

  // ========== KPI DASHBOARD METHODS ==========

  /**
   * Load complete KPI dashboard for all areas
   */
  async loadKPIDashboard(_period: TimePeriod = "30d"): Promise<void> {
    // TODO: En producción, usar period como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/kpi-dashboard.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: KPIDashboard = await response.json();
      this._kpiDashboard.set(data);
    } catch (error) {
      this._error.set("Error al cargar KPI Dashboard");
      console.error("Error loading KPI Dashboard:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load specific KPIs by category
   */
  async loadGeneralKPIs(_period: TimePeriod = "30d"): Promise<void> {
    // TODO: En producción, usar period como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/analytics-general.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      // Update only the general KPIs section
      const current = this._kpiDashboard();
      if (current) {
        this._kpiDashboard.set({
          ...current,
          general: data.general,
        });
      }
    } catch (error) {
      this._error.set("Error al cargar KPIs generales");
      console.error("Error loading general KPIs:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== CHARTS METHODS ==========

  /**
   * Load revenue time series chart
   */
  async loadRevenueChart(_period: TimePeriod = "30d"): Promise<void> {
    // TODO: En producción, usar period como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/charts-revenue-monthly.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: TimeSeriesChart = await response.json();
      this._revenueChart.set(data);
    } catch (error) {
      this._error.set("Error al cargar gráfico de revenue");
      console.error("Error loading revenue chart:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load users growth chart
   */
  async loadUsersGrowthChart(_period: TimePeriod = "30d"): Promise<void> {
    // TODO: En producción, usar period como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/charts-users-growth.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: TimeSeriesChart = await response.json();
      this._usersGrowthChart.set(data);
    } catch (error) {
      this._error.set("Error al cargar gráfico de crecimiento de usuarios");
      console.error("Error loading users growth chart:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load bookings distribution donut chart
   */
  async loadBookingsDistribution(_period: TimePeriod = "30d"): Promise<void> {
    // TODO: En producción, usar period como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/charts-bookings-distribution.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DonutChart = await response.json();
      this._bookingsDistribution.set(data);
    } catch (error) {
      this._error.set("Error al cargar distribución de bookings");
      console.error("Error loading bookings distribution:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load all main charts at once
   */
  async loadAllCharts(period: TimePeriod = "30d"): Promise<void> {
    // Pass period to individual chart loaders
    await Promise.all([
      this.loadRevenueChart(period),
      this.loadUsersGrowthChart(period),
      this.loadBookingsDistribution(period),
    ]);
  }

  // ========== COHORT ANALYSIS METHODS ==========

  /**
   * Load cohort retention analysis
   */
  async loadCohortRetention(
    _periodType: "day" | "week" | "month" = "month"
  ): Promise<void> {
    // TODO: En producción, usar periodType como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/cohort-retention.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: CohortRetention = await response.json();
      this._cohortRetention.set(data);
    } catch (error) {
      this._error.set("Error al cargar análisis de cohortes");
      console.error("Error loading cohort retention:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== CONVERSION FUNNEL METHODS ==========

  /**
   * Load conversion funnel data
   */
  async loadConversionFunnel(_funnelType = "booking"): Promise<void> {
    // TODO: En producción, usar funnelType como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/funnel-conversion.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ConversionFunnel = await response.json();
      this._conversionFunnel.set(data);
    } catch (error) {
      this._error.set("Error al cargar embudo de conversión");
      console.error("Error loading conversion funnel:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== RFM ANALYSIS METHODS ==========

  /**
   * Load RFM (Recency, Frequency, Monetary) analysis
   */
  async loadRFMAnalysis(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/rfm-analysis.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: RFMAnalysis = await response.json();
      this._rfmAnalysis.set(data);
    } catch (error) {
      this._error.set("Error al cargar análisis RFM");
      console.error("Error loading RFM analysis:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== ATTRIBUTION METHODS ==========

  /**
   * Load marketing attribution analysis
   */
  async loadAttribution(
    _model: AttributionModel = "last-click"
  ): Promise<void> {
    // TODO: En producción, usar model como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // In production, model would be a query parameter
      const response = await fetch(
        "/assets/mocks/admin/attribution-analysis.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: AttributionAnalysis = await response.json();
      this._attribution.set(data);
    } catch (error) {
      this._error.set("Error al cargar análisis de atribución");
      console.error("Error loading attribution analysis:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== FINANCIAL STATEMENTS METHODS ==========

  /**
   * Load Profit & Loss Statement
   */
  async loadProfitLoss(_period = "current-month"): Promise<void> {
    // TODO: En producción, usar period como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/p-and-l.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ProfitLossStatement = await response.json();
      this._profitLoss.set(data);
    } catch (error) {
      this._error.set("Error al cargar estado de resultados");
      console.error("Error loading P&L statement:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load Cash Flow Statement
   */
  async loadCashFlow(_period = "current-month"): Promise<void> {
    // TODO: En producción, usar period como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/cash-flow.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: CashFlowStatement = await response.json();
      this._cashFlow.set(data);
    } catch (error) {
      this._error.set("Error al cargar flujo de caja");
      console.error("Error loading cash flow:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load Balance Sheet
   */
  async loadBalanceSheet(_date = "current"): Promise<void> {
    // TODO: En producción, usar date como query parameter
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/balance-sheet.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: BalanceSheet = await response.json();
      this._balanceSheet.set(data);
    } catch (error) {
      this._error.set("Error al cargar balance general");
      console.error("Error loading balance sheet:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load all financial statements at once
   */
  async loadAllFinancialStatements(): Promise<void> {
    await Promise.all([
      this.loadProfitLoss(),
      this.loadCashFlow(),
      this.loadBalanceSheet(),
    ]);
  }

  // ========== FORECAST METHODS ==========

  /**
   * Load demand forecast for stations
   */
  async loadDemandForecast(stationIds?: string[]): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/demand-forecast.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DemandForecast[] = await response.json();

      // Filter by station IDs if provided
      const filteredData =
        stationIds && stationIds.length > 0
          ? data.filter((f) => stationIds.includes(f.stationId))
          : data;

      this._demandForecast.set(filteredData);
    } catch (error) {
      this._error.set("Error al cargar pronóstico de demanda");
      console.error("Error loading demand forecast:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== COMPARISON METHODS ==========

  /**
   * Load Year-over-Year comparison data
   */
  async loadYearOverYearComparison(
    metrics: string[] = ["revenue", "bookings", "users"]
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/yoy-comparison.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: YearOverYearComparison[] = await response.json();

      // Filter by requested metrics
      const filteredData = data.filter((item) => metrics.includes(item.metric));

      this._yoyComparison.set(filteredData);
    } catch (error) {
      this._error.set("Error al cargar comparativa año a año");
      console.error("Error loading YoY comparison:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== FILTER METHODS ==========

  /**
   * Update current analytics filters
   */
  updateFilters(filters: Partial<AnalyticsFilters>): void {
    const current = this._currentFilters();
    this._currentFilters.set({ ...current, ...filters });
  }

  /**
   * Set time period filter
   */
  setTimePeriod(period: TimePeriod, customRange?: CustomDateRange): void {
    this._currentFilters.update((current) => ({
      ...current,
      period,
      customRange: period === "custom" ? customRange : undefined,
    }));
  }

  /**
   * Reset filters to default
   */
  resetFilters(): void {
    this._currentFilters.set({ period: "30d" });
  }

  // ========== COMPREHENSIVE LOAD METHODS ==========

  /**
   * Load all analytics data for General Analytics view
   */
  async loadGeneralAnalytics(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadKPIDashboard(),
        this.loadRevenueChart(),
        this.loadUsersGrowthChart(),
        this.loadBookingsDistribution(),
      ]);
    } catch (error) {
      this._error.set("Error al cargar analytics generales");
      console.error("Error loading general analytics:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load all analytics data for Financial Analytics view
   */
  async loadFinancialAnalytics(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadKPIDashboard(),
        this.loadProfitLoss(),
        this.loadCashFlow(),
        this.loadBalanceSheet(),
        this.loadRevenueChart(),
      ]);
    } catch (error) {
      this._error.set("Error al cargar analytics financieros");
      console.error("Error loading financial analytics:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load all analytics data for Users Analytics view
   */
  async loadUsersAnalytics(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadKPIDashboard(),
        this.loadUsersGrowthChart(),
        this.loadCohortRetention(),
        this.loadRFMAnalysis(),
      ]);
    } catch (error) {
      this._error.set("Error al cargar analytics de usuarios");
      console.error("Error loading users analytics:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load all analytics data for Marketing Analytics view
   */
  async loadMarketingAnalytics(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadKPIDashboard(),
        this.loadConversionFunnel(),
        this.loadAttribution(),
      ]);
    } catch (error) {
      this._error.set("Error al cargar analytics de marketing");
      console.error("Error loading marketing analytics:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== UTILITY METHODS ==========

  /**
   * Clear all analytics data
   */
  clearData(): void {
    this._kpiDashboard.set(null);
    this._revenueChart.set(null);
    this._usersGrowthChart.set(null);
    this._bookingsDistribution.set(null);
    this._stationsComparison.set(null);
    this._activityHeatmap.set(null);
    this._cohortRetention.set(null);
    this._conversionFunnel.set(null);
    this._rfmAnalysis.set(null);
    this._geographicData.set(null);
    this._topPerformers.set(null);
    this._attribution.set(null);
    this._profitLoss.set(null);
    this._cashFlow.set(null);
    this._balanceSheet.set(null);
    this._demandForecast.set([]);
    this._yoyComparison.set([]);
    this._error.set(null);
  }

  /**
   * Refresh all loaded data
   */
  async refresh(): Promise<void> {
    // TODO: En producción, aplicar filtros actuales al recargar
    await this.loadGeneralAnalytics();
  }
}
