import { Component, input, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

export type StatTrend = "up" | "down" | "neutral";
export type StatVariant = "primary" | "success" | "warning" | "danger" | "info";

/**
 * AdminStatCardComponent
 *
 * Tarjeta de estadística/métrica con:
 * - Valor principal
 * - Cambio porcentual con tendencia (up/down/neutral)
 * - Icono
 * - Label/descripción
 * - Variantes de color
 * - Subtítulo opcional
 *
 * @example
 * <app-admin-stat-card
 *   [label]="'Total Usuarios'"
 *   [value]="12547"
 *   [change]="15.3"
 *   [trend]="'up'"
 *   [icon]="'👥'"
 *   [variant]="'primary'"
 * />
 */
@Component({
  selector: "app-admin-stat-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-stat-card.component.html",
  styleUrl: "./admin-stat-card.component.css",
})
export class AdminStatCardComponent {
  // Inputs
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly change = input<number>(); // Percentage change
  readonly trend = input<StatTrend>("neutral");
  readonly icon = input<string>();
  readonly subtitle = input<string>();
  readonly variant = input<StatVariant>("primary");
  readonly loading = input(false);
  readonly format = input<"number" | "currency" | "percentage">("number");

  // Computed
  readonly formattedValue = computed(() => {
    const val = this.value();
    const fmt = this.format();

    if (typeof val === "string") return val;

    switch (fmt) {
      case "currency":
        return new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "EUR",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);

      case "percentage":
        return `${val.toFixed(1)}%`;

      case "number":
      default:
        return new Intl.NumberFormat("es-ES").format(val);
    }
  });

  readonly formattedChange = computed(() => {
    const change = this.change();
    if (change === undefined) return null;

    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}%`;
  });

  readonly trendIcon = computed(() => {
    const trend = this.trend();

    switch (trend) {
      case "up":
        return "↗️";
      case "down":
        return "↘️";
      case "neutral":
      default:
        return "→";
    }
  });

  readonly cardClass = computed(() => {
    return `stat-card stat-card-${this.variant()}`;
  });

  readonly trendClass = computed(() => {
    return `trend trend-${this.trend()}`;
  });
}
