import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { ActivatedRoute, RouterLink } from "@angular/router";
import type { SnowReportView, StationSummary } from "../../models/dto";
import { SnowApi } from "../../client/snow-api.service";
import type { EditorialReportFields } from "../../models/dto";
import { SnowProvenanceBadgeComponent } from "../../client/ui/provenance-badge.component";
import { SnowStationStateComponent } from "../../client/ui/station-state.component";
import { SnowMeasureComponent } from "../../client/ui/measure.component";
import { SnowSkeletonComponent } from "../../client/ui/skeleton.component";
import { SnowErrorStateComponent } from "../../client/ui/error-state.component";
import { absoluteDateText } from "../../client/ui/freshness";
import { SnowMeasurePipe } from "../../client/ui/snow-measure.pipe";

/**
 * Pantalla C — Detalle de estación (`/nieve/estaciones/:slug`).
 *
 * Diferencias deliberadas con la referencia (01 §4.3):
 *  - Una sola página con secciones, no 6 pestañas × 4 sub-pestañas: el enlace
 *    profundo a un bloque funciona y no hay 24 páginas casi duplicadas.
 *  - Cada bloque lleva su procedencia; el estado y los espesores llevan la
 *    etiqueta editorial («fuente: operador»), nunca la de un proveedor que no
 *    los dio.
 *  - Nada de `0` fabricado: si el parte no trae un campo, se pinta la ausencia.
 *  - Webcams: sólo enlaces (§9.4), nunca `<img>`.
 */
