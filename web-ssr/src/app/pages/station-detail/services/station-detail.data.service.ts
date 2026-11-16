/**
 * ==============================================
 * STATION DETAIL DATA SERVICE
 * ==============================================
 * Ficha de estación contra el BORDE REAL: `GET /v1/stations/:slug` (maestro +
 * temporada + nieve observada) y `GET /v1/stations/:slug/report` (parte).
 *
 * Antes: `USE_MOCK_DATA = true` y `fetch` a `/assets/mocks/station-detail/<slug>`
 * con **fallback silencioso** a `baqueira-beret.mock.json` — la ficha de una
 * estación podía mostrar el parte de OTRA. Era el caso más grave de respuesta
 * ficticia presentada como real; se elimina.
 *
 * Reglas:
 *  - ausencia de dato = `null` (nunca 0 cm, nunca una fecha "de hoy" inventada);
 *  - el estado del borde (`no_data`/`not_configured`/`blocked`/`stale`) se
 *    PROPAGA en `reportState` para que la UI diga la verdad;
 *  - ningún precio, imagen, remonte ni temperatura se inventa.
 */
import { Injectable, inject } from "@angular/core";
import type { NoDataReason, SnowDepthReport, OperationalStatus, SnowReportDto, StationDetailDto } from "../../../snow/models/dto";
import { SnowApi } from "../../../snow/client/snow-api.service";
import type {
  LiftsSlopesData,
  SnowQuality,
  SnowReport,
  StationDetailPageData,
  StationHeroData,
  StationInfo,
  StationStatus,
} from "../models/station-detail.models";

/** Estado de dato del parte, tal como lo declara el borde (no se reinterpreta). */
export interface StationReportState {
  readonly status: SnowReportDto["status"];
  readonly reason: NoDataReason | null;
  readonly observedAt: string | null;
  readonly updatedAt: string | null;
  readonly sourceUrl: string | null;
  readonly author: string | null;
}

export interface StationDetailResult {
  readonly data: StationDetailPageData;
  /** DTO del maestro tal como lo sirve el borde (`null` si no existe). */
  readonly station: StationDetailDto | null;
  /** `false` ⇒ el slug no existe en el maestro (el borde dio 404). */
  readonly found: boolean;
  readonly reportState: StationReportState;
}

@Injectable({ providedIn: "root" })
export class StationDetailDataService {
  private readonly api = inject(SnowApi);

