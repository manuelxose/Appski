import { DOCUMENT } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  REQUEST,
  RESPONSE_INIT,
  signal,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import type { NoDataReason, StationSummary } from "../../models/dto";
import { SnowApi } from "../../client/snow-api.service";
import {
  noSuggestionsKey,
  suggestStations,
  type Suggestion,
  type SuggestionReason,
} from "../../client/ui/suggestions";

/**
 * Página de error para cualquier URL no emparejada (defecto de la referencia
 * E23, requisito F21, `07-ux-ui.md` §11).
 *
 * El texto de «no hay sugerencias» **se deriva del estado real** (encargo del
 * capitán): antes afirmaba en duro «no tenemos partes publicados todavía»,
 * frase que deja de ser cierta en cuanto se publique el primero. Ahora:
 *   - si el borde devuelve estaciones con dato → se ofrecen, enlazadas;
 *   - si no → se explica con el `NoDataReason` real, o con `reporting-failed`;
 *   - si falla la consulta → se admite que no lo sabemos.
 * La lógica pura vive en `client/ui/suggestions.ts` y se prueba sin Angular.
 *
 * Límites declarados:
 *  - Estado HTTP: se fija 404 con `RESPONSE_INIT` (SSR). Con Nx roto no hay
 *    servidor que arrancar (00b C1) ⇒ la respuesta HTTP es UNVERIFIED.
 *  - Sin TranslateLoader en runtime: las cadenas están en
 *    `public/assets/i18n/snow/es.json` y aquí se repiten con la misma clave,
 *    para que un 404 no pueda fallar por un asset ausente.
 *    `scripts/snow/tests/k1-copy.test.mjs` comprueba que no divergen.
 */
