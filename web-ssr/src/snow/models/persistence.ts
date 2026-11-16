import type { SnowQuality } from '../../app/pages/weather/models/meteo.models';
import type { ForecastBundle } from '../contracts/data-type-map';
import type { LicenseStatus, NoDataReason, ProviderId } from '../contracts/provider-contracts';

/**
 * Entidades de persistencia de SNOW-02 §3.1 que no tenían modelo propio.
 *
 * SON DE DOMINIO (como `station.ts` / `snow-report.ts`), no del borde HTTP. Cada
 * una lleva:
 * - `id`: id INTERNO estable asignado por el almacén (v2), nunca una cifra de
 *   dato;
 * - `slug`: identificador legible cuando la entidad se addressing por URL;
 * - `observedAt`/`updatedAt`: fecha del DATO y de la última actualización real
 *   (jamás `updatedAt ?? observedAt`).
 *
 * Regla null ≠ 0: toda magnitud ausente es `null` (o `undefined` en lo
 * opcional), NUNCA 0, -1 ni -99.
 */

/** Ubicación editorial (SNOW-02 §3.1: "coordenadas editoriales, no OSM"). */
export interface StationLocation {
  readonly lat: number;
  readonly lng: number;
  readonly country: 'ES' | 'AD' | 'FR' | 'PT';
  readonly region: string;
}

/**
 * Registro de estación PERSISTIDO = maestro editorial + id interno.
 * `Omit<Station, 'id'>` no aplica: `Station` no tiene id; aquí se AÑADE.
 */
export interface StoredStation {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly country: 'ES' | 'AD' | 'FR' | 'PT';
  readonly region: string;
  readonly discipline: 'alpine' | 'nordic';
  readonly lat: number;
  readonly lng: number;
  readonly altitudeBaseM: number | null;
  readonly altitudeTopM: number | null;
  readonly website: string | null;
  readonly seasonOpen: string | null;
  readonly seasonClose: string | null;
  readonly seasonConfirmed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Observación meteorológica puntual (reloj de estación; magnitudes null si faltan). */
export interface ObservationRecord {
  readonly stationSlug: string;
  readonly source: ProviderId;
  readonly observedAt: string;
  readonly updatedAt: string;
  readonly tempC: number | null;
  readonly windKmh: number | null;
  readonly humidityPct: number | null;
  /** Cota de nieve en metros (null = desconocida). */
  readonly snowLineM: number | null;
  readonly snowHeightCm: number | null;
  readonly condition: string | null;
  readonly quality: SnowQuality | null;
  readonly payloadJson: string | null;
  readonly reason: NoDataReason | null;
}

/** Pronóstico guardado en caché; caduca por `expiresAt` (nunca se sirve como live). */
export interface StoredForecast {
  readonly stationSlug: string;
  readonly source: ProviderId;
  readonly observedAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly horizonHours: number;
  readonly bundle: ForecastBundle;
  readonly licenseStatus: LicenseStatus;
  readonly attribution: string | null;
}

/** Alerta persistida: una estación puede tener varias, identificadas por `id` PROVEEDOR. */
export interface StoredAlert {
  /** Id del proveedor (p. ej. `aemet:2026-11-16:x`); no se fabrica si falta. */
  readonly id: string;
  readonly stationSlug: string;
  readonly source: ProviderId;
  readonly level: 'green' | 'yellow' | 'orange' | 'red';
  readonly phenomenon: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly area: string;
  readonly observedAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string | null;
  readonly licenseStatus: LicenseStatus;
  readonly attribution: string | null;
}

/** Webcam autorizada: permiso de ENLACE saliente; `embedAllowed` es siempre false. */
export interface StoredWebcam {
  readonly stationSlug: string;
  readonly operatorName: string;
  readonly linkUrl: string;
  readonly embedAllowed: false;
  readonly licenseStatus: 'allowed-with-attribution' | 'restricted';
  readonly attribution: string;
  readonly addedAt: string;
  readonly sourceUrl: string;
}

/** Proveedor: veredicto estático + estado operativo mutable. */
export interface StoredProviderState {
  readonly providerId: ProviderId;
  readonly configured: boolean;
  readonly missingEnv: readonly string[];
  readonly note: string | null;
  /** Denegación administrativa: si es true, el adapter no debe servir. */
  readonly disabled: boolean;
  readonly updatedAt: string;
}

/** Procedencia persistida de un dataset (sin la `authorization` estática). */
export interface StoredProvenanceRecord {
  readonly stationSlug: string;
  readonly dataType: string;
  readonly source: ProviderId;
  readonly observedAt: string;
  readonly updatedAt: string | null;
  readonly status: 'live' | 'cached' | 'stale' | 'degraded';
  readonly licenseStatus: LicenseStatus;
  readonly attribution: string | null;
}
