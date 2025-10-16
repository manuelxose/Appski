import {
  ChangeDetectionStrategy,
  Component,
  signal,
  OnInit,
  inject,
} from "@angular/core";
import { Router } from "@angular/router";
import { ActivatedRoute, Params } from "@angular/router";
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
import { StationDetailDataService } from "./services/station-detail.data.service";

@Component({
  selector: "app-station-detail",
  imports: [
    SiteHeaderComponent,
    SiteFooterComponent,
    StationHeroComponent,
    StationSnowReportComponent,
    StationLiftsSlopesComponent,
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

  // Data signals - initialized with empty data
  stationData = signal<StationHeroData>({
    name: "",
    slug: "",
    region: "",
    location: "",
    heroImage: "",
    status: "closed",
    price: { adult: 0, currency: "€" },
    altitude: { base: 0, top: 0 },
  });

  snowReport = signal<SnowReport>({
    snowBase: 0,
    snowTop: 0,
    snowNew24h: 0,
    snowNew48h: 0,
    snowNew7days: 0,
    snowQuality: "packed-powder",
    lastSnowfall: "",
    temperature: { current: 0, min: 0, max: 0 },
    wind: { speed: 0, direction: "N" },
    visibility: "good",
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
      const data = await this.dataService.loadStationDetail(slug);

      // Update all signals with loaded data
      this.stationData.set(data.hero);
      this.snowReport.set(data.snowReport);
      this.liftsSlopesData.set(data.liftsSlopes);
      this.webcams.set(data.webcams);
      this.forecast.set(data.forecast);
      this.stationInfo.set(data.info);

      this.isLoading.set(false);
    } catch (error) {
      console.error("Error loading station data:", error);
      this.isLoading.set(false);
    }
  }
}