@Component({
  selector: "app-snow-station-detail",
  standalone: true,
  imports: [
    SnowProvenanceBadgeComponent,
    SnowStationStateComponent,
    SnowMeasureComponent,
    SnowSkeletonComponent,
    SnowErrorStateComponent,
    RouterLink,
    SnowMeasurePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" class="detail">
      <h1 class="detail__title">{{ title() }}</h1>
      @if (loading()) {

        <app-snow-skeleton [rows]="5" label="Cargando el parte…" />
      } @else if (error()) {
        
        <app-snow-error-state
          title="No hemos podido cargar el parte de esta estación."
          (retry)="load()"
        />
      } @else if (notFound()) {
        
        <p class="detail__lede">
          No existe ninguna estación con ese identificador. Comprueba el enlace o
          vuelve a la exploradora.
        </p>
        <a class="detail__back" routerLink="/nieve/estaciones">Buscar una estación</a>
      } @else {
        <header class="detail__head">
          
          <p class="detail__lede">
            {{ station()?.region }} · {{ countryLabel() }}
            @if (station()?.altitudeTopM !== null) {
              · {{ station()?.altitudeBaseM | snowMeasure: "m" }} – {{ station()?.altitudeTopM | snowMeasure: "m" }}
            }
          </p>
        </header>

        <section class="card" aria-labelledby="parte-title">
          <h2 id="parte-title" class="card__title">Parte de nieve</h2>
          @if (provenance()) {
            <app-snow-provenance-badge [provenance]="provenance()!" [editorial]="editorial()" [reason]="reason()" />
          }
          <app-snow-station-state [dto]="dto()" />
        </section>

        @if (hasReport()) {
          <section class="card" aria-labelledby="espesores-title">
            <h2 id="espesores-title" class="card__title">Espesores</h2>
            <div class="metrics">
              <app-snow-measure label="Base" [value]="dto()?.report?.snow?.baseCm ?? null" unit="cm" />
              <app-snow-measure label="Cota media" [value]="dto()?.report?.snow?.midCm ?? null" unit="cm" />
              <app-snow-measure label="Cima" [value]="dto()?.report?.snow?.topCm ?? null" unit="cm" />
              <app-snow-measure label="Nieve 24 h" [value]="dto()?.report?.snow?.newSnow24hCm ?? null" unit="cm" />
            </div>
          </section>

          <section class="card" aria-labelledby="pistas-title">
            <h2 id="pistas-title" class="card__title">Pistas y remontes</h2>
            <div class="metrics">
              <app-snow-measure
                [label]="station()?.discipline === 'nordic' ? 'Circuitos abiertos' : 'Pistas abiertas'"
                [value]="dto()?.report?.operational?.pistesOpen ?? null"
                unit="%"
              />
              <app-snow-measure label="Remontes abiertos" [value]="dto()?.report?.operational?.liftsOpen ?? null" unit="%" />
              <app-snow-measure label="Km abiertos" [value]="dto()?.report?.operational?.kmOpen ?? null" unit="km" />
            </div>
          </section>
        }

        <section class="card" aria-labelledby="webcams-title">
          <h2 id="webcams-title" class="card__title">Webcams</h2>
          <p class="card__note">
            Las imágenes de cámara las publica el operador; aquí solo aparecen
            los enlaces necesarios. No se incrustan ni se copian.
          </p>
          <p class="card__note">No hay cámaras con enlace autorizado para esta estación todavía.</p>
        </section>

        <section class="card" aria-labelledby="ficha-title">
          <h2 id="ficha-title" class="card__title">Ficha</h2>
          <dl class="ficha">
            <dt>Identificador</dt>
            <dd>{{ station()?.slug }}</dd>
            <dt>País</dt>
            <dd>{{ countryLabel() }}</dd>
            <dt>Sistema montañoso</dt>
            <dd>{{ station()?.region }}</dd>
            <dt>Modalidad</dt>
            <dd>{{ station()?.discipline === "nordic" ? "Esquí de fondo" : "Esquí alpino" }}</dd>
            @if (lastUpdateText()) {
              <dt>Última actualización</dt>
              <dd>{{ lastUpdateText() }}</dd>
            }
            @if (station()?.website; as web) {
              <dt>Sitio del operador</dt>
              <dd>
                <a [href]="web" target="_blank" rel="noopener noreferrer">{{ web }}</a>
              </dd>
            }
          </dl>
        </section>

        <a class="detail__back" routerLink="/nieve/estaciones">← Volver a la exploradora</a>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .detail {
        max-width: 60rem;
        margin: 0 auto;
        padding: var(--space-8, 2rem) var(--space-4, 1rem) var(--space-16, 4rem);
      }
      .detail__title {
        font-size: clamp(1.75rem, 3.2vw, 2.25rem);
        line-height: var(--line-height-tight, 1.25);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-2, 0.5rem);
      }
      .detail__lede {
        color: var(--neutral-600, #525252);
        margin: 0 0 var(--space-6, 1.5rem);
      }
      .card {
        border: 1px solid var(--neutral-200, #e5e5e5);
        border-radius: var(--radius-base, 0.5rem);
        padding: var(--space-4, 1rem);
        margin-bottom: var(--space-4, 1rem);
      }
      .card__title {
        font-size: var(--font-size-lg, 1.125rem);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-3, 0.75rem);
      }
      .card__note {
        color: var(--neutral-600, #525252);
        font-size: var(--font-size-sm, 0.875rem);
        margin: 0 0 var(--space-2, 0.5rem);
      }
      .metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: var(--space-4, 1rem);
      }
      .ficha {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 0.25rem var(--space-4, 1rem);
        margin: 0;
      }
      .ficha dt {
        color: var(--neutral-600, #525252);
        font-size: var(--font-size-sm, 0.875rem);
      }
      .ficha dd {
        margin: 0;
        color: var(--neutral-700, #404040);
        font-size: var(--font-size-sm, 0.875rem);
      }
      .ficha a,
      .detail__back {
        color: var(--primary-700, #0369a1);
        font-weight: 600;
      }
      .detail__back {
        display: inline-block;
        margin-top: var(--space-4, 1rem);
      }
      @media (max-width: 1023px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 767px) {
        .metrics {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .ficha {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class SnowStationDetailComponent {
  private readonly api = inject(SnowApi);
  private readonly route = inject(ActivatedRoute);

  private readonly slug = signal<string>(this.route.snapshot.paramMap.get("slug") ?? "");

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly notFound = signal(false);
  readonly dto = signal<SnowReportView | null>(null);
  readonly station = signal<StationSummary | null>(null);
  readonly provenance = signal<SnowReportView["provenance"] | null>(null);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    this.notFound.set(false);
    const slug = this.slug();
    if (!slug) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }
    const [report, station] = await Promise.all([this.api.report(slug), this.api.station(slug)]);
    if (!report.ok) {
      if (report.kind === "not-found") this.notFound.set(true);
      else this.error.set(true);
      this.loading.set(false);
      return;
    }
    if (!station.ok) {
      // La estación existe si el parte vino bien; un fallo del maestro se pinta
      // como error recuperable, no como «no existe».
      this.error.set(!(station.kind === "not-found"));
      this.loading.set(false);
      if (!this.error()) this.notFound.set(true);
      return;
    }
    this.dto.set(report.body);
    this.provenance.set(report.body.provenance);
    this.station.set(station.body.station);
    this.loading.set(false);
  }

  /** Campos F1: sólo existen cuando el origen es editorial. */
  editorial(): EditorialReportFields {
    const d = this.dto();
    if (!d) return {};
    return { sourceUrl: d.sourceUrl, author: d.author, capturedAt: d.capturedAt, confidence: d.confidence };
  }

  reason() {
    return this.dto()?.reason ?? null;
  }

  /** Encabezado de la pantalla: cambia con el estado, pero siempre hay uno. */
  title(): string {
    if (this.loading()) return "Cargando estación…";
    if (this.error()) return "No hemos podido cargar esta estación";
    if (this.notFound()) return "Estación no encontrada";
    return this.station()?.name ?? "Estación";
  }

  hasReport(): boolean {
    const d = this.dto();
    if (!d) return false;
    return d.report.operational !== null || d.report.snow !== null;
  }

  countryLabel(): string {
    const c = this.station()?.country;
    return { ES: "España", AD: "Andorra", FR: "Pirineo francés", PT: "Portugal" }[c ?? "ES"];
  }

  /**
   * Fecha del dato del parte, no la de la petición.
   *
   * `updatedAt` es la fecha del parte; `observedAt` es el instante en que se
   * consultó la fuente. Rotular el segundo como «Última actualización» hacía
   * que una estación sin parte pareciera actualizada ahora mismo. Si no hay
   * `updatedAt`, no hay frase.
   */
  lastUpdateText(): string {
    const p = this.provenance();
    if (!p) return "";
    return absoluteDateText(p.updatedAt ?? null);
  }
}
