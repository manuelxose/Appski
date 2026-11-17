/**
 * Filtros, orden y paginación del DIRECTORIO de estaciones (`GET /v1/stations`).
 *
 * Contrato (SNOW-02 §4.1 fila 1): país, región, disciplina, estado de temporada,
 * nieve mínima observada, orden, paginación. Nada de esto se calcula "blando":
 *
 *  - El maestro de estaciones es EDITORIAL: no tiene frescura externa. Su
 *    procedencia (`editorial-stations`) es la del propio maestro y NO cambia por
 *    filtrar.
 *  - `snowMin` y `sort=snow` son sobre **nieve OBSERVADA**: salen del último
 *    parte publicado. Si una estación no tiene parte, no tiene nieve: NO cuenta
 *    como 0 cm (regla null ≠ 0 del contrato §5.2) y por tanto queda FUERA de un
 *    filtro `snowMin > 0`, y en `sort=snow` va al final (`snowBaseCm: null`).
 *  - Un dato caducado tampoco se presenta como actual: el parte se marca `stale`
 *    cuando su `observedAt` es más antiguo que `STALE_AFTER_MS`, y el listado lo
 *    expone en `station.snow.status` para que el cliente lo rotule.
 */
import type { NoDataReason, ProviderId } from '../contracts/provider-contracts';
import type { Station } from '../models/station';
import type { SnowReport } from '../models/snow-report';
import type { EditorialValidationError } from '../store/repository';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  checkKeys,
  enumParam,
  intParam,
  keepErrors,
  numberParam,
  type QueryParse,
  type RawQuery,
} from './query';

/** Queries que el contrato NO permite en el directorio (cualquier otra ⇒ 400). */
export const STATION_QUERY_KEYS = [
  'country',
  'region',
  'discipline',
  'status',
  'snowMin',
  'sort',
  'sortDir',
  'page',
  'pageSize',
] as const;

export const STATION_COUNTRIES = ['ES', 'AD', 'FR', 'PT'] as const;
export const STATION_DISCIPLINES = ['alpine', 'nordic'] as const;
/** `open` = temporada declarada abierta hoy; `closed` = cerrada; `unknown` = sin fechas confirmadas. */
export const STATION_SEASONS = ['open', 'closed', 'unknown'] as const;
export const STATION_SORTS = ['name', 'region', 'altitude', 'snow'] as const;
export const SORT_DIRS = ['asc', 'desc'] as const;

/**
 * Umbral de caducidad del parte en el listado. Coincide con el TTL de caché de
 * partes (30 min, 05b): más allá de ese plazo el dado se marca `stale`, nunca
 * `live`.
 */
export const STALE_AFTER_MS = 30 * 60_000;

export interface StationQuery {
  readonly country: (typeof STATION_COUNTRIES)[number] | null;
  readonly region: string | null;
  readonly discipline: (typeof STATION_DISCIPLINES)[number] | null;
  readonly status: (typeof STATION_SEASONS)[number] | null;
  readonly snowMin: number | null;
  readonly sort: (typeof STATION_SORTS)[number];
  readonly sortDir: (typeof SORT_DIRS)[number];
  readonly page: number;
  readonly pageSize: number;
}

/**
 * Nieve observada más reciente por estación, ya con su estado de frescura. Se
 * construye con los partes PUBLICADOS del repositorio: la ausencia es `null`,
 * nunca 0.
 */
export interface SnowObservation {
  readonly baseCm: number;
  readonly observedAt: string;
  readonly updatedAt: string | null;
  readonly source: ProviderId;
  readonly status: 'live' | 'stale';
  readonly reason: NoDataReason | null;
}

export type SnowBySlug = Readonly<Record<string, SnowObservation | undefined>>;

/** Query por defecto del directorio: sin filtros, orden por nombre, página 1. */
export function defaultStationQuery(): StationQuery {
  return {
    country: null,
    region: null,
    discipline: null,
    status: null,
    snowMin: null,
    sort: 'name',
    sortDir: 'asc',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  };
}

