import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * INTERFACES - Analytics de Estaciones
 */

// Métricas de rendimiento por estación
interface StationPerformance {
  stationId: string;
  stationName: string;
  slug: string;
  totalBookings: number;
  totalRevenue: number;
  averageOccupancy: number; // Porcentaje
  averageRating: number; // 0-5
  totalReviews: number;
  pageViews: number;
  conversionRate: number; // Porcentaje
  revenueGrowth: number; // Porcentaje vs mes anterior
  bookingsGrowth: number; // Porcentaje vs mes anterior
  location: {
    lat: number;
    lng: number;
    region: string;
  };
}

// Evolución mensual de una estación
interface StationMonthlyData {
  month: string;
  year: number;
  bookings: number;
  revenue: number;
  occupancy: number;
  rating: number;
}

// Impacto del clima en las ventas
interface WeatherImpact {
  stationId: string;
  snowfall: number; // cm
  temperature: number; // °C
  bookingsCorrelation: number; // -1 a 1
  revenueImpact: number; // Porcentaje
}

// Temporada (alta/baja)
interface SeasonalTrend {
  season: "high" | "low" | "shoulder";
  months: string[];
  avgBookings: number;
  avgRevenue: number;
  avgOccupancy: number;
}

// Comparativa entre estaciones
interface StationComparison {
  metric: string;
  stations: {
    stationId: string;
    stationName: string;
    value: number;
    rank: number;
  }[];
}

/**
 * AdminAnalyticsStationsComponent - B4
 *
 * Dashboard de analítica avanzada para estaciones de esquí.
 *
 * Características:
 * - Rendimiento por estación (revenue, bookings, ocupación, rating)
 * - Mapa geográfico con burbujas (tamaño = revenue)
 * - Tabla comparativa con métricas clave
 * - Evolución mensual de estaciones
 * - Impacto del clima en las ventas
 * - Análisis de temporadas (alta/baja)
 * - Rankings y benchmarking
 *
 * @author AI Assistant
 * @date 2025-10-03
 */
@Component({
  selector: "app-admin-analytics-stations",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-analytics-stations.component.html",
  styleUrl: "./admin-analytics-stations.component.css",
})
export class AdminAnalyticsStationsComponent implements OnInit {
  // Loading & Error States
  readonly isLoading = signal(false);
  readonly error = signal<string | null>(null);

  // Data Signals
  readonly stationPerformance = signal<StationPerformance[]>([]);
  readonly monthlyData = signal<StationMonthlyData[]>([]);
  readonly weatherImpact = signal<WeatherImpact[]>([]);
  readonly seasonalTrends = signal<SeasonalTrend[]>([]);
  readonly comparisons = signal<StationComparison[]>([]);

  // Filters
  readonly timeRange = signal<"1m" | "3m" | "6m" | "1y" | "all">("3m");
  readonly selectedStation = signal<string | null>(null);
  readonly selectedMetric = signal<
    "revenue" | "bookings" | "occupancy" | "rating"
  >("revenue");
  readonly sortBy = signal<"revenue" | "bookings" | "rating" | "growth">(
    "revenue"
  );

  // Computed Values
  readonly totalStations = computed(() => this.stationPerformance().length);

  readonly totalRevenue = computed(() =>
    this.stationPerformance().reduce((sum, s) => sum + s.totalRevenue, 0)
  );

  readonly totalBookings = computed(() =>
    this.stationPerformance().reduce((sum, s) => sum + s.totalBookings, 0)
  );

  readonly avgOccupancy = computed(() => {
    const stations = this.stationPerformance();
    if (!stations.length) return 0;
    return (
      stations.reduce((sum, s) => sum + s.averageOccupancy, 0) / stations.length
    );
  });

  readonly avgRating = computed(() => {
    const stations = this.stationPerformance();
    if (!stations.length) return 0;
    return (
      stations.reduce((sum, s) => sum + s.averageRating, 0) / stations.length
    );
  });

  readonly topStation = computed(() => {
    const stations = this.stationPerformance();
    if (!stations.length) return null;
    return stations.reduce((top, s) =>
      s.totalRevenue > top.totalRevenue ? s : top
    );
  });

  readonly sortedStations = computed(() => {
    const stations = [...this.stationPerformance()];
    const sortKey = this.sortBy();

    return stations.sort((a, b) => {
      switch (sortKey) {
        case "revenue":
          return b.totalRevenue - a.totalRevenue;
        case "bookings":
          return b.totalBookings - a.totalBookings;
        case "rating":
          return b.averageRating - a.averageRating;
        case "growth":
          return b.revenueGrowth - a.revenueGrowth;
        default:
          return 0;
      }
    });
  });

