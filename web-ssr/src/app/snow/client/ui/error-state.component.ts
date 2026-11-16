import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

/**
 * Error recuperable (07-ux-ui.md §7.4).
 *
 *  - `role="alert"` una sola vez por región (aquí: el componente).
 *  - El mensaje técnico NUNCA se pinta: el borde manda `message` para logs.
 *  - «Reintentar» sólo aparece si el fallo es reintentable; un 4xx semántico no
 *    se reintenta, se explica.
 *  - El texto es literal en español (decisión del capitán para este intento).
 */
@Component({
  selector: "app-snow-error-state",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="err" role="alert">
      <span class="err__glyph" aria-hidden="true">!</span>
      <div class="err__body">
        <p class="err__title">{{ title() }}</p>
        <p class="err__hint">
          @if (retryable()) {
            Puedes volver a intentarlo.
          } @else {
            Vuelve más tarde.
          }
        </p>
      </div>
      @if (retryable()) {
        <button type="button" class="err__retry" (click)="retry.emit()">Reintentar</button>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .err {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-3, 0.75rem);
        padding: var(--space-4, 1rem);
        border-radius: var(--radius-base, 0.5rem);
        /* --error-700 sobre --error-50 = 5.91:1 (07-ux-ui.md §12). */
        background: var(--error-50, #fef2f2);
        color: var(--error-700, #b91c1c);
      }
      .err__glyph {
        font-weight: 700;
        font-size: var(--font-size-lg, 1.125rem);
      }
      .err__body {
        flex: 1 1 16rem;
      }
      .err__title {
        margin: 0;
        font-weight: 600;
      }
      .err__hint {
        margin: 0;
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--neutral-600, #525252);
      }
      .err__retry {
        min-height: 2.75rem;
        padding: 0 var(--space-4, 1rem);
        border-radius: var(--radius-base, 0.5rem);
        border: 2px solid var(--error-700, #b91c1c);
        background: transparent;
        color: var(--error-700, #b91c1c);
        font-weight: 600;
        cursor: pointer;
      }
      .err__retry:focus-visible {
        outline: 3px solid var(--primary-700, #0369a1);
        outline-offset: 2px;
      }
    `,
  ],
})
export class SnowErrorStateComponent {
  readonly title = input<string>("No hemos podido cargar los datos.");
  readonly retryable = input<boolean>(true);
  readonly retry = output<void>();
}
