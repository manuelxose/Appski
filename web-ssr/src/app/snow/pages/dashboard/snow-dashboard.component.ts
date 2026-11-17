import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import type { StationSummary } from "../../models/dto";
import { SnowApi } from "../../client/snow-api.service";
import { SnowSkeletonComponent } from "../../client/ui/skeleton.component";
import { SnowErrorStateComponent } from "../../client/ui/error-state.component";
import { REASON_TEXT } from "../../client/ui/screen-state";

/**
 * Pantalla A — Panel de nieve (`/nieve`).
 *
 * Decisión U1 del capitán: `/` sigue siendo la home existente; el panel completo
 * vive en `nieve/`. Esta pantalla **no sustituye** nada.
 *
 * Honestidad sin credenciales: si no hay partes publicados, el panel no pinta
 * ceros ni filas vacías. Dice cuántas estaciones hay en el maestro, marca cada
 * una como «sin dato» y explica por qué con la frase canónica. El dato llega del
 * maestro editorial, que es el único que hoy tiene valores reales.
 */
@Component({
  selector: "app-snow-dashboard",
  standalone: true,
  imports: [SnowSkeletonComponent, SnowErrorStateComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" class="dash">
      <header class="dash__head">
        <h1>Parte de nieve</h1>
        <p class="dash__lede">
          Estado de apertura, espesores y previsión de las estaciones de España,
          Andorra, Pirineo francés y Portugal. Cada dato indica su fuente; si no
          hay parte, se dice.
        </p>
      </header>

      @if (loading()) {
        <app-snow-skeleton [rows]="6" label="Cargando el parte…" />
      } @else if (error()) {
        <app-snow-error-state title="No hemos podido cargar el parte." (retry)="load()" />
      } @else {
        <section class="dash__summary" aria-labelledby="resumen-title">
          <h2 id="resumen-title" class="dash__section-title">Resumen de hoy</h2>
          <ul class="dash__facts">
            <li>
              <strong class="dash__fact">{{ stations().length }}</strong>
              <span class="dash__fact-label">estaciones en el catálogo</span>
            </li>
            <li>
              <strong class="dash__fact">{{ withData() }}</strong>
              <span class="dash__fact-label">con parte publicado</span>
            </li>
            <li>
              <strong class="dash__fact">{{ withoutData() }}</strong>
              <span class="dash__fact-label">sin dato</span>
            </li>
          </ul>
          @if (withData() === 0) {
            <p class="dash__reason">
              <span aria-hidden="true">?</span>
              {{ reasonText }}
            </p>
          }
        </section>

        <section class="dash__links" aria-labelledby="accesos-title">
          <h2 id="accesos-title" class="dash__section-title">Accesos</h2>
          <ul class="dash__actions">
            <li><a routerLink="/nieve/estaciones">Explorar todas las estaciones</a></li>
            <li><a routerLink="/nieve/comparar">Comparar estaciones</a></li>
            <li><a routerLink="/nieve/webcams">Webcams</a></li>
            <li><a routerLink="/nieve/mapa">Mapa de estaciones</a></li>
          </ul>
        </section>

        @if (featured().length) {
          <section aria-labelledby="destacadas-title">
            <h2 id="destacadas-title" class="dash__section-title">Estaciones del catálogo</h2>
            <ul class="dash__grid">
              @for (s of featured(); track s.slug) {
                <li class="dash__card">
                  <a [routerLink]="['/nieve/estaciones', s.slug]">{{ s.name }}</a>
                  <span class="dash__region">{{ s.region }} · {{ s.country }}</span>
                  <span class="dash__nope">
                    <span aria-hidden="true">?</span> Sin dato
                  </span>
                </li>
              }
            </ul>
          </section>
        }
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .dash {
        max-width: var(--container-max-width, 1280px);
        margin: 0 auto;
        padding: var(--space-8, 2rem) var(--space-4, 1rem) var(--space-16, 4rem);
      }
      .dash__head h1 {
        font-size: clamp(1.75rem, 3.2vw, 2.25rem);
        line-height: var(--line-height-tight, 1.25);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-2, 0.5rem);
      }
      .dash__lede {
        color: var(--neutral-600, #525252);
        max-width: 65ch;
        margin: 0 0 var(--space-6, 1.5rem);
      }
      .dash__section-title {
        font-size: var(--font-size-lg, 1.125rem);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-3, 0.75rem);
      }
      .dash__summary {
        margin-bottom: var(--space-6, 1.5rem);
      }
      .dash__facts {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--space-4, 1rem);
        list-style: none;
        margin: 0 0 var(--space-3, 0.75rem);
        padding: 0;
      }
      .dash__facts li {
        border: 1px solid var(--neutral-200, #e5e5e5);
        border-radius: var(--radius-base, 0.5rem);
        padding: var(--space-4, 1rem);
      }
      .dash__fact {
        display: block;
        font-size: var(--font-size-4xl, 2.25rem);
        line-height: 1.1;
        color: var(--neutral-700, #404040);
        font-variant-numeric: tabular-nums;
      }
      .dash__fact-label {
        font-size: var(--font-size-sm, 0.875rem);
        color: var(--neutral-600, #525252);
      }
      .dash__reason {
        margin: 0;
        padding: var(--space-3, 0.75rem);
        border-radius: var(--radius-base, 0.5rem);
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
        font-size: var(--font-size-sm, 0.875rem);
      }
      .dash__actions {
        list-style: none;
        margin: 0 0 var(--space-6, 1.5rem);
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-3, 0.75rem);
      }
      .dash__actions a {
        display: inline-block;
        padding: 0.5rem var(--space-4, 1rem);
        border-radius: var(--radius-base, 0.5rem);
        border: 1px solid var(--primary-700, #0369a1);
        color: var(--primary-700, #0369a1);
        font-weight: 600;
        text-decoration: none;
      }
      .dash__grid {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: var(--space-4, 1rem);
      }
      .dash__card {
        border: 1px solid var(--neutral-200, #e5e5e5);
        border-radius: var(--radius-base, 0.5rem);
        padding: var(--space-4, 1rem);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .dash__card a {
        color: var(--primary-700, #0369a1);
        font-weight: 600;
      }
      .dash__region,
      .dash__nope {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--neutral-600, #525252);
      }
      @media (max-width: 1023px) {
        .dash__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 767px) {
        .dash__facts {
          grid-template-columns: 1fr;
        }
        .dash__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SnowDashboardComponent {
  private readonly api = inject(SnowApi);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly stations = signal<readonly StationSummary[]>([]);
  /** Hoy no hay endpoint agregado de partes; se declara 0 explícitamente. */
  readonly withData = signal(0);
  readonly withoutData = computed(() => this.stations().length - this.withData());
  readonly featured = computed(() => this.stations().slice(0, 6));
  /** Frase canónica de pretemporada: la única verdadera hoy. */
  readonly reasonText = REASON_TEXT["outside-season"];

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    const res = await this.api.stations();
    if (!res.ok) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.stations.set(Array.isArray(res.body?.stations) ? res.body.stations : []);
    this.withData.set(0);
    this.loading.set(false);
  }
}
