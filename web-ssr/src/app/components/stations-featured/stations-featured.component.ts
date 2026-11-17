import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject,
  OnInit,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  StationCardComponent,
  type Station,
} from "../station-card/station-card.component";
import { SnowApi } from "../../snow/client/snow-api.service";
import type { StationDetailDto } from "../../snow/models/dto";


@Component({
  selector: "app-stations-featured",
  standalone: true,
  imports: [RouterLink, StationCardComponent],
  templateUrl: "./stations-featured.component.html",
  styleUrls: ["./stations-featured.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationsFeaturedComponent implements OnInit {
  private readonly snowApi = inject(SnowApi);

  featuredStations = signal<Station[]>([]);

  async ngOnInit(): Promise<void> {
    // Estaciones destacadas: el bloque es del módulo nieve, así que se sirve del
    // BORDE REAL (maestro editorial). Antes venía de `home.data.service` (mock).
    const res = await this.snowApi.stations({ pageSize: 3, sort: "name" });
    if (!res.ok || res.body.status !== "ok") {
      // Sin dato ⇒ lista vacía: la plantilla muestra su estado vacío, sin cifras.
      this.featuredStations.set([]);
      return;
    }
    this.featuredStations.set(res.body.stations.map((s) => this.adaptToStation(s)));
  }

  /** Proyecta el DTO del borde al contrato de `app-station-card` (sin rellenos). */
  private adaptToStation(s: StationDetailDto): Station {
    return {
      id: s.slug,
      name: s.name,
      location: s.region,
      image: "",
      isOpen: s.season === "open",
      // Cifra del BORDE o `null`. Ya NO se fabrica `snowBaseCm + 50` como cima.
      snowBase: s.snow?.baseCm ?? null,
      snowTop: null,
      snowFresh: null,
      liftsOpen: null,
      liftsTotal: null,
      slopesOpen: null,
      slopesTotal: null,
      // Sin estación meteorológica autorizada no hay temperatura ni tiempo.
      weather: "",
      temperature: null,
    };
  }

  /**
   * Genera emoji de clima según temperatura y viento.
   */
  private getWeatherEmoji(tempC: number, windKmh: number): string {
    if (tempC < -5 && windKmh > 20) return "🌨️"; // Nieve con viento
    if (tempC < 0) return "❄️"; // Frío
    if (tempC < 5) return "⛅"; // Parcialmente nublado
    return "☀️"; // Soleado
  }
}
