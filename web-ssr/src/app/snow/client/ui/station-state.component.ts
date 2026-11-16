import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";
import { stationStatus, type StationStatus } from "./station-status";
import type { SnowReportDto } from "../../models/dto";
import { REASON_TEXT, hasValues, publicReason, toScreenState } from "./screen-state";
import { absoluteDateText } from "./freshness";

/**
 * Estado del parte de una estación, honesto en los siete estados.
 *
 * Este componente es el único sitio donde se decide «¿pinto valores o pinto una
 * frase?». Regla: si el estado no permite valores, **no se pinta ni un número**;
 * se pinta la frase canónica del motivo y, si se conoce, el último parte con su
 * fecha y zona horaria.
 *
 * Reutiliza `stationStatus` (que ya resuelve U3: abierta con espesor
 * desconocido) y `toScreenState`; no reimplementa decisiones.
 */
@Component({
  selector: "app-snow-station-state",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="state" [attr.data-state]="state()">
      <span class="state__badge" [class]="'state__badge state__badge--' + status().key">
        <span aria-hidden="true">{{ status().glyph }}</span>
        <span>{{ statusLabel() }}</span>
      </span>

      @if (status().depthUnknown) {
        <span class="state__note">Abierta, espesor sin publicar</span>
      }

      @if (showReason()) {
        <p class="state__reason">
          <span class="state__glyph" aria-hidden="true">?</span>
          {{ reasonText() }}
        </p>
      }
      @if (lastKnownText()) {
        <p class="state__last">Último parte conocido: {{ lastKnownText() }}</p>
      }
      @if (state() === "stale") {
        <p class="state__stale" role="status">
          <span aria-hidden="true">◔</span> Desfasado · {{ freshnessText() }}
        </p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .state {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .state__badge {
        display: inline-flex;
        align-items: center;
        gap: 0.375rem;
        align-self: flex-start;
        padding: 0.125rem var(--space-2, 0.5rem);
        border-radius: var(--radius-base, 0.5rem);
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
      }
      /* Contraste medido en 07-ux-ui.md §12; el color es el tercer canal. */
      .state__badge--open {
        background: var(--success-700, #15803d);
        color: #ffffff;
      }
      .state__badge--closed {
        background: var(--warning-700, #b45309);
        color: #ffffff;
      }
      .state__badge--unknown,
      .state__badge--blocked {
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
        outline: 1px solid var(--neutral-500, #737373);
      }
      .state__note,
      .state__last {
        margin: 0;
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--neutral-600, #525252);
      }
      .state__reason {
        margin: 0;
        display: flex;
        gap: 0.375rem;
        padding: var(--space-2, 0.5rem);
        border-radius: var(--radius-sm, 0.375rem);
        background: var(--neutral-100, #f5f5f5);
        color: var(--neutral-700, #404040);
        font-size: var(--font-size-sm, 0.875rem);
      }
      .state__glyph {
        font-weight: 700;
      }
      .state__stale {
        margin: 0;
        padding: 0.25rem var(--space-2, 0.5rem);
        border-radius: var(--radius-sm, 0.375rem);
        background: var(--warning-50, #fffbeb);
        color: var(--warning-700, #b45309);
        font-size: var(--font-size-sm, 0.875rem);
      }
    `,
  ],
})
export class SnowStationStateComponent {
  /** DTO del borde, o `null` mientras carga. */
  readonly dto = input<SnowReportDto | null>(null);
  /** Estado explícito cuando no hay DTO (carga o error de red). */
  readonly forced = input<"loading" | "error" | null>(null);

  readonly state = computed(() => (this.forced() ? this.forced()! : this.dto() ? toScreenState(this.dto()!.status) : "loading"));
  readonly status = computed<StationStatus>(() => stationStatus(this.dto()));

  readonly statusLabel = computed(
    () => ({ open: "Abierta", closed: "Cerrada", unknown: "Sin datos", blocked: "No disponible" }[this.status().key])
  );

  /** ¿Se pinta frase de motivo? Sólo si NO hay valores para enseñar. */
  readonly showReason = computed(() => {
    const s = this.state();
    return s === "nodata" || s === "not_configured" || s === "blocked";
  });

  readonly reasonText = computed(() =>
    REASON_TEXT[publicReason(this.state(), this.dto()?.reason ?? null)]
  );

  /**
   * Último parte declarado por la fuente, con zona horaria explícita.
   *
   * Sólo `updatedAt`: es la fecha del PARTE. `observedAt` es el instante de la
   * petición y no dice nada del parte; usarlo de reserva afirmaba «último parte
   * conocido» sobre estaciones que nunca publicaron uno (status `no_data`).
   * Si no hay `updatedAt`, no hay frase: el silencio es más honesto que una
   * fecha inventada.
   */
  readonly lastKnownText = computed(() => {
    const p = this.dto();
    if (!p || hasValues(this.state())) return "";
    return absoluteDateText(p.provenance?.updatedAt ?? null);
  });

  readonly freshnessText = computed(() => {
    const f = this.dto()?.provenance?.freshness;
    if (typeof f !== "number") return "";
    if (f < 60) return "hace un momento";
    if (f < 3600) return `hace ${Math.floor(f / 60)} min`;
    if (f < 86400) return `hace ${Math.floor(f / 3600)} h`;
    return `hace ${Math.floor(f / 86400)} días`;
  });
}
