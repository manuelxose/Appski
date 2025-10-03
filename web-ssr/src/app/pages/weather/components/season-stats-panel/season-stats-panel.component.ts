import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SeasonStats } from "../../models/meteo.models";

@Component({
  selector: "app-season-stats-panel",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="season-stats">
      <div class="stats-header">
        <h2 class="section-title">
          Estadísticas Temporada {{ stats().season }}
        </h2>
        <p class="stats-disclaimer">
          Datos estadísticos calculados en base a las previsiones
          meteorológicas, no a mediciones reales de precipitación.
        </p>
      </div>

      <div class="stats-grid">
        <!-- Apertura y Cierre -->
        <div class="stat-card highlight">
          <span class="stat-icon">📅</span>
          <div class="stat-content">
            <span class="stat-label">Fecha de Apertura</span>
            <span class="stat-value">{{
              formatDate(stats().openingDate)
            }}</span>
          </div>
        </div>

        <div class="stat-card highlight">
          <span class="stat-icon">🏁</span>
          <div class="stat-content">
            <span class="stat-label">Fecha de Cierre</span>
            <span class="stat-value">{{
              formatDate(stats().closingDate)
            }}</span>
          </div>
        </div>

        <div class="stat-card highlight">
          <span class="stat-icon">⏱️</span>
          <div class="stat-content">
            <span class="stat-label">Duración de la temporada</span>
            <span class="stat-value">{{ stats().daysOpen }} días</span>
          </div>
        </div>

        <!-- Precipitación Total -->
        <div class="stat-card">
          <span class="stat-label">Precipitación total</span>
          <span class="stat-value">{{ stats().totalPrecipMm }} mm</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">Días con precipitación</span>
          <span class="stat-value">{{ stats().daysWithPrecip }} día(s)</span>
        </div>

        <!-- Nieve en Cima -->
        <div class="stat-card snow">
          <span class="stat-label">Nieve caída en la cima</span>
          <span class="stat-value">{{ stats().snowTopCm / 100 }} m</span>
        </div>

        <div class="stat-card snow">
          <span class="stat-label">Días con nevada en la cima</span>
          <span class="stat-value">{{ stats().daysSnowTop }} día(s)</span>
        </div>

        <div class="stat-card snow">
          <span class="stat-label">Nevada intensa en la cima (>=10cm)</span>
          <span class="stat-value">{{ stats().intenseDaysTop }} día(s)</span>
        </div>

        <!-- Nieve en Base -->
        <div class="stat-card snow">
          <span class="stat-label">Nieve caída en la base</span>
          <span class="stat-value">{{ stats().snowBaseCm / 100 }} m</span>
        </div>

        <div class="stat-card snow">
          <span class="stat-label">Días con nevada en la base</span>
          <span class="stat-value">{{ stats().daysSnowBase }} día(s)</span>
        </div>

        <div class="stat-card snow">
          <span class="stat-label">Nevada intensa en la base (>=10cm)</span>
          <span class="stat-value">{{ stats().intenseDaysBase }} día(s)</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .season-stats {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        margin-bottom: 2rem;
      }

      .stats-header {
        margin-bottom: 1.5rem;
      }

      .section-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .stats-disclaimer {
        margin: 0;
        font-size: 0.875rem;
        color: var(--neutral-600);
        font-style: italic;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }

      .stat-card {
        background: var(--neutral-50);
        padding: 1.5rem;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: all 0.3s ease;
      }

      .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .stat-card.highlight {
        background: linear-gradient(
          135deg,
          var(--primary-50) 0%,
          var(--primary-100) 100%
        );
        flex-direction: row;
        align-items: center;
        gap: 1rem;
      }

      .stat-card.snow {
        background: linear-gradient(
          135deg,
          #f0f9ff 0%,
          #e0f2fe 100%
        ); /* blue tint */
      }

      .stat-icon {
        font-size: 2rem;
      }

      .stat-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .stat-label {
        font-size: 0.875rem;
        color: var(--neutral-600);
        font-weight: 600;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .stat-card.highlight .stat-value {
        color: var(--primary-700);
      }

      @media (max-width: 768px) {
        .season-stats {
          padding: 1.5rem;
        }

        .stats-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .stat-card {
          padding: 1rem;
        }

        .stat-value {
          font-size: 1.25rem;
        }
      }
    `,
  ],
})
export class SeasonStatsPanelComponent {
  stats = input.required<SeasonStats>();

  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
}
