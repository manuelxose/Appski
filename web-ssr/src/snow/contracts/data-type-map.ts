/**
 * Formas de carga por tipo de dato (05b §2.2). Alineadas con el dominio
 * existente sin sustituirlo. El único import cruzado sancionado de este carril:
 * `SnowQuality`, que ya vive en el modelo meteo del repo.
 */
import type { SnowQuality } from '../../app/pages/weather/models/meteo.models';
import type { SnowDataType } from './provider-contracts';

export interface StationMaster {
  readonly slug: string;
  readonly name: string;
  readonly country: 'ES' | 'AD' | 'FR' | 'PT';
  readonly region: string;
  readonly lat: number;
  readonly lng: number;
  readonly altitudeBaseM: number | null;
  readonly altitudeTopM: number | null;
  readonly website: string | null;
}

export interface OperationalStatus {
  readonly liftsOpen: number | null;
  readonly liftsTotal: number | null;
  readonly pistesOpen: number | null;
  readonly pistesTotal: number | null;
  readonly kmOpen: number | null;
  readonly kmTotal: number | null;
  readonly isOpen: boolean | null;
  readonly byLevel: Readonly<Record<'green' | 'blue' | 'red' | 'black', { open: number; total: number }>> | null;
}

export interface SnowDepthReport {
  readonly baseCm: number | null;
  readonly midCm: number | null;
  readonly topCm: number | null;
  readonly newSnow24hCm: number | null;
  readonly quality: SnowQuality | null;
}

export interface AvalancheBulletin {
  readonly level: 1 | 2 | 3 | 4 | 5 | null;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly zones: readonly string[];
  readonly summary: string;
  readonly documentUrl: string;
}

export interface ForecastPoint {
  readonly validAt: string;
  readonly tempC: number | null;
  readonly windKmh: number | null;
  /** Racha máxima del tramo. AEMET la publica; Open-Meteo no ⇒ `null`. */
  readonly gustKmh?: number | null;
  readonly precipMm: number | null;
  readonly snowLineM: number | null;
  readonly condition: string | null;
  /**
   * Probabilidad de nieve del tramo HORARIO en % (0-100). Open-Meteo no la
   * publica ⇒ se omite o `null`.
   *
   * OJO (defecto 4 de la re-verificación real): AEMET publica `probNieve` por
   * DÍA (`periodo: "1901"`), NO por hora. Por eso este campo queda `null` con
   * AEMET y el valor diario se sirve en `ForecastBundle.daily`. No se reparte
   * entre horas: eso inventaría precisión. `nieve` de AEMET tampoco se mapea
   * aquí: el servicio lo documenta como ESPESOR en el suelo (cm), no como
   * precipitación del tramo.
   *
   * Añadido aditivo en SNOW-03b: opcional para no romper a los consumidores.
   */
  readonly probSnowPct?: number | null;
}

export interface ForecastBundle {
  readonly points: readonly ForecastPoint[];
  readonly horizonHours: number;
  /**
   * Valores que el proveedor publica por DÍA y **no** por hora (SNOW-03b,
   * defecto 4 de la re-verificación real). AEMET publica `probNieve` con
   * `periodo: "1901"` («todo el día»): no es de una hora concreta y no puede
   * repartirse entre las horas sin afirmar una precisión que la fuente no da.
   * Se expone aquí, agregado, en vez de dejarlo en un `null` silencioso.
   *
   * Opcional y aditivo: los proveedores que publican todo por hora la omiten.
   */
  readonly daily?: readonly ForecastDailyAggregate[];
}

/** Agregado diario publicado por la fuente (ver `ForecastBundle.daily`). */
export interface ForecastDailyAggregate {
  /** Día local del proveedor, `YYYY-MM-DD`. */
  readonly day: string;
  /** Probabilidad de nieve del día en % (0-100), o `null` si no la publica. */
  readonly snowProbabilityPct: number | null;
}

export interface WeatherAlertItem {
  readonly id: string;
  readonly level: 'yellow' | 'orange' | 'red' | 'green';
  readonly phenomenon: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly area: string;
  /**
   * Enlace público al aviso original. Los T&C de MeteoAlarm exigen que toda
   * redistribución por aplicación incluya un enlace a www.meteoalarm.org, así
   * que el consumidor debe poder construir el enlace con cada aviso. `null`
   * cuando la fuente no publica uno (nunca se inventa una URL).
   */
  readonly link: string | null;
}

export interface WeatherAlertBundle {
  readonly alerts: readonly WeatherAlertItem[];
  /**
   * Texto de atribución obligatorio ya resuelto (NMHS si el bundle es de un
   * solo país; «EUMETNET – MeteoAlarm» si es multi-país).
   */
  readonly attribution?: string | null;
  /** DISCLAIMER LITERAL exigido por los T&C (se publica, no se parafrasea). */
  readonly disclaimer?: string | null;
  /** Enlace que la licencia obliga a incluir en toda redistribución. */
  readonly sourceUrl?: string | null;
}

export interface BasemapConfig {
  readonly styleUrlOrTemplate: string;
  readonly kind: 'vector-pmtiles' | 'raster-xyz' | 'wmts';
  readonly requiresAttributionOnMap: boolean;
}

/** Webcams: NO hay datos, solo permiso de enlace saliente (embedAllowed siempre false). */
export interface ImageGrant {
  readonly operatorName: string;
  readonly linkUrl: string;
  readonly embedAllowed: false;
}

export interface DataTypeMap {
  'station-master': StationMaster;
  'operational-status': OperationalStatus;
  'snow-depth': SnowDepthReport;
  forecast: ForecastBundle;
  'weather-alert': WeatherAlertBundle;
  avalanche: AvalancheBulletin;
  basemap: BasemapConfig;
  image: ImageGrant;
}

export type PayloadFor<T extends SnowDataType> = DataTypeMap[T];
