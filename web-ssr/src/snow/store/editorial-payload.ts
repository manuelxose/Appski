import type { OperationalStatus, SnowDepthReport } from '../contracts/data-type-map';

/**
 * Validación de las CARGAS del parte editorial (`operational`, `snow`) SIN `as`
 * al tipo de dominio: cada campo se comprueba (tipo, rango, enum) y una ausencia
 * queda como `null`, jamás como 0/-1/-99 (regla anti-sentinel de SNOW-02 §5.2).
 *
 * Reutilizable por `parseNewReportInput` (borde) y por cualquier otra entrada
 * que transporte estas cargas. Los números NEGATIVOS se rechazan con el nombre
 * del campo: un centinela no es un dato.
 */

export interface PayloadValidationError {
  readonly field: string;
  readonly message: string;
}

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: readonly PayloadValidationError[] };

/**
 * PUNTO DE ENTRADA para el borde editorial: valida a la vez `operational` y
 * `snow` de un cuerpo de parte y traduce un fallo a `fields[]` (los nombres que
 * el borde devuelve en el 400). Evita repetir el mismo patrón en cada llamador.
 *
 * ```ts
 * const payload = parseEditorialPayload(b['operational'], b['snow']);
 * if (!payload.ok) return { ok: false, errors: payload.errors };
 * ```
 */
export interface EditorialPayload {
  readonly operational: OperationalStatus | null;
  readonly snow: SnowDepthReport | null;
}

export function parseEditorialPayload(operational: unknown, snow: unknown): Validated<EditorialPayload> {
  const op = parseOperationalStatus(operational);
  const sd = parseSnowDepthReport(snow);
  const errors: PayloadValidationError[] = [
    ...(op.ok ? [] : op.errors),
    ...(sd.ok ? [] : sd.errors),
  ];
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { operational: op.ok ? op.value : null, snow: sd.ok ? sd.value : null } };
}

const LEVELS = ['green', 'blue', 'red', 'black'] as const;
const QUALITIES: readonly string[] = ['powder', 'fresh', 'packed', 'spring', 'icy', 'wet'];

function isObject(v: unknown): v is Readonly<Record<string, unknown>> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** `null`/ausente ⇒ `null`. Entero ≥ 0 ⇒ número. Cualquier otra cosa ⇒ error. */
export function nonNegativeIntOrNull(v: unknown, field: string, errors: PayloadValidationError[]): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v) || v < 0) {
    errors.push({ field, message: 'must be an integer >= 0 or null (never a negative sentinel)' });
    return null;
  }
  return v;
}

export function nonNegativeNumberOrNull(v: unknown, field: string, errors: PayloadValidationError[]): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    errors.push({ field, message: 'must be a number >= 0 or null (never a negative sentinel)' });
    return null;
  }
  return v;
}

function booleanOrNull(v: unknown, field: string, errors: PayloadValidationError[]): boolean | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'boolean') {
    errors.push({ field, message: 'must be a boolean or null' });
    return null;
  }
  return v;
}

