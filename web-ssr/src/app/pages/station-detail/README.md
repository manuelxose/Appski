# 📄 Station Detail Page - Página de Detalle de Estación

## 🎯 Propósito

Página de detalle que muestra información completa de una estación de esquí específica, incluyendo:

- Hero con imagen, estado, precios y altitudes
- Parte de nieve (condiciones actuales, nevada reciente, temperatura, viento)
- Remontes y pistas (estado de apertura, listado completo)
- Webcams en directo
- Pronóstico 7 días
- Información de la estación (sobre, servicios, acceso, precios)

## 📁 Estructura de Archivos

```
pages/station-detail/
├── models/
│   └── station-detail.models.ts    # 15+ interfaces: StationHeroData, SnowReport, LiftsSlopesData, etc.
├── services/
│   └── station-detail.data.service.ts  # Mock-first, loadStationDetail(slug)
├── mocks/                          # Mock files (unused but kept for consistency)
├── components/                     # Componentes exclusivos
│   ├── station-hero/              # Hero section con imagen y datos principales
│   ├── station-snow-report/       # Parte de nieve con condiciones actuales
│   └── station-lifts-slopes/      # Estado de remontes y pistas
├── station-detail.ts              # Component principal
├── station-detail.html            # Template
└── station-detail.css             # Styles
```

## 🗂️ Modelos de Datos

### StationHeroData

```typescript
interface StationHeroData {
  name: string;
  slug: string;
  region: string;
  location: string;
  heroImage: string;
  status: StationStatus; // "open" | "closed" | "seasonal" | "maintenance"
  price: { adult: number; currency: string };
  altitude: { base: number; top: number }; // metros
  rating?: number; // 0-5
  reviews?: number;
}
```

### SnowReport

```typescript
interface SnowReport {
  snowBase: number; // cm
  snowTop: number; // cm
  snowNew24h: number; // cm
  snowNew48h: number; // cm
  snowNew7days: number; // cm
  snowQuality: SnowQuality; // "powder" | "packed-powder" | "hard" | "icy" | "spring"
  lastSnowfall: string;
  temperature: { current: number; min: number; max: number }; // °C
  wind: { speed: number; direction: string }; // km/h, N/NE/E/SE/S/SW/W/NW
  visibility: Visibility; // "excellent" | "good" | "moderate" | "poor"
  updatedAt: string;
}
```

### LiftsSlopesData

```typescript
interface LiftsSlopesData {
  lifts: {
    open: number;
    total: number;
    list: Lift[];
  };
  slopes: {
    open: number;
    total: number;
    list: Slope[];
  };
}

interface Lift {
  id: string;
  name: string;
  type: LiftType; // "chairlift" | "gondola" | "t-bar" | "magic-carpet"
  status: FacilityStatus; // "open" | "closed" | "maintenance"
  capacity: number; // personas/hora
}

interface Slope {
  id: string;
  name: string;
  difficulty: SlopeDifficulty; // "green" | "blue" | "red" | "black"
  status: FacilityStatus;
  length: number; // metros
}
```

### Otros Modelos

```typescript
interface Webcam {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  lastUpdate: string;
  isLive: boolean;
}

interface DailyForecast {
  date: string; // ISO
  dayName: string; // Lun, Mar, etc.
  temp: number; // °C
  icon: string; // emoji
  snowCm: number; // cm de nieve esperada
}

interface StationInfo {
  about: string;
  services: string[];
  access: {
    car: string;
    publicTransport: string;
    parking: string;
  };
  prices: {
    adult: number;
    child: number;
    senior: number;
    season: number;
    currency: string;
  };
}
```

## 🔄 Servicio de Datos

### StationDetailDataService

**Estrategia**: Mock-first con flag `USE_MOCK_DATA: true`

**Método principal**:

```typescript
async loadStationDetail(slug: string): Promise<StationDetailPageData>
```

**Comportamiento**:

- En modo mock: Lee `/assets/mocks/station-detail/${slug}.mock.json`
- Si no existe mock para el slug: Carga `baqueira-beret.mock.json` como fallback
- En modo API: Llamada a `/api/v1/stations/${slug}`

**Datos devueltos**:

```typescript
interface StationDetailPageData {
  hero: StationHeroData;
  snowReport: SnowReport;
  liftsSlopes: LiftsSlopesData;
  webcams: Webcam[];
  forecast: DailyForecast[];
  info: StationInfo;
}
```

## 🎨 Componentes Exclusivos

### 1. StationHeroComponent

- **Ubicación**: `components/station-hero/`
- **Input**: `station: StationHeroData`
- **Función**: Muestra hero con imagen de fondo, nombre, ubicación, estado, precios, altitudes, rating
- **Características**:
  - Badge de estado con animación pulse para "open"
  - Estrelllas de rating (método `getStars()`)
  - Breadcrumb de navegación
  - Botones CTA (Comprar forfait, Ver mapa)

### 2. StationSnowReportComponent

- **Ubicación**: `components/station-snow-report/`
- **Input**: `snowReport: SnowReport`
- **Función**: Muestra parte de nieve con condiciones actuales
- **Características**:
  - Grid con valores de nieve (base, cima, nueva 24h/48h/7días)
  - Badge de calidad de nieve con colores dinámicos
  - Sección de nevada reciente
  - Condiciones meteorológicas (temperatura, viento, visibilidad)
  - Métodos helper: `getQualityLabel()`, `getQualityColor()`, `getVisibilityLabel()`

### 3. StationLiftsSlopesComponent

