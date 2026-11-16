import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import type { StationStatus } from "../../client/ui/station-status";

/**
 * Insignia de estado de estación (07-ux-ui.md §5.3, SC 1.4.1).
 *
 * **El color nunca va solo.** La insignia pinta siempre glifo + palabra, y el
 * `aria-label` repite la palabra para el lector de pantalla. El color es el
 * tercer canal, no el único: si se imprime en blanco y negro, o con daltonismo,
 * sigue diciendo lo mismo.
 *
 * `stationStatus()` ya resuelve la semántica —incluido el caso «abierta con
 * espesor desconocido» (decisión U3)— y este componente sólo la presenta.
 */
@Component({
  selector: "app-snow-status-badge",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="badge"
      [class]="'badge badge--' + status().key"
      [attr.aria-label]="ariaLabel()"
      [attr.title]="support()"
    >
      <span class="badge__glyph" aria-hidden="true">{{ status().glyph }}</span>
      <span class="badge__label">{{ label() }}</span>
    </span>
    @if (status().depthUnknown) {
      <span class="badge__support">{{ support() }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-2, 0.5rem);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.125rem var(--space-2, 0.5rem);
        border-radius: var(--radius-base, 0.5rem);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        line-height: 1.4;
        outline: 1px solid transparent;
      }
      .badge__glyph {
        font-size: 0.875em;
        line-height: 1;
      }
      /* Pares con contraste medido (07-ux-ui.md §12): blanco sobre
         --success-700 = 5.02:1; blanco sobre --warning-700 = 5.02:1;
         --neutral-700 sobre --neutral-100 = 9.51:1. */
      .badge--open {
        background: var(--success-700, #15803d);
        color: #ffffff;
      }
      .badge--closed {
        background: var(--warning-700, #b45309);
        color: #ffffff;
      }
      .badge--unknown {
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
        outline-color: var(--primary-700, #0369a1);
      }
      .badge--blocked {
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
        outline-color: var(--neutral-700, #404040);
      }
      .badge__support {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--neutral-600, #525252);
      }
    `,
  ],
})
export class SnowStatusBadgeComponent {
  readonly status = input.required<StationStatus>();

  /**
   * Texto en español. Son literales a propósito (decisión del capitán: sin
   * una librería de i18n asíncrona en pantallas en este intento); `screen-copy.test.mjs`
   * comprueba que coinciden con `snow.status.<key>.label` de `es.json`.
   */
  readonly label = computed(() => LABEL[this.status().key]);

  readonly support = computed(() => {
    const s = this.status();
    return s.supportKey === "snow.status.openDepthUnknown"
      ? "Abierta, espesor sin publicar"
      : null;
  });

  readonly ariaLabel = computed(() => {
    const extra = this.status().depthUnknown ? ", espesor sin publicar" : "";
    return `Estado: ${this.label()}${extra}`;
  });
}

const LABEL: Readonly<Record<StationStatus["key"], string>> = {
  open: "Abierta",
  closed: "Cerrada",
  unknown: "Sin datos",
  blocked: "No disponible",
};
