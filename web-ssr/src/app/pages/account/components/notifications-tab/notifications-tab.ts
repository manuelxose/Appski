import { Component, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AccountService } from "../../services/account.service";
import type {
  Notification,
  NotificationType,
} from "../../models/account.models";

@Component({
  selector: "app-notifications-tab",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./notifications-tab.html",
  styleUrls: ["./notifications-tab.css"],
})
export class NotificationsTabComponent {
  private readonly accountService = inject(AccountService);

  // State
  readonly notifications = this.accountService.notifications;
  readonly isLoading = this.accountService.isLoadingNotifications;
  readonly filter = signal<"all" | NotificationType>("all");

  // Computed
  readonly filteredNotifications = computed(() => {
    const allNotifications = this.notifications();
    const currentFilter = this.filter();

    if (currentFilter === "all") {
      return allNotifications;
    }

    return allNotifications.filter((n) => n.type === currentFilter);
  });

  readonly unreadCount = computed(
    () => this.notifications().filter((n) => !n.read).length
  );

  // Methods
  async markAsRead(notificationId: string): Promise<void> {
    const response = await this.accountService.markNotificationAsRead(
      notificationId
    );
    if (!response.success) {
      console.error("Error marking notification as read:", response.message);
    }
  }

  async markAllAsRead(): Promise<void> {
    const response = await this.accountService.markAllNotificationsAsRead();
    if (!response.success) {
      console.error(
        "Error marking all notifications as read:",
        response.message
      );
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const response = await this.accountService.deleteNotification(
      notificationId
    );
    if (!response.success) {
      console.error("Error deleting notification:", response.message);
    }
  }

  getNotificationIcon(notification: Notification): string {
    return notification.icon || this.getDefaultIcon(notification.type);
  }

  getDefaultIcon(type: NotificationType): string {
    const icons: Record<NotificationType, string> = {
      weather: "🌨️",
      booking: "📅",
      promotion: "🎁",
      alert: "⚠️",
      social: "👥",
      system: "⚙️",
    };
    return icons[type];
  }

  getPriorityColor(priority: Notification["priority"]): string {
    const colors = {
      low: "bg-gray-50 border-gray-200",
      medium: "bg-blue-50 border-blue-200",
      high: "bg-orange-50 border-orange-200",
      urgent: "bg-red-50 border-red-200",
    };
    return colors[priority];
  }

  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return `Hace ${diffInMinutes} min`;
    }
    if (diffInHours < 24) {
      return `Hace ${diffInHours}h`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `Hace ${diffInDays}d`;
    }
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }
}
