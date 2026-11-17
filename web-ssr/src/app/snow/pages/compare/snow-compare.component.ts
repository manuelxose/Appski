import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import type { SnowReportView, StationSummary } from "../../models/dto";
import { SnowApi } from "../../client/snow-api.service";
import {
  MAX_COMPARE,
  MIN_COMPARE,
  compareRows,
  comparisonIsEmpty,
  guardSelection,
  type CompareColumn,
} from "../../client/ui/compare-logic";
import { stationStatus } from "../../client/ui/station-status";
import { provenanceLabel } from "../../client/ui/provenance-label";
import { SnowStatusBadgeComponent } from "../../client/ui/status-badge.component";
import { SnowSkeletonComponent } from "../../client/ui/skeleton.component";
import { SnowErrorStateComponent } from "../../client/ui/error-state.component";
import { SnowNodataComponent } from "../../client/ui/nodata.component";

/**
 * Pantalla G — Comparador (capacidad **F25**, decisión U2 del capitán).
 *
 * Reglas que se ven en la plantilla:
 *  - 2–3 estaciones; fuera de rango se explica, no se rompe (`guardSelection`).
 *  - La selección vive en la URL (`?slugs=a,b,c`), así el enlace es compartible
 *    y el SSR pinta lo mismo.
 *  - Una celda sin dato **no se oculta**: se compara también la ausencia.
 *  - Si todas las columnas están vacías, se dice; no se pinta una tabla de
 *    guiones que parece un error.
 */
