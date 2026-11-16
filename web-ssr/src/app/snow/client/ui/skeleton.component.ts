import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * Estado de carga con la forma exacta del contenido (07-ux-ui.md §7.1).
 *
 * No es un spinner centrado: reserva la altura del contenido para que no haya
 * salto de layout (CLS), y no muestra ni una cifra falsa. `aria-busy` en el
 * contenedor y un único `role="status"` para que el lector anuncie el cambio
 * una vez, no por tarjeta.
 */
@Component({
  selector: "app-snow-skeleton",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skel" [attr.aria-busy]="true">
      <p class="sr-only" role="status">Cargando…</p>
      @for (row of rowsArray(); track $index) {
        <span class="skel__bar" aria-hidden="true"></span>
      }
      <span class="skel__caption" aria-hidden="true">{{ label() }}</span>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .skel {
        display: flex;
        flex-direction: column;
        gap: var(--space-2, 0.5rem);
        padding: var(--space-4, 1rem);
        border-radius: var(--radius-base, 0.5rem);
        background: var(--neutral-100, #f5f5f5);
        min-height: var(--skeleton-min-height, 8rem);
      }
      .skel__bar {
        display: block;
        height: 1rem;
        border-radius: var(--radius-sm, 0.375rem);
        background: var(--neutral-200, #e5e5e5);
      }
      .skel__bar:nth-child(odd) {
        width: 70%;
      }
      .skel__caption {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--neutral-600, #525252);
      }
      /* Sin animación con movimiento reducido: el propio styles.css global ya
         corta animaciones, pero este componente no añade ninguna por diseño. */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
      }
    `,
  ],
})
export class SnowSkeletonComponent {
  readonly rows = input<number>(3);
  readonly label = input<string>("Cargando el parte de nieve…");

  rowsArray(): number[] {
    const n = Math.max(1, Math.min(10, Math.floor(this.rows())));
    return Array.from({ length: n }, (_, i) => i);
  }
}
