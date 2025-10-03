import { Injectable, signal, computed, inject } from "@angular/core";
import {
  MeteoNow,
  MeteoForecast,
  WebcamItem,
  RadarInfo,
  WeatherSummary,
  Cota,
  SkiStation,
} from "../models/meteo.models";
import { MeteoDataService } from "./meteo-data.service";
import { MeteoMapperService } from "./meteo-mapper.service";
import { StationsService } from "./stations.service";

/**
 * Estado global de datos meteorológicos usando Signals
 */
@Injectable({ providedIn: "root" })
export class MeteoStateStore {
  private readonly dataService = inject(MeteoDataService);
  private readonly mapper = inject(MeteoMapperService);
  private readonly stationsService = inject(StationsService);

  // Estado raw
  private readonly _now = signal<MeteoNow | null>(null);
  private readonly _forecast = signal<MeteoForecast | null>(null);
  private readonly _webcams = signal<WebcamItem[]>([]);
  private readonly _radar = signal<RadarInfo | null>(null);

  // Estado UI
  private readonly _selectedCota = signal<Cota>("mid");
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);
  private readonly _stationSlug = signal<string>("");

  // Selectores públicos (readonly)
  readonly now = this._now.asReadonly();
  readonly forecast = this._forecast.asReadonly();
  readonly webcams = this._webcams.asReadonly();
  readonly radar = this._radar.asReadonly();
  readonly selectedCota = this._selectedCota.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly stationSlug = this._stationSlug.asReadonly();

  // Información de la estación
  readonly station = computed<SkiStation | null>(() => {
    const slug = this._stationSlug();
    return slug ? this.stationsService.getStationBySlug(slug) : null;
  });

  readonly stationName = computed<string>(() => {
    const station = this.station();
    return station ? station.name : "Cargando...";
  });

  readonly stationFullName = computed<string>(() => {
    const station = this.station();
    return station ? `${station.name}, ${station.region}` : "Cargando...";
  });

  readonly cotaAltitude = computed<number | null>(() => {
    const station = this.station();
    const cota = this._selectedCota();
    return station ? station.altitudes[cota] : null;
  });

  // Computed values
  readonly summaries = computed<WeatherSummary[]>(() => {
    const fc = this._forecast();
    const cota = this._selectedCota();
    if (!fc) return [];
    return this.mapper.generateSummaries(fc, cota);
  });

  readonly nowByCota = computed(() => {
    const now = this._now();
    const cota = this._selectedCota();
    if (!now) return null;
    return this.mapper.filterNowByCota(now, cota);
  });

  readonly forecastByCota = computed(() => {
    const fc = this._forecast();
    const cota = this._selectedCota();
    if (!fc) return [];
    return this.mapper.filterByCota(fc, cota);
  });

  readonly bestSkiingWindow = computed(() => {
    const fc = this._forecast();
    const cota = this._selectedCota();
    if (!fc) return null;
    return this.mapper.findBestSkiingWindow(fc, cota);
  });

  readonly activeWebcams = computed(() => {
    const cota = this._selectedCota();
    return this._webcams().filter(
      (w) => w.active && (!w.cota || w.cota === cota)
    );
  });

  readonly hasData = computed(() => {
    return this._now() !== null || this._forecast() !== null;
  });

  /**
   * Carga todos los datos de una estación
   */
  async loadStation(stationSlug: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);
    this._stationSlug.set(stationSlug);

    try {
      // Cargar todos los datos en paralelo
      const [now, forecast, webcams, radar] = await Promise.all([
        this.dataService.getNow(stationSlug),
        this.dataService.getForecast72(stationSlug),
        this.dataService.getWebcams(stationSlug),
        this.dataService.getRadar(stationSlug),
      ]);

      this._now.set(now);
      this._forecast.set(forecast);
      this._webcams.set(webcams);
      this._radar.set(radar);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al cargar datos meteorológicos";
      this._error.set(message);
      console.error("Error loading station data:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Recarga solo los datos actuales (observación)
   */
  async refreshNow(): Promise<void> {
    const slug = this._stationSlug();
    if (!slug) return;

    try {
      const now = await this.dataService.getNow(slug);
      this._now.set(now);
    } catch (error) {
      console.error("Error refreshing now:", error);
    }
  }

  /**
   * Recarga solo el forecast
   */
  async refreshForecast(): Promise<void> {
    const slug = this._stationSlug();
    if (!slug) return;

    try {
      const forecast = await this.dataService.getForecast72(slug);
      this._forecast.set(forecast);
    } catch (error) {
      console.error("Error refreshing forecast:", error);
    }
  }

  /**
   * Cambia la cota seleccionada
   */
  selectCota(cota: Cota): void {
    this._selectedCota.set(cota);
  }

  /**
   * Limpia el estado
   */
  reset(): void {
    this._now.set(null);
    this._forecast.set(null);
    this._webcams.set([]);
    this._radar.set(null);
    this._selectedCota.set("mid");
    this._isLoading.set(false);
    this._error.set(null);
    this._stationSlug.set("");
  }

  /**
   * Obtiene un snapshot del estado actual (útil para SSR)
   */
  getSnapshot() {
    return {
      now: this._now(),
      forecast: this._forecast(),
      webcams: this._webcams(),
      radar: this._radar(),
      selectedCota: this._selectedCota(),
      stationSlug: this._stationSlug(),
    };
  }
}
