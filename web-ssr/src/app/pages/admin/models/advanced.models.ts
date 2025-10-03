/**
 * Advanced Features Models
 * Interfaces para ML, reportes personalizados y API pública
 */

// ============================================
// MACHINE LEARNING & PREDICTIONS
// ============================================

export type PredictionType =
  | "demand_forecast"
  | "price_optimization"
  | "churn_prediction"
  | "anomaly_detection"
  | "sentiment_analysis"
  | "user_segmentation";

export type PredictionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";
export type MLModel =
  | "linear_regression"
  | "random_forest"
  | "neural_network"
  | "gradient_boosting"
  | "clustering";

export interface Prediction {
  id: string;
  type: PredictionType;
  status: PredictionStatus;

  // Input
  entityType?: string; // 'station', 'user', 'booking', etc.
  entityId?: string;
  inputData: unknown;

  // Model
  model: MLModel;
  modelVersion: string;
  confidence: number; // 0-1

  // Output
  prediction: unknown;
  metadata?: PredictionMetadata;

  // Timing
  requestedAt: string;
  processedAt?: string;
  processingTime?: number; // Milliseconds

  // Error
  error?: string;

  // Requestor
  requestedBy?: string;
}

export interface PredictionMetadata {
  features?: string[]; // Features used in prediction
  featureImportance?: FeatureImportance[];
  alternativePredictions?: unknown[]; // Other possible outcomes
  explanation?: string; // Human-readable explanation
}

export interface FeatureImportance {
  feature: string;
  importance: number; // 0-1
}

// Demand Forecast

export interface DemandForecast {
  stationId: string;
  stationName: string;
  period: ForecastPeriod;

  // Predictions
  bookings: ForecastDataPoint[];
  revenue: ForecastDataPoint[];
  occupancy: ForecastDataPoint[];

  // Model info
  model: MLModel;
  confidence: number;
  trainedOn: string; // Date when model was trained

  // Metadata
  generatedAt: string;
  generatedBy?: string;
}

export interface ForecastPeriod {
  startDate: string;
  endDate: string;
  granularity: "day" | "week" | "month";
}

export interface ForecastDataPoint {
  date: string;
  predicted: number;
  lowerBound: number; // Confidence interval lower bound
  upperBound: number; // Confidence interval upper bound
  historical?: number; // Actual value from same period last year
}

// Price Optimization

export interface PriceOptimization {
  entityType: "lodging" | "rental" | "pass";
  entityId: string;
  entityName: string;

  // Current pricing
  currentPrice: number;

  // Recommended pricing
  recommendedPrice: number;
  minPrice: number;
  maxPrice: number;

  // Expected impact
  expectedDemandChange: number; // Percentage
  expectedRevenueChange: number; // Percentage

  // Factors
  factors: PricingFactor[];

  // Confidence
  confidence: number;

  // Metadata
  effectiveFrom: string;
  effectiveUntil: string;
  generatedAt: string;
}

export interface PricingFactor {
  name: string;
  impact: number; // -1 to 1 (negative = decrease price, positive = increase)
  description: string;
}

// Churn Prediction

export interface ChurnPrediction {
  userId: string;
  userName: string;
  userEmail: string;

  // Prediction
  churnProbability: number; // 0-1
  riskLevel: "low" | "medium" | "high" | "critical";

  // Timing
  predictedChurnDate?: string;
  daysUntilChurn?: number;

  // Factors
  riskFactors: ChurnFactor[];

  // Recommendations
  retentionStrategies: RetentionStrategy[];

  // User stats
  lastActivity: string;
  totalSpent: number;
  bookingCount: number;
  daysSinceSignup: number;

  // Metadata
  predictedAt: string;
  model: MLModel;
  confidence: number;
}

export interface ChurnFactor {
  name: string;
  impact: number; // 0-1
  description: string;
}

export interface RetentionStrategy {
  name: string;
  description: string;
  expectedImpact: number; // 0-1 (reduction in churn probability)
  cost: number;
  priority: number; // 1-5
}

// Anomaly Detection

export interface AnomalyDetection {
  id: string;
  type: "booking" | "payment" | "user_behavior" | "system";

  // Anomaly details
  entityType: string;
  entityId: string;
  metric: string; // What metric is anomalous

  // Values
  observedValue: number;
  expectedValue: number;
  deviation: number; // Standard deviations from expected

  // Severity
  severity: "low" | "medium" | "high" | "critical";
  anomalyScore: number; // 0-1

  // Classification
  possibleCauses: string[];
  isFraud: boolean;
  fraudProbability?: number;

