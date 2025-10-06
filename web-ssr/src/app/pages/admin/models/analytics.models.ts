/**
 * Analytics & Business Intelligence Models
 * Interfaces para métricas, KPIs, gráficos y análisis de datos
 */

// ============================================
// GENERAL ANALYTICS
// ============================================

export interface KPIDashboard {
  general: GeneralKPIs;
  financial: FinancialKPIs;
  users: UserKPIs;
  bookings: BookingKPIs;
  marketing: MarketingKPIs;
  period: TimePeriod;
  updatedAt: string;
}

export interface GeneralKPIs {
  totalUsers: number;
  activeUsers: number;
  totalBookings: number;
  totalRevenue: number;
  conversionRate: number;
  averageTicket: number;
  trends: {
    users: number;
    bookings: number;
    revenue: number;
    conversion: number;
  };
}

export interface FinancialKPIs {
  totalPayments: number;
  pendingPayments: number;
  refundedAmount: number;
  netRevenue: number;
  commissionRate: number;
  totalCommissions: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  trends: {
    payments: number;
    refunds: number;
    revenue: number;
    commissions: number;
  };
}

export interface UserKPIs {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  newUsersToday: number;
  usersByRole: {
    admin: number;
    manager: number;
    user: number;
  };
  usersByStatus: {
    active: number;
    inactive: number;
    suspended: number;
  };
  trends: {
    total: number;
    active: number;
    new: number;
  };
}

export interface BookingKPIs {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  averageBookingValue: number;
  bookingsByService: {
    skipass: number;
    class: number;
    equipment: number;
    package: number;
  };
  bookingsByStatus: {
    pending: number;
    confirmed: number;
    cancelled: number;
    completed: number;
  };
  trends: {
    total: number;
    confirmed: number;
    cancelled: number;
    revenue: number;
  };
}

export interface MarketingKPIs {
  impressions: number;
  clicks: number;
  ctr: number; // Click-through rate
  conversions: number;
  conversionRate: number;
  cpa: number; // Cost per acquisition
  roi: number; // Return on investment
  adSpend: number;
  revenue: number;
  trends: {
    impressions: number;
    ctr: number;
    conversions: number;
    roi: number;
  };
}

export interface MetricWithChange {
  value: number;
  previousValue: number;
  change: number; // Percentage change
  trend: "up" | "down" | "stable";
  target?: number; // Optional target/goal
}

export type TimePeriod = "today" | "7d" | "30d" | "90d" | "year" | "custom";

export interface CustomDateRange {
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
}

// ============================================
// CHARTS DATA
// ============================================

export interface TimeSeriesChart {
  id: string;
  title: string;
  type: "line" | "area" | "bar" | "column";
  datasets: ChartDataset[];
  labels: string[]; // X-axis labels (dates, months, etc.)
  yAxisLabel?: string;
  xAxisLabel?: string;
}

export interface ChartDataset {
  name: string;
  data: number[];
  color?: string;
  borderColor?: string;
  backgroundColor?: string;
  fill?: boolean;
}

export interface DonutChart {
  id: string;
  title: string;
  series: number[];
  labels: string[];
  colors?: string[];
  total?: number;
}

export interface BarChart {
  id: string;
  title: string;
  categories: string[]; // Y-axis labels
  series: ChartDataset[];
  horizontal?: boolean;
}

export interface HeatmapChart {
  id: string;
  title: string;
  data: HeatmapCell[];
  xLabels: string[]; // Days, hours, etc.
  yLabels: string[]; // Hours, days of week, etc.
  colorScale: HeatmapColorScale;
}

export interface HeatmapCell {
  x: number;
  y: number;
  value: number;
}

export interface HeatmapColorScale {
  min: string; // Color for min value
  mid: string; // Color for mid value
  max: string; // Color for max value
}

// ============================================
// COHORT ANALYSIS
// ============================================

export interface CohortRetention {
  cohorts: Cohort[];
  periods: number; // Number of periods to track (weeks, months)
  periodType: "day" | "week" | "month";
}

export interface Cohort {
  cohortDate: string; // Starting date (e.g., "2024-01")
  cohortSize: number; // Initial users in cohort
  retentionRates: number[]; // Retention % for each period
}

// ============================================
// CONVERSION FUNNEL
// ============================================

export interface ConversionFunnel {
  id: string;
  name: string;
  stages: FunnelStage[];
  conversionRate: number; // Overall conversion rate
  dropOffRate: number;
}

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number; // Of initial stage
  dropOff: number; // Number lost to next stage
  dropOffPercentage: number;
}

// ============================================
// RFM ANALYSIS (Recency, Frequency, Monetary)
// ============================================

export interface RFMAnalysis {
  segments: RFMSegment[];
  totalUsers: number;
  averageRFMScore: number;
}

export interface RFMSegment {
  name: string; // "Champions", "Loyal", "At Risk", etc.
  userCount: number;
  percentage: number;
  averageRecency: number; // Days since last activity
  averageFrequency: number; // Number of transactions
  averageMonetary: number; // Total spent
  color: string;
}

// ============================================
// GEOGRAPHIC ANALYSIS
// ============================================

export interface GeographicData {
  regions: RegionData[];
  totalRevenue: number;
  totalBookings: number;
}

