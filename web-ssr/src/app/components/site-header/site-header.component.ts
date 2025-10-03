import {
  ChangeDetectionStrategy,
  Component,
  inject,
  PLATFORM_ID,
  signal,
  input,
  computed,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import { RouterLink } from "@angular/router";

export type StationStatus = "open" | "closed" | "seasonal" | "maintenance";

@Component({
  selector: "app-site-header",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./site-header.component.html",
  styleUrls: ["./site-header.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeaderComponent {
  private platformId = inject(PLATFORM_ID);
  mobileMenuOpen = signal(false);
  userMenuOpen = signal(false);

  // Estado de la estación (puede venir del input o usar valor por defecto)
  stationStatus = input<StationStatus | null>(null);
  stationName = input<string | null>(null);

  // Información del estado de la estación
  readonly statusInfo = computed(() => {
    const status = this.stationStatus();

    switch (status) {
      case "open":
        return {
          label: "Estación Abierta",
          icon: "✅",
          color: "bg-green-500",
          textColor: "text-green-700",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          pulseColor: "bg-green-400",
        };
      case "closed":
        return {
          label: "Estación Cerrada",
          icon: "🔴",
          color: "bg-red-500",
          textColor: "text-red-700",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          pulseColor: "bg-red-400",
        };
      case "seasonal":
        return {
          label: "Temporada Turística",
          icon: "☀️",
          color: "bg-yellow-500",
          textColor: "text-yellow-700",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          pulseColor: "bg-yellow-400",
        };
      case "maintenance":
        return {
          label: "Mantenimiento",
          icon: "🔧",
          color: "bg-gray-500",
          textColor: "text-gray-700",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          pulseColor: "bg-gray-400",
        };
      default:
        return null;
    }
  });

  // Simular estado de autenticación (en producción vendría de un servicio)
  // Cambiar a true para ver el estado autenticado con dropdown de usuario
  isAuthenticated = signal(true);
  userInitials = signal("MG");
  userName = signal("María González");

  // Simular rol de admin (en producción vendría de un servicio de autenticación)
  // Cambiar a true para ver el link de Admin Dashboard
  isAdmin = signal(true);

  toggleMobileMenu(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.mobileMenuOpen.update((v) => !v);
      if (this.mobileMenuOpen()) {
        this.userMenuOpen.set(false);
      }
    }
  }

  toggleUserMenu(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.userMenuOpen.update((v) => !v);
      if (this.userMenuOpen()) {
        this.mobileMenuOpen.set(false);
      }
    }
  }

  closeMenus(): void {
    this.mobileMenuOpen.set(false);
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.isAuthenticated.set(false);
    this.closeMenus();
    window.location.href = "/";
  }
}
