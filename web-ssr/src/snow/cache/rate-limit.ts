import type { ProviderId, RateLimit } from '../contracts/provider-contracts';

/**
 * Cuotas por proveedor (05b §4.3). Todas `verified:false` salvo Protomaps
 * (autohospedado): ningún proveedor publica una cuota legible.
 */
export const RATE_LIMITS: Readonly<Partial<Record<ProviderId, RateLimit>>> = {
  aemet: { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified: AEMET no publica tabla de cuotas; valor conservador propio' },
  'aemet-bpa': { requestsPerMinute: 6, maxConcurrent: 1, verified: false, note: 'unverified: boletín diario; PDF ~179 KB' },
  meteofrance: { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified: portal SPA, cuota no legible' },
  'copernicus-c3s': { requestsPerMinute: 20, maxConcurrent: 2, verified: false, note: 'unverified' },
  'copernicus-clms': { requestsPerMinute: 20, maxConcurrent: 2, verified: false, note: 'unverified' },
  'ign-es': { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified' },
  'ign-fr': { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified' },
  osm: { requestsPerMinute: 10, maxConcurrent: 1, verified: false, note: 'unverified: Overpass/Nominatim tienen política propia; NO se usan en runtime' },
  protomaps: { requestsPerMinute: 600, maxConcurrent: 8, verified: true, note: 'autohospedado: el límite es el del bucket propio' },
  // MeteoAlarm no publica cuota legible. La caché de 10 min (requisito T&C)
  // mantiene la carga real muy por debajo de este valor conservador.
  meteoalarm: { requestsPerMinute: 6, maxConcurrent: 1, verified: false, note: 'unverified: sin cuota publicada; la caché de 10 min acota las llamadas' },
};

/**
 * Límite de tasa REAL del borde (antiabuso), distinto de `RATE_LIMITS` (que es la
 * tabla de cuotas de proveedores externos para telemetría). Ventana fija por
 * clave `cliente#bucket`, en memoria y por proceso: cada `createSnowRouter`
 * recibe una instancia nueva (aislamiento en tests). 429 con `Retry-After`.
 */
export interface RateLimitWindow {
  readonly windowMs: number;
  readonly max: number;
}

export class RateLimiter {
  private readonly hits = new Map<string, { count: number; windowStart: number }>();

  constructor(private readonly window: RateLimitWindow) {}

  /** Registra el intento y decide si está permitido. */
  allow(key: string, now: number = Date.now()): { allowed: boolean; retryAfterMs: number } {
    const s = this.hits.get(key);
    if (!s || now - s.windowStart >= this.window.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      return { allowed: true, retryAfterMs: 0 };
    }
    s.count += 1;
    if (s.count > this.window.max) {
      return { allowed: false, retryAfterMs: this.window.windowMs - (now - s.windowStart) };
    }
    return { allowed: true, retryAfterMs: 0 };
  }
}
