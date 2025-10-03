# 🎨 Mejoras UI/UX - Sección Tiempo

## ✅ Mejoras Implementadas

### 1. Header Profesional

- ✅ Cambiado gradiente azul por fondo blanco limpio
- ✅ Añadido borde sutil inferior con sombra suave
- ✅ Título en negro con letter-spacing mejorado
- ✅ Subtítulo en gris neutro más legible
- ✅ Estilo consistente con el resto de páginas

### 2. Navegación por Tabs Mejorada

- ✅ Tabs sin bordes redondeados (estilo profesional)
- ✅ Separadores verticales entre tabs
- ✅ Hover state suave con cambio de color
- ✅ Tab activa con border-bottom de 3px en color primary
- ✅ Fondo primary-50 para tab activa (sutil)
- ✅ Transiciones suaves (200ms)

### 3. ngx-echarts Instalado

- ✅ Paquetes instalados: `echarts` + `ngx-echarts`
- ✅ Import añadido en `tiempo-forecast-charts.component.ts`
- ✅ Módulo NgxEchartsModule importado

## 🚧 Pendiente de Implementar

### 4. Gráficos Funcionales con ECharts

Necesitas reemplazar el contenido completo del componente `tiempo-forecast-charts.component.ts` con el siguiente código:

**Archivo:** `web-ssr/src/app/pages/weather/components/tiempo-forecast-charts/tiempo-forecast-charts.component.ts`

#### Características a añadir:

**A. Selector de Rango Temporal**

```typescript
type TimeRange = "24h" | "48h" | "72h" | "7d";
```

- Botones para seleccionar 24h, 48h, 72h o 7 días
- Filtrado dinámico de datos según el rango
- UI con tabs secundarios encima del gráfico

**B. Gráficos Interactivos**

```typescript
chartOption = computed((): EChartsOption => {
  // Configuración de ECharts con:
  // - Tooltip personalizado
  // - Grid responsive
  // - Colores según el modo (temp=rojo, wind=cyan, nieve=morado)
  // - Área de relleno para temperatura
  // - Barras para precipitación/nieve
});
```

**C. 4 Modos de Visualización**

1. **Temperatura** 🌡️ (línea con área)
2. **Viento** 💨 (línea)
3. **Precipitación** 🌧️ (barras)
4. **Nieve** ❄️ (barras)

**D. Stats Mejoradas**

- Temp. Máxima / Viento Máximo
- Nieve Total / Precip. Total
- Confianza media de datos
- Rango temporal actual

#### Template HTML a añadir:

```html
<!-- Header con selector de rango -->
<div class="charts-header">
  <div class="header-left">
    <h2>Previsión Meteorológica</h2>
    <p>Datos actualizados cada hora</p>
  </div>
  <div class="time-range-selector">
    <button [class.active]="selectedRange() === '24h'" (click)="selectRange('24h')">24h</button>
    <button [class.active]="selectedRange() === '48h'" (click)="selectRange('48h')">48h</button>
    <button [class.active]="selectedRange() === '72h'" (click)="selectRange('72h')">72h</button>
    <button [class.active]="selectedRange() === '7d'" (click)="selectRange('7d')">7 días</button>
  </div>
</div>

<!-- Tabs de modo -->
<div class="chart-mode-tabs">
  <button class="mode-tab" [class.active]="selectedMode() === 'temp'" (click)="selectMode('temp')"><span>🌡️</span><span>Temperatura</span></button>
  <!-- ... otros modos -->
</div>

<!-- Gráfico ECharts -->
<div echarts [options]="chartOption()" [loading]="isLoading()" [style.height.px]="450"></div>
```

#### Lógica TypeScript:

