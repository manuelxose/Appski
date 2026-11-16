import { Injectable, inject } from "@angular/core";
import type { SnowQuality } from "../models/meteo.models";
import { SnowApi } from "../../../snow/client/snow-api.service";
import type { AvalancheRisk, DetailedForecastDay, SeasonChartData, SeasonStats, SnowConditions, WeekForecastDay } from "../models/meteo.models";
import { notInV1, type Availability } from "./availability";
import { reasonText } from "./meteo-data.service";

/**
 * Datos de nieve contra el BORDE REAL.
 *
 * Antes: 5 `fetch` a `/assets/mocks/snow-*.json` con el `stationSlug` IGNORADO
 * (todas las estaciones mostraban el mismo parte inventado).
 *
 * Ahora:
 *  - condiciones → `GET /stations/:slug/report` (parte editorial real);
 *  - previsión detallada / semanal → `GET /stations/:slug/forecast`, que sin
 *    proveedor autorizado responde `not_configured` (se propaga como
 *    indisponibilidad, no como lista de días vacía "correcta");
 *  - estadísticas y gráficos de temporada → NO hay endpoint en v1: se declaran
 *    indisponibles en vez de servir series ficticias.
 */
@Injectable({ providedIn: "root" })
export class SnowDataService {
  private readonly api = inject(SnowApi);

  /**
   * Condiciones actuales por cota. El borde da espesores (base/media/cima) y
   * calidad; NO da temperatura, viento ni "última nevada" por cota, así que esos
   * campos quedan `null` — nunca 0 ni un texto inventado.
   */
  async getSnowConditions(stationSlug: string): Promise<Availability<SnowConditions>> {
    const res = await this.api.report(stationSlug);
    if (!res.ok) {
      return { state: "unavailable", detail: "No se pudo consultar el parte de nieve." };
    }
    const body = res.body;
    if (body.status !== "ok" && body.status !== "stale") {
      if (body.status === "blocked") {
        return { state: "blocked", detail: "La licencia impide publicar el parte." };
      }
      if (body.status === "not_configured") {
        return { state: "not_covered", detail: "No hay proveedor del parte configurado." };
      }
      return { state: "no_data", detail: reasonText(body.reason) };
    }
    const snow = body.report.snow;
    if (snow === null) {
      // Parte publicado sin espesores: es una ausencia, no un 0 cm.
      return { state: "no_data", detail: "El parte publicado no incluye espesores." };
    }
    return {
      state: body.status,
      value: {
        stationSlug,
        // Fecha del DATO, no del request.
        updatedAt: body.capturedAt ?? body.provenance.observedAt,
        avalancheRisk: "none", // el parte no trae nivel de aludes: "sin información"
        base: cotaBlock(null, snow.baseCm, snow.quality),
        mid: cotaBlock(null, snow.midCm, snow.quality),
        top: cotaBlock(null, snow.topCm, snow.quality),
      },
    };
  }

  /** Previsión detallada por bloques: sin proveedor ⇒ `not_covered` explícito. */
  async getDetailedForecast(stationSlug: string): Promise<Availability<readonly DetailedForecastDay[]>> {
    const fc = await this.api.forecast(stationSlug);
    if (!fc.ok) {
      return { state: "unavailable", detail: "No se pudo consultar la previsión." };
    }
    if (fc.body.status !== "ok" && fc.body.status !== "stale") {
      return forecastGap(fc.body.status);
    }
    // El borde entrega puntos horarios; la tabla "detallada" por bloques de 6 h
    // requiere agregación que este hito no implementa (y hacerlo mal sería
    // inventar). Se declara no disponible antes que rellenarla con ceros.
    return notInV1<readonly DetailedForecastDay[]>(
      "La previsión detallada por bloques no está disponible todavía: el borde entrega puntos horarios.",
    );
  }

  /** Previsión semanal: sin proveedor ⇒ `not_covered` explícito. */
  async getWeekForecast(stationSlug: string): Promise<Availability<readonly WeekForecastDay[]>> {
    const fc = await this.api.forecast(stationSlug);
    if (!fc.ok) {
      return { state: "unavailable", detail: "No se pudo consultar la previsión." };
    }
    if (fc.body.status !== "ok" && fc.body.status !== "stale") {
      return forecastGap(fc.body.status);
    }
    return notInV1<readonly WeekForecastDay[]>(
      "La previsión semanal resumida no está disponible todavía: el borde entrega puntos horarios.",
    );
  }

  /** Estadísticas de temporada: sin endpoint en v1. */
  async getSeasonStats(_stationSlug: string): Promise<Availability<SeasonStats>> {
    return notInV1<SeasonStats>(
      "Las estadísticas de temporada no están disponibles: no hay histórico publicado en v1.",
    );
  }

  /** Series históricas de temporada: sin endpoint en v1. */
  async getSeasonChartData(_stationSlug: string): Promise<Availability<SeasonChartData>> {
    return notInV1<SeasonChartData>(
      "Las series históricas de temporada no están disponibles: no hay histórico publicado en v1.",
    );
  }
}

function forecastGap(status: string): Availability<never> {
  if (status === "blocked") {
    return { state: "blocked", detail: "La licencia del proveedor impide publicar la previsión." };
  }
  if (status === "not_configured") {
    return { state: "not_covered", detail: "Sin proveedor de previsión autorizado: no hay dato que mostrar." };
  }
  return { state: "no_data", detail: "El proveedor de previsión no tiene datos para esta estación." };
}

/** Bloque por cota: sólo lo que el borde publica; el resto es `null`. */
function cotaBlock(altitudeM: number | null, depthCm: number | null, quality: SnowQuality | null) {
  return {
    altitudeM: altitudeM ?? 0,
    depthCm,
    quality,
    tempC: null, // sin estación meteorológica autorizada
    windKmh: null,
    lastSnowfall: null, // el parte no separa "última nevada"
  };
}

/** Re-export del tipo de riesgo para el componente (evita import del modelo). */
export type { AvalancheRisk };