@Component({
  selector: "app-snow-not-found",
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" class="snow-error">
      <h1 class="snow-error__title">No encontramos esta página</h1>
      <p class="snow-error__description">
        La dirección no existe o ha cambiado. Comprueba el enlace o vuelve a
        empezar desde aquí.
      </p>

      <nav class="snow-error__actions" aria-label="Accesos alternativos">
        <a class="snow-btn snow-btn--primary" routerLink="/">Ir al inicio</a>
        <a class="snow-btn snow-btn--secondary" routerLink="/estaciones"
          >Buscar una estación</a
        >
        <a class="snow-btn snow-btn--secondary" routerLink="/nieve"
          >Ver el parte de nieve</a
        >
      </nav>

      <p class="snow-error__hint">
        Si has llegado desde un enlace antiguo, la dirección puede haber
        cambiado de nombre.
      </p>

      @if (suggestion().kind === 'list') {
        <section class="snow-error__suggestions" aria-labelledby="sug-title">
          <h2 id="sug-title" class="snow-error__suggestions-title">
            Estaciones con parte:
          </h2>
          <ul class="snow-error__list">
            @for (s of listStations(); track s.slug) {
              <li>
                <a [routerLink]="['/estaciones', s.slug]">{{ s.name }}</a>
                <span class="snow-error__where">{{ s.region }}</span>
              </li>
            }
          </ul>
        </section>
      } @else {
        <p class="snow-error__empty-note">
          <span class="snow-error__glyph" aria-hidden="true">?</span>
          {{ noSuggestionsText() }}
        </p>
      }

      @if (requestedPath(); as path) {
        <details class="snow-error__technical">
          <summary>Detalles técnicos</summary>
          <p>Código: 404 · Ruta: {{ path }}</p>
        </details>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .snow-error {
        max-width: 42rem;
        margin: 0 auto;
        padding: var(--space-12, 3rem) var(--space-4, 1rem) var(--space-16, 4rem);
      }
      .snow-error__title {
        font-size: clamp(1.75rem, 3.2vw, 2.25rem);
        line-height: var(--line-height-tight, 1.25);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-3, 0.75rem);
      }
      .snow-error__description,
      .snow-error__hint {
        color: var(--neutral-600, #525252);
        margin: 0 0 var(--space-6, 1.5rem);
      }
      .snow-error__actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3, 0.75rem);
        margin-bottom: var(--space-6, 1.5rem);
      }
      .snow-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 2.75rem;
        padding: 0 var(--space-6, 1.5rem);
        border-radius: var(--radius-base, 0.5rem);
        font-weight: 600;
        text-decoration: none;
        transition: background-color var(--transition-fast, 150ms);
      }
      /* Relleno SÓLIDO primary-700 (blanco = 5.93:1). El degradado del sistema
         queda en 4.10:1 y 2.14:1 bajo texto blanco: no se usa aquí. */
      .snow-btn--primary {
        background: var(--primary-700, #0369a1);
        color: #ffffff;
      }
      .snow-btn--secondary {
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
        outline: 2px solid var(--primary-700, #0369a1);
        outline-offset: -2px;
      }
      .snow-btn:focus-visible {
        outline: 3px solid var(--primary-700, #0369a1);
        outline-offset: 2px;
      }
      .snow-btn--primary:focus-visible {
        outline: 3px solid #ffffff;
        outline-offset: -4px;
        box-shadow: 0 0 0 2px var(--neutral-50, #fafafa);
      }
      .snow-error__hint a,
      .snow-error__list a {
        color: var(--primary-700, #0369a1);
        font-weight: 600;
      }
      .snow-error__empty-note {
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
        border-radius: var(--radius-base, 0.5rem);
        padding: var(--space-4, 1rem);
        margin: 0 0 var(--space-6, 1.5rem);
      }
      .snow-error__glyph {
        display: inline-block;
        margin-right: var(--space-2, 0.5rem);
        font-weight: 700;
      }
      .snow-error__suggestions-title {
        font-size: var(--font-size-base, 1rem);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-2, 0.5rem);
      }
      .snow-error__list {
        list-style: none;
        margin: 0 0 var(--space-6, 1.5rem);
        padding: 0;
      }
      .snow-error__list li {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2, 0.5rem);
        padding: var(--space-2, 0.5rem) 0;
        border-bottom: 1px solid var(--neutral-200, #e5e5e5);
      }
      .snow-error__where {
        color: var(--neutral-600, #525252);
      }
      .snow-error__technical {
        color: var(--neutral-600, #525252);
        font-size: var(--font-size-sm, 0.875rem);
      }
      @media (prefers-reduced-motion: reduce) {
        .snow-btn {
          transition: none;
        }
      }
    `,
  ],
})
export class SnowNotFoundComponent {
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  private readonly request = inject(REQUEST, { optional: true });
  private readonly document = inject(DOCUMENT);
  private readonly api = inject(SnowApi);

  private readonly state = signal<Suggestion>({
    kind: "none",
    reason: "reporting-failed",
  });

  readonly suggestion = this.state.asReadonly();

  constructor() {
    // Sólo en servidor: RESPONSE_INIT existe en SSR y es null en navegador.
    if (this.responseInit) {
      this.responseInit.status = 404;
      this.document.title = "No encontramos esta página";
    }
    void this.loadSuggestions();
  }

  /**
   * Consulta el borde. **Nunca** inventa sugerencias: si la lectura falla, el
   * estado queda en `reporting-failed` y la frase lo dice tal cual.
   *
   * Nota de contrato: `GET /v1/stations` hoy devuelve **todo el maestro**; no
   * existe todavía un filtro «sólo estaciones con parte». Se pide el listado y
   * se delega la selección en `suggestStations`, que con 0 estaciones informa
   * del motivo real. Cuando el borde ofrezca ese filtro, sólo cambia esta
   * llamada — el resto del camino ya está preparado.
   */
  private async loadSuggestions(): Promise<void> {
    const res = await this.api.stations();
    if (!res.ok) {
      this.state.set(suggestStations(false, [], null));
      return;
    }
    const body = res.body;
    const stations: readonly StationSummary[] = Array.isArray(body.stations)
      ? body.stations
      : [];
    this.state.set(suggestStations(true, stations, body.reason ?? null));
  }

  listStations(): readonly StationSummary[] {
    const s = this.state();
    return s.kind === "list" ? s.stations : [];
  }

  noSuggestionsText(): string {
    const s = this.state();
    const reason: SuggestionReason = s.kind === "none" ? s.reason : "not-covered";
    // La clave se calcula con la misma función que documenta el namespace.
    void noSuggestionsKey(reason);
    return NO_SUGGESTIONS_TEXT[reason];
  }

  requestedPath(): string | null {
    const url = this.request?.url;
    if (!url) return null;
    return url.length > 200 ? `${url.slice(0, 197)}…` : url;
  }
}

/**
 * Texto por motivo. Debe coincidir con `snow.notFound.noSuggestions.<reason>`
 * de `public/assets/i18n/snow/es.json`; lo comprueba `k1-copy.test.mjs`.
 */
export const NO_SUGGESTIONS_TEXT: Readonly<Record<SuggestionReason, string>> = {
  "outside-season":
    "No te ofrecemos estaciones sugeridas porque hoy no hay partes publicados.",
  "source-silent":
    "No te ofrecemos estaciones sugeridas: ninguna estación ha publicado parte hoy.",
  "not-yet-published":
    "No te ofrecemos estaciones sugeridas: los partes de hoy todavía no se han publicado.",
  "not-covered":
    "No te ofrecemos estaciones sugeridas: no hay estaciones con datos disponibles hoy.",
  "license-prohibits":
    "No te ofrecemos estaciones sugeridas porque las fuentes disponibles no permiten publicarlas aquí.",
  "reporting-failed":
    "No te ofrecemos estaciones sugeridas: no hemos podido consultar qué partes hay hoy.",
};
