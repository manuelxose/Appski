import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

// Shared Components
import { AdminBreadcrumbsComponent } from "../../shared/admin-breadcrumbs/admin-breadcrumbs.component";
import { AdminLoaderComponent } from "../../shared/admin-loader/admin-loader.component";
import {
  SettingsTab,
  GeneralSettings,
  BookingSettings,
  PaymentSettings,
  NotificationSettings,
  PremiumSettings,
  UserSettings,
  SEOSettings,
  IntegrationSettings,
  SecuritySettings,
  LegalSettings,
} from "./admin-settings.models";

@Component({
  selector: "app-admin-settings",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminBreadcrumbsComponent,
    AdminLoaderComponent,
  ],
  templateUrl: "./admin-settings.component.html",
  styleUrls: ["./admin-settings.component.css"],
})
export class AdminSettingsComponent implements OnInit {
  // State signals
  activeTab = signal<SettingsTab>("general");
  isLoading = signal(false);
  isSaving = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Settings data
  generalSettings = signal<GeneralSettings>({
    siteName: "",
    siteDescription: "",
    logo: "",
    favicon: "",
    timezone: "Europe/Madrid",
    defaultLanguage: "es",
    availableLanguages: ["es", "en", "fr"],
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    defaultCurrency: "EUR",
    maintenanceMode: false,
    maintenanceMessage: "",
  });

  bookingSettings = signal<BookingSettings>({
    freeCancellationDays: 7,
    depositPercentage: 20,
    paymentDeadlineHours: 48,
    defaultCheckInTime: "15:00",
    defaultCheckOutTime: "11:00",
    minimumAge: 18,
    allowInstantBooking: true,
    requirePhoneVerification: false,
    autoConfirmBookings: true,
    maxAdvanceBookingDays: 365,
    minAdvanceBookingHours: 24,
  });

  paymentSettings = signal<PaymentSettings>({
    enabledGateways: ["stripe", "paypal"],
    stripePublicKey: "",
    stripeSecretKey: "",
    paypalClientId: "",
    paypalSecretKey: "",
    redsysCommerceCode: "",
    redsysTerminal: "",
    platformFeePercentage: 10,
    acceptedCurrencies: ["EUR", "USD", "GBP"],
    autoRefunds: true,
    refundProcessingDays: 7,
  });

  notificationSettings = signal<NotificationSettings>({
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    smtpFromEmail: "",
    smtpFromName: "",
    emailProvider: "smtp",
    sendgridApiKey: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioPhoneNumber: "",
    enableEmailNotifications: true,
    enableSmsNotifications: false,
    enablePushNotifications: true,
    bookingConfirmationEmail: true,
    bookingCancellationEmail: true,
    bookingReminderEmail: true,
    reminderDaysBefore: 3,
  });

  premiumSettings = signal<PremiumSettings>({
    plans: [],
    enablePremium: true,
    trialDays: 14,
    allowDowngrade: true,
  });

  userSettings = signal<UserSettings>({
    allowRegistration: true,
    requireEmailVerification: true,
    requirePhoneVerification: false,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: false,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 30,
    sessionTimeoutMinutes: 60,
    enableSocialLogin: true,
    googleClientId: "",
    facebookAppId: "",
    appleClientId: "",
  });

  seoSettings = signal<SEOSettings>({
    siteName: "",
    siteDescription: "",
    siteKeywords: [],
    defaultOGImage: "",
    twitterHandle: "",
    googleAnalyticsId: "",
    googleTagManagerId: "",
    facebookPixelId: "",
    enableSitemap: true,
    enableRobotsTxt: true,
    enableStructuredData: true,
  });

  integrationSettings = signal<IntegrationSettings>({
    googleMapsApiKey: "",
    mapboxAccessToken: "",
    cloudinaryCloudName: "",
    cloudinaryApiKey: "",
    cloudinaryApiSecret: "",
    s3AccessKey: "",
    s3SecretKey: "",
    s3Bucket: "",
    s3Region: "",
  });

