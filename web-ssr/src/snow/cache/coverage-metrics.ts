import type { ProviderId, SnowDataType } from '../contracts/provider-contracts';
import { FALLBACK_CHAINS } from '../chain/fallback-chains';
import type { BreakerPhase } from '../cache/breaker';

/**
 * Métricas de COBERTURA por tipo de dato y país (SNOW-03, Fase E).
 *
 * Regla de oro: esto DESCRIBE lo medido, no promete cobertura. Un tipo de dato
 * está `available` sólo si existe al menos un eslabón en su cadena que hoy
 * podría servir; `degraded` si algún eslabón está abierto en el breaker;
 * `none` si la cadena está vacía o todos sus eslabones están bloqueados.
 *
 * NO se exponen nombres de variables de entorno ni secretos: sólo un booleano
 * `configured` y el número de variables ausentes.
 */

export const COUNTRIES = ['ES', 'AD', 'FR', 'PT'] as const;
export type Country = (typeof COUNTRIES)[number];

export interface ProviderRuntimeState {
  readonly id: ProviderId;
  readonly configured: boolean;
  readonly missingEnvCount: number;
  readonly licenseStatus: 'allowed' | 'allowed-with-attribution' | 'restricted' | 'blocked' | 'unverified';
  readonly breakerPhase: BreakerPhase;
  readonly breakerOpenUntil: string | null;
  readonly lastSuccessAt: string | null;
  readonly lastLatencyMs: number | null;
  readonly attempts: number;
  readonly failures: number;
  /** Segundos desde el último éxito; null si nunca hubo éxito. */
  readonly stalenessSeconds: number | null;
}

export interface DataTypeCoverage {
  readonly dataType: SnowDataType;
  readonly state: 'available' | 'degraded' | 'none';
  /** Eslabones declarados en la cadena de fallback, en orden. */
  readonly chain: readonly ProviderId[];
  /** Eslabones que hoy podrían servir (configurados y no bloqueados por licencia). */
  readonly serving: readonly ProviderId[];
  /** Eslabones con el circuit abierto. */
  readonly open: readonly ProviderId[];
  readonly reason: string | null;
}

export interface CountryCoverage {
  readonly country: Country;
  readonly stations: number;
  /** Estaciones con al menos un dato de nieve servible hoy. */
  readonly withSnowData: number;
}

export interface CoverageReport {
  readonly generatedAt: string;
  readonly providers: readonly ProviderRuntimeState[];
  readonly byDataType: readonly DataTypeCoverage[];
  readonly byCountry: readonly CountryCoverage[];
}

/**
 * ¿Un proveedor puede servir HOY? Configurado, con licencia utilizable y con el
 * circuit cerrado o en half-open.
 *
 * Un circuit `open` significa que el pipeline suprime la llamada: contarlo como
 * servible sería inflar cobertura. `half-open` sí cuenta (se está sondeando).
 */
export function canServe(runtime: ProviderRuntimeState): boolean {
  if (!runtime.configured) return false;
  if (runtime.breakerPhase === 'open') return false;
  return runtime.licenseStatus === 'allowed' || runtime.licenseStatus === 'allowed-with-attribution';
}

/** Cobertura de UN tipo de dato a partir del estado real de sus eslabones. */
export function coverageFor(
  dataType: SnowDataType,
  runtimeById: ReadonlyMap<ProviderId, ProviderRuntimeState>,
): DataTypeCoverage {
  const chain = FALLBACK_CHAINS[dataType] ?? [];
  const serving: ProviderId[] = [];
  const open: ProviderId[] = [];

  for (const id of chain) {
    const runtime = runtimeById.get(id);
    // Sin estado runtime = no adjuntado como eslabón activo (p. ej. fuera del
    // registry). Se considera NO servible: nunca "disponible por defecto".
    if (runtime === undefined) continue;
    if (runtime.breakerPhase === 'open') open.push(id);
    if (canServe(runtime)) serving.push(id);
  }

  let state: DataTypeCoverage['state'];
  let reason: string | null = null;
  if (chain.length === 0) {
    state = 'none';
    reason = 'sin cadena de fallback legal para este tipo de dato';
  } else if (serving.length === 0) {
    state = 'none';
    reason =
      open.length > 0
        ? `todos los eslabones utilizables están con circuit abierto: ${open.join(', ')}`
        : 'ningún eslabón de la cadena puede servir hoy (sin configurar, con licencia no utilizable o fuera del registry)';
  } else if (open.length > 0) {
    state = 'degraded';
    reason = `circuit abierto en: ${open.join(', ')}`;
  } else {
    state = 'available';
  }

  return { dataType, state, chain, serving, open, reason };
}

export function buildCoverageReport(input: {
  readonly generatedAt: string;
  readonly providers: readonly ProviderRuntimeState[];
  readonly stationsByCountry: Readonly<Record<Country, { total: number; withSnowData: number }>>;
}): CoverageReport {
  const runtimeById = new Map<ProviderId, ProviderRuntimeState>(input.providers.map((p) => [p.id, p]));
  const dataTypes: SnowDataType[] = [
    'station-master',
    'operational-status',
    'snow-depth',
    'forecast',
    'weather-alert',
    'avalanche',
    'basemap',
    'image',
  ];
  return {
    generatedAt: input.generatedAt,
    providers: input.providers,
    byDataType: dataTypes.map((dt) => coverageFor(dt, runtimeById)),
    byCountry: COUNTRIES.map((country) => ({
      country,
      stations: input.stationsByCountry[country]?.total ?? 0,
      withSnowData: input.stationsByCountry[country]?.withSnowData ?? 0,
    })),
  };
}
