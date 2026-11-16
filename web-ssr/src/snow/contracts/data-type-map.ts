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
  readonly precipMm: number | null;
  readonly snowLineM: number | null;
  readonly condition: string | null;
}

export interface ForecastBundle {
  readonly points: readonly ForecastPoint[];
  readonly horizonHours: number;
}

export interface WeatherAlertItem {
  readonly id: string;
  readonly level: 'yellow' | 'orange' | 'red' | 'green';
  readonly phenomenon: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly area: string;
}

export interface WeatherAlertBundle {
  readonly alerts: readonly WeatherAlertItem[];
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
