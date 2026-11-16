/**
 * Validación EXPLÍCITA de query string en el borde HTTP v1.
 *
 * Regla del contrato: un parámetro que el contrato no declara NO se ignora en
 * silencio — se rechaza con `400 invalid` + `fields[]`. Motivo: ignorar
 * `?snowMin=` (mal escrito) devolvería el directorio completo como si el filtro
 * se hubiera aplicado, y el usuario creería un resultado que no pidió.
 *
 * También se rechaza un parámetro declarado repetido (`?country=ES&country=AD`),
 * porque el contrato no define multi-valor y elegir uno en silencio cambiaría el
 * resultado sin decirlo.
 */
import type { EditorialValidationError } from '../store/repository';

/** Tope duro de `pageSize` (paginación con límite máximo, no negociable). */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/** Tope de `q`: evita que una búsqueda enorme se convierta en trabajo O(n·m). */
export const MAX_Q_LENGTH = 120;

export type QueryParse<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly EditorialValidationError[] };

/** Query cruda tal como la entrega Express (`req.query`). */
export type RawQuery = Readonly<Record<string, unknown>>;

function asSingleString(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  // `?a=1&a=2` llega como array; `?a[]=1` como objeto. Ninguno es el contrato.
  return null;
}

/**
 * Comprueba que no haya claves fuera de `allowed` ni claves repetidas, y que
 * todas las declaradas lleguen como string único.
 */
export function checkKeys(query: RawQuery, allowed: readonly string[]): readonly EditorialValidationError[] {
  const errors: EditorialValidationError[] = [];
  for (const [key, raw] of Object.entries(query)) {
    if (!allowed.includes(key)) {
      errors.push({ field: key, message: `unknown query parameter (allowed: ${allowed.join(', ') || 'none'})` });
      continue;
    }
    if (asSingleString(raw) === null) {
      errors.push({ field: key, message: 'must be given at most once, as a plain value' });
    }
  }
  return errors;
}

/** Entero en `[min,max]`; ausente ⇒ `fallback`. Nunca acepta `''`, `'1.5'`, `' 1'`, `'1e3'`. */
export function intParam(
  query: RawQuery,
  key: string,
  min: number,
  max: number,
  fallback: number | null,
): { ok: true; value: number | null } | { ok: false; error: EditorialValidationError } {
  const raw = query[key];
  if (raw === undefined) return { ok: true, value: fallback };
  const s = asSingleString(raw);
  if (s === null || !/^(0|[1-9][0-9]*)$/.test(s)) {
    return { ok: false, error: { field: key, message: `must be an integer between ${min} and ${max}` } };
  }
  const n = Number(s);
  if (!Number.isSafeInteger(n) || n < min || n > max) {
    return { ok: false, error: { field: key, message: `must be an integer between ${min} and ${max}` } };
  }
  return { ok: true, value: n };
}

/** Decimal finito en `[min,max]`. Ausente ⇒ `fallback`. */
export function numberParam(
  query: RawQuery,
  key: string,
  min: number,
  max: number,
  fallback: number | null,
): { ok: true; value: number | null } | { ok: false; error: EditorialValidationError } {
  const raw = query[key];
  if (raw === undefined) return { ok: true, value: fallback };
  const s = asSingleString(raw);
  if (s === null || s.trim() === '' || !/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(s)) {
    return { ok: false, error: { field: key, message: `must be a number between ${min} and ${max}` } };
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < min || n > max) {
    return { ok: false, error: { field: key, message: `must be a number between ${min} and ${max}` } };
  }
  return { ok: true, value: n };
}

/** Valor de un enum cerrado. Ausente ⇒ `fallback`. Cualquier otro valor ⇒ error con la lista. */
export function enumParam<K extends string>(
  query: RawQuery,
  key: string,
  values: readonly K[],
  fallback: K | null,
): { ok: true; value: K | null } | { ok: false; error: EditorialValidationError } {
  const raw = query[key];
  if (raw === undefined) return { ok: true, value: fallback };
  const s = asSingleString(raw);
  if (s === null || !(values as readonly string[]).includes(s)) {
    return { ok: false, error: { field: key, message: `must be one of: ${values.join(', ')}` } };
  }
  return { ok: true, value: s as K };
}

/** Acumula un resultado parcial descartando el valor: solo se usa para recolectar errores. */
export function keepErrors(
  errors: EditorialValidationError[],
  r: { ok: boolean; error?: EditorialValidationError },
): void {
  if (!r.ok && r.error) errors.push(r.error);
}
