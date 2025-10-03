import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { Subject, takeUntil } from "rxjs";

// Services
import { MeteoStateStore } from "./services/meteo-state.store";
import { SnowDataService } from "./services/snow-data.service";
import { MeteoDataService } from "./services/meteo-data.service";

// Components
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { TiempoCotaSelectorComponent } from "./components/tiempo-cota-selector/tiempo-cota-selector.component";
import { TiempoLegendComponent } from "./components/tiempo-legend/tiempo-legend.component";
import { TiempoSkeletonComponent } from "./components/tiempo-skeleton/tiempo-skeleton.component";
import { TiempoErrorStateComponent } from "./components/tiempo-error-state/tiempo-error-state.component";
import { TiempoNowPanelComponent } from "./components/tiempo-now-panel/tiempo-now-panel.component";
import { TiempoSnowSummaryComponent } from "./components/tiempo-snow-summary/tiempo-snow-summary.component";
import { TiempoForecastChartsComponent } from "./components/tiempo-forecast-charts/tiempo-forecast-charts.component";
import { Forecast72hTableComponent } from "./components/forecast-72h-table/forecast-72h-table.component";
import { TiempoWebcamsGridComponent } from "./components/tiempo-webcams-grid/tiempo-webcams-grid.component";
import { TiempoWebcamModalComponent } from "./components/tiempo-webcam-modal/tiempo-webcam-modal.component";
import { WebcamTimelineComponent } from "./components/webcam-timeline/webcam-timeline.component";
import { TiempoRadarWidgetComponent } from "./components/tiempo-radar-widget/tiempo-radar-widget.component";
import { SnowConditionsPanelComponent } from "./components/snow-conditions-panel/snow-conditions-panel.component";
import { DetailedForecastTableComponent } from "./components/detailed-forecast-table/detailed-forecast-table.component";
import { WeekForecastTableComponent } from "./components/week-forecast-table/week-forecast-table.component";
import { WeekForecastChartsComponent } from "./components/week-forecast-charts/week-forecast-charts.component";
import { SeasonStatsPanelComponent } from "./components/season-stats-panel/season-stats-panel.component";
import { SeasonChartsPanelComponent } from "./components/season-charts-panel/season-charts-panel.component";
import { AlertsPanelComponent } from "./components/alerts-panel/alerts-panel.component";

// Models
import {
  Cota,
  WebcamItem,
  WebcamHistory,
  SnowConditions,
  DetailedForecastDay,
  WeekForecastDay,
  SeasonStats,
  SeasonChartData,
} from "./models/meteo.models";

type Tab = "now" | "forecast" | "snow" | "webcams" | "radar";

