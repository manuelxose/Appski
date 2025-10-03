import { Component, input, computed, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WeekForecastDay } from "../../models/meteo.models";

type ChartType = "temperature" | "wind" | "snow" | "precipitation";

@Component({
  selector: "app-week-forecast-charts",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="forecast-charts">
      <div class="header-container">
        <h2 class="section-title">
          <span class="title-icon">📊</span>
          {{ stationName() }}, Previsión a 8 días
        </h2>
        <div class="days-badge">{{ days().length }} días</div>
      </div>

      <!-- Chart Type Selector -->
      <div class="chart-selector">
        <button
          class="chart-button"
          [class.active]="selectedChart() === 'temperature'"
          (click)="selectChart('temperature')"
        >
          <span class="chart-icon">🌡️</span>
          <span class="chart-label">Temperatura</span>
        </button>
        <button
          class="chart-button"
          [class.active]="selectedChart() === 'wind'"
          (click)="selectChart('wind')"
        >
          <span class="chart-icon">🌬️</span>
          <span class="chart-label">Viento</span>
        </button>
        <button
          class="chart-button"
          [class.active]="selectedChart() === 'snow'"
          (click)="selectChart('snow')"
        >
          <span class="chart-icon">❄️</span>
          <span class="chart-label">Nieve</span>
        </button>
        <button
          class="chart-button"
          [class.active]="selectedChart() === 'precipitation'"
          (click)="selectChart('precipitation')"
        >
          <span class="chart-icon">💧</span>
          <span class="chart-label">Precipitación</span>
        </button>
      </div>

      <!-- Temperature Chart -->
      @if (selectedChart() === 'temperature') {
      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">Evolución de Temperatura</h3>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color" style="background: #dc2626"></span>
              Cota Alta
            </span>
            <span class="legend-item">
              <span class="legend-color" style="background: #2563eb"></span>
              Cota Baja
            </span>
          </div>
        </div>
        <div class="chart-content">
          <div class="chart-y-axis">
            <div class="y-label">{{ maxTemp() }}°</div>
            <div class="y-label">{{ midTemp() }}°</div>
            <div class="y-label">{{ minTemp() }}°</div>
          </div>
          <div class="chart-bars">
            @for (day of days(); track day.date) {
            <div class="bar-group">
              <div class="bars-container">
                <div
                  class="bar temp-high-bar"
                  [style.height.%]="getTempBarHeight(day.tempTopC)"
                  [style.background]="getTempColor(day.tempTopC)"
                >
                  <span class="bar-value">{{ day.tempTopC }}°</span>
                </div>
                <div
                  class="bar temp-low-bar"
                  [style.height.%]="getTempBarHeight(day.tempBottomC)"
                  [style.background]="getTempColor(day.tempBottomC)"
                >
                  <span class="bar-value-small">{{ day.tempBottomC }}°</span>
                </div>
              </div>
              <div class="bar-label">{{ formatDate(day.date) }}</div>
            </div>
            }
          </div>
        </div>
      </div>
      }

      <!-- Wind Chart -->
      @if (selectedChart() === 'wind') {
      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">Evolución del Viento</h3>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color" style="background: #f59e0b"></span>
              Cota Alta
            </span>
            <span class="legend-item">
              <span class="legend-color" style="background: #fbbf24"></span>
              Cota Baja
            </span>
          </div>
        </div>
        <div class="chart-content">
          <div class="chart-y-axis">
            <div class="y-label">{{ maxWind() }} km/h</div>
            <div class="y-label">{{ midWind() }} km/h</div>
            <div class="y-label">0 km/h</div>
          </div>
          <div class="chart-bars">
            @for (day of days(); track day.date) {
            <div class="bar-group">
              <div class="bars-container">
                <div
                  class="bar wind-high-bar"
                  [style.height.%]="getWindBarHeight(day.windTopKmh)"
                  [style.background]="getWindColor(day.windTopKmh)"
                  [class.wind-alert]="day.windTopKmh > 50"
                >
                  <span class="bar-value">{{ day.windTopKmh }}</span>
                </div>
                <div
                  class="bar wind-low-bar"
                  [style.height.%]="getWindBarHeight(day.windBottomKmh)"
                  [style.background]="getWindColor(day.windBottomKmh)"
                >
                  <span class="bar-value-small">{{ day.windBottomKmh }}</span>
                </div>
              </div>
              <div class="bar-label">{{ formatDate(day.date) }}</div>
            </div>
            }
          </div>
        </div>
      </div>
      }

      <!-- Snow Chart -->
      @if (selectedChart() === 'snow') {
      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">Acumulación de Nieve</h3>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color" style="background: #7c3aed"></span>
              Cota Alta
            </span>
            <span class="legend-item">
              <span class="legend-color" style="background: #a78bfa"></span>
              Cota Baja
            </span>
          </div>
        </div>
        <div class="chart-content">
          <div class="chart-y-axis">
            <div class="y-label">{{ maxSnow() }} cm</div>
            <div class="y-label">{{ midSnow() }} cm</div>
            <div class="y-label">0 cm</div>
          </div>
          <div class="chart-bars">
            @for (day of days(); track day.date) {
            <div class="bar-group">
              <div class="bars-container">
                <div
                  class="bar snow-high-bar"
                  [style.height.%]="getSnowBarHeight(day.snowTopCm)"
                  [class.snow-alert]="day.snowTopCm > 15"
                >
                  <span class="bar-value">{{ day.snowTopCm }}</span>
                </div>
                <div
                  class="bar snow-low-bar"
                  [style.height.%]="getSnowBarHeight(day.snowBottomCm)"
                >
                  <span class="bar-value-small">{{ day.snowBottomCm }}</span>
                </div>
              </div>
              <div class="bar-label">{{ formatDate(day.date) }}</div>
            </div>
            }
          </div>
        </div>
      </div>
      }

      <!-- Precipitation Chart -->
      @if (selectedChart() === 'precipitation') {
      <div class="chart-container">
        <div class="chart-header">
          <h3 class="chart-title">Precipitación Prevista</h3>
          <div class="chart-legend">
            <span class="legend-item">
              <span class="legend-color" style="background: #0891b2"></span>
              Precipitación
            </span>
          </div>
        </div>
        <div class="chart-content">
          <div class="chart-y-axis">
            <div class="y-label">{{ maxPrecip() }} mm</div>
            <div class="y-label">{{ midPrecip() }} mm</div>
            <div class="y-label">0 mm</div>
          </div>
          <div class="chart-bars">
            @for (day of days(); track day.date) {
            <div class="bar-group">
              <div class="bars-container single">
                <div
                  class="bar precip-bar"
                  [style.height.%]="getPrecipBarHeight(day.precipMm)"
                  [class.precip-alert]="day.precipMm > 15"
                >
                  <span class="bar-value">{{ day.precipMm }}</span>
                </div>
              </div>
              <div class="bar-label">{{ formatDate(day.date) }}</div>
            </div>
            }
          </div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .forecast-charts {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        margin-bottom: 2rem;
      }

      .section-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      /* Header */
      .header-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .title-icon {
        font-size: 2rem;
        margin-right: 0.5rem;
        display: inline-block;
        vertical-align: middle;
      }

      .days-badge {
        background: linear-gradient(
          135deg,
          var(--primary-500),
          var(--primary-600)
        );
        color: white;
        padding: 0.375rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      /* Chart Selector */
      .chart-selector {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      }

      .chart-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        background: var(--neutral-50);
        border: 2px solid var(--neutral-200);
        border-radius: 12px;
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--neutral-700);
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .chart-button:hover {
        background: var(--neutral-100);
        border-color: var(--primary-400);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .chart-button.active {
        background: linear-gradient(
          135deg,
          var(--primary-500),
          var(--primary-600)
        );
        border-color: var(--primary-600);
        color: white;
        box-shadow: 0 4px 16px rgba(var(--primary-500-rgb), 0.3);
      }

      .chart-icon {
        font-size: 1.5rem;
      }

      /* Chart Container */
      .chart-container {
        background: var(--neutral-25);
        border-radius: 12px;
        padding: 1.5rem;
        border: 1px solid var(--neutral-200);
      }

      .chart-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .chart-title {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--neutral-800);
      }

      .chart-legend {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--neutral-700);
      }

      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      /* Chart Content */
      .chart-content {
        display: flex;
        gap: 1rem;
        min-height: 300px;
      }

      .chart-y-axis {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 1rem 0;
        min-width: 60px;
      }

      .y-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-600);
        text-align: right;
      }

      .chart-bars {
        flex: 1;
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
        padding: 1rem 0;
        border-left: 2px solid var(--neutral-300);
        border-bottom: 2px solid var(--neutral-300);
        padding-left: 1rem;
      }

      .bar-group {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        min-width: 60px;
      }

      .bars-container {
        width: 100%;
        display: flex;
        gap: 4px;
        align-items: flex-end;
        min-height: 250px;
      }

      .bars-container.single {
        justify-content: center;
      }

      .bar {
        flex: 1;
        min-height: 20px;
        border-radius: 8px 8px 0 0;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 0.5rem 0.25rem;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .bar:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      }

      .bar-value {
        font-size: 0.875rem;
        font-weight: 700;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .bar-value-small {
        font-size: 0.75rem;
        font-weight: 600;
        color: white;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }

      .bar-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--neutral-600);
        text-align: center;
        word-break: break-word;
      }

      /* Temperature Bars */
      .temp-high-bar {
        background: linear-gradient(to top, #dc2626, #ef4444);
      }

      .temp-low-bar {
        background: linear-gradient(to top, #2563eb, #3b82f6);
      }

      /* Wind Bars */
      .wind-high-bar {
        background: linear-gradient(to top, #f59e0b, #fbbf24);
      }

      .wind-low-bar {
        background: linear-gradient(to top, #fbbf24, #fde047);
      }

      .wind-alert {
        animation: pulse-alert 2s ease-in-out infinite;
      }

      /* Snow Bars */
      .snow-high-bar {
        background: linear-gradient(to top, #7c3aed, #a78bfa);
      }

      .snow-low-bar {
        background: linear-gradient(to top, #a78bfa, #c4b5fd);
      }

      .snow-alert {
        animation: pulse-snow 2s ease-in-out infinite;
      }

      /* Precipitation Bar */
      .precip-bar {
        background: linear-gradient(to top, #0891b2, #06b6d4);
        max-width: 50%;
      }

      .precip-alert {
        animation: pulse-precip 2s ease-in-out infinite;
      }

      /* Animations */
      @keyframes pulse-alert {
        0%,
        100% {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        50% {
          box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4);
        }
      }

      @keyframes pulse-snow {
        0%,
        100% {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        50% {
          box-shadow: 0 4px 20px rgba(124, 58, 237, 0.4);
        }
      }

      @keyframes pulse-precip {
        0%,
        100% {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        50% {
          box-shadow: 0 4px 20px rgba(8, 145, 178, 0.4);
        }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .forecast-charts {
          padding: 1rem;
        }

        .section-title {
          font-size: 1.25rem;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .chart-selector {
          gap: 0.5rem;
        }

        .chart-button {
          padding: 0.5rem 0.75rem;
          font-size: 0.8125rem;
        }

        .chart-icon {
          font-size: 1.25rem;
        }

        .chart-label {
          display: none;
        }

        .chart-content {
          min-height: 250px;
        }

        .bars-container {
          min-height: 200px;
        }

        .bar-value {
          font-size: 0.75rem;
        }

        .bar-value-small {
          font-size: 0.625rem;
        }

        .y-label {
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class WeekForecastChartsComponent {
  readonly days = input.required<WeekForecastDay[]>();
  readonly stationName = input<string>("");
  readonly topAltitude = input<number | null>(null);
  readonly bottomAltitude = input<number | null>(null);

  readonly selectedChart = signal<ChartType>("temperature");

  // Temperature computed values
  readonly maxTemp = computed(() => {
    const temps = this.days().flatMap((d) => [d.tempTopC, d.tempBottomC]);
    return Math.max(...temps, 0);
  });

  readonly minTemp = computed(() => {
    const temps = this.days().flatMap((d) => [d.tempTopC, d.tempBottomC]);
    return Math.min(...temps, 0);
  });

  readonly midTemp = computed(() => {
    return Math.round((this.maxTemp() + this.minTemp()) / 2);
  });

  // Wind computed values
  readonly maxWind = computed(() => {
    const winds = this.days().flatMap((d) => [d.windTopKmh, d.windBottomKmh]);
    return Math.max(...winds, 50);
  });

  readonly midWind = computed(() => {
    return Math.round(this.maxWind() / 2);
  });

  // Snow computed values
  readonly maxSnow = computed(() => {
    const snows = this.days().flatMap((d) => [d.snowTopCm, d.snowBottomCm]);
    return Math.max(...snows, 20);
  });

  readonly midSnow = computed(() => {
    return Math.round(this.maxSnow() / 2);
  });

  // Precipitation computed values
  readonly maxPrecip = computed(() => {
    const precips = this.days().map((d) => d.precipMm);
    return Math.max(...precips, 10);
  });

  readonly midPrecip = computed(() => {
    return Math.round(this.maxPrecip() / 2);
  });

  selectChart(chart: ChartType): void {
    this.selectedChart.set(chart);
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString("es-ES", { month: "short" });
    return `${day} ${month}`;
  }

  getTempBarHeight(temp: number): number {
    const range = this.maxTemp() - this.minTemp();
    if (range === 0) return 50;
    return ((temp - this.minTemp()) / range) * 100;
  }

  getTempColor(temp: number): string {
    if (temp > 5) return "linear-gradient(to top, #dc2626, #ef4444)";
    if (temp <= 0) return "linear-gradient(to top, #2563eb, #3b82f6)";
    return "linear-gradient(to top, #f59e0b, #fbbf24)";
  }

  getWindBarHeight(wind: number): number {
    const max = this.maxWind();
    return (wind / max) * 100;
  }

  getWindColor(wind: number): string {
    if (wind > 50) return "linear-gradient(to top, #dc2626, #ef4444)";
    if (wind > 30) return "linear-gradient(to top, #f59e0b, #fbbf24)";
    return "linear-gradient(to top, #fbbf24, #fde047)";
  }

  getSnowBarHeight(snow: number): number {
    const max = this.maxSnow();
    if (max === 0) return 0;
    return (snow / max) * 100;
  }

  getPrecipBarHeight(precip: number): number {
    const max = this.maxPrecip();
    if (max === 0) return 0;
    return (precip / max) * 100;
  }
}
