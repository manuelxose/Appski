import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { freshnessText } from "./freshness";

/**
 * Cinta de dato desfasado (07-ux-ui.md §7.3).
 *
 * `stale` NO sustituye al estado: se superpone. Un dato puede ser «abierto
 * pero desfasado». La cinta lo dice con glifo `◔` + palabra + frescura, y el
 * `role="status"` hace que el lector lo anuncie cuando cambia.
 */
@Component({
  selector: "app-snow-stale-ribbon",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <p class="stale" role="status">
        <span class="stale__glyph" aria-hidden="true">◔</span>
        <strong class="stale__word">Desfasado</strong>
        @if (freshness()) {
          <span class="stale__fresh">· {{ freshness() }}</span>
        }
        @if (note()) {
          <span class="stale__note">{{ note() }}</span>
        }
      </p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .stale {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.25rem;
        margin: 0;
        padding: 0.25rem var(--space-2, 0.5rem);
        border-radius: var(--radius-sm, 0.375rem);
        /* --warning-700 sobre --warning-50 = 4.84:1 (07-ux-ui.md §12). */
        background: var(--warning-50, #fffbeb);
        color: var(--warning-700, #b45309);
        font-size: var(--font-size-sm, 0.875rem);
      }
      .stale__glyph {
        font-weight: 700;
      }
      .stale__note {
        color: var(--neutral-600, #525252);
      }
    `,
  ],
})
export class SnowStaleRibbonComponent {
  /** `false` ⇒ no se pinta nada (el dato está fresco). */
  readonly stale = input<boolean>(false);
  /** Frescura en segundos; se muestra en formato «hace X». */
  readonly freshnessSeconds = input<number | null>(null);
  /** Motivo declarado por la fuente, si se conoce. */
  readonly note = input<string | null>(null);

  readonly visible = computed(() => this.stale());
  readonly freshness = computed(() => freshnessText(this.freshnessSeconds()));
}
