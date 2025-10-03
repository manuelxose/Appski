/**
 * CRM & Marketing Models
 * Interfaces para email marketing, campañas, soporte, reviews y notificaciones
 */

// ============================================
// EMAIL MARKETING
// ============================================

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "cancelled";
export type CampaignType =
  | "newsletter"
  | "promotional"
  | "transactional"
  | "automated";
export type EmailTemplateCategory =
  | "marketing"
  | "transactional"
  | "notification"
  | "seasonal";

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  preheader?: string; // Preview text
  type: CampaignType;
  status: CampaignStatus;

  // Content
  templateId?: string;
  htmlContent: string;
  textContent?: string; // Plain text version

  // Targeting
  segmentIds: string[];
  recipientCount: number;

  // Scheduling
  scheduledAt?: string; // ISO 8601
  sentAt?: string;

  // Tracking
  stats: EmailCampaignStats;

  // A/B Testing
  isABTest: boolean;
  abTestVariants?: ABTestVariant[];

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface EmailCampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  complained: number; // Marked as spam

  // Rates
  openRate: number; // Percentage
  clickRate: number; // Percentage (of opened)
  clickToOpenRate: number; // Percentage (of delivered)
  bounceRate: number;
  unsubscribeRate: number;

  // Revenue (if tracking enabled)
  revenue?: number;
  conversions?: number;
  conversionRate?: number;
}

export interface ABTestVariant {
  id: string;
  name: string; // "Variant A", "Variant B"
  subject: string;
  htmlContent: string;
  recipientPercentage: number; // Percentage of audience
  stats: EmailCampaignStats;
  isWinner?: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: EmailTemplateCategory;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent?: string;

  // Variables (merge tags)
  variables: TemplateVariable[];

  // Preview
  thumbnailUrl?: string;

  // Metadata
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  usageCount: number;
}

export interface TemplateVariable {
  key: string; // e.g., "{{user.name}}"
  description: string;
  exampleValue: string;
  isRequired: boolean;
}

export interface EmailSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SegmentCriteria {
  field: string; // "status", "premium", "lastLogin", etc.
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "in"
    | "not_in";
  value: string | number | boolean | string[];
}

export interface EmailAutomation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  stats: AutomationStats;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationTrigger {
  type:
    | "user_signup"
    | "booking_confirmed"
    | "booking_cancelled"
    | "payment_failed"
    | "subscription_started"
    | "subscription_cancelled"
    | "abandoned_cart"
    | "inactivity"
    | "birthday"
    | "custom_event";
  delay?: number; // Minutes to wait before executing
}

export interface AutomationCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: string | number | boolean;
}

export interface AutomationAction {
  type: "send_email" | "add_tag" | "remove_tag" | "update_field" | "webhook";
  templateId?: string; // For send_email
  tag?: string; // For add_tag/remove_tag
  field?: string; // For update_field
  value?: unknown; // For update_field
  webhookUrl?: string; // For webhook
}

export interface AutomationStats {
  triggered: number;
  completed: number;
  failed: number;
  successRate: number; // Percentage
}

// ============================================
// CAMPAIGNS & PROMOTIONS
// ============================================

export type PromotionType =
  | "discount_code"
  | "seasonal"
  | "bundle"
  | "early_bird"
  | "last_minute"
  | "loyalty";
export type DiscountType =
  | "percentage"
  | "fixed_amount"
  | "free_shipping"
  | "buy_x_get_y";
export type PromotionStatus =
  | "draft"
  | "active"
  | "scheduled"
  | "expired"
  | "disabled";

export interface Promotion {
  id: string;
  name: string;
  description: string;
  type: PromotionType;
  status: PromotionStatus;

  // Discount details
  discountType: DiscountType;
  discountValue: number; // Percentage or fixed amount

  // Applicability
  appliesTo: PromotionApplicability;
  minPurchase?: number;
  maxDiscount?: number; // Cap for percentage discounts

  // Validity
  startDate: string;
  endDate: string;

  // Usage limits
  usageLimit?: number; // Total uses allowed
  usageCount: number; // Current uses
  perUserLimit?: number; // Max uses per user

  // Tracking
  revenue: number; // Revenue generated
  bookings: number; // Bookings using this promotion

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionApplicability {
  all: boolean; // Applies to everything
  stationIds?: string[];
  lodgingIds?: string[];
  shopIds?: string[];
  bookingTypes?: string[]; // "lodging", "rental", "lessons", etc.
}

export interface DiscountCode {
  id: string;
  code: string; // Unique code (e.g., "WINTER2025")
  promotionId: string;

