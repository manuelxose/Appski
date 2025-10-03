/**
 * Operations & System Management Models
 * Interfaces para alertas, logs, seguridad, roles, permisos e integraciones
 */

// ============================================
// ALERTS & NOTIFICATIONS
// ============================================

export type AlertType = "info" | "warning" | "error" | "critical";
export type AlertCategory =
  | "booking"
  | "payment"
  | "system"
  | "security"
  | "inventory"
  | "review"
  | "user";
export type AlertStatus = "active" | "acknowledged" | "resolved" | "dismissed";
export type AlertChannel =
  | "email"
  | "push"
  | "sms"
  | "in_app"
  | "slack"
  | "webhook";

export interface OperationalAlert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  status: AlertStatus;

  // Alert details
  title: string;
  message: string;
  severity: number; // 1-5 (5 = critical)

  // Related entities
  entityType?: string; // 'booking', 'payment', 'user', etc.
  entityId?: string;

  // Trigger conditions
  condition: AlertCondition;

  // Recipients
  channels: AlertChannel[];
  recipientUserIds?: string[];
  recipientEmails?: string[];

  // Lifecycle
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  dismissedAt?: string;

  // Actions
  suggestedActions?: string[];
  actionTaken?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  isRecurring: boolean;
  occurrenceCount: number;
}

export interface AlertCondition {
  rule: string; // e.g., "booking_pending_24h"
  threshold?: number;
  operator?: "greater_than" | "less_than" | "equals" | "not_equals";
  value?: unknown;
  timeWindow?: string; // e.g., "24h", "7d"
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: AlertCategory;
  isActive: boolean;

  // Trigger configuration
  condition: AlertCondition;
  checkIntervalMinutes: number; // How often to check

  // Alert settings
  type: AlertType;
  severity: number;
  channels: AlertChannel[];
  recipients: AlertRecipient[];

  // Throttling
  throttleMinutes?: number; // Minimum time between alerts
  maxOccurrencesPerDay?: number;

  // Created/updated
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string;
}

export interface AlertRecipient {
  type: "user" | "role" | "email";
  value: string; // User ID, role name, or email address
}

export interface AlertStats {
  total: number;
  active: number;
  acknowledged: number;
  resolved: number;
  dismissed: number;

  // By type
  byType: { type: AlertType; count: number }[];

  // By category
  byCategory: { category: AlertCategory; count: number }[];

  // Trends
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}

// ============================================
// AUDIT LOGS
// ============================================

export type AuditActionType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "login_failed"
  | "export"
  | "import"
  | "approve"
  | "reject"
  | "suspend"
  | "restore"
  | "send_email"
  | "send_notification"
  | "payment_processed"
  | "refund_issued";

export type AuditResourceType =
  | "user"
  | "booking"
  | "payment"
  | "invoice"
  | "station"
  | "lodging"
  | "shop"
  | "blog_post"
  | "review"
  | "settings"
  | "role"
  | "permission";

export interface AuditLog {
  id: string;

  // Who
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;

  // What
  action: AuditActionType;
  resourceType: AuditResourceType;
  resourceId?: string;
  resourceName?: string;

  // Details
  description: string;
  changes?: AuditChange[];

  // Context
  ipAddress: string;
  userAgent: string;
  location?: GeoLocation;

  // Result
  success: boolean;
  errorMessage?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface GeoLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface AuditLogFilters {
  userId?: string;
  action?: AuditActionType[];
  resourceType?: AuditResourceType[];
  resourceId?: string;
  dateFrom?: string;
  dateTo?: string;
  success?: boolean;
  ipAddress?: string;
  search?: string;
}

export interface AuditLogStats {
  totalLogs: number;
  successfulActions: number;
  failedActions: number;
  uniqueUsers: number;

  // By action
  byAction: { action: AuditActionType; count: number }[];

  // By resource
  byResource: { resourceType: AuditResourceType; count: number }[];

