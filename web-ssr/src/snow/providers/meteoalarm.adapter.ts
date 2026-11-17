import type {
  Authorization,
  LicenseStatus,
  ProviderAdapter,
  ProviderInput,
  ProviderResult,
  SnowDataType,
} from '../contracts/provider-contracts';
import type { WeatherAlertBundle, WeatherAlertItem } from '../contracts/data-type-map';
import { buildUserAgent, redactUrl } from '../config/env';
import { makeProvenance } from './provenance';
import { globalFetchClient, type HttpClient } from './http-client';
import { METEOALARM_DISCLAIMER, METEOALARM_SOURCE_URL, meteoalarmAttribution } from './authorizations';

/**
 * Adapter REAL de MeteoAlarm (EUMETNET) para `weather-alert` (SNOW-03, Fase C).
 *
 * Fuente: feeds Atom legacy, un feed por país:
 *   https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-{spain|france|portugal|andorra}
 * (La ruta /api/v1/warnings/feeds-XX responde 404: NO se usa.)
 *
 * Licencia: cláusula LITERAL del elemento `<rights>` del propio feed —
 * «Licensed under terms equivalent to CC BY 4.0, with additional requirements
 * for redistributing outlined in our Terms and Conditions.» ⇒ atribución
 * obligatoria, sin modificar el contenido, con hora de emisión y enlace, y
 * latencia ≤10 min (por eso la caché de 10 min es OBLIGATORIA).
 *
 * Honestidad de datos:
 * - Feed VACÍO (AD hoy: 0 <entry>) ⇒ `no_data`, nunca un error ni un aviso inventado.
 * - XML malformado o sin `<feed>` ⇒ `no_data` (fuente silenciosa), no `ok`.
 * - Severity CAP desconocida ⇒ se conserva como `green` sólo si el texto dice
 *   verde/verde claro; si no se reconoce, el aviso se DESCARTA (no se adivina).
 */

const FEED_BASE = 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom';

export type CountryCode = 'ES' | 'AD' | 'FR' | 'PT';

const COUNTRY_SLUG: Readonly<Record<CountryCode, string>> = {
  ES: 'spain',
  AD: 'andorra',
  FR: 'france',
  PT: 'portugal',
};

export function feedUrlFor(country: CountryCode, base: string = FEED_BASE): string {
  return `${base}-${COUNTRY_SLUG[country]}`;
}

/**
 * Tabla color → nivel. El color lo publica el feed en el `<title>`.
 *
 * Medido en los cuatro feeds reales (2026-11-16): `cap:severity` vale SIEMPRE
 * «Moderate» y NO distingue gravedad; el color está en el `<title>` del entry
 * (ES 68/68, FR 233/233, PT 14/14) y sólo en PT coincide con `cap:event`.
 */
const COLOR_TO_LEVEL: ReadonlyArray<{ readonly re: RegExp; readonly level: WeatherAlertItem['level'] }> = [
  { re: /\bred\b/i, level: 'red' },
  { re: /\borange\b/i, level: 'orange' },
  { re: /\byellow\b/i, level: 'yellow' },
  { re: /\bgreen\b/i, level: 'green' },
];

/**
 * Nivel de aviso a partir del COLOR que el propio feed publica.
 *
 * MEDIDO sobre los 4 feeds reales (2026-11-16): el color de boletín está en el
 * `<title>` de cada `<entry>` — p. ej. «Yellow Avalanches Warning issued for
 * France - Haute-Savoie» (ES 68/68, FR 233/233, PT 14/14 con color en title;
 * 0/68 y 0/233 en `cap:event`). `cap:severity` vale SIEMPRE «Moderate» y no
 * distingue gravedad.
 *
 * Orden de lectura (nunca se compone ni se inventa un color):
 *   1. `<title>` — fuente primaria del nivel;
 *   2. `cap:event` — respaldo (en PT ambas coinciden);
 *   3. `cap:severity` — último recurso, sólo para valores no neutros.
 *
 * Si ninguna fuente trae un color reconocible ⇒ `null` y el aviso se DESCARTA.
 */
export function warningLevel(
  title: string | null,
  event: string | null,
  severity?: string | null,
): WeatherAlertItem['level'] | null {
  for (const text of [title, event]) {
    if (text === null) continue;
    for (const { re, level } of COLOR_TO_LEVEL) {
      if (re.test(text)) return level;
    }
  }
  // Respaldo final: severidad CAP, sólo si es inequívoca.
  // «Moderate»/«Unknown» no permiten decidir ⇒ se descarta el aviso.
  const s = (severity ?? '').trim().toLowerCase();
  if (s === 'extreme') return 'red';
  if (s === 'severe') return 'orange';
  if (s === 'minor') return 'yellow';
  return null;
}

