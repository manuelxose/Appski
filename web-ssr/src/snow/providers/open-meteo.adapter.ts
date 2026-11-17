import type {
  Authorization,
  LicenseStatus,
  ProviderAdapter,
  ProviderInput,
  ProviderResult,
  SnowDataType,
} from '../contracts/provider-contracts';
import type { ForecastBundle, ForecastPoint } from '../contracts/data-type-map';
import { buildUserAgent, redactUrl } from '../config/env';
import { normalizeNoData } from './normalize';
import { makeProvenance } from './provenance';
import { globalFetchClient, type HttpClient } from './http-client';

/**
 * Adapter REAL de Open-Meteo (SNOW-03, Fase C).
 *
 * Fuente: API pública JSON de Open-Meteo (`/v1/forecast`), sin credencial.
 *
 * Principios:
 * - Datos REALES: se pide `hourly` y `current` reales y se normaliza lo que llega.
 *   Ausencia de un campo ⇒ `null`. Nunca 0/-1/-99 como "sin dato".
 * - Degradación honesta: timeout, HTTP no-2xx, JSON inválido o forma inesperada
 *   producen `error`/`no_data`; jamás datos sintéticos.
 * - Licencia SEPARADA del código: este adapter NO declara uso autorizado. Si la
 *   autorización inyectada no está verificada (`commercialUse`/`storageAllowed`
 *   false), `fetch` devuelve `blocked` SIN tocar la red. El veredicto de licencia
 *   llega de la Fase A (registro verificado), no de este fichero.
 */

export const OPEN_METEO_DEFAULT_BASE = 'https://api.open-meteo.com/v1/forecast';

/** Variables pedidas; se mantienen explícitas para no depender de defaults remotos. */
const HOURLY_VARS = ['temperature_2m', 'wind_speed_10m', 'precipitation', 'snowfall', 'weather_code'] as const;

export interface OpenMeteoAdapterOptions {
  readonly http?: HttpClient;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  /** User-Agent obligatorio (05b §4.3). */
  readonly siteUrl?: string;
  readonly contactEmail?: string;
  readonly forecastHours?: number;
}

/** Estructura mínima esperada de la respuesta (sólo lo que consumimos). */
interface OpenMeteoResponse {
  readonly hourly?: {
    readonly time?: readonly string[];
    readonly temperature_2m?: readonly (number | null)[];
    readonly wind_speed_10m?: readonly (number | null)[];
    readonly precipitation?: readonly (number | null)[];
    readonly snowfall?: readonly (number | null)[];
    readonly weather_code?: readonly (number | null)[];
  };
  /** El endpoint /forecast responde `reason` cuando hay error lógico. */
  readonly reason?: string;
  readonly error?: boolean;
}

/** `true` sólo si la licencia permite usar Y almacenar de verdad. */
export function isLicenseCleared(authorization: Authorization): boolean {
  return authorization.commercialUse && authorization.storageAllowed && authorization.licenseId !== 'blocked';
}

/**
 * Construye la URL exacta. Coordenadas redondeadas a 4 decimales (~11 m) para
 * no depender de precisión espuria. `timezone=UTC` fija el formato de `time`.
 */
export function buildForecastUrl(
  lat: number,
  lng: number,
  forecastDays: number,
  baseUrl: string = OPEN_METEO_DEFAULT_BASE,
): string {
  const url = new URL(baseUrl);
  url.searchParams.set('latitude', lat.toFixed(4));
  url.searchParams.set('longitude', lng.toFixed(4));
  url.searchParams.set('hourly', HOURLY_VARS.join(','));
  url.searchParams.set('current', 'temperature_2m,wind_speed_10m,weather_code');
  url.searchParams.set('forecast_days', String(forecastDays));
  url.searchParams.set('timezone', 'UTC');
  return url.toString();
}

/** WMO weather code → etiqueta corta en español. Desconocido ⇒ null (no se inventa). */
export function wmoCondition(code: number | null): string | null {
  if (code === null || !Number.isFinite(code)) return null;
  if (code === 0) return 'despejado';
  if (code === 1) return 'mayormente despejado';
  if (code === 2) return 'parcialmente nublado';
  if (code === 3) return 'nublado';
  if (code === 45 || code === 48) return 'niebla';
  if (code >= 51 && code <= 57) return 'llovizna';
  if (code >= 61 && code <= 67) return 'lluvia';
  if (code >= 71 && code <= 77) return 'nieve';
  if (code >= 80 && code <= 82) return 'chubascos';
  if (code === 85 || code === 86) return 'chubascos de nieve';
  if (code >= 95 && code <= 99) return 'tormenta';
  return null;
}