@Component({
  selector: "app-snow-compare",
  standalone: true,
  imports: [
    SnowStatusBadgeComponent,
    SnowSkeletonComponent,
    SnowErrorStateComponent,
    SnowNodataComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" class="cmp">
      <header class="cmp__head">
        <h1>Comparar estaciones</h1>
        <p class="cmp__lede">
          Compara hasta {{ MAX }} estaciones: espesores, pistas abiertas,
          previsión y la procedencia de cada dato.
        </p>
      </header>

      @if (loading()) {
        <app-snow-skeleton [rows]="4" label="Cargando la comparación…" />
      } @else if (error()) {
        <app-snow-error-state title="No hemos podido cargar las estaciones." (retry)="load()" />
      } @else if (guardMessage()) {
        <app-snow-nodata [text]="guardMessage() ?? ''" detail="Añade o quita estaciones para comparar entre dos y tres." />
        <p><a routerLink="/nieve/estaciones">Ir a la exploradora para elegirlas</a></p>
      } @else if (emptyComparison()) {
        <app-snow-nodata
          text="Ninguna de las estaciones seleccionadas tiene datos publicados."
          detail="Comparar dos ausencias no dice nada; volveremos a mostrarlo cuando haya partes."
        />
      } @else {
        <table class="cmp__table">
          <caption class="sr-only">
            Comparación de {{ columns().length }} estaciones; cada celda indica su propia procedencia.
          </caption>
          <thead>
            <tr>
              <th scope="col">Dato</th>
              @for (c of columns(); track c.slug) {
                <th scope="col">
                  <a [routerLink]="['/nieve/estaciones', c.slug]">{{ c.name }}</a>
                  <span class="cmp__region">{{ c.region }}</span>
                  <app-snow-status-badge [status]="c.status" />
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.key) {
              <tr>
                <th scope="row">{{ row.label }}</th>
                @for (cell of row.cells; track $index) {
                  <td [class.cmp__nodata]="cell.kind === 'nodata'">{{ cell.text }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      }

      <a class="cmp__back" routerLink="/nieve/estaciones">← Volver a la exploradora</a>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .cmp {
        max-width: 60rem;
        margin: 0 auto;
        padding: var(--space-8, 2rem) var(--space-4, 1rem) var(--space-16, 4rem);
      }
      .cmp__head h1 {
        font-size: clamp(1.75rem, 3.2vw, 2.25rem);
        line-height: var(--line-height-tight, 1.25);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-2, 0.5rem);
      }
      .cmp__lede {
        color: var(--neutral-600, #525252);
        margin: 0 0 var(--space-6, 1.5rem);
      }
      .cmp__table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-size-sm, 0.875rem);
      }
      .cmp__table th,
      .cmp__table td {
        text-align: left;
        padding: var(--space-2, 0.5rem);
        border-bottom: 1px solid var(--neutral-200, #e5e5e5);
        vertical-align: top;
      }
      .cmp__table thead th {
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
      }
      .cmp__table tbody th {
        color: var(--neutral-600, #525252);
        font-weight: 600;
      }
      .cmp__region {
        display: block;
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--neutral-600, #525252);
        font-weight: 400;
      }
      .cmp__nodata {
        color: var(--neutral-600, #525252);
        font-style: italic;
      }
      .cmp__back {
        display: inline-block;
        margin-top: var(--space-4, 1rem);
        color: var(--primary-700, #0369a1);
        font-weight: 600;
      }
      .cmp__table a {
        color: var(--primary-700, #0369a1);
        font-weight: 600;
      }
      /* Tablet: la tabla respira con menos padding y tipografía menor. */
      @media (max-width: 1023px) {
        .cmp__table {
          font-size: var(--font-size-sm, 0.875rem);
        }
      }
      /* Móvil: la tabla conserva su semántica y se desplaza en horizontal; es
         preferible a tres columnas ilegibles a 320 px (§9.7). */
      @media (max-width: 767px) {
        .cmp__table {
          font-size: var(--font-size-xs, 0.75rem);
        }
        .cmp__table th,
        .cmp__table td {
          padding: 0.25rem;
        }
      }
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
export class SnowCompareComponent {
  private readonly api = inject(SnowApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly MAX = MAX_COMPARE;
  readonly MIN = MIN_COMPARE;

  readonly loading = signal(true);
  readonly error = signal(false);
  private readonly payload = signal<readonly { station: StationSummary; dto: SnowReportView }[]>([]);
  private readonly requested = signal<readonly string[]>([]);

  readonly columns = computed<readonly CompareColumn[]>(() =>
    this.payload().map(({ station, dto }) => ({
      slug: station.slug,
      name: station.name,
      region: station.region,
      status: stationStatus(dto),
      isOpen: dto.report.operational?.isOpen ?? null,
      baseCm: dto.report.snow?.baseCm ?? null,
      topCm: dto.report.snow?.topCm ?? null,
      newSnow24hCm: dto.report.snow?.newSnow24hCm ?? null,
      kmOpen: dto.report.operational?.kmOpen ?? null,
      liftsOpen: dto.report.operational?.liftsOpen ?? null,
      liftsTotal: dto.report.operational?.liftsTotal ?? null,
      observedAt: dto.provenance.observedAt,
      provenanceText: provenanceLabel(dto.provenance, { sourceUrl: dto.sourceUrl }).text,
      hasAnyValue: dto.report.operational !== null || dto.report.snow !== null,
    }))
  );

  readonly rows = computed(() => compareRows(this.columns()));
  readonly emptyComparison = computed(() => comparisonIsEmpty(this.columns()));

  readonly guardMessage = computed(() => {
    const g = guardSelection(this.requested());
    if (g.ok) return null;
    if (g.reason === "too-few") return "Elige al menos dos estaciones para comparar.";
    if (g.reason === "too-many") return `Se comparan como máximo ${MAX_COMPARE} estaciones. Quita una para añadir otra.`;
    return "Has seleccionado la misma estación más de una vez.";
  });

  constructor() {
    const slugs = (this.route.snapshot.queryParamMap.get("slugs") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    this.requested.set(slugs);
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    const g = guardSelection(this.requested());
    if (!g.ok) {
      this.loading.set(false);
      return;
    }
    const results = await Promise.all(g.slugs.map((slug) => this.api.report(slug)));
    if (results.some((r) => !r.ok)) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.payload.set(
      results.map((r) => {
        const dto = (r as { ok: true; body: SnowReportView }).body;
        return { station: dto.station, dto };
      })
    );
    this.loading.set(false);
  }

  /** Permite fijar la selección desde fuera (enlace de la exploradora). */
  select(slugs: readonly string[]): void {
    this.requested.set(slugs);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { slugs: slugs.join(",") },
      replaceUrl: true,
    });
  }
}
