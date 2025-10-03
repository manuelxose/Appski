import { Injectable } from "@angular/core";
import {
  MeteoNow,
  MeteoForecast,
  WeatherSummary,
  MeteoForecastPoint,
  Cota,
} from "../models/meteo.models";

/**
 * Servicio para mapear y normalizar datos meteorológicos
 */
@Injectable({ providedIn: "root" })
export class MeteoMapperService {
  /**
   * Genera resúmenes por periodo desde el forecast (filtrado por cota)
   */
  generateSummaries(forecast: MeteoForecast, cota: Cota): WeatherSummary[] {
    const summaries: WeatherSummary[] = [];
    const now = new Date();

    // Filtrar solo puntos de la cota seleccionada
    const cotaForecast = {
      ...forecast,
      points: forecast.points.filter((p) => p.cota === cota),
    };

    // Hoy
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    summaries.push(
      this.createSummary(cotaForecast, now, todayEnd, "today", "Hoy")
    );

    // Mañana
    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);
    summaries.push(
      this.createSummary(
        cotaForecast,
        tomorrowStart,
        tomorrowEnd,
        "tomorrow",
        "Mañana"
      )
    );

    // Fin de semana (próximo sábado-domingo)
    const nextSaturday = this.getNextDayOfWeek(now, 6); // 6 = Sábado
    const nextSunday = new Date(nextSaturday);
    nextSunday.setDate(nextSunday.getDate() + 1);
    nextSunday.setHours(23, 59, 59, 999);
    summaries.push(
      this.createSummary(
        cotaForecast,
        nextSaturday,
        nextSunday,
        "weekend",
        "Fin de semana"
      )
    );