export function parseStationQuery(query: RawQuery): QueryParse<StationQuery> {
  const errors: EditorialValidationError[] = [...checkKeys(query, STATION_QUERY_KEYS)];

  const country = enumParam(query, 'country', STATION_COUNTRIES, null);
  keepErrors(errors, country);
  const discipline = enumParam(query, 'discipline', STATION_DISCIPLINES, null);
  keepErrors(errors, discipline);
  const status = enumParam(query, 'status', STATION_SEASONS, null);
  keepErrors(errors, status);
  const sort = enumParam(query, 'sort', STATION_SORTS, 'name');
  keepErrors(errors, sort);
  const sortDir = enumParam(query, 'sortDir', SORT_DIRS, 'asc');
  keepErrors(errors, sortDir);
  const page = intParam(query, 'page', 1, 10_000, 1);
  keepErrors(errors, page);
  const pageSize = intParam(query, 'pageSize', 1, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE);
  keepErrors(errors, pageSize);
  const snowMin = numberParam(query, 'snowMin', 0, 10_000, null);
  keepErrors(errors, snowMin);

  const regionRaw = query['region'];
  let region: string | null = null;
  if (regionRaw !== undefined) {
    const s = typeof regionRaw === 'string' ? regionRaw.trim() : '';
    if (s.length === 0) errors.push({ field: 'region', message: 'must be a non-empty string' });
    else region = s;
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      country: country.ok ? country.value : null,
      region,
      discipline: discipline.ok ? discipline.value : null,
      status: status.ok ? status.value : null,
      snowMin: snowMin.ok ? snowMin.value : null,
      sort: (sort.ok && sort.value) || 'name',
      sortDir: (sortDir.ok && sortDir.value) || 'asc',
      page: (page.ok && page.value) || 1,
      pageSize: (pageSize.ok && pageSize.value) || DEFAULT_PAGE_SIZE,
    },
  };
}

/**
 * Estado de temporada respecto de `now` (`MM-DD`, sin año).
 *
 * Sin fechas declaradas ⇒ `unknown` SIEMPRE (no se inventa "cerrada": la falta de
 * dato no es una ausencia de temporada). Con fechas pero sin confirmar, la
 * ventana declarada sigue siendo información útil, así que se evalúa.
 */
