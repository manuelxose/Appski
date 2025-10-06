import { Routes } from "@angular/router";
import { adminGuard, authGuard } from "./guards/auth.guard";

export const routes: Routes = [
  {
    path: "",
    loadComponent: () => import("./pages/home/home").then((m) => m.Home),
  },
  {
    path: "estaciones",
    loadComponent: () =>
      import("./pages/stations-list/stations-list").then((m) => m.StationsList),
  },
  {
    path: "estacion/:slug",
    loadComponent: () =>
      import("./pages/station-detail/station-detail").then(
        (m) => m.StationDetail
      ),
  },
  {
    path: "alojamientos",
    loadComponent: () =>
      import("./pages/lodging-marketplace/lodging-marketplace").then(
        (m) => m.LodgingMarketplace
      ),
  },
  {
    path: "alojamientos/:station",
    loadComponent: () =>
      import("./pages/lodging-marketplace/lodging-marketplace").then(
        (m) => m.LodgingMarketplace
      ),
  },
  {
    path: "alojamiento/:id",
    loadComponent: () =>
      import("./pages/lodging-detail/lodging-detail").then(
        (m) => m.LodgingDetailComponent
      ),
  },
  {
    path: "alquiler-material",
    loadComponent: () =>
      import("./pages/rental-marketplace/rental-marketplace.component").then(
        (m) => m.RentalMarketplaceComponent
      ),
  },
  {
    path: "tienda/dashboard",
    loadComponent: () =>
      import(
        "./pages/shop-owner-dashboard/shop-owner-dashboard.component"
      ).then((m) => m.ShopOwnerDashboardComponent),
    canActivate: [authGuard],
  },
  {
    path: "tienda/:slug",
    loadComponent: () =>
      import("./pages/shop-detail/shop-detail.component").then(
        (m) => m.ShopDetailComponent
      ),
  },
  {
    path: "plan",
    loadComponent: () =>
      import("./pages/planner/planner").then((m) => m.Planner),
  },
  {
    path: "meteorologia",
    loadComponent: () =>
      import("./pages/weather/tiempo-page.component").then(
        (m) => m.TiempoPageComponent
      ),
  },
  {
    path: ":lang/estacion/:slug/tiempo",
    loadComponent: () =>
      import("./pages/weather/tiempo-page.component").then(
        (m) => m.TiempoPageComponent
      ),
  },
  {
    path: "estacion/:slug/tiempo",
    loadComponent: () =>
      import("./pages/weather/tiempo-page.component").then(
        (m) => m.TiempoPageComponent
      ),
  },
  {
    path: "premium",
    loadComponent: () =>
      import("./pages/premium/premium").then((m) => m.PremiumComponent),
  },
  {
    path: "blog",
    loadComponent: () =>
      import("./pages/blog-list/blog-list").then((m) => m.BlogList),
  },
  {
    path: "blog/:slug",
    loadComponent: () =>
      import("./pages/blog-article/blog-article").then((m) => m.BlogArticle),
  },
  {
    path: "login",
    loadComponent: () => import("./pages/login/login").then((m) => m.Login),
  },
  {
    path: "cuenta",
    loadComponent: () =>
      import("./pages/account/account").then((m) => m.Account),
    canActivate: [authGuard],
  },
  {
    path: "admin",
    loadComponent: () => import("./pages/admin/admin").then((m) => m.Admin),
    canActivate: [adminGuard],
    children: [
      {
        path: "",
        redirectTo: "dashboard",
        pathMatch: "full",
      },
      {
        path: "dashboard",
        loadComponent: () =>
          import("./pages/admin/dashboard/dashboard.component").then(
            (m) => m.AdminDashboardComponent
          ),
      },
      {
        path: "analytics",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-analytics/admin-analytics.component"
          ).then((m) => m.AdminAnalyticsComponent),
      },
      {
        path: "analytics/general",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-analytics-general/admin-analytics-general.component"
          ).then((m) => m.AdminAnalyticsGeneralComponent),
      },
      {
        path: "analytics/financial",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-analytics-financial/admin-analytics-financial.component"
          ).then((m) => m.AdminAnalyticsFinancialComponent),
      },
      {
        path: "analytics/users",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-analytics-users/admin-analytics-users.component"
          ).then((m) => m.AdminAnalyticsUsersComponent),
      },
      {
        path: "analytics/stations",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-analytics-stations/admin-analytics-stations.component"
          ).then((m) => m.AdminAnalyticsStationsComponent),
      },
      {
        path: "analytics/bookings",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-analytics-bookings/admin-analytics-bookings.component"
          ).then((m) => m.AdminAnalyticsBookingsComponent),
      },
      {
        path: "analytics/marketing",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-analytics-marketing/admin-analytics-marketing.component"
          ).then((m) => m.AdminAnalyticsMarketingComponent),
      },
      {
        path: "invoices",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-invoices/admin-invoices.component"
          ).then((m) => m.AdminInvoicesComponent),
      },
      {
        path: "commissions",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-commissions/admin-commissions.component"
          ).then((m) => m.AdminCommissionsComponent),
      },
      {
        path: "financial-reports",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-financial-reports/admin-financial-reports.component"
          ).then((m) => m.AdminFinancialReportsComponent),
      },
      // Grupo D - CRM (Email, Campañas, Soporte, Reseñas, Push)
      {
        path: "email-marketing",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-email-marketing/admin-email-marketing.component"
          ).then((m) => m.AdminEmailMarketingComponent),
      },
      {
        path: "campaigns",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-campaigns/admin-campaigns.component"
          ).then((m) => m.AdminCampaignsComponent),
      },
      {
        path: "support",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-support/admin-support.component"
          ).then((m) => m.AdminSupportComponent),
      },
      {
        path: "reviews",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-reviews/admin-reviews.component"
          ).then((m) => m.AdminReviewsComponent),
      },
      {
        path: "push-notifications",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-push-notifications/admin-push-notifications.component"
          ).then((m) => m.AdminPushNotificationsComponent),
      },
      // Grupo E - Operaciones (Inventario, Mantenimiento, Incidentes, Planificación)
      {
        path: "inventory",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-inventory/admin-inventory.component"
          ).then((m) => m.AdminInventoryComponent),
      },
      {
        path: "maintenance",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-maintenance/admin-maintenance.component"
          ).then((m) => m.AdminMaintenanceComponent),
      },
      {
        path: "incidents",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-incidents/admin-incidents.component"
          ).then((m) => m.AdminIncidentsComponent),
      },
      // Grupo B - Gestión
      {
        path: "users",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-users/admin-users.component"
          ).then((m) => m.AdminUsersComponent),
      },
      {
        path: "stations",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-stations/admin-stations.component"
          ).then((m) => m.AdminStationsComponent),
      },
      {
        path: "bookings",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-bookings/admin-bookings.component"
          ).then((m) => m.AdminBookingsComponent),
      },
      {
        path: "payments",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-payments/admin-payments.component"
          ).then((m) => m.AdminPaymentsComponent),
      },
      {
        path: "lodgings",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-lodgings/admin-lodgings.component"
          ).then((m) => m.AdminLodgingsComponent),
      },
      {
        path: "shops",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-shops/admin-shops.component"
          ).then((m) => m.AdminShopsComponent),
      },
      {
        path: "blog",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-blog/admin-blog.component"
          ).then((m) => m.AdminBlogComponent),
      },
      {
        path: "settings",
        loadComponent: () =>
          import(
            "./pages/admin/components/modules/admin-settings/admin-settings.component"
          ).then((m) => m.AdminSettingsComponent),
      },
    ],
  },
];
