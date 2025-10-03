import { Component, input, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MeteoNow } from "../../models/meteo.models";

@Component({
  selector: "app-tiempo-now-panel",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (data()) {
    <div class="now-panel">
      <!-- Temperatura principal -->
      <div class="main-temp-section">
        <div class="temp-display">
          <span class="temp-value">{{ data()!.tempC }}°</span>
          <span class="temp-unit">C</span>
        </div>
        <div class="condition">
          <span class="condition-icon">{{ conditionIcon() }}</span>
          <span class="condition-label">{{ conditionLabel() }}</span>
        </div>
      </div>

      <!-- Grid de métricas -->
      <div class="metrics-grid">
        <!-- Nieve -->
        <div class="metric-card highlight">
          <div class="metric-icon">❄️</div>
          <div class="metric-content">
            <div class="metric-label">Nieve 24h</div>
            <div class="metric-value">{{ data()!.snowNew24hCm ?? 0 }} cm</div>
          </div>
        </div>

        <!-- Espesor base -->
        <div class="metric-card">
          <div class="metric-icon">🏔️</div>
          <div class="metric-content">
            <div class="metric-label">Base</div>
            <div class="metric-value">{{ data()!.snowBaseCm ?? "-" }} cm</div>
          </div>
        </div>

        <!-- Espesor cima -->
        <div class="metric-card">
          <div class="metric-icon">🗻</div>
          <div class="metric-content">
            <div class="metric-label">Cima</div>
            <div class="metric-value">{{ data()!.snowTopCm ?? "-" }} cm</div>
          </div>
        </div>

        <!-- Viento -->
        <div class="metric-card" [class.alert]="windAlert()">
          <div class="metric-icon">💨</div>
          <div class="metric-content">
            <div class="metric-label">Viento</div>
            <div class="metric-value">{{ data()!.windKmh }} km/h</div>
            @if (data()!.gustKmh > data()!.windKmh + 10) {
            <div class="metric-detail">Ráfagas {{ data()!.gustKmh }} km/h</div>
            }
          </div>
        </div>

        <!-- Isoterma 0° -->
        @if (data()!.iso0M) {
        <div class="metric-card">
          <div class="metric-icon">🌡️</div>
          <div class="metric-content">
            <div class="metric-label">Iso 0°</div>
            <div class="metric-value">{{ data()!.iso0M }} m</div>
          </div>
        </div>
        }

        <!-- Visibilidad -->
        @if (data()!.visibilityM) {
        <div class="metric-card" [class.alert]="visibilityAlert()">
          <div class="metric-icon">👁️</div>
          <div class="metric-content">
            <div class="metric-label">Visibilidad</div>
            <div class="metric-value">{{ visibilityKm() }} km</div>
          </div>
        </div>
        }
      </div>

      <!-- Confianza y fuentes -->
      <div class="confidence-section">
        <div class="confidence-bar">
          <div class="confidence-label">
            <span>Confianza</span>
            <span class="confidence-value">{{ confidencePercent() }}%</span>
          </div>
          <div class="confidence-progress">
            <div
              class="confidence-fill"
              [style.width.%]="confidencePercent()"
              [class.high]="data()!.confidence > 0.8"
              [class.medium]="
                data()!.confidence >= 0.6 && data()!.confidence <= 0.8
              "
              [class.low]="data()!.confidence < 0.6"
            ></div>
          </div>
        </div>

        @if (data()!.sources.length > 0) {
        <div class="sources">
          <span class="sources-label">Fuentes:</span>
          @for (source of data()!.sources; track source.name) {
          <span class="source-badge">{{ source.name }}</span>
          }
        </div>
        }
      </div>

      <!-- Timestamp -->
      <div class="timestamp">Actualizado: {{ formattedTime() }}</div>
    </div>
    }
  `,
  styles: [
    `
      .now-panel {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .main-temp-section {
        text-align: center;
        padding: 1.5rem 0;
        border-bottom: 2px solid var(--neutral-100);
      }

      .temp-display {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }

      .temp-value {
        font-size: 5rem;
        font-weight: 800;
        line-height: 1;
        color: var(--primary-600);
      }

      .temp-unit {
        font-size: 2rem;
        font-weight: 600;
        color: var(--neutral-500);
        margin-top: 0.5rem;
      }

      .condition {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
      }

      .condition-icon {
        font-size: 2rem;
      }

      .condition-label {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--neutral-700);
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 1rem;
      }

      .metric-card {
        background: var(--neutral-50);
        border-radius: 12px;
        padding: 1.25rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .metric-card.highlight {
        background: linear-gradient(
          135deg,
          var(--primary-50) 0%,
          var(--primary-100) 100%
        );
        border: 2px solid var(--primary-200);
      }

      .metric-card.alert {
        background: linear-gradient(
          135deg,
          var(--warning-50) 0%,
          var(--warning-100) 100%
        );
        border: 2px solid var(--warning-300);
      }

      .metric-icon {
        font-size: 2rem;
        flex-shrink: 0;
      }

      .metric-content {
        flex: 1;
        min-width: 0;
      }

      .metric-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--neutral-600);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
      }

      .metric-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .metric-detail {
        font-size: 0.75rem;
        color: var(--neutral-600);
        margin-top: 0.25rem;
      }

      .confidence-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
        background: var(--neutral-50);
        border-radius: 12px;
      }

      .confidence-bar {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .confidence-label {
        display: flex;
        justify-content: space-between;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-700);
      }

      .confidence-value {
        color: var(--primary-600);
      }

      .confidence-progress {
        height: 8px;
        background: var(--neutral-200);
        border-radius: 4px;
        overflow: hidden;
      }

      .confidence-fill {
        height: 100%;
        transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        border-radius: 4px;
      }

      .confidence-fill.high {
        background: var(--success-500);
      }

      .confidence-fill.medium {
        background: var(--warning-500);
      }

      .confidence-fill.low {
        background: var(--error-500);
      }

      .sources {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        font-size: 0.875rem;
      }

      .sources-label {
        color: var(--neutral-600);
        font-weight: 600;
      }

      .source-badge {
        padding: 0.25rem 0.625rem;
        background: var(--neutral-200);
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--neutral-700);
      }

      .timestamp {
        text-align: center;
        font-size: 0.875rem;
        color: var(--neutral-500);
        padding-top: 1rem;
        border-top: 1px solid var(--neutral-200);
      }

      @media (max-width: 768px) {
        .now-panel {
          padding: 1.5rem;
          gap: 1.5rem;
        }

        .temp-value {
          font-size: 4rem;
        }

        .temp-unit {
          font-size: 1.5rem;
        }

        .metrics-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }
    `,
  ],
})
export class TiempoNowPanelComponent {
  data = input.required<MeteoNow | null>();

  conditionIcon = computed(() => {
    const condition = this.data()?.condition;
    const icons: Record<string, string> = {
      snow: "❄️",
      rain: "🌧️",
      mix: "🌨️",
      clear: "☀️",
      cloudy: "☁️",
      fog: "🌫️",
      storm: "⛈️",
    };
    return icons[condition || "clear"] || "☁️";
  });

  conditionLabel = computed(() => {
    const condition = this.data()?.condition;
    const labels: Record<string, string> = {
      snow: "Nevando",
      rain: "Lloviendo",
      mix: "Nieve y lluvia",
      clear: "Despejado",
      cloudy: "Nublado",
      fog: "Niebla",
      storm: "Tormenta",
    };
    return labels[condition || "clear"] || "Variable";
  });

  windAlert = computed(() => {
    const wind = this.data()?.windKmh || 0;
    return wind > 50;
  });

  visibilityAlert = computed(() => {
    const visibility = this.data()?.visibilityM;
    return visibility !== null && visibility !== undefined && visibility < 2000;
  });

  visibilityKm = computed(() => {
    const visibility = this.data()?.visibilityM;
    if (!visibility) return "-";
    return (visibility / 1000).toFixed(1);
  });

  confidencePercent = computed(() => {
    const confidence = this.data()?.confidence || 0;
    return Math.round(confidence * 100);
  });

  formattedTime = computed(() => {
    const observedAt = this.data()?.observedAt;
    if (!observedAt) return "-";

    const date = new Date(observedAt);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  });
}