  securitySettings = signal<SecuritySettings>({
    enableTwoFactor: false,
    enableRecaptcha: false,
    recaptchaSiteKey: "",
    recaptchaSecretKey: "",
    enableRateLimiting: true,
    maxRequestsPerMinute: 100,
    enableCORS: true,
    allowedOrigins: ["*"],
    enableCSP: false,
    cspPolicy: "",
  });

  legalSettings = signal<LegalSettings>({
    privacyPolicyUrl: "",
    termsOfServiceUrl: "",
    cookiePolicyUrl: "",
    gdprCompliant: true,
    cookieConsentEnabled: true,
    dataRetentionDays: 730,
    enableDataExport: true,
    enableDataDeletion: true,
  });

  // Breadcrumbs
  breadcrumbs = [
    { label: "Dashboard", url: "/admin/dashboard" },
    { label: "Configuración", url: "/admin/settings" },
  ];

  // Tabs configuration
  tabs = [
    { id: "general" as SettingsTab, label: "General", icon: "⚙️" },
    { id: "booking" as SettingsTab, label: "Reservas", icon: "📅" },
    { id: "payments" as SettingsTab, label: "Pagos", icon: "💳" },
    { id: "notifications" as SettingsTab, label: "Notificaciones", icon: "🔔" },
    { id: "premium" as SettingsTab, label: "Premium", icon: "👑" },
    { id: "users" as SettingsTab, label: "Usuarios", icon: "👥" },
    { id: "seo" as SettingsTab, label: "SEO", icon: "🔍" },
    { id: "integrations" as SettingsTab, label: "Integraciones", icon: "🔌" },
    { id: "security" as SettingsTab, label: "Seguridad", icon: "🔐" },
    { id: "legal" as SettingsTab, label: "Legal", icon: "📜" },
  ];

  // Computed
  hasUnsavedChanges = computed(() => false); // TODO: Implement dirty check

  ngOnInit(): void {
    this.loadAllSettings();
  }