  // Limits
  usageLimit?: number;
  usageCount: number;

  // Validity
  isActive: boolean;
  expiresAt?: string;

  // Tracking
  revenue: number;
  bookings: number;

  createdAt: string;
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  description: string;
  isActive: boolean;

  // Points configuration
  pointsPerEuro: number; // Points earned per € spent
  euroPerPoint: number; // € value of 1 point

  // Tiers
  tiers: LoyaltyTier[];

  // Benefits
  benefits: LoyaltyBenefit[];

  // Stats
  totalMembers: number;
  totalPointsIssued: number;
  totalPointsRedeemed: number;

  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTier {
  name: string; // "Bronze", "Silver", "Gold", "Platinum"
  minPoints: number;
  maxPoints?: number;
  benefits: string[];
  color: string;
}

export interface LoyaltyBenefit {
  name: string;
  description: string;
  pointsCost: number;
  applicableTiers: string[];
  isActive: boolean;
}

// ============================================
// SUPPORT TICKETS
// ============================================

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";
export type TicketCategory =
  | "technical"
  | "booking"
  | "payment"
  | "account"
  | "general"
  | "bug"
  | "feature_request";
export type TicketSource =
  | "email"
  | "contact_form"
  | "chat"
  | "phone"
  | "admin";

export interface SupportTicket {
  id: string;
  ticketNumber: string; // e.g., "TKT-2025-0001"

  // User details
  userId?: string;
  userName: string;
  userEmail: string;

  // Ticket details
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;

  // Assignment
  assignedTo?: string; // Agent user ID
  assignedToName?: string;

  // Tracking
  createdAt: string;
  updatedAt: string;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;

  // SLA
  slaBreached: boolean;
  responseTime?: number; // Minutes
  resolutionTime?: number; // Minutes

  // Related entities
  bookingId?: string;
  paymentId?: string;

  // Messages
  messages: TicketMessage[];

  // Internal notes
  internalNotes?: string;

  // Tags
  tags?: string[];

  // Satisfaction
  satisfactionRating?: number; // 1-5 stars
  satisfactionComment?: string;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorType: "user" | "agent";
  content: string;
  attachments?: TicketAttachment[];
  createdAt: string;
  isInternal: boolean; // Internal note vs. customer-facing message
}

export interface TicketAttachment {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number; // Bytes
  uploadedAt: string;
}

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;

  // Performance
  averageResponseTime: number; // Minutes
  averageResolutionTime: number; // Minutes
  firstResponseRate: number; // Percentage within SLA
  resolutionRate: number; // Percentage within SLA

  // Satisfaction
  averageSatisfaction: number; // 1-5 stars
  satisfactionResponses: number;

  // By category
  byCategory: CategoryStats[];

  // By agent
  byAgent: AgentStats[];
}

export interface CategoryStats {
  category: TicketCategory;
  count: number;
  percentage: number;
  averageResolutionTime: number;
}

export interface AgentStats {
  agentId: string;
  agentName: string;
  assignedTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  satisfactionRating: number;
}

export interface SLAConfiguration {
  priority: TicketPriority;
  responseTimeMinutes: number; // Target first response time
  resolutionTimeMinutes: number; // Target resolution time
  businessHoursOnly: boolean;
}

// ============================================
// REVIEWS & REPUTATION
// ============================================

export type ReviewType = "station" | "lodging" | "shop" | "blog";
export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged";
export type ReviewSentiment = "positive" | "neutral" | "negative";

export interface Review {
  id: string;
  type: ReviewType;

  // Entity being reviewed
  entityId: string;
  entityName: string;

  // User details
  userId: string;
  userName: string;
  userAvatar?: string;
  isVerifiedBooking: boolean;

  // Review content
  rating: number; // 1-5 stars
  title?: string;
  content: string;
  pros?: string[];
  cons?: string[];

  // Media
  images?: ReviewImage[];

  // Status
  status: ReviewStatus;
  moderatedBy?: string;
  moderatedAt?: string;
  rejectionReason?: string;

  // Dates
  visitDate?: string; // When they visited the place
  createdAt: string;
  updatedAt: string;

  // Engagement
  helpfulCount: number;
  notHelpfulCount: number;
  reportCount: number;

  // Response
  response?: ReviewResponse;

  // Sentiment analysis
  sentiment?: ReviewSentiment;
  sentimentScore?: number; // -1 to 1

  // Metadata
  bookingId?: string;
  ipAddress?: string;
  isEdited: boolean;
}

export interface ReviewImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  uploadedAt: string;
}