export interface RegionData {
  name: string;
  code: string; // Country/region code
  latitude: number;
  longitude: number;
  bookings: number;
  revenue: number;
  users: number;
  percentage: number; // Of total
}

// ============================================
// TOP PERFORMERS
// ============================================

export interface TopPerformers {
  stations: TopStation[];
  lodgings: TopLodging[];
  shops: TopShop[];
  blogPosts: TopBlogPost[];
}

export interface TopStation {
  id: string;
  name: string;
  slug: string;
  bookings: number;
  revenue: number;
  rating: number;
  change: number; // Percentage change from previous period
}

export interface TopLodging {
  id: string;
  name: string;
  type: string;
  bookings: number;
  revenue: number;
  occupancy: number; // Percentage
  rating: number;
}

export interface TopShop {
  id: string;
  name: string;
  sales: number;
  rentals: number;
  revenue: number;
  rating: number;
}

export interface TopBlogPost {
  id: string;
  slug: string;
  title: string;
  views: number;
  likes: number;
  shares: number;
  comments: number;
  timeOnPage: number; // Seconds
  conversion: number; // Percentage
}

// ============================================
// ATTRIBUTION ANALYSIS
// ============================================

export type AttributionModel =
  | "first-click"
  | "last-click"
  | "linear"
  | "time-decay"
  | "multi-touch";

export interface AttributionAnalysis {
  model: AttributionModel;
  channels: ChannelAttribution[];
  totalConversions: number;
  totalRevenue: number;
}

export interface ChannelAttribution {
  channel: string; // "organic", "paid", "email", "social", "direct", "referral"
  conversions: number;
  revenue: number;
  percentage: number; // Of total
  roi: number;
}

// ============================================
// FINANCIAL ANALYSIS
// ============================================

export interface ProfitLossStatement {
  period: string;
  revenue: RevenueBreakdown;
  costs: CostBreakdown;
  grossProfit: number;
  grossMargin: number; // Percentage
  netProfit: number;
  netMargin: number; // Percentage
  ebitda: number; // Earnings Before Interest, Taxes, Depreciation, Amortization
}

export interface RevenueBreakdown {
  bookings: number;
  premium: number;
  commissions: number;
  advertising: number;
  other: number;
  total: number;
}

export interface CostBreakdown {
  hosting: number;
  marketing: number;
  staff: number;
  commissionsPaid: number; // To partners
  payment: number; // Payment processing fees
  other: number;
  total: number;
}

export interface CashFlowStatement {
  period: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  cashBeginning: number;
  cashEnding: number;
}

export interface BalanceSheet {
  date: string;
  assets: Assets;
  liabilities: Liabilities;
  equity: number;
}

export interface Assets {
  current: CurrentAssets;
  fixed: FixedAssets;
  total: number;
}

export interface CurrentAssets {
  cash: number;
  accountsReceivable: number;
  inventory: number;
  other: number;
  total: number;
}

export interface FixedAssets {
  equipment: number;
  software: number;
  other: number;
  total: number;
}

export interface Liabilities {
  current: CurrentLiabilities;
  longTerm: LongTermLiabilities;
  total: number;
}

export interface CurrentLiabilities {
  accountsPayable: number;
  deferredRevenue: number;
  other: number;
  total: number;
}

export interface LongTermLiabilities {
  loans: number;
  other: number;
  total: number;
}

// ============================================
// FORECAST & PREDICTIONS
// ============================================

export interface DemandForecast {
  stationId: string;
  stationName: string;
  forecasts: ForecastPoint[];
  confidence: number; // Percentage (e.g., 95%)
  method: "historical" | "ml" | "hybrid";
}

export interface ForecastPoint {
  date: string;
  predictedBookings: number;
  predictedRevenue: number;
  lowerBound: number;
  upperBound: number;
}

// ============================================
// COMPARATIVE ANALYSIS
// ============================================

export interface YearOverYearComparison {
  metric: string;
  currentYear: TimeSeriesData;
  previousYear: TimeSeriesData;
  change: number; // Percentage
  trend: "up" | "down" | "stable";
}

export interface TimeSeriesData {
  year: number;
  data: DataPoint[];
}

export interface DataPoint {
  date: string; // ISO 8601 or month name
  value: number;
}

// ============================================
// FILTERS & SEGMENTATION
// ============================================

export interface AnalyticsFilters {
  period: TimePeriod;
  customRange?: CustomDateRange;
  stationIds?: string[];
  userSegments?: UserSegment[];
  bookingTypes?: BookingType[];
  channels?: MarketingChannel[];
}

export type UserSegment =
  | "all"
  | "free"
  | "premium"
  | "new"
  | "active"
  | "at-risk"
  | "vip";
export type BookingType =
  | "lodging"
  | "rental"
  | "lessons"
  | "pass"
  | "experience";
export type MarketingChannel =
  | "organic"
  | "paid"
  | "email"
  | "social"
  | "direct"
  | "referral";

// ============================================
// EXPORT TYPES
// ============================================

export type ExportFormat = "pdf" | "excel" | "csv" | "json";

export interface ExportRequest {
  format: ExportFormat;
  data: unknown;
  filename: string;
  includeCharts?: boolean;
  includeTables?: boolean;
}
