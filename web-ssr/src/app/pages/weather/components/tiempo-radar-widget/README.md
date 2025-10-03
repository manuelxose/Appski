# Tiempo Radar Widget Component

Componente de mapa interactivo para visualizar el radar meteorológico con overlay de precipitación animado.

## 🎯 Características

- **Mapa Interactivo**: Visualización del radar con Leaflet
- **Overlay de Precipitación**: Capa animada con datos de precipitación en tiempo real
- **Controles de Animación**: Reproducir/pausar secuencia temporal de 12 frames
- **Actualización Manual**: Botón para refrescar datos del radar
- **Leyenda Visual**: Escala de intensidades de precipitación
- **Responsive**: Adaptado para móviles y tablets

## 📦 Instalación de Dependencias

Para que el componente funcione completamente, necesitas instalar Leaflet:

```bash
npm install leaflet @types/leaflet --save
```

Además, añade los estilos de Leaflet en `angular.json` o en `styles.css`:

```json
// angular.json
"styles": [
  "node_modules/leaflet/dist/leaflet.css",
  "web-ssr/src/styles.css"
]
```

O en `styles.css`:

```css
@import "leaflet/dist/leaflet.css";
```

## 🔧 Estado Actual

✅ **Modo Simulación Estático - Limpio y Simple**

El componente funciona en **modo estático** sin animación:

- ✅ Mapa interactivo con CartoDB Positron base layer
- ✅ **Overlay simulado generado con Canvas** (4 células de precipitación con gradientes)
- ✅ Vista estática sin bucles de animación
- ✅ Leyenda con escala de precipitación (0-50+ mm/h)
- ✅ Sin logs repetitivos en consola
- ✅ Sin errores de carga de tiles externos
- ✅ Componente limpio y eficiente

### 🎨 Simulación de Precipitación

El componente genera **dinámicamente** una imagen de radar que simula:

- **Células azules**: Precipitación ligera (0-2 mm/h)
- **Células verdes**: Precipitación moderada (2-5 mm/h)
- **Células amarillas**: Precipitación fuerte (5-20 mm/h)
- **Células rojas**: Precipitación intensa (20+ mm/h)
- **Efecto de ruido**: Pequeñas partículas para realismo

### 🔄 Migrar a Datos Reales

Para usar datos reales de RainViewer o OpenWeatherMap, reemplaza la línea:

```typescript
// En initializeMap(), cambiar:
const simulatedOverlay = L.imageOverlay(...)

// Por:
const radarTileLayer = L.tileLayer(radarData.tileUrlTemplate, {
  opacity: 0.75,
  attribution: '<a href="https://rainviewer.com">RainViewer</a>',
});
```

## 🚀 Uso

```typescript
<app-tiempo-radar-widget [data]="radarData" />
```

### Modelo de Datos

```typescript
interface RadarInfo {
  tileUrlTemplate: string; // URL template para tiles: {z}/{x}/{y}
  timestamp: string; // ISO 8601
  legendUrl?: string; // URL de la imagen de leyenda
  centerLat?: number; // Latitud del centro (ej: 40.416775)
  centerLon?: number; // Longitud del centro (ej: -3.703790)
  zoom?: number; // Nivel de zoom inicial (ej: 8)
}
```

## 🎨 Personalización

El componente usa variables CSS del design system:

- `--primary-500`, `--primary-600`, `--primary-700`: Colores principales
- `--neutral-50` hasta `--neutral-900`: Escala de grises
- Animaciones: Spring physics con `cubic-bezier(0.34, 1.56, 0.64, 1)`

## 📡 Proveedores de Tiles

### RainViewer (Actualmente en Uso) ✅

**Sin necesidad de API Key - Gratis**

```
https://tilecache.rainviewer.com/v2/radar/{timestamp}/512/{z}/{x}/{y}/2/1_1.png
```

- `{timestamp}`: Unix timestamp en segundos (ej: 1696176000)
- `512`: Tamaño del tile (256, 512, o 1024)
- `2`: Esquema de color (0-8 opciones disponibles)
- `1_1`: Smooth + Snow (1_0 = sin snow, 0_1 = sin smooth)

**Ejemplo de Mock:**

```json
{
  "tileUrlTemplate": "https://tilecache.rainviewer.com/v2/radar/1696176000/512/{z}/{x}/{y}/2/1_1.png",
  "timestamp": "2025-10-02T14:30:00Z",
  "centerLat": 40.416775,
  "centerLon": -3.70379,
  "zoom": 7
}
```

### OpenWeatherMap (Requiere API Key)

```
https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid={API_KEY}
```

### Mapbox (Requiere Token)

```
https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.png?access_token={TOKEN}
```

## 🔄 Estados del Componente

| Signal        | Tipo      | Descripción                         |
| ------------- | --------- | ----------------------------------- |
| `mapReady`    | `boolean` | Indica si el mapa está inicializado |
| `isAnimating` | `boolean` | Indica si la animación está activa  |

## 🎯 Métodos Públicos

- `toggleAnimation()`: Inicia/pausa la animación
- `refreshRadar()`: Actualiza los datos del radar
- `formatTime(iso: string)`: Formatea timestamp para display

## ⚠️ Modo Simulación

Si Leaflet no está instalado, el componente funciona en **modo simulación**:

- Muestra overlay de carga
- Los controles están deshabilitados
- Los logs en consola muestran la configuración

## 🐛 Debugging

Todos los métodos importantes logean en consola:

- `📡 Inicializando mapa del radar...`
- `✅ Mapa del radar listo`
- `▶️ Iniciando animación del radar...`
- `⏸️ Animación pausada`
- `🔄 Actualizando radar...`

## 📚 Referencias

- [Leaflet Documentation](https://leafletjs.com/)
- [Leaflet Tile Layers](https://leafletjs.com/reference.html#tilelayer)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [RainViewer API](https://www.rainviewer.com/api.html)
