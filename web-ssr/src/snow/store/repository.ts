import type { ProviderId } from '../contracts/provider-contracts';
import type { Station } from '../models/station';
// VALIDACIÓN de entrada del borde; la PERSISTENCIA sigue siendo solo la interfaz
// de abajo (JSON v1/SQLite). No se cambia el adaptador en esta tarea.
import type { NewSnowReportInput, SnowReport } from '../models/snow-report';
import { parseOperationalStatus, parseSnowDepthReport } from './editorial-payload';

/**
 * Interfaces de persistencia. El servidor importa SOLO estas interfaces; la
 * implementación (JSON v1, SQLite futuro) se inyecta. R2.
 */

export interface StationRepository {
  list(): Promise<readonly Station[]>;
  findBySlug(slug: string): Promise<Station | null>;
  upsert(s: Station): Promise<void>;
}

export interface SnowReportRepository {
  listPublished(at: Date): Promise<readonly SnowReport[]>;
  listAll(): Promise<readonly SnowReport[]>;
  latestPublishedForStation(stationSlug: string, at: Date): Promise<SnowReport | null>;
  insert(r: SnowReport): Promise<void>;
}

export interface ForecastCacheEntry {
  readonly stationSlug: string;
  readonly source: ProviderId;
  /**
   * Coordenadas del punto consultado (SNOW-03). Junto a `stationSlug`+`source`
   * forman la identidad del cacheo: reubicar una estación NO puede reutilizar
   * el pronóstico de otro punto. Redondeadas a 4 decimales por el adapter.
   */
  readonly lat: number | null;
  readonly lng: number | null;
  readonly observedAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly payloadJson: string;
}

export interface ForecastCacheRepository {
  get(stationSlug: string, source: ProviderId): Promise<ForecastCacheEntry | null>;
  put(e: ForecastCacheEntry): Promise<void>;
}

// ---------------------------------------------------------------------------
// Validación del borde editorial (05b §7.3, C24b–e)
// ---------------------------------------------------------------------------

export interface EditorialValidationError {
  readonly field: string;
  readonly message: string;
}

export type NewReportParseResult =
  | { ok: true; input: NewSnowReportInput }
  | { ok: false; errors: readonly EditorialValidationError[] };

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isIsoDate(s: string): boolean {
  return ISO_RE.test(s) && !Number.isNaN(Date.parse(s));
}

/**
 * Parsea `req.body` EXPLÍCITAMENTE (sin `as` al tipo de dominio) y valida los
 * campos obligatorios. Devuelve el primer error por campo con su nombre.
 */
export function parseNewReportInput(body: unknown): NewReportParseResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: [{ field: 'body', message: 'must be a JSON object' }] };
  }
  const b = body as Record<string, unknown>;

  const stationSlug = b['stationSlug'];
  const observedAt = b['observedAt'];
  const sourceUrl = b['sourceUrl'];
  const author = b['author'];
  const confidence = b['confidence'];

  if (typeof stationSlug !== 'string' || stationSlug.length === 0) {
    return { ok: false, errors: [{ field: 'stationSlug', message: 'is required (string)' }] };
  }
  if (typeof observedAt !== 'string' || !isIsoDate(observedAt)) {
    return { ok: false, errors: [{ field: 'observedAt', message: 'is required and must be ISO 8601' }] };
  }
  if (typeof sourceUrl !== 'string' || !isHttpUrl(sourceUrl)) {
    return { ok: false, errors: [{ field: 'sourceUrl', message: 'is required and must be a valid http/https URL' }] };
  }
  if (typeof author !== 'string' || author.trim().length === 0) {
    return { ok: false, errors: [{ field: 'author', message: 'is required (non-empty human operator)' }] };
  }
  if (typeof confidence !== 'number' || !Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return { ok: false, errors: [{ field: 'confidence', message: 'is required and must be a number in [0,1]' }] };
  }

  const avRaw = b['avalancheLevel'];
  let avalancheLevel: number | null = null;
  if (avRaw !== null && avRaw !== undefined) {
    if (typeof avRaw !== 'number' || !Number.isInteger(avRaw) || avRaw < 1 || avRaw > 5) {
      return { ok: false, errors: [{ field: 'avalancheLevel', message: 'must be integer 1..5 or null' }] };
    }
    avalancheLevel = avRaw;
  }

  const moodRaw = b['mood'];
  const mood: NewSnowReportInput['mood'] =
    moodRaw === 'draft' || moodRaw === 'pending' || moodRaw === 'published' || moodRaw === 'rejected'
      ? moodRaw
      : undefined;

  // Carga editorial anidada (F1): se VALIDA campo a campo antes de aceptarla.
  // Un `as` aquí saltaba la validación y dejaba persistir centinelas (-99) como
  // si fueran datos. Ausencia ⇒ null; negativo/tipo erróneo ⇒ 400 con su campo.
  const op = parseOperationalStatus(b['operational']);
  const sd = parseSnowDepthReport(b['snow']);
  const payloadErrors: EditorialValidationError[] = [...(op.ok ? [] : op.errors), ...(sd.ok ? [] : sd.errors)];
  if (payloadErrors.length > 0) return { ok: false, errors: payloadErrors };
  const operational: NewSnowReportInput['operational'] = op.ok ? op.value : null;
  const snow: NewSnowReportInput['snow'] = sd.ok ? sd.value : null;

  return {
    ok: true,
    input: { stationSlug, observedAt, sourceUrl, author, confidence, operational, snow, avalancheLevel, mood },
  };
}