@Component({
  selector: "app-tiempo-page",
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    SiteFooterComponent,
    TiempoCotaSelectorComponent,
    TiempoLegendComponent,
    TiempoSkeletonComponent,
    TiempoErrorStateComponent,
    TiempoNowPanelComponent,
    TiempoSnowSummaryComponent,
    TiempoForecastChartsComponent,
    Forecast72hTableComponent,
    TiempoWebcamsGridComponent,
    TiempoWebcamModalComponent,
    WebcamTimelineComponent,
    TiempoRadarWidgetComponent,
    SnowConditionsPanelComponent,
    DetailedForecastTableComponent,
    WeekForecastTableComponent,
    WeekForecastChartsComponent,
    SeasonStatsPanelComponent,
    SeasonChartsPanelComponent,
    AlertsPanelComponent,
  ],
  template: `
    <div class="tiempo-page">
      <app-site-header
        [stationStatus]="store.station()?.status || null"
        [stationName]="stationName()"
      />

      <main class="mt-16 md:mt-20">
        <!-- Hero Header -->
        <section class="hero-section">
          <div class="container mx-auto px-4 py-8">
            <div class="hero-content">
              <h1 class="hero-title">Tiempo en {{ stationName() }}</h1>
              <p class="hero-subtitle">
                Datos meteorológicos hiperlocales en tiempo real
              </p>
            </div>
          </div>
        </section>

        <!-- Alerts Panel -->
        <div class="container mx-auto px-4 pt-4">
          <app-alerts-panel />
        </div>

        <div class="container mx-auto px-4 py-8">
          @if (store.isLoading()) {
          <app-tiempo-skeleton />
          } @else if (store.error()) {
          <app-tiempo-error-state
            [title]="'Error al cargar datos'"
            [message]="store.error()!"
            (retry)="handleRetry()"
          />
          } @else if (store.hasData()) {
          <!-- Summary Cards -->
          @if (store.summaries().length > 0) {
          <div class="section-spacing">
            <app-tiempo-snow-summary [summaries]="store.summaries()" />
          </div>
          }

          <!-- Cota Selector -->
          <div class="section-spacing">
            <app-tiempo-cota-selector
              [selected]="store.selectedCota()"
              [showLegend]="true"
              [baseAltitude]="
                store.station() ? store.station()!.altitudes.base : null
              "
              [midAltitude]="
                store.station() ? store.station()!.altitudes.mid : null
              "
              [topAltitude]="
                store.station() ? store.station()!.altitudes.top : null
              "
              (cotaChange)="handleCotaChange($event)"
            />
          </div>

          <!-- Tabs Navigation -->
          <nav
            class="tabs-nav section-spacing"
            aria-label="Navegación de datos meteorológicos"
          >
            <button
              type="button"
              class="tab-button"
              [class.active]="activeTab() === 'now'"
              (click)="selectTab('now')"
            >
              <span class="tab-icon">📊</span>
              <span class="tab-label">Ahora</span>
            </button>
            <button
              type="button"
              class="tab-button"
              [class.active]="activeTab() === 'forecast'"
              (click)="selectTab('forecast')"
            >
              <span class="tab-icon">📈</span>
              <span class="tab-label">72 Horas</span>
            </button>
            <button
              type="button"
              class="tab-button"
              [class.active]="activeTab() === 'snow'"
              (click)="selectTab('snow')"
            >
              <span class="tab-icon">❄️</span>
              <span class="tab-label">Nieve</span>
            </button>
            <button
              type="button"
              class="tab-button"
              [class.active]="activeTab() === 'webcams'"
              (click)="selectTab('webcams')"
            >
              <span class="tab-icon">📷</span>
              <span class="tab-label">Webcams</span>
            </button>
            <button
              type="button"
              class="tab-button"
              [class.active]="activeTab() === 'radar'"
              (click)="selectTab('radar')"
            >
              <span class="tab-icon">📡</span>
              <span class="tab-label">Radar</span>
            </button>
          </nav>

          <!-- Tab Content -->
          <div class="tab-content section-spacing">
            @switch (activeTab()) { @case ('now') {
            <app-tiempo-now-panel [data]="store.nowByCota()" />
            } @case ('forecast') {
            <app-forecast-72h-table [points]="store.forecastByCota()" />
            <app-tiempo-forecast-charts [points]="store.forecastByCota()" />
            } @case ('snow') {
            <!-- Estado de la Nieve -->
            @if (snowDataLoading()) {
            <app-tiempo-skeleton />
            } @else { @if (snowConditions()) {
            <app-snow-conditions-panel
              [conditions]="snowConditions()!"
              [selectedCota]="store.selectedCota()"
            />
            } @if (detailedForecast().length > 0) {
            <app-detailed-forecast-table
              [days]="detailedForecast()"
              [stationName]="store.stationName()"
              [topAltitude]="
                store.station() ? store.station()!.altitudes.top : null
              "
              [bottomAltitude]="
                store.station() ? store.station()!.altitudes.base : null
              "
            />
            } @if (weekForecast().length > 0) {
            <div class="forecast-8days-section">
              <div class="view-toggle">
                <button
                  class="toggle-button"
                  [class.active]="weekForecastView() === 'table'"
                  (click)="setWeekForecastView('table')"
                >
                  <span class="toggle-icon">📋</span>
                  <span class="toggle-label">Tabla</span>
                </button>
                <button
                  class="toggle-button"
                  [class.active]="weekForecastView() === 'charts'"
                  (click)="setWeekForecastView('charts')"
                >
                  <span class="toggle-icon">📊</span>
                  <span class="toggle-label">Gráficos</span>
                </button>
              </div>
              @if (weekForecastView() === 'table') {
              <app-week-forecast-table
                [days]="weekForecast()"
                [stationName]="store.stationName()"
                [topAltitude]="
                  store.station() ? store.station()!.altitudes.top : null
                "
                [bottomAltitude]="
                  store.station() ? store.station()!.altitudes.base : null
                "
              />
              } @else {
              <app-week-forecast-charts
                [days]="weekForecast()"
                [stationName]="store.stationName()"
                [topAltitude]="
                  store.station() ? store.station()!.altitudes.top : null
                "
                [bottomAltitude]="
                  store.station() ? store.station()!.altitudes.base : null
                "
              />
              }
            </div>
            } @if (seasonStats()) {
            <app-season-stats-panel [stats]="seasonStats()!" />
            } @if (seasonCharts()) {
            <app-season-charts-panel [data]="seasonCharts()!" />
            } } } @case ('webcams') {
            <app-tiempo-webcams-grid
              [webcams]="store.activeWebcams()"
              (webcamClick)="handleWebcamClick($event)"
            />
            @if (selectedWebcamHistory()) {
            <div class="timeline-wrapper">
              <app-webcam-timeline
                [history]="selectedWebcamHistory()"
                [availableWebcams]="store.activeWebcams()"
                (dateChange)="handleDateChange($event)"
                (webcamChange)="handleWebcamChange($event)"
              />
            </div>
            } } @case ('radar') {
            <app-tiempo-radar-widget [data]="store.radar()" />
            } }
          </div>

          <!-- Legend -->
          <div class="section-spacing">
            <app-tiempo-legend />
          </div>

          <!-- Best Skiing Window -->
          @if (store.bestSkiingWindow(); as window) {
          <div class="section-spacing">
            <div class="best-window-card">
              <div class="card-icon">⭐</div>
              <div class="card-content">
                <h3 class="card-title">Mejor Ventana para Esquiar</h3>
                <p class="card-text">
                  De {{ formatTime(window.start) }} a
                  {{ formatTime(window.end) }}
                </p>
                <div class="card-score">
                  Puntuación:
                  <span class="score-value">{{ window.score }}/100</span>
                </div>
              </div>
            </div>
          </div>
          } }
        </div>
      </main>

      <app-site-footer />

      <!-- Webcam Modal -->
      @if (selectedWebcam()) {
      <app-tiempo-webcam-modal
        [webcam]="selectedWebcam()"
        (closeModal)="closeWebcamModal()"
      />
      }
    </div>
  `,
  styles: [
    `
      .tiempo-page {
        min-height: 100vh;
        background: var(--neutral-50);
      }

      .hero-section {
        background: white;
        border-bottom: 1px solid var(--neutral-200);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .hero-content {
        max-width: 1200px;
        margin: 0 auto;
      }

      .hero-title {
        margin: 0 0 0.5rem 0;
        font-size: 2rem;
        font-weight: 700;
        color: var(--neutral-900);
        letter-spacing: -0.025em;
      }

      .hero-subtitle {
        margin: 0;
        font-size: 1rem;
        color: var(--neutral-600);
        font-weight: 500;
      }

      .section-spacing {
        margin-bottom: 2rem;
      }

      .tabs-nav {
        display: flex;
        gap: 0rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--neutral-200);
        overflow: hidden;
        overflow-x: auto;
      }

      .tab-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        flex: 1;
        padding: 1rem 1.5rem;
        border: none;
        background: white;
        border-radius: 0;
        border-right: 1px solid var(--neutral-200);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-700);
        white-space: nowrap;
        position: relative;
      }

      .tab-button:last-child {
        border-right: none;
      }

      .tab-button:hover {
        background: var(--neutral-50);
        color: var(--primary-600);
      }

      .tab-button.active {
        background: var(--primary-50);
        color: var(--primary-700);
        border-bottom: 3px solid var(--primary-600);
      }

      .tab-button.active:hover {
        background: var(--primary-100);
      }

      .tab-button:focus-visible {
        outline: 2px solid var(--primary-500);
        outline-offset: 2px;
      }

      .tab-icon {
        font-size: 1.25rem;
      }

      .tab-content {
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .timeline-wrapper {
        margin-top: 2rem;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .best-window-card {
        background: linear-gradient(
          135deg,
          var(--success-50) 0%,
          var(--success-100) 100%
        );
        border: 2px solid var(--success-300);
        border-radius: 16px;
        padding: 2rem;
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .card-icon {
        font-size: 3rem;
        flex-shrink: 0;
      }

      .card-content {
        flex: 1;
      }

      .card-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--success-900);
      }

      .card-text {
        margin: 0 0 0.75rem 0;
        font-size: 1.125rem;
        color: var(--success-700);
      }

      .card-score {
        font-size: 0.9375rem;
        color: var(--success-700);
        font-weight: 600;
      }

      .score-value {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--success-900);
      }

      /* Week Forecast Toggle */
      .forecast-8days-section {
        position: relative;
      }

      .view-toggle {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        justify-content: flex-end;
      }

      .toggle-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        background: white;
        border: 2px solid var(--neutral-200);
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-700);
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      }

      .toggle-button:hover {
        background: var(--neutral-50);
        border-color: var(--primary-400);
        transform: translateY(-1px);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
      }

      .toggle-button.active {
        background: linear-gradient(
          135deg,
          var(--primary-500),
          var(--primary-600)
        );
        border-color: var(--primary-600);
        color: white;
        box-shadow: 0 4px 12px rgba(var(--primary-500-rgb), 0.25);
      }

      .toggle-button.active:hover {
        background: linear-gradient(
          135deg,
          var(--primary-600),
          var(--primary-700)
        );
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(var(--primary-500-rgb), 0.35);
      }

      .toggle-icon {
        font-size: 1.25rem;
        line-height: 1;
      }

      .toggle-label {
        font-size: 0.875rem;
      }

      @media (max-width: 768px) {
        .hero-title {
          font-size: 2rem;
        }

        .hero-subtitle {
          font-size: 1rem;
        }

        .tabs-nav {
          padding: 0.375rem;
        }

        .tab-button {
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
        }

        .tab-label {
          display: none;
        }

        .best-window-card {
          flex-direction: column;
          text-align: center;
        }
      }
    `,
  ],
})
export class TiempoPageComponent implements OnInit, OnDestroy {
  readonly store = inject(MeteoStateStore);
  private readonly route = inject(ActivatedRoute);
  private readonly destroy$ = new Subject<void>();

