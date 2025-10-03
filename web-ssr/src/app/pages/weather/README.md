# Sección Tiempo - Documentación Técnica

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Arquitectura](#arquitectura)
3. [Estructura de Archivos](#estructura-de-archivos)
4. [Componentes](#componentes)
5. [Servicios y Estado](#servicios-y-estado)
6. [Modelos de Datos](#modelos-de-datos)
7. [Rutas](#rutas)
8. [Cómo Usar](#cómo-usar)
9. [Testing](#testing)
10. [Migración a HTTP](#migración-a-http)

---

## 🎯 Descripción General

Módulo de visualización de datos meteorológicos hiperlocales para estaciones de esquí. Incluye:

- **Observaciones actuales** fusionadas de múltiples fuentes
- **Previsión 72h** por cotas (base/media/cima)
- **Acumulados de nieve** (24h, 72h, 7d)
- **Webcams en directo** con mosaico y modal
- **Radar meteorológico** (integración de tiles)
- **Selector de cotas** interactivo
- **Gráficos** de temperatura, viento y nieve
- **Mejor ventana para esquiar** (calculada automáticamente)

**Stack:**

- Angular 18 (standalone components)
- Signals para gestión de estado reactivo
- SSR-ready (hidratación en cliente)
- TailwindCSS + CSS Variables del design system
- TypeScript estricto
- Datos mock → HTTP (migración fácil)

---

## 🏗️ Arquitectura

### Principios de Diseño

1. **Máxima componentización**: Cada UI tiene su componente standalone
2. **Single Source of Truth**: `MeteoStateStore` con Signals
3. **Separation of Concerns**:
   - `services/`: Obtención de datos (HTTP/mock)
   - `components/`: UI pura sin lógica de negocio
   - `models/`: Tipos y contratos
   - `utils/`: Funciones puras (conversiones, formateo)
4. **SSR-first**: Skeletons en servidor, hidratación en cliente
5. **Progressive Enhancement**: Funciona sin JS (HTML estático)

### Flujo de Datos

```
User Action → Component Event
              ↓
         MeteoStateStore (Signals)
              ↓
         MeteoDataService (fetch/HTTP)
              ↓
         Backend/Mocks (JSON)
              ↓
         MeteoMapper (normalización)
              ↓
         Components (render con signals)
```

---

## 📁 Estructura de Archivos

```
web-ssr/src/app/pages/weather/
├── components/                         # Componentes UI
│   ├── tiempo-cota-selector/          # Selector base/mid/top
│   ├── tiempo-legend/                 # Leyenda de colores y unidades
│   ├── tiempo-skeleton/               # Loading state
│   ├── tiempo-error-state/            # Error UI con retry
│   ├── tiempo-now-panel/              # Panel de observación actual
│   ├── tiempo-snow-summary/           # Tarjetas resumen (hoy/mañana/finde)
│   ├── tiempo-forecast-charts/        # Gráficos de previsión
│   ├── tiempo-webcams-grid/           # Mosaico de webcams
│   ├── tiempo-webcam-modal/           # Modal fullscreen de webcam
│   └── tiempo-radar-widget/           # Widget de radar
│
├── models/
│   └── meteo.models.ts                # Tipos: MeteoNow, MeteoForecast, etc.
│
├── services/
│   ├── meteo-data.service.ts          # Obtención de datos (fetch → HTTP)
│   ├── meteo-state.store.ts           # Estado global con Signals
│   └── meteo-mapper.service.ts        # Normalización y cálculos
│
├── utils/
│   └── units.util.ts                  # Conversiones de unidades (°C/°F, km/h, etc.)
│
├── tiempo-page.component.ts           # Componente contenedor (página principal)
├── weather.ts                         # Antigua página (mantener por compatibilidad)
├── weather.html                       # Template antigua página
├── weather.css                        # Estilos antigua página
│
├── MIGRATION_TO_HTTP.md               # Guía de migración a backend real
└── README.md                          # Este archivo
```

---

## 🧩 Componentes

### Atómicos (UI básicos)

#### `TiempoCotaSelectorComponent`

- **Propósito**: Toggle entre base/mid/top
- **Inputs**: `selected: Cota`, `showLegend: boolean`
- **Outputs**: `cotaChange: Cota`
- **Accesibilidad**: aria-label, foco visible, teclado

#### `TiempoLegendComponent`

- **Propósito**: Leyenda de condiciones, viento, visibilidad
- **Sin props**: Totalmente estático

#### `TiempoSkeletonComponent`

- **Propósito**: Placeholder durante carga
- **Animación**: Shimmer effect con CSS

#### `TiempoErrorStateComponent`

- **Propósito**: Manejo de errores con retry
- **Inputs**: `title`, `message`, `showRetry`, `showGoBack`
- **Outputs**: `retry`, `goBack`

### Visualización de Datos

#### `TiempoNowPanelComponent`

- **Input**: `data: MeteoNow | null`
- **Features**:
  - Temperatura principal
  - Grid de métricas (nieve, viento, iso0, visibilidad)
  - Barra de confianza con fuentes
  - Alertas por viento/visibilidad

#### `TiempoSnowSummaryComponent`

- **Input**: `summaries: WeatherSummary[]`
- **Features**:
  - Tarjetas para hoy/mañana/finde
  - Acumulados de nieve
  - Temperaturas min/max
  - Confianza por periodo

#### `TiempoForecastChartsComponent`

- **Inputs**: `points: MeteoForecastPoint[]`, `mode: 'temp' | 'wind' | 'snow'`
- **Features**:
  - Tabs para cambiar entre temp/viento/nieve
  - Placeholder para gráfico (integrar ngx-echarts)
  - SSR-safe (solo renderiza en browser)
  - Stats: puntos de datos, rango temporal, confianza

### Webcams y Radar

#### `TiempoWebcamsGridComponent`

- **Input**: `webcams: WebcamItem[]`
- **Output**: `webcamClick: WebcamItem`
- **Features**:
  - Grid responsive
  - Badges de cota y freshness
  - Overlay para webcams inactivas

#### `TiempoWebcamModalComponent`

- **Input**: `webcam: WebcamItem | null`
- **Output**: `closeModal: void`
- **Features**:
  - Modal fullscreen
  - Cierre con Escape o click fuera
  - Accesibilidad: role="dialog", aria-modal

#### `TiempoRadarWidgetComponent`

- **Input**: `data: RadarInfo | null`
- **Features**:
  - Placeholder para tiles de radar
  - Timestamp actualización
  - Leyenda de radar

### Página Principal

#### `TiempoPageComponent`

- **Ruta**: `/:lang/estacion/:slug/tiempo`
- **Responsabilidades**:
  - Orquestación de todos los componentes
  - Gestión de tabs (now/forecast/snow/webcams/radar)
  - Integración con `MeteoStateStore`
  - Carga inicial de datos (por slug de estación)
  - Modal de webcam

---

## 🔧 Servicios y Estado

### `MeteoDataService`

Servicio de acceso a datos meteorológicos.

**Métodos:**

```typescript
async getNow(stationSlug: string): Promise<MeteoNow>
async getForecast72(stationSlug: string): Promise<MeteoForecast>
async getWebcams(stationSlug: string): Promise<WebcamItem[]>
async getRadar(stationSlug: string): Promise<RadarInfo>
setLanguage(lang: 'es' | 'en'): void
```

**Migración:**

- Actualmente usa `fetch()` a `/assets/mocks/*.json`
- Ver `MIGRATION_TO_HTTP.md` para cambiar a `HttpClient`

### `MeteoStateStore`

Store global con Signals para estado reactivo.

**Estado:**

```typescript
// Raw data
now: Signal<MeteoNow | null>;
forecast: Signal<MeteoForecast | null>;
webcams: Signal<WebcamItem[]>;
radar: Signal<RadarInfo | null>;

// UI state
selectedCota: Signal<Cota>;
isLoading: Signal<boolean>;
error: Signal<string | null>;
stationSlug: Signal<string>;

// Computed
summaries: Signal<WeatherSummary[]>;
forecastByCota: Signal<MeteoForecastPoint[]>;
bestSkiingWindow: Signal<{ start: string; end: string; score: number } | null>;
activeWebcams: Signal<WebcamItem[]>;
hasData: Signal<boolean>;
```

**Métodos:**

```typescript
async loadStation(stationSlug: string): Promise<void>
async refreshNow(): Promise<void>
async refreshForecast(): Promise<void>
selectCota(cota: Cota): void
reset(): void
getSnapshot(): StateSnapshot
```

### `MeteoMapperService`

Servicio de transformación y cálculos sobre datos.

**Métodos:**

```typescript
generateSummaries(forecast: MeteoForecast): WeatherSummary[]
filterByCota(forecast: MeteoForecast, cota: Cota): MeteoForecastPoint[]
groupByTime(forecast: MeteoForecast): Map<string, MeteoForecastPoint[]>
findBestSkiingWindow(forecast: MeteoForecast, cota: Cota): { start, end, score } | null
```

### `UnitsUtil`

Clase estática con conversiones de unidades.

**Métodos:**

```typescript
celsiusToFahrenheit(celsius: number): number
kmhToMs(kmh: number): number
formatTemp(tempC: number, unit: 'C' | 'F'): string
formatWind(kmh: number, unit: 'kmh' | 'ms' | 'mph'): string
formatSnow(cm: number, unit: 'cm' | 'in'): string
windChill(tempC: number, windKmh: number): number
windCategory(kmh: number): { beaufort: number; description: string }
visibilityRisk(meters: number | null): { level, description }
```

---

## 📊 Modelos de Datos

Ver `models/meteo.models.ts` para definiciones completas.

### Tipos Principales

```typescript
type Cota = "base" | "mid" | "top";
type WeatherCondition = "snow" | "rain" | "mix" | "clear" | "cloudy" | "fog" | "storm";

interface MeteoNow {
  stationSlug: string;
  observedAt: string;
  tempC: number;
  windKmh: number;
  gustKmh: number;
  visibilityM: number | null;
  snowBaseCm: number | null;
  snowTopCm: number | null;
  snowNew24hCm: number | null;
  iso0M: number | null;
  condition: WeatherCondition;
  confidence: number; // 0..1
  sources: MeteoSource[];
}

interface MeteoForecastPoint {
  validAt: string;
  cota: Cota;
  tempC: number;
  windKmh: number;
  gustKmh: number;
  precipSnowCm: number;
  precipRainMm: number;
  iso0M: number | null;
  cloudPct: number | null;
  visibilityM: number | null;
  confidence: number;
}

interface MeteoForecast {
  stationSlug: string;
  hours: number;
  points: MeteoForecastPoint[];
  snowAccu24hCm: number;
  snowAccu72hCm: number;
  snowAccu7dCm?: number;
}
```

---

## 🛣️ Rutas

```typescript
// Rutas configuradas en app.routes.ts
{
  path: ':lang/estacion/:slug/tiempo',
  component: TiempoPageComponent
}
{
  path: 'estacion/:slug/tiempo',
  component: TiempoPageComponent
}

// Ejemplos:
// /es/estacion/baqueira-beret/tiempo
// /en/estacion/sierra-nevada/tiempo
// /estacion/formigal/tiempo (sin lang)
```

---

## 💻 Cómo Usar

### Desarrollo Local

1. **Servir la app:**

   ```bash
   npx nx serve web-ssr
   ```

2. **Navegar a:**

   ```
   http://localhost:4200/estacion/baqueira-beret/tiempo
   ```

3. **Ver datos mock:**
   Los mocks se cargan desde `src/assets/mocks/*.json`

### Personalizar Datos Mock

Editar archivos en `src/assets/mocks/`:

- `now.mock.json` - Observación actual
- `forecast72.mock.json` - Previsión 72h
- `webcams.mock.json` - Webcams
- `radar.mock.json` - Radar

### Cambiar Idioma

El servicio tiene un método `setLanguage()`:

```typescript
inject(MeteoDataService).setLanguage("en");
```

---

## 🧪 Testing

### Unit Tests

```bash
# Ejecutar tests
npx nx test web-ssr

# Coverage
npx nx test web-ssr --coverage
```

**Sugerencias de tests:**

- `UnitsUtil`: Conversiones de unidades
- `MeteoMapperService`: Cálculos y agrupaciones
- `MeteoStateStore`: Estado y computed values
- Componentes: Render con datos mock

### E2E Tests (Playwright)

```typescript
// Ejemplo de test E2E
test("muestra datos meteorológicos", async ({ page }) => {
  await page.goto("/estacion/baqueira-beret/tiempo");

  // Esperar carga
  await page.waitForSelector('[data-testid="tiempo-now-panel"]');

  // Verificar temperatura
  const temp = await page.textContent(".temp-value");
  expect(temp).toContain("°");

  // Cambiar tab
  await page.click("text=72 Horas");
  await page.waitForSelector('[data-testid="forecast-charts"]');

  // Abrir webcam
  await page.click("text=Webcams");
  await page.click(".webcam-card >> nth=0");
  await page.waitForSelector(".modal-overlay");
});
```

---

## 🚀 Migración a HTTP

Ver documentación completa en: **[MIGRATION_TO_HTTP.md](./MIGRATION_TO_HTTP.md)**

**Resumen rápido:**

1. Configurar `environment.apiUrl`
2. Inyectar `HttpClient` en `MeteoDataService`
3. Reemplazar `fetch()` por `http.get<T>()`
4. Crear interceptores (auth, cache, retry)
5. Probar con backend real

---

## 🎨 Estilos y Design System

Todos los componentes usan CSS Variables del design system (`web-ssr/src/styles.css`):

```css
/* Colores principales */
var(--primary-500)    /* Azul principal */
var(--neutral-900)    /* Texto principal */
var(--success-500)    /* Verde (confianza alta) */
var(--warning-500)    /* Naranja (alertas) */
var(--error-500)      /* Rojo (peligro) */

/* Animaciones */
cubic-bezier(0.34, 1.56, 0.64, 1)  /* Spring physics */
```

**Nunca usar colores hardcoded.** Siempre usar variables.

---

## 📱 Responsive

Todos los componentes son responsive:

- Mobile-first design
- Breakpoints: 640px, 768px, 1024px
- Grid responsive con `grid-template-columns: repeat(auto-fit, ...)`
- Tabs colapsables en mobile

---

## ♿ Accesibilidad

- Todos los botones con `aria-label`
- Modales con `role="dialog"` y `aria-modal`
- Foco visible con `outline`
- Soporte teclado (Escape, Enter, Tab)
- Contraste AA+ en todos los textos

---

## 📚 Referencias

- [Angular Signals](https://angular.io/guide/signals)
- [Standalone Components](https://angular.io/guide/standalone-components)
- [Angular SSR](https://angular.io/guide/ssr)
- [TailwindCSS](https://tailwindcss.com/docs)
- Design System interno: `DESIGN_SYSTEM.md`

---

## 🤝 Contribuir

1. Crear feature branch: `git checkout -b feature/meteo-new-feature`
2. Seguir patrones existentes (standalone, signals, CSS variables)
3. Añadir tests
4. Commit con prefijo: `feat(tiempo):`, `fix(tiempo):`, etc.
5. PR con descripción clara

---

## 📝 TODO / Mejoras Futuras

- [ ] Integrar ngx-echarts para gráficos reales
- [ ] Añadir comparador de modelos (GFS vs fusionado)
- [ ] Export de gráficos como imagen
- [ ] Notificaciones push de alertas
- [ ] Integración con Leaflet para mapa de radar
- [ ] Histórico de datos (última semana)
- [ ] Predicción de calidad de nieve por pista
- [ ] Integración con sistema de alertas premium

---

**Mantenido por:** Equipo Frontend Nieve Platform  
**Última actualización:** 2025-10-01
