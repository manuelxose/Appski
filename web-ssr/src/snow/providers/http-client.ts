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
  | { readonly kind: 'ok'; readonly status: number; readonly bodyText: string; readonly contentType: string | null }
  | { readonly kind: 'http_error'; readonly status: number; readonly retryAfterMs: number | null }
  | { readonly kind: 'timeout'; readonly timeoutMs: number }
  | { readonly kind: 'network_error'; readonly message: string };

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

    if (!res.ok) {
      return {
        kind: 'http_error',
        status: res.status,
        retryAfterMs: parseRetryAfter(res.headers.get('retry-after'), Date.now()),
      };
    }

    const declared = res.headers.get('content-length');
    if (declared !== null && Number(declared) > maxBytes) {
      return { kind: 'network_error', message: `response too large (content-length ${declared})` };
    }

    const bodyText = await res.text();
    if (Buffer.byteLength(bodyText, 'utf8') > maxBytes) {
      return { kind: 'network_error', message: 'response too large (body exceeded cap)' };
    }

    return {
      kind: 'ok',
      status: res.status,
      bodyText,
      contentType: res.headers.get('content-type'),
    };
  } catch (error) {
    if (timedOut) return { kind: 'timeout', timeoutMs: request.timeoutMs };
    const message = error instanceof Error ? error.message : String(error);
    return { kind: 'network_error', message };
  } finally {
    clearTimeout(timer);
  }
};
