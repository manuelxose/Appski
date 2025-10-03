import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * AdminEmptyStateComponent
 *
 * Estado vacío con ilustración y acciones
 *
 * @example
 * <app-admin-empty-state
 *   [icon]="'📭'"
 *   [title]="'No hay usuarios'"
 *   [description]="'Comienza agregando tu primer usuario'"
 *   [actionLabel]="'Crear Usuario'"
 *   (action)="onCreateUser()"
 * />
 */
@Component({
  selector: "app-admin-empty-state",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-empty-state.component.html",
  styleUrl: "./admin-empty-state.component.css",
})
export class AdminEmptyStateComponent {
  readonly icon = input("📭");
  readonly title = input("No hay datos disponibles");
  readonly description = input<string>();
  readonly actionLabel = input<string>();
  readonly secondaryActionLabel = input<string>();

  readonly action = output<void>();
  readonly secondaryAction = output<void>();

  onAction(): void {
    this.action.emit();
  }

  onSecondaryAction(): void {
    this.secondaryAction.emit();
  }
}
