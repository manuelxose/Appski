import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: string;
}

/**
 * AdminBreadcrumbsComponent
 *
 * Navegación breadcrumb para el panel admin
 *
 * @example
 * <app-admin-breadcrumbs
 *   [items]="[
 *     { label: 'Dashboard', path: '/admin' },
 *     { label: 'Usuarios', path: '/admin/users' },
 *     { label: 'Detalle' }
 *   ]"
 * />
 */
@Component({
  selector: "app-admin-breadcrumbs",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-breadcrumbs.component.html",
  styleUrl: "./admin-breadcrumbs.component.css",
})
export class AdminBreadcrumbsComponent {
  readonly items = input.required<BreadcrumbItem[]>();
  readonly showHome = input(true);
}
