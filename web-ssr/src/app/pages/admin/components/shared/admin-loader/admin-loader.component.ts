import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";

export type LoaderType = "spinner" | "dots" | "bars" | "skeleton";
export type LoaderSize = "sm" | "md" | "lg";

/**
 * AdminLoaderComponent
 *
 * Componente de loading con múltiples variantes
 *
 * @example
 * <app-admin-loader
 *   [type]="'spinner'"
 *   [size]="'md'"
 *   [message]="'Cargando datos...'"
 * />
 */
@Component({
  selector: "app-admin-loader",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-loader.component.html",
  styleUrl: "./admin-loader.component.css",
})
export class AdminLoaderComponent {
  readonly type = input<LoaderType>("spinner");
  readonly size = input<LoaderSize>("md");
  readonly message = input<string>();
  readonly fullscreen = input(false);
}
