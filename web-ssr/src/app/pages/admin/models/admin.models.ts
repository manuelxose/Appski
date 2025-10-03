/**
 * Admin Models - Nieve Platform
 * Interfaces para el panel de administración
 */

// ========== DASHBOARD ==========
export interface AdminMetrics {
  totalBookings: number;
  activeUsers: number;
  revenue: number;
  stations: number;
  bookingsChange: number;
  usersChange: number;
  revenueChange: number;
  stationsChange: number;
}

export interface RecentActivity {
  id: number;
  type: "booking" | "user" | "blog" | "station";
  title: string;
  description: string;
  time: string;
  user: string;
  timestamp: string;
}

export interface TopStation {
  id: number;
  name: string;
  slug: string;
  bookings: number;
  revenue: number;
  change: number;
  location: string;
}

// ========== USERS ==========
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "premium" | "admin";
  status: "active" | "suspended" | "inactive";
  registeredAt: string;
  lastLogin: string;
  totalBookings: number;
  totalSpent: number;
  avatar?: string;
  phone?: string;
  location?: string;
}

export type UserRole = "user" | "premium" | "admin";
export type UserStatus = "active" | "suspended" | "inactive";

// ========== BOOKINGS ==========
export interface AdminBooking {
  id: number;
  bookingNumber: string;
  userId: number;
  userName: string;
  userEmail: string;
  stationId: number;
  stationName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalAmount: number;
  status: "confirmed" | "pending" | "cancelled" | "completed";
  paymentStatus: "paid" | "pending" | "refunded";
  createdAt: string;
  lodgingType: string;
}

export type BookingStatus = "confirmed" | "pending" | "cancelled" | "completed";
export type PaymentStatus = "paid" | "pending" | "refunded";

// ========== STATIONS ==========
export interface AdminStation {
  id: number;
  name: string;
  slug: string;
  location: string;
  altitude: {
    min: number;
    max: number;
  };
  status: "open" | "closed" | "seasonal" | "maintenance";
  totalPistes: number;
  totalLifts: number;
  skiableArea: number;
  snowDepth: number;
  lastUpdate: string;
  websiteUrl: string;
  phoneNumber: string;
  isActive: boolean;
  images: string[];
}

export type StationStatus = "open" | "closed" | "seasonal" | "maintenance";

// ========== BLOG ==========
export interface AdminBlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  authorId: number;
  category: string;
  tags: string[];
  status: "published" | "draft" | "scheduled";
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  featuredImage: string;
  views: number;
  likes: number;
  comments: number;
}

export type BlogStatus = "published" | "draft" | "scheduled";

// ========== SETTINGS ==========
export interface AdminSettings {
  general: {
    siteName: string;
    siteDescription: string;
    contactEmail: string;
    supportPhone: string;
    timezone: string;
    language: string;
    currency: string;
  };
  booking: {
    minAdvanceBookingDays: number;
    maxAdvanceBookingDays: number;
    cancellationDeadlineHours: number;
    refundPercentage: number;
    requirePaymentUpfront: boolean;
    allowGuestCheckout: boolean;
  };
  payments: {
    stripePublicKey: string;
    stripeSecretKey: string;
    paypalClientId: string;
    taxRate: number;
    platformFee: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
    pushEnabled: boolean;
    adminAlerts: boolean;
  };
  premium: {
    monthlyPrice: number;
    annualPrice: number;
    trialDays: number;
    features: string[];
  };
}

// ========== CHARTS DATA ==========
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

// ========== FILTERS ==========
export interface UserFilters {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: "name" | "email" | "registeredAt" | "totalBookings";
  sortOrder?: "asc" | "desc";
}

export interface BookingFilters {
  search?: string;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "createdAt" | "checkIn" | "totalAmount";
  sortOrder?: "asc" | "desc";
}

export interface StationFilters {
  search?: string;
  status?: StationStatus;
  sortBy?: "name" | "location" | "altitude";
  sortOrder?: "asc" | "desc";
}
