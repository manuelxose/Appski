/**
 * Admin Payments Module - Type Definitions
 *
 * Interfaces y tipos para la gestión de pagos, facturas, reembolsos
 */

/**
 * Payment status types
 */
export type PaymentStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "refunded"
  | "cancelled";

/**
 * Payment method types
 */
export type PaymentMethod =
  | "card"
  | "bank_transfer"
  | "paypal"
  | "cash"
  | "bizum";

/**
 * Payment interface
 */
export interface Payment {
  id: string;
  bookingId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: PaymentMethod;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  failedAt?: string;
  transactionId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Payment with customer and station details
 */
export interface PaymentWithDetails extends Payment {
  customerName: string;
  customerEmail?: string;
  stationName: string;
  stationSlug?: string;
  invoiceNumber?: string;
  bookingReference?: string;
}

/**
 * Invoice interface
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  paymentId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
  createdAt: string;
  items?: InvoiceItem[];
}

/**
 * Invoice item
 */
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
}

/**
 * Refund interface
 */
export interface Refund {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  reason: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  processedAt?: string;
  completedAt?: string;
  transactionId?: string;
}

/**
 * Payout interface
 */
export interface Payout {
  id: string;
  stationId: string;
  stationName: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: string;
  scheduledAt?: string;
  completedAt?: string;
  failedAt?: string;
  transactionId?: string;
  notes?: string;
}

/**
 * Payment statistics
 */
export interface PaymentStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  refunded: number;
  totalAmount: number;
  completedAmount: number;
  pendingAmount: number;
  refundedAmount: number;
}

/**
 * Refund request
 */
export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
}

/**
 * Payout request
 */
export interface PayoutRequest {
  stationId: string;
  amount: number;
  scheduledAt?: string;
  notes?: string;
}
