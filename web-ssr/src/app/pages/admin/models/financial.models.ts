/**
 * Financial Management Models
 * Interfaces para gestión financiera, pagos, facturas, comisiones y reportes
 */

// ============================================
// PAYMENTS & TRANSACTIONS
// ============================================

export type PaymentStatus =
  | "completed"
  | "pending"
  | "failed"
  | "refunded"
  | "disputed";
export type PaymentMethod =
  | "credit_card"
  | "debit_card"
  | "paypal"
  | "bank_transfer"
  | "bizum"
  | "apple_pay"
  | "google_pay";
export type TransactionType =
  | "booking"
  | "subscription"
  | "refund"
  | "commission"
  | "fee";

export interface Payment {
  id: string;
  transactionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string; // 'EUR', 'USD', etc.
  status: PaymentStatus;
  method: PaymentMethod;
  type: TransactionType;
  description: string;
  bookingId?: string; // If payment is for a booking
  subscriptionId?: string; // If payment is for premium subscription
  createdAt: string; // ISO 8601
  processedAt?: string;
  refundedAt?: string;
  refundAmount?: number;
  refundReason?: string;
  fees: PaymentFees;
  metadata?: Record<string, unknown>;
}

export interface PaymentFees {
  platformFee: number; // Platform commission
  processingFee: number; // Stripe/PayPal fee
  totalFees: number;
  netAmount: number; // Amount after fees
}

export interface PaymentFilters {
  search?: string;
  status?: PaymentStatus[];
  method?: PaymentMethod[];
  type?: TransactionType[];
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  userId?: string;
}

export interface PaymentStats {
  totalTransactions: number;
  totalAmount: number;
  totalFees: number;
  totalRefunded: number;
  averageTransactionValue: number;
  successRate: number; // Percentage
  byStatus: PaymentStatusStats[];
  byMethod: PaymentMethodStats[];
  byType: TransactionTypeStats[];
}

export interface PaymentStatusStats {
  status: PaymentStatus;
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentMethodStats {
  method: PaymentMethod;
  count: number;
  amount: number;
  percentage: number;
}

export interface TransactionTypeStats {
  type: TransactionType;
  count: number;
  amount: number;
  percentage: number;
}

export interface RefundRequest {
  paymentId: string;
  amount: number; // Can be partial
  reason: string;
  requestedBy: string; // Admin user ID
  requestedAt: string;
  status: "pending" | "approved" | "rejected" | "processed";
  processedAt?: string;
  processedBy?: string;
  notes?: string;
}

export interface DisputeCase {
  id: string;
  paymentId: string;
  userId: string;
  amount: number;
  reason: string;
  status: "open" | "under_review" | "won" | "lost" | "closed";
  openedAt: string;
  closedAt?: string;
  resolution?: string;
  evidence: DisputeEvidence[];
}

export interface DisputeEvidence {
  type: "document" | "screenshot" | "email" | "other";
  url: string;
  description: string;
  uploadedAt: string;
}

// ============================================
// INVOICES
// ============================================

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "overdue"
  | "cancelled"
  | "refunded";
export type InvoiceType =
  | "booking"
  | "subscription"
  | "commission"
  | "rectification";

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g., "INV-2025-0001"
  type: InvoiceType;
  status: InvoiceStatus;
  issuedDate: string; // ISO 8601
  dueDate: string;
  paidDate?: string;

  // Billing details
  billTo: BillingContact;
  billFrom: BillingContact;

  // Line items
  items: InvoiceItem[];

  // Amounts
  subtotal: number;
  taxRate: number; // Percentage (e.g., 21 for 21% VAT)
  taxAmount: number;
  total: number;

  // Payment
  paymentMethod?: PaymentMethod;
  paymentId?: string;

  // Related entities
  bookingId?: string;
  subscriptionId?: string;
  userId?: string;

  // Files
  pdfUrl?: string;

  // Metadata
  notes?: string;
  currency: string;
  language: string; // 'es', 'en', etc.
  createdAt: string;
  updatedAt: string;
}