  readonly activeTab = signal<Tab>("now");
  readonly selectedWebcam = signal<WebcamItem | null>(null);
  readonly selectedWebcamHistory = signal<WebcamHistory | null>(null);
  readonly weekForecastView = signal<"table" | "charts">("table");

  // Datos de estado de nieve
  private readonly snowService = inject(SnowDataService);
  private readonly meteoService = inject(MeteoDataService);
  readonly snowConditions = signal<SnowConditions | null>(null);
  private readonly _detailedForecast = signal<DetailedForecastDay[]>([]);
  private readonly _weekForecast = signal<WeekForecastDay[]>([]);
  private readonly _seasonStats = signal<SeasonStats | null>(null);
  readonly seasonCharts = signal<SeasonChartData | null>(null);
  readonly snowDataLoading = signal<boolean>(false);

  // Computed signals que adaptan datos según cota seleccionada
  readonly detailedForecast = computed<DetailedForecastDay[]>(() => {
    const days = this._detailedForecast();
    const cota = this.store.selectedCota();
    if (cota === "mid") return days; // Sin filtro para 'mid'

    return days.map((day) => ({
      ...day,
      blocks: day.blocks.map((block) => ({
        ...block,
        tempTopC: cota === "top" ? block.tempTopC : block.tempBottomC,
        tempBottomC: cota === "top" ? block.tempTopC : block.tempBottomC,
        feelsLikeTopC:
          cota === "top" ? block.feelsLikeTopC : block.feelsLikeBottomC,
        feelsLikeBottomC:
          cota === "top" ? block.feelsLikeTopC : block.feelsLikeBottomC,
        windTopKmh: cota === "top" ? block.windTopKmh : block.windBottomKmh,
        windBottomKmh: cota === "top" ? block.windTopKmh : block.windBottomKmh,
        snowTopCm: cota === "top" ? block.snowTopCm : block.snowBottomCm,
        snowBottomCm: cota === "top" ? block.snowTopCm : block.snowBottomCm,
      })),
    }));
  });

