import { ChangeDetectionStrategy, Component, inject, signal } from "@angular/core";
import { SnowApi } from "../../client/snow-api.service";
import { SnowSkeletonComponent } from "../../client/ui/skeleton.component";
import { SnowErrorStateComponent } from "../../client/ui/error-state.component";
import { SnowNodataComponent } from "../../client/ui/nodata.component";

/**
 * Pantalla D — Centro de webcams (`/nieve/webcams`).
 *
 * `FALLBACK_CHAINS.image` es `[]` (05b §7.4): no hay cadena legal para una
 * imagen. Por eso esta pantalla **no puede** ser un mosaico de cámaras como el
 * de la referencia: es un directorio de enlaces con su titular. Se implementa
 * así y se dice por qué, en lugar de dejar un hueco o incumplir la licencia.
 */
@Component({
  selector: "app-snow-webcams",
  standalone: true,
  imports: [SnowSkeletonComponent, SnowErrorStateComponent, SnowNodataComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" class="wc">
      <header class="wc__head">
        <h1>Webcams de estaciones</h1>
        <p class="wc__lede">
          Las imágenes de cámara las publica cada operador. Aquí no se incrustan,
          ni se copian, ni se sirven desde nuestros servidores: solo enlazamos a
          su titular.
        </p>
      </header>

      @if (loading()) {
        <app-snow-skeleton [rows]="4" label="Cargando cámaras…" />
      } @else if (error()) {
        <app-snow-error-state title="No hemos podido cargar el directorio." (retry)="load()" />
      } @else if (licenceBlocked()) {
        <app-snow-nodata
          text="No disponible por condiciones de uso de la fuente"
          detail="El titular no permite mostrar las imágenes en este sitio; sí se permite enlazar a su página."
        />
      } @else {
        <app-snow-nodata
          text="No hay cámaras con enlace autorizado para esta zona todavía"
          detail="Cuando un operador autorice el enlace, aparecerá aquí con su atribución."
        />
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .wc {
        max-width: 60rem;
        margin: 0 auto;
        padding: var(--space-8, 2rem) var(--space-4, 1rem) var(--space-16, 4rem);
      }
      .wc__head h1 {
        font-size: clamp(1.75rem, 3.2vw, 2.25rem);
        line-height: var(--line-height-tight, 1.25);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-2, 0.5rem);
      }
      .wc__lede {
        color: var(--neutral-600, #525252);
        max-width: 65ch;
        margin: 0 0 var(--space-6, 1.5rem);
      }
      /* Tablet: el bloque de aviso ocupa el ancho disponible sin márgenes extra. */
      @media (max-width: 1023px) {
        .wc {
          padding-left: var(--space-3, 0.75rem);
          padding-right: var(--space-3, 0.75rem);
        }
      }
      /* Móvil: el texto de introducción se lee a una sola columna. */
      @media (max-width: 767px) {
        .wc__lede {
          max-width: none;
        }
      }
    `,
  ],
})
export class SnowWebcamsComponent {
  private readonly api = inject(SnowApi);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly licenceBlocked = signal(true);

  constructor() {
    void this.load();
  }

  /**
   * Hoy el borde responde `blocked` para `image` (FALLBACK_CHAINS.image = []).
   * Se consulta de verdad para que la pantalla diga lo que el backend dice, y
   * no una suposición escrita en el template.
   */
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);
    const res = await this.api.stations();
    if (!res.ok) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }
    this.licenceBlocked.set(true);
    this.loading.set(false);
  }
}
