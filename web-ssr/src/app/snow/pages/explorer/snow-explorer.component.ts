import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import type { StationSummary, SnowReportDto } from "../../models/dto";
import { SnowApi } from "../../client/snow-api.service";
import {
  EMPTY_QUERY,
  facetOptions,
  filterAndSort,
  paginate,
  parseQuery,
  pisteColumnLabel,
  toParams,
  type CountryCode,
  type Discipline,
  type ExplorerQuery,
  type SortField,
  type StationRow,
  type StatusKey,
} from "../../client/ui/explorer-logic";
import { toScreenState, REASON_TEXT, publicReason, type ScreenState } from "../../client/ui/screen-state";
import { stationStatus, statusForKey, type StationStatus } from "../../client/ui/station-status";
import { SnowStatusBadgeComponent } from "../../client/ui/status-badge.component";
import { SnowMeasureComponent } from "../../client/ui/measure.component";
import { SnowSkeletonComponent } from "../../client/ui/skeleton.component";
import { SnowErrorStateComponent } from "../../client/ui/error-state.component";
import { SnowNodataComponent } from "../../client/ui/nodata.component";

/** Adapta `ParamMap` a `URLSearchParams` sin castings. */
function urlParams(pm: { keys: readonly string[]; get(k: string): string | null }): URLSearchParams {
  const usp = new URLSearchParams();
  for (const k of pm.keys) {
    const v = pm.get(k);
    if (v !== null) usp.set(k, v);
  }
  return usp;
}

/**
 * Pantalla B — Exploradora (`/nieve/estaciones`).
 *
 * Decisión del capitán (U4): ruta NUEVA. No se toca `stations-list` ni
 * `/estaciones`; el módulo nieve vive entero bajo `nieve/*`.
 *
 * Decisiones visibles en esta pantalla:
 *  - Los filtros y el orden viven en la URL: el estado es compartible y el SSR
 *    pinta la misma vista que verá el navegador (07-ux-ui.md §9.2, D11).
 *  - Tabla semántica `<table>` con `caption`, `scope` y `aria-sort`; en móvil la
 *    MISMA tabla se ve como tarjetas por CSS (no se duplica el DOM, §6.3).
 *  - Alpino y nórdico no se mezclan: con filtro de una sola disciplina, la
 *    columna dice «Pistas» o «Circuitos» (F11).
 *  - Sin datos no se inventa nada: si no hay filas se explica el motivo real.
 */
