import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-tiempo-legend",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="legend-container">
      <h3 class="legend-title">Leyenda</h3>

      <div class="legend-sections">
        <!-- Condiciones -->
        <div class="legend-section">
          <h4 class="section-title">Condiciones</h4>
          <div class="legend-items">
            <div class="legend-item">
              <span class="icon">❄️</span>
              <span class="label">Nevando</span>
            </div>
            <div class="legend-item">
              <span class="icon">🌧️</span>
              <span class="label">Lluvia</span>
            </div>
            <div class="legend-item">
              <span class="icon">☁️</span>
              <span class="label">Nublado</span>
            </div>
            <div class="legend-item">
              <span class="icon">☀️</span>
              <span class="label">Despejado</span>
            </div>
          </div>
        </div>

        <!-- Niveles de confianza -->
        <div class="legend-section">
          <h4 class="section-title">Confianza</h4>
          <div class="legend-items">
            <div class="legend-item">
              <span class="confidence-badge high">Alta (>80%)</span>
            </div>
            <div class="legend-item">
              <span class="confidence-badge medium">Media (60-80%)</span>
            </div>
            <div class="legend-item">
              <span class="confidence-badge low">Baja (<60%)</span>
            </div>
          </div>
        </div>

        <!-- Alertas de viento -->
        <div class="legend-section">
          <h4 class="section-title">Viento</h4>
          <div class="legend-items">
            <div class="legend-item">
              <span class="wind-indicator safe">💨 <30 km/h</span>
              <span class="label">Seguro</span>
            </div>
            <div class="legend-item">
              <span class="wind-indicator moderate">💨 30-50 km/h</span>
              <span class="label">Moderado</span>
            </div>
            <div class="legend-item">
              <span class="wind-indicator strong">💨 >50 km/h</span>
              <span class="label">Fuerte</span>
            </div>
          </div>
        </div>

        <!-- Visibilidad -->
        <div class="legend-section">
          <h4 class="section-title">Visibilidad</h4>
          <div class="legend-items">
            <div class="legend-item">
              <span class="visibility-bar good"></span>
              <span class="label">Buena (>2km)</span>
            </div>
            <div class="legend-item">
              <span class="visibility-bar moderate"></span>
              <span class="label">Moderada (1-2km)</span>
            </div>
            <div class="legend-item">
              <span class="visibility-bar poor"></span>
              <span class="label">Reducida (<1km)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .legend-container {
        background: var(--neutral-50);
        border-radius: 12px;
        padding: 1.5rem;
        border: 1px solid var(--neutral-200);
      }

      .legend-title {
        margin: 0 0 1.5rem 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .legend-sections {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
      }

      .legend-section {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .section-title {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-700);
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .legend-items {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
      }

      .icon {
        font-size: 1.125rem;
      }

      .label {
        color: var(--neutral-600);
      }

      .confidence-badge {
        padding: 0.25rem 0.75rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
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

      .wind-indicator {
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .wind-indicator.safe {
        background: var(--success-100);
        color: var(--success-700);
      }

      .wind-indicator.moderate {
        background: var(--warning-100);
        color: var(--warning-700);
      }

      .wind-indicator.strong {
        background: var(--error-100);
        color: var(--error-700);
      }

      .visibility-bar {
        width: 40px;
        height: 8px;
        border-radius: 4px;
      }

      .visibility-bar.good {
        background: var(--success-500);
      }

      .visibility-bar.moderate {
        background: var(--warning-500);
      }

      .visibility-bar.poor {
        background: var(--error-500);
      }

      @media (max-width: 768px) {
        .legend-sections {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TiempoLegendComponent {}
