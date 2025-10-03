/**
 * Account Service - Nieve Platform
 * Gestiona toda la información de la cuenta del usuario con signal stores
 * Patrón: Signal-based state management con métodos async para API calls
 */

import { Injectable, signal, computed, effect } from "@angular/core";
import type {
  UserProfile,
  Booking,
  Preferences,
  Session,
  SecuritySettings,
  AccountStats,
  UpdateProfileRequest,
  UpdatePreferencesRequest,
  ChangePasswordRequest,
  ApiResponse,
  Notification,
  PremiumSubscription,
  ActivityStats,
  Document,
  Friend,
  Group,
  FriendRequest,
  GroupInvitation,
  Invoice,
  SubscriptionPlanInfo,
  SubscriptionPlan,
  BillingCycle,
} from "../models/account.models";

// Import mocks directly for SSR compatibility
import userProfileMock from "../../../../assets/mocks/account/user-profile.mock.json";
import bookingsMock from "../../../../assets/mocks/account/bookings.mock.json";
import preferencesMock from "../../../../assets/mocks/account/preferences.mock.json";
import sessionsMock from "../../../../assets/mocks/account/sessions.mock.json";
import statsMock from "../../../../assets/mocks/account/stats.mock.json";
import notificationsMock from "../../../../assets/mocks/account/notifications.mock.json";
import premiumMock from "../../../../assets/mocks/account/premium-subscription.mock.json";
import activityMock from "../../../../assets/mocks/account/activity-stats.mock.json";
import documentsMock from "../../../../assets/mocks/account/documents.mock.json";
import socialMock from "../../../../assets/mocks/account/social-friends.mock.json";

@Injectable({
  providedIn: "root",
})
export class AccountService {
  // ========== SIGNAL STORES ==========
  private readonly _userProfile = signal<UserProfile | null>(null);
  private readonly _bookings = signal<Booking[]>([]);
  private readonly _preferences = signal<Preferences | null>(null);
  private readonly _sessions = signal<Session[]>([]);
  private readonly _securitySettings = signal<SecuritySettings | null>(null);
  private readonly _stats = signal<AccountStats | null>(null);

  // New signal stores for extended features
  private readonly _notifications = signal<Notification[]>([]);
  private readonly _premiumSubscription = signal<PremiumSubscription | null>(
    null
  );
  private readonly _activityStats = signal<ActivityStats | null>(null);
  private readonly _documents = signal<Document[]>([]);
  private readonly _friends = signal<Friend[]>([]);
  private readonly _groups = signal<Group[]>([]);
  private readonly _friendRequests = signal<FriendRequest[]>([]);
  private readonly _groupInvitations = signal<GroupInvitation[]>([]);
  private readonly _availablePlans = signal<SubscriptionPlanInfo[]>([]);
  private readonly _invoices = signal<Invoice[]>([]);

  // Loading states
  private readonly _isLoadingProfile = signal<boolean>(false);
  private readonly _isLoadingBookings = signal<boolean>(false);
  private readonly _isLoadingPreferences = signal<boolean>(false);
  private readonly _isLoadingSessions = signal<boolean>(false);
  private readonly _isLoadingNotifications = signal<boolean>(false);
  private readonly _isLoadingPremium = signal<boolean>(false);
  private readonly _isLoadingActivity = signal<boolean>(false);
  private readonly _isLoadingDocuments = signal<boolean>(false);
  private readonly _isLoadingSocial = signal<boolean>(false);

  // Error states
  private readonly _profileError = signal<string | null>(null);
  private readonly _bookingsError = signal<string | null>(null);
  private readonly _preferencesError = signal<string | null>(null);
  private readonly _sessionsError = signal<string | null>(null);
  private readonly _notificationsError = signal<string | null>(null);
  private readonly _premiumError = signal<string | null>(null);
  private readonly _activityError = signal<string | null>(null);
  private readonly _documentsError = signal<string | null>(null);
  private readonly _socialError = signal<string | null>(null);

