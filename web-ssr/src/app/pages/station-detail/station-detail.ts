import {
  ChangeDetectionStrategy,
  Component,
  signal,
  OnInit,
  inject,
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { ActivatedRoute, Params } from "@angular/router";
import type { StationDetailDto } from "../../snow/models/dto";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { StationHeroComponent } from "./components/station-hero/station-hero.component";
import { StationSnowReportComponent } from "./components/station-snow-report/station-snow-report.component";
import { StationLiftsSlopesComponent } from "./components/station-lifts-slopes/station-lifts-slopes.component";
import {
  StationHeroData,
  SnowReport,
  LiftsSlopesData,
  Webcam,
  DailyForecast,
  StationInfo,
} from "./models/station-detail.models";
import {
  StationDetailDataService,
  type StationReportState,
} from "./services/station-detail.data.service";

@Component({
  selector: "app-station-detail",
  imports: [
    SiteHeaderComponent,
    SiteFooterComponent,
    StationHeroComponent,
    StationSnowReportComponent,
    StationLiftsSlopesComponent,
    RouterLink,
  ],
  templateUrl: "./station-detail.html",
  styleUrl: "./station-detail.css",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly dataService = inject(StationDetailDataService);
  private readonly router = inject(Router);

  // State signals
  slug = signal<string>("");
  isLoading = signal<boolean>(true);
  /** `true` si el borde respondió 404 para el slug pedido. */
  notFound = signal<boolean>(false);
  /** Estado REAL del parte declarado por el borde. */
  reportState = signal<StationReportState | null>(null);
  /** DTO del maestro tal como lo sirve el borde (región, disciplina, web reales). */
  station = signal<StationDetailDto | null>(null);

  // Data signals - initialized with empty data
  stationData = signal<StationHeroData>({
    name: "",
    slug: "",
    region: "",
    location: "",
    heroImage: "",
    status: "closed",
    price: null,
    altitude: { base: null, top: null },
  });

  snowReport = signal<SnowReport>({
    snowBase: null,
    snowTop: null,
    snowNew24h: null,
    snowNew48h: null,
    snowNew7days: null,
    snowQuality: null,
    lastSnowfall: "",
    temperature: { current: null, min: null, max: null },
    wind: { speed: null, direction: "" },
    visibility: "unknown",
    updatedAt: "",
  });

  liftsSlopesData = signal<LiftsSlopesData>({
    lifts: { open: 0, total: 0, list: [] },
    slopes: { open: 0, total: 0, list: [] },
  });

  webcams = signal<Webcam[]>([]);
  forecast = signal<DailyForecast[]>([]);
  stationInfo = signal<StationInfo>({
    about: "",
    services: [],
    access: { car: "", publicTransport: "", parking: "" },
    prices: { adult: 0, child: 0, senior: 0, season: 0, currency: "€" },
  });

  async ngOnInit(): Promise<void> {
    this.route.params.subscribe(async (params: Params) => {
      const slug = params["slug"];
      this.slug.set(slug);
      await this.loadStationData(slug);
    });
  }

  // Navega a la página weather con el slug actual
  goToWeather(): void {
    const slug = this.slug();
    if (slug) {
      this.router.navigate(["/estacion", slug, "tiempo"]);
    }
  }

  private async loadStationData(slug: string): Promise<void> {
    try {
      this.isLoading.set(true);
      const result = await this.dataService.loadStationDetail(slug);

      // 404 del borde: NO se rellena con datos de otra estación (el mock anterior
      // caía a baqueira-beret.mock.json y mostraba un parte ajeno como propio).
      if (!result.found) {
        this.notFound.set(true);
        this.isLoading.set(false);
        return;
      }

      this.station.set(result.station);
      const data = result.data;
      this.stationData.set(data.hero);
      this.snowReport.set(data.snowReport);
      this.liftsSlopesData.set(data.liftsSlopes);
      this.webcams.set(data.webcams);
      this.forecast.set(data.forecast);
      this.stationInfo.set(data.info);
      // Estado REAL del parte (no_data/not_configured/blocked/stale).
      this.reportState.set(result.reportState);

      this.isLoading.set(false);
    } catch (error) {
      console.error("Error loading station data:", error);
      this.isLoading.set(false);
    }
  }
}