- **Ubicación**: `components/station-lifts-slopes/`
- **Input**: `data: LiftsSlopesData`
- **Función**: Muestra estado de remontes y pistas
- **Características**:
  - Cards resumen con progreso circular
  - Listados completos de remontes y pistas
  - Iconos para tipos de remonte (método `getLiftIcon()`)
  - Dots de color para dificultad (método `getDifficultyColor()`)
  - Badges de estado con colores (método `getStatusBadgeClass()`)
  - Scroll interno para listas largas

## 🚀 Integración en Componente Principal

### station-detail.ts

**Signals**:

```typescript
// State
slug = signal<string>("");
isLoading = signal<boolean>(true);

// Data
stationData = signal<StationHeroData>({
  /* ... */
});
snowReport = signal<SnowReport>({
  /* ... */
});
liftsSlopesData = signal<LiftsSlopesData>({
  /* ... */
});
webcams = signal<Webcam[]>([]);
forecast = signal<DailyForecast[]>([]);
stationInfo = signal<StationInfo>({
  /* ... */
});
```

**Ciclo de vida**:

```typescript
async ngOnInit(): Promise<void> {
  this.route.params.subscribe(async (params: Params) => {
    const slug = params["slug"];
    this.slug.set(slug);
    await this.loadStationData(slug);
  });
}

private async loadStationData(slug: string): Promise<void> {
  try {
    this.isLoading.set(true);
    const data = await this.dataService.loadStationDetail(slug);

    // Actualizar todas las señales
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
```

## 📦 Mocks

### Ubicación

- `web-ssr/src/assets/mocks/station-detail/baqueira-beret.mock.json`

### Estación de ejemplo: Baqueira Beret

- **Región**: Pirineo Catalán
- **Altitud**: 1500m (base) - 2610m (cima)
- **Nieve**: 120cm base, 180cm cima, 15cm nueva 24h
- **Estado**: Abierta
- **Remontes**: 35/39 abiertos
- **Pistas**: 110/120 abiertas
- **3 webcams** en directo (cota 1800m, 2500m, 2510m)
- **Pronóstico 7 días** con nieve esperada
- **Información completa** (sobre, 9 servicios, acceso, precios)

## 🎨 Estilos

### Design System

- **Variables CSS**: `var(--primary-*)`, `var(--neutral-*)`, `var(--success-*)`
- **Espaciado**: `var(--space-*)`
- **Tipografía**: `var(--font-size-*)`, `var(--font-weight-*)`
- **Bordes**: `var(--radius-*)` (xl, 2xl, 3xl, full)
- **Sombras**: `var(--shadow-*)` (md, lg, xl, 2xl)
- **Transiciones**: `var(--transition-base)`, `var(--ease-out)`

### Animaciones

- **fadeInUp**: Entrada del container principal
- **scaleIn**: Cards de nieve y remontes
- **slideIn**: Progress bars
- **shimmer**: Efecto de brillo en progress bars
- **bounce**: Icono de scroll en hero

### Gradientes específicos

- **Blue theme** (remontes): `#eff6ff → #bfdbfe`
- **Green theme** (pistas): `#f0fdf4 → #bbf7d0`
- **Orange theme** (temperatura): `#fff7ed → #fed7aa`
- **Sky theme** (viento): `#f0f9ff → #bae6fd`
- **Purple theme** (visibilidad): `#faf5ff → #e9d5ff`

## 🧪 Testing Manual

### Ruta

```
/estaciones/:slug
```

### Casos de prueba

1. **Slug válido**: `/estaciones/baqueira-beret` → Carga datos de Baqueira
2. **Slug inválido**: `/estaciones/estacion-inexistente` → Carga fallback (Baqueira)
3. **Datos mostrados**:
   - ✅ Hero con imagen, nombre, estado, precios
   - ✅ Parte de nieve con valores actualizados
   - ✅ Remontes y pistas con listados completos
   - ✅ 3 webcams con badge "EN VIVO"
   - ✅ 7 días de pronóstico con emojis y nieve esperada
   - ✅ Tabs de información (sobre, servicios, acceso, precios)

## 🔮 Trabajo Futuro

### Componentes adicionales recomendados

- **WebcamsGridComponent**: Extraer sección de webcams hardcoded
- **ForecastWeekComponent**: Extraer sección de pronóstico 7 días
- **StationInfoTabsComponent**: Extraer tabs de información hardcoded

### Mejoras en servicio

- Cache de datos por slug (evitar llamadas repetidas)
- Invalidación de cache por tiempo (ej: 15 minutos)
- Estado de loading/error más robusto

### Mejoras en mocks

- Crear mocks para más estaciones (Sierra Nevada, Formigal, etc.)
- Incluir imágenes reales de estaciones
- Webcams con feeds reales (URLs de cámaras oficiales)

## 📊 Métricas

- **15+ interfaces** TypeScript con JSDoc completa
- **1 servicio** de datos con estrategia mock/API
- **3 componentes** exclusivos movidos desde `app/components/`
- **1 mock JSON** completo con datos realistas (198 líneas)
- **6 señales** para estado reactivo
- **0 errores** de compilación/lint
- **100% CSS variables** del design system (excepto gradientes decorativos específicos)

## 🔗 Referencias

- **Guía AI**: `AI_GUIDE.md` - Metodología de refactorización por página
- **Design System**: `DESIGN_SYSTEM.md` - Variables CSS y patrones de diseño
- **Architecture**: `ARCHITECTURE.md` - Patrones Angular 18+
- **Stations List**: `pages/stations-list/README.md` - Arquitectura similar
