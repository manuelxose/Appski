import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { SnowNodataComponent } from "../../client/ui/nodata.component";

/**
 * Pantalla F — Mapa de estaciones (`/nieve/mapa`).
 *
 * Las teselas públicas de OpenStreetMap están **bloqueadas** para producción
 * comercial (05 §2.10): no se usa ese endpoint ni ningún otro de terceros.
 * La base es PMTiles autohospedado y su URL llega por
 * `PROTOMAPS_BASE_URL` en el servidor; el cliente **no** conoce variables de
 * entorno, así que aquí se modela el resultado de la configuración:
 *
 *  - sin capa base → se dice «sin capa base configurada» y se ofrece la lista
 *    de estaciones (que funciona igual), no un mapa roto;
 *  - con capa base → el mapa se cargaría con Leaflet, de forma diferida, y la
 *    lista textual seguiría presente (SC 1.1.1).
 *
 * Esta pantalla NO monta Leaflet todavía: sin build no hay forma de verificar
 * que el mapa se hidrata bien (§1 de 07-ux-ui.md). Se deja el estado honesto y
 * la lista, y se documenta como pendiente explícito.
 */
@Component({
  selector: "app-snow-map",
  standalone: true,
  imports: [SnowNodataComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main id="main" class="map">
      <header class="map__head">
        <h1>Mapa de estaciones</h1>
        <p class="map__lede">
          Mapa de {{ count() }} estaciones con su estado. La base cartográfica es
          PMTiles autohospedado; nunca teselas públicas de OpenStreetMap.
        </p>
      </header>

      @if (!baseConfigured()) {
        <app-snow-nodata
          text="Sin capa base configurada"
          detail="El mapa necesita una base cartográfica autohospedada (PROTOMAPS_BASE_URL). La lista de estaciones funciona igual."
        />
        <p class="map__attribution">© OpenStreetMap contributors · ODbL</p>
      } @else {
        <div class="map__canvas" role="img" aria-label="Mapa de estaciones del catálogo"></div>
        <p class="map__attribution">© OpenStreetMap contributors · ODbL</p>
      }
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .map {
        max-width: 72rem;
        margin: 0 auto;
        padding: var(--space-8, 2rem) var(--space-4, 1rem) var(--space-16, 4rem);
      }
      .map__head h1 {
        font-size: clamp(1.75rem, 3.2vw, 2.25rem);
        line-height: var(--line-height-tight, 1.25);
        color: var(--neutral-700, #404040);
        margin: 0 0 var(--space-2, 0.5rem);
      }
      .map__lede {
        color: var(--neutral-600, #525252);
        max-width: 65ch;
        margin: 0 0 var(--space-6, 1.5rem);
      }
      .map__canvas {
        min-height: 24rem;
        border-radius: var(--radius-base, 0.5rem);
        border: 1px solid var(--neutral-200, #e5e5e5);
        background: var(--neutral-100, #f5f5f5);
      }
      .map__attribution {
        margin: var(--space-3, 0.75rem) 0 0;
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--neutral-600, #525252);
      }
      /* Tablet: el lienzo reduce altura mínima para no empujar la atribución. */
      @media (max-width: 1023px) {
        .map__canvas {
          min-height: 18rem;
        }
      }
      /* Móvil: el lienzo se adapta y la atribución sigue visible bajo él. */
      @media (max-width: 767px) {
        .map__canvas {
          min-height: 14rem;
        }
      }
    `,
  ],
})
export class SnowMapComponent {
  /** En esta entrega no hay capa base: `PROTOMAPS_BASE_URL` no está servida. */
  readonly baseConfigured = signal(false);
  readonly count = signal(0);
}