export interface BillingContact {
  name: string;
  taxId?: string; // NIF/CIF
  email: string;
  phone?: string;
  address: BillingAddress;
}

export interface BillingAddress {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export interface InvoiceSeries {
  id: string;
  prefix: string; // e.g., "INV"
  currentNumber: number;
  year: number;
  format: string; // e.g., "INV-YYYY-NNNN"
  isActive: boolean;
}

export interface RectificationInvoice {
  originalInvoiceId: string;
  originalInvoiceNumber: string;
  reason: string;
  creditAmount: number;
  createdAt: string;
}

// ============================================
// COMMISSIONS
// ============================================

export type CommissionType = "lodging" | "shop" | "affiliate" | "referral";
export type CommissionStatus = "pending" | "approved" | "paid" | "rejected";
export type PayoutMethod = "bank_transfer" | "paypal" | "stripe";
export type PayoutFrequency = "weekly" | "biweekly" | "monthly" | "on_demand";

export interface Commission {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  type: CommissionType;

  // Commission details
  bookingId?: string;
  saleAmount: number; // Original sale/booking amount
  commissionRate: number; // Percentage
  commissionAmount: number;

  // Status and payment
  status: CommissionStatus;
  calculatedAt: string;
  approvedAt?: string;
  paidAt?: string;

  // Payout details
  payoutId?: string;
  payoutMethod?: PayoutMethod;

  // Metadata
  notes?: string;
  currency: string;
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: CommissionType;

  // Commission settings
  commissionRate: number;
  payoutMethod: PayoutMethod;
  payoutFrequency: PayoutFrequency;
  minimumPayout: number; // Minimum amount to trigger payout

  // Tax details
  taxId?: string;
  billingAddress?: BillingAddress;

  // Stats
  totalEarned: number;
  totalPaid: number;
  pendingAmount: number;

  // Account status
  isActive: boolean;
  joinedAt: string;
  lastPayoutAt?: string;
}

export interface Payout {
  id: string;
  partnerId: string;
  partnerName: string;
  method: PayoutMethod;

  // Amounts
  commissions: Commission[]; // List of commissions included
  totalAmount: number;
  fees: number;
  netAmount: number;
  currency: string;

  // Status
  status: "pending" | "processing" | "completed" | "failed";
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  failureReason?: string;