    return summaries;
  }

  /**
   * Crea un resumen de un periodo específico
   */
  private createSummary(
    forecast: MeteoForecast,
    start: Date,
    end: Date,
    period: "today" | "tomorrow" | "weekend",
    label: string
  ): WeatherSummary {
    const pointsInPeriod = forecast.points.filter((p) => {
      const date = new Date(p.validAt);
      return date >= start && date <= end;
    });

    if (pointsInPeriod.length === 0) {
      return {
        period,
        label,
        tempMaxC: 0,
        tempMinC: 0,
        snowAccuCm: 0,
        condition: "clear",
        windMaxKmh: 0,
        confidence: 0,
      };
    }

    // Calcular valores agregados (promediando todas las cotas)
    const temps = pointsInPeriod.map((p) => p.tempC);
    const snowAccu = pointsInPeriod.reduce((sum, p) => sum + p.precipSnowCm, 0);
    const winds = pointsInPeriod.map((p) => p.windKmh);
    const confidences = pointsInPeriod.map((p) => p.confidence);

    // Determinar condición predominante
    const condition = this.determinePredominantCondition(pointsInPeriod);

    return {
      period,
      label,
      tempMaxC: Math.max(...temps),
      tempMinC: Math.min(...temps),
      snowAccuCm: Math.round(snowAccu),
      condition,
      windMaxKmh: Math.max(...winds),
      confidence:
        confidences.reduce((sum, c) => sum + c, 0) / confidences.length,
    };
  }

  /**
   * Determina la condición predominante basada en precipitación y temperatura
   */
  private determinePredominantCondition(
    points: MeteoForecastPoint[]
  ): "snow" | "rain" | "mix" | "clear" | "cloudy" {
    const totalSnow = points.reduce((sum, p) => sum + p.precipSnowCm, 0);
    const totalRain = points.reduce((sum, p) => sum + p.precipRainMm, 0);
    const avgCloud =
      points.reduce((sum, p) => sum + (p.cloudPct ?? 0), 0) / points.length;

    if (totalSnow > 5 && totalRain > 2) return "mix";
    if (totalSnow > 2) return "snow";
    if (totalRain > 5) return "rain";
    if (avgCloud > 70) return "cloudy";
    return "clear";
  }

  /**
   * Obtiene el próximo día de la semana (0=domingo, 6=sábado)
   */
  private getNextDayOfWeek(date: Date, dayOfWeek: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + ((7 + dayOfWeek - result.getDay()) % 7));
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * Filtra puntos de forecast por cota
   */
  filterByCota(forecast: MeteoForecast, cota: Cota): MeteoForecastPoint[] {
    return forecast.points.filter((p) => p.cota === cota);
  }

  /**
   * Agrupa puntos por timestamp (todas las cotas en el mismo momento)
   */
  groupByTime(forecast: MeteoForecast): Map<string, MeteoForecastPoint[]> {
    const grouped = new Map<string, MeteoForecastPoint[]>();

    forecast.points.forEach((point) => {
      const existing = grouped.get(point.validAt) || [];
      existing.push(point);
      grouped.set(point.validAt, existing);
    });

    return grouped;
  }

  /**
   * Calcula el "mejor momento" para esquiar (menos viento, más nieve reciente, buena visibilidad)
   */
  findBestSkiingWindow(
    forecast: MeteoForecast,
    cota: Cota
  ): {
    start: string;
    end: string;
    score: number;
  } | null {
    const cotaPoints = this.filterByCota(forecast, cota);

    if (cotaPoints.length === 0) return null;

    let bestStart = "";
    let bestEnd = "";
    let bestScore = -Infinity;

    // Ventana de 3 horas
    for (let i = 0; i < cotaPoints.length - 2; i++) {
      const window = cotaPoints.slice(i, i + 3);
      const score = this.calculateSkiScore(window);

      if (score > bestScore) {
        bestScore = score;
        bestStart = window[0].validAt;
        bestEnd = window[window.length - 1].validAt;
      }
    }

    return {
      start: bestStart,
      end: bestEnd,
      score: Math.round(bestScore * 100),
    };
  }

  /**
   * Calcula puntuación para esquiar (0-1)
   */
  private calculateSkiScore(points: MeteoForecastPoint[]): number {
    const avgWind =
      points.reduce((sum, p) => sum + p.windKmh, 0) / points.length;
    const avgSnow =
      points.reduce((sum, p) => sum + p.precipSnowCm, 0) / points.length;
    const avgVisibility =
      points.reduce((sum, p) => sum + (p.visibilityM ?? 5000), 0) /
      points.length;
    const avgConfidence =
      points.reduce((sum, p) => sum + p.confidence, 0) / points.length;

    // Menor viento mejor (ideal < 30 km/h)
    const windScore = Math.max(0, 1 - avgWind / 60);

    // Algo de nieve reciente es bueno (ideal 5-15 cm)
    const snowScore = avgSnow > 15 ? 0.8 : avgSnow / 15;

    // Buena visibilidad (ideal > 3000m)
    const visScore = Math.min(1, avgVisibility / 3000);

    return (
      windScore * 0.4 + snowScore * 0.3 + visScore * 0.2 + avgConfidence * 0.1
    );
  }

  /**
   * Filtra datos 'now' por cota (ajusta valores según cota)
   */
  filterNowByCota(now: MeteoNow, cota: Cota): MeteoNow {
    // Por ahora retornamos los mismos datos
    // En producción, aquí podrías ajustar valores específicos por cota
    // como temperatura (más fría en top), espesor de nieve específico, etc.
    return {
      ...now,
      // Ajustes hipotéticos por cota:
      tempC:
        cota === "top"
          ? now.tempC - 3
          : cota === "base"
          ? now.tempC + 2
          : now.tempC,
      snowBaseCm: cota === "base" ? now.snowBaseCm : null,
      snowTopCm: cota === "top" ? now.snowTopCm : null,
    };
  }

  /**
   * Convierte observación actual a formato para gráficos
   */
  nowToChartPoint(now: MeteoNow) {
    return {
      timestamp: now.observedAt,
      temp: now.tempC,
      wind: now.windKmh,
      gust: now.gustKmh,
      snow: now.snowNew24hCm ?? 0,
    };
  }
}