  readonly weekForecast = computed<WeekForecastDay[]>(() => {
    const days = this._weekForecast();
    const cota = this.store.selectedCota();
    if (cota === "mid") return days; // Sin filtro para 'mid'

    return days.map((day) => ({
      ...day,
      tempTopC: cota === "top" ? day.tempTopC : day.tempBottomC,
      tempBottomC: cota === "top" ? day.tempTopC : day.tempBottomC,
      windTopKmh: cota === "top" ? day.windTopKmh : day.windBottomKmh,
      windBottomKmh: cota === "top" ? day.windTopKmh : day.windBottomKmh,
      snowTopCm: cota === "top" ? day.snowTopCm : day.snowBottomCm,
      snowBottomCm: cota === "top" ? day.snowTopCm : day.snowBottomCm,
    }));
  });

  readonly seasonStats = computed<SeasonStats | null>(() => {
    const stats = this._seasonStats();
    if (!stats) return null;

    const cota = this.store.selectedCota();
    if (cota === "mid") return stats; // Sin filtro para 'mid'

    // Adaptar estadísticas según cota
    if (cota === "top") {
      return {
        ...stats,
        snowBaseCm: stats.snowTopCm,
        daysSnowBase: stats.daysSnowTop,
        intenseDaysBase: stats.intenseDaysTop,
      };
    } else {
      // base
      return {
        ...stats,
        snowTopCm: stats.snowBaseCm,
        daysSnowTop: stats.daysSnowBase,
        intenseDaysTop: stats.intenseDaysBase,
      };
    }
  });