  readonly selectedStationData = computed(() => {
    const stationId = this.selectedStation();
    if (!stationId) return null;
    return this.stationPerformance().find((s) => s.stationId === stationId);
  });

  ngOnInit(): void {
    this.loadStationsAnalytics();
  }

  /**
   * Carga datos de analítica de estaciones desde JSON mocks
   */
  async loadStationsAnalytics(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const response = await fetch(
        "/assets/mocks/admin/analytics-stations.json"
      );
      if (!response.ok) throw new Error("Error loading stations analytics");

      const data = await response.json();

      this.stationPerformance.set(data.stationPerformance || []);
      this.monthlyData.set(data.monthlyData || []);
      this.weatherImpact.set(data.weatherImpact || []);
      this.seasonalTrends.set(data.seasonalTrends || []);
      this.comparisons.set(data.comparisons || []);
    } catch (err) {
      console.error("Error loading stations analytics:", err);
      this.error.set("Error al cargar analítica de estaciones");
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Filtros
   */
  setTimeRange(range: "1m" | "3m" | "6m" | "1y" | "all"): void {
    this.timeRange.set(range);
    this.loadStationsAnalytics();
  }

  selectStation(stationId: string | null): void {
    this.selectedStation.set(stationId);
  }

  setMetric(metric: "revenue" | "bookings" | "occupancy" | "rating"): void {
    this.selectedMetric.set(metric);
  }

  setSortBy(sort: "revenue" | "bookings" | "rating" | "growth"): void {
    this.sortBy.set(sort);
  }

  /**
   * Obtener datos mensuales de una estación específica
   */
  getMonthlyDataForStation(stationId: string): StationMonthlyData[] {
    // Por ahora retorna todos los datos mensuales
    // En implementación real, filtrar por stationId
    return this.monthlyData();
  }

  /**
   * Obtener impacto del clima para una estación
   */
  getWeatherImpactForStation(stationId: string): WeatherImpact | undefined {
    return this.weatherImpact().find((w) => w.stationId === stationId);
  }

  /**
   * Obtener temporada con mejor rendimiento
   */
  getBestSeason(): SeasonalTrend | null {
    const seasons = this.seasonalTrends();
    if (!seasons.length) return null;
    return seasons.reduce((best, s) =>
      s.avgRevenue > best.avgRevenue ? s : best
    );
  }

  /**
   * Formateo de valores
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(value);
  }

  formatPercent(value: number, includeSign = true): string {
    const sign = includeSign && value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat("es-ES").format(value);
  }

  formatRating(value: number): string {
    return value.toFixed(1);
  }

  /**
   * Helpers visuales
   */
  getTrendIcon(value: number): string {
    if (value > 5) return "trending_up";
    if (value < -5) return "trending_down";
    return "trending_flat";
  }

  getTrendClass(value: number): string {
    if (value > 5) return "trend-positive";
    if (value < -5) return "trend-negative";
    return "trend-neutral";
  }

  getRatingStars(rating: number): string[] {
    const stars: string[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push("star");
    }
    if (hasHalfStar) {
      stars.push("star_half");
    }
    while (stars.length < 5) {
      stars.push("star_border");
    }

    return stars;
  }

  getOccupancyClass(occupancy: number): string {
    if (occupancy >= 80) return "occupancy-high";
    if (occupancy >= 50) return "occupancy-medium";
    return "occupancy-low";
  }

  getCorrelationLabel(correlation: number): string {
    if (correlation >= 0.7) return "Correlación fuerte positiva";
    if (correlation >= 0.3) return "Correlación moderada positiva";
    if (correlation >= -0.3) return "Sin correlación significativa";
    if (correlation >= -0.7) return "Correlación moderada negativa";
    return "Correlación fuerte negativa";
  }

  getSeasonLabel(season: "high" | "low" | "shoulder"): string {
    const labels = {
      high: "Temporada Alta",
      low: "Temporada Baja",
      shoulder: "Temporada Media",
    };
    return labels[season];
  }

  getSeasonClass(season: "high" | "low" | "shoulder"): string {
    const classes = {
      high: "season-high",
      low: "season-low",
      shoulder: "season-shoulder",
    };
    return classes[season];
  }

  /**
   * Exportar datos
   */
  exportStationsAnalytics(format: "csv" | "excel" | "pdf"): void {
    console.log(`Exporting stations analytics as ${format}`);
    // Implementación futura
  }

  /**
   * Refrescar datos
   */
  refreshData(): void {
    this.loadStationsAnalytics();
  }
}
