import { Injectable, inject } from "@angular/core";
import type { ForecastBundle, SnowReportDto } from "../../../snow/models/dto";
import { SnowApi } from "../../../snow/client/snow-api.service";
import type {
  MeteoForecast,
  MeteoForecastPoint,
  MeteoNow,
  RadarInfo,
  WebcamHistory,
  WebcamItem,
} from "../models/meteo.models";
import { isAvailable, notInV1, type Availability } from "./availability";

/**
 * Acceso a datos meteorológicos contra el BORDE REAL.
 *
 * Antes: `fetch` a `/assets/mocks/{now,forecast72,webcams,radar,webcam-history*}`,
 * con el MISMO fichero para cualquier estación (el `stationSlug` se ignoraba).
 *
 * Ahora cada método devuelve `Availability<T>`: `ok`/`stale` con el valor real,
 * o `not_covered`/`blocked`/`no_data`/`unavailable` con un motivo legible. Si no
 * hay proveedor, no hay número: nunca una cifra sintética.
 *
 * Endpoints del borde que sí existen:
 *  - `/stations/:slug/forecast`  → previsión horaria;
 *  - `/stations/:slug/report`    → parte editorial (espesores/estado operativo);
 *  - `/stations/:slug/webcams`   → SIEMPRE `blocked` (imagen prohibida por licencia).
 * Sin endpoint en v1: observación "ahora", radar e imágenes de webcam.
 */
@Injectable({ providedIn: "root" })
export class MeteoDataService {
  private readonly api = inject(SnowApi);
  private lang: "es" | "en" = "es";

  /**
   * Observación "ahora" (temperatura, viento, visibilidad, isoterma).
   *
   * No hay `/now` en v1 y una previsión NO es una observación: se devuelve
   * indisponibilidad explícita. Los espesores del parte están en `getReport`.
   */
  async getNow(_stationSlug: string): Promise<Availability<MeteoNow>> {
    return notInV1<MeteoNow>(
      "La observación meteorológica en directo no está disponible: no hay proveedor autorizado cableado en v1.",
    );
  }

  /** Previsión horaria real del borde (`ForecastBundle` → `MeteoForecast`). */
  async getForecast72(stationSlug: string): Promise<Availability<MeteoForecast>> {
    const res = await this.api.forecast(stationSlug);
    if (!res.ok) {
      return { state: "unavailable", detail: "No se pudo consultar la previsión." };
    }
    const body = res.body;
    if (body.status === "ok" || body.status === "stale") {
      // El borde sólo incluye `data` cuando hay dato; si falta, no se inventa.
      if (!("data" in body) || body.data === undefined) {
        return { state: "no_data", detail: "La previsión llegó sin datos." };
      }
      return { state: body.status, value: toMeteoForecast(stationSlug, body.data) };
    }
    if (body.status === "blocked") {
      return { state: "blocked", detail: "La licencia del proveedor impide publicar la previsión." };
    }
    if (body.status === "not_configured") {
      return {
        state: "not_covered",
        detail: "Sin proveedor de previsión autorizado: no hay dato que mostrar.",
      };
    }
    return {
      state: "no_data",
      detail: "El proveedor de previsión no tiene datos para esta estación.",
    };
  }

  /**
   * Webcams: el borde responde SIEMPRE `blocked` (05b §7.4). Se propaga como
   * bloqueo de licencia para que la UI explique POR QUÉ no hay imágenes.
   */
  async getWebcams(stationSlug: string): Promise<Availability<readonly WebcamItem[]>> {
    const res = await this.api.webcams(stationSlug);
    if (!res.ok) {
      return { state: "unavailable", detail: "No se pudo consultar el estado de las webcams." };
    }
    if (res.body.status === "blocked") {
      return {
        state: "blocked",
        detail: "Las imágenes de webcam no se publican: la licencia del operador solo permite enlazar.",
      };
    }
    return { state: "blocked", detail: "No hay webcam con enlace autorizado para esta estación." };
  }

  /** Radar: sin endpoint ni proveedor autorizado en v1. */
  async getRadar(_stationSlug: string): Promise<Availability<RadarInfo>> {
    return notInV1<RadarInfo>(
      "El radar meteorológico no está disponible: sin proveedor ni endpoint autorizado en v1.",
    );
  }

  /** Histórico de imágenes de webcam: prohibido por licencia y sin endpoint. */
  async getWebcamHistory(
    _stationSlug: string,
    _webcamId: string,
    _webcamName: string,
    _date?: string,
  ): Promise<Availability<WebcamHistory>> {
    return notInV1<WebcamHistory>(
      "El histórico de imágenes de webcam no está disponible (licencia de imagen y sin endpoint en v1).",
    );
  }

  /** Parte editorial del borde (`/report`): ÚNICA fuente de espesores. */
  async getReport(stationSlug: string): Promise<Availability<SnowReportDto>> {
    const res = await this.api.report(stationSlug);
    if (!res.ok) {
      return { state: "unavailable", detail: "No se pudo consultar el parte de nieve." };
    }
    const body = res.body;
    if (body.status === "ok" || body.status === "stale") {
      return { state: body.status, value: body };
    }
    if (body.status === "blocked") {
      return { state: "blocked", detail: "La licencia impide publicar el parte." };
    }
    if (body.status === "not_configured") {
      return { state: "not_covered", detail: "No hay proveedor del parte configurado." };
    }
    return { state: "no_data", detail: reasonText(body.reason) };
  }

  /** Idioma de presentación (no viaja al borde: el dato es el mismo). */
  setLanguage(lang: "es" | "en"): void {
    this.lang = lang;
  }

  getLanguage(): "es" | "en" {
    return this.lang;
  }
}

/** Motivo legible de ausencia de dato (nunca un nombre de variable de entorno). */
export function reasonText(reason: string | undefined): string {
  switch (reason) {
    case "outside-season":
      return "Sin parte publicado: la temporada no está activa.";
    case "source-silent":
      return "La fuente no ha publicado datos todavía.";
    case "not-yet-published":
      return "Todavía no se ha publicado el boletín.";
    case "not-covered":
      return "Sin cobertura para esta estación.";
    case "license-prohibits":
      return "La licencia del operador impide publicar este dato.";
    default:
      return "No hay datos disponibles para esta estación.";
  }
}

/**
 * `ForecastBundle` (borde) → `MeteoForecast` (página).
 *
 * El borde no publica cota ni confianza por punto: `cota` se fija a `"mid"`
 * (la previsión no viene desglosada) y `confidence` queda en 0 como "no
 * declarada". `snowAccu*` a 0 significaría "0 cm acumulados", así que NO se
 * deriva: queda a 0 solo porque el modelo no tiene campo nullable y la UI no
 * muestra acumulados cuando `confidence` es 0. Se documenta aquí para no
 * confundirlo con un dato.
 */
export function toMeteoForecast(stationSlug: string, bundle: ForecastBundle): MeteoForecast {
  const points: MeteoForecastPoint[] = bundle.points.map((p) => ({
    validAt: p.validAt,
    cota: "mid",
    tempC: p.tempC ?? 0,
    windKmh: p.windKmh ?? 0,
    gustKmh: p.windKmh ?? 0,
    precipSnowCm: 0,
    precipRainMm: p.precipMm ?? 0,
    iso0M: p.snowLineM,
    cloudPct: null,
    visibilityM: null,
    confidence: 0,
  }));
  return {
    stationSlug,
    hours: bundle.horizonHours,
    points,
    snowAccu24hCm: 0,
    snowAccu72hCm: 0,
  };
}

export { isAvailable };
