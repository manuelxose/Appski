import type { ProviderId } from '../contracts/provider-contracts';
import type { Station } from '../models/station';
import type { NewSnowReportInput, SnowReport } from '../models/snow-report';

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

  // Carga editorial anidada: se acepta tal cual SOLO tras validar los campos
  // obligatorios y comprobar el token de admin en la ruta.
  const operational = (b['operational'] ?? null) as NewSnowReportInput['operational'];
  const snow = (b['snow'] ?? null) as NewSnowReportInput['snow'];

  return {
    ok: true,
    input: { stationSlug, observedAt, sourceUrl, author, confidence, operational, snow, avalancheLevel, mood },
  };
}