  // By user
  topUsers: { userId: string; userName: string; actionCount: number }[];

  // Trends
  activityByHour: { hour: number; count: number }[];
  activityByDay: { date: string; count: number }[];
}

// ============================================
// ROLES & PERMISSIONS
// ============================================

export type SystemRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "support"
  | "content_editor"
  | "station_manager"
  | "shop_owner"
  | "viewer";

export type PermissionAction =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "approve"
  | "export"
  | "manage";

export type PermissionResource =
  | "users"
  | "bookings"
  | "payments"
  | "invoices"
  | "stations"
  | "lodgings"
  | "shops"
  | "blog"
  | "reviews"
  | "tickets"
  | "analytics"
  | "reports"
  | "settings"
  | "roles"
  | "integrations";

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type: "system" | "custom";

  // Permissions
  permissions: Permission[];

  // Hierarchy
  level: number; // 1 = highest (super admin), 5 = lowest
  inheritsFrom?: string; // Parent role ID

  // Users
  userCount: number;

  // Metadata
  isActive: boolean;
  isEditable: boolean; // System roles cannot be edited
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface Permission {
  resource: PermissionResource;
  actions: PermissionAction[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string; // e.g., "ownerId"
  operator: "equals" | "not_equals" | "in";
  value: string | string[]; // e.g., "${user.id}" for current user
}

export interface RoleAssignment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleId: string;
  roleName: string;

  // Assignment details
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;

  // Scope limitation
  scopeType?: "global" | "station" | "shop" | "lodging";
  scopeIds?: string[]; // If limited to specific entities

  // Status
  isActive: boolean;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
}

export interface PermissionCheck {
  userId: string;
  resource: PermissionResource;
  action: PermissionAction;
  entityId?: string;
  context?: Record<string, unknown>;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  matchedRole?: string;
  matchedPermission?: Permission;
}

// ============================================
// INTEGRATIONS
// ============================================

export type IntegrationType =
  | "payment"
  | "email"
  | "sms"
  | "analytics"
  | "crm"
  | "accounting"
  | "maps"
  | "weather"
  | "storage"
  | "cdn"
  | "monitoring";

export type IntegrationStatus = "active" | "inactive" | "error" | "testing";

export interface Integration {
  id: string;
  name: string;
  provider: string; // 'Stripe', 'SendGrid', 'Twilio', etc.
  type: IntegrationType;
  status: IntegrationStatus;

  // Configuration
  config: IntegrationConfig;

  // Authentication
  authType: "api_key" | "oauth" | "basic" | "bearer";
  credentials: IntegrationCredentials;

  // Endpoints
  baseUrl?: string;
  webhookUrl?: string;

  // Usage
  lastUsedAt?: string;
  requestCount: number;
  errorCount: number;

  // Limits
  rateLimit?: RateLimit;

  // Health
  healthStatus: "healthy" | "degraded" | "down";
  lastHealthCheck?: string;

  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConfig {
  [key: string]: unknown; // Provider-specific config
}

export interface IntegrationCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  username?: string;
  password?: string;
  // Credentials are encrypted in storage
  isEncrypted: boolean;
}

export interface RateLimit {
  requestsPerSecond?: number;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  currentUsage: number;
  resetAt?: string;
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  integrationName: string;

  // Request
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  endpoint: string;
  requestBody?: unknown;
  requestHeaders?: Record<string, string>;

  // Response
  statusCode: number;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;

  // Timing
  duration: number; // Milliseconds
  timestamp: string;

  // Error
  error?: string;
  errorStack?: string;
}

// ============================================
// WEBHOOKS
// ============================================

export type WebhookEvent =
  | "booking.created"
  | "booking.updated"
  | "booking.cancelled"
  | "payment.succeeded"
  | "payment.failed"
  | "payment.refunded"
  | "user.created"
  | "user.updated"
  | "user.deleted"
  | "review.created"
  | "review.moderated"
  | "alert.triggered";

export type WebhookStatus = "active" | "inactive" | "failed" | "paused";

export interface Webhook {
  id: string;
  name: string;
  description?: string;
  url: string;

