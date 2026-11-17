/**
 * Capa HTTP mínima para adapters de proveedor (SNOW-03, Fase C).
 *
 * Por qué existe: los adapters necesitan (a) un timeout duro, (b) límites y
 * User-Agent, y (c) un punto de inyección para que los tests replayen fixtures
 * grabadas sin tocar la red. Sin dependencias: usa `fetch` global.
 *
 * Reglas:
 * - NUNCA lanza por un fallo de red: devuelve un resultado discriminado.
 * - El cuerpo se lee SIEMPRE con un tope de bytes (defensa ante respuestas enormes).
 * - No registra cabeceras ni cuerpos en claro (nada de credenciales en logs).
 */

export type HttpOutcome =
  | {
      readonly kind: 'ok';
      readonly status: number;
      readonly bodyText: string;
      readonly contentType: string | null;
      /**
       * Bytes EXACTOS del cuerpo. Opcional para no romper los dobles ya escritos:
       * los adapters que necesitan bytes (AEMET: ISO-8859-15 con BOM) lo usan y
       * los que no, siguen leyendo `bodyText`.
       */
      readonly bodyBytes?: Buffer;
      /** Charset declarado por el servidor en `Content-Type`, en minúsculas. */
      readonly charset?: string | null;
      /** `Retry-After` ya convertido a ms, también para respuestas 2xx. */
      readonly retryAfterMs?: number | null;
    }
  | {
      readonly kind: 'http_error';
      readonly status: number;
      readonly retryAfterMs: number | null;
      /** Cuerpo reducido (≤1 KB) para diagnóstico. NO se registra ni se propaga. */
      readonly bodyText?: string;
      readonly contentType?: string | null;
    }
  | { readonly kind: 'timeout'; readonly timeoutMs: number }
  | { readonly kind: 'network_error'; readonly message: string };

/** Tope del cuerpo que se conserva de una respuesta de error (diagnóstico). */
const ERROR_BODY_MAX = 1024;

/** Extrae el charset de un `Content-Type` (`application/json;charset=ISO-8859-15`). */
export function charsetFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const m = /charset\s*=\s*"?([^";\s]+)"?/i.exec(contentType);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Decodifica un cuerpo respetando su charset declarado y quitando el BOM.
 *
 * AEMET OpenData sirve `application/json;charset=ISO-8859-15` con BOM. Node
 * decodifica por defecto como UTF-8: `JSON.parse` a veces funciona y deja los
 * acentos como U+FFFD, que es una CORRUPCIÓN silenciosa del dato. Aquí se usa el
 * decodificador nativo de `TextDecoder`, sin dependencias externas.
 */
export function decodeBody(bytes: Buffer, charset: string | null): string {
  // El BOM se detecta en BYTES y se retira ANTES de decodificar. Es la única
  // forma portable: `TextDecoder` sólo retira el BOM cuando coincide con el del
  // charset (UTF-8). Un BOM UTF-8 dentro de un cuerpo declarado ISO-8859-15 se
  // decodificaba como «ï»¿» y rompía `JSON.parse` (defecto detectado en t1).
  let body = bytes;
  if (body.length >= 3 && body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf) body = body.subarray(3);

  let label = (charset ?? 'utf-8').trim();
  if (label === 'iso-8859-15' || label === 'iso8859-15' || label === 'latin9' || label === 'latin-9') {
    label = 'iso-8859-15';
  }
  let text: string;
  try {
    text = new TextDecoder(label, { fatal: false }).decode(body);
  } catch {
    // Charset declarado desconocido: se degrada a UTF-8 (mejor esfuerzo) en vez
    // de devolver bytes crudos.
    text = new TextDecoder('utf-8', { fatal: false }).decode(body);
  }
  // Resto de BOM (por si el cuerpo traía dos o el decoder no lo reconoció).
  return text.replace(/^\uFEFF/, '');
}

export interface HttpRequest {
  readonly url: string;
  readonly timeoutMs: number;
  readonly userAgent: string;
  readonly maxBytes?: number;
  /**
   * Cabecera `Accept` a enviar. Por defecto wildcard, NO `application/json`.
   *
   * Hallazgo medido (SNOW-03): MeteoAlarm responde 406 a `application/json` y a
   * `application/atom+xml` (sirve el feed solo si no se le restringe), mientras
   * Open-Meteo responde 200 en todos los casos. Negociar de más rompía el feed.
   */
  readonly accept?: string;
}

/** Firma inyectable: los tests pasan un doble que replayea fixtures. */
export type HttpClient = (request: HttpRequest) => Promise<HttpOutcome>;

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

/** Extrae `Retry-After` (segundos o fecha HTTP) como milisegundos. */
export function parseRetryAfter(value: string | null, nowMs: number): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const dateMs = Date.parse(trimmed);
  if (Number.isFinite(dateMs)) return Math.max(0, dateMs - nowMs);
  return null;
}

export const globalFetchClient: HttpClient = async (request: HttpRequest): Promise<HttpOutcome> => {
  const controller = new AbortController();
  const maxBytes = request.maxBytes ?? DEFAULT_MAX_BYTES;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, request.timeoutMs);

  try {
    const res = await fetch(request.url, {
      signal: controller.signal,
      headers: { 'user-agent': request.userAgent, accept: request.accept ?? '*/*' },
      redirect: 'follow',
    });

    const contentType = res.headers.get('content-type');
    const charset = charsetFromContentType(contentType);
    const retryAfterMs = parseRetryAfter(res.headers.get('retry-after'), Date.now());

    if (!res.ok) {
      // Un error TAMBIÉN tiene cuerpo (AEMET responde 429 con HTML): se guarda
      // un extracto para diagnóstico, nunca se propaga como dato.
      let errorText: string | undefined;
      try {
        const errorBytes = Buffer.from(await res.arrayBuffer());
        errorText = decodeBody(errorBytes.subarray(0, ERROR_BODY_MAX), charset);
      } catch {
        errorText = undefined;
      }
      return { kind: 'http_error', status: res.status, retryAfterMs, bodyText: errorText, contentType };
    }

    const declared = res.headers.get('content-length');
    if (declared !== null && Number(declared) > maxBytes) {
      return { kind: 'network_error', message: `response too large (content-length ${declared})` };
    }

    // Se leen BYTES, no texto: el cuerpo puede venir en un charset declarado
    // distinto de UTF-8 (AEMET: ISO-8859-15) y `res.text()` lo corrompería.
    const bodyBytes = Buffer.from(await res.arrayBuffer());
    if (bodyBytes.length > maxBytes) {
      return { kind: 'network_error', message: 'response too large (body exceeded cap)' };
    }

    return {
      kind: 'ok',
      status: res.status,
      bodyText: decodeBody(bodyBytes, charset),
      contentType,
      bodyBytes,
      charset,
      retryAfterMs,
    };
  } catch (error) {
    if (timedOut) return { kind: 'timeout', timeoutMs: request.timeoutMs };
    const message = error instanceof Error ? error.message : String(error);
    return { kind: 'network_error', message };
  } finally {
    clearTimeout(timer);
  }
};