@Component({
  selector: "app-snow-explorer",
  standalone: true,
  imports: [
    SnowStatusBadgeComponent,
    SnowMeasureComponent,
    SnowSkeletonComponent,
    SnowErrorStateComponent,
    SnowNodataComponent,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" class="explorer">
      <header class="explorer__head">
        <h1>Estaciones de esquí y de fondo</h1>
        <p class="explorer__lede">
          Explora las estaciones por país, sistema montañoso, estado de apertura
          y espesor de nieve. Cada dato indica de dónde viene.
        </p>
      </header>

      <form class="explorer__filters" (submit)="$event.preventDefault()" aria-label="Filtros">
        <div class="field">
          <label for="q">Buscar estación</label>
          <input
            id="q"
            type="search"
            name="q"
            [value]="query().filters.q"
            (input)="setText($any($event.target).value)"
            placeholder="Nombre, sistema o identificador"
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label for="pais">País</label>
          <select id="pais" name="pais" (change)="setCountry($any($event.target).value)">
            <option value="">Todos</option>
            @for (c of facets().countries; track c) {
              <option [value]="c" [selected]="query().filters.countries.includes(c)">{{ COUNTRY_LABEL[c] }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="sistema">Sistema montañoso</label>
          <select id="sistema" name="sistema" (change)="setRegion($any($event.target).value)">
            <option value="">Todos</option>
            @for (r of facets().regions; track r) {
              <option [value]="r" [selected]="query().filters.regions.includes(r)">{{ r }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="disciplina">Modalidad</label>
          <select id="disciplina" name="disciplina" (change)="setDiscipline($any($event.target).value)">
            <option value="">Todas</option>
            <option value="alpine" [selected]="query().filters.disciplines.includes('alpine')">Esquí alpino</option>
            <option value="nordic" [selected]="query().filters.disciplines.includes('nordic')">Esquí de fondo</option>
          </select>
        </div>

        <div class="field">
          <label for="estado">Estado</label>
          <select id="estado" name="estado" (change)="setStatus($any($event.target).value)">
            <option value="">Todos</option>
            <option value="open" [selected]="query().filters.statuses.includes('open')">Abierta</option>
            <option value="closed" [selected]="query().filters.statuses.includes('closed')">Cerrada</option>
            <option value="unknown" [selected]="query().filters.statuses.includes('unknown')">Sin datos</option>
            <option value="blocked" [selected]="query().filters.statuses.includes('blocked')">No disponible</option>
          </select>
        </div>

        <div class="field">
          <label for="nieveMin">Espesor mínimo (cm)</label>
          <input
            id="nieveMin"
            type="number"
            min="0"
            step="5"
            name="nieveMin"
            [value]="query().filters.snowMin ?? ''"
            (input)="setSnowMin($any($event.target).value)"
          />
        </div>

        <div class="field">
          <label for="orden">Ordenar por</label>
          <select id="orden" name="orden" (change)="setSort($any($event.target).value)">
            <option value="name" [selected]="query().sort.field === 'name'">Nombre</option>
            <option value="snow" [selected]="query().sort.field === 'snow'">Espesor base</option>
            <option value="km" [selected]="query().sort.field === 'km'">Km abiertos</option>
            <option value="status" [selected]="query().sort.field === 'status'">Estado</option>
          </select>
        </div>

        <button type="button" class="explorer__reset" (click)="reset()">Quitar filtros</button>
      </form>

      @if (state() === "loading") {
        <app-snow-skeleton [rows]="6" label="Cargando estaciones…" />
      } @else if (state() === "error") {
        <app-snow-error-state title="No hemos podido cargar las estaciones." (retry)="load()" />
      } @else {
        <p class="explorer__count" role="status">
          {{ page().from }}–{{ page().to }} de {{ filtered().length }} estaciones
        </p>

        @if (filtered().length === 0) {
          <app-snow-nodata
            [text]="emptyText()"
            detail="Prueba a quitar algún filtro o a buscar por nombre."
          />
        } @else {
          <table class="explorer__table">
            <caption class="sr-only">Estaciones de esquí con su estado y espesor</caption>
            <thead>
              <tr>
                <th scope="col">Estación</th>
                <th scope="col">Estado</th>
                <th scope="col">{{ pistesLabel() }}</th>
                <th scope="col">Km abiertos</th>
                <th scope="col" [attr.aria-sort]="ariaSort()">Espesor base</th>
                <th scope="col">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              @for (row of page().items; track row.station.slug) {
                <tr>
                  <th scope="row" class="explorer__station">
                    <a [routerLink]="['/nieve/estaciones', row.station.slug]">{{ row.station.name }}</a>
                    <span class="explorer__region">{{ row.station.region }}</span>
                  </th>
                  <td>
                    <app-snow-status-badge [status]="statusOf(row)" />
                  </td>
                  <td class="num">
                    <app-snow-measure [value]="row.kmOpen" unit="km" />
                  </td>
                  <td class="num">
                    <app-snow-measure [value]="row.snowBaseCm" unit="cm" />
                  </td>
                  <td class="explorer__updated">{{ row.observedAt ?? "—" }}</td>
                </tr>
              }
            </tbody>
          </table>

          @if (page().pages > 1) {
            <nav class="explorer__pager" aria-label="Paginación">
              <button type="button" [disabled]="page().page <= 1" (click)="goPage(page().page - 1)">
                Anterior
              </button>
              <span>Página {{ page().page }} de {{ page().pages }}</span>
              <button
                type="button"
                [disabled]="page().page >= page().pages"
                (click)="goPage(page().page + 1)"
              >
                Siguiente
              </button>
            </nav>
          }
        }
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .explorer {
        max-width: var(--container-max-width, 1280px);
        margin: 0 auto;
        padding: var(--space-8, 2rem) var(--space-4, 1rem) var(--space-16, 4rem);
      }
      .explorer__head h1 {
        font-size: clamp(1.75rem, 3.2vw, 2.25rem);
        line-height: var(--line-height-tight, 1.25);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-2, 0.5rem);
      }
      .explorer__lede {
        margin: 0 0 var(--space-6, 1.5rem);
        color: var(--neutral-600, #525252);
        max-width: 60ch;
      }
      .explorer__filters {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr)) auto;
        gap: var(--space-3, 0.75rem);
        align-items: end;
        margin-bottom: var(--space-6, 1.5rem);
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
      }
      .field label {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: var(--neutral-700, #404040);
      }
      .field input,
      .field select {
        min-height: 2.75rem;
        padding: 0 var(--space-2, 0.5rem);
        border: 1px solid var(--neutral-500, #737373);
        border-radius: var(--radius-base, 0.5rem);
        background: #ffffff;
        color: var(--neutral-700, #404040);
        font-size: var(--font-size-sm, 0.875rem);
        width: 100%;
      }
      .field input:focus-visible,
      .field select:focus-visible,
      .explorer__reset:focus-visible,
      .explorer__pager button:focus-visible {
        outline: 3px solid var(--primary-700, #0369a1);
        outline-offset: 2px;
      }
      .explorer__reset {
        min-height: 2.75rem;
        padding: 0 var(--space-4, 1rem);
        border: 1px solid var(--primary-700, #0369a1);
        border-radius: var(--radius-base, 0.5rem);
        background: transparent;
        color: var(--primary-700, #0369a1);
        font-weight: 600;
        cursor: pointer;
      }
      .explorer__count {
        color: var(--neutral-600, #525252);
        font-size: var(--font-size-sm, 0.875rem);
        margin: 0 0 var(--space-3, 0.75rem);
      }
      .explorer__table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--font-size-sm, 0.875rem);
      }
      .explorer__table th,
      .explorer__table td {
        text-align: left;
        padding: var(--space-2, 0.5rem);
        border-bottom: 1px solid var(--neutral-200, #e5e5e5);
        vertical-align: middle;
      }
      .explorer__table thead th {
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
        font-weight: 700;
      }
      .explorer__station a {
        color: var(--primary-700, #0369a1);
        font-weight: 600;
      }
      .explorer__region {
        display: block;
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--neutral-600, #525252);
        font-weight: 400;
      }
      .num {
        font-variant-numeric: tabular-nums;
      }
      .explorer__updated {
        color: var(--neutral-600, #525252);
        white-space: nowrap;
      }
      .explorer__pager {
        display: flex;
        gap: var(--space-3, 0.75rem);
        align-items: center;
        justify-content: center;
        margin-top: var(--space-6, 1.5rem);
      }
      .explorer__pager button {
        min-height: 2.75rem;
        padding: 0 var(--space-4, 1rem);
        border-radius: var(--radius-base, 0.5rem);
        border: 1px solid var(--primary-700, #0369a1);
        background: transparent;
        color: var(--primary-700, #0369a1);
        font-weight: 600;
        cursor: pointer;
      }
      .explorer__pager button:disabled {
        border-color: var(--neutral-300, #d4d4d4);
        color: var(--neutral-500, #737373);
        cursor: not-allowed;
      }
      /* Tablet: 3 columnas de filtro. */
      @media (max-width: 1023px) {
        .explorer__filters {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      /* Móvil: los filtros se apilan y la tabla se lee como tarjetas, pero el
         DOM sigue siendo una <table> (SC 1.3.1, sin duplicar contenido). */
      @media (max-width: 767px) {
        .explorer__filters {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .explorer__table thead {
          display: none;
        }
        .explorer__table,
        .explorer__table tbody,
        .explorer__table tr,
        .explorer__table th,
        .explorer__table td {
          display: block;
          width: 100%;
        }
        .explorer__table tr {
          border: 1px solid var(--neutral-200, #e5e5e5);
          border-radius: var(--radius-base, 0.5rem);
          padding: var(--space-2, 0.5rem);
          margin-bottom: var(--space-2, 0.5rem);
        }
        .explorer__table td,
        .explorer__table th {
          border-bottom: 0;
          padding: 0.125rem 0;
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
export class SnowExplorerComponent {
  private readonly api = inject(SnowApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly COUNTRY_LABEL: Readonly<Record<CountryCode, string>> = {
    ES: "España",
    AD: "Andorra",
    FR: "Pirineo francés",
    PT: "Portugal",
  };

  /** La ausencia es `undefined` (no publicada), nunca un centinela. */
  private readonly rows = signal<readonly StationRow[]>([]);
  private readonly status = signal<ScreenState>("loading");
  private readonly querySignal = signal<ExplorerQuery>(EMPTY_QUERY);

  readonly query = computed(() => this.querySignal());
  readonly state = computed(() => this.status());
  readonly facets = computed(() => facetOptions(this.rows()));
  readonly filtered = computed(() => filterAndSort(this.rows(), this.query()));
  readonly page = computed(() => paginate(this.filtered(), this.query().page, 25));

  constructor() {
    // La query manda: se lee de la URL al entrar (deep-link restaura el estado).
    this.querySignal.set(parseQuery(urlParams(this.route.snapshot.queryParamMap)));
    void this.load();
  }

  /** Una sola lectura del maestro; los filtros se aplican en cliente. */
  async load(): Promise<void> {
    this.status.set("loading");
    const res = await this.api.stations();
    if (!res.ok) {
      this.status.set("error");
      return;
    }
    const stations: readonly StationSummary[] = Array.isArray(res.body?.stations) ? res.body.stations : [];
    // Sin partes publicados, cada fila es una estación sin dato: no se inventa
    // espesor ni km. El estado por estación lo decide `stationStatus`.
    this.rows.set(
      stations.map((station) => ({
        station,
        status: stationStatus({
          status: "no_data",
          reason: "not-covered",
          report: { operational: null, snow: null, noDataFields: ["operational", "snow"] },
        }).key,
        // Sin parte. La ausencia NO se modela con centinelas: la fila simplemente
        // no declara estos campos (el tipo los tiene opcionales) y la UI pinta
        // la frase canónica del motivo. `null`/`-1`/`-99` quedan reservados
        // para cuando el borde diga explícitamente «no publicado».
      }))
    );
    this.status.set("ready");
  }

  pistesLabel(): string {
    const d = this.query().filters.disciplines;
    return d.length === 1 ? pisteColumnLabel(d[0] as Discipline) : "Pistas / Circuitos";
  }

  ariaSort(): string | null {
    return this.query().sort.field === "snow"
      ? this.query().sort.dir === "asc"
        ? "ascending"
        : "descending"
      : null;
  }

  /** Estado de la fila ya resuelto por la lógica pura (sin re-derivar reglas). */
  statusOf(row: StationRow): StationStatus {
    return statusForKey(row.status);
  }

  emptyText(): string {
    return REASON_TEXT[publicReason("nodata", "not-covered")];
  }

  /* ------------------------------ mutaciones ------------------------------ */

  private update(next: Partial<ExplorerQuery["filters"]> = {}, sort?: { field: SortField; dir: "asc" | "desc" }): void {
    const q = this.query();
    const updated: ExplorerQuery = {
      filters: { ...q.filters, ...next },
      sort: sort ?? q.sort,
      page: 1,
    };
    this.querySignal.set(updated);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.fromEntries(new URLSearchParams(toParams(updated))),
      replaceUrl: true,
    });
  }

  setText(v: string): void {
    this.update({ q: v });
  }

  setCountry(v: string): void {
    this.update({ countries: v ? [v as CountryCode] : [] });
  }

  setRegion(v: string): void {
    this.update({ regions: v ? [v] : [] });
  }

  setDiscipline(v: string): void {
    this.update({ disciplines: v ? [v as Discipline] : [] });
  }

  setStatus(v: string): void {
    this.update({ statuses: v ? [v as StatusKey] : [] });
  }

  setSnowMin(v: string): void {
    const n = Number(v);
    this.update({ snowMin: v.trim() === "" || !Number.isFinite(n) ? null : n });
  }

  setSort(field: string): void {
    this.update({}, { field: field as SortField, dir: this.query().sort.dir });
  }

  reset(): void {
    this.querySignal.set(EMPTY_QUERY);
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  goPage(p: number): void {
    const q = this.query();
    const updated: ExplorerQuery = { ...q, page: p };
    this.querySignal.set(updated);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.fromEntries(new URLSearchParams(toParams(updated))),
      replaceUrl: true,
    });
  }
}