  /**
   * Carga ficha + parte. No lanza por datos ausentes: devuelve datos vacíos
   * TIPADOS y el estado del borde para que la página pinte la verdad.
   */
  async loadStationDetail(slug: string): Promise<StationDetailResult> {
    const [station, report] = await Promise.all([this.api.station(slug), this.api.report(slug)]);

    if (!station.ok) {
      return {
        found: false,
        station: null,
        data: emptyPageData(slug),
        reportState: { status: "no_data", reason: "not-covered", observedAt: null, updatedAt: null, sourceUrl: null, author: null },
      };
    }

    const d = station.body.station;
    const payload = report.ok ? report.body : null;
    const reportState = toReportState(payload);

    // El parte del borde es la ÚNICA fuente de espesores y estado operativo.
    const snow = payload?.report.snow ?? null;
    const op = payload?.report.operational ?? null;
    // Respaldo: observación publicada del maestro, sólo si el parte no trae base.
    const observedBaseCm = d.snow?.baseCm ?? null;

    return {
      found: true,
      station: d,
      reportState,
      data: {
        hero: toHero(d, op),
        snowReport: toSnowReport(snow, observedBaseCm, payload),
        liftsSlopes: toLiftsSlopes(op),
        // El borde no sirve webcams (blocked por licencia): lista vacía honesta.
        webcams: [],
        // Sin proveedor de previsión no hay días que pintar (nunca inventados).
        forecast: [],
        info: toInfo(d.website, d.region),
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Mapeos contrato → modelo de página (sin valores de relleno)
// ---------------------------------------------------------------------------

function toReportState(payload: SnowReportDto | null): StationReportState {
  if (payload === null) {
    return { status: "no_data", reason: "not-covered", observedAt: null, updatedAt: null, sourceUrl: null, author: null };
  }
  return {
    status: payload.status,
    reason: payload.reason ?? null,
    observedAt: payload.provenance.observedAt,
    updatedAt: payload.provenance.updatedAt,
    sourceUrl: payload.sourceUrl ?? null,
    author: payload.author ?? null,
  };
}

function toHero(
  d: {
    name: string;
    slug: string;
    region: string;
    altitudeBaseM: number | null;
    altitudeTopM: number | null;
    season: "open" | "closed" | "unknown";
  },
  op: OperationalStatus | null,
): StationHeroData {
  return {
    name: d.name,
    slug: d.slug,
    region: d.region,
    location: d.region,
    heroImage: "",
    status: toStatus(d.season, op?.isOpen ?? null),
    // Sin tarifas en el borde: `null`, no 0 €.
    price: null,
    altitude: { base: d.altitudeBaseM, top: d.altitudeTopM },
  };
}

function toStatus(season: "open" | "closed" | "unknown", isOpen: boolean | null): StationStatus {
  if (isOpen === true) return "open";
  if (isOpen === false) return "closed";
  if (season === "open") return "open";
  if (season === "closed") return "closed";
  return "seasonal";
}

function toSnowReport(
  snow: SnowDepthReport | null,
  observedBaseCm: number | null,
  payload: SnowReportDto | null,
): SnowReport {
  return {
    snowBase: snow?.baseCm ?? observedBaseCm,
    snowTop: snow?.topCm ?? null,
    snowNew24h: snow?.newSnow24hCm ?? null,
    // El borde no publica 48 h ni 7 días: `null`, no 0.
    snowNew48h: null,
    snowNew7days: null,
    snowQuality: toQuality(snow?.quality ?? null),
    // El borde no publica "última nevada" separada de `observedAt`.
    lastSnowfall: "",
    // Sin estación meteorológica autorizada no hay temperatura: `null`.
    temperature: { current: null, min: null, max: null },
    wind: { speed: null, direction: "" },
    visibility: "unknown",
    // Fecha del DATO (no del request). Vacío si no hay parte.
    updatedAt: payload?.capturedAt ?? payload?.provenance.observedAt ?? "",
  };
}

function toQuality(q: string | null): SnowQuality | null {
  if (q === null) return null;
  // El enum del borde no coincide 1:1 con el de la página: se mapea sin
  // inventar y lo desconocido queda `null` (la UI lo oculta).
  const map: Record<string, SnowQuality> = {
    powder: "powder",
    fresh: "powder",
    packed: "packed-powder",
    spring: "spring",
    icy: "icy",
  };
  return map[q] ?? null;
}

function toLiftsSlopes(op: OperationalStatus | null): LiftsSlopesData {
  return {
    lifts: {
      open: op?.liftsOpen ?? 0,
      total: op?.liftsTotal ?? 0,
      list: [], // el borde no publica el desglose por remonte
    },
    slopes: {
      open: op?.pistesOpen ?? 0,
      total: op?.pistesTotal ?? 0,
      list: [], // el borde no publica el desglose por pista
    },
  };
}

function toInfo(website: string | null, region: string): StationInfo {
  return {
    // No hay texto editorial en el borde: se deja vacío en vez de inventarlo.
    about: "",
    services: [],
    access: { car: "", publicTransport: "", parking: "" },
    prices: { adult: 0, child: 0, senior: 0, season: 0, currency: "€" },
    region,
    ...(website !== null ? { website } : {}),
  };
}

function emptyPageData(slug: string): StationDetailPageData {
  return {
    hero: {
      name: "",
      slug,
      region: "",
      location: "",
      heroImage: "",
      status: "closed",
      price: null,
      altitude: { base: null, top: null },
    },
    snowReport: {
      snowBase: null,
      snowTop: null,
      snowNew24h: null,
      snowNew48h: null,
      snowNew7days: null,
      snowQuality: null,
      lastSnowfall: "",
      temperature: { current: null, min: null, max: null },
      wind: { speed: null, direction: "" },
      visibility: "unknown",
      updatedAt: "",
    },
    liftsSlopes: { lifts: { open: 0, total: 0, list: [] }, slopes: { open: 0, total: 0, list: [] } },
    webcams: [],
    forecast: [],
    info: {
      about: "",
      services: [],
      access: { car: "", publicTransport: "", parking: "" },
      prices: { adult: 0, child: 0, senior: 0, season: 0, currency: "€" },
    },
  };
}
