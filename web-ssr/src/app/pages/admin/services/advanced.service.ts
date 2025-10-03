import { Injectable, signal, computed } from "@angular/core";
import type {
  Prediction,
  DemandForecast,
  PriceOptimization,
  ChurnPrediction,
  AnomalyDetection,
  SentimentAnalysis,
  UserSegmentation,
  CustomReport,
  ReportResult,
  ReportTemplate,
  ReportMetric,
  ReportDimension,
  ReportFilter,
  ApiEndpoint,
  ApiDocumentation,
  DeveloperAccount,
  ApiUsageStats,
  ApiChangelogEntry,
  ApiSDK,
  PredictionType,
  MLModel,
} from "../models/advanced.models";

/**
 * Advanced Features Service
 * Machine Learning, Custom Reports, API Portal
 *
 * Features:
 * - ML Predictions (demand, pricing, churn, anomalies, sentiment)
 * - User Segmentation (RFM, clustering)
 * - Custom Report Builder
 * - Public API Documentation & Portal
 * - Developer Accounts & API Keys
 */
@Injectable({
  providedIn: "root",
})
export class AdvancedService {
  // ============================================
  // STATE: MACHINE LEARNING
  // ============================================

  private readonly _predictions = signal<Prediction[]>([]);
  private readonly _demandForecasts = signal<DemandForecast[]>([]);
  private readonly _priceOptimizations = signal<PriceOptimization[]>([]);
  private readonly _churnPredictions = signal<ChurnPrediction[]>([]);
  private readonly _anomalies = signal<AnomalyDetection[]>([]);
  private readonly _sentimentAnalyses = signal<SentimentAnalysis[]>([]);
  private readonly _userSegmentations = signal<UserSegmentation[]>([]);

  readonly predictions = this._predictions.asReadonly();
  readonly demandForecasts = this._demandForecasts.asReadonly();
  readonly priceOptimizations = this._priceOptimizations.asReadonly();
  readonly churnPredictions = this._churnPredictions.asReadonly();
  readonly anomalies = this._anomalies.asReadonly();
  readonly sentimentAnalyses = this._sentimentAnalyses.asReadonly();
  readonly userSegmentations = this._userSegmentations.asReadonly();

  // Computed: Recent predictions
  readonly recentPredictions = computed(() =>
    this._predictions()
      .sort(
        (a, b) =>
          new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
      )
      .slice(0, 20)
  );

  // Computed: High-risk churn users
  readonly highRiskChurn = computed(() =>
    this._churnPredictions().filter((c) => c.riskLevel === "critical")
  );

  // Computed: Critical anomalies
  readonly criticalAnomalies = computed(() =>
    this._anomalies().filter((a) => a.severity === "critical")
  );

  // ============================================
  // STATE: CUSTOM REPORTS
  // ============================================

  private readonly _customReports = signal<CustomReport[]>([]);
  private readonly _reportTemplates = signal<ReportTemplate[]>([]);
  private readonly _selectedReport = signal<CustomReport | null>(null);
  private readonly _reportResult = signal<ReportResult | null>(null);

  readonly customReports = this._customReports.asReadonly();
  readonly reportTemplates = this._reportTemplates.asReadonly();
  readonly selectedReport = this._selectedReport.asReadonly();
  readonly reportResult = this._reportResult.asReadonly();

  // Computed: Scheduled reports
  readonly scheduledReports = computed(() =>
    this._customReports().filter((r) => r.isScheduled)
  );

  // Computed: My reports
  readonly myReports = computed(() =>
    this._customReports().filter((r) => r.createdBy === "current-user-id")
  );

  // ============================================
  // STATE: API PORTAL
  // ============================================

  private readonly _apiDocumentation = signal<ApiDocumentation | null>(null);
  private readonly _apiEndpoints = signal<ApiEndpoint[]>([]);
  private readonly _developerAccounts = signal<DeveloperAccount[]>([]);
  private readonly _apiUsageStats = signal<ApiUsageStats | null>(null);
  private readonly _apiChangelog = signal<ApiChangelogEntry[]>([]);
  private readonly _apiSDKs = signal<ApiSDK[]>([]);

