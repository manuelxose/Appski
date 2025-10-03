import { Component, input, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MeteoForecastPoint } from "../../models/meteo.models";

/**
 * Datos agregados por día completo
 */
interface DayForecast {
  date: Date;
  dayLabel: string; // "Hoy", "Mañana", "Lunes 2"
  tempMin: number;
  tempMax: number;
  snowAccum: number;
  windMax: number;
  condition: string;
  conditionIcon: string;
  confidence: number;
  hours: MeteoForecastPoint[]; // Datos horarios para tooltip
}

@Component({
  selector: "app-forecast-72h-table",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="forecast-table-wrapper">
      <div class="header-section">
        <h3 class="table-title">
          Previsión 72h @if (dayForecasts().length > 0) {
          <span class="days-count">({{ dayForecasts().length }} días)</span>
          }
        </h3>

        <!-- Leyenda de colores -->
        <div class="color-legend">
          <div class="legend-item" data-label="🌡️ +5°">
            <div class="legend-color temp-hot"></div>
            <span class="legend-label">Temp alta (+5°)</span>
          </div>
          <div class="legend-item" data-label="❄️ -5°">
            <div class="legend-color temp-cold"></div>
            <span class="legend-label">Temp baja (-5°)</span>
          </div>
          <div class="legend-item" data-label="❄️ +10cm">
            <div class="legend-color snow-heavy"></div>
            <span class="legend-label">Nieve intensa (+10cm)</span>
          </div>
          <div class="legend-item" data-label="💨 +50km/h">
            <div class="legend-color wind-strong"></div>
            <span class="legend-label">Viento fuerte (+50km/h)</span>
          </div>
        </div>
      </div>

      <div class="table-scroll">
        <table class="forecast-table">
          <thead>
            <tr>
              <th class="col-day">Día</th>
              <th class="col-condition">Condición</th>
              <th class="col-temp">Temperatura</th>
              <th class="col-snow">Nieve Acumulada</th>
              <th class="col-wind">Viento Máximo</th>
              <th class="col-confidence">Confianza</th>
            </tr>
          </thead>
          <tbody>
            @for (day of dayForecasts(); track day.date.getTime()) {
            <tr class="day-row" [class.today]="isToday(day.date)">
              <!-- Día -->
              <td class="col-day">
                <div class="day-cell">
                  <span class="day-label">{{ day.dayLabel }}</span>
                  <span class="day-date">{{ formatDate(day.date) }}</span>
                </div>
              </td>

              <!-- Condición con icono grande -->
              <td class="col-condition">
                <div class="condition-cell">
                  <span class="condition-icon-large">{{
                    day.conditionIcon
                  }}</span>
                  <span class="condition-text">{{ day.condition }}</span>
                </div>
              </td>

              <!-- Temperatura con barra visual -->
              <td class="col-temp">
                <div class="temp-visual-cell">
                  <div class="temp-bar-wrapper">
                    <div
                      class="temp-bar"
                      [style.background]="
                        getTempGradient(day.tempMin, day.tempMax)
                      "
                      [style.width.%]="
                        getTempBarWidth(day.tempMin, day.tempMax)
                      "
                    ></div>
                  </div>
                  <div class="temp-values">
                    <span class="temp-max" [class.hot]="day.tempMax > 5"
                      >{{ day.tempMax }}°</span
                    >
                    <span class="temp-separator">—</span>
                    <span class="temp-min" [class.cold]="day.tempMin < -5"
                      >{{ day.tempMin }}°</span
                    >
                  </div>
                </div>
              </td>

              <!-- Nieve con barra de intensidad -->
              <td class="col-snow">
                <div class="snow-visual-cell">
                  <div class="snow-bar-wrapper">
                    <div
                      class="snow-bar"
                      [style.width.%]="getSnowBarWidth(day.snowAccum)"
                      [class.light]="day.snowAccum < 5"
                      [class.moderate]="
                        day.snowAccum >= 5 && day.snowAccum < 10
                      "
                      [class.heavy]="day.snowAccum >= 10"
                    ></div>
                  </div>
                  <div class="snow-value-wrapper">
                    <span class="snow-icon-big">❄️</span>
                    <span
                      class="snow-value"
                      [class.has-snow]="day.snowAccum > 0"
                      [class.heavy-snow]="day.snowAccum >= 10"
                    >
                      {{ day.snowAccum }} cm
                    </span>
                  </div>
                </div>
              </td>

              <!-- Viento con medidor visual -->
              <td class="col-wind">
                <div class="wind-visual-cell">
                  <div class="wind-gauge-wrapper">
                    <div
                      class="wind-gauge"
                      [style.width.%]="getWindGaugeWidth(day.windMax)"
                      [class.calm]="day.windMax < 30"
                      [class.moderate]="day.windMax >= 30 && day.windMax < 50"
                      [class.strong]="day.windMax >= 50"
                    ></div>
                  </div>
                  <div class="wind-value-wrapper">
                    <span class="wind-icon-big">💨</span>
                    <span
                      class="wind-value"
                      [class.alert]="day.windMax >= 50"
                      [class.warning]="day.windMax >= 40"
                    >
                      {{ day.windMax }} km/h
                    </span>
                  </div>
                </div>
              </td>

              <!-- Confianza con badge mejorado -->
              <td class="col-confidence">
                <div class="confidence-visual">
                  <div
                    class="confidence-circle"
                    [class]="getConfidenceClass(day.confidence)"
                  >
                    <span class="confidence-percent">{{
                      Math.round(day.confidence * 100)
                    }}</span>
                  </div>
                </div>
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>

      @if (dayForecasts().length === 0) {
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <p class="empty-text">No hay datos de previsión disponibles</p>
        <p class="empty-hint">
          La previsión de 72h mostrará hasta 3 días completos
        </p>
      </div>
      } @else if (dayForecasts().length < 3) {
      <div class="info-banner">
        <span class="info-icon">ℹ️</span>
        <span class="info-text">
          Mostrando {{ dayForecasts().length }} de 3 días posibles. Datos de
          {{ points().length }} puntos horarios disponibles.
        </span>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .forecast-table-wrapper {
        background: white;
        border-radius: 16px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        margin-bottom: 2rem;
      }

      .header-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .table-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .days-count {
        font-size: 1rem;
        font-weight: 500;
        color: var(--neutral-600);
        background: var(--neutral-100);
        padding: 0.25rem 0.75rem;
        border-radius: 12px;
      }

      /* Leyenda de colores */
      .color-legend {
        display: flex;
        gap: 1.25rem;
        flex-wrap: wrap;
        background: rgba(0, 0, 0, 0.02);
        padding: 0.75rem 1rem;
        border-radius: 8px;
        border: 1px solid rgba(0, 0, 0, 0.08);
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.5rem;
        background: white;
        border-radius: 6px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .legend-color {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 2px solid rgba(255, 255, 255, 0.9);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        flex-shrink: 0;
      }

      .legend-color.temp-hot {
        background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
      }

      .legend-color.temp-cold {
        background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
      }

      .legend-color.snow-heavy {
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      }

      .legend-color.wind-strong {
        background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
      }

      .legend-label {
        font-size: 0.8125rem;
        color: #374151;
        font-weight: 600;
        white-space: nowrap;
        letter-spacing: -0.01em;
      }

      .table-scroll {
        overflow-x: auto;
        margin: -0.5rem;
        padding: 0.5rem;
      }

      .forecast-table {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        min-width: 700px;
      }

      thead {
        background: var(--neutral-100);
        border-radius: 8px;
      }

      thead tr {
        border-radius: 8px;
      }

      th {
        padding: 0.75rem 1rem;
        text-align: left;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--neutral-700);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-bottom: 2px solid var(--neutral-200);
      }

      th:first-child {
        border-top-left-radius: 8px;
      }

      th:last-child {
        border-top-right-radius: 8px;
      }

      tbody tr {
        transition: all 0.2s ease;
        border-bottom: 1px solid var(--neutral-100);
      }

      tbody tr:hover {
        background: var(--neutral-50);
      }

      tbody tr.today {
        background: var(--primary-50);
        font-weight: 600;
      }

      tbody tr.today:hover {
        background: var(--primary-100);
      }

      td {
        padding: 1rem;
        font-size: 0.9375rem;
      }

      .day-cell {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .day-label {
        font-weight: 700;
        color: var(--neutral-900);
        font-size: 1rem;
      }

      .day-date {
        font-size: 0.75rem;
        color: var(--neutral-600);
      }

      .condition-cell {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .condition-icon-large {
        font-size: 2.5rem;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      }

      .condition-text {
        color: var(--neutral-700);
        font-weight: 600;
        font-size: 0.875rem;
        text-align: center;
      }

      /* Temperatura visual */
      .temp-visual-cell {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .temp-bar-wrapper {
        width: 100%;
        height: 8px;
        background: var(--neutral-200);
        border-radius: 4px;
        overflow: hidden;
      }

      .temp-bar {
        height: 100%;
        border-radius: 4px;
        transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .temp-values {
        display: flex;
        align-items: baseline;
        justify-content: center;
        gap: 0.5rem;
      }

      .temp-max {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--neutral-700);
      }

      .temp-max.hot {
        color: #ef4444;
        text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
      }

      .temp-separator {
        color: var(--neutral-400);
        font-weight: 600;
      }

      .temp-min {
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--neutral-700);
      }

      .temp-min.cold {
        color: #3b82f6;
        text-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
      }

      /* Nieve visual */
      .snow-visual-cell {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .snow-bar-wrapper {
        width: 100%;
        height: 12px;
        background: var(--neutral-200);
        border-radius: 6px;
        overflow: hidden;
      }

      .snow-bar {
        height: 100%;
        border-radius: 6px;
        transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .snow-bar.light {
        background: linear-gradient(90deg, #dbeafe, #93c5fd);
      }

      .snow-bar.moderate {
        background: linear-gradient(90deg, #a5b4fc, #818cf8);
      }

      .snow-bar.heavy {
        background: linear-gradient(90deg, #8b5cf6, #6366f1);
        box-shadow: 0 0 12px rgba(139, 92, 246, 0.5);
      }

      .snow-value-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .snow-icon-big {
        font-size: 1.5rem;
      }

      .snow-value {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--neutral-500);
      }

      .snow-value.has-snow {
        color: var(--primary-700);
      }

      .snow-value.heavy-snow {
        color: #8b5cf6;
        font-size: 1.25rem;
        font-weight: 800;
        text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
      }

      /* Viento visual */
      .wind-visual-cell {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .wind-gauge-wrapper {
        width: 100%;
        height: 12px;
        background: var(--neutral-200);
        border-radius: 6px;
        overflow: hidden;
      }

      .wind-gauge {
        height: 100%;
        border-radius: 6px;
        transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .wind-gauge.calm {
        background: linear-gradient(90deg, #d1fae5, #6ee7b7);
      }

      .wind-gauge.moderate {
        background: linear-gradient(90deg, #fde047, #facc15);
      }

      .wind-gauge.strong {
        background: linear-gradient(90deg, #f97316, #ef4444);
        box-shadow: 0 0 12px rgba(239, 68, 68, 0.5);
        animation: pulse-wind 2s infinite;
      }

      @keyframes pulse-wind {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.7;
        }
      }

      .wind-value-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }

      .wind-icon-big {
        font-size: 1.5rem;
      }

      .wind-value {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--neutral-700);
      }

      .wind-value.warning {
        color: #f59e0b;
        font-weight: 800;
      }

      .wind-value.alert {
        color: #ef4444;
        font-size: 1.25rem;
        font-weight: 800;
        animation: blink-wind 1.5s infinite;
      }

      @keyframes blink-wind {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.6;
        }
      }

      /* Confianza visual */
      .confidence-visual {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .confidence-circle {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 0.875rem;
        border: 3px solid;
        transition: all 0.3s ease;
      }

      .confidence-circle.high {
        background: var(--success-100);
        color: var(--success-700);
        border-color: var(--success-400);
        box-shadow: 0 0 12px rgba(34, 197, 94, 0.3);
      }

      .confidence-circle.medium {
        background: var(--warning-100);
        color: var(--warning-700);
        border-color: var(--warning-400);
      }

      .confidence-circle.low {
        background: var(--error-100);
        color: var(--error-700);
        border-color: var(--error-400);
      }

      .confidence-percent {
        font-size: 1rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem;
        gap: 1rem;
      }

      .empty-icon {
        font-size: 3rem;
        opacity: 0.5;
      }

      .empty-text {
        margin: 0;
        color: var(--neutral-600);
        font-size: 0.9375rem;
        font-weight: 600;
      }

      .empty-hint {
        margin: 0;
        color: var(--neutral-500);
        font-size: 0.875rem;
      }

      .info-banner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
        border: 1px solid #93c5fd;
        border-radius: 8px;
        margin-bottom: 1rem;
      }

      .info-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .info-text {
        color: #1e40af;
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1.5;
      }

      @media (max-width: 768px) {
        .forecast-table-wrapper {
          padding: 1rem;
        }

        .header-section {
          flex-direction: column;
          gap: 1rem;
        }

        .table-title {
          font-size: 1.25rem;
        }

        .color-legend {
          gap: 0.75rem;
          padding: 0.625rem 0.75rem;
          width: 100%;
          justify-content: space-around;
        }

        .legend-item {
          padding: 0.25rem 0.375rem;
          flex: 1;
          min-width: 0;
          justify-content: center;
        }

        .legend-color {
          width: 24px;
          height: 24px;
        }

        .legend-label {
          font-size: 0.7rem;
          display: none;
        }

        .legend-item::after {
          content: attr(data-label);
          font-size: 0.65rem;
          color: #374151;
          font-weight: 600;
          text-align: center;
        }

        th,
        td {
          padding: 0.75rem 0.5rem;
          font-size: 0.875rem;
        }

        .condition-icon-large {
          font-size: 2rem;
        }

        .condition-text {
          font-size: 0.75rem;
        }

        .temp-bar-wrapper,
        .snow-bar-wrapper,
        .wind-gauge-wrapper {
          height: 8px;
        }

        .temp-max,
        .temp-min {
          font-size: 1rem;
        }

        .snow-icon-big,
        .wind-icon-big {
          font-size: 1.25rem;
        }

        .snow-value,
        .wind-value {
          font-size: 1rem;
        }

        .confidence-circle {
          width: 48px;
          height: 48px;
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class Forecast72hTableComponent {
  points = input.required<MeteoForecastPoint[]>();

  Math = Math;

  /**
   * Agrupa puntos por días completos
   */
  dayForecasts = computed<DayForecast[]>(() => {
    const points = this.points();
    if (points.length === 0) return [];

    // Agrupar por día (usando fecha sin hora)
    const dayMap = new Map<string, MeteoForecastPoint[]>();

    points.forEach((point) => {
      const date = new Date(point.validAt);
      const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, []);
      }
      const dayPoints = dayMap.get(dayKey);
      if (dayPoints) {
        dayPoints.push(point);
      }
    });

    // Convertir a DayForecast
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const forecasts: DayForecast[] = [];

    dayMap.forEach((hourlyPoints) => {
      if (hourlyPoints.length === 0) return;

      const firstPoint = hourlyPoints[0];
      const date = new Date(firstPoint.validAt);
      date.setHours(0, 0, 0, 0);

      const temps = hourlyPoints.map((p) => p.tempC);
      const snowAccum = hourlyPoints.reduce(
        (sum, p) => sum + p.precipSnowCm,
        0
      );
      const winds = hourlyPoints.map((p) => p.windKmh);
      const confidences = hourlyPoints.map((p) => p.confidence);

      forecasts.push({
        date,
        dayLabel: this.getDayLabel(date),
        tempMin: Math.round(Math.min(...temps)),
        tempMax: Math.round(Math.max(...temps)),
        snowAccum: Math.round(snowAccum),
        windMax: Math.round(Math.max(...winds)),
        condition: this.getPredominantCondition(hourlyPoints),
        conditionIcon: this.getConditionIcon(hourlyPoints),
        confidence:
          confidences.reduce((sum, c) => sum + c, 0) / confidences.length,
        hours: hourlyPoints,
      });
    });

    // Ordenar por fecha
    forecasts.sort((a, b) => a.date.getTime() - b.date.getTime());

    return forecasts;
  });

  /**
   * Determina etiqueta del día (Hoy, Mañana, Pasado mañana o nombre del día)
   */
  private getDayLabel(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const dateTime = date.getTime();
    const todayTime = today.getTime();
    const tomorrowTime = tomorrow.getTime();
    const dayAfterTime = dayAfterTomorrow.getTime();

    if (dateTime === todayTime) {
      return "Hoy";
    } else if (dateTime === tomorrowTime) {
      return "Mañana";
    } else if (dateTime === dayAfterTime) {
      return "Pasado mañana";
    } else {
      // Para días más lejanos, mostrar nombre del día de la semana
      const weekday = date.toLocaleDateString("es-ES", { weekday: "long" });
      return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }
  }

  /**
   * Determina la condición predominante del día
   */
  private getPredominantCondition(points: MeteoForecastPoint[]): string {
    const totalSnow = points.reduce((sum, p) => sum + p.precipSnowCm, 0);
    const totalRain = points.reduce((sum, p) => sum + p.precipRainMm, 0);
    const avgCloud =
      points.reduce((sum, p) => sum + (p.cloudPct ?? 0), 0) / points.length;

    if (totalSnow > 5 && totalRain > 2) return "Nieve y lluvia";
    if (totalSnow > 2) return "Nevadas";
    if (totalRain > 5) return "Lluvias";
    if (avgCloud > 70) return "Nublado";
    if (avgCloud > 40) return "Parcialmente nublado";
    return "Despejado";
  }

  /**
   * Obtiene icono según condición
   */
  private getConditionIcon(points: MeteoForecastPoint[]): string {
    const condition = this.getPredominantCondition(points);

    if (condition.includes("Nieve")) return "❄️";
    if (condition.includes("lluvia")) return "🌧️";
    if (condition === "Despejado") return "☀️";
    if (condition.includes("Nublado")) return "☁️";
    return "🌤️";
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
  }

  getConfidenceClass(confidence: number): string {
    if (confidence > 0.8) return "high";
    if (confidence >= 0.6) return "medium";
    return "low";
  }

  /**
   * Genera gradiente de color para temperatura
   */
  getTempGradient(min: number, max: number): string {
    // Colores: azul (frío) -> verde -> amarillo -> naranja -> rojo (caliente)
    const getColor = (temp: number): string => {
      if (temp <= -10) return "#3b82f6"; // blue
      if (temp <= -5) return "#06b6d4"; // cyan
      if (temp <= 0) return "#10b981"; // green
      if (temp <= 5) return "#fbbf24"; // yellow
      if (temp <= 10) return "#f97316"; // orange
      return "#ef4444"; // red
    };

    const colorMin = getColor(min);
    const colorMax = getColor(max);

    return `linear-gradient(to right, ${colorMin}, ${colorMax})`;
  }

  /**
   * Calcula ancho de barra de temperatura (0-100%)
   */
  getTempBarWidth(min: number, max: number): number {
    // Rango típico -20 a +20 grados
    const range = 40;
    const avgTemp = (min + max) / 2;
    const normalized = ((avgTemp + 20) / range) * 100;
    return Math.max(20, Math.min(100, normalized));
  }

  /**
   * Calcula ancho de barra de nieve (0-100%)
   */
  getSnowBarWidth(snowCm: number): number {
    // Escala: 0cm = 0%, 20cm+ = 100%
    const maxSnow = 20;
    return Math.min(100, (snowCm / maxSnow) * 100);
  }

  /**
   * Calcula ancho de medidor de viento (0-100%)
   */
  getWindGaugeWidth(windKmh: number): number {
    // Escala: 0 km/h = 0%, 80+ km/h = 100%
    const maxWind = 80;
    return Math.min(100, (windKmh / maxWind) * 100);
  }
}
