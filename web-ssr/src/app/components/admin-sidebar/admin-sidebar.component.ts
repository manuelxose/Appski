import { Component, signal } from "@angular/core";
import { RouterLink, RouterLinkActive } from "@angular/router";

interface NavItem {
  label: string;
  route: string;
  icon: string;
  badge?: number;
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

  navItems: NavItem[] = [
    { label: "Dashboard", route: "/admin/dashboard", icon: "dashboard" },
    { label: "Analytics", route: "/admin/analytics", icon: "bar_chart" },
    {
      label: "Estaciones",
      route: "/admin/stations",
      icon: "terrain",
      badge: 12,
    },
    { label: "Usuarios", route: "/admin/users", icon: "group" },
    {
      label: "Reservas",
      route: "/admin/bookings",
      icon: "receipt_long",
      badge: 23,
    },
    { label: "Pagos", route: "/admin/payments", icon: "payments" },
    { label: "Alojamientos", route: "/admin/lodgings", icon: "hotel" },
    { label: "Tiendas", route: "/admin/shops", icon: "store" },
    { label: "Blog", route: "/admin/blog", icon: "article", badge: 5 },
    { label: "Configuración", route: "/admin/settings", icon: "settings" },
  ];

  toggleSidebar() {
    this.isCollapsed.update((v) => !v);
  }
}
