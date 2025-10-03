/**
 * Account Models - Nieve Platform
 * Interfaces y tipos para la gestión de cuentas de usuario
 */

// ========== USER PROFILE ==========
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  memberSince: string;
  isPremium: boolean;
  premiumUntil?: string;
  bio?: string;
  location?: string;
  birthDate?: string;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  email?: string;
  bio?: string;
  location?: string;
  birthDate?: string;
}

// ========== BOOKINGS ==========
export type BookingStatus = "upcoming" | "completed" | "cancelled" | "pending";
export type BookingType = "lodging" | "rental" | "lessons" | "pass";

export interface Booking {
  id: string;
  station: string;
  stationSlug: string;
  date: string;
  endDate?: string;
  status: BookingStatus;
  type: BookingType;
  total: number;
  currency: string;
  guests?: number;
  details?: BookingDetails;
  createdAt: string;
  updatedAt: string;
}

export interface BookingDetails {
  lodging?: {
    name: string;
    roomType: string;
    nights: number;
    checkIn: string;
    checkOut: string;
  };
  rental?: {
    equipment: string[];
    startDate: string;
    endDate: string;
  };
  lessons?: {
    level: string;
    instructor: string;
    duration: number; // hours
    participants: number;
  };
  pass?: {
    passType: string;
    validFrom: string;
    validUntil: string;
    daysRemaining?: number;
  };
}

// ========== PREFERENCES ==========
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";
export type EquipmentType =
  | "all-mountain"
  | "freestyle"
  | "freeride"
  | "carving";

export interface Preferences {
  skillLevel: SkillLevel;
  favoriteStations: string[];
  equipment: EquipmentType;
  notifications: NotificationPreferences;
  language?: string;
  theme?: "light" | "dark" | "auto";
  measurementSystem?: "metric" | "imperial";
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  categories: {
    weather: boolean;
    alerts: boolean;
    bookings: boolean;
    promotions: boolean;
    news: boolean;
  };
}

export interface UpdatePreferencesRequest {
  skillLevel?: SkillLevel;
  favoriteStations?: string[];
  equipment?: EquipmentType;
  notifications?: Partial<NotificationPreferences>;
  language?: string;
  theme?: "light" | "dark" | "auto";
  measurementSystem?: "metric" | "imperial";
}

// ========== SECURITY ==========
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrentSession: boolean;
  createdAt: string;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  lastPasswordChange: string;
  loginAttempts: number;
  accountStatus: "active" | "locked" | "suspended";
}

// ========== API RESPONSES ==========
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
  };
}

// ========== ACCOUNT STATS ==========
export interface AccountStats {
  totalBookings: number;
  completedBookings: number;
  totalSpent: number;
  favoriteStation: string;
  daysOnSlope: number;
  membershipDays: number;
}

// ========== PAYMENT METHODS ==========
export interface PaymentMethod {
  id: string;
  type: "card" | "paypal" | "bank_transfer";
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  email?: string; // for PayPal
}

// ========== NOTIFICATIONS ==========
export type NotificationType =
  | "weather"
  | "booking"
  | "promotion"
  | "alert"
  | "social"
  | "system";
export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  icon?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  categories: {
    weather: boolean;
    alerts: boolean;
    bookings: boolean;
    promotions: boolean;
    news: boolean;
    social: boolean;
  };
  frequency: "realtime" | "hourly" | "daily" | "weekly";
  quietHoursEnabled: boolean;
  quietHoursStart?: string; // HH:mm format
  quietHoursEnd?: string; // HH:mm format
}

// ========== PREMIUM SUBSCRIPTION ==========
export type SubscriptionPlan = "free" | "basic" | "premium" | "pro";
export type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "paused"
  | "trialing";
export type BillingCycle = "monthly" | "quarterly" | "yearly";

export interface PremiumSubscription {
  id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  price: number;
  currency: string;
  startDate: string;
  endDate: string;
  renewalDate?: string;
  cancelledAt?: string;
  features: SubscriptionFeature[];
  paymentMethod: PaymentMethod;
  autoRenew: boolean;
  trialEndsAt?: string;
}

export interface SubscriptionFeature {
  name: string;
  description: string;
  enabled: boolean;
  icon?: string;
}

export interface SubscriptionPlanInfo {
  plan: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  features: string[];
  popular?: boolean;
  savings?: string;
  description: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "overdue" | "cancelled";
  description: string;
  pdfUrl?: string;
  items: InvoiceItem[];
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Wrapper for complete premium subscription data (from mock)
export interface PremiumSubscriptionData {
  subscription: PremiumSubscription;
  availablePlans: SubscriptionPlanInfo[];
  invoices: Invoice[];
}

// ========== ACTIVITY STATS ==========
export interface ActivityStats {
  totalDaysSkiing: number;
  totalKilometers: number;
  totalVerticalMeters: number;
  totalRuns: number;
  averageSpeed: number; // km/h
  topSpeed: number; // km/h
  stationsVisited: number;
  favoriteStation: string;
  skillProgress: {
    current: SkillLevel;
    progressPercentage: number;
    nextMilestone: string;
  };
  monthlyActivity: MonthlyActivity[];
  recentActivity: ActivityEntry[];
}

export interface MonthlyActivity {
  month: string; // YYYY-MM
  days: number;
  kilometers: number;
  runs: number;
}

export interface ActivityEntry {
  id: string;
  date: string;
  station: string;
  duration: number; // minutes
  distance: number; // km
  verticalDrop: number; // meters
  runs: number;
  maxSpeed: number; // km/h
  photos?: string[];
}

// ========== DOCUMENTS ==========
export type DocumentType =
  | "invoice"
  | "ticket"
  | "insurance"
  | "license"
  | "identification"
  | "receipt"
  | "certificate"
  | "other";

export interface Document {
  id: string;
  type: DocumentType;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number; // bytes
  fileType: string; // MIME type
  uploadDate: string;
  expiryDate?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UploadDocumentRequest {
  type: DocumentType;
  title: string;
  description?: string;
  file: File;
  expiryDate?: string;
  tags?: string[];
}

// ========== SOCIAL / FRIENDS ==========
export type FriendshipStatus = "friends" | "pending" | "requested" | "blocked";
export type GroupRole = "owner" | "admin" | "member";

export interface Friend {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  status: FriendshipStatus;
  skillLevel: SkillLevel;
  location?: string;
  mutualFriends: number;
  connectedSince?: string;
  lastActivity?: string;
  favoriteStation?: string;
  isOnline?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  avatar: string;
  memberCount: number;
  members: GroupMember[];
  createdBy: string;
  createdAt: string;
  isPrivate: boolean;
  upcomingTrips?: number;
  tags?: string[];
}

export interface GroupMember {
  userId: string;
  name: string;
  avatar: string;
  role: GroupRole;
  joinedAt: string;
  skillLevel: SkillLevel;
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  message?: string;
  timestamp: string;
}

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  groupAvatar: string;
  invitedBy: string;
  invitedByName: string;
  message?: string;
  timestamp: string;
}
