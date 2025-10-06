import { Component, signal } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
  divider?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: "app-admin-sidebar",
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: "./admin-sidebar.component.html",
  styleUrls: ["./admin-sidebar.component.css"],
})
export class AdminSidebarComponent {
  isCollapsed = signal(false);

  // Navegación organizada por grupos
  navGroups: NavGroup[] = [
    {
      title: "Principal",
      items: [
        { label: "Dashboard", route: "/admin/dashboard", icon: "dashboard" },
      ],
    },
    {
      title: "📊 Analítica",
      items: [
        {
          label: "Visión General",
          route: "/admin/analytics",
          icon: "bar_chart",
        },
        {
          label: "Analítica General",
          route: "/admin/analytics/general",
          icon: "globe",
        },
        {
          label: "Analítica Financiera",
          route: "/admin/analytics/financial",
          icon: "money",
        },
        {
          label: "Analítica Usuarios",
          route: "/admin/analytics/users",
          icon: "users",
        },
        {
          label: "Analítica Estaciones",
          route: "/admin/analytics/stations",
          icon: "mountain",
        },
        {
          label: "Analítica Reservas",
          route: "/admin/analytics/bookings",
          icon: "calendar",
        },
        {
          label: "Analítica Marketing",
          route: "/admin/analytics/marketing",
          icon: "megaphone",
        },
      ],
    },
    {
      title: "🎯 Gestión",
      items: [
        {
          label: "Usuarios",
          route: "/admin/users",
          icon: "group",
          badge: 1247,
        },
        {
          label: "Estaciones",
          route: "/admin/stations",
          icon: "terrain",
          badge: 12,
        },
        {
          label: "Reservas",
          route: "/admin/bookings",
          icon: "receipt_long",
          badge: 3456,
        },
        { label: "Pagos", route: "/admin/payments", icon: "credit_card" },
        {
          label: "Alojamientos",
          route: "/admin/lodgings",
          icon: "hotel",
          badge: 89,
        },
        { label: "Tiendas", route: "/admin/shops", icon: "store", badge: 34 },
        { label: "Blog", route: "/admin/blog", icon: "article", badge: 156 },
      ],
    },
    {
      title: "💼 Financiero",
      items: [
        {
          label: "Facturas",
          route: "/admin/invoices",
          icon: "receipt",
          badge: 2341,
        },
        { label: "Comisiones", route: "/admin/commissions", icon: "percent" },
        { label: "Informes", route: "/admin/financial-reports", icon: "chart" },
      ],
    },
    {
      title: "📧 CRM",
      items: [
        {
          label: "Email Marketing",
          route: "/admin/email-marketing",
          icon: "email",
          badge: 45,
        },
        {
          label: "Campañas",
          route: "/admin/campaigns",
          icon: "campaign",
          badge: 12,
        },
        {
          label: "Soporte",
          route: "/admin/support",
          icon: "support",
          badge: 18,
        },
        {
          label: "Reseñas",
          route: "/admin/reviews",
          icon: "star",
          badge: 1823,
        },
        {
          label: "Push Notif.",
          route: "/admin/push-notifications",
          icon: "notifications",
        },
      ],
    },
    {
      title: "⚙️ Operaciones",
      items: [
        {
          label: "Inventario",
          route: "/admin/inventory",
          icon: "inventory",
          badge: 34,
        },
        {
          label: "Mantenimiento",
          route: "/admin/maintenance",
          icon: "build",
          badge: 5,
        },
        {
          label: "Incidentes",
          route: "/admin/incidents",
          icon: "warning",
          badge: 1,
        },
      ],
    },
    {
      title: "⚙️ Sistema",
      items: [
        { label: "Configuración", route: "/admin/settings", icon: "settings" },
      ],
    },
  ];

  // Vista plana para compatibilidad
  get navItems(): NavItem[] {
    return this.navGroups.flatMap((group) => group.items);
  }

  toggleSidebar() {
    this.isCollapsed.update((v) => !v);
  }
}
