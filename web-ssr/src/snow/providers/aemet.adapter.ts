import type {
  Authorization,
  LicenseStatus,
  ProviderAdapter,
  ProviderId,
  ProviderInput,
  ProviderResult,
  SnowDataType,
} from '../contracts/provider-contracts';
import type { ForecastBundle, ForecastPoint } from '../contracts/data-type-map';
import { buildUserAgent, redactUrl, requireEnv } from '../config/env';
import { RATE_LIMITS } from '../cache/rate-limit';
import { attributionFor } from './authorizations';
import { normalizeNoData } from './normalize';
import { makeProvenance } from './provenance';
import { globalFetchClient, type HttpClient } from './http-client';
import { aemetMunicipioFor, aemetMappingInfo } from './aemet-municipios';

/**
 * Adapter REAL de AEMET OpenData (SNOW-03b t1) — pronóstico horario municipal.
 *
 * ## Por qué dos pasos
 * AEMET no sirve el dato en la primera llamada. El endpoint
 * `prediccion/especifica/municipio/horaria/{id}` responde un SOBRE:
 *   `{ descripcion, estado: 200, datos: "<url>", metadatos: "<url>" }`
 * y el JSON real hay que pedirlo a `datos`. El segundo GET puede tardar (el
 * servicio genera el fichero) y tiene su propio límite, por eso lleva un
 * timeout mayor que el primero.
 *
 * ## Trampas MEDIDAS del servicio (no son suposiciones)
 * 1. **Charset ISO-8859-15 con BOM.** El JSON crudo leído como UTF-8 se parsea
 *    «sin error» pero corrompe los acentos. Se leen BYTES y se decodifica con el
 *    charset declarado (`http-client.decodeBody`).
 * 2. **429 con cuerpo HTML.** Al superar la cuota (unas pocas llamadas por
 *    minuto) responde 429 con una página HTML («Se ha alcanzado uno de los
 *    límites de uso»). Se clasifica por el STATUS, nunca por el cuerpo: un 429 es
 *    `rate_limited` aunque el cuerpo no sea JSON.
 * 3. **Sin clave: 200 con cuerpo VACÍO.** No hay 401. Por eso NUNCA se decide
 *    por el status: se valida que el cuerpo no esté vacío, que sea JSON y que
 *    tenga la FORMA esperada.
 *
 * ## Principios
 * - Datos REALES o nada: ningún valor se inventa, ningún centinela (`-99`) se
 *   sirve como temperatura. `snowLineM` es SIEMPRE `null` porque AEMET no
 *   publica cota de nieve en este producto (el campo `nieve` es ESPESOR).
 * - `observedAt`/`updatedAt` = `[0].elaborado` (hora REAL de emisión), no el
 *   instante de la petición.
 * - Sin clave ⇒ `not_configured` (mantiene la degradación honesta de SNOW-02).
 * - Sin municipio AEMET para la estación ⇒ `no_data/not-covered`, no se busca
 *   un municipio vecino «razonable».
 */

export const AEMET_DEFAULT_BASE = 'https://opendata.aemet.es/opendata/api';

/** Rutas relativas al `baseUrl` (se pueden sustituir en tests). */
export const AEMET_MUNICIPIO_PATH = 'prediccion/especifica/municipio/horaria';

/** AEMET admite como máximo `yyyy-MM-dd` / `yyyy-MM-ddTHH:mm:ss` en `datos`. */
export const AEMET_TZ: Readonly<Record<'ES' | 'AD' | 'FR' | 'PT', string>> = {
  ES: 'Europe/Madrid',
  AD: 'Europe/Andorra',
  FR: 'Europe/Paris',
  PT: 'Europe/Lisbon',
};