/** Valida `operational` (todas las magnitudes nullables). */
export function parseOperationalStatus(raw: unknown): Validated<OperationalStatus | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (!isObject(raw)) {
    return { ok: false, errors: [{ field: 'operational', message: 'must be an object or null' }] };
  }
  const errors: PayloadValidationError[] = [];
  const liftsOpen = nonNegativeIntOrNull(raw['liftsOpen'], 'operational.liftsOpen', errors);
  const liftsTotal = nonNegativeIntOrNull(raw['liftsTotal'], 'operational.liftsTotal', errors);
  const pistesOpen = nonNegativeIntOrNull(raw['pistesOpen'], 'operational.pistesOpen', errors);
  const pistesTotal = nonNegativeIntOrNull(raw['pistesTotal'], 'operational.pistesTotal', errors);
  const kmOpen = nonNegativeNumberOrNull(raw['kmOpen'], 'operational.kmOpen', errors);
  const kmTotal = nonNegativeNumberOrNull(raw['kmTotal'], 'operational.kmTotal', errors);
  const isOpen = booleanOrNull(raw['isOpen'], 'operational.isOpen', errors);
  if (liftsOpen !== null && liftsTotal !== null && liftsOpen > liftsTotal) {
    errors.push({ field: 'operational.liftsOpen', message: 'cannot exceed liftsTotal' });
  }
  if (pistesOpen !== null && pistesTotal !== null && pistesOpen > pistesTotal) {
    errors.push({ field: 'operational.pistesOpen', message: 'cannot exceed pistesTotal' });
  }
  if (kmOpen !== null && kmTotal !== null && kmOpen > kmTotal) {
    errors.push({ field: 'operational.kmOpen', message: 'cannot exceed kmTotal' });
  }

  const byLevelRaw = raw['byLevel'];
  let byLevel: OperationalStatus['byLevel'] = null;
  if (byLevelRaw !== null && byLevelRaw !== undefined) {
    if (!isObject(byLevelRaw)) {
      errors.push({ field: 'operational.byLevel', message: 'must be an object or null' });
    } else {
      const acc: Record<string, { open: number; total: number }> = {};
      for (const level of LEVELS) {
        const entry = byLevelRaw[level];
        if (entry === undefined || entry === null) continue;
        if (!isObject(entry)) {
          errors.push({ field: `operational.byLevel.${level}`, message: 'must be {open,total}' });
          continue;
        }
        const open = nonNegativeIntOrNull(entry['open'], `operational.byLevel.${level}.open`, errors);
        const total = nonNegativeIntOrNull(entry['total'], `operational.byLevel.${level}.total`, errors);
        if (open === null && total === null) continue;
        const o = open ?? 0;
        const t = total ?? 0;
        if (o > t) errors.push({ field: `operational.byLevel.${level}.open`, message: 'cannot exceed total' });
        acc[level] = { open: o, total: t };
      }
      if (Object.keys(byLevelRaw).some((k) => !(LEVELS as readonly string[]).includes(k))) {
        errors.push({ field: 'operational.byLevel', message: `unknown level (allowed: ${LEVELS.join(', ')})` });
      }
      if (Object.keys(acc).length > 0) {
        byLevel = {
          green: acc['green'] ?? { open: 0, total: 0 },
          blue: acc['blue'] ?? { open: 0, total: 0 },
          red: acc['red'] ?? { open: 0, total: 0 },
          black: acc['black'] ?? { open: 0, total: 0 },
        };
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { liftsOpen, liftsTotal, pistesOpen, pistesTotal, kmOpen, kmTotal, isOpen, byLevel } };
}

/** Valida `snow` (espesores en cm, todos nullables). */
export function parseSnowDepthReport(raw: unknown): Validated<SnowDepthReport | null> {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (!isObject(raw)) {
    return { ok: false, errors: [{ field: 'snow', message: 'must be an object or null' }] };
  }
  const errors: PayloadValidationError[] = [];
  const baseCm = nonNegativeIntOrNull(raw['baseCm'], 'snow.baseCm', errors);
  const midCm = nonNegativeIntOrNull(raw['midCm'], 'snow.midCm', errors);
  const topCm = nonNegativeIntOrNull(raw['topCm'], 'snow.topCm', errors);
  const newSnow24hCm = nonNegativeIntOrNull(raw['newSnow24hCm'], 'snow.newSnow24hCm', errors);
  const qualityRaw = raw['quality'];
  let quality: SnowDepthReport['quality'] = null;
  if (qualityRaw !== null && qualityRaw !== undefined) {
    const known = typeof qualityRaw === 'string' ? QUALITIES.find((q) => q === qualityRaw) : undefined;
    if (known === undefined) {
      errors.push({ field: 'snow.quality', message: `must be one of: ${QUALITIES.join(', ')} or null` });
    } else {
      quality = known as SnowDepthReport['quality'];
    }
  }
  if (baseCm !== null && midCm !== null && baseCm > midCm) errors.push({ field: 'snow.baseCm', message: 'cannot exceed midCm' });
  if (midCm !== null && topCm !== null && midCm > topCm) errors.push({ field: 'snow.midCm', message: 'cannot exceed topCm' });
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { baseCm, midCm, topCm, newSnow24hCm, quality } };
}