/** Precipitación en forma de nieve (cm) → línea de cota aproximada no disponible. */
export function parseForecastBody(bodyText: string): ForecastBundle | null {
  let parsed: OpenMeteoResponse;
  try {
    parsed = JSON.parse(bodyText) as OpenMeteoResponse;
  } catch {
    return null;
  }
  if (parsed.error === true) return null;

  const hourly = parsed.hourly;
  const times = hourly?.time;
  if (!Array.isArray(times) || times.length === 0) return null;

  const at = (series: readonly (number | null)[] | undefined, i: number): number | null => {
    if (!series) return null;
    return normalizeNoData(series[i] ?? null);
  };

  const points: ForecastPoint[] = [];
  for (let i = 0; i < times.length; i += 1) {
    const raw = times[i];
    if (typeof raw !== 'string') return null;
    // Open-Meteo con timezone=UTC devuelve "YYYY-MM-DDTHH:MM" sin sufijo: es UTC.
    const iso = raw.length === 16 ? `${raw}:00Z` : raw;
    const validMs = Date.parse(iso);
    if (!Number.isFinite(validMs)) return null;

    points.push({
      validAt: new Date(validMs).toISOString(),
      tempC: at(hourly?.temperature_2m, i),
      // wind_speed_10m ya viene en km/h por defecto (verificado en fixtures).
      windKmh: at(hourly?.wind_speed_10m, i),
      precipMm: at(hourly?.precipitation, i),
      // No hay campo de cota de nieve en Open-Meteo: null, nunca un valor inventado.
      snowLineM: null,
      condition: wmoCondition(at(hourly?.weather_code, i)),
    });
  }

  if (points.length === 0) return null;
  return { points, horizonHours: points.length };
}

/** Días de pronóstico para cubrir ~`forecastHours` (mínimo 1, máximo 16). */
function daysFor(hours: number): number {
  const days = Math.ceil(hours / 24);
  return Math.min(16, Math.max(1, days));
}

export function openMeteoAdapter(
  authorization: Authorization,
  options: OpenMeteoAdapterOptions = {},
): ProviderAdapter<ForecastBundle> {
  const http = options.http ?? globalFetchClient;
  const baseUrl = options.baseUrl ?? OPEN_METEO_DEFAULT_BASE;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const forecastHours = options.forecastHours ?? 48;
  const userAgent = buildUserAgent(options.siteUrl ?? 'https://appski.example', options.contactEmail ?? 'ops@appski.example');

  const provides: readonly SnowDataType[] = ['forecast'];
  const licenseStatus: LicenseStatus = isLicenseCleared(authorization)
    ? authorization.attributionRequired
      ? 'allowed-with-attribution'
      : 'allowed'
    : 'unverified';

  const licenseByType: Partial<Record<SnowDataType, LicenseStatus>> = { forecast: licenseStatus };
  const attribution: string | null = authorization.attributionRequired && isLicenseCleared(authorization)
    ? 'Weather data by Open-Meteo.com (CC BY 4.0)'
    : null;

  return {
    id: 'open-meteo',
    provides,
    licenseByType,
    isTerminal: false,
    canServe: (input) => input.dataType === 'forecast',

    async fetch(input: ProviderInput): Promise<ProviderResult<ForecastBundle>> {
      const now = input.requestedAt;
      const prov = (status: 'live' | 'degraded' | 'stale' = 'live') =>
        makeProvenance(
          'open-meteo',
          licenseStatus,
          now.toISOString(),
          null,
          now,
          authorization,
          attribution,
          status,
        );

      // Guarda de licencia: sin veredicto verificado NO se llama al proveedor.
      if (!isLicenseCleared(authorization)) {
        return {
          status: 'blocked',
          provenance: prov('degraded'),
          reason: `open-meteo license not verified (registryRef=${authorization.registryRef}); refusing to fetch`,
        };
      }

      const url = buildForecastUrl(
        input.stationRef.lat,
        input.stationRef.lng,
        daysFor(forecastHours),
        baseUrl,
      );
      const outcome = await http({ url, timeoutMs, userAgent });

      if (outcome.kind === 'timeout') {
        return {
          status: 'error',
          provenance: prov('degraded'),
          message: `timeout after ${outcome.timeoutMs}ms calling ${redactUrl(url)}`,
          retryable: true,
        };
      }
      if (outcome.kind === 'network_error') {
        return {
          status: 'error',
          provenance: prov('degraded'),
          message: `network error: ${outcome.message}`,
          retryable: true,
        };
      }
      if (outcome.kind === 'http_error') {
        if (outcome.status === 429) {
          return {
            status: 'rate_limited',
            provenance: prov('degraded'),
            retryAfterMs: outcome.retryAfterMs ?? 60_000,
          };
        }
        return {
          status: 'error',
          provenance: prov('degraded'),
          message: `HTTP ${outcome.status} from ${redactUrl(url)}`,
          // 5xx es transitorio; 4xx (salvo 429) no se arregla reintentando.
          retryable: outcome.status >= 500,
        };
      }

      const bundle = parseForecastBody(outcome.bodyText);
      if (bundle === null) {
        return {
          status: 'no_data',
          provenance: prov('degraded'),
          reason: 'source-silent',
        };
      }

      return { status: 'ok', data: bundle, provenance: prov('live') };
    },

    attribution: () => attribution,
  };
}
