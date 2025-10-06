import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { AdminBreadcrumbsComponent } from "../components/shared/admin-breadcrumbs/admin-breadcrumbs.component";

interface ModuleCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  count?: number;
  status?: string;
}

interface ModuleGroup {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  modules: ModuleCard[];
}

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, AdminBreadcrumbsComponent, RouterLink],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class AdminDashboardComponent {
  // Grupos de módulos organizados
  readonly moduleGroups = signal<ModuleGroup[]>([
    {
      id: "analytics",
      name: "📊 Analítica",
      description: "Métricas y análisis de rendimiento",
      icon: "📊",
      color: "primary",
      modules: [
        {
          title: "Visión General",
          description: "Dashboard general con KPIs principales",
          icon: "📈",
          route: "/admin/analytics",
          color: "primary",
        },
        {
          title: "Analítica General",
          description: "Métricas globales de la plataforma",
          icon: "🌐",
          route: "/admin/analytics/general",
          color: "primary",
        },
        {
          title: "Analítica Financiera",
          description: "Ingresos, gastos y beneficios",
          icon: "💰",
          route: "/admin/analytics/financial",
          color: "primary",
        },
        {
          title: "Analítica de Usuarios",
          description: "Comportamiento y engagement",
          icon: "👥",
          route: "/admin/analytics/users",
          color: "primary",
        },
        {
          title: "Analítica de Estaciones",
          description: "Rendimiento por estación",
          icon: "⛷️",
          route: "/admin/analytics/stations",
          color: "primary",
        },
        {
          title: "Analítica de Reservas",
          description: "Conversión y tendencias",
          icon: "📅",
          route: "/admin/analytics/bookings",
          color: "primary",
        },
        {
          title: "Analítica de Marketing",
          description: "ROI y campañas",
          icon: "📢",
          route: "/admin/analytics/marketing",
          color: "primary",
        },
      ],
    },
    {
      id: "management",
      name: "🎯 Gestión",
      description: "Gestión de recursos y contenidos",
      icon: "🎯",
      color: "success",
      modules: [
        {
          title: "Usuarios",
          description: "Gestión de usuarios y roles",
          icon: "👤",
          route: "/admin/users",
          color: "success",
          count: 1247,
        },
        {
          title: "Estaciones",
          description: "Administración de estaciones de esquí",
          icon: "🏔️",
          route: "/admin/stations",
          color: "success",
          count: 12,
        },
        {
          title: "Reservas",
          description: "Gestión de reservas y cancelaciones",
          icon: "📋",
          route: "/admin/bookings",
          color: "success",
          count: 3456,
        },
        {
          title: "Pagos",
          description: "Procesamiento y seguimiento de pagos",
          icon: "💳",
          route: "/admin/payments",
          color: "success",
        },
        {
          title: "Alojamientos",
          description: "Gestión de hoteles y apartamentos",
          icon: "🏨",
          route: "/admin/lodgings",
          color: "success",
          count: 89,
        },
        {
          title: "Tiendas",
          description: "Tiendas de alquiler de material",
          icon: "🎿",
          route: "/admin/shops",
          color: "success",
          count: 34,
        },
        {
          title: "Blog",
          description: "Gestión de artículos y contenido",
          icon: "📝",
          route: "/admin/blog",
          color: "success",
          count: 156,
        },
      ],
    },
    {
      id: "financial",
      name: "💼 Financiero",
      description: "Gestión financiera y contable",
      icon: "💼",
      color: "warning",
      modules: [
        {
          title: "Facturas",
          description: "Emisión y gestión de facturas",
          icon: "🧾",
          route: "/admin/invoices",
          color: "warning",
          count: 2341,
        },
        {
          title: "Comisiones",
          description: "Cálculo y pago de comisiones",
          icon: "💵",
          route: "/admin/commissions",
          color: "warning",
        },
        {
          title: "Informes Financieros",
          description: "Reportes y análisis contable",
          icon: "📊",
          route: "/admin/financial-reports",
          color: "warning",
        },
      ],
    },
    {
      id: "crm",
      name: "📧 CRM & Marketing",
      description: "Gestión de clientes y campañas",
      icon: "📧",
      color: "purple",
      modules: [
        {
          title: "Email Marketing",
          description: "Campañas de email y newsletters",
          icon: "✉️",
          route: "/admin/email-marketing",
          color: "purple",
          count: 45,
        },
        {
          title: "Campañas",
          description: "Gestión de campañas promocionales",
          icon: "🎯",
          route: "/admin/campaigns",
          color: "purple",
          count: 12,
        },
        {
          title: "Soporte",
          description: "Tickets y atención al cliente",
          icon: "🎧",
          route: "/admin/support",
          color: "purple",
          count: 234,
          status: "18 abiertos",
        },
        {
          title: "Reseñas",
          description: "Gestión de valoraciones",
          icon: "⭐",
          route: "/admin/reviews",
          color: "purple",
          count: 1823,
        },
        {
          title: "Notificaciones Push",
          description: "Envío de notificaciones móviles",
          icon: "🔔",
          route: "/admin/push-notifications",
          color: "purple",
        },
      ],
    },
    {
      id: "operations",
      name: "⚙️ Operaciones",
      description: "Gestión operativa de estaciones",
      icon: "⚙️",
      color: "error",
      modules: [
        {
          title: "Inventario",
          description: "Gestión de material de alquiler",
          icon: "📦",
          route: "/admin/inventory",
          color: "error",
          count: 1245,
          status: "34 stock bajo",
        },
        {
          title: "Mantenimiento",
          description: "Equipos e infraestructura",
          icon: "🔧",
          route: "/admin/maintenance",
          color: "error",
          count: 87,
          status: "5 urgentes",
        },
        {
          title: "Incidentes",
          description: "Registro y seguimiento",
          icon: "⚠️",
          route: "/admin/incidents",
          color: "error",
          count: 23,
          status: "1 crítico",
        },
      ],
    },
    {
      id: "settings",
      name: "⚙️ Configuración",
      description: "Ajustes generales del sistema",
      icon: "⚙️",
      color: "neutral",
      modules: [
        {
          title: "Configuración",
          description: "Ajustes generales y personalización",
          icon: "🛠️",
          route: "/admin/settings",
          color: "neutral",
        },
      ],
    },
  ]);

  // Métricas globales rápidas
  readonly quickStats = signal([
    {
      label: "Módulos Activos",
      value: "28",
      icon: "📦",
      color: "primary",
    },
    {
      label: "Usuarios Total",
      value: "1,247",
      icon: "👥",
      color: "success",
    },
    {
      label: "Reservas Mes",
      value: "3,456",
      icon: "📅",
      color: "warning",
    },
    {
      label: "Ingresos Mes",
      value: "€184K",
      icon: "💰",
      color: "error",
    },
  ]);
}