  // Events
  events: WebhookEvent[];

  // Security
  secret: string; // For HMAC signature
  authHeader?: string; // Optional auth header

  // Configuration
  method: "POST" | "PUT";
  headers?: Record<string, string>;
  timeout: number; // Seconds
  retryPolicy: RetryPolicy;

  // Status
  status: WebhookStatus;
  isActive: boolean;

  // Stats
  successCount: number;
  failureCount: number;
  lastTriggeredAt?: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelaySeconds: number;
  backoffMultiplier: number; // Exponential backoff
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;

  // Payload
  payload: unknown;

  // Request
  requestUrl: string;
  requestMethod: string;
  requestHeaders: Record<string, string>;
  requestBody: string;

  // Response
  responseStatusCode?: number;
  responseBody?: string;
  responseHeaders?: Record<string, string>;

  // Timing
  sentAt: string;
  respondedAt?: string;
  duration?: number; // Milliseconds

  // Retry
  attemptNumber: number;
  nextRetryAt?: string;

  // Status
  success: boolean;
  error?: string;
}

// ============================================
// API KEYS
// ============================================

export type ApiKeyScope = "read" | "write" | "admin";
export type ApiKeyStatus = "active" | "expired" | "revoked";

export interface ApiKey {
  id: string;
  name: string;
  description?: string;
  key: string; // The actual API key (hashed in storage)
  prefix: string; // First 8 chars for identification

  // Owner
  userId: string;
  userName: string;

  // Permissions
  scopes: ApiKeyScope[];
  allowedResources?: PermissionResource[];
  allowedIPs?: string[]; // IP whitelist

  // Usage
  requestCount: number;
  lastUsedAt?: string;
  lastUsedIp?: string;

  // Limits
  rateLimit?: RateLimit;

  // Lifecycle
  status: ApiKeyStatus;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
}

export interface ApiKeyUsageLog {
  id: string;
  apiKeyId: string;
  apiKeyName: string;

  // Request
  method: string;
  endpoint: string;
  statusCode: number;

  // Context
  ipAddress: string;
  userAgent: string;
  timestamp: string;

  // Performance
  duration: number; // Milliseconds

  // Error
  error?: string;
}

// ============================================
// SYSTEM CONFIGURATION
// ============================================

export interface SystemHealth {
  status: "healthy" | "degraded" | "down";
  timestamp: string;

  // Components
  database: ComponentHealth;
  cache: ComponentHealth;
  storage: ComponentHealth;
  email: ComponentHealth;
  payments: ComponentHealth;

  // Metrics
  uptime: number; // Seconds
  responseTime: number; // Milliseconds
  errorRate: number; // Percentage

  // Resources
  cpu: ResourceUsage;
  memory: ResourceUsage;
  disk: ResourceUsage;
}

export interface ComponentHealth {
  status: "healthy" | "degraded" | "down";
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export interface ResourceUsage {
  used: number;
  total: number;
  percentage: number;
  threshold: number; // Alert threshold
}

export interface SystemMetrics {
  // Traffic
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;

  // Performance
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;

  // Errors
  errorRate: number;
  errorCount: number;

  // Users
  activeUsers: number;
  concurrentSessions: number;

  // Database
  databaseConnections: number;
  databaseQueries: number;
  slowQueries: number;

  timestamp: string;
}

// ============================================
// MAINTENANCE
// ============================================

export type MaintenanceStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  status: MaintenanceStatus;

  // Timing
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;

  // Impact
  affectedServices: string[];
  expectedDowntime: number; // Minutes
  actualDowntime?: number;

  // Notifications
  notifyUsers: boolean;
  notificationSent: boolean;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
