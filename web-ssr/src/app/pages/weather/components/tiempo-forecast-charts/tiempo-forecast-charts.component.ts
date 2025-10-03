import {
  Component,
  input,
  computed,
  PLATFORM_ID,
  inject,
  signal,
  effect,
  ElementRef,
  viewChild,
} from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { MeteoForecastPoint } from "../../models/meteo.models";

type ChartMode = "temp" | "wind" | "snow" | "precip";

// Tipado mínimo para echarts (evita importar el módulo completo durante SSR)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EChartsInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EChartsOption = any;

@Component({
  selector: "app-tiempo-forecast-charts",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="forecast-charts">
      <div class="charts-header">
        <h2 class="charts-title">Previsión 72 Horas</h2>

        <div class="chart-tabs">
          <button
            type="button"
            class="tab-button"
            [class.active]="selectedMode() === 'temp'"
            (click)="selectMode('temp')"
          >
            🌡️ Temperatura
          </button>
          <button
            type="button"
            class="tab-button"
            [class.active]="selectedMode() === 'wind'"
            (click)="selectMode('wind')"
          >
            💨 Viento
          </button>
          <button
            type="button"
            class="tab-button"
            [class.active]="selectedMode() === 'snow'"
            (click)="selectMode('snow')"
          >
            ❄️ Nieve
          </button>
        </div>
      </div>

      <div class="chart-container">
        @if (isBrowser) {
        <!-- Div para el gráfico echarts -->
        <div #chartDiv class="echarts-container"></div>
        } @else {
        <!-- Skeleton para SSR -->
        <div class="chart-skeleton">
          <div class="skeleton-bar" style="height: 40%"></div>
          <div class="skeleton-bar" style="height: 60%"></div>
          <div class="skeleton-bar" style="height: 80%"></div>
          <div class="skeleton-bar" style="height: 70%"></div>
          <div class="skeleton-bar" style="height: 50%"></div>
          <div class="skeleton-bar" style="height: 65%"></div>
          <div class="skeleton-bar" style="height: 75%"></div>
          <div class="skeleton-bar" style="height: 55%"></div>
        </div>
        }
      </div>

      @if (points().length > 0) {
      <div class="chart-stats">
        <div class="stat-card">
          <span class="stat-label">Puntos de datos</span>
          <span class="stat-value">{{ points().length }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Rango temporal</span>
          <span class="stat-value">{{ getTimeRange() }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Confianza media</span>
          <span class="stat-value">{{ getAvgConfidence() }}%</span>
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
      }

      .charts-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .charts-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .chart-tabs {
        display: flex;
        gap: 0.5rem;
        background: var(--neutral-100);
        padding: 4px;
        border-radius: 8px;
      }

      .tab-button {
        padding: 0.5rem 1rem;
        border: none;
        background: transparent;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-700);
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .tab-button:hover {
        background: var(--neutral-200);
      }

      .tab-button.active {
        background: var(--primary-500);
        color: white;
      }

      .chart-container {
        width: 100%;
        min-height: 400px;
        background: var(--neutral-50);
        border-radius: 12px;
        margin-bottom: 1.5rem;
      }

      .echarts-container {
        width: 100%;
        height: 400px;
        padding: 1rem;
      }

      .chart-placeholder {
        width: 100%;
        height: 400px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      .chart-skeleton {
        display: flex;
        align-items: flex-end;
        gap: 0.5rem;
        padding: 2rem;
        height: 400px;
      }

      .skeleton-bar {
        flex: 1;
        background: var(--neutral-200);
        border-radius: 4px;
        animation: pulse 1.5s infinite;
      }

      .skeleton-bar:nth-child(1) {
        height: 40%;
      }
      .skeleton-bar:nth-child(2) {
        height: 60%;
      }
      .skeleton-bar:nth-child(3) {
        height: 80%;
      }
      .skeleton-bar:nth-child(4) {
        height: 70%;
      }
      .skeleton-bar:nth-child(5) {
        height: 50%;
      }
      .skeleton-bar:nth-child(6) {
        height: 65%;
      }
      .skeleton-bar:nth-child(7) {
        height: 75%;
      }
      .skeleton-bar:nth-child(8) {
        height: 55%;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }

      .chart-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 1rem;
      }

      .stat-card {
        background: var(--neutral-50);
        padding: 1rem;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .stat-label {
        font-size: 0.75rem;
        color: var(--neutral-600);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      @media (max-width: 768px) {
        .forecast-charts {
          padding: 1.5rem;
        }

        .charts-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .chart-tabs {
          width: 100%;
          justify-content: space-between;
        }

        .tab-button {
          flex: 1;
          padding: 0.5rem;
          font-size: 0.75rem;
        }

        .chart-container {
          min-height: 300px;
        }

        .chart-placeholder {
          height: 300px;
        }
      }
    `,
  ],
})
export class TiempoForecastChartsComponent {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  // Referencia al div del gráfico
  chartContainer = viewChild<ElementRef<HTMLDivElement>>("chartDiv");

  points = input.required<MeteoForecastPoint[]>();
  mode = input<ChartMode>("temp");

  private _selectedMode = signal<ChartMode>("temp");
  selectedMode = this._selectedMode.asReadonly();

  private chartInstance: EChartsInstance | null = null;
  private echartsLib: typeof import("echarts") | null = null;

  previewPoints = computed(() => {
    return this.points().slice(0, 8);
  });

  // Computed para la configuración del gráfico
  private chartOption = computed(() => {
    const points = this.points();
    const mode = this.selectedMode();

    if (points.length === 0) return null;

    // Formatear fechas con día y hora para mejor contexto
    const xData = points.map((p) => {
      const date = new Date(p.validAt);
      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth();

      if (isToday) {
        return date.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        return date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    });

    let yData: number[] = [];
    let seriesName = "";
    let color = "";
    let unit = "";

    switch (mode) {
      case "temp":
        yData = points.map((p) => p.tempC);
        seriesName = "Temperatura";
        color = "#f97316"; // orange
        unit = "°C";
        break;
      case "wind":
        yData = points.map((p) => p.windKmh);
        seriesName = "Velocidad del viento";
        color = "#06b6d4"; // cyan
        unit = "km/h";
        break;
      case "snow":
        yData = points.map((p) => p.precipSnowCm);
        seriesName = "Nieve acumulada";
        color = "#8b5cf6"; // purple
        unit = "cm";
        break;
      case "precip":
        yData = points.map((p) => p.precipRainMm);
        seriesName = "Precipitación";
        color = "#3b82f6"; // blue
        unit = "mm";
        break;
    }

    const option: EChartsOption = {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        textStyle: {
          color: "#1f2937",
        },
        formatter: (params: unknown) => {
          const paramsArray = params as Array<{ name: string; value: number }>;
          const param = paramsArray[0];
          return `<strong>${param.name}</strong><br/>${seriesName}: <strong>${param.value}${unit}</strong>`;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "3%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: xData,
        boundaryGap: mode === "snow" || mode === "precip",
        axisLine: {
          lineStyle: {
            color: "#d1d5db",
          },
        },
        axisLabel: {
          color: "#6b7280",
          fontSize: 11,
        },
      },
      yAxis: {
        type: "value",
        name: unit,
        axisLine: {
          show: false,
        },
        axisTick: {
          show: false,
        },
        splitLine: {
          lineStyle: {
            color: "#e5e7eb",
            type: "dashed",
          },
        },
        axisLabel: {
          color: "#6b7280",
          fontSize: 11,
        },
      },
      series: [
        {
          name: seriesName,
          type: mode === "snow" || mode === "precip" ? "bar" : "line",
          data: yData,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: {
            color: color,
          },
          lineStyle:
            mode === "temp" || mode === "wind"
              ? {
                  width: 3,
                  color: color,
                }
              : undefined,
          areaStyle:
            mode === "temp"
              ? {
                  color: {
                    type: "linear",
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      { offset: 0, color: color + "88" },
                      { offset: 1, color: color + "11" },
                    ],
                  },
                }
              : undefined,
        },
      ],
    };

    return option;
  });

  constructor() {
    // Effect para inicializar y actualizar el gráfico
    effect(() => {
      if (!this.isBrowser) return;

      const container = this.chartContainer();
      const option = this.chartOption();

      if (!container || !option) return;

      // Cargar echarts dinámicamente si no está cargado
      if (!this.echartsLib) {
        import("echarts").then((echarts) => {
          this.echartsLib = echarts;
          this.initChart(container.nativeElement);
        });
      } else {
        this.updateChart();
      }
    });
  }

  private initChart(element: HTMLDivElement): void {
    if (!this.echartsLib) return;

    this.chartInstance = this.echartsLib.init(element);
    this.updateChart();

    // Responsive
    window.addEventListener("resize", () => {
      this.chartInstance?.resize();
    });
  }

  private updateChart(): void {
    const option = this.chartOption();
    if (this.chartInstance && option) {
      this.chartInstance.setOption(option);
    }
  }

  selectMode(mode: ChartMode): void {
    this._selectedMode.set(mode);
  }

  getTimeRange(): string {
    const points = this.points();
    if (points.length === 0) return "-";
    const first = new Date(points[0].validAt);
    const last = new Date(points[points.length - 1].validAt);
    const hours = Math.round(
      (last.getTime() - first.getTime()) / (1000 * 60 * 60)
    );
    return `${hours}h`;
  }

  getAvgConfidence(): number {
    const points = this.points();
    if (points.length === 0) return 0;
    const avg =
      points.reduce((sum, p) => sum + p.confidence, 0) / points.length;
    return Math.round(avg * 100);
  }
}