export interface ReviewResponse {
  content: string;
  respondedBy: string; // Owner or admin
  respondedByName: string;
  respondedAt: string;
}

export interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  flagged: number;

  // Ratings distribution
  averageRating: number;
  ratingDistribution: RatingDistribution;

  // Sentiment
  sentimentDistribution: SentimentDistribution;

  // Trends
  ratingTrend: RatingTrend;

  // By entity type
  byType: ReviewTypeStats[];

  // Top reviewed
  topRated: TopRatedEntity[];
  lowestRated: TopRatedEntity[];
}

export interface RatingDistribution {
  oneStar: number;
  twoStars: number;
  threeStars: number;
  fourStars: number;
  fiveStars: number;
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export interface RatingTrend {
  period: "month" | "quarter" | "year";
  data: {
    date: string;
    averageRating: number;
    count: number;
  }[];
}

export interface ReviewTypeStats {
  type: ReviewType;
  count: number;
  averageRating: number;
}

export interface TopRatedEntity {
  id: string;
  name: string;
  type: ReviewType;
  rating: number;
  reviewCount: number;
}

export interface ReviewFilters {
  type?: ReviewType;
  status?: ReviewStatus;
  rating?: number[];
  sentiment?: ReviewSentiment;
  dateFrom?: string;
  dateTo?: string;
  entityId?: string;
  hasResponse?: boolean;
  isVerified?: boolean;
  search?: string;
}

// ============================================
// PUSH NOTIFICATIONS
// ============================================

export type NotificationType =
  | "promotional"
  | "transactional"
  | "alert"
  | "reminder"
  | "news";
export type NotificationStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "failed";
export type NotificationPlatform = "web" | "ios" | "android" | "all";

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  image?: string;

  // Behavior
  type: NotificationType;
  platform: NotificationPlatform;
  deepLink?: string; // URL to open when clicked
  data?: Record<string, unknown>; // Custom data payload

  // Targeting
  segmentIds?: string[];
  userIds?: string[]; // Specific users
  targetAll: boolean;
  estimatedRecipients: number;

  // Scheduling
  status: NotificationStatus;
  scheduledAt?: string;
  sentAt?: string;

  // Tracking
  stats: PushNotificationStats;

  // Metadata
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface PushNotificationStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;

  // Rates
  deliveryRate: number; // Percentage
  openRate: number; // Percentage
  clickRate: number; // Percentage

  // By platform
  byPlatform: PlatformStats[];

  // Conversions
  conversions?: number;
  revenue?: number;
}

export interface PlatformStats {
  platform: NotificationPlatform;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  deepLink?: string;
  variables: TemplateVariable[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CUSTOMER FEEDBACK
// ============================================

export type FeedbackType =
  | "feature_request"
  | "bug_report"
  | "improvement"
  | "complaint"
  | "praise";
export type FeedbackStatus =
  | "new"
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "declined";

export interface CustomerFeedback {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;

  // User
  userId?: string;
  userName: string;
  userEmail: string;

  // Content
  title: string;
  description: string;
  category?: string;

  // Voting
  upvotes: number;
  downvotes: number;

  // Internal
  internalNotes?: string;
  assignedTo?: string;
  priority?: "low" | "medium" | "high";

  // Dates
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  // Related
  relatedTicketId?: string;
  relatedFeatureId?: string;
}

// ============================================
// REFERRAL PROGRAM
// ============================================

export interface ReferralProgram {
  id: string;
  name: string;
  isActive: boolean;

  // Rewards
  referrerReward: Reward;
  refereeReward: Reward;

  // Configuration
  minimumPurchase?: number; // Minimum booking value for reward
  expirationDays?: number; // Days until reward expires

  // Stats
  totalReferrals: number;
  successfulReferrals: number;
  totalRewardsIssued: number;
  totalRewardValue: number;

  createdAt: string;
  updatedAt: string;
}

export interface Reward {
  type: "discount_percentage" | "discount_fixed" | "credit" | "free_item";
  value: number;
  description: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referrerName: string;
  referrerEmail: string;

  refereeEmail: string;
  refereeId?: string; // Once they sign up
  refereeName?: string;

  status: "pending" | "signed_up" | "completed" | "expired";
  referralCode: string;

  // Rewards
  referrerRewardIssued: boolean;
  refereeRewardIssued: boolean;

  // Dates
  createdAt: string;
  signedUpAt?: string;
  completedAt?: string;
  expiresAt?: string;
}
