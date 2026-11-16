import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * Bloque de ausencia de dato (07-ux-ui.md §7.2, §8).
 *
 * Regla que no se negocia: **nunca se pinta 0 ni «—» a secas**. Se pinta la
 * frase canónica del `NoDataReason` —las mismas cinco de 05b §3.2—, el glifo
 * `?` (SC 1.4.1) y, si se conoce, el último dato con su fecha.
 *
 * El motivo llega como texto ya resuelto para que este componente no dependa de
 * una librería de i18n asíncrona (decisión del capitán); `screen-copy.test.mjs` comprueba que
 * los literales coinciden con `es.json`.
 */
@Component({
  selector: "app-snow-nodata",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nodata" role="status">
      <span class="nodata__glyph" aria-hidden="true">?</span>
      <div class="nodata__body">
        <p class="nodata__title">{{ text() }}</p>
        @if (detail()) {
          <p class="nodata__detail">{{ detail() }}</p>
        }
        @if (lastKnown()) {
          <p class="nodata__last">Último parte conocido: {{ lastKnown() }}</p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .nodata {
        display: flex;
        gap: var(--space-3, 0.75rem);
        align-items: flex-start;
        padding: var(--space-4, 1rem);
        border-radius: var(--radius-base, 0.5rem);
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
      }
      .nodata__glyph {
        font-weight: 700;
        font-size: var(--font-size-lg, 1.125rem);
        line-height: 1.2;
      }
      .nodata__body {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .nodata__title {
        margin: 0;
        font-weight: 600;
      }
      .nodata__detail,
      .nodata__last {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--neutral-600, #525252);
      }
    `,
  ],
})
export class SnowNodataComponent {
  /** Frase canónica del motivo, ya resuelta. */
  readonly text = input.required<string>();
  /** Contexto opcional (cuándo suele publicarse, qué falta). */
  readonly detail = input<string | null>(null);
  /** «Último parte conocido» ya formateado con zona horaria. */
  readonly lastKnown = input<string | null>(null);
}
