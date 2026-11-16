import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import type { ProvenanceDto } from "../../models/dto";
import type { EditorialReportFields } from "../../models/dto";
import { provenanceLabel } from "./provenance-label";
import { freshnessText } from "./freshness";

/**
 * Etiqueta de procedencia (07-ux-ui.md §5.4).
 *
 * Tres roles, tres tratamientos:
 *  - **editorial**: «Parte de estación · fuente: <operador>» + enlace saliente
 *    al `sourceUrl`. Nunca se copia texto del operador (05b §7.3).
 *  - **oficial**: la atribución pre-interpolada por el backend (`© AEMET`…).
 *  - **ausente**: la frase canónica del motivo, sin enlace.
 *
 * El enlace usa `rel="noopener noreferrer"` y `target="_blank"`: `isSafeHref`
 * ya garantiza que sólo se enlazan URL http(s).
 */
@Component({
  selector: "app-snow-provenance-badge",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="prov" [class]="'prov prov--' + label().role">
      <span class="prov__glyph" aria-hidden="true">{{ glyph() }}</span>
      <span class="prov__text">{{ label().text }}</span>
      @if (label().href; as href) {
        <a
          class="prov__link"
          [href]="href"
          target="_blank"
          rel="noopener noreferrer"
          >ver fuente del operador<span class="sr-only"> (abre en una pestaña nueva)</span></a
        >
      }
      @if (freshness()) {
        <span class="prov__fresh" aria-hidden="true">· {{ freshness() }}</span>
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
        max-width: 100%;
      }
      .prov {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.375rem;
        padding: 0.125rem var(--space-2, 0.5rem);
        border-radius: var(--radius-base, 0.5rem);
        font-size: var(--font-size-xs, 0.75rem);
        line-height: 1.5;
      }
      /* --neutral-700 sobre --neutral-100 = 9.51:1; --primary-700 sobre
         --primary-50 = 5.57:1 (07-ux-ui.md §12). */
      .prov--editorial {
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
      }
      .prov--official {
        background: var(--primary-50, #f0f9ff);
        color: var(--primary-700, #0369a1);
      }
      .prov--absent {
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
      }
      .prov__link {
        color: var(--primary-700, #0369a1);
        font-weight: 600;
        text-decoration: underline;
      }
      .prov--official .prov__link {
        color: inherit;
      }
      .prov__fresh {
        color: var(--neutral-600, #525252);
        white-space: nowrap;
      }
      .prov--official .prov__fresh {
        color: var(--primary-700, #0369a1);
        opacity: 0.9;
      }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0 0 0 0);
        white-space: nowrap;
        border: 0;
      }
    `,
  ],
})
export class SnowProvenanceBadgeComponent {
  readonly provenance = input.required<ProvenanceDto>();
  /** Campos F1 del borde (`sourceUrl`, `author`), opcionales. */
  readonly editorial = input<EditorialReportFields>({});
  /** Motivo de ausencia cuando el dato no está disponible. */
  readonly reason = input<Parameters<typeof provenanceLabel>[2]>(null);

  readonly label = computed(() => provenanceLabel(this.provenance(), this.editorial(), this.reason()));
  readonly glyph = computed(() =>
    this.label().role === "editorial" ? "◉" : this.label().role === "official" ? "©" : "?"
  );
  /** Frescura legible sólo cuando hay dato (en ausencia, la frase ya lo explica). */
  readonly freshness = computed(() =>
    this.label().role === "absent" ? null : freshnessText(this.provenance().freshness)
  );
}