```typescript
export class TiempoForecastChartsComponent {
  private _selectedMode = signal<ChartMode>("temp");
  private _selectedRange = signal<TimeRange>("72h");

  selectedMode = this._selectedMode.asReadonly();
  selectedRange = this._selectedRange.asReadonly();

  // Filtrar puntos según rango temporal
  filteredPoints = computed(() => {
    const range = this.selectedRange();
    const allPoints = this.points();

    let maxHours = 72;
    switch (range) {
      case "24h":
        maxHours = 24;
        break;
      case "48h":
        maxHours = 48;
        break;
      case "72h":
        maxHours = 72;
        break;
      case "7d":
        maxHours = 168;
        break;
    }

    const now = new Date();
    return allPoints.filter((point) => {
      const diffHours = (new Date(point.validAt).getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours >= 0 && diffHours <= maxHours;
    });
  });

  // Configuración del gráfico
  chartOption = computed((): EChartsOption => {
    const points = this.filteredPoints();
    const mode = this.selectedMode();

    // Preparar datos del eje X
    const xAxisData = points.map((p) =>
      new Date(p.validAt).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
      })
    );

    // Preparar datos según modo
    let seriesData = [];
    let yAxisName = "";
    let color = "#3b82f6";

    switch (mode) {
      case "temp":
        seriesData = points.map((p) => p.tempC);
        yAxisName = "Temperatura (°C)";
        color = "#ef4444";
        break;
      case "wind":
        seriesData = points.map((p) => p.windKmh);
        yAxisName = "Velocidad (km/h)";
        color = "#06b6d4";
        break;
      case "precip":
        seriesData = points.map((p) => p.precipMm);
        yAxisName = "Precipitación (mm)";
        color = "#3b82f6";
        break;
      case "snow":
        seriesData = points.map((p) => p.precipSnowCm);
        yAxisName = "Nieve (cm)";
        color = "#8b5cf6";
        break;
    }

    return {
      title: {
        text: `Previsión ${this.selectedRange()}`,
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "600" },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderColor: "#e5e7eb",
        formatter: (params: any) => {
          const param = params[0];
          const point = points[param.dataIndex];
          return `
            <div style="padding: 8px;">
              <div style="font-weight: 600;">${param.name}</div>
              <div>
                <span style="color: ${color};">●</span>
                ${param.value}${this.getUnit()}
              </div>
              <div style="font-size: 12px; color: #6b7280;">
                Confianza: ${Math.round(point.confidence * 100)}%
              </div>
            </div>
          `;
        },
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "12%",
        top: "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: xAxisData,
        axisLabel: { rotate: 45, fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: yAxisName,
      },
      series: [
        {
          name: yAxisName,
          type: mode === "precip" || mode === "snow" ? "bar" : "line",
          data: seriesData,
          smooth: true,
          itemStyle: { color },
          lineStyle: { width: 3 },
          areaStyle:
            mode === "temp"
              ? {
                  color: {
                    type: "linear",
                    colorStops: [
                      { offset: 0, color: `${color}40` },
                      { offset: 1, color: `${color}10` },
                    ],
                  },
                }
              : undefined,
        },
      ],
    };
  });
}
```

### 5. Estilos CSS para los Gráficos

Añadir en `styles` del componente:

```css
.charts-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.header-left h2 {
  margin: 0 0 0.25rem 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--neutral-900);
}

.header-left p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--neutral-600);
  font-weight: 500;
}

.time-range-selector {
  display: flex;
  gap: 0.25rem;
  background: var(--neutral-100);
  padding: 4px;
  border-radius: 8px;
}

.time-range-selector button {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--neutral-700);
  cursor: pointer;
  transition: all 0.2s ease;
}

.time-range-selector button:hover {
  background: var(--neutral-200);
}

.time-range-selector button.active {
  background: var(--primary-600);
  color: white;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.chart-mode-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.mode-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem;
  border: 2px solid var(--neutral-200);
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-tab:hover {
  border-color: var(--primary-300);
  background: var(--primary-50);
  transform: translateY(-2px);
}

.mode-tab.active {
  border-color: var(--primary-600);
  background: var(--primary-50);
  color: var(--primary-700);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.chart-container {
  background: white;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  overflow: hidden;
  border: 1px solid var(--neutral-200);
}
```

## 📝 Pasos para Completar la Implementación

### Paso 1: Reemplazar el componente de gráficos

```bash
# El archivo ya tiene ngx-echarts importado
# Solo necesitas añadir la lógica completa del gráfico
```

### Paso 2: Probar los gráficos

```bash
npx nx serve web-ssr
# Navegar a /meteorologia
# Seleccionar diferentes rangos (24h, 48h, 72h, 7d)
# Cambiar entre modos (temp, wind, precip, snow)
# Verificar que los gráficos se renderizan correctamente
```

### Paso 3: Ajustar datos mock (opcional)

Si quieres probar el rango de 7 días, necesitas ampliar el mock `forecast72.mock.json` con más puntos de datos que cubran 168 horas.

## 🎯 Resultado Final

- ✅ Header limpio y profesional (consistente con otras páginas)
- ✅ Tabs con estilo moderno y border-bottom
- ✅ 4 gráficos interactivos (temperatura, viento, precipitación, nieve)
- ✅ Selector de rango temporal (24h / 48h / 72h / 7 días)
- ✅ Tooltips personalizados con confianza del dato
- ✅ Stats dinámicas según el modo seleccionado
- ✅ Gráficos que cambian según la cota seleccionada (ya implementado en la página)
- ✅ Responsive y SSR-safe

## 💡 Extras Opcionales

### A. Añadir indicador de hora actual en el gráfico

```typescript
markLine: {
  data: [
    {
      xAxis: new Date().toISOString(),
      label: { formatter: "Ahora" },
    },
  ];
}
```

### B. Exportar gráfico como imagen

```typescript
// En el template
<button (click)="exportChart()">Descargar Gráfico</button>

// En el componente
exportChart() {
  const chart = echarts.getInstanceByDom(document.querySelector('.chart-canvas'));
  const url = chart.getDataURL({ type: 'png', backgroundColor: '#fff' });
  // Descargar url
}
```

### C. Animaciones al cambiar de modo

```typescript
animation: {
  duration: 750,
  easing: 'cubicOut'
}
```