  // Usar el nombre de estación del store (ahora dinámico desde StationsService)
  readonly stationName = this.store.stationName;

  async ngOnInit(): Promise<void> {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const slug = params["slug"] || "baqueira-beret";
      this.store.loadStation(slug);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.store.reset();
  }

  selectTab(tab: Tab): void {
    this.activeTab.set(tab);

    // Cargar datos de nieve cuando se selecciona la tab
    if (tab === "snow" && !this.snowConditions()) {
      this.loadSnowData();
    }
  }

  private async loadSnowData(): Promise<void> {
    const slug = this.store.stationSlug();
    if (!slug) return;

    this.snowDataLoading.set(true);

    try {
      const [conditions, detailed, week, stats, charts] = await Promise.all([
        this.snowService.getSnowConditions(slug),
        this.snowService.getDetailedForecast(slug),
        this.snowService.getWeekForecast(slug),
        this.snowService.getSeasonStats(slug),
        this.snowService.getSeasonChartData(slug),
      ]);

      this.snowConditions.set(conditions);
      this._detailedForecast.set(detailed);
      this._weekForecast.set(week);
      this._seasonStats.set(stats);
      this.seasonCharts.set(charts);
    } catch (error) {
      console.error("Error loading snow data:", error);
    } finally {
      this.snowDataLoading.set(false);
    }
  }

  handleCotaChange(cota: Cota): void {
    this.store.selectCota(cota);
  }

  setWeekForecastView(view: "table" | "charts"): void {
    this.weekForecastView.set(view);
  }

  async handleWebcamClick(webcam: WebcamItem): Promise<void> {
    // Abrir modal y cargar histórico automáticamente
    this.selectedWebcam.set(webcam);
    this.activeTab.set("webcams");

    // Cargar histórico en background
    await this.loadWebcamHistory(webcam.id, webcam.name);
  }

  private async loadWebcamHistory(
    webcamId: string,
    webcamName: string,
    date?: string
  ): Promise<void> {
    const slug = this.store.stationSlug();
    if (!slug) return;

    try {
      const history = await this.meteoService.getWebcamHistory(
        slug,
        webcamId,
        webcamName,
        date
      );
      this.selectedWebcamHistory.set(history);
    } catch (error) {
      console.error("Error loading webcam history:", error);
      this.selectedWebcamHistory.set(null);
    }
  }

  async handleDateChange(date: string): Promise<void> {
    const webcam = this.selectedWebcam();
    if (!webcam) return;

    // Recargar histórico con la nueva fecha seleccionada
    await this.loadWebcamHistory(webcam.id, webcam.name, date);
  }

  async handleWebcamChange(webcamId: string): Promise<void> {
    // Buscar la webcam seleccionada en la lista de webcams activas
    const webcam = this.store.activeWebcams().find((w) => w.id === webcamId);
    if (!webcam) return;

    // Actualizar la webcam seleccionada
    this.selectedWebcam.set(webcam);

    // Cargar el histórico de la nueva webcam con la fecha actual
    const history = this.selectedWebcamHistory();
    const currentDate = history?.dateRange?.from
      ? new Date(history.dateRange.from).toISOString().split("T")[0]
      : undefined;
    await this.loadWebcamHistory(webcam.id, webcam.name, currentDate);
  }

  closeWebcamModal(): void {
    this.selectedWebcam.set(null);
  }

  handleRetry(): void {
    const slug = this.store.stationSlug();
    if (slug) {
      this.store.loadStation(slug);
    }
  }

  formatTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
