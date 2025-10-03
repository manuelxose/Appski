import { Component, input, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { DetailedForecastDay } from "../../models/meteo.models";

@Component({
  selector: "app-detailed-forecast-table",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="detailed-forecast">
      <div class="header-container">
        <h2 class="section-title">
          <span class="title-icon">📊</span>
          Previsión meteorológica detallada
        </h2>
        <div class="blocks-badge">{{ totalBlocks() }} períodos</div>
      </div>

      <div class="table-container">
        <table class="forecast-table">
          <thead>
            <tr>
              <th class="header-cell row-label">Fecha / Hora</th>
              @for (day of days(); track day.date) {
              <th class="header-cell day-header" [attr.colspan]="4">
                {{ formatDayHeader(day.date) }}
              </th>
              }
            </tr>
            <tr>
              <th class="header-cell row-label"></th>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <th class="header-cell time-cell">{{ block.timeRange }}</th>
              } }
            </tr>
          </thead>
          <tbody>
            <!-- Temperatura Cota Alta -->
            <tr class="temp-row">
              <td class="row-label">
                <span class="row-icon">🌡️</span>
                <div class="label-content">
                  <strong>Temperatura ºC</strong>
                  @if (topAltitude()) {
                  <span class="sublabel">{{ topAltitude() }}m Cota Alta</span>
                  } @else {
                  <span class="sublabel">Cota Alta</span>
                  }
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td
                class="data-cell temp-cell"
                [class.temp-hot]="block.tempTopC > 5"
                [class.temp-cold]="block.tempTopC <= 0"
              >
                <span class="value">{{ block.tempTopC }}°</span>
              </td>
              } }
            </tr>

            <!-- Temperatura Cota Baja -->
            <tr class="temp-row-secondary">
              <td class="row-label secondary-label">
                <div class="label-content">
                  @if (bottomAltitude()) {
                  <span class="sublabel"
                    >{{ bottomAltitude() }}m Cota Baja</span
                  >
                  } @else {
                  <span class="sublabel">Cota Baja</span>
                  }
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td
                class="data-cell temp-cell-secondary"
                [class.temp-hot]="block.tempBottomC > 5"
                [class.temp-cold]="block.tempBottomC <= 0"
              >
                <span class="value-sm">{{ block.tempBottomC }}°</span>
              </td>
              } }
            </tr>

            <!-- ISO 0º -->
            <tr class="iso-row">
              <td class="row-label">
                <span class="row-icon">🌡️</span>
                <div class="label-content">
                  <strong>ISO 0º metros</strong>
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td class="data-cell iso-cell">
                <span class="value-sm">{{ block.iso0M }}</span>
              </td>
              } }
            </tr>

            <!-- Cota Nieve -->
            <tr class="snowline-row">
              <td class="row-label">
                <span class="row-icon">⛄</span>
                <div class="label-content">
                  <strong>Cota Nieve metros</strong>
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td class="data-cell snowline-cell">
                <span class="value-sm">{{
                  block.snowLineM !== null ? block.snowLineM : "-"
                }}</span>
              </td>
              } }
            </tr>

            <!-- Visibilidad -->
            <tr class="visibility-row">
              <td class="row-label">
                <span class="row-icon">👁️</span>
                <div class="label-content">
                  <strong>Visibilidad</strong>
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td
                class="data-cell visibility-cell"
                [class.visibility-poor]="block.visibilityMin < 2"
              >
                <span class="value-sm">{{
                  getVisibilityLabel(block.visibilityMin)
                }}</span>
              </td>
              } }
            </tr>

            <!-- Viento Cota Alta -->
            <tr class="wind-row">
              <td class="row-label">
                <span class="row-icon">🌬️</span>
                <div class="label-content">
                  <strong>Viento km/h</strong>
                  @if (topAltitude()) {
                  <span class="sublabel">{{ topAltitude() }}m Cota Alta</span>
                  } @else {
                  <span class="sublabel">Cota Alta</span>
                  }
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td
                class="data-cell wind-cell"
                [class.wind-strong]="block.windTopKmh > 50"
                [class.wind-moderate]="
                  block.windTopKmh > 30 && block.windTopKmh <= 50
                "
              >
                <span class="value">{{ block.windTopKmh }}</span>
              </td>
              } }
            </tr>

            <!-- Viento Cota Baja -->
            <tr class="wind-row-secondary">
              <td class="row-label secondary-label">
                <div class="label-content">
                  @if (bottomAltitude()) {
                  <span class="sublabel"
                    >{{ bottomAltitude() }}m Cota Baja</span
                  >
                  } @else {
                  <span class="sublabel">Cota Baja</span>
                  }
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td
                class="data-cell wind-cell-secondary"
                [class.wind-strong]="block.windBottomKmh > 50"
                [class.wind-moderate]="
                  block.windBottomKmh > 30 && block.windBottomKmh <= 50
                "
              >
                <span class="value-sm">{{ block.windBottomKmh }}</span>
              </td>
              } }
            </tr>

            <!-- Nieve Cota Alta -->
            <tr class="snow-row">
              <td class="row-label">
                <span class="row-icon">❄️</span>
                <div class="label-content">
                  <strong>Nieve cm</strong>
                  @if (topAltitude()) {
                  <span class="sublabel">{{ topAltitude() }}m Cota Alta</span>
                  } @else {
                  <span class="sublabel">Cota Alta</span>
                  }
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td
                class="data-cell snow-cell"
                [class.snow-heavy]="block.snowTopCm >= 10"
                [class.snow-moderate]="
                  block.snowTopCm >= 5 && block.snowTopCm < 10
                "
                [class.snow-light]="block.snowTopCm > 0 && block.snowTopCm < 5"
              >
                <span class="value">{{
                  block.snowTopCm > 0 ? block.snowTopCm : "-"
                }}</span>
              </td>
              } }
            </tr>

            <!-- Nieve Cota Baja -->
            <tr class="snow-row-secondary">
              <td class="row-label secondary-label">
                <div class="label-content">
                  @if (bottomAltitude()) {
                  <span class="sublabel"
                    >{{ bottomAltitude() }}m Cota Baja</span
                  >
                  } @else {
                  <span class="sublabel">Cota Baja</span>
                  }
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td
                class="data-cell snow-cell-secondary"
                [class.snow-heavy]="block.snowBottomCm >= 10"
                [class.snow-moderate]="
                  block.snowBottomCm >= 5 && block.snowBottomCm < 10
                "
                [class.snow-light]="
                  block.snowBottomCm > 0 && block.snowBottomCm < 5
                "
              >
                <span class="value-sm">{{
                  block.snowBottomCm > 0 ? block.snowBottomCm : "-"
                }}</span>
              </td>
              } }
            </tr>

            <!-- Precipitación -->
            <tr class="precip-row">
              <td class="row-label">
                <span class="row-icon">💧</span>
                <div class="label-content">
                  <strong>Precipitación mm</strong>
                </div>
              </td>
              @for (day of days(); track day.date) { @for (block of day.blocks;
              track block.timeRange) {
              <td
                class="data-cell precip-cell"
                [class.precip-heavy]="block.precipMm >= 10"
                [class.precip-moderate]="
                  block.precipMm >= 5 && block.precipMm < 10
                "
              >
                <span class="value-sm">{{
                  block.precipMm > 0 ? block.precipMm : "-"
                }}</span>
              </td>
              } }
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .detailed-forecast {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        margin-bottom: 2rem;
      }

      .header-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .section-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .title-icon {
        font-size: 1.75rem;
      }

      .blocks-badge {
        background: linear-gradient(
          135deg,
          var(--primary-500),
          var(--primary-600)
        );
        color: white;
        padding: 0.375rem 0.875rem;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
      }

      .table-container {
        overflow-x: auto;
        border-radius: 12px;
        border: 1px solid var(--neutral-200);
        background: white;
      }

      .forecast-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        min-width: 800px;
      }

      .header-cell {
        background: var(--neutral-100);
        padding: 0.75rem 0.5rem;
        text-align: center;
        font-weight: 600;
        color: var(--neutral-700);
        border: 1px solid var(--neutral-200);
      }

      .day-header {
        background: linear-gradient(
          135deg,
          var(--primary-50),
          var(--primary-100)
        );
        color: var(--primary-700);
        font-weight: 700;
        font-size: 0.9rem;
      }

      .time-cell {
        font-size: 0.75rem;
        background: var(--neutral-50);
      }

      .row-label {
        background: var(--neutral-50);
        padding: 0.75rem 1rem;
        text-align: left;
        font-weight: 600;
        color: var(--neutral-700);
        border: 1px solid var(--neutral-200);
        white-space: nowrap;
        min-width: 160px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .row-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .label-content {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .secondary-label {
        background: var(--neutral-25);
        padding-left: 3rem;
      }

      .sublabel {
        font-size: 0.7rem;
        font-weight: 500;
        color: var(--neutral-500);
      }

      .data-cell {
        padding: 0.625rem 0.5rem;
        text-align: center;
        border: 1px solid var(--neutral-200);
        color: var(--neutral-800);
        transition: all 0.2s ease;
      }

      .value {
        font-weight: 600;
        font-size: 0.875rem;
      }

      .value-sm {
        font-weight: 500;
        font-size: 0.75rem;
        color: var(--neutral-600);
      }

      /* Temperatura */
      .temp-row {
        background: linear-gradient(
          90deg,
          rgba(59, 130, 246, 0.05),
          rgba(255, 255, 255, 0)
        );
      }

      .temp-cell {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.9),
          rgba(59, 130, 246, 0.05)
        );
      }

      .temp-cell.temp-hot {
        background: linear-gradient(
          135deg,
          rgba(239, 68, 68, 0.15),
          rgba(249, 115, 22, 0.1)
        );
        color: #dc2626;
        font-weight: 700;
      }

      .temp-cell.temp-cold {
        background: linear-gradient(
          135deg,
          rgba(59, 130, 246, 0.15),
          rgba(14, 165, 233, 0.1)
        );
        color: #0284c7;
        font-weight: 700;
      }

      .temp-cell-secondary {
        background: rgba(250, 250, 250, 0.5);
      }

      .temp-cell-secondary.temp-hot {
        background: rgba(239, 68, 68, 0.08);
        color: #dc2626;
      }

      .temp-cell-secondary.temp-cold {
        background: rgba(59, 130, 246, 0.08);
        color: #0284c7;
      }

      /* Viento */
      .wind-row {
        background: linear-gradient(
          90deg,
          rgba(16, 185, 129, 0.05),
          rgba(255, 255, 255, 0)
        );
      }

      .wind-cell {
        background: rgba(255, 255, 255, 0.9);
      }

      .wind-cell.wind-moderate {
        background: linear-gradient(
          135deg,
          rgba(251, 191, 36, 0.15),
          rgba(245, 158, 11, 0.1)
        );
        color: #d97706;
        font-weight: 700;
      }

      .wind-cell.wind-strong {
        background: linear-gradient(
          135deg,
          rgba(239, 68, 68, 0.2),
          rgba(220, 38, 38, 0.15)
        );
        color: #dc2626;
        font-weight: 700;
        animation: pulse-wind 2s ease-in-out infinite;
      }

      @keyframes pulse-wind {
        0%,
        100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }

      .wind-cell-secondary {
        background: rgba(250, 250, 250, 0.5);
      }

      .wind-cell-secondary.wind-moderate {
        background: rgba(251, 191, 36, 0.08);
        color: #d97706;
      }

      .wind-cell-secondary.wind-strong {
        background: rgba(239, 68, 68, 0.1);
        color: #dc2626;
        font-weight: 600;
      }

      /* Nieve */
      .snow-row {
        background: linear-gradient(
          90deg,
          rgba(139, 92, 246, 0.05),
          rgba(255, 255, 255, 0)
        );
      }

      .snow-cell {
        background: rgba(255, 255, 255, 0.9);
      }

      .snow-cell.snow-light {
        background: linear-gradient(
          135deg,
          rgba(196, 181, 253, 0.2),
          rgba(167, 139, 250, 0.1)
        );
        color: #7c3aed;
        font-weight: 600;
      }

      .snow-cell.snow-moderate {
        background: linear-gradient(
          135deg,
          rgba(167, 139, 250, 0.25),
          rgba(139, 92, 246, 0.15)
        );
        color: #6d28d9;
        font-weight: 700;
      }

      .snow-cell.snow-heavy {
        background: linear-gradient(
          135deg,
          rgba(139, 92, 246, 0.3),
          rgba(124, 58, 237, 0.2)
        );
        color: #5b21b6;
        font-weight: 700;
        box-shadow: inset 0 0 8px rgba(139, 92, 246, 0.3);
      }

      .snow-cell-secondary {
        background: rgba(250, 250, 250, 0.5);
      }

      .snow-cell-secondary.snow-light {
        background: rgba(196, 181, 253, 0.1);
        color: #7c3aed;
      }

      .snow-cell-secondary.snow-moderate {
        background: rgba(167, 139, 250, 0.12);
        color: #6d28d9;
        font-weight: 600;
      }

      .snow-cell-secondary.snow-heavy {
        background: rgba(139, 92, 246, 0.15);
        color: #5b21b6;
        font-weight: 600;
      }

      /* ISO y Cota Nieve */
      .iso-row,
      .snowline-row {
        background: rgba(245, 245, 245, 0.5);
      }

      .iso-cell,
      .snowline-cell {
        background: rgba(255, 255, 255, 0.7);
        color: var(--neutral-600);
      }

      /* Visibilidad */
      .visibility-row {
        background: rgba(240, 240, 240, 0.3);
      }

      .visibility-cell {
        background: rgba(255, 255, 255, 0.7);
        color: var(--neutral-600);
      }

      .visibility-cell.visibility-poor {
        background: rgba(251, 191, 36, 0.1);
        color: #d97706;
        font-weight: 600;
      }

      /* Precipitación */
      .precip-row {
        background: rgba(6, 182, 212, 0.03);
      }

      .precip-cell {
        background: rgba(255, 255, 255, 0.7);
        color: var(--neutral-600);
      }

      .precip-cell.precip-moderate {
        background: linear-gradient(
          135deg,
          rgba(6, 182, 212, 0.15),
          rgba(14, 165, 233, 0.1)
        );
        color: #0891b2;
        font-weight: 600;
      }

      .precip-cell.precip-heavy {
        background: linear-gradient(
          135deg,
          rgba(14, 165, 233, 0.2),
          rgba(2, 132, 199, 0.15)
        );
        color: #0369a1;
        font-weight: 700;
      }

      /* Hover effects */
      tbody tr:hover .data-cell {
        background: var(--primary-25);
        transform: translateY(-1px);
      }

      @media (max-width: 768px) {
        .detailed-forecast {
          padding: 1rem;
        }

        .header-container {
          gap: 0.5rem;
        }

        .section-title {
          font-size: 1.125rem;
        }

        .title-icon {
          font-size: 1.25rem;
        }

        .blocks-badge {
          font-size: 0.7rem;
          padding: 0.25rem 0.625rem;
        }

        .forecast-table {
          font-size: 0.75rem;
        }

        .row-label {
          min-width: 120px;
          padding: 0.5rem 0.75rem;
          gap: 0.5rem;
        }

        .row-icon {
          font-size: 1.25rem;
        }

        .data-cell {
          padding: 0.5rem 0.375rem;
        }

        .value {
          font-size: 0.75rem;
        }

        .value-sm {
          font-size: 0.7rem;
        }
      }
    `,
  ],
})
export class DetailedForecastTableComponent {
  days = input.required<DetailedForecastDay[]>();
  stationName = input<string>("Estación");
  topAltitude = input<number | null>(null);
  bottomAltitude = input<number | null>(null);

  totalBlocks = computed(() => {
    return this.days().length * 4;
  });

  formatDayHeader(dateStr: string): string {
    const date = new Date(dateStr);
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const dayNum = date.getDate();
    const dayName = dayNames[date.getDay()];
    return `${dayName} ${dayNum}`;
  }

  getVisibilityLabel(visMin: number): string {
    if (visMin === 0) return "Buena";
    if (visMin <= 2) return "Buena";
    if (visMin <= 5) return "Buena";
    return "Buena";
  }
}