  // Actions
  suggestedActions: string[];
  autoBlocked: boolean;

  // Metadata
  detectedAt: string;
  context?: Record<string, unknown>;
}

// Sentiment Analysis

export interface SentimentAnalysis {
  entityType: "review" | "ticket" | "feedback";
  entityId: string;
  text: string;

  // Sentiment
  sentiment: "positive" | "neutral" | "negative";
  score: number; // -1 to 1
  confidence: number; // 0-1

  // Emotions
  emotions?: EmotionScore[];

  // Topics
  topics?: string[];
  keywords?: KeywordScore[];

  // Intent
  intent?: string; // 'complaint', 'praise', 'question', 'request', etc.

  // Metadata
  analyzedAt: string;
  model: string;
}

export interface EmotionScore {
  emotion: "joy" | "anger" | "sadness" | "fear" | "surprise" | "disgust";
  score: number; // 0-1
}

export interface KeywordScore {
  keyword: string;
  frequency: number;
  relevance: number; // 0-1
}

// User Segmentation

export interface UserSegmentation {
  id: string;
  name: string;
  method: "rfm" | "kmeans" | "hierarchical" | "dbscan";

  // Segments
  segments: UserSegment[];

  // Model info
  featuresUsed: string[];
  optimalClusters: number;
  silhouetteScore?: number; // Quality metric

  // Metadata
  totalUsers: number;
  createdAt: string;
  model: MLModel;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;

  // Characteristics
  size: number;
  percentage: number;

  // Metrics
  averageRecency?: number; // Days
  averageFrequency?: number; // Bookings
  averageMonetary?: number; // €

  // Behavior
  characteristics: SegmentCharacteristic[];

  // Value
  lifetimeValue: number;
  churnRate: number;

  // Marketing
  recommendedCampaigns: string[];
  recommendedOffers: string[];
}

export interface SegmentCharacteristic {
  name: string;
  value: string | number;
  description: string;
}

// ============================================
// CUSTOM REPORTS
// ============================================

export type ReportDataSource =
  | "users"
  | "bookings"
  | "payments"
  | "stations"
  | "reviews"
  | "tickets"
  | "analytics";

export type AggregationFunction =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "median";
export type VisualizationType =
  | "table"
  | "line"
  | "bar"
  | "pie"
  | "donut"
  | "area"
  | "scatter";

export interface CustomReport {
  id: string;
  name: string;
  description?: string;

  // Configuration
  dataSource: ReportDataSource;
  metrics: ReportMetric[];
  dimensions: ReportDimension[];
  filters: ReportFilter[];

  // Visualization
  visualizations: ReportVisualization[];

  // Scheduling
  isScheduled: boolean;
  schedule?: ReportSchedule;

  // Sharing
  isPublic: boolean;
  sharedWith?: string[]; // User IDs

  // Metadata
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;

  // Results
  lastResult?: ReportResult;
}

export interface ReportMetric {
  field: string; // e.g., 'revenue', 'bookingCount'
  aggregation: AggregationFunction;
  label?: string;
  format?: "number" | "currency" | "percentage";
}

export interface ReportDimension {
  field: string; // e.g., 'date', 'stationId', 'userType'
  label?: string;
  grouping?: "day" | "week" | "month" | "quarter" | "year"; // For date fields
}

export interface ReportFilter {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "in"
    | "between";
  value: unknown;
}

export interface ReportVisualization {
  id: string;
  type: VisualizationType;
  title?: string;

  // Data mapping
  xAxis?: string; // Dimension field
  yAxis?: string; // Metric field
  groupBy?: string; // For grouped charts

  // Styling
  colors?: string[];
  showLegend?: boolean;
  showDataLabels?: boolean;
}

export interface ReportSchedule {
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  hour: number; // 0-23

  // Distribution
  recipients: string[]; // Email addresses
  format: "pdf" | "excel" | "csv";

  // Status
  isActive: boolean;
  nextRunAt?: string;
}

export interface ReportResult {
  reportId: string;

  // Data
  data: unknown[];
  rowCount: number;

  // Metadata
  generatedAt: string;
  generatedBy?: string;
  executionTime: number; // Milliseconds

  // Files
  pdfUrl?: string;
  excelUrl?: string;
  csvUrl?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string; // 'sales', 'operations', 'marketing', 'financial'

  // Configuration
  dataSource: ReportDataSource;
  defaultMetrics: ReportMetric[];
  defaultDimensions: ReportDimension[];
  defaultFilters?: ReportFilter[];
  defaultVisualizations: ReportVisualization[];