export function seasonState(s: Station, now: Date): (typeof STATION_SEASONS)[number] {
  if (s.seasonOpen === null || s.seasonClose === null) return 'unknown';
  const today = `${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
  // Temporada que cruza fin de año (p. ej. 11-30 → 04-30).
  const wrap = s.seasonOpen > s.seasonClose;
  const open = wrap ? today >= s.seasonOpen || today <= s.seasonClose : today >= s.seasonOpen && today <= s.seasonClose;
  return open ? 'open' : 'closed';
}

export interface StationQueryResult {
  readonly filtered: readonly Station[];
  readonly pageItems: readonly Station[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly totalPages: number;
  readonly hasNext: boolean;
  readonly hasPrev: boolean;
}

/**
 * Aplica filtros → orden → paginación, en ese orden (un total paginado que
 * dependiera del orden sería incoherente). Determinista: desempate por `slug`.
 */
export function applyStationQuery(
  all: readonly Station[],
  q: StationQuery,
  snow: SnowBySlug,
  now: Date,
): StationQueryResult {
  const needle = q.region?.toLowerCase() ?? null;
  const filtered = all
    .filter((s) => q.country === null || s.country === q.country)
    .filter((s) => needle === null || s.region.toLowerCase().includes(needle))
    .filter((s) => q.discipline === null || s.discipline === q.discipline)
    .filter((s) => q.status === null || seasonState(s, now) === q.status)
    .filter((s) => {
      if (q.snowMin === null) return true;
      const obs = snow[s.slug];
      // Sin observación NO es 0 cm: es "sin dato", y no satisface un mínimo.
      return obs !== undefined && obs.baseCm >= q.snowMin;
    });

  const dir = q.sortDir === 'asc' ? 1 : -1;
  const sorted = [...filtered].sort((a, b) => dir * compareBy(q.sort, a, b, snow) || a.slug.localeCompare(b.slug));

  const total = sorted.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
  const start = (q.page - 1) * q.pageSize;
  const pageItems = sorted.slice(start, start + q.pageSize);
  return {
    filtered: sorted,
    pageItems,
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages,
    hasNext: start + q.pageSize < total,
    hasPrev: q.page > 1,
  };
}

function compareBy(
  sort: StationQuery['sort'],
  a: Station,
  b: Station,
  snow: SnowBySlug,
): number {
  switch (sort) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'region':
      return a.region.localeCompare(b.region);
    case 'altitude':
      // Una altitud desconocida (null) no es 0 m: va siempre al final.
      return cmpNullLast(a.altitudeTopM, b.altitudeTopM);
    case 'snow':
      return cmpNullLast(snow[a.slug]?.baseCm ?? null, snow[b.slug]?.baseCm ?? null);
  }
}

function cmpNullLast(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a - b;
}

/**
 * REGLA DE FRESCURA EDITORIAL ÚNICA (R3, ratificada en el contrato §9).
 *
 * `age = now − max(observedAt, capturedAt)`; `live` si `age ∈ [0, STALE_AFTER_MS]`,
 * `stale` en otro caso. Se toma el LATER de los dos instantes porque:
 *  - `observedAt` es la fecha del DATO (antigüedad del parte que el operador lee);
 *  - `capturedAt` es cuándo el operador lo transcribió. Un parte recién guardado
 *    con `observedAt` de ayer no puede nacer caducado, pero uno viejo sigue siéndolo.
 *
 * El TTL de 30 min de AEMET es caché de PROVEEDOR, no frescura editorial: aquí
 * `STALE_AFTER_MS` es deliberadamente el mismo número solo como umbral editorial
 * compartido entre /report, directorio y rankings — una sola función, no tres.
 */
export function editorialFreshness(
  observedAt: string,
  capturedAt: string | null,
  now: Date,
): 'live' | 'stale' {
  const observedMs = Date.parse(observedAt);
  const capturedMs = capturedAt === null ? Number.NaN : Date.parse(capturedAt);
  const candidates = [observedMs, capturedMs].filter((v) => Number.isFinite(v));
  if (candidates.length === 0) return 'stale'; // fecha ilegible: no se presume fresco
  const mostRecent = Math.max(...candidates);
  const ageMs = now.getTime() - mostRecent;
  // Edad negativa = instante futuro: tampoco se presume fresco.
  return ageMs >= 0 && ageMs <= STALE_AFTER_MS ? 'live' : 'stale';
}

/**
 * Observación de nieve por estación a partir de los partes PUBLICADOS: el más
 * reciente por `observedAt` gana. La frescura sale de `editorialFreshness` (R3).
 *
 * `reason` queda `null` porque aquí sí hay observación; el motivo de ausencia
 * (`outside-season`) vive en `GET /v1/stations` (raíz) y en `/report`.
 */
export function snowObservations(reports: readonly SnowReport[], now: Date, source: ProviderId): Record<string, SnowObservation> {
  const out: Record<string, SnowObservation> = {};
  const latest = new Map<string, SnowReport>();
  for (const r of reports) {
    if (r.mood !== 'published') continue;
    const prev = latest.get(r.stationSlug);
    if (!prev || r.observedAt > prev.observedAt) latest.set(r.stationSlug, r);
  }
  for (const [slug, r] of latest) {
    const baseCm = r.snow?.baseCm;
    if (baseCm === null || baseCm === undefined) continue; // sin espesor: sin observación, no 0
    out[slug] = {
      baseCm,
      observedAt: r.observedAt,
      updatedAt: r.capturedAt,
      source,
      status: editorialFreshness(r.observedAt, r.capturedAt, now),
      reason: null,
    };
  }
  return out;
}
