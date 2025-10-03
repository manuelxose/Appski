/**
 * Admin Bookings Module - Type Definitions
 *
 * Interfaces y tipos para la gestión de reservas
 */

/**
 * Booking interface
 */
export interface Booking {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  stationSlug: string;
  stationName?: string;
  serviceType: "skipass" | "class" | "equipment" | "package";
  startDate: string;
  endDate: string;
  participants: number;
  totalAmount: number;
  paidAmount?: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  paymentStatus?: "pending" | "paid" | "refunded";
  createdAt: string;
  updatedAt?: string;
  cancelledAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  specialRequests?: string;
  notes?: string;
}

/**
 * Form data para crear/editar reservas
 */
export interface BookingFormData {
  id?: string;
  userId: string;
  stationSlug: string;
  serviceType: "skipass" | "class" | "equipment" | "package";
  startDate: string;
  endDate: string;
  participants: number;
  totalAmount: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialRequests?: string;
}

/**
 * Estadísticas de reservas
 */
export interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  totalRevenue: number;
  averageValue: number;
}

/**
 * Date range para filtros
 */
export interface DateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Booking creation request
 */
export interface CreateBookingRequest {
  userId: string;
  stationSlug: string;
  serviceType: "skipass" | "class" | "equipment" | "package";
  startDate: string;
  endDate: string;
  participants: number;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  specialRequests?: string;
}

/**
 * Booking update request
 */
export interface UpdateBookingRequest {
  status?: "pending" | "confirmed" | "cancelled" | "completed";
  startDate?: string;
  endDate?: string;
  participants?: number;
  totalAmount?: number;
  specialRequests?: string;
  notes?: string;
}