  // Metadata
  isBuiltIn: boolean;
  usageCount: number;
}

// ============================================
// API PORTAL
// ============================================

export type ApiEndpointMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type ApiAuthType = "none" | "api_key" | "oauth" | "jwt";
export type ApiRateLimitType =
  | "per_second"
  | "per_minute"
  | "per_hour"
  | "per_day";

export interface ApiEndpoint {
  id: string;
  path: string; // e.g., '/api/v1/stations'
  method: ApiEndpointMethod;

  // Documentation
  summary: string;
  description: string;
  tags: string[];

  // Authentication
  requiresAuth: boolean;
  authType: ApiAuthType;
  requiredScopes?: string[];

  // Parameters
  pathParameters?: ApiParameter[];
  queryParameters?: ApiParameter[];
  requestBody?: ApiRequestBody;

  // Responses
  responses: ApiResponse[];

  // Rate limiting
  rateLimit?: ApiRateLimit;

  // Versioning
  version: string;
  deprecated: boolean;
  deprecationDate?: string;
  replacedBy?: string; // New endpoint path

  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface ApiParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  default?: unknown;
  example?: unknown;
  enum?: string[]; // Allowed values
  pattern?: string; // Regex pattern
}

export interface ApiRequestBody {
  contentType: string; // 'application/json', 'multipart/form-data', etc.
  schema: unknown; // JSON Schema
  example?: unknown;
}

export interface ApiResponse {
  statusCode: number;
  description: string;
  contentType: string;
  schema?: unknown; // JSON Schema
  example?: unknown;
}

export interface ApiRateLimit {
  type: ApiRateLimitType;
  limit: number;
  burst?: number; // Burst allowance
}

export interface ApiDocumentation {
  title: string;
  version: string;
  description: string;
  baseUrl: string;

  // Authentication
  authTypes: ApiAuthType[];
  authInstructions: string;

  // Endpoints
  endpoints: ApiEndpoint[];

  // Models
  models: ApiModel[];

  // Examples
  examples: ApiExample[];

  // Metadata
  updatedAt: string;
}

export interface ApiModel {
  name: string;
  description: string;
  properties: ApiProperty[];
  example?: unknown;
}

export interface ApiProperty {
  name: string;
  type: string;
  description: string;
  required: boolean;
  format?: string;
  example?: unknown;
}

export interface ApiExample {
  title: string;
  description: string;
  language: "curl" | "javascript" | "python" | "php";
  code: string;
}

export interface DeveloperAccount {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;

  // Company info
  companyName?: string;
  website?: string;

  // Status
  status: "active" | "suspended" | "pending_approval";
  tier: "free" | "basic" | "pro" | "enterprise";

  // API Keys
  apiKeys: string[]; // API Key IDs

  // Usage
  totalRequests: number;
  requestsThisMonth: number;

  // Limits
  monthlyQuota: number;
  rateLimitPerSecond: number;

  // Billing
  billingEmail?: string;
  billingPlan?: string;

  // Metadata
  registeredAt: string;
  approvedAt?: string;
  lastActivityAt?: string;
}

export interface ApiUsageStats {
  developerId: string;

  // Requests
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;

  // Performance
  averageResponseTime: number; // Milliseconds
  p95ResponseTime: number;

  // Errors
  errorRate: number; // Percentage
  errorsByCode: { code: number; count: number }[];

  // Endpoints
  topEndpoints: { path: string; method: string; count: number }[];

  // Time series
  requestsByDay: { date: string; count: number }[];

  // Quota
  quotaUsed: number;
  quotaRemaining: number;
  quotaPercentage: number;
}

export interface ApiChangelogEntry {
  id: string;
  version: string;
  releaseDate: string;

  // Changes
  breaking: ChangeItem[];
  features: ChangeItem[];
  improvements: ChangeItem[];
  bugfixes: ChangeItem[];
  deprecated: ChangeItem[];

  // Metadata
  publishedBy: string;
  publishedAt: string;
}

export interface ChangeItem {
  description: string;
  details?: string;
  affectedEndpoints?: string[];
  migrationGuide?: string;
}

export interface ApiSDK {
  id: string;
  language: "javascript" | "python" | "php" | "ruby" | "java" | "csharp";
  version: string;

  // Download
  packageName: string; // npm package, pip package, etc.
  downloadUrl: string;
  installCommand: string;

  // Documentation
  documentationUrl: string;
  examplesUrl: string;

  // Stats
  downloads: number;

  // Metadata
  releasedAt: string;
  updatedAt: string;
}
