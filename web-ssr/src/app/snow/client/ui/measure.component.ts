import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { hasMeasurement } from "./format-measurement";
import { SnowMeasurePipe } from "./snow-measure.pipe";

/**
 * Medida con su unidad y su ausencia explícita (07-ux-ui.md §10.3).
 *
 * Sustituye cualquier `{{ valor }} cm` suelto. El valor entra como
 * `number | null` y sale por el pipe `snowMeasure`: `null`, `-1`, `-99`, `NaN`
 * e `Infinity` se convierten en el texto de ausencia, nunca en `0`.
 *
 * `nullText` es un literal en español por decisión del capitán (sin i18n
 * asíncrona en pantallas en este intento) y está verificado contra
 * `snow.common.nodata` de `es.json` por `screen-copy.test.mjs`.
 */
@Component({
  selector: "app-snow-measure",
  standalone: true,
  imports: [SnowMeasurePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="measure" [class.measure--nodata]="isNodata()">
      <span class="measure__value">
        @if (isNodata()) {
          <span class="measure__glyph" aria-hidden="true">?</span>
          {{ nullText() }}
        } @else {
          {{ value() | snowMeasure: unit() : nullText() }}
        }
      </span>
      @if (label()) {
        <span class="measure__label">{{ label() }}</span>
      }
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-block;
      }
      .measure {
        display: inline-flex;
        flex-direction: column;
        line-height: 1.2;
      }
      .measure__value {
        font-variant-numeric: tabular-nums;
        font-weight: 700;
        color: var(--neutral-700, #404040);
      }
      .measure__label {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--neutral-600, #525252);
      }
      .measure--nodata .measure__value {
        font-weight: 500;
        color: var(--neutral-600, #525252);
      }
      .measure__glyph {
        font-weight: 700;
        margin-right: 0.25rem;
      }
    `,
  ],
})
export class SnowMeasureComponent {
  readonly value = input<number | null | undefined>(null);
  readonly unit = input<"cm" | "km" | "m" | "%">("cm");
  readonly label = input<string>("");
  /** Literal español de ausencia; coincide con `snow.common.nodata`. */
  readonly nullText = input<string>("Sin datos disponibles");

  /**
   * Se decide con la MISMA regla que el pipe (`formatMeasurement`), no con un
   * `=== null`: así los centinelas -1/-99 también muestran la ausencia con su
   * glifo, en lugar de un número con un `?` al lado.
   */
  readonly isNodata = computed(() => !hasMeasurement(this.value()));
}
