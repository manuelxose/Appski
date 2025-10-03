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
import { HomeDataService } from "../../pages/home/services/home.data.service";
import type { FeaturedStation } from "../../pages/home/models/home.models";

@Component({
  selector: "app-stations-featured",
  standalone: true,
  imports: [RouterLink, StationCardComponent],
  templateUrl: "./stations-featured.component.html",
  styleUrls: ["./stations-featured.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationsFeaturedComponent implements OnInit {
  private readonly homeDataService = inject(HomeDataService);

  featuredStations = signal<Station[]>([]);

  async ngOnInit(): Promise<void> {
    const data = await this.homeDataService.loadFeaturedStations();
    // Adaptar FeaturedStation a Station
    const adapted = data.map((fs) => this.adaptToStation(fs));
    this.featuredStations.set(adapted);
  }

  /**
   * Adapta FeaturedStation (del mock) a Station (del componente station-card).
   */
  private adaptToStation(fs: FeaturedStation): Station {
    // Mapear temperatura a emoji de clima
    const weather = this.getWeatherEmoji(fs.tempC, fs.windKmh);

    return {
      id: fs.id,
      name: fs.name,
      location: fs.region,
      image: fs.imageUrl,
      isOpen: fs.status === "open",
      snowBase: fs.snowBaseCm,
      snowTop: fs.snowBaseCm + 50, // Estimación (no tenemos dato de cima)
      snowFresh: fs.snowNew24hCm,
      liftsOpen: fs.remontesOpen,
      liftsTotal: fs.remontesTotal,
      slopesOpen: fs.pistasOpen,
      slopesTotal: fs.pistasTotal,
      weather,
      temperature: fs.tempC,
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
