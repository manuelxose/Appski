import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WeekForecastDay } from "../../models/meteo.models";

@Component({
  selector: "app-week-forecast-table",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="week-forecast">
      <div class="header-container">
        <h2 class="section-title">
          <span class="title-icon">📅</span>
          {{ stationName() }}, Previsión a 8 días
        </h2>
        <div class="days-badge">{{ days().length }} días</div>
      </div>

      <div class="table-container">
        <table class="forecast-table">
          <thead>
            <tr>
              <th class="header-cell row-label">Fecha</th>
              @for (day of days(); track day.date) {
              <th class="header-cell day-cell">
                {{ formatDayHeader(day.date) }}
              </th>
              }
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
              @for (day of days(); track day.date) {
              <td
                class="data-cell temp-cell"
                [class.temp-hot]="day.tempTopC > 5"
                [class.temp-cold]="day.tempTopC <= 0"
              >
                <span class="value">{{ day.tempTopC }}°</span>
              </td>
              }
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
              @for (day of days(); track day.date) {
              <td
                class="data-cell temp-cell-secondary"
                [class.temp-hot]="day.tempBottomC > 5"
                [class.temp-cold]="day.tempBottomC <= 0"
              >
                <span class="value-sm">{{ day.tempBottomC }}°</span>
              </td>
              }
            </tr>

            <!-- ISO 0º -->
            <tr class="iso-row">
              <td class="row-label">
                <span class="row-icon">🌡️</span>
                <div class="label-content">
                  <strong>ISO 0º metros</strong>
                </div>
              </td>
              @for (day of days(); track day.date) {
              <td class="data-cell iso-cell">
                <span class="value-sm">{{ day.iso0M }}</span>
              </td>
              }
            </tr>

            <!-- Cota Nieve -->
            <tr class="snowline-row">
              <td class="row-label">
                <span class="row-icon">⛄</span>
                <div class="label-content">
                  <strong>Cota Nieve metros</strong>
                </div>
              </td>
              @for (day of days(); track day.date) {
              <td class="data-cell snowline-cell">
                <span class="value-sm">{{
                  day.snowLineM !== null ? day.snowLineM : "-"
                }}</span>
              </td>
              }
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
              @for (day of days(); track day.date) {
              <td
                class="data-cell wind-cell"
                [class.wind-strong]="day.windTopKmh > 50"
                [class.wind-moderate]="
                  day.windTopKmh > 30 && day.windTopKmh <= 50
                "
              >
                <span class="value">{{ day.windTopKmh }}</span>
              </td>
              }
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
              @for (day of days(); track day.date) {
              <td
                class="data-cell wind-cell-secondary"
                [class.wind-strong]="day.windBottomKmh > 50"
                [class.wind-moderate]="
                  day.windBottomKmh > 30 && day.windBottomKmh <= 50
                "
              >
                <span class="value-sm">{{ day.windBottomKmh }}</span>
              </td>
              }
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
              @for (day of days(); track day.date) {
              <td
                class="data-cell snow-cell"
                [class.snow-heavy]="day.snowTopCm >= 10"
                [class.snow-moderate]="day.snowTopCm >= 5 && day.snowTopCm < 10"
                [class.snow-light]="day.snowTopCm > 0 && day.snowTopCm < 5"
              >
                <span class="value">{{
                  day.snowTopCm > 0 ? day.snowTopCm : "-"
                }}</span>
              </td>
              }
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
              @for (day of days(); track day.date) {
              <td
                class="data-cell snow-cell-secondary"
                [class.snow-heavy]="day.snowBottomCm >= 10"
                [class.snow-moderate]="
                  day.snowBottomCm >= 5 && day.snowBottomCm < 10
                "
                [class.snow-light]="
                  day.snowBottomCm > 0 && day.snowBottomCm < 5
                "
              >
                <span class="value-sm">{{
                  day.snowBottomCm > 0 ? day.snowBottomCm : "-"
                }}</span>
              </td>
              }
            </tr>

            <!-- Precipitación -->
            <tr class="precip-row">
              <td class="row-label">
                <span class="row-icon">💧</span>
                <div class="label-content">
                  <strong>Precipitación mm</strong>
                </div>
              </td>
              @for (day of days(); track day.date) {
              <td
                class="data-cell precip-cell"
                [class.precip-heavy]="day.precipMm >= 10"
                [class.precip-moderate]="day.precipMm >= 5 && day.precipMm < 10"
              >
                <span class="value-sm">{{
                  day.precipMm > 0 ? day.precipMm : "-"
                }}</span>
              </td>
              }
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .week-forecast {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        margin-bottom: 2rem;
      }

      .section-title {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .table-container {
        overflow-x: auto;
        border-radius: 12px;
        border: 1px solid var(--neutral-200);
      }

      /* Header Container */
      .header-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
      }

      .title-icon {
        font-size: 2rem;
        margin-right: 0.5rem;
        display: inline-block;
        vertical-align: middle;
      }

      .days-badge {
        background: linear-gradient(
          135deg,
          var(--primary-500),
          var(--primary-600)
        );
        color: white;
        padding: 0.375rem 0.75rem;
        border-radius: 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      /* Table Base */
      .forecast-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
        min-width: 700px;
      }

      /* Header Cells */
      .header-cell {
        background: var(--neutral-100);
        padding: 0.75rem 0.5rem;
        text-align: center;
        font-weight: 600;
        color: var(--neutral-700);
        border: 1px solid var(--neutral-200);
        transition: background 0.2s ease;
      }

      .day-cell {
        background: var(--primary-50);
        color: var(--primary-700);
        font-weight: 700;
        min-width: 80px;
      }

      /* Row Labels with Icons */
      .row-label {
        background: var(--neutral-50);
        padding: 0.75rem 1rem;
        text-align: left;
        font-weight: 600;
        color: var(--neutral-700);
        border: 1px solid var(--neutral-200);
        white-space: nowrap;
        min-width: 170px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .row-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
        display: inline-block;
      }

      .label-content {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .sublabel {
        font-size: 0.75rem;
        font-weight: 400;
        color: var(--neutral-500);
        line-height: 1.2;
      }

      .secondary-label {
        padding-left: 3rem;
        font-weight: 400;
        font-size: 0.8125rem;
      }

      /* Data Cells Base */
      .data-cell {
        padding: 0.75rem 0.5rem;
        text-align: center;
        border: 1px solid var(--neutral-200);
        color: var(--neutral-800);
        transition: all 0.2s ease;
        background: white;
      }

      .value {
        font-weight: 600;
        font-size: 1rem;
      }

      .value-sm {
        font-weight: 500;
        font-size: 0.875rem;
      }

      /* Temperature Cells */
      .temp-cell {
        font-weight: 700;
        position: relative;
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
          rgba(96, 165, 250, 0.1)
        );
        color: #2563eb;
        font-weight: 700;
      }

      /* Wind Cells */
      .wind-cell {
        font-weight: 600;
      }

      .wind-cell.wind-moderate {
        background: linear-gradient(
          135deg,
          rgba(251, 191, 36, 0.15),
          rgba(250, 204, 21, 0.1)
        );
        color: #ca8a04;
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
          box-shadow: 0 0 0 rgba(220, 38, 38, 0);
        }
        50% {
          transform: scale(1.05);
          box-shadow: 0 0 8px rgba(220, 38, 38, 0.3);
        }
      }

      /* Snow Cells */
      .snow-cell,
      .snow-cell-secondary {
        font-weight: 600;
      }

      .snow-cell.snow-light,
      .snow-cell-secondary.snow-light {
        background: linear-gradient(
          135deg,
          rgba(168, 85, 247, 0.1),
          rgba(192, 132, 252, 0.08)
        );
        color: #9333ea;
      }

      .snow-cell.snow-moderate,
      .snow-cell-secondary.snow-moderate {
        background: linear-gradient(
          135deg,
          rgba(168, 85, 247, 0.2),
          rgba(139, 92, 246, 0.15)
        );
        color: #7c3aed;
        font-weight: 700;
      }

      .snow-cell.snow-heavy,
      .snow-cell-secondary.snow-heavy {
        background: linear-gradient(
          135deg,
          rgba(168, 85, 247, 0.3),
          rgba(109, 40, 217, 0.2)
        );
        color: #6b21a8;
        font-weight: 800;
        box-shadow: inset 0 2px 4px rgba(107, 33, 168, 0.1);
      }

      /* ISO Cell */
      .iso-cell {
        color: var(--neutral-700);
        font-weight: 500;
      }

      /* Snowline Cell */
      .snowline-cell {
        color: var(--primary-700);
        font-weight: 500;
      }

      /* Precipitation Cells */
      .precip-cell {
        font-weight: 600;
      }

      .precip-cell.precip-moderate {
        background: linear-gradient(
          135deg,
          rgba(6, 182, 212, 0.15),
          rgba(34, 211, 238, 0.1)
        );
        color: #0891b2;
        font-weight: 700;
      }

      .precip-cell.precip-heavy {
        background: linear-gradient(
          135deg,
          rgba(6, 182, 212, 0.25),
          rgba(8, 145, 178, 0.18)
        );
        color: #0e7490;
        font-weight: 800;
      }

      /* Row Hover Effects */
      tbody tr:hover .data-cell {
        background: var(--primary-25);
        transform: translateY(-1px);
      }

      tbody tr:hover .row-label {
        background: var(--primary-50);
      }

      /* Row Groups */
      .temp-row,
      .wind-row,
      .snow-row {
        border-top: 2px solid var(--neutral-300);
      }

      .temp-row-secondary,
      .wind-row-secondary,
      .snow-row-secondary {
        border-bottom: 1px solid var(--neutral-200);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .week-forecast {
          padding: 1rem;
        }

        .header-container {
          flex-direction: column;
          align-items: flex-start;
        }

        .section-title {
          font-size: 1.25rem;
        }

        .title-icon {
          font-size: 1.5rem;
        }

        .days-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
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

        .secondary-label {
          padding-left: 2rem;
        }

        .day-cell {
          min-width: 60px;
          padding: 0.5rem 0.25rem;
        }

        .data-cell {
          padding: 0.5rem 0.25rem;
        }

        .value {
          font-size: 0.875rem;
        }

        .value-sm {
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class WeekForecastTableComponent {
  days = input.required<WeekForecastDay[]>();
  stationName = input<string>("Estación");
  topAltitude = input<number | null>(null);
  bottomAltitude = input<number | null>(null);

  formatDayHeader(dateStr: string): string {
    const date = new Date(dateStr);
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const dayNum = date.getDate();
    const dayName = dayNames[date.getDay()];
    return `${dayName} ${dayNum}`;
  }
}
