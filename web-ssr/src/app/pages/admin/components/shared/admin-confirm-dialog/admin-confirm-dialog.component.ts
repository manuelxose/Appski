import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

export type ConfirmVariant = "danger" | "warning" | "info";

/**
 * AdminConfirmDialogComponent
 *
 * Diálogo de confirmación para acciones destructivas
 *
 * @example
 * <app-admin-confirm-dialog
 *   [open]="showConfirm()"
 *   [title]="'Eliminar Usuario'"
 *   [message]="'¿Estás seguro? Esta acción no se puede deshacer.'"
 *   [variant]="'danger'"
 *   [confirmLabel]="'Eliminar'"
 *   [cancelLabel]="'Cancelar'"
 *   (confirm)="onConfirm()"
 *   (cancel)="onCancel()"
 * />
 */
@Component({
  selector: "app-admin-confirm-dialog",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-confirm-dialog.component.html",
  styleUrl: "./admin-confirm-dialog.component.css",
})
export class AdminConfirmDialogComponent {
  readonly open = input.required<boolean>();
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly variant = input<ConfirmVariant>("danger");
  readonly confirmLabel = input("Confirmar");
  readonly cancelLabel = input("Cancelar");
  readonly icon = input<string>();

  readonly confirmAction = output<void>();
  readonly cancelAction = output<void>();

  onConfirm(): void {
    this.confirmAction.emit();
  }

  onCancel(): void {
    this.cancelAction.emit();
  }

  getDefaultIcon(): string {
    switch (this.variant()) {
      case "danger":
        return "⚠️";
      case "warning":
        return "⚡";
      case "info":
        return "ℹ️";
    }
  }
}