// ---------------------------------------------------------------------------
// Validación del upsert del maestro de estaciones (PUT /admin/stations/:slug)
// ---------------------------------------------------------------------------

export type StationUpsertParseResult =
  | { ok: true; station: Station }
  | { ok: false; errors: readonly EditorialValidationError[] };

/** Claves aceptadas en el cuerpo del maestro. Una clave extra ⇒ 400 (no se ignora). */
export const STATION_KEYS = [
  'slug',
  'name',
  'country',
  'region',
  'discipline',
  'lat',
  'lng',
  'altitudeBaseM',
  'altitudeTopM',
  'website',
  'seasonOpen',
  'seasonClose',
  'seasonConfirmed',
] as const;

const COUNTRIES = ['ES', 'AD', 'FR', 'PT'] as const;
const DISCIPLINES = ['alpine', 'nordic'] as const;
const MM_DD_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;
/** Mismo patrón que el slug público de las URLs (`baqueira-beret`). */
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * PUT `/v1/admin/stations/:slug` es REEMPLAZO COMPLETO del recurso (no merge;
 * decisión ratificada del capitán): enviar sólo `{"website": "…"}` devuelve 400
 * por los campos obligatorios. Para que eso no parezca un bug del servidor, el
 * PRIMER campo del 400 lo declara con el texto canónico del contrato (R2).
 * No cambia tipos ni la firma.
 */
function withPutSemantics(errors: readonly EditorialValidationError[]): readonly EditorialValidationError[] {
  return [
    {
      field: 'body',
      message:
        'PUT replaces the whole station resource (no merge): send every required field ' +
        '(slug,name,country,region,discipline,lat,lng,seasonConfirmed)',
    },
    ...errors,
  ];
}

/**
 * Parsea el cuerpo del upsert del maestro de forma ESTRICTA y sin `as` al tipo
 * de dominio: campo obligatorio, tipo, rango y claves desconocidas. Los campos
 * nulos son `null` explícito (ausencia), nunca `0` ni `-99` (regla anti-sentinel).
 */
