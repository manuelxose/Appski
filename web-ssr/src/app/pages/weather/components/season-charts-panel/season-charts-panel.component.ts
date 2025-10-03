import {
  Component,
  input,
  computed,
  PLATFORM_ID,
  inject,
  effect,
  ElementRef,
  viewChild,
  signal,
} from "@angular/core";
import { CommonModule, isPlatformBrowser } from "@angular/common";
import { SeasonChartData } from "../../models/meteo.models";

type ChartType = "snowDepth" | "kmOpen" | "pistesOpen" | "snowTypes";

// Tipado mínimo para echarts (evita importar el módulo completo durante SSR)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EChartsInstance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EChartsOption = any;

@Component({
  selector: "app-season-charts-panel",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="season-charts">
      <h2 class="section-title">Gráficos de Temporada {{ data().season }}</h2>

      <!-- Selector de gráfico -->
      <div class="chart-tabs">
        <button
          type="button"
          class="tab-button"
          [class.active]="selectedChart() === 'snowDepth'"
          (click)="selectChart('snowDepth')"
        >
          ❄️ Espesor de Nieve
        </button>
        <button
          type="button"
          class="tab-button"
          [class.active]="selectedChart() === 'kmOpen'"
          (click)="selectChart('kmOpen')"
        >
          🛷 Kilómetros Abiertos
        </button>
        <button
          type="button"
          class="tab-button"
          [class.active]="selectedChart() === 'pistesOpen'"
          (click)="selectChart('pistesOpen')"
        >
          ⛷️ Pistas Abiertas
        </button>
        <button
          type="button"
          class="tab-button"
          [class.active]="selectedChart() === 'snowTypes'"
          (click)="selectChart('snowTypes')"
        >
          📊 Tipos de Nieve
        </button>
      </div>

      <!-- Contenedor del gráfico -->
      <div class="chart-container">
        @if (isBrowser) {
        <div #chartDiv class="echarts-container"></div>
        } @else {
        <div class="chart-skeleton">
          <div class="skeleton-bar" style="height: 40%"></div>
          <div class="skeleton-bar" style="height: 60%"></div>
          <div class="skeleton-bar" style="height: 80%"></div>
          <div class="skeleton-bar" style="height: 70%"></div>
          <div class="skeleton-bar" style="height: 50%"></div>
        </div>
        }
      </div>

      <!-- Leyenda -->
      <div class="chart-legend">
        @if (selectedChart() === 'snowDepth') {
        <div class="legend-item">
          <span class="legend-color" style="background: #3b82f6"></span>
          <span>Espesor Máximo</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #60a5fa"></span>
          <span>Espesor Mínimo</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #ef4444"></span>
          <span>Estación cerrada</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #10b981"></span>
          <span>Uso turístico</span>
        </div>
        } @if (selectedChart() === 'kmOpen') {
        <div class="legend-item">
          <span class="legend-color" style="background: #8b5cf6"></span>
          <span>Kilómetros abiertos</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #d1d5db"></span>
          <span>Kilómetros estación ({{ data().totalKm }}km)</span>
        </div>
        } @if (selectedChart() === 'pistesOpen') {
        <div class="legend-item">
          <span class="legend-color" style="background: #f59e0b"></span>
          <span>Pistas abiertas</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #d1d5db"></span>
          <span>Pistas estación ({{ data().totalPistes }})</span>
        </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .season-charts {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        margin-bottom: 2rem;
      }

      .section-title {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .chart-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .tab-button {
        padding: 0.75rem 1.25rem;
        border: 1px solid var(--neutral-300);
        background: white;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-700);
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .tab-button:hover {
        border-color: var(--primary-500);
        background: var(--primary-50);
      }

      .tab-button.active {
        background: var(--primary-500);
        color: white;
        border-color: var(--primary-500);
      }

      .chart-container {
        width: 100%;
        min-height: 400px;
        background: var(--neutral-50);
        border-radius: 12px;
        margin-bottom: 1rem;
      }

      .echarts-container {
        width: 100%;
        height: 400px;
        padding: 1rem;
      }

      .chart-skeleton {
        display: flex;
        align-items: flex-end;
        gap: 1rem;
        padding: 2rem;
        height: 400px;
      }

      .skeleton-bar {
        flex: 1;
        background: var(--neutral-200);
        border-radius: 4px;
        animation: pulse 1.5s infinite;
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

      .chart-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
        padding: 1rem;
        background: var(--neutral-50);
        border-radius: 8px;
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
        display: inline-block;
      }

      @media (max-width: 768px) {
        .season-charts {
          padding: 1.5rem;
        }

        .chart-tabs {
          flex-direction: column;
        }

        .tab-button {
          width: 100%;
        }

        .chart-container {
          min-height: 300px;
        }

        .echarts-container {
          height: 300px;
        }
      }
    `,
  ],
})
export class SeasonChartsPanelComponent {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  chartContainer = viewChild<ElementRef<HTMLDivElement>>("chartDiv");

  data = input.required<SeasonChartData>();

  private _selectedChart = signal<ChartType>("snowDepth");
  selectedChart = this._selectedChart.asReadonly();

  private chartInstance: EChartsInstance | null = null;
  private echartsLib: typeof import("echarts") | null = null;

  // Configuración del gráfico basada en el tipo seleccionado
  private chartOption = computed(() => {
    const chartType = this.selectedChart();
    const chartData = this.data();

    if (chartType === "snowTypes") {
      return this.getSnowTypesPieOption(chartData);
    }

    if (chartType === "snowDepth") {
      return this.getSnowDepthOption(chartData);
    }

    if (chartType === "kmOpen") {
      return this.getKmOpenOption(chartData);
    }

    if (chartType === "pistesOpen") {
      return this.getPistesOpenOption(chartData);
    }

    return null;
  });

  constructor() {
    effect(() => {
      if (!this.isBrowser) return;

      const container = this.chartContainer();
      const option = this.chartOption();

      if (!container || !option) return;

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

    window.addEventListener("resize", () => {
      this.chartInstance?.resize();
    });
  }

  private updateChart(): void {
    const option = this.chartOption();
    if (this.chartInstance && option) {
      this.chartInstance.setOption(option, true);
    }
  }

  selectChart(type: ChartType): void {
    this._selectedChart.set(type);
  }

  // Configuración para gráfico de pastel (tipos de nieve)
  private getSnowTypesPieOption(data: SeasonChartData): EChartsOption {
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c}% ({d}%)",
      },
      legend: {
        bottom: 10,
        left: "center",
      },
      series: [
        {
          name: "Tipos de Nieve",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: "#fff",
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: "{b}\n{c}%",
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: "bold",
            },
          },
          data: [
            { value: data.snowTypes.powder, name: "Polvo" },
            { value: data.snowTypes.packed, name: "Pisada" },
            { value: data.snowTypes.spring, name: "Primavera" },
          ],
        },
      ],
    };
  }

  // Configuración para gráfico de espesor de nieve
  private getSnowDepthOption(data: SeasonChartData): EChartsOption {
    const xData = data.snowDepthData.map((d) =>
      new Date(d.date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      })
    );
    const minData = data.snowDepthData.map((d) => d.min);
    const maxData = data.snowDepthData.map((d) => d.max);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "10%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: xData,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        name: "cm",
      },
      series: [
        {
          name: "Máximo",
          type: "line",
          data: maxData,
          smooth: true,
          lineStyle: { color: "#3b82f6", width: 2 },
          itemStyle: { color: "#3b82f6" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#3b82f688" },
                { offset: 1, color: "#3b82f611" },
              ],
            },
          },
        },
        {
          name: "Mínimo",
          type: "line",
          data: minData,
          smooth: true,
          lineStyle: { color: "#60a5fa", width: 2 },
          itemStyle: { color: "#60a5fa" },
        },
      ],
    };
  }

  // Configuración para kilómetros abiertos
  private getKmOpenOption(data: SeasonChartData): EChartsOption {
    const xData = data.kmOpenData.map((d) =>
      new Date(d.date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      })
    );
    const yData = data.kmOpenData.map((d) => d.value);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        formatter: "{b}: {c} km",
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "10%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: xData,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        name: "km",
        max: data.totalKm,
      },
      series: [
        {
          name: "Km Abiertos",
          type: "line",
          data: yData,
          smooth: true,
          lineStyle: { color: "#8b5cf6", width: 3 },
          itemStyle: { color: "#8b5cf6" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#8b5cf688" },
                { offset: 1, color: "#8b5cf611" },
              ],
            },
          },
        },
      ],
    };
  }

  // Configuración para pistas abiertas
  private getPistesOpenOption(data: SeasonChartData): EChartsOption {
    const xData = data.pistesOpenData.map((d) =>
      new Date(d.date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
      })
    );
    const yData = data.pistesOpenData.map((d) => d.value);

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        formatter: "{b}: {c} pistas",
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "10%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: xData,
        axisLabel: {
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: {
        type: "value",
        name: "pistas",
        max: data.totalPistes,
      },
      series: [
        {
          name: "Pistas Abiertas",
          type: "line",
          data: yData,
          smooth: true,
          lineStyle: { color: "#f59e0b", width: 3 },
          itemStyle: { color: "#f59e0b" },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "#f59e0b88" },
                { offset: 1, color: "#f59e0b11" },
              ],
            },
          },
        },
      ],
    };
  }
}
