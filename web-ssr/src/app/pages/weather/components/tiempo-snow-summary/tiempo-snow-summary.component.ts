import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WeatherSummary } from "../../models/meteo.models";

@Component({
  selector: "app-tiempo-snow-summary",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="snow-summary">
      <h2 class="summary-title">Resumen de Nieve</h2>

      <div class="summary-cards">
        @for (summary of summaries(); track summary.period) {
        <div
          class="summary-card"
          [class.highlight]="summary.period === 'today'"
        >
          <div class="card-header">
            <span class="period-icon">{{ getPeriodIcon(summary.period) }}</span>
            <span class="period-label">{{ summary.label }}</span>
          </div>

          <div class="snow-amount">
            <span class="amount-value">{{ summary.snowAccuCm }}</span>
            <span class="amount-unit">cm</span>
          </div>

          <div class="card-metrics">
            <div class="metric-row">
              <span class="metric-icon">🌡️</span>
              <span class="metric-text"
                >{{ summary.tempMinC }}° / {{ summary.tempMaxC }}°</span
              >
            </div>
            <div class="metric-row">
              <span class="metric-icon">💨</span>
              <span class="metric-text">{{ summary.windMaxKmh }} km/h</span>
            </div>
            <div class="metric-row">
              <span class="metric-icon">{{
                getConditionIcon(summary.condition)
              }}</span>
              <span class="metric-text">{{
                getConditionLabel(summary.condition)
              }}</span>
            </div>
          </div>

          <div
            class="confidence-badge"
            [class]="getConfidenceClass(summary.confidence)"
          >
            {{ Math.round(summary.confidence * 100) }}% confianza
          </div>
        </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .snow-summary {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }

      .summary-title {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }

      .summary-card {
        background: var(--neutral-50);
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 2px solid transparent;
      }

      .summary-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .summary-card.highlight {
        background: linear-gradient(
          135deg,
          var(--primary-50) 0%,
          var(--primary-100) 100%
        );
        border-color: var(--primary-300);
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .period-icon {
        font-size: 1.5rem;
      }

      .period-label {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .snow-amount {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        padding: 1rem 0;
        border-top: 1px solid var(--neutral-200);
        border-bottom: 1px solid var(--neutral-200);
      }

      .amount-value {
        font-size: 3rem;
        font-weight: 800;
        color: var(--primary-600);
      }

      .amount-unit {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--neutral-500);
      }

      .card-metrics {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .metric-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--neutral-700);
      }

      .metric-icon {
        font-size: 1.125rem;
      }

      .confidence-badge {
        padding: 0.5rem;
        border-radius: 6px;
        text-align: center;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .confidence-badge.high {
        background: var(--success-100);
        color: var(--success-700);
      }

      .confidence-badge.medium {
        background: var(--warning-100);
        color: var(--warning-700);
      }

      .confidence-badge.low {
        background: var(--error-100);
        color: var(--error-700);
      }

      @media (max-width: 768px) {
        .snow-summary {
          padding: 1.5rem;
        }

        .summary-cards {
          grid-template-columns: 1fr;
        }

        .amount-value {
          font-size: 2.5rem;
        }
      }
    `,
  ],
})
export class TiempoSnowSummaryComponent {
  summaries = input.required<WeatherSummary[]>();

  Math = Math;

  getPeriodIcon(period: string): string {
    const icons: Record<string, string> = {
      today: "📅",
      tomorrow: "🗓️",
      weekend: "🎿",
    };
    return icons[period] || "📆";
  }

  getConditionIcon(condition: string): string {
    const icons: Record<string, string> = {
      snow: "❄️",
      rain: "🌧️",
      mix: "🌨️",
      clear: "☀️",
      cloudy: "☁️",
    };
    return icons[condition] || "☁️";
  }

  getConditionLabel(condition: string): string {
    const labels: Record<string, string> = {
      snow: "Nieve",
      rain: "Lluvia",
      mix: "Mixto",
      clear: "Despejado",
      cloudy: "Nublado",
    };
    return labels[condition] || "Variable";
  }

  getConfidenceClass(confidence: number): string {
    if (confidence > 0.8) return "high";
    if (confidence >= 0.6) return "medium";
    return "low";
  }
}