  async loadAllSettings(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [
        general,
        booking,
        payments,
        notifications,
        premium,
        users,
        seo,
        integrations,
      ] = await Promise.all([
        fetch("/assets/mocks/settings-general.json").then((r) => r.json()),
        fetch("/assets/mocks/settings-booking.json").then((r) => r.json()),
        fetch("/assets/mocks/settings-payments.json").then((r) => r.json()),
        fetch("/assets/mocks/settings-notifications.json").then((r) =>
          r.json()
        ),
        fetch("/assets/mocks/settings-premium.json").then((r) => r.json()),
        fetch("/assets/mocks/settings-users.json").then((r) => r.json()),
        fetch("/assets/mocks/settings-seo.json").then((r) => r.json()),
        fetch("/assets/mocks/settings-integrations.json").then((r) => r.json()),
      ]);

      this.generalSettings.set(general);
      this.bookingSettings.set(booking);
      this.paymentSettings.set(payments);
      this.notificationSettings.set(notifications);
      this.premiumSettings.set(premium);
      this.userSettings.set(users);
      this.seoSettings.set(seo);
      this.integrationSettings.set(integrations);
    } catch (err) {
      this.error.set("Error al cargar la configuración");
      console.error("Error loading settings:", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  setActiveTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
    this.successMessage.set(null);
    this.error.set(null);
  }

  async saveCurrentTab(): Promise<void> {
    this.isSaving.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    try {
      const tab = this.activeTab();
      console.log(`Guardando configuración de ${tab}...`);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.successMessage.set("Configuración guardada correctamente");

      // Clear success message after 3 seconds
      setTimeout(() => {
        this.successMessage.set(null);
      }, 3000);
    } catch (err) {
      this.error.set("Error al guardar la configuración");
      console.error("Error saving settings:", err);
    } finally {
      this.isSaving.set(false);
    }
  }

  resetCurrentTab(): void {
    const tab = this.activeTab();
    console.log(`Reiniciando configuración de ${tab}...`);
    this.loadAllSettings();
  }

  // General Settings Helpers
  addLanguage(language: string): void {
    const current = this.generalSettings();
    if (!current.availableLanguages.includes(language)) {
      this.generalSettings.update((settings) => ({
        ...settings,
        availableLanguages: [...settings.availableLanguages, language],
      }));
    }
  }

  removeLanguage(language: string): void {
    this.generalSettings.update((settings) => ({
      ...settings,
      availableLanguages: settings.availableLanguages.filter(
        (lang) => lang !== language
      ),
    }));
  }

  // Payment Settings Helpers
  toggleGateway(gateway: string): void {
    const current = this.paymentSettings();
    const enabled = current.enabledGateways.includes(gateway);

    this.paymentSettings.update((settings) => ({
      ...settings,
      enabledGateways: enabled
        ? settings.enabledGateways.filter((g) => g !== gateway)
        : [...settings.enabledGateways, gateway],
    }));
  }

  // Integration Settings Helpers
  // TODO: Webhooks require extension of IntegrationSettings interface
  /*
  addWebhook(): void {
    const newWebhook = {
      id: `webhook-${Date.now()}`,
      name: "",
      url: "",
      events: [],
      active: true,
      secret: this.generateWebhookSecret(),
    };

    this.integrationSettings.update((settings) => ({
      ...settings,
      webhooks: [...(settings.webhooks || []), newWebhook],
    }));
  }

  removeWebhook(id: string): void {
    this.integrationSettings.update((settings) => ({
      ...settings,
      webhooks: (settings.webhooks || []).filter((w: any) => w.id !== id),
    }));
  }
  */

  generateWebhookSecret(): string {
    return "whsec_" + Math.random().toString(36).substring(2, 15);
  }

  // Security Settings Helpers
  // TODO: IP Whitelist requires extension of SecuritySettings interface
  /*
  addToIpWhitelist(ip: string): void {
    if (ip && !(this.securitySettings().ipWhitelist || []).includes(ip)) {
      this.securitySettings.update((settings) => ({
        ...settings,
        ipWhitelist: [...(settings.ipWhitelist || []), ip],
      }));
    }
  }

  removeFromIpWhitelist(ip: string): void {
    this.securitySettings.update((settings) => ({
      ...settings,
      ipWhitelist: (settings.ipWhitelist || []).filter((item: string) => item !== ip),
    }));
  }
  */

  testSmtpConnection(): void {
    console.log("Testing SMTP connection...");
    // TODO: Implement SMTP test
  }

  testWebhook(webhookId: string): void {
    console.log("Testing webhook:", webhookId);
    // TODO: Implement webhook test
  }

  exportSettings(): void {
    const allSettings = {
      general: this.generalSettings(),
      booking: this.bookingSettings(),
      payments: this.paymentSettings(),
      notifications: this.notificationSettings(),
      premium: this.premiumSettings(),
      users: this.userSettings(),
      seo: this.seoSettings(),
      integrations: this.integrationSettings(),
      security: this.securitySettings(),
      legal: this.legalSettings(),
    };

    const dataStr = JSON.stringify(allSettings, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `settings-export-${new Date().toISOString()}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  importSettings(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const settings = JSON.parse(e.target?.result as string);

        if (settings.general) this.generalSettings.set(settings.general);
        if (settings.booking) this.bookingSettings.set(settings.booking);
        if (settings.payments) this.paymentSettings.set(settings.payments);
        if (settings.notifications)
          this.notificationSettings.set(settings.notifications);
        if (settings.premium) this.premiumSettings.set(settings.premium);
        if (settings.users) this.userSettings.set(settings.users);
        if (settings.seo) this.seoSettings.set(settings.seo);
        if (settings.integrations)
          this.integrationSettings.set(settings.integrations);
        if (settings.security) this.securitySettings.set(settings.security);
        if (settings.legal) this.legalSettings.set(settings.legal);

        this.successMessage.set("Configuración importada correctamente");
      } catch (err) {
        this.error.set("Error al importar la configuración");
        console.error("Import error:", err);
      }
    };

    reader.readAsText(file);
  }
}