  readonly apiDocumentation = this._apiDocumentation.asReadonly();
  readonly apiEndpoints = this._apiEndpoints.asReadonly();
  readonly developerAccounts = this._developerAccounts.asReadonly();
  readonly apiUsageStats = this._apiUsageStats.asReadonly();
  readonly apiChangelog = this._apiChangelog.asReadonly();
  readonly apiSDKs = this._apiSDKs.asReadonly();

  // Computed: Active developers
  readonly activeDevelopers = computed(() =>
    this._developerAccounts().filter((d) => d.status === "active")
  );

  // Computed: Public endpoints
  readonly publicEndpoints = computed(() =>
    this._apiEndpoints().filter((e) => !e.requiresAuth)
  );

  // ============================================
  // STATE: UI
  // ============================================

  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  // ============================================
  // MACHINE LEARNING: PREDICTIONS
  // ============================================

  /**
   * Load all predictions
   */
  async loadPredictions(): Promise<void> {
    this._isLoading.set(true);

    try {
      const response = await fetch("/assets/mocks/admin/ml-predictions.json");
      const data = await response.json();
      this._predictions.set(data);
    } catch (error) {
      this._error.set("Error al cargar predicciones");
      console.error("Error loading predictions:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Run ML prediction
   */
  async runPrediction(
    type: PredictionType,
    inputData: unknown,
    model?: MLModel
  ): Promise<Prediction> {
    this._isLoading.set(true);

    try {
      // TODO: In production, call ML service
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const newPrediction: Prediction = {
        id: `pred-${Date.now()}`,
        type,
        status: "completed",
        inputData,
        model: model || "random_forest",
        modelVersion: "1.0.0",
        confidence: 0.85,
        prediction: { result: "sample_prediction" },
        requestedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        processingTime: 2000,
      };

      this._predictions.update((preds) => [newPrediction, ...preds]);
      return newPrediction;
    } catch (error) {
      this._error.set("Error al ejecutar predicción");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load demand forecasts
   */
  async loadDemandForecasts(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/demand-forecasts.json");
      const data = await response.json();
      this._demandForecasts.set(data);
    } catch (error) {
      console.error("Error loading demand forecasts:", error);
    }
  }

  /**
   * Generate demand forecast for station
   */
  async generateDemandForecast(
    stationId: string,
    startDate: string,
    endDate: string,
    granularity: "day" | "week" | "month"
  ): Promise<DemandForecast> {
    this._isLoading.set(true);

    try {
      // TODO: In production, call ML forecasting service
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const newForecast: DemandForecast = {
        stationId,
        stationName: "Station Name",
        period: { startDate, endDate, granularity },
        bookings: [],
        revenue: [],
        occupancy: [],
        model: "neural_network",
        confidence: 0.82,
        trainedOn: new Date().toISOString(),
        generatedAt: new Date().toISOString(),
      };

      this._demandForecasts.update((forecasts) => [newForecast, ...forecasts]);
      return newForecast;
    } catch (error) {
      this._error.set("Error al generar forecast");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load price optimizations
   */
  async loadPriceOptimizations(): Promise<void> {
    try {
      const response = await fetch(
        "/assets/mocks/admin/price-optimizations.json"
      );
      const data = await response.json();
      this._priceOptimizations.set(data);
    } catch (error) {
      console.error("Error loading price optimizations:", error);
    }
  }

  /**
   * Generate price optimization recommendation
   */
  async generatePriceOptimization(
    entityType: "lodging" | "rental" | "pass",
    entityId: string
  ): Promise<PriceOptimization> {
    this._isLoading.set(true);

    try {
      // TODO: In production, call pricing ML service
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const optimization: PriceOptimization = {
        entityType,
        entityId,
        entityName: "Entity Name",
        currentPrice: 100,
        recommendedPrice: 115,
        minPrice: 90,
        maxPrice: 130,
        expectedDemandChange: 5.5,
        expectedRevenueChange: 12.3,
        factors: [],
        confidence: 0.78,
        effectiveFrom: new Date().toISOString(),
        effectiveUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        generatedAt: new Date().toISOString(),
      };

      this._priceOptimizations.update((opts) => [optimization, ...opts]);
      return optimization;
    } catch (error) {
      this._error.set("Error al generar optimización de precio");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load churn predictions
   */
  async loadChurnPredictions(): Promise<void> {
    try {
      const response = await fetch(
        "/assets/mocks/admin/churn-predictions.json"
      );
      const data = await response.json();
      this._churnPredictions.set(data);
    } catch (error) {
      console.error("Error loading churn predictions:", error);
    }
  }

  /**
   * Detect churn risk for user
   */
  async detectChurn(userId: string): Promise<ChurnPrediction> {
    this._isLoading.set(true);

    try {
      // TODO: In production, call churn detection ML service
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const churnPrediction: ChurnPrediction = {
        userId,
        userName: "User Name",
        userEmail: "user@example.com",
        churnProbability: 0.65,
        riskLevel: "high",
        riskFactors: [],
        retentionStrategies: [],
        lastActivity: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        totalSpent: 1250,
        bookingCount: 8,
        daysSinceSignup: 365,
        predictedAt: new Date().toISOString(),
        model: "gradient_boosting",
        confidence: 0.88,
      };

      this._churnPredictions.update((churns) => [churnPrediction, ...churns]);
      return churnPrediction;
    } catch (error) {
      this._error.set("Error al detectar riesgo de churn");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load anomaly detections
   */
  async loadAnomalies(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/anomalies.json");
      const data = await response.json();
      this._anomalies.set(data);
    } catch (error) {
      console.error("Error loading anomalies:", error);
    }
  }

  /**
   * Load sentiment analyses
   */
  async loadSentimentAnalyses(): Promise<void> {
    try {
      const response = await fetch(
        "/assets/mocks/admin/sentiment-analyses.json"
      );
      const data = await response.json();
      this._sentimentAnalyses.set(data);
    } catch (error) {
      console.error("Error loading sentiment analyses:", error);
    }
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(
    entityType: "review" | "ticket" | "feedback",
    entityId: string,
    text: string
  ): Promise<SentimentAnalysis> {
    try {
      // TODO: In production, call sentiment analysis service
      await new Promise((resolve) => setTimeout(resolve, 500));

      const analysis: SentimentAnalysis = {
        entityType,
        entityId,
        text,
        sentiment: "positive",
        score: 0.75,
        confidence: 0.92,
        analyzedAt: new Date().toISOString(),
        model: "bert",
      };

      this._sentimentAnalyses.update((analyses) => [analysis, ...analyses]);
      return analysis;
    } catch (error) {
      this._error.set("Error al analizar sentimiento");
      throw error;
    }
  }

  /**
   * Load user segmentations
   */
  async loadUserSegmentations(): Promise<void> {
    try {
      const response = await fetch(
        "/assets/mocks/admin/user-segmentations.json"
      );
      const data = await response.json();
      this._userSegmentations.set(data);
    } catch (error) {
      console.error("Error loading user segmentations:", error);
    }
  }

  /**
   * Create user segmentation
   */
  async createSegmentation(
    name: string,
    method: "rfm" | "kmeans" | "hierarchical" | "dbscan",
    features: string[]
  ): Promise<UserSegmentation> {
    this._isLoading.set(true);

    try {
      // TODO: In production, call clustering ML service
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const segmentation: UserSegmentation = {
        id: `seg-${Date.now()}`,
        name,
        method,
        segments: [],
        featuresUsed: features,
        optimalClusters: 5,
        silhouetteScore: 0.65,
        totalUsers: 10000,
        createdAt: new Date().toISOString(),
        model: "clustering",
      };

      this._userSegmentations.update((segs) => [segmentation, ...segs]);
      return segmentation;
    } catch (error) {
      this._error.set("Error al crear segmentación");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  // ============================================
  // CUSTOM REPORTS
  // ============================================

  /**
   * Load all custom reports
   */
  async loadCustomReports(): Promise<void> {
    this._isLoading.set(true);

    try {
      const response = await fetch("/assets/mocks/admin/custom-reports.json");
      const data = await response.json();
      this._customReports.set(data);
    } catch (error) {
      this._error.set("Error al cargar reportes");
      console.error("Error loading custom reports:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load report templates
   */
  async loadReportTemplates(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/report-templates.json");
      const data = await response.json();
      this._reportTemplates.set(data);
    } catch (error) {
      console.error("Error loading report templates:", error);
    }
  }

  /**
   * Create custom report
   */
  async createCustomReport(
    name: string,
    description: string,
    dataSource: CustomReport["dataSource"],
    metrics: ReportMetric[],
    dimensions: ReportDimension[],
    filters?: ReportFilter[]
  ): Promise<CustomReport> {
    try {
      const newReport: CustomReport = {
        id: `report-${Date.now()}`,
        name,
        description,
        dataSource,
        metrics,
        dimensions,
        filters: filters || [],
        visualizations: [],
        isScheduled: false,
        isPublic: false,
        createdBy: "current-user-id",
        createdByName: "Current User",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this._customReports.update((reports) => [newReport, ...reports]);
      return newReport;
    } catch (error) {
      this._error.set("Error al crear reporte");
      throw error;
    }
  }

  /**
   * Update custom report
   */
  async updateCustomReport(
    reportId: string,
    updates: Partial<CustomReport>
  ): Promise<void> {
    try {
      this._customReports.update((reports) =>
        reports.map((r) =>
          r.id === reportId
            ? { ...r, ...updates, updatedAt: new Date().toISOString() }
            : r
        )
      );
    } catch (error) {
      this._error.set("Error al actualizar reporte");
      console.error("Error updating report:", error);
    }
  }

  /**
   * Delete custom report
   */
  async deleteCustomReport(reportId: string): Promise<void> {
    try {
      this._customReports.update((reports) =>
        reports.filter((r) => r.id !== reportId)
      );
    } catch (error) {
      this._error.set("Error al eliminar reporte");
      console.error("Error deleting report:", error);
    }
  }

  /**
   * Run custom report
   */
  async runCustomReport(reportId: string): Promise<ReportResult> {
    this._isLoading.set(true);

    try {
      // TODO: In production, execute report query
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const result: ReportResult = {
        reportId,
        data: [],
        rowCount: 0,
        generatedAt: new Date().toISOString(),
        generatedBy: "current-user-id",
        executionTime: 3000,
      };

      this._reportResult.set(result);

      // Update report with last run time
      this._customReports.update((reports) =>
        reports.map((r) =>
          r.id === reportId
            ? { ...r, lastRunAt: new Date().toISOString(), lastResult: result }
            : r
        )
      );

      return result;
    } catch (error) {
      this._error.set("Error al ejecutar reporte");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Export report to PDF
   */
  async exportReportPDF(reportId: string): Promise<string> {
    this._isLoading.set(true);

    try {
      // TODO: In production, generate PDF
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const pdfUrl = `/reports/${reportId}.pdf`;
      return pdfUrl;
    } catch (error) {
      this._error.set("Error al exportar PDF");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Export report to Excel
   */
  async exportReportExcel(reportId: string): Promise<string> {
    this._isLoading.set(true);

    try {
      // TODO: In production, generate Excel
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const excelUrl = `/reports/${reportId}.xlsx`;
      return excelUrl;
    } catch (error) {
      this._error.set("Error al exportar Excel");
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Schedule report
   */
  async scheduleReport(
    reportId: string,
    schedule: CustomReport["schedule"]
  ): Promise<void> {
    try {
      this._customReports.update((reports) =>
        reports.map((r) =>
          r.id === reportId
            ? {
                ...r,
                isScheduled: true,
                schedule,
                updatedAt: new Date().toISOString(),
              }
            : r
        )
      );
    } catch (error) {
      this._error.set("Error al programar reporte");
      console.error("Error scheduling report:", error);
    }
  }

  // ============================================
  // API PORTAL
  // ============================================

  /**
   * Load API documentation
   */
  async loadApiDocumentation(): Promise<void> {
    this._isLoading.set(true);

    try {
      const response = await fetch(
        "/assets/mocks/admin/api-documentation.json"
      );
      const data = await response.json();
      this._apiDocumentation.set(data);
      if (data.endpoints) {
        this._apiEndpoints.set(data.endpoints);
      }
    } catch (error) {
      this._error.set("Error al cargar documentación API");
      console.error("Error loading API documentation:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load developer accounts
   */
  async loadDeveloperAccounts(): Promise<void> {
    try {
      const response = await fetch(
        "/assets/mocks/admin/developer-accounts.json"
      );
      const data = await response.json();
      this._developerAccounts.set(data);
    } catch (error) {
      console.error("Error loading developer accounts:", error);
    }
  }

  /**
   * Create developer account
   */
  async createDeveloperAccount(
    userId: string,
    companyName?: string
  ): Promise<DeveloperAccount> {
    try {
      const newAccount: DeveloperAccount = {
        id: `dev-${Date.now()}`,
        userId,
        userName: "User Name",
        userEmail: "user@example.com",
        companyName,
        status: "pending_approval",
        tier: "free",
        apiKeys: [],
        totalRequests: 0,
        requestsThisMonth: 0,
        monthlyQuota: 1000,
        rateLimitPerSecond: 1,
        registeredAt: new Date().toISOString(),
      };

      this._developerAccounts.update((accounts) => [newAccount, ...accounts]);
      return newAccount;
    } catch (error) {
      this._error.set("Error al crear cuenta de desarrollador");
      throw error;
    }
  }

  /**
   * Approve developer account
   */
  async approveDeveloperAccount(accountId: string): Promise<void> {
    try {
      this._developerAccounts.update((accounts) =>
        accounts.map((a) =>
          a.id === accountId
            ? {
                ...a,
                status: "active",
                approvedAt: new Date().toISOString(),
              }
            : a
        )
      );
    } catch (error) {
      this._error.set("Error al aprobar cuenta");
      console.error("Error approving developer account:", error);
    }
  }

  /**
   * Suspend developer account
   */
  async suspendDeveloperAccount(accountId: string): Promise<void> {
    try {
      this._developerAccounts.update((accounts) =>
        accounts.map((a) =>
          a.id === accountId ? { ...a, status: "suspended" } : a
        )
      );
    } catch (error) {
      this._error.set("Error al suspender cuenta");
      console.error("Error suspending developer account:", error);
    }
  }

  /**
   * Load API usage statistics
   */
  async loadApiUsageStats(developerId: string): Promise<void> {
    try {
      const response = await fetch(
        `/assets/mocks/admin/api-usage-${developerId}.json`
      );
      const data = await response.json();
      this._apiUsageStats.set(data);
    } catch (error) {
      console.error("Error loading API usage stats:", error);
    }
  }

  /**
   * Load API changelog
   */
  async loadApiChangelog(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/api-changelog.json");
      const data = await response.json();
      this._apiChangelog.set(data);
    } catch (error) {
      console.error("Error loading API changelog:", error);
    }
  }

  /**
   * Publish API changelog entry
   */
  async publishChangelogEntry(
    entry: Omit<ApiChangelogEntry, "id" | "publishedBy" | "publishedAt">
  ): Promise<ApiChangelogEntry> {
    try {
      const newEntry: ApiChangelogEntry = {
        ...entry,
        id: `changelog-${Date.now()}`,
        publishedBy: "current-user-id",
        publishedAt: new Date().toISOString(),
      };

      this._apiChangelog.update((changelog) => [newEntry, ...changelog]);
      return newEntry;
    } catch (error) {
      this._error.set("Error al publicar changelog");
      throw error;
    }
  }

  /**
   * Load API SDKs
   */
  async loadApiSDKs(): Promise<void> {
    try {
      const response = await fetch("/assets/mocks/admin/api-sdks.json");
      const data = await response.json();
      this._apiSDKs.set(data);
    } catch (error) {
      console.error("Error loading API SDKs:", error);
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Clear all advanced data
   */
  clearAll(): void {
    this._predictions.set([]);
    this._demandForecasts.set([]);
    this._priceOptimizations.set([]);
    this._churnPredictions.set([]);
    this._anomalies.set([]);
    this._sentimentAnalyses.set([]);
    this._userSegmentations.set([]);

    this._customReports.set([]);
    this._reportTemplates.set([]);
    this._selectedReport.set(null);
    this._reportResult.set(null);

    this._apiDocumentation.set(null);
    this._apiEndpoints.set([]);
    this._developerAccounts.set([]);
    this._apiUsageStats.set(null);
    this._apiChangelog.set([]);
    this._apiSDKs.set([]);

    this._error.set(null);
  }

  /**
   * Refresh all advanced data
   */
  async refreshAll(): Promise<void> {
    await Promise.all([
      this.loadPredictions(),
      this.loadDemandForecasts(),
      this.loadPriceOptimizations(),
      this.loadChurnPredictions(),
      this.loadAnomalies(),
      this.loadSentimentAnalyses(),
      this.loadUserSegmentations(),
      this.loadCustomReports(),
      this.loadReportTemplates(),
      this.loadApiDocumentation(),
      this.loadDeveloperAccounts(),
      this.loadApiChangelog(),
      this.loadApiSDKs(),
    ]);
  }
}