  // Bank/PayPal details
  accountDetails?: PayoutAccountDetails;
  transactionId?: string; // External transaction ID
}

export interface PayoutAccountDetails {
  method: PayoutMethod;
  accountHolder?: string;
  accountNumber?: string; // Last 4 digits for security
  bankName?: string;
  paypalEmail?: string;
}

export interface CommissionStats {
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  totalRejected: number;
  averageCommissionRate: number;
  topPartners: TopPartner[];
  byType: CommissionTypeStats[];
}

export interface TopPartner {
  partnerId: string;
  partnerName: string;
  totalEarned: number;
  totalPaid: number;
  pendingAmount: number;
}

export interface CommissionTypeStats {
  type: CommissionType;
  count: number;
  totalAmount: number;
  percentage: number;
}

// ============================================
// FINANCIAL REPORTS
// ============================================

export interface FinancialReport {
  id: string;
  type: ReportType;
  period: ReportPeriod;
  generatedAt: string;
  generatedBy: string; // User ID
  format: "pdf" | "excel" | "csv";
  fileUrl?: string;
  data: ReportData;
}

export type ReportType =
  | "balance_sheet"
  | "profit_loss"
  | "cash_flow"
  | "revenue_breakdown"
  | "cost_breakdown"
  | "tax_report"
  | "commission_report"
  | "payment_summary";

export interface ReportPeriod {
  type: "day" | "week" | "month" | "quarter" | "year" | "custom";
  startDate: string;
  endDate: string;
}

export interface ReportData {
  summary: ReportSummary;
  details: unknown; // Specific to report type
  charts?: ChartConfig[];
  tables?: TableConfig[];
}

export interface ReportSummary {
  totalRevenue: number;
  totalCosts: number;
  grossProfit: number;
  netProfit: number;
  profitMargin: number; // Percentage
}

export interface ChartConfig {
  id: string;
  type: "line" | "bar" | "pie" | "donut";
  title: string;
  data: unknown;
}

export interface TableConfig {
  id: string;
  title: string;
  headers: string[];
  rows: unknown[][];
}

// ============================================
// TAX MANAGEMENT
// ============================================

export interface TaxConfiguration {
  defaultRate: number; // Default VAT/IVA rate (e.g., 21%)
  rates: TaxRate[];
  exemptions: TaxExemption[];
  reportingPeriod: "monthly" | "quarterly" | "yearly";
  nextReportDue: string;
}

export interface TaxRate {
  name: string; // e.g., "IVA General", "IVA Reducido"
  rate: number; // Percentage
  applicableTo: string[]; // Categories where this rate applies
  country: string;
  isActive: boolean;
}

export interface TaxExemption {
  name: string;
  description: string;
  applicableTo: string[];
  startDate: string;
  endDate?: string;
}

export interface TaxReport {
  id: string;
  period: ReportPeriod;
  totalTaxable: number; // Total taxable amount
  totalTax: number; // Total tax collected
  totalExempt: number; // Total exempt from tax
  byRate: TaxRateBreakdown[];
  generatedAt: string;
  fileUrl?: string;
}

export interface TaxRateBreakdown {
  rate: number;
  taxableAmount: number;
  taxAmount: number;
  transactionCount: number;
}

// ============================================
// BUDGET & FORECASTING
// ============================================

export interface Budget {
  id: string;
  name: string;
  year: number;
  quarter?: number;
  categories: BudgetCategory[];
  totalBudget: number;
  totalSpent: number;
  remainingBudget: number;
  status: "draft" | "active" | "exceeded" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  name: string;
  budgetedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentageUsed: number;
  items: BudgetItem[];
}

export interface BudgetItem {
  description: string;
  budgeted: number;
  actual: number;
  variance: number; // Difference (actual - budgeted)
  variancePercentage: number;
}

export interface FinancialForecast {
  id: string;
  period: ReportPeriod;
  method: "historical" | "regression" | "ml";
  confidence: number; // Percentage

  // Forecasted metrics
  revenue: ForecastMetric;
  costs: ForecastMetric;
  profit: ForecastMetric;

  // Breakdown
  revenueBySource: ForecastBreakdown[];
  costsByCategory: ForecastBreakdown[];

  generatedAt: string;
}

export interface ForecastMetric {
  predicted: number;
  lowerBound: number;
  upperBound: number;
  historical: number; // Actual from same period last year
  variance: number; // Percentage difference from historical
}

export interface ForecastBreakdown {
  category: string;
  predicted: number;
  historical: number;
  growth: number; // Percentage
}

// ============================================
// RECONCILIATION
// ============================================

export interface BankReconciliation {
  id: string;
  accountName: string;
  accountNumber: string;
  period: ReportPeriod;

  // Balances
  openingBalance: number;
  closingBalance: number;
  bookBalance: number; // Balance in our system

  // Reconciliation
  reconciledTransactions: number;
  unreconciledTransactions: number;
  discrepancy: number; // Difference between book and bank

  status: "pending" | "in_progress" | "completed" | "discrepancy";
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface ReconciliationItem {
  id: string;
  reconciliationId: string;
  transactionId: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  isReconciled: boolean;
  bankTransactionId?: string;
  notes?: string;
}

// ============================================
// EXPORT & INTEGRATION
// ============================================

export interface AccountingExport {
  id: string;
  format: "csv" | "excel" | "xml" | "json";
  period: ReportPeriod;
  includePayments: boolean;
  includeInvoices: boolean;
  includeCommissions: boolean;
  fileUrl?: string;
  generatedAt: string;
}

export interface AccountingIntegration {
  provider: "quickbooks" | "xero" | "sage" | "custom";
  isEnabled: boolean;
  apiKey: string;
  syncFrequency: "realtime" | "hourly" | "daily" | "weekly";
  lastSync?: string;
  nextSync?: string;
  syncStatus: "success" | "failed" | "in_progress";
  errorMessage?: string;
}
