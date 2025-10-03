/**
 * Admin Settings Module - Type Definitions
 *
 * Interfaces y tipos para la configuración del sistema
 */

/**
 * Settings tabs
 */
export type SettingsTab =
  | "general"
  | "booking"
  | "payments"
  | "notifications"
  | "premium"
  | "users"
  | "seo"
  | "integrations"
  | "security"
  | "legal";

/**
 * General settings
 */
export interface GeneralSettings {
  siteName: string;
  siteDescription: string;
  logo: string;
  favicon: string;
  timezone: string;
  defaultLanguage: string;
  availableLanguages: string[];
  dateFormat: string;
  timeFormat: string;
  defaultCurrency: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * Booking settings
 */
export interface BookingSettings {
  freeCancellationDays: number;
  depositPercentage: number;
  paymentDeadlineHours: number;
  defaultCheckInTime: string;
  defaultCheckOutTime: string;
  minimumAge: number;
  allowInstantBooking: boolean;
  requirePhoneVerification: boolean;
  autoConfirmBookings: boolean;
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
}

/**
 * Payment settings
 */
export interface PaymentSettings {
  enabledGateways: string[];
  stripePublicKey: string;
  stripeSecretKey: string;
  paypalClientId: string;
  paypalSecretKey: string;
  redsysCommerceCode: string;
  redsysTerminal: string;
  platformFeePercentage: number;
  acceptedCurrencies: string[];
  autoRefunds: boolean;
  refundProcessingDays: number;
}

/**
 * Notification settings
 */
export interface NotificationSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
  emailProvider: string;
  sendgridApiKey: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  enablePushNotifications: boolean;
  bookingConfirmationEmail: boolean;
  bookingCancellationEmail: boolean;
  bookingReminderEmail: boolean;
  reminderDaysBefore: number;
}

/**
 * Premium plan
 */
export interface PremiumPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    bookings: number;
    stations: number;
    storage: number; // GB
  };
  popular?: boolean;
}

/**
 * Premium settings
 */
export interface PremiumSettings {
  plans: PremiumPlan[];
  enablePremium: boolean;
  trialDays: number;
  allowDowngrade: boolean;
}

/**
 * User settings
 */
export interface UserSettings {
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  requirePhoneVerification: boolean;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  sessionTimeoutMinutes: number;
  enableSocialLogin: boolean;
  googleClientId?: string;
  facebookAppId?: string;
  appleClientId?: string;
}

/**
 * SEO settings
 */
export interface SEOSettings {
  siteName: string;
  siteDescription: string;
  siteKeywords: string[];
  defaultOGImage: string;
  twitterHandle: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  facebookPixelId: string;
  enableSitemap: boolean;
  enableRobotsTxt: boolean;
  enableStructuredData: boolean;
}

/**
 * Integration settings
 */
export interface IntegrationSettings {
  googleMapsApiKey: string;
  mapboxAccessToken: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  s3AccessKey: string;
  s3SecretKey: string;
  s3Bucket: string;
  s3Region: string;
}

/**
 * Security settings
 */
export interface SecuritySettings {
  enableTwoFactor: boolean;
  enableRecaptcha: boolean;
  recaptchaSiteKey: string;
  recaptchaSecretKey: string;
  enableRateLimiting: boolean;
  maxRequestsPerMinute: number;
  enableCORS: boolean;
  allowedOrigins: string[];
  enableCSP: boolean;
  cspPolicy: string;
}

/**
 * Legal settings
 */
export interface LegalSettings {
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  cookiePolicyUrl: string;
  gdprCompliant: boolean;
  cookieConsentEnabled: boolean;
  dataRetentionDays: number;
  enableDataExport: boolean;
  enableDataDeletion: boolean;
}

/**
 * All settings combined
 */
export interface AdminSettings {
  general: GeneralSettings;
  booking: BookingSettings;
  payments: PaymentSettings;
  notifications: NotificationSettings;
  premium: PremiumSettings;
  users: UserSettings;
  seo: SEOSettings;
  integrations: IntegrationSettings;
  security: SecuritySettings;
  legal: LegalSettings;
  updatedAt?: string;
  updatedBy?: string;
}
