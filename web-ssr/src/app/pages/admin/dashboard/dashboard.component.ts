import { Component, inject, OnInit, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AdminService } from "../services/admin.service";
import { AdminBreadcrumbsComponent } from "../components/shared/admin-breadcrumbs/admin-breadcrumbs.component";

@Component({
  selector: "app-admin-dashboard",
  standalone: true,
  imports: [CommonModule, AdminBreadcrumbsComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class AdminDashboardComponent implements OnInit {
  private readonly adminService = inject(AdminService);

  // Computed signals from service
  readonly metrics = computed(() => {
    const data = this.adminService.metrics();
    if (!data) return [];

    return [
      {
        title: "Total Reservas",
        value: data.totalBookings.toLocaleString(),
        change: data.bookingsChange,
        changeLabel: "vs mes anterior",
        icon: "receipt_long",
        color: "primary" as const,
      },
      {
        title: "Usuarios Activos",
        value: data.activeUsers.toLocaleString(),
        change: data.usersChange,
        changeLabel: "vs mes anterior",
        icon: "group",
        color: "success" as const,
      },
      {
        title: "Ingresos",
        value: `€${data.revenue.toLocaleString()}`,
        change: data.revenueChange,
        changeLabel: "vs mes anterior",
        icon: "payments",
        color: "warning" as const,
      },
      {
        title: "Estaciones",
        value: data.stations.toString(),
        change: data.stationsChange,
        changeLabel: "vs mes anterior",
        icon: "terrain",
        color: "error" as const,
      },
    ];
  });

  readonly recentActivity = this.adminService.recentActivity;
  readonly topStations = computed(() => {
    return this.adminService.topStations().map((station) => ({
      name: station.name,
      bookings: station.bookings,
      revenue: `€${station.revenue.toLocaleString()}`,
      change: station.change,
    }));
  });
  readonly isLoading = this.adminService.isLoading;
  readonly error = this.adminService.error;

  ngOnInit(): void {
    this.adminService.loadDashboardData();
  }
}
