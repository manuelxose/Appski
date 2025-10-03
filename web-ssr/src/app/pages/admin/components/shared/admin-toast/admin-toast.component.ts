import { Component, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  icon?: string;
}

/**
 * AdminToastComponent
 *
 * Sistema de notificaciones toast con auto-dismiss
 *
 * @example
 * // In service:
 * toastService.show({
 *   type: 'success',
 *   title: 'Usuario creado',
 *   message: 'El usuario ha sido creado correctamente',
 *   duration: 3000
 * });
 */
@Component({
  selector: "app-admin-toast",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-toast.component.html",
  styleUrl: "./admin-toast.component.css",
})
export class AdminToastComponent {
  readonly toasts = signal<Toast[]>([]);

  readonly visibleToasts = computed(() => this.toasts());

  /**
   * Show a new toast notification
   */
  show(toast: Omit<Toast, "id">): void {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const duration = toast.duration ?? 3000;

    const newToast: Toast = {
      ...toast,
      id,
      icon: toast.icon ?? this.getDefaultIcon(toast.type),
    };

    this.toasts.update((toasts) => [...toasts, newToast]);

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  /**
   * Dismiss a toast by ID
   */
  dismiss(id: string): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    this.toasts.set([]);
  }

  private getDefaultIcon(type: ToastType): string {
    switch (type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
    }
  }
}
