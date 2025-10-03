import {
  Component,
  input,
  signal,
  effect,
  OnDestroy,
  ElementRef,
  viewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RadarInfo } from "../../models/meteo.models";

@Component({
  selector: "app-tiempo-radar-widget",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (data()) {
    <div class="radar-widget">
      <div class="radar-header">
        <h2 class="radar-title">
          <span class="title-icon">📡</span>
          Radar Meteorológico
          <span class="simulation-badge">🎨 SIMULACIÓN</span>
        </h2>
        <span class="radar-timestamp"
          >Vista estática con precipitación simulada</span
        >
      </div>

      <div class="radar-container">
        <div #mapContainer class="map-container"></div>
        @if (!mapReady()) {
        <div class="map-overlay loading">
          <div class="loading-spinner">
            <div class="spinner-icon">📡</div>
            <p class="loading-text">Cargando mapa del radar...</p>
            <p class="loading-hint">Inicializando Leaflet...</p>
          </div>
        </div>
        }
      </div>

      <div class="radar-legend">
        <div class="legend-title">
          <span class="legend-icon">🌈</span>
          Intensidad de Precipitación
        </div>
        <div class="legend-content">
          <div class="precipitation-scale">
            <div class="scale-gradient"></div>
            <div class="scale-labels">
              <span class="scale-tick">0</span>
              <span class="scale-tick">2</span>
              <span class="scale-tick">5</span>
              <span class="scale-tick">10</span>
              <span class="scale-tick">20</span>
              <span class="scale-tick">50+ mm/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
      .radar-widget {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }

      /* Header */
      .radar-header {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }

      .radar-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .title-icon {
        font-size: 1.75rem;
        animation: radarScan 3s ease-in-out infinite;
      }

      .simulation-badge {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--primary-700);
        background: linear-gradient(
          135deg,
          var(--primary-50),
          var(--primary-100)
        );
        padding: 0.25rem 0.625rem;
        border-radius: 12px;
        border: 1.5px solid var(--primary-300);
        letter-spacing: 0.5px;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes radarScan {
        0%,
        100% {
          transform: rotate(0deg);
          opacity: 1;
        }
        50% {
          transform: rotate(180deg);
          opacity: 0.7;
        }
      }

      .radar-timestamp {
        font-size: 0.875rem;
        color: var(--neutral-600);
        font-weight: 600;
        padding: 0.25rem 0.75rem;
        background: var(--neutral-100);
        border-radius: 6px;
        display: inline-block;
      }

      /* Map Container */
      .radar-container {
        position: relative;
        width: 100%;
        height: 500px;
        background: var(--neutral-100);
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 1rem;
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .map-container {
        width: 100% !important;
        height: 100% !important;
        min-height: 500px !important;
        background: var(--neutral-50);
      }

      .map-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          135deg,
          var(--neutral-50),
          var(--neutral-100)
        );
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      .loading-spinner {
        text-align: center;
        padding: 2rem;
      }

      .spinner-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: radarPulse 2s ease-in-out infinite;
      }

      @keyframes radarPulse {
        0%,
        100% {
          transform: scale(1) rotate(0deg);
          opacity: 1;
        }
        50% {
          transform: scale(1.1) rotate(180deg);
          opacity: 0.7;
        }
      }

      .loading-text {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--neutral-700);
        margin: 0 0 0.5rem 0;
      }

      .loading-hint {
        font-size: 0.875rem;
        color: var(--neutral-500);
        margin: 0;
        max-width: 500px;
        line-height: 1.5;
      }

      /* Animation Indicator */
      .animation-indicator {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(10px);
        color: white;
        padding: 0.75rem 1.25rem;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .indicator-content {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
      }

      .indicator-icon {
        font-size: 1.25rem;
        animation: pulse 1s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.1);
        }
      }

      .indicator-text {
        font-size: 0.875rem;
        font-weight: 700;
        white-space: nowrap;
      }

      .progress-bar {
        width: 150px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(
          90deg,
          var(--primary-400),
          var(--primary-600)
        );
        transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 2px;
      }

      /* Legend */
      .radar-legend {
        padding: 1.5rem;
        background: white;
        border: 2px solid var(--neutral-200);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .legend-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .legend-icon {
        font-size: 1.5rem;
      }

      .legend-image {
        display: none;
      }

      .legend-content {
        width: 100%;
      }

      .precipitation-scale {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .scale-gradient {
        width: 100%;
        height: 50px;
        background: linear-gradient(
          to right,
          rgba(150, 150, 255, 0.3) 0%,
          rgba(100, 200, 255, 0.5) 15%,
          rgba(0, 255, 0, 0.6) 30%,
          rgba(255, 255, 0, 0.7) 50%,
          rgba(255, 150, 0, 0.8) 70%,
          rgba(255, 0, 0, 0.9) 85%,
          rgba(200, 0, 200, 1) 100%
        );
        border-radius: 8px;
        border: 2px solid var(--neutral-300);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        position: relative;
      }

      .scale-gradient::after {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(
          90deg,
          transparent,
          transparent 19%,
          rgba(0, 0, 0, 0.1) 19%,
          rgba(0, 0, 0, 0.1) 20%
        );
        border-radius: 6px;
      }

      .scale-labels {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--neutral-700);
      }

      .scale-tick {
        flex: 1;
        text-align: center;
        white-space: nowrap;
      }

      .scale-tick:first-child {
        text-align: left;
      }

      .scale-tick:last-child {
        text-align: right;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .radar-widget {
          padding: 1rem;
        }

        .radar-container {
          height: 350px;
        }

        .map-container {
          min-height: 350px !important;
        }

        .radar-title {
          font-size: 1.25rem;
        }

        .simulation-badge {
          font-size: 0.625rem;
        }

        .spinner-icon {
          font-size: 3rem;
        }

        .animation-indicator {
          top: 0.5rem;
          right: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class TiempoRadarWidgetComponent implements OnDestroy {
  data = input.required<RadarInfo | null>();
  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>("mapContainer");

  readonly mapReady = signal(false);

  private map: { remove: () => void; invalidateSize: () => void } | null = null; // Leaflet Map type

  constructor() {
    // Effect para inicializar el mapa cuando cambien los datos
    effect(() => {
      const radarData = this.data();
      if (radarData && this.mapContainer()) {
        this.initializeMap();
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private async initializeMap(): Promise<void> {
    try {
      const radarData = this.data();
      const container = this.mapContainer()?.nativeElement;

      if (!radarData || !container) {
        console.warn("⚠️ No hay datos de radar o contenedor");
        return;
      }

      console.log("📡 Inicializando mapa del radar...");
      console.log("Centro:", radarData.centerLat, radarData.centerLon);
      console.log("Zoom:", radarData.zoom);
      console.log("Tiles:", radarData.tileUrlTemplate);

      // Importar Leaflet dinámicamente
      const L = await import("leaflet");
      console.log("✅ Leaflet importado correctamente");

      // Limpiar mapa anterior si existe
      if (this.map) {
        console.log("🧹 Limpiando mapa anterior");
        this.map.remove();
        this.map = null;
      }

      // Esperar un tick para que el DOM esté listo
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Crear mapa con configuración
      const leafletMap = L.map(container, {
        center: [
          radarData.centerLat || 40.416775,
          radarData.centerLon || -3.70379,
        ],
        zoom: radarData.zoom || 8,
        zoomControl: true,
        attributionControl: true,
      });

      console.log("🗺️ Mapa Leaflet creado");

      // Añadir capa base (CartoDB Positron - más claro y rápido)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
          minZoom: 4,
          subdomains: "abcd",
        }
      ).addTo(leafletMap);

      console.log("✅ Capa base añadida");

      // Crear overlay simulado de precipitación (Canvas) - estático
      L.imageOverlay(
        this.createSimulatedRadarImage(),
        [
          [42.5, -6.0], // Coordenadas NW (esquina superior izquierda)
          [38.0, -1.0], // Coordenadas SE (esquina inferior derecha)
        ],
        {
          opacity: 0.6,
          interactive: false,
          attribution: "🎨 Simulación de Radar Meteorológico",
        }
      ).addTo(leafletMap);

      console.log("✅ Overlay simulado de radar añadido (estático)");

      // Guardar referencia del mapa
      this.map = leafletMap;

      this.mapReady.set(true);
      console.log(
        "✅ Mapa del radar inicializado (modo estático - sin animación)"
      );

      // Forzar recalculo del tamaño una sola vez
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          console.log("🔄 Tamaño del mapa recalculado");
        }
      }, 250);
    } catch (error) {
      console.error("❌ Error inicializando mapa del radar:", error);
      this.mapReady.set(false);
    }
  }

  private createSimulatedRadarImage(): string {
    // Crear canvas para simular radar
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext("2d");

    if (!ctx) return "";

    // Fondo transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Simular múltiples "células" de precipitación
    const cells = [
      {
        x: 200,
        y: 150,
        radius: 80,
        intensity: 0.7,
        color: "rgba(0, 150, 255, 0.6)",
      }, // Azul (ligera)
      {
        x: 450,
        y: 200,
        radius: 120,
        intensity: 0.8,
        color: "rgba(0, 255, 100, 0.5)",
      }, // Verde (moderada)
      {
        x: 600,
        y: 400,
        radius: 100,
        intensity: 0.9,
        color: "rgba(255, 200, 0, 0.6)",
      }, // Amarillo (fuerte)
      {
        x: 300,
        y: 450,
        radius: 70,
        intensity: 0.6,
        color: "rgba(255, 100, 100, 0.5)",
      }, // Rojo (intensa)
    ];

    cells.forEach((cell) => {
      const gradient = ctx.createRadialGradient(
        cell.x,
        cell.y,
        0,
        cell.x,
        cell.y,
        cell.radius
      );
      gradient.addColorStop(0, cell.color);
      gradient.addColorStop(0.7, cell.color.replace(/[\d.]+\)$/, "0.3)"));
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    // Añadir "ruido" para efecto más realista
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 30 + 10;
      const alpha = Math.random() * 0.3;

      ctx.fillStyle = `rgba(150, 200, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas.toDataURL("image/png");
  }

  private cleanup(): void {
    // Limpiar mapa de Leaflet
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    console.log("🧹 Recursos del radar limpiados");
  }
}
