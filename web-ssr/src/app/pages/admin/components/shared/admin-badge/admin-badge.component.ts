import { Component, input, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral";

export type BadgeSize = "sm" | "md" | "lg";

/**
 * AdminBadgeComponent
 *
 * Badge reutilizable con variantes de color y tamaños
 *
 * @example
 * <app-admin-badge
 *   [text]="'Activo'"
 *   [variant]="'success'"
 *   [size]="'md'"
 *   [icon]="'✓'"
 *   [dot]="true"
 * />
 */
@Component({
  selector: "app-admin-badge",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-badge.component.html",
  styleUrl: "./admin-badge.component.css",
})
export class AdminBadgeComponent {
  // Inputs
  readonly text = input.required<string>();
  readonly variant = input<BadgeVariant>("neutral");
  readonly size = input<BadgeSize>("md");
  readonly icon = input<string>();
  readonly dot = input(false); // Show colored dot instead of icon
  readonly removable = input(false);
  readonly pulse = input(false); // Pulse animation for dot

  // Computed
  readonly badgeClass = computed(() => {
    const classes = ["badge"];
    classes.push(`badge-${this.variant()}`);
    classes.push(`badge-${this.size()}`);
    if (this.pulse()) classes.push("badge-pulse");
    return classes.join(" ");
  });
}
