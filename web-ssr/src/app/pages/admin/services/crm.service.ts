/**
 * CRM Service - Nieve Platform
 * Servicio para CRM y Marketing: campañas, soporte, reviews y notificaciones
 * Angular 18+ con Signals
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
// Note: Parameters prefixed with _ are reserved for production API calls

import { Injectable, signal, computed } from "@angular/core";
import type {
  EmailCampaign,
  CampaignStatus,
  EmailCampaignStats,
  EmailTemplate,
  EmailTemplateCategory,
  EmailSegment,
  EmailAutomation,
  Promotion,
  PromotionType,
  PromotionStatus,
  DiscountCode,
  LoyaltyProgram,
  SupportTicket,
  TicketStatus,
  TicketCategory,
  TicketPriority,
  TicketMessage,
  TicketStats,
  SLAConfiguration,
  Review,
  ReviewStatus,
  ReviewType,
  ReviewStats,
  ReviewFilters,
  PushNotification,
  NotificationStatus,
  PushNotificationStats,
  NotificationTemplate,
  CustomerFeedback,
  FeedbackStatus,
  ReferralProgram,
  Referral,
} from "../models/crm.models";

@Injectable({
  providedIn: "root",
})
export class CRMService {
  // ========== PRIVATE SIGNALS (State) ==========

  // Email Marketing
  private readonly _campaigns = signal<EmailCampaign[]>([]);
  private readonly _templates = signal<EmailTemplate[]>([]);
  private readonly _segments = signal<EmailSegment[]>([]);
  private readonly _automations = signal<EmailAutomation[]>([]);

  // Promotions
  private readonly _promotions = signal<Promotion[]>([]);
  private readonly _discountCodes = signal<DiscountCode[]>([]);
  private readonly _loyaltyProgram = signal<LoyaltyProgram | null>(null);

  // Support Tickets
  private readonly _tickets = signal<SupportTicket[]>([]);
  private readonly _ticketStats = signal<TicketStats | null>(null);
  private readonly _slaConfig = signal<SLAConfiguration[]>([]);

  // Reviews
  private readonly _reviews = signal<Review[]>([]);
  private readonly _reviewStats = signal<ReviewStats | null>(null);
  private readonly _reviewFilters = signal<ReviewFilters>({});

  // Push Notifications
  private readonly _pushNotifications = signal<PushNotification[]>([]);
  private readonly _notificationTemplates = signal<NotificationTemplate[]>([]);

  // Feedback & Referrals
  private readonly _feedback = signal<CustomerFeedback[]>([]);
  private readonly _referralProgram = signal<ReferralProgram | null>(null);
  private readonly _referrals = signal<Referral[]>([]);

  // UI State
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ========== PUBLIC COMPUTED (Read-only access) ==========

  // Email Marketing
  readonly campaigns = this._campaigns.asReadonly();
  readonly templates = this._templates.asReadonly();
  readonly segments = this._segments.asReadonly();
  readonly automations = this._automations.asReadonly();

  // Promotions
  readonly promotions = this._promotions.asReadonly();
  readonly discountCodes = this._discountCodes.asReadonly();
  readonly loyaltyProgram = this._loyaltyProgram.asReadonly();

  // Support
  readonly tickets = this._tickets.asReadonly();
  readonly ticketStats = this._ticketStats.asReadonly();
  readonly slaConfig = this._slaConfig.asReadonly();

  // Reviews
  readonly reviews = this._reviews.asReadonly();
  readonly reviewStats = this._reviewStats.asReadonly();
  readonly reviewFilters = this._reviewFilters.asReadonly();

  // Notifications
  readonly pushNotifications = this._pushNotifications.asReadonly();
  readonly notificationTemplates = this._notificationTemplates.asReadonly();

  // Feedback & Referrals
  readonly feedback = this._feedback.asReadonly();
  readonly referralProgram = this._referralProgram.asReadonly();
  readonly referrals = this._referrals.asReadonly();

  // UI State
  readonly isLoading = this._isLoading.asReadonly();
  readonly hasError = computed(() => this._error() !== null);
  readonly errorMessage = this._error.asReadonly();

  // Computed properties
  readonly activeCampaigns = computed(() =>
    this._campaigns().filter(
      (c) => c.status === "scheduled" || c.status === "sending"
    )
  );
  readonly openTickets = computed(() =>
    this._tickets().filter(
      (t) => t.status === "open" || t.status === "in_progress"
    )
  );
  readonly pendingReviews = computed(() =>
    this._reviews().filter((r) => r.status === "pending")
  );
  readonly activePromotions = computed(() =>
    this._promotions().filter((p) => p.status === "active")
  );

  // ========== EMAIL MARKETING METHODS ==========

  /**
   * Load all email campaigns
   */
  async loadCampaigns(status?: CampaignStatus): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/email-campaigns.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: EmailCampaign[] = await response.json();

      const filteredData = status
        ? data.filter((c) => c.status === status)
        : data;

      this._campaigns.set(filteredData);
    } catch (error) {
      this._error.set("Error al cargar campañas de email");
      console.error("Error loading campaigns:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Create new email campaign
   */
  async createCampaign(
    campaignData: Partial<EmailCampaign>
  ): Promise<EmailCampaign | null> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      const newCampaign: EmailCampaign = {
        id: `campaign-${Date.now()}`,
        status: "draft",
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          complained: 0,
          openRate: 0,
          clickRate: 0,
          clickToOpenRate: 0,
          bounceRate: 0,
          unsubscribeRate: 0,
        },
        isABTest: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...campaignData,
      } as EmailCampaign;

      this._campaigns.update((campaigns) => [...campaigns, newCampaign]);
      return newCampaign;
    } catch (error) {
      this._error.set("Error al crear campaña");
      console.error("Error creating campaign:", error);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Send email campaign
   */
  async sendCampaign(campaignId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      this._campaigns.update((campaigns) =>
        campaigns.map((c) =>
          c.id === campaignId
            ? {
                ...c,
                status: "sending" as CampaignStatus,
                sentAt: new Date().toISOString(),
              }
            : c
        )
      );
    } catch (error) {
      this._error.set("Error al enviar campaña");
      console.error("Error sending campaign:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load email templates
   */
  async loadTemplates(category?: EmailTemplateCategory): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/email-templates.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: EmailTemplate[] = await response.json();

      const filteredData = category
        ? data.filter((t) => t.category === category)
        : data;

      this._templates.set(filteredData);
    } catch (error) {
      this._error.set("Error al cargar plantillas");
      console.error("Error loading templates:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load email segments
   */
  async loadSegments(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/email-segments.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: EmailSegment[] = await response.json();
      this._segments.set(data);
    } catch (error) {
      this._error.set("Error al cargar segmentos");
      console.error("Error loading segments:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load email automations
   */
  async loadAutomations(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/email-automations.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: EmailAutomation[] = await response.json();
      this._automations.set(data);
    } catch (error) {
      this._error.set("Error al cargar automatizaciones");
      console.error("Error loading automations:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== PROMOTIONS METHODS ==========

  /**
   * Load promotions
   */
  async loadPromotions(status?: PromotionStatus): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/promotions.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Promotion[] = await response.json();

      const filteredData = status
        ? data.filter((p) => p.status === status)
        : data;

      this._promotions.set(filteredData);
    } catch (error) {
      this._error.set("Error al cargar promociones");
      console.error("Error loading promotions:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Create promotion
   */
  async createPromotion(
    promotionData: Partial<Promotion>
  ): Promise<Promotion | null> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      const newPromotion: Promotion = {
        id: `promo-${Date.now()}`,
        status: "draft",
        usageCount: 0,
        revenue: 0,
        bookings: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...promotionData,
      } as Promotion;

      this._promotions.update((promotions) => [...promotions, newPromotion]);
      return newPromotion;
    } catch (error) {
      this._error.set("Error al crear promoción");
      console.error("Error creating promotion:", error);
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load discount codes
   */
  async loadDiscountCodes(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/discount-codes.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: DiscountCode[] = await response.json();
      this._discountCodes.set(data);
    } catch (error) {
      this._error.set("Error al cargar códigos de descuento");
      console.error("Error loading discount codes:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load loyalty program
   */
  async loadLoyaltyProgram(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/loyalty-program.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: LoyaltyProgram = await response.json();
      this._loyaltyProgram.set(data);
    } catch (error) {
      this._error.set("Error al cargar programa de fidelización");
      console.error("Error loading loyalty program:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== SUPPORT TICKETS METHODS ==========

  /**
   * Load support tickets
   */
  async loadTickets(status?: TicketStatus): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/tickets.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: SupportTicket[] = await response.json();

      const filteredData = status
        ? data.filter((t) => t.status === status)
        : data;

      this._tickets.set(filteredData);
    } catch (error) {
      this._error.set("Error al cargar tickets");
      console.error("Error loading tickets:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load ticket statistics
   */
  async loadTicketStats(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/ticket-stats.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: TicketStats = await response.json();
      this._ticketStats.set(data);
    } catch (error) {
      this._error.set("Error al cargar estadísticas de tickets");
      console.error("Error loading ticket stats:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update ticket status
   */
  async updateTicket(
    ticketId: string,
    updates: Partial<SupportTicket>
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      this._tickets.update((tickets) =>
        tickets.map((t) =>
          t.id === ticketId
            ? { ...t, ...updates, updatedAt: new Date().toISOString() }
            : t
        )
      );
    } catch (error) {
      this._error.set("Error al actualizar ticket");
      console.error("Error updating ticket:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Add message to ticket
   */
  async addTicketMessage(
    ticketId: string,
    message: Partial<TicketMessage>
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      const newMessage: TicketMessage = {
        id: `msg-${Date.now()}`,
        ticketId,
        createdAt: new Date().toISOString(),
        isInternal: false,
        ...message,
      } as TicketMessage;

      this._tickets.update((tickets) =>
        tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                messages: [...t.messages, newMessage],
                updatedAt: new Date().toISOString(),
              }
            : t
        )
      );
    } catch (error) {
      this._error.set("Error al añadir mensaje");
      console.error("Error adding ticket message:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load SLA configuration
   */
  async loadSLAConfig(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/sla-config.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: SLAConfiguration[] = await response.json();
      this._slaConfig.set(data);
    } catch (error) {
      this._error.set("Error al cargar configuración SLA");
      console.error("Error loading SLA config:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== REVIEWS METHODS ==========

  /**
   * Load reviews
   */
  async loadReviews(filters?: ReviewFilters): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/reviews.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Review[] = await response.json();

      if (filters) {
        this._reviewFilters.set(filters);
      }

      this._reviews.set(data);
    } catch (error) {
      this._error.set("Error al cargar reviews");
      console.error("Error loading reviews:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load review statistics
   */
  async loadReviewStats(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/review-stats.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ReviewStats = await response.json();
      this._reviewStats.set(data);
    } catch (error) {
      this._error.set("Error al cargar estadísticas de reviews");
      console.error("Error loading review stats:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Moderate review (approve/reject)
   */
  async moderateReview(
    reviewId: string,
    status: ReviewStatus,
    reason?: string
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      this._reviews.update((reviews) =>
        reviews.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                status,
                moderatedAt: new Date().toISOString(),
                moderatedBy: "current-admin-id",
                rejectionReason: reason,
              }
            : r
        )
      );
    } catch (error) {
      this._error.set("Error al moderar review");
      console.error("Error moderating review:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Respond to review
   */
  async respondToReview(reviewId: string, response: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      this._reviews.update((reviews) =>
        reviews.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                response: {
                  content: response,
                  respondedBy: "current-admin-id",
                  respondedByName: "Admin",
                  respondedAt: new Date().toISOString(),
                },
              }
            : r
        )
      );
    } catch (error) {
      this._error.set("Error al responder review");
      console.error("Error responding to review:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== PUSH NOTIFICATIONS METHODS ==========

  /**
   * Load push notifications
   */
  async loadPushNotifications(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/push-notifications.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: PushNotification[] = await response.json();
      this._pushNotifications.set(data);
    } catch (error) {
      this._error.set("Error al cargar notificaciones push");
      console.error("Error loading push notifications:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(
    notificationData: Partial<PushNotification>
  ): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      // TODO: En producción, llamar a la API
      const newNotification: PushNotification = {
        id: `notif-${Date.now()}`,
        status: "sending",
        targetAll: false,
        estimatedRecipients: 0,
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          failed: 0,
          deliveryRate: 0,
          openRate: 0,
          clickRate: 0,
          byPlatform: [],
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...notificationData,
      } as PushNotification;

      this._pushNotifications.update((notifications) => [
        ...notifications,
        newNotification,
      ]);
    } catch (error) {
      this._error.set("Error al enviar notificación push");
      console.error("Error sending push notification:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load notification templates
   */
  async loadNotificationTemplates(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/notification-templates.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: NotificationTemplate[] = await response.json();
      this._notificationTemplates.set(data);
    } catch (error) {
      this._error.set("Error al cargar plantillas de notificación");
      console.error("Error loading notification templates:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== FEEDBACK & REFERRALS METHODS ==========

  /**
   * Load customer feedback
   */
  async loadFeedback(status?: FeedbackStatus): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/customer-feedback.json"
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: CustomerFeedback[] = await response.json();

      const filteredData = status
        ? data.filter((f) => f.status === status)
        : data;

      this._feedback.set(filteredData);
    } catch (error) {
      this._error.set("Error al cargar feedback");
      console.error("Error loading feedback:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load referral program
   */
  async loadReferralProgram(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/referral-program.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: ReferralProgram = await response.json();
      this._referralProgram.set(data);
    } catch (error) {
      this._error.set("Error al cargar programa de referidos");
      console.error("Error loading referral program:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Load referrals
   */
  async loadReferrals(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/referrals.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: Referral[] = await response.json();
      this._referrals.set(data);
    } catch (error) {
      this._error.set("Error al cargar referidos");
      console.error("Error loading referrals:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  // ========== COMPREHENSIVE LOAD METHODS ==========

  /**
   * Load all email marketing data
   */
  async loadAllEmailMarketingData(): Promise<void> {
    await Promise.all([
      this.loadCampaigns(),
      this.loadTemplates(),
      this.loadSegments(),
      this.loadAutomations(),
    ]);
  }

  /**
   * Load all promotions data
   */
  async loadAllPromotionsData(): Promise<void> {
    await Promise.all([
      this.loadPromotions(),
      this.loadDiscountCodes(),
      this.loadLoyaltyProgram(),
    ]);
  }

  /**
   * Load all support data
   */
  async loadAllSupportData(): Promise<void> {
    await Promise.all([
      this.loadTickets(),
      this.loadTicketStats(),
      this.loadSLAConfig(),
    ]);
  }

  /**
   * Load all reviews data
   */
  async loadAllReviewsData(): Promise<void> {
    await Promise.all([this.loadReviews(), this.loadReviewStats()]);
  }

  /**
   * Load all CRM data
   */
  async loadAllCRMData(): Promise<void> {
    await Promise.all([
      this.loadCampaigns(),
      this.loadPromotions(),
      this.loadTickets(),
      this.loadReviews(),
      this.loadPushNotifications(),
    ]);
  }

  // ========== UTILITY METHODS ==========

  /**
   * Update review filters
   */
  updateReviewFilters(filters: Partial<ReviewFilters>): void {
    const current = this._reviewFilters();
    this._reviewFilters.set({ ...current, ...filters });
  }

  /**
   * Reset review filters
   */
  resetReviewFilters(): void {
    this._reviewFilters.set({});
  }

  /**
   * Clear all CRM data
   */
  clearData(): void {
    this._campaigns.set([]);
    this._templates.set([]);
    this._segments.set([]);
    this._automations.set([]);
    this._promotions.set([]);
    this._discountCodes.set([]);
    this._loyaltyProgram.set(null);
    this._tickets.set([]);
    this._ticketStats.set(null);
    this._slaConfig.set([]);
    this._reviews.set([]);
    this._reviewStats.set(null);
    this._reviewFilters.set({});
    this._pushNotifications.set([]);
    this._notificationTemplates.set([]);
    this._feedback.set([]);
    this._referralProgram.set(null);
    this._referrals.set([]);
    this._error.set(null);
  }

  /**
   * Refresh all loaded data
   */
  async refresh(): Promise<void> {
    await this.loadAllCRMData();
  }
}