/** Extrae el primer contenido de una etiqueta (sin CDATA ni entidades complejas). */
function tagText(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return null;
  const raw = m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  return decodeEntities(raw).replace(/\s+/g, ' ').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

/** Normaliza `2026-11-16T10:44:09+00:00` a ISO con milisegundos y `Z`. */
function toIso(raw: string | null): string | null {
  if (raw === null) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export interface ParsedFeed {
  readonly items: readonly WeatherAlertItem[];
  /** Cláusula `<rights>` literal del feed (trazabilidad de licencia). */
  readonly rights: string | null;
  /** Nº de `<entry>` presentes en el XML (0 ⇒ feed vacío legítimo). */
  readonly entryCount: number;
  /**
   * Instante de emisión (`cap:sent`/`published`) por `id` de aviso. Se usa para
   * la procedencia del bundle: `observedAt` = emisión MÁS RECIENTE de los avisos
   * servidos. NO forma parte del DTO público del aviso.
   */
  readonly sentById: ReadonlyMap<string, string>;
}

/**
 * Parsea el Atom de MeteoAlarm. Devuelve `null` si el documento no es un feed
 * Atom válido (XML roto / raíz ajena): la fuente se considera silenciosa, no
 * se inventa un bundle vacío «correcto».
 */
export function parseMeteoalarmFeed(xml: string): ParsedFeed | null {
  if (!/<feed[\s>]/i.test(xml)) return null;

  const rights = tagText(xml, 'rights');
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/gi) ?? [];
  const items: WeatherAlertItem[] = [];
  const sentById = new Map<string, string>();

  for (const entry of entries) {
    const id = tagText(entry, 'cap:identifier') ?? tagText(entry, 'id');
    // El `<title>` es donde MeteoAlarm publica el COLOR del nivel; `cap:event`
    // es el texto oficial del NMHS y puede ir sin color («Moderate avalanches
    // warning»). Se leen por SEPARADO: usar `??` hacía que `title` nunca se
    // leyera cuando `cap:event` existía, y se perdían todos los avisos ES/FR.
    const title = tagText(entry, 'title');
    const capEvent = tagText(entry, 'cap:event');
    const severity = tagText(entry, 'cap:severity');
    const level = warningLevel(title, capEvent, severity);
    const sent = toIso(tagText(entry, 'cap:sent') ?? tagText(entry, 'published'));
    const onset = toIso(tagText(entry, 'cap:onset'));
    const expires = toIso(tagText(entry, 'cap:expires'));
    const area = tagText(entry, 'cap:areaDesc') ?? title;

    // Fenómeno = texto oficial del NMHS (`cap:event`); si faltara, el título.
    const phenomenon = capEvent ?? title;

    // Sin identificador, nivel, fenómeno o ventana de validez no hay aviso
    // utilizable: se descarta en vez de rellenar huecos con valores inventados.
    if (id === null || level === null || phenomenon === null || area === null) continue;
    const validFrom = onset ?? sent;
    if (validFrom === null || expires === null) continue;

    items.push({
      id,
      level,
      phenomenon,
      validFrom,
      validUntil: expires,
      area,
      // Enlace por aviso: el MeteoAlarm que la licencia obliga a enlazar. Si el
      // entry no trae `link`, se usa la URL que nombran los T&C (nunca se inventa
      // un enlace a otra parte).
      link: entryLink(entry) ?? METEOALARM_SOURCE_URL,
    });
    // Se conserva la emisión real del aviso (para la antigüedad del bundle).
    if (sent !== null) sentById.set(id, sent);
  }

  return { items, rights, entryCount: entries.length, sentById };
}

/**
 * Primer `href` http(s) de un `<entry>` Atom, o `null`. Se valida el esquema
 * para no publicar `javascript:` ni rutas relativas de un feed ajeno.
 */
function entryLink(entry: string): string | null {
  const re = /<link\b[^>]*\bhref="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(entry)) !== null) {
    const href = m[1].trim();
    if (/^https?:\/\//i.test(href)) return href;
  }
  return null;
}

/**
 * Emisión MÁS RECIENTE entre los avisos servidos, o `null` si ninguno la trae.
 * Es la base honesta de `observedAt`: refleja cuándo emitió el NMHS, no cuándo
 * hicimos la petición.
 */
export function latestIssueTime(ids: readonly string[], sentById: ReadonlyMap<string, string>): string | null {
  let best: string | null = null;
  let bestMs = -Infinity;
  for (const id of ids) {
    const iso = sentById.get(id);
    if (iso === undefined) continue;
    const ms = Date.parse(iso);
    if (Number.isFinite(ms) && ms > bestMs) {
      bestMs = ms;
      best = iso;
    }
  }
  return best;
}

/** ¿El aviso sigue vigente en `at`? (Ya terminado ⇒ no se sirve). */
export function isActive(item: WeatherAlertItem, at: Date): boolean {
  const until = Date.parse(item.validUntil);
  return Number.isFinite(until) && at.getTime() < until;
}

export interface MeteoalarmAdapterOptions {
  readonly http?: HttpClient;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly siteUrl?: string;
  readonly contactEmail?: string;
  /** Países del producto (para la atribución por defecto, multi-país). */
  readonly productCountries?: readonly CountryCode[];
}

export function meteoalarmAdapter(
  authorization: Authorization,
  options: MeteoalarmAdapterOptions = {},
): ProviderAdapter<WeatherAlertBundle> {
  const http = options.http ?? globalFetchClient;
  const baseUrl = options.baseUrl ?? FEED_BASE;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const userAgent = buildUserAgent(
    options.siteUrl ?? 'https://appski.example',
    options.contactEmail ?? 'ops@appski.example',
  );
  const productCountries = options.productCountries ?? (['ES', 'AD', 'FR', 'PT'] as const);

  const provides: readonly SnowDataType[] = ['weather-alert'];
  const licenseStatus: LicenseStatus = authorization.attributionRequired
    ? 'allowed-with-attribution'
    : 'allowed';
  const licenseByType: Partial<Record<SnowDataType, LicenseStatus>> = { 'weather-alert': licenseStatus };
  const attribution = meteoalarmAttribution(productCountries);

  return {
    id: 'meteoalarm',
    provides,
    licenseByType,
    isTerminal: false,
    canServe: (input) => input.dataType === 'weather-alert',

    async fetch(input: ProviderInput): Promise<ProviderResult<WeatherAlertBundle>> {
      const now = input.requestedAt;
      /**
       * Procedencia del BUNDLE.
       *
       * `observedAt` NO es el instante de la petición (eso hacía que `freshness`
       * fuera siempre 0 e inútil): cuando hay avisos servidos se usa la emisión
       * MÁS RECIENTE del feed (`cap:sent`). Sin emisiones utilizables se cae a
       * `now` y estado `degraded`, sin inventar una fecha de emisión.
       */
      const prov = (
        status: 'live' | 'degraded' = 'live',
        issuedAt: string | null = null,
      ): ProviderResult<WeatherAlertBundle>['provenance'] =>
        makeProvenance(
          'meteoalarm',
          licenseStatus,
          issuedAt ?? now.toISOString(),
          issuedAt,
          now,
          authorization,
          attribution,
          issuedAt === null ? 'degraded' : status,
        );

      const country = input.stationRef.country as CountryCode;
      if (!(country in COUNTRY_SLUG)) {
        // País fuera de cobertura: ausencia declarada, no un error.
        return { status: 'no_data', provenance: prov('degraded'), reason: 'not-covered' };
      }

      const url = feedUrlFor(country, baseUrl);
      // MEDIDO: MeteoAlarm responde 406 si se negocia un tipo concreto
      // (ni `application/json` ni `application/atom+xml,application/xml`
      // funcionan); sólo sirve el feed si se acepta cualquier tipo.
      const outcome = await http({ url, timeoutMs, userAgent, accept: '*/*' });

      if (outcome.kind === 'timeout') {
        return {
          status: 'error',
          provenance: prov('degraded'),
          message: `timeout after ${outcome.timeoutMs}ms calling ${redactUrl(url)}`,
          retryable: true,
        };
      }
      if (outcome.kind === 'network_error') {
        return {
          status: 'error',
          provenance: prov('degraded'),
          message: `network error: ${outcome.message}`,
          retryable: true,
        };
      }
      if (outcome.kind === 'http_error') {
        if (outcome.status === 429) {
          return { status: 'rate_limited', provenance: prov('degraded'), retryAfterMs: outcome.retryAfterMs ?? 60_000 };
        }
        return {
          status: 'error',
          provenance: prov('degraded'),
          message: `HTTP ${outcome.status} from ${redactUrl(url)}`,
          retryable: outcome.status >= 500,
        };
      }

      const parsed = parseMeteoalarmFeed(outcome.bodyText);
      if (parsed === null) {
        // XML roto o documento ajeno: fuente silenciosa.
        return { status: 'no_data', provenance: prov('degraded'), reason: 'source-silent' };
      }

      // Feed vacío (AD hoy) es un hecho legítimo: no hay avisos vigentes.
      if (parsed.entryCount === 0 || parsed.items.length === 0) {
        return { status: 'no_data', provenance: prov('degraded'), reason: 'source-silent' };
      }

      const active = parsed.items.filter((item) => isActive(item, now));
      if (active.length === 0) {
        return { status: 'no_data', provenance: prov('degraded'), reason: 'source-silent' };
      }

      // Sin modificar el contenido: se sirven los avisos tal cual llegan.
      // `observedAt` = emisión real más reciente de los avisos servidos.
      const issuedAt = latestIssueTime(
        active.map((a) => a.id),
        parsed.sentById,
      );
      // L2: si la consulta es de UN país, la atribución es su NMHS; multi-país
      // sigue siendo «EUMETNET – MeteoAlarm». Se emite resuelta en el bundle
      // para que el cliente no tenga que deducirla.
      const bundleAttribution = meteoalarmAttribution([country]);
      return {
        status: 'ok',
        data: {
          alerts: active,
          attribution: bundleAttribution,
          // Obligaciones LITERALES de los T&C, servidas con el dato.
          disclaimer: METEOALARM_DISCLAIMER,
          sourceUrl: METEOALARM_SOURCE_URL,
        },
        provenance: { ...prov(issuedAt === null ? 'degraded' : 'live', issuedAt), attribution: bundleAttribution },
      };
    },

    attribution: () => attribution,
  };
}

export { METEOALARM_DISCLAIMER, METEOALARM_SOURCE_URL };