export interface AemetAdapterOptions {
  readonly http?: HttpClient;
  readonly baseUrl?: string;
  /** Timeout del sobre (paso 1). */
  readonly metaTimeoutMs?: number;
  /** Timeout del dato (paso 2): el servicio genera el fichero al vuelo. */
  readonly dataTimeoutMs?: number;
  /** Tope de bytes por respuesta (el JSON municipal ronda 100-300 KB). */
  readonly maxBytes?: number;
  readonly siteUrl?: string;
  readonly contactEmail?: string;
  /** Máximo de horas devueltas (por defecto: las que traiga AEMET). */
  readonly forecastHours?: number;
  /**
   * Espaciado MÍNIMO entre dos llamadas al servicio (cualquiera de los dos
   * pasos cuenta). AEMET no publica su tabla de cuotas y devuelve 429 tras unas
   * pocas llamadas por minuto: el valor por defecto es MUY conservador.
   */
  readonly minSpacingMs?: number;
  /** Inyectables para que los tests no hagan esperas reales. */
  readonly now?: () => number;
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Sobre del paso 1. */
interface AemetMetaEnvelope {
  readonly estado?: number | string;
  readonly datos?: string;
  readonly metadatos?: string;
  readonly descripcion?: string;
}

/** Documento `[0]` del paso 2 (sólo lo que se consume). */
interface AemetDocument {
  readonly id?: string;
  readonly nombre?: string;
  readonly provincia?: string;
  readonly elaborado?: string;
  readonly prediccion?: { readonly dia?: readonly AemetDia[] };
}

interface AemetPair<T = string> {
  readonly value?: T;
  readonly periodo?: string;
}

interface AemetDia {
  readonly fecha?: string;
  /** Pares `{value, periodo}` por hora (`periodo` = "00".."23"). */
  readonly temperatura?: readonly AemetPair[];
  readonly sensTermica?: readonly AemetPair[];
  readonly humedadRelativa?: readonly AemetPair[];
  readonly precipitacion?: readonly AemetPair[];
  readonly probPrecipitacion?: readonly AemetPair[];
  /**
   * `nieve` es ESPESOR de nieve acumulado en el suelo (cm), NO precipitación
   * del tramo: por eso NO se mapea a `precipMm`.
   */
  readonly nieve?: readonly AemetPair[];
  readonly probNieve?: readonly AemetPair[];
  readonly vientoAndRachaMax?: readonly AemetVientoEntry[];
  readonly estadoCielo?: readonly AemetPairWithDescription[];
}

/**
 * Entrada de `vientoAndRachaMax`. **Array PLANO y POLIMÓRFICO** (forma REAL
 * medida contra el servicio; defecto 2 de la re-ejecución real):
 *
 * ```json
 * "vientoAndRachaMax": [
 *   { "direccion": ["SO"], "velocidad": ["8"], "periodo": "20" },  // velocidad en velocidad[]
 *   { "value": "27", "periodo": "20" },                            // la racha: entrada hermana
 *   { "direccion": ["SO"], "velocidad": ["6"], "periodo": "21" },
 *   { "value": "20", "periodo": "21" }
 * ]
 * ```
 *
 * La VELOCIDAD viaja dentro de `velocidad[]` (no en `value`) y la RACHA en el
 * `value` de la entrada hermana con el mismo `periodo`. Leer sólo `pair.value`
 * deja viento y racha siempre en `null`.
 */
export interface AemetVientoEntry {
  readonly value?: string;
  readonly periodo?: string;
  readonly direccion?: readonly string[];
  readonly velocidad?: readonly (string | number)[];
}

/** Primer elemento de un array de valores de AEMET, como texto. */
function firstScalar(values: readonly (string | number)[] | undefined): string | undefined {
  if (!Array.isArray(values) || values.length === 0) return undefined;
  const v = values[0];
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

/**
 * Extrae velocidad y racha del array real `vientoAndRachaMax`.
 *
 * - **velocidad**: primer elemento de `velocidad[]` de la entrada que lo lleve.
 * - **racha**: `value` de la entrada que NO trae `velocidad[]` y comparte
 *   `periodo` (el «value hermano» del formato real).
 *
 * Si una hora sólo trae el valor de racha, la velocidad queda `null`: la racha
 * NO se copia a la velocidad (sería duplicar un dato en otro campo).
 */
export function parseVientoAndRachaMax(entries: readonly AemetVientoEntry[] | undefined): {
  velocidad: Map<string, string>;
  racha: Map<string, string>;
} {
  const velocidad = new Map<string, string>();
  const racha = new Map<string, string>();
  if (!Array.isArray(entries)) return { velocidad, racha };

  for (const entry of entries) {
    const periodo = typeof entry?.periodo === 'string' ? entry.periodo : null;
    if (periodo === null) continue;
    const v = firstScalar(entry.velocidad);
    if (v !== undefined && v !== '') {
      // La primera aparición manda (el servicio repite periodos con variantes).
      if (!velocidad.has(periodo)) velocidad.set(periodo, v);
      continue;
    }
    // Sin `velocidad[]` ⇒ esta entrada es el valor de RACHA de esa hora.
    if (typeof entry.value === 'string' && entry.value !== '' && !racha.has(periodo)) {
      racha.set(periodo, entry.value);
    }
  }
  return { velocidad, racha };
}

interface AemetPairWithDescription {
  readonly value?: string;
  readonly descripcion?: string;
  readonly periodo?: string;
}

export type AemetFailure =
  | { readonly kind: 'empty_body' }
  | { readonly kind: 'bad_json'; readonly detail: string }
  | { readonly kind: 'unexpected_shape'; readonly detail: string };

/**
 * Código INE del municipio AEMET de una lectura.
 *
 * Orden de preferencia:
 *  1. `stationRef.sourceIds.aemet` — corrección explícita por estación, sin
 *     tocar código (es el punto pensado para un operador). Se valida que sea un
 *     código INE de 5 dígitos: un valor con otra forma NO se usa (devolvería
 *     datos de otro municipio, que es peor que no tener dato).
 *  2. El mapa declarado en `aemet-municipios.generated.json`.
 *  3. `null` ⇒ la estación no tiene pronóstico AEMET (no se adivina el vecino).
 */
export function aemetMunicipioForInput(input: ProviderInput): string | null {
  const override = input.stationRef.sourceIds?.aemet;
  if (typeof override === 'string' && AEMET_MUNICIPIO_CODE.test(override.trim())) {
    return override.trim();
  }
  return aemetMunicipioFor(input.stationRef.slug);
}

/** Código INE de municipio: exactamente 5 dígitos. */
export const AEMET_MUNICIPIO_CODE = /^\d{5}$/;

/** ¿Tiene esta estación un municipio AEMET declarado? */
export function aemetCovers(slug: string): boolean {
  return aemetMunicipioFor(slug) !== null;
}

/** URL del paso 1 (con la clave). NUNCA se registra sin `redactUrl`. */
export function buildMetaUrl(municipio: string, apiKey: string, baseUrl: string = AEMET_DEFAULT_BASE): string {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/${AEMET_MUNICIPIO_PATH}/${municipio}`);
  url.searchParams.set('api_key', apiKey);
  return url.toString();
}

/** Limpia el BOM y espacios: cuerpos de 0 bytes o sólo blancos no son JSON. */
export function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '');
}

/**
 * Normaliza el par `{value, periodo}` a un mapa `periodo → value` conservando
 * TODAS las apariciones (el array `racha` trae dos pares por hora).
 */
export function pairMap<T extends string>(
  pairs: readonly AemetPair<T>[] | undefined,
  opts: { readonly last?: boolean } = {},
): Map<string, string> {
  const out = new Map<string, string>();
  if (!Array.isArray(pairs)) return out;
  for (const pair of pairs) {
    const periodo = typeof pair?.periodo === 'string' ? pair.periodo : null;
    if (periodo === null) continue;
    const value = typeof pair.value === 'string' ? pair.value : '';
    if (opts.last) {
      out.set(periodo, value);
    } else if (!out.has(periodo)) {
      out.set(periodo, value);
    }
  }
  return out;
}

/** Convierte el `value` textual de AEMET a número, sin servir centinelas. */
export function toNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return normalizeNoData(n);
}

/**
 * Periodos ESPECIALES de AEMET: no son una hora del día.
 *
 * - `"0001"` / `"1901"`: «todo el día» / «todo el período».
 * - `"0000"` / `"2400"`: límites del día que AEMET usa en algunos productos.
 *
 * Se descartan EXPLÍCITAMENTE con motivo en lugar de convertirlos en una hora
 * inventada (servir un valor diario como si fuera de una hora concreta sería
 * afirmar una precisión que la fuente no da).
 */
export const AEMET_WHOLE_DAY_PERIODOS: ReadonlySet<string> = new Set(['0001', '1901', '0000', '2400']);

/**
 * Motivo por el que se descarta un `periodo`. `null` = es una hora utilizable.
 * Se emite en el diagnóstico del bundle para que «faltan tramos» nunca sea un
 * silencio: el porqué queda registrado en la evidencia.
 */
export function skipReasonForPeriodo(periodo: string): string | null {
  if (AEMET_WHOLE_DAY_PERIODOS.has(periodo)) return 'periodo-de-dia-completo';
  if (!/^\d{1,2}$/.test(periodo)) return 'periodo-no-horario';
  const h = Number(periodo);
  if (h < 0 || h > 23) return 'periodo-fuera-de-rango';
  return null;
}

/**
 * Mes/día de la `fecha` de AEMET. **AEMET la envía como fecha-hora LOCAL de
 * España SIN sufijo de zona** (`2026-11-16T00:00:00`), aunque su documentación
 * la describa como `YYYY-MM-DD`. Una cadena local SIN zona NO es UTC: aquí sólo
 * se extraen los componentes y la zona se aplica después con `madridOffsetMs`.
 *
 * Se aceptan `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm[:ss]` y (por si algún producto
 * añadiera zona explícita) la forma con `Z`/`±hh:mm`; en ese caso se respeta.
 */
export function parseAemetFecha(fecha: string): { y: number; mo: number; d: number; explicitUtcMs: number | null } | null {
  const trimmed = fecha.trim();
  const local = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(trimmed);
  if (local) {
    return { y: Number(local[1]), mo: Number(local[2]), d: Number(local[3]), explicitUtcMs: null };
  }
  const zoned = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})$/.exec(trimmed);
  if (zoned) {
    const ms = Date.parse(trimmed);
    if (!Number.isFinite(ms)) return null;
    return { y: Number(zoned[1]), mo: Number(zoned[2]), d: Number(zoned[3]), explicitUtcMs: ms };
  }
  return null;
}

/**
 * Convierte (`fecha` de AEMET, hora local `periodo`) a ISO-8601 UTC.
 *
 * `fecha` es LOCAL de España sin sufijo (ver `parseAemetFecha`), y `periodo` es
 * la hora local "00".."23". El desfase de Madrid (CET +1 / CEST +2) se calcula
 * con `Intl` para ESE día, así que un cambio de hora queda bien situado.
 *
 * Devuelve `null` si la fecha no es parseable o si `hour` no es una hora del
 * día utilizable (p. ej. los periodos «todo el día»); nunca inventa una hora.
 */
export function localSpainToUtcIso(fecha: string, hour: string): string | null {
  const parsed = parseAemetFecha(fecha);
  if (parsed === null) return null;
  if (skipReasonForPeriodo(hour) !== null) return null;
  const h = Number(hour);
  if (parsed.explicitUtcMs !== null) {
    // La fuente ya dice la zona: se respeta tal cual (no se reinterpreta local).
    return new Date(parsed.explicitUtcMs).toISOString();
  }
  // Hora local de pared como si fuera UTC, y luego se resta el desfase REAL.
  const naiveMs = Date.UTC(parsed.y, parsed.mo - 1, parsed.d, h, 0, 0);
  const offsetMs = madridOffsetMs(naiveMs);
  return new Date(naiveMs - offsetMs).toISOString();
}

/** Desfase (ms) de Europe/Madrid respecto a UTC en el instante dado. */
export function madridOffsetMs(utcMs: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (t: string): number => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return asUtc - utcMs;
}

/**
 * `elaborado` de AEMET = `YYYY-MM-DDTHH:mm:ss` en hora local de España.
 * Devuelve ISO-8601 UTC, o `null` si no es parseable (nunca `Date.now()`).
 */
export function parseElaborado(raw: string | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  // Forma REAL medida: `YYYY-MM-DDTHH:mm:ss` en hora LOCAL de España, sin zona.
  const local = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (local) {
    const base = localSpainToUtcIso(local[1], local[2]);
    if (base === null) return null;
    return new Date(Date.parse(base) + Number(local[3]) * 60_000 + Number(local[4] ?? '0') * 1000).toISOString();
  }
  // Si alguna vez llegara con zona explícita, se respeta.
  const zoned = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:?\d{2})$/.test(trimmed);
  if (zoned) {
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}

/**
 * Lee el valor de una lista de pares cuyo `periodo` es de DÍA COMPLETO
 * (`1901`/`0001`), o `null` si esa serie sólo trae horas normales.
 *
 * AEMET no publica todo por hora: `probNieve` (y a veces `precipitacion`) llega
 * como un único valor diario. Ese valor NO es de una hora concreta, así que no
 * puede rellenar `probSnowPct` de un tramo; se expone como dato DIARIO aparte.
 */
export function readWholeDayValue(pairs: readonly AemetPair[] | undefined): number | null {
  if (!Array.isArray(pairs)) return null;
  for (const pair of pairs) {
    const periodo = typeof pair?.periodo === 'string' ? pair.periodo : null;
    if (periodo === null) continue;
    if (skipReasonForPeriodo(periodo) === 'periodo-de-dia-completo') {
      return toNumber(typeof pair.value === 'string' ? pair.value : undefined);
    }
  }
  return null;
}

/** Valor diario agregado descubierto durante el parseo. */
export interface DailyAggregate {
  /** Día de AEMET (`YYYY-MM-DD`) al que pertenece el valor. */
  readonly fecha: string;
  /** Probabilidad de nieve del día en % (0-100), o `null` si no la publica. */
  readonly snowProbabilityPct: number | null;
}

/** Resultado del parseo del paso 2. */
export type ParsedPrediction =
  | {
      readonly ok: true;
      readonly bundle: ForecastBundle;
      readonly elaborado: string | null;
      readonly municipio: string | null;
      /**
       * Valores que AEMET publica por DÍA, no por hora (defecto 4). Nunca se
       * reparten entre las horas del día: eso sería inventar precisión horaria.
       */
      readonly daily: readonly DailyAggregate[];
      /** Periodos descartados con su motivo (nunca se ocultan). */
      readonly skipped: ReadonlyArray<{ readonly fecha: string; readonly periodo: string; readonly motivo: string }>;
    }
  | { readonly ok: false; readonly failure: AemetFailure };

/**
 * Parsea el documento del paso 2 (`[0].prediccion.dia[]`).
 *
 * Devuelve un fallo EXPLÍCITO en vez de `null`: distinguir «respuesta vacía»
 * (200 sin clave), «JSON roto» y «JSON válido con otra forma» permite que el
 * adapter se degrade con el motivo correcto y que los tests sean precisos.
 */
export function parsePrediccion(text: string): ParsedPrediction {
  const clean = stripBom(text).trim();
  if (clean === '') return { ok: false, failure: { kind: 'empty_body' } };

  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch (error) {
    // El mensaje del motor JSON no es uniforme entre versiones: se propaga el
    // TIPO de error, no su texto (el texto podría acabar en un cuerpo de test
    // impreso y romper la reproducibilidad byte a byte de una fixture).
    return { ok: false, failure: { kind: 'bad_json', detail: error instanceof Error ? error.name : 'parse error' } };
  }

  // AEMET SIEMPRE envuelve el documento en un array de un elemento. Un objeto
  // suelto (`{error, descripcion}`) es una respuesta de error con status 200: NO
  // es el dato, no se tolera.
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, failure: { kind: 'unexpected_shape', detail: 'se esperaba un array de un documento' } };
  }
  const doc = parsed[0] as AemetDocument | null;
  const dias = doc?.prediccion?.dia;
  if (doc === null || typeof doc !== 'object' || !Array.isArray(dias) || dias.length === 0) {
    return { ok: false, failure: { kind: 'unexpected_shape', detail: 'falta [0].prediccion.dia[]' } };
  }

  const points: ForecastPoint[] = [];
  const daily: DailyAggregate[] = [];
  // Diagnóstico de tramos descartados: que falte un tramo NUNCA debe ser un
  // silencio. Se acumula el motivo (p. ej. periodos «todo el día») para que la
  // evidencia explique por qué un día trae 23 horas y no 24.
  const skipped: Array<{ fecha: string; periodo: string; motivo: string }> = [];
  const skip = (fecha: string, periodo: string, motivo: string): void => {
    skipped.push({ fecha, periodo, motivo });
  };

  for (const dia of dias) {
    const fecha = typeof dia?.fecha === 'string' ? dia.fecha : null;
    if (fecha === null) {
      skip('(sin fecha)', '', 'dia-sin-fecha');
      continue;
    }
    if (parseAemetFecha(fecha) === null) {
      skip(fecha, '', 'fecha-no-parseable');
      continue;
    }

    const temper = pairMap(dia.temperatura);
    // Defecto 2: la forma REAL de viento no es un par `{value}` sino un array
    // plano con `velocidad[]` y una entrada hermana `{value}` para la racha.
    const { velocidad: viento, racha } = parseVientoAndRachaMax(dia.vientoAndRachaMax);
    const precip = pairMap(dia.precipitacion);
    const probNieve = pairMap(dia.probNieve);
    // Defecto 4: AEMET publica `probNieve` por DÍA (`periodo: "1901"`), no por
    // hora. Se expone aparte, en `dailySnowProbabilityPct`, en vez de dejarla
    // en un `null` silencioso o repetirla en cada hora como si fuera horaria.
    const probNieveDia = readWholeDayValue(dia.probNieve);
    if (probNieveDia !== null) {
      // `fecha` puede venir con hora; se normaliza a `YYYY-MM-DD` local.
      daily.push({ fecha: fecha.slice(0, 10), snowProbabilityPct: probNieveDia });
    }
    const estado = new Map<string, string>();
    for (const pair of dia.estadoCielo ?? []) {
      if (typeof pair?.periodo !== 'string') continue;
      // El primer tramo del día suele traer `descripcion: ""`: se guarda el
      // texto vacío y luego se filtra a null (no se inventa ni se hereda).
      estado.set(pair.periodo, typeof pair.descripcion === 'string' ? pair.descripcion : '');
    }

    const horas = new Set<string>([
      ...temper.keys(),
      ...viento.keys(),
      ...racha.keys(),
      ...precip.keys(),
      ...probNieve.keys(),
      ...estado.keys(),
    ]);
    const ordered = [...horas].sort();
    for (const hour of ordered) {
      const motivo = skipReasonForPeriodo(hour);
      if (motivo !== null) {
        // Periodo que no es una hora concreta: se descarta CON MOTIVO, no se
        // convierte en una hora inventada.
        skip(fecha, hour, motivo);
        continue;
      }
      const validAt = localSpainToUtcIso(fecha, hour);
      if (validAt === null) {
        skip(fecha, hour, 'conversion-fallida');
        continue;
      }
      const condition = estado.get(hour);
      points.push({
        validAt,
        tempC: toNumber(temper.get(hour)),
        windKmh: toNumber(viento.get(hour)),
        gustKmh: toNumber(racha.get(hour)),
        precipMm: toNumber(precip.get(hour)),
        // AEMET NO publica cota de nieve en este producto: null, nunca inventada.
        snowLineM: null,
        condition: condition === undefined || condition.trim() === '' ? null : condition,
        probSnowPct: toNumber(probNieve.get(hour)),
      });
    }
  }

  if (points.length === 0) {
    // El motivo agregado evita el clásico «no_data sin explicación».
    const motivo = skipped.length > 0
      ? [...new Set(skipped.map((s) => s.motivo))].join(',')
      : 'dia[] sin pares hora-valor';
    return { ok: false, failure: { kind: 'unexpected_shape', detail: `dia[] sin tramos horarios utilizables (${motivo})` } };
  }

  // Orden cronológico: AEMET publica días seguidos, pero no se asume el orden.
  points.sort((a, b) => Date.parse(a.validAt) - Date.parse(b.validAt));
  const horizonHours = Math.max(
    1,
    Math.round((Date.parse(points[points.length - 1].validAt) - Date.parse(points[0].validAt)) / 3_600_000),
  );

  return {
    ok: true,
    bundle: {
      points,
      horizonHours,
      // Defecto 4: los valores diarios de AEMET se sirven como agregado, NO
      // repartidos entre horas.
      ...(daily.length > 0
        ? { daily: daily.map((d) => ({ day: d.fecha, snowProbabilityPct: d.snowProbabilityPct })) }
        : {}),
    },
    elaborado: parseElaborado(doc.elaborado),
    municipio: typeof doc.nombre === 'string' ? doc.nombre : null,
    daily,
    skipped,
  };
}

/** Error/clasificación del sobre del paso 1. */
export type EnvelopeOutcome =
  | { readonly kind: 'url'; readonly url: string }
  | { readonly kind: 'limited' }
  | { readonly kind: 'no_data'; readonly detail: string };

/** Valida el sobre y extrae la URL del segundo GET. */
export function readEnvelope(text: string): EnvelopeOutcome {
  const clean = stripBom(text).trim();
  if (clean === '') return { kind: 'no_data', detail: 'sobre vacío' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(clean);
  } catch {
    return { kind: 'no_data', detail: 'sobre no es JSON (faltó la clave o es HTML)' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { kind: 'no_data', detail: 'sobre con forma inesperada' };
  }
  const env = parsed as AemetMetaEnvelope;
  const estado = Number(env.estado);
  if (estado === 429) return { kind: 'limited' };
  if (estado !== 200) return { kind: 'no_data', detail: `estado ${String(env.estado)} en el sobre` };
  if (typeof env.datos !== 'string' || env.datos.trim() === '') {
    return { kind: 'no_data', detail: 'sobre sin url `datos`' };
  }
  let url: URL;
  try {
    url = new URL(env.datos);
  } catch {
    return { kind: 'no_data', detail: '`datos` no es una URL absoluta' };
  }
  // La URL del paso 2 la sirve un tercero: sólo se sigue por HTTPS.
  if (url.protocol !== 'https:') return { kind: 'no_data', detail: '`datos` no es HTTPS' };
  return { kind: 'url', url: url.toString() };
}

const realSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** 60 s es el mínimo que el propio 429 de AEMET pide («el próximo minuto»). */
export const AEMET_DEFAULT_RATE_RETRY_MS = 60_000;

/** El adapter admite `forecast` (y NO `weather-alert`: los avisos son otro producto). */
const PROVIDES: readonly SnowDataType[] = ['forecast'];

export function aemetAdapter(authorization: Authorization, options: AemetAdapterOptions = {}): ProviderAdapter<ForecastBundle> {
  const http = options.http ?? globalFetchClient;
  const baseUrl = options.baseUrl ?? AEMET_DEFAULT_BASE;
  const metaTimeoutMs = options.metaTimeoutMs ?? 10_000;
  // El paso 2 generaba el fichero al vuelo: 20 s es el límite práctico medido.
  const dataTimeoutMs = options.dataTimeoutMs ?? 20_000;
  const maxBytes = options.maxBytes ?? 4 * 1024 * 1024;
  const forecastHours = options.forecastHours ?? null;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? realSleep;
  const quota = RATE_LIMITS.aemet;
  // Espaciado propio MUY conservador: 1 llamada cada 20 s (3/min) frente a 30/min.
  const minSpacingMs = options.minSpacingMs ?? 20_000;
  const userAgent = buildUserAgent(options.siteUrl ?? 'https://appski.example', options.contactEmail ?? 'ops@appski.example');

  const licenseStatus: LicenseStatus = authorization.attributionRequired ? 'allowed-with-attribution' : 'allowed';
  const licenseByType: Partial<Record<SnowDataType, LicenseStatus>> = { forecast: licenseStatus };
  const attribution = attributionFor('aemet') ?? 'Datos: AEMET';

  // Estado de cuota compartido por TODAS las llamadas de esta instancia: el
  // límite real es por clave, y `createAdapters()` construye UNA instancia.
  let lastCallAt: number | null = null;
  let blockedUntil = 0;

  return {
    id: 'aemet',
    provides: PROVIDES,
    licenseByType,
    isTerminal: false,
    // No se toca la red para estaciones sin municipio AEMET (ni override válido).
    canServe: (input) => input.dataType === 'forecast' && aemetMunicipioForInput(input) !== null,
    attribution: () => attribution,

    async fetch(input: ProviderInput): Promise<ProviderResult<ForecastBundle>> {
      const requestedAt = input.requestedAt;
      const prov = (status: 'live' | 'degraded' = 'live', observedAtMs?: number) =>
        makeProvenance(
          'aemet',
          licenseStatus,
          observedAtMs !== undefined && Number.isFinite(observedAtMs)
            ? new Date(observedAtMs).toISOString()
            : requestedAt.toISOString(),
          observedAtMs !== undefined && Number.isFinite(observedAtMs)
            ? new Date(observedAtMs).toISOString()
            : null,
          requestedAt,
          authorization,
          attribution,
          status,
        );
      const noData = (reason: 'not-covered' | 'source-silent' | 'not-yet-published'): ProviderResult<ForecastBundle> => ({
        status: 'no_data',
        provenance: prov('degraded'),
        reason,
      });

      // 1) Config: sin clave NO se llama a nada (SNOW-02: not_configured).
      const cfg = requireEnv('aemet', ['AEMET_API_KEY']);
      if (!cfg.configured) {
        return { status: 'not_configured', provenance: prov('degraded'), missingEnv: cfg.missingEnv };
      }

      // 2) Cobertura: sin municipio declarado (ni override válido) no se inventa uno vecino.
      const municipio = aemetMunicipioForInput(input);
      if (municipio === null) return noData('not-covered');

      // 3) Cuota del SERVICIO: si AEMET nos dijo que esperáramos, se respeta su
      // ventana y se informa como rate_limited (dato honesto de cuota).
      const t0 = now();
      if (t0 < blockedUntil) {
        return { status: 'rate_limited', provenance: prov('degraded'), retryAfterMs: blockedUntil - t0 };
      }
      // 4) Espaciado PROPIO entre llamadas: se ESPERA a cumplirlo.
      //
      // Antes se devolvía `rate_limited` sin tocar la red. Con 48 estaciones
      // mapeadas, cualquier segunda consulta seguida acababa en `rate_limited`,
      // y el orquestador lo reducía a `no_data/not-covered` — es decir, el
      // producto afirmaba que la estación NO tenía cobertura AEMET cuando sí la
      // tiene y sólo nos estábamos autolimitando. Un throttler propio que rehúsa
      // y se disfraza de «sin cobertura» es la peor combinación: aquí se espera.
      if (lastCallAt !== null) {
        const wait = minSpacingMs - (now() - lastCallAt);
        if (wait > 0) await sleep(wait);
      }
      lastCallAt = now();

      const apiKey = process.env['AEMET_API_KEY'] as string;
      const metaUrl = buildMetaUrl(municipio, apiKey, baseUrl);

      // ---- Paso 1: el sobre
      const meta = await http({ url: metaUrl, timeoutMs: metaTimeoutMs, userAgent, maxBytes });
      if (meta.kind === 'timeout') {
        return { status: 'error', provenance: prov('degraded'), message: `timeout ${meta.timeoutMs}ms en el sobre de ${redactUrl(metaUrl)}`, retryable: true };
      }
      if (meta.kind === 'network_error') {
        return { status: 'error', provenance: prov('degraded'), message: `error de red en el sobre: ${meta.message}`, retryable: true };
      }
      if (meta.kind === 'http_error') {
        // 429 PRIMERO y por status: el cuerpo es HTML, no JSON.
        if (meta.status === 429) {
          const retryAfterMs = Math.max(meta.retryAfterMs ?? AEMET_DEFAULT_RATE_RETRY_MS, 1_000);
          blockedUntil = now() + retryAfterMs;
          return { status: 'rate_limited', provenance: prov('degraded'), retryAfterMs };
        }
        return {
          status: 'error',
          provenance: prov('degraded'),
          message: `HTTP ${meta.status} en el sobre de ${redactUrl(metaUrl)}`,
          retryable: meta.status >= 500,
        };
      }

      const envelope = readEnvelope(meta.bodyText);
      if (envelope.kind === 'limited') {
        blockedUntil = now() + AEMET_DEFAULT_RATE_RETRY_MS;
        return { status: 'rate_limited', provenance: prov('degraded'), retryAfterMs: AEMET_DEFAULT_RATE_RETRY_MS };
      }
      if (envelope.kind === 'no_data') {
        // 200 con cuerpo vacío (sin clave) o sobre sin `datos`: no hay dato.
        // Se distingue el caso «vacío» porque indica clave inválida/ausente.
        return noData(meta.bodyText.trim() === '' ? 'not-covered' : 'source-silent');
      }

      // ---- Paso 2: el documento real
      // El paso 2 también cuenta para la cuota: se mantiene el espaciado.
      const gap = now() - lastCallAt;
      if (gap < minSpacingMs) await sleep(minSpacingMs - gap);
      lastCallAt = now();

      const data = await http({ url: envelope.url, timeoutMs: dataTimeoutMs, userAgent, maxBytes });
      if (data.kind === 'timeout') {
        return { status: 'error', provenance: prov('degraded'), message: `timeout ${data.timeoutMs}ms en el dato de AEMET`, retryable: true };
      }
      if (data.kind === 'network_error') {
        return { status: 'error', provenance: prov('degraded'), message: `error de red en el dato: ${data.message}`, retryable: true };
      }
      if (data.kind === 'http_error') {
        if (data.status === 429) {
          const retryAfterMs = Math.max(data.retryAfterMs ?? AEMET_DEFAULT_RATE_RETRY_MS, 1_000);
          blockedUntil = now() + retryAfterMs;
          return { status: 'rate_limited', provenance: prov('degraded'), retryAfterMs };
        }
        return {
          status: 'error',
          provenance: prov('degraded'),
          message: `HTTP ${data.status} en el dato de AEMET`,
          retryable: data.status >= 500,
        };
      }

      const prediction = parsePrediccion(data.bodyText);
      if (!prediction.ok) {
        // JSON roto / vacío / forma inesperada ⇒ no_data con motivo, NUNCA error
        // (no es un bug de transporte) ni datos inventados.
        const reason = prediction.failure.kind === 'empty_body' ? 'not-covered' : 'source-silent';
        return noData(reason);
      }

      // `observedAt` = `elaborado` REAL de AEMET, no el instante de la petición.
      let observedAtMs: number | undefined;
      if (prediction.elaborado !== null) {
        const ms = Date.parse(prediction.elaborado);
        if (Number.isFinite(ms)) observedAtMs = ms;
      }

      let bundle = prediction.bundle;
      if (forecastHours !== null && bundle.points.length > forecastHours) {
        bundle = { points: bundle.points.slice(0, forecastHours), horizonHours: forecastHours };
      }

      return {
        status: 'ok',
        data: bundle,
        provenance: prov('live', observedAtMs),
      };
    },
  };
}

/** Diagnóstico del mapping (para `/v1/config` y la evidencia de verificación). */
export function aemetCoverage(): { readonly mapped: number; readonly notCovered: number } {
  const info = aemetMappingInfo();
  return { mapped: info.stations.length, notCovered: info.notCovered.length };
}

export type { ProviderId };