export function parseStationUpsert(body: unknown): StationUpsertParseResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, errors: [{ field: 'body', message: 'must be a JSON object' }] };
  }
  const b = body as Record<string, unknown>;
  const errors: EditorialValidationError[] = [];

  for (const key of Object.keys(b)) {
    if (!(STATION_KEYS as readonly string[]).includes(key)) {
      errors.push({ field: key, message: `unknown field (allowed: ${STATION_KEYS.join(', ')})` });
    }
  }

  const slug = b['slug'];
  const name = b['name'];
  const country = b['country'];
  const region = b['region'];
  const discipline = b['discipline'];
  const lat = b['lat'];
  const lng = b['lng'];

  if (typeof slug !== 'string' || !SLUG_RE.test(slug) || slug.length > 80) {
    errors.push({ field: 'slug', message: 'is required (lowercase a-z, 0-9 and single hyphens, max 80)' });
  }
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 120) {
    errors.push({ field: 'name', message: 'is required (non-empty string, max 120)' });
  }
  if (typeof country !== 'string' || !(COUNTRIES as readonly string[]).includes(country)) {
    errors.push({ field: 'country', message: `is required and must be one of: ${COUNTRIES.join(', ')}` });
  }
  if (typeof region !== 'string' || region.trim().length === 0 || region.length > 120) {
    errors.push({ field: 'region', message: 'is required (non-empty string, max 120)' });
  }
  if (typeof discipline !== 'string' || !(DISCIPLINES as readonly string[]).includes(discipline)) {
    errors.push({ field: 'discipline', message: `is required and must be one of: ${DISCIPLINES.join(', ')}` });
  }
  if (!isFiniteNumber(lat) || lat < -90 || lat > 90) {
    errors.push({ field: 'lat', message: 'is required and must be a number in [-90, 90]' });
  }
  if (!isFiniteNumber(lng) || lng < -180 || lng > 180) {
    errors.push({ field: 'lng', message: 'is required and must be a number in [-180, 180]' });
  }

  const altitudeBaseM = nullableNonNegativeInt(b, 'altitudeBaseM', errors);
  const altitudeTopM = nullableNonNegativeInt(b, 'altitudeTopM', errors);
  if (altitudeBaseM !== null && altitudeTopM !== null && altitudeBaseM !== undefined && altitudeTopM !== undefined) {
    if (altitudeBaseM > altitudeTopM) {
      errors.push({ field: 'altitudeBaseM', message: 'must be <= altitudeTopM' });
    }
  }

  const website = b['website'];
  if (website !== null && (typeof website !== 'string' || !isHttpUrl(website))) {
    errors.push({ field: 'website', message: 'must be an http/https URL or null' });
  }

  const seasonOpen = nullableMmDd(b, 'seasonOpen', errors);
  const seasonClose = nullableMmDd(b, 'seasonClose', errors);

  const seasonConfirmed = b['seasonConfirmed'];
  if (typeof seasonConfirmed !== 'boolean') {
    errors.push({ field: 'seasonConfirmed', message: 'is required (boolean)' });
  }
  if (seasonConfirmed === true && (seasonOpen === null || seasonClose === null)) {
    errors.push({
      field: 'seasonConfirmed',
      message: 'cannot be true when seasonOpen/seasonClose are unknown (null)',
    });
  }

  if (errors.length > 0) return { ok: false, errors: withPutSemantics(errors) };
  return {
    ok: true,
    station: {
      slug: slug as string,
      name: name as string,
      country: country as Station['country'],
      region: region as string,
      discipline: discipline as Station['discipline'],
      lat: lat as number,
      lng: lng as number,
      altitudeBaseM: altitudeBaseM as number | null,
      altitudeTopM: altitudeTopM as number | null,
      website: website as string | null,
      seasonOpen: seasonOpen as string | null,
      seasonClose: seasonClose as string | null,
      seasonConfirmed: seasonConfirmed as boolean,
    },
  };
}

/** `undefined` (no presente) | `null` | entero ≥ 0. Negativos ⇒ error (anti-sentinel). */
function nullableNonNegativeInt(
  b: Record<string, unknown>,
  key: string,
  errors: EditorialValidationError[],
): number | null | undefined {
  const v = b[key];
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 100_000) {
    errors.push({ field: key, message: 'must be an integer in [0, 100000] or null (absence is null, never a negative sentinel)' });
    return undefined;
  }
  return v;
}

function nullableMmDd(
  b: Record<string, unknown>,
  key: string,
  errors: EditorialValidationError[],
): string | null | undefined {
  const v = b[key];
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string' || !MM_DD_RE.test(v)) {
    errors.push({ field: key, message: 'must be MM-DD or null' });
    return undefined;
  }
  return v;
}
