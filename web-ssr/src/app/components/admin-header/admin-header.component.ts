import { Component, signal } from "@angular/core";

@Component({
  selector: "app-admin-header",
  standalone: true,
  imports: [],
  templateUrl: "./admin-header.component.html",
  styleUrls: ["./admin-header.component.css"],
})
export class AdminHeaderComponent {
  notificationsOpen = signal(false);
  userMenuOpen = signal(false);

  notifications = signal([
    {
      id: 1,
      title: "Nueva reserva",
      message: "Baqueira Beret - 15 Feb",
      time: "5m",
      unread: true,
    },
    {
      id: 2,
      title: "Nuevo usuario",
      message: "Usuario premium registrado",
      time: "1h",
      unread: true,
    },
    {
      id: 3,
      title: "Blog publicado",
      message: "Artículo: Mejores pistas",
      time: "3h",
      unread: false,
    },
  ]);

  toggleNotifications() {
    this.notificationsOpen.update((v) => !v);
    if (this.notificationsOpen()) {
      this.userMenuOpen.set(false);
    }
  }

  toggleUserMenu() {
    this.userMenuOpen.update((v) => !v);
    if (this.userMenuOpen()) {
      this.notificationsOpen.set(false);
    }
  }

  closeMenus() {
    this.notificationsOpen.set(false);
    this.userMenuOpen.set(false);
  }
}