  // ========== PUBLIC READONLY SIGNALS ==========
  readonly userProfile = this._userProfile.asReadonly();
  readonly bookings = this._bookings.asReadonly();
  readonly preferences = this._preferences.asReadonly();
  readonly sessions = this._sessions.asReadonly();
  readonly securitySettings = this._securitySettings.asReadonly();
  readonly stats = this._stats.asReadonly();

  // Extended features
  readonly notifications = this._notifications.asReadonly();
  readonly premiumSubscription = this._premiumSubscription.asReadonly();
  readonly activityStats = this._activityStats.asReadonly();
  readonly documents = this._documents.asReadonly();
  readonly friends = this._friends.asReadonly();
  readonly groups = this._groups.asReadonly();
  readonly friendRequests = this._friendRequests.asReadonly();
  readonly groupInvitations = this._groupInvitations.asReadonly();
  readonly availablePlans = this._availablePlans.asReadonly();
  readonly invoices = this._invoices.asReadonly();

  readonly isLoadingProfile = this._isLoadingProfile.asReadonly();
  readonly isLoadingBookings = this._isLoadingBookings.asReadonly();
  readonly isLoadingPreferences = this._isLoadingPreferences.asReadonly();
  readonly isLoadingSessions = this._isLoadingSessions.asReadonly();
  readonly isLoadingNotifications = this._isLoadingNotifications.asReadonly();
  readonly isLoadingPremium = this._isLoadingPremium.asReadonly();
  readonly isLoadingActivity = this._isLoadingActivity.asReadonly();
  readonly isLoadingDocuments = this._isLoadingDocuments.asReadonly();
  readonly isLoadingSocial = this._isLoadingSocial.asReadonly();

  readonly profileError = this._profileError.asReadonly();
  readonly bookingsError = this._bookingsError.asReadonly();
  readonly preferencesError = this._preferencesError.asReadonly();
  readonly sessionsError = this._sessionsError.asReadonly();
  readonly notificationsError = this._notificationsError.asReadonly();
  readonly premiumError = this._premiumError.asReadonly();
  readonly activityError = this._activityError.asReadonly();
  readonly documentsError = this._documentsError.asReadonly();
  readonly socialError = this._socialError.asReadonly();

  // ========== COMPUTED SIGNALS ==========
  readonly upcomingBookings = computed(() =>
    this._bookings().filter((b) => b.status === "upcoming")
  );

  readonly completedBookings = computed(() =>
    this._bookings().filter((b) => b.status === "completed")
  );

  readonly isPremiumUser = computed(
    () => this._userProfile()?.isPremium ?? false
  );

  readonly hasActiveBookings = computed(
    () => this.upcomingBookings().length > 0
  );

  readonly favoriteStationsList = computed(
    () => this._preferences()?.favoriteStations ?? []
  );

  // Extended computed signals
  readonly unreadNotifications = computed(() =>
    this._notifications().filter((n) => !n.read)
  );

  readonly unreadNotificationsCount = computed(
    () => this.unreadNotifications().length
  );

  readonly pendingFriendRequestsCount = computed(
    () => this._friendRequests().length
  );

  readonly pendingGroupInvitationsCount = computed(
    () => this._groupInvitations().length
  );

  readonly totalDocuments = computed(() => this._documents().length);

  readonly expiredDocuments = computed(() => {
    const now = new Date();
    return this._documents().filter((doc) => {
      if (!doc.expiryDate) return false;
      return new Date(doc.expiryDate) < now;
    });
  });

  // Social computed signals
  readonly totalFriends = computed(() => this._friends().length);
  readonly totalFriendRequests = computed(() => this._friendRequests().length);
  readonly totalGroups = computed(() => this._groups().length);

  readonly isSubscriptionActive = computed(
    () => this._premiumSubscription()?.status === "active"
  );

  // Combined premium data (subscription + plans + invoices)
  readonly premiumSubscriptionData = computed(() => {
    const subscription = this._premiumSubscription();
    if (!subscription) return null;

    return {
      subscription,
      availablePlans: this._availablePlans(),
      invoices: this._invoices(),
    };
  });

