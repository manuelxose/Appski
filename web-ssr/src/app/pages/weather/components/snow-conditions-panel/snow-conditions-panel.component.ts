import { Component, input, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  SnowConditions,
  AvalancheRisk,
  Cota,
  SnowConditionsByCota,
} from "../../models/meteo.models";

@Component({
  selector: "app-snow-conditions-panel",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="snow-conditions">
      <div class="header-section">
        <h2 class="section-title">Estado de la Nieve</h2>
        <div class="update-info">
          Última actualización: {{ formatUpdateTime() }}
        </div>
      </div>

      <!-- Peligro de Aludes - Destacado -->
      <div
        class="avalanche-alert"
        [class]="'risk-' + conditions().avalancheRisk"
      >
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
          <span class="alert-label">Peligro de Aludes</span>
          <span class="alert-value">{{
            getAvalancheLabel(conditions().avalancheRisk)
          }}</span>
        </div>
      </div>

      <!-- Datos de la Cota Seleccionada -->
      <div class="cota-detail">
        <div class="cota-card" [class]="getCotaClass()">
          <div class="cota-header">
            <span class="cota-icon">{{ getCotaIcon() }}</span>
            <div class="cota-info">
              <span class="cota-name">{{ getCotaName() }}</span>
              <span class="cota-altitude"
                >{{ currentCotaData().altitudeM }}m</span
              >
            </div>
          </div>
          <div class="cota-metrics-grid">
            <div class="metric-card">
              <div class="metric-icon">❄️</div>
              <div class="metric-content">
                <span class="metric-label">Espesor</span>
                <span class="metric-value">{{
                  formatDepth(currentCotaData().depthCm)
                }}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">🌨️</div>
              <div class="metric-content">
                <span class="metric-label">Calidad</span>
                <span class="metric-value">{{
                  formatQuality(currentCotaData().quality)
                }}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">🌡️</div>
              <div class="metric-content">
                <span class="metric-label">Temperatura</span>
                <span class="metric-value">{{
                  formatTemp(currentCotaData().tempC)
                }}</span>
              </div>
            </div>
            <div class="metric-card">
              <div class="metric-icon">💨</div>
              <div class="metric-content">
                <span class="metric-label">Viento</span>
                <span class="metric-value">{{
                  formatWind(currentCotaData().windKmh)
                }}</span>
              </div>
            </div>
            @if (currentCotaData().lastSnowfall) {
            <div class="metric-card snowfall-card">
              <div class="metric-icon">📅</div>
              <div class="metric-content">
                <span class="metric-label">Última Nevada</span>
                <span class="metric-value">{{
                  formatLastSnowfall(currentCotaData().lastSnowfall!)
                }}</span>
              </div>
            </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .snow-conditions {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        margin-bottom: 2rem;
      }

      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .section-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .update-info {
        font-size: 0.875rem;
        color: var(--neutral-600);
        font-style: italic;
      }

      /* Alerta de Aludes */
      .avalanche-alert {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        border-left: 4px solid;
        transition: all 0.3s ease;
      }

      .avalanche-alert.risk-none {
        background: var(--neutral-100);
        border-color: var(--neutral-400);
      }

      .avalanche-alert.risk-low {
        background: #d1fae5;
        border-color: #10b981;
      }

      .avalanche-alert.risk-moderate {
        background: #fef3c7;
        border-color: #f59e0b;
      }

      .avalanche-alert.risk-considerable {
        background: #fed7aa;
        border-color: #f97316;
      }

      .avalanche-alert.risk-high {
        background: #fee2e2;
        border-color: #ef4444;
      }

      .avalanche-alert.risk-very-high {
        background: #fecaca;
        border-color: #991b1b;
      }

      .alert-icon {
        font-size: 2rem;
      }

      .alert-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .alert-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-600);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .alert-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      /* Detalle de cota seleccionada */
      .cota-detail {
        margin-top: 2rem;
      }

      .cota-card {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        border: 3px solid;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      }

      .cota-card.base-cota {
        border-color: #8b5cf6;
      }

      .cota-card.mid-cota {
        border-color: #3b82f6;
      }

      .cota-card.top-cota {
        border-color: #06b6d4;
      }

      .cota-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 2px solid var(--neutral-200);
      }

      .cota-icon {
        font-size: 3rem;
      }

      .cota-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .cota-name {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .cota-altitude {
        font-size: 1rem;
        font-weight: 600;
        color: var(--neutral-600);
      }

      .cota-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
      }

      .metric-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: var(--neutral-50);
        border-radius: 12px;
        transition: all 0.3s ease;
      }

      .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .snowfall-card {
        grid-column: 1 / -1;
        background: linear-gradient(135deg, #dbeafe 0%, #f0f9ff 100%);
      }

      .metric-icon {
        font-size: 2rem;
        flex-shrink: 0;
      }

      .metric-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
      }

      .metric-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-600);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .metric-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      @media (max-width: 768px) {
        .snow-conditions {
          padding: 1.5rem;
        }

        .header-section {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .avalanche-alert {
          flex-direction: column;
          text-align: center;
        }

        .cota-card {
          padding: 1.5rem;
        }

        .cota-metrics-grid {
          grid-template-columns: 1fr;
        }

        .snowfall-card {
          grid-column: auto;
        }
      }
    `,
  ],
})
export class SnowConditionsPanelComponent {
  conditions = input.required<SnowConditions>();
  selectedCota = input.required<Cota>();

  // Obtener los datos de la cota actual
  currentCotaData = computed<SnowConditionsByCota>(() => {
    const cond = this.conditions();
    const cota = this.selectedCota();
    return cond[cota];
  });

  getCotaName(): string {
    const names: Record<Cota, string> = {
      base: "Base",
      mid: "Media",
      top: "Cima",
    };
    return names[this.selectedCota()];
  }

  getCotaIcon(): string {
    const icons: Record<Cota, string> = {
      base: "🏔️",
      mid: "⛰️",
      top: "🗻",
    };
    return icons[this.selectedCota()];
  }

  getCotaClass(): string {
    const classes: Record<Cota, string> = {
      base: "base-cota",
      mid: "mid-cota",
      top: "top-cota",
    };
    return classes[this.selectedCota()];
  }

  formatUpdateTime(): string {
    const date = new Date(this.conditions().updatedAt);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatDepth(depth: number | null): string {
    return depth !== null ? `${depth} cm` : "-";
  }

  formatQuality(quality: string | null): string {
    if (!quality) return "-";
    const labels: Record<string, string> = {
      powder: "Polvo 🌨️",
      fresh: "Reciente ❄️",
      packed: "Pisada ⛷️",
      spring: "Primavera 🌸",
      icy: "Helada 🧊",
      wet: "Húmeda 💧",
    };
    return labels[quality] || quality;
  }

  formatTemp(temp: number | null): string {
    return temp !== null ? `${temp}°C` : "-";
  }

  formatWind(wind: number | null): string {
    return wind !== null ? `${wind} km/h` : "-";
  }

  formatLastSnowfall(isoDate: string): string {
    const date = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `hace ${diffHours}h`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
    }
  }

  getAvalancheLabel(risk: AvalancheRisk): string {
    const labels: Record<AvalancheRisk, string> = {
      none: "Sin información",
      low: "Nivel 1 - Débil",
      moderate: "Nivel 2 - Limitado",
      considerable: "Nivel 3 - Notable",
      high: "Nivel 4 - Fuerte",
      "very-high": "Nivel 5 - Muy Fuerte",
    };
    return labels[risk];
  }
}