  // ========== MOCK API BASE PATH ==========
  private readonly mockBasePath = "/assets/mocks/account";

  constructor() {
    // Auto-load data on service initialization
    effect(() => {
      const profile = this._userProfile();
      if (profile) {
        console.log("✅ User profile loaded:", profile.name);
      }
    });
  }

  // ========== USER PROFILE METHODS ==========
  async loadUserProfile(): Promise<void> {
    this._isLoadingProfile.set(true);
    this._profileError.set(null);

    try {
      await this.simulateApiDelay(300);
      const data: UserProfile = userProfileMock as UserProfile;
      this._userProfile.set(data);

      // También cargamos las estadísticas
      await this.loadAccountStats();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      this._profileError.set(errorMessage);
      console.error("❌ Error loading user profile:", error);
    } finally {
      this._isLoadingProfile.set(false);
    }
  }

  async updateUserProfile(
    updates: UpdateProfileRequest
  ): Promise<ApiResponse<UserProfile>> {
    this._isLoadingProfile.set(true);
    this._profileError.set(null);

    try {
      // Simulamos delay de API
      await this.simulateApiDelay(500);

      const currentProfile = this._userProfile();
      if (!currentProfile) {
        throw new Error("No user profile loaded");
      }

      // Actualizamos el perfil localmente
      const updatedProfile: UserProfile = {
        ...currentProfile,
        ...updates,
      };

      this._userProfile.set(updatedProfile);

      // En producción: await fetch('/api/account/profile', { method: 'PUT', body: JSON.stringify(updates) })
      return {
        success: true,
        data: updatedProfile,
        message: "Perfil actualizado correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al actualizar perfil";
      this._profileError.set(errorMessage);
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    } finally {
      this._isLoadingProfile.set(false);
    }
  }

  // ========== BOOKINGS METHODS ==========
  async loadBookings(): Promise<void> {
    this._isLoadingBookings.set(true);
    this._bookingsError.set(null);

    try {
      await this.simulateApiDelay(250);
      const data: Booking[] = bookingsMock as Booking[];
      // Ordenar por fecha descendente
      const sortedBookings = data.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      this._bookings.set(sortedBookings);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      this._bookingsError.set(errorMessage);
      console.error("❌ Error loading bookings:", error);
    } finally {
      this._isLoadingBookings.set(false);
    }
  }

  async cancelBooking(bookingId: string): Promise<ApiResponse<Booking>> {
    try {
      await this.simulateApiDelay(300);

      const bookings = this._bookings();
      const bookingIndex = bookings.findIndex((b) => b.id === bookingId);

      if (bookingIndex === -1) {
        throw new Error("Reserva no encontrada");
      }

      const updatedBooking: Booking = {
        ...bookings[bookingIndex],
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      };

      const updatedBookings = [...bookings];
      updatedBookings[bookingIndex] = updatedBooking;
      this._bookings.set(updatedBookings);

      return {
        success: true,
        data: updatedBooking,
        message: "Reserva cancelada correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al cancelar reserva";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  // ========== PREFERENCES METHODS ==========
  async loadPreferences(): Promise<void> {
    this._isLoadingPreferences.set(true);
    this._preferencesError.set(null);

    try {
      await this.simulateApiDelay(200);
      const data: Preferences = preferencesMock as Preferences;
      this._preferences.set(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      this._preferencesError.set(errorMessage);
      console.error("❌ Error loading preferences:", error);
    } finally {
      this._isLoadingPreferences.set(false);
    }
  }

  async updatePreferences(
    updates: UpdatePreferencesRequest
  ): Promise<ApiResponse<Preferences>> {
    this._isLoadingPreferences.set(true);
    this._preferencesError.set(null);

    try {
      await this.simulateApiDelay(400);

      const currentPreferences = this._preferences();
      if (!currentPreferences) {
        throw new Error("No preferences loaded");
      }

      const updatedPreferences: Preferences = {
        ...currentPreferences,
        ...updates,
        notifications: {
          ...currentPreferences.notifications,
          ...(updates.notifications || {}),
        },
      };

      this._preferences.set(updatedPreferences);

      return {
        success: true,
        data: updatedPreferences,
        message: "Preferencias actualizadas correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al actualizar preferencias";
      this._preferencesError.set(errorMessage);
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    } finally {
      this._isLoadingPreferences.set(false);
    }
  }

  async addFavoriteStation(
    stationName: string
  ): Promise<ApiResponse<string[]>> {
    try {
      await this.simulateApiDelay(200);

      const currentPreferences = this._preferences();
      if (!currentPreferences) {
        throw new Error("No preferences loaded");
      }

      const favoriteStations = [...currentPreferences.favoriteStations];
      if (!favoriteStations.includes(stationName)) {
        favoriteStations.push(stationName);
        await this.updatePreferences({ favoriteStations });
      }

      return {
        success: true,
        data: favoriteStations,
        message: "Estación añadida a favoritos",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al añadir favorito";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async removeFavoriteStation(
    stationName: string
  ): Promise<ApiResponse<string[]>> {
    try {
      await this.simulateApiDelay(200);

      const currentPreferences = this._preferences();
      if (!currentPreferences) {
        throw new Error("No preferences loaded");
      }

      const favoriteStations = currentPreferences.favoriteStations.filter(
        (station) => station !== stationName
      );
      await this.updatePreferences({ favoriteStations });

      return {
        success: true,
        data: favoriteStations,
        message: "Estación eliminada de favoritos",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al eliminar favorito";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  // ========== SECURITY METHODS ==========
  async loadSessions(): Promise<void> {
    this._isLoadingSessions.set(true);
    this._sessionsError.set(null);

    try {
      await this.simulateApiDelay(200);
      const data: Session[] = sessionsMock as Session[];
      this._sessions.set(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      this._sessionsError.set(errorMessage);
      console.error("❌ Error loading sessions:", error);
    } finally {
      this._isLoadingSessions.set(false);
    }
  }

  async changePassword(
    request: ChangePasswordRequest
  ): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(600);

      // Validaciones
      if (request.newPassword !== request.confirmPassword) {
        throw new Error("Las contraseñas no coinciden");
      }

      if (request.newPassword.length < 8) {
        throw new Error("La contraseña debe tener al menos 8 caracteres");
      }

      // En producción: await fetch('/api/account/change-password', { method: 'POST', body: JSON.stringify(request) })

      return {
        success: true,
        message: "Contraseña cambiada correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al cambiar contraseña";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const sessions = this._sessions().filter((s) => s.id !== sessionId);
      this._sessions.set(sessions);

      return {
        success: true,
        message: "Sesión cerrada correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al cerrar sesión";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  // ========== STATS METHODS ==========
  private async loadAccountStats(): Promise<void> {
    try {
      await this.simulateApiDelay(150);
      const data: AccountStats = statsMock as AccountStats;
      this._stats.set(data);
    } catch (error) {
      console.error("❌ Error loading account stats:", error);
    }
  }

  // ========== NOTIFICATIONS METHODS ==========
  async loadNotifications(): Promise<void> {
    this._isLoadingNotifications.set(true);
    this._notificationsError.set(null);

    try {
      await this.simulateApiDelay(200);
      const data: Notification[] = notificationsMock as Notification[];
      this._notifications.set(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      this._notificationsError.set(errorMessage);
      console.error("❌ Error loading notifications:", error);
    } finally {
      this._isLoadingNotifications.set(false);
    }
  }

  async markNotificationAsRead(
    notificationId: string
  ): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(200);

      const notifications = this._notifications().map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      this._notifications.set(notifications);

      return {
        success: true,
        message: "Notificación marcada como leída",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al marcar notificación";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const notifications = this._notifications().map((n) => ({
        ...n,
        read: true,
      }));
      this._notifications.set(notifications);

      return {
        success: true,
        message: "Todas las notificaciones marcadas como leídas",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al marcar notificaciones";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async deleteNotification(notificationId: string): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(200);

      const notifications = this._notifications().filter(
        (n) => n.id !== notificationId
      );
      this._notifications.set(notifications);

      return {
        success: true,
        message: "Notificación eliminada",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al eliminar notificación";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  // ========== PREMIUM SUBSCRIPTION METHODS ==========
  async loadPremiumSubscription(): Promise<void> {
    this._isLoadingPremium.set(true);
    this._premiumError.set(null);

    try {
      await this.simulateApiDelay(250);
      const data: {
        subscription: PremiumSubscription;
        availablePlans: SubscriptionPlanInfo[];
        invoices: Invoice[];
      } = premiumMock as {
        subscription: PremiumSubscription;
        availablePlans: SubscriptionPlanInfo[];
        invoices: Invoice[];
      };
      this._premiumSubscription.set(data.subscription);
      this._availablePlans.set(data.availablePlans);
      this._invoices.set(data.invoices);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      this._premiumError.set(errorMessage);
      console.error("❌ Error loading premium subscription:", error);
    } finally {
      this._isLoadingPremium.set(false);
    }
  }

  async upgradePlan(planId: string): Promise<ApiResponse<PremiumSubscription>> {
    try {
      await this.simulateApiDelay(800);

      // En producción: await fetch('/api/subscription/upgrade', { method: 'POST', body: JSON.stringify({ planId }) })
      console.log("Upgrading to plan:", planId);

      return {
        success: true,
        message: "Plan actualizado correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al actualizar plan";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async updateAutoRenew(autoRenew: boolean): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const currentSubscription = this._premiumSubscription();
      if (currentSubscription) {
        const updatedSubscription: PremiumSubscription = {
          ...currentSubscription,
          autoRenew,
        };
        this._premiumSubscription.set(updatedSubscription);
      }

      return {
        success: true,
        message: "Configuración de renovación actualizada",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al actualizar renovación automática";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async changePlan(
    plan: string,
    billingCycle: string
  ): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(600);

      const currentSubscription = this._premiumSubscription();
      if (currentSubscription) {
        const updatedSubscription: PremiumSubscription = {
          ...currentSubscription,
          plan: plan as SubscriptionPlan,
          billingCycle: billingCycle as BillingCycle,
          // En producción, aquí se calcularía el nuevo precio desde el backend
        };
        this._premiumSubscription.set(updatedSubscription);
      }

      return {
        success: true,
        message: "Plan actualizado correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al cambiar plan";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async downloadInvoice(invoiceId: string): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(400);

      // En producción: fetch(`/api/invoices/${invoiceId}/download`)
      console.log("Downloading invoice:", invoiceId);

      return {
        success: true,
        message: "Factura descargada correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al descargar factura";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async cancelSubscription(): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(500);

      const currentSubscription = this._premiumSubscription();
      if (currentSubscription) {
        const updatedSubscription: PremiumSubscription = {
          ...currentSubscription,
          status: "cancelled",
          autoRenew: false,
          cancelledAt: new Date().toISOString(),
        };
        this._premiumSubscription.set(updatedSubscription);
      }

      return {
        success: true,
        message: "Suscripción cancelada correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al cancelar suscripción";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  // ========== ACTIVITY STATS METHODS ==========
  async loadActivityStats(): Promise<void> {
    this._isLoadingActivity.set(true);
    this._activityError.set(null);

    try {
      await this.simulateApiDelay(250);
      const data: ActivityStats = activityMock as ActivityStats;
      this._activityStats.set(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      this._activityError.set(errorMessage);
      console.error("❌ Error loading activity stats:", error);
    } finally {
      this._isLoadingActivity.set(false);
    }
  }

  // ========== DOCUMENTS METHODS ==========
  async loadDocuments(): Promise<void> {
    this._isLoadingDocuments.set(true);
    this._documentsError.set(null);

    try {
      await this.simulateApiDelay(200);
      const data: Document[] = documentsMock as Document[];
      this._documents.set(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      this._documentsError.set(errorMessage);
      console.error("❌ Error loading documents:", error);
    } finally {
      this._isLoadingDocuments.set(false);
    }
  }

  async deleteDocument(documentId: string): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const documents = this._documents().filter((d) => d.id !== documentId);
      this._documents.set(documents);

      return {
        success: true,
        message: "Documento eliminado correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al eliminar documento";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  // ========== SOCIAL / FRIENDS METHODS ==========
  async loadSocialData(): Promise<void> {
    this._isLoadingSocial.set(true);
    this._socialError.set(null);

    try {
      await this.simulateApiDelay(250);
      const data: {
        friends: Friend[];
        pendingRequests: FriendRequest[];
        groups: Group[];
        groupInvitations: GroupInvitation[];
      } = socialMock as {
        friends: Friend[];
        pendingRequests: FriendRequest[];
        groups: Group[];
        groupInvitations: GroupInvitation[];
      };
      this._friends.set(data.friends);
      this._friendRequests.set(data.pendingRequests);
      this._groups.set(data.groups);
      this._groupInvitations.set(data.groupInvitations);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      this._socialError.set(errorMessage);
      console.error("❌ Error loading social data:", error);
    } finally {
      this._isLoadingSocial.set(false);
    }
  }

  async acceptFriendRequest(requestId: string): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const requests = this._friendRequests().filter((r) => r.id !== requestId);
      this._friendRequests.set(requests);

      return {
        success: true,
        message: "Solicitud de amistad aceptada",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al aceptar solicitud";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async rejectFriendRequest(requestId: string): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const requests = this._friendRequests().filter((r) => r.id !== requestId);
      this._friendRequests.set(requests);

      return {
        success: true,
        message: "Solicitud de amistad rechazada",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al rechazar solicitud";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async removeFriend(friendId: string): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const friends = this._friends().filter((f) => f.id !== friendId);
      this._friends.set(friends);

      return {
        success: true,
        message: "Amigo eliminado",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al eliminar amigo";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async acceptGroupInvitation(
    invitationId: string
  ): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const invitations = this._groupInvitations().filter(
        (i) => i.id !== invitationId
      );
      this._groupInvitations.set(invitations);

      return {
        success: true,
        message: "Invitación al grupo aceptada",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al aceptar invitación";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async rejectGroupInvitation(
    invitationId: string
  ): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const invitations = this._groupInvitations().filter(
        (i) => i.id !== invitationId
      );
      this._groupInvitations.set(invitations);

      return {
        success: true,
        message: "Invitación al grupo rechazada",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al rechazar invitación";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  async leaveGroup(groupId: string): Promise<ApiResponse<void>> {
    try {
      await this.simulateApiDelay(300);

      const groups = this._groups().filter((g) => g.id !== groupId);
      this._groups.set(groups);

      return {
        success: true,
        message: "Has salido del grupo correctamente",
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error al salir del grupo";
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
    }
  }

  // ========== UTILITY METHODS ==========
  async logout(): Promise<void> {
    // Limpiamos todo el estado
    this._userProfile.set(null);
    this._bookings.set([]);
    this._preferences.set(null);
    this._sessions.set([]);
    this._stats.set(null);
    this._notifications.set([]);
    this._premiumSubscription.set(null);
    this._activityStats.set(null);
    this._documents.set([]);
    this._friends.set([]);
    this._groups.set([]);
    this._friendRequests.set([]);
    this._groupInvitations.set([]);
    this._availablePlans.set([]);
    this._invoices.set([]);

    // En producción: await fetch('/api/auth/logout', { method: 'POST' })
    // Redirigir a login
    window.location.href = "/login";
  }

  private async simulateApiDelay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ========== INITIALIZATION ==========
  async initializeAccount(): Promise<void> {
    await Promise.all([
      this.loadUserProfile(),
      this.loadBookings(),
      this.loadPreferences(),
      this.loadSessions(),
      this.loadNotifications(),
      this.loadPremiumSubscription(),
      this.loadActivityStats(),
      this.loadDocuments(),
      this.loadSocialData(),
    ]);
  }
}
