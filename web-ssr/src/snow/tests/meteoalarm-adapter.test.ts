/**
 * SNOW-03 · Fase C — Adapter REAL de MeteoAlarm con fixtures GRABADAS.
 *
 * Los cuatro feeds Atom se capturaron de la ruta real
 * (`feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-<país>`); su procedencia
 * (URL, instante, HTTP, sha256, nº de entries y la cláusula `<rights>`) está en
 * `fixtures/METEOALARM-PROVENANCE.json`. Estos tests NO tocan la red.
 *
 *   MA1  integridad de las fixtures (sha256 contra PROVENANCE)
 *   MA2  parseo real: ES 68, FR 233, PT 14 avisos; AD vacío
 *   MA3  el NIVEL manda por el COLOR del evento, no por cap:severity
 *   MA4  feed vacío ⇒ no_data (nunca error, nunca aviso inventado)
 *   MA5  XML roto / raíz ajena ⇒ no_data/source-silent
 *   MA6  5xx ⇒ error retryable; 4xx ⇒ no retryable; 429 ⇒ rate_limited
 *   MA7  ventana de validez: un aviso caducado no se sirve
 *   MA8  atribución EUMETNET/MeteoAlarm y NMHS por país, y disclaimer de latencia
 *   MA9  la URL usa la ruta real (nunca /api/v1/warnings/feeds-XX)
 */
import test from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  feedUrlFor,
  isActive,
  latestIssueTime,
  meteoalarmAdapter,
  parseMeteoalarmFeed,
  warningLevel,
} from '../providers/meteoalarm.adapter.ts';
import type { HttpClient } from '../providers/http-client.ts';
import type { ProviderInput } from '../contracts/provider-contracts.ts';
import {
  authorizationFor,
  meteoalarmAttribution,
  METEOALARM_DISCLAIMER,
  METEOALARM_LATENCY_DISCLAIMER,
} from '../providers/authorizations.ts';

const HERE = fileURLToPath(import.meta.url);
const FIXTURES = join(HERE, '..', '..', 'providers', 'fixtures');
const xml = (slug: string): string => readFileSync(join(FIXTURES, `meteoalarm-${slug}.xml`), 'utf8');

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');

const input = (country: 'ES' | 'AD' | 'FR' | 'PT' = 'ES'): ProviderInput => ({
  stationRef: { slug: 'baqueira-beret', country, lat: 42.638, lng: 0.766 },
  requestedAt: FIXED_NOW,
  dataType: 'weather-alert',
});

const okClient = (bodyText: string): HttpClient => async () => ({
  kind: 'ok',
  status: 200,
  bodyText,
  contentType: 'application/atom+xml; charset=utf-8',
});

const adapter = (http: HttpClient) => meteoalarmAdapter(authorizationFor('meteoalarm'), { http });

// ------------------------------------------------------------------- MA1

test('MA1: las fixtures coinciden byte a byte con METEOALARM-PROVENANCE.json', () => {
  const prov = JSON.parse(readFileSync(join(FIXTURES, 'METEOALARM-PROVENANCE.json'), 'utf8')) as {
    records: Array<{ country: string; file: string; sha256: string; bytes: number; entries: number; rights: string | null }>;
  };
  assert.strictEqual(prov.records.length, 4, 'deben existir los 4 países');

  for (const r of prov.records) {
    const body = readFileSync(join(FIXTURES, r.file), 'utf8');
    assert.strictEqual(createHash('sha256').update(body).digest('hex'), r.sha256, `${r.file}: sha256`);
    assert.strictEqual(Buffer.byteLength(body, 'utf8'), r.bytes, `${r.file}: tamaño`);
    assert.ok(r.rights && r.rights.includes('CC BY 4.0'), `${r.file}: la cláusula <rights> debe estar registrada`);
  }
});

// ------------------------------------------------------------------- MA2

test('MA2: parsea los feeds reales (ES 68, FR 233, PT 14) y AD vacío', () => {
  const es = parseMeteoalarmFeed(xml('spain'));
  const fr = parseMeteoalarmFeed(xml('france'));
  const pt = parseMeteoalarmFeed(xml('portugal'));
  const ad = parseMeteoalarmFeed(xml('andorra'));

  assert.ok(es && fr && pt && ad);
  assert.strictEqual(es.entryCount, 68);
  assert.strictEqual(fr.entryCount, 233);
  assert.strictEqual(pt.entryCount, 14);
  assert.strictEqual(ad.entryCount, 0, 'Andorra llega vacío de verdad');

  // PT sí trae color explícito ⇒ todos sus avisos se conservan.
  assert.strictEqual(pt.items.length, 14);
  assert.ok(pt.items.every((i) => i.level === 'yellow'));
});

test('MA2: los avisos reales traen id, área, fenómeno y ventana ISO', () => {
  const pt = parseMeteoalarmFeed(xml('portugal'));
  assert.ok(pt);
  const first = pt.items[0];
  assert.strictEqual(first.id, '2.49.0.0.620.0.PT.261116125351.PO-10-6383');
  assert.strictEqual(first.area, 'Vila Real');
  assert.strictEqual(first.phenomenon, 'Yellow Rain Warning');
  assert.strictEqual(first.validFrom, '2026-11-16T18:00:00.000Z');
  assert.strictEqual(first.validUntil, '2026-11-17T06:00:00.000Z');
});

test('MA2: la cláusula <rights> se extrae literal de cada feed', () => {
  for (const slug of ['spain', 'france', 'portugal', 'andorra']) {
    const p = parseMeteoalarmFeed(xml(slug));
    assert.ok(p);
    assert.match(p.rights ?? '', /Licensed under terms equivalent to CC BY 4\.0/, slug);
  }
});

// ------------------------------------------------------------------- MA3

test('MA3: el nivel sale del COLOR del <title>, no de cap:severity', () => {
  assert.strictEqual(warningLevel('Yellow Rain Warning issued for Portugal - Vila Real', null), 'yellow');
  assert.strictEqual(warningLevel('Orange wind warning', null), 'orange');
  assert.strictEqual(warningLevel('Red snow warning', null), 'red');
  assert.strictEqual(warningLevel('Green flood warning', null), 'green');
  // Sin color en ninguna fuente y severidad neutra: NO se adivina.
  assert.strictEqual(warningLevel(null, 'Moderate avalanches warning', 'Moderate'), null);
});

test('MA3: `cap:event` es RESPALDO si el title no trae color', () => {
  // title sin color, event con color ⇒ se usa el event.
  assert.strictEqual(warningLevel('Aviso sin color', 'Orange wind warning', 'Moderate'), 'orange');
  // title manda cuando ambos lo tienen (no se compone ni se mezcla).
  assert.strictEqual(warningLevel('Yellow Rain Warning', 'Red Rain Warning', 'Moderate'), 'yellow');
});

test('MA3: severidad CAP sólo actúa como último recurso (nunca asciende "Moderate")', () => {
  assert.strictEqual(warningLevel(null, null, 'Extreme'), 'red');
  assert.strictEqual(warningLevel(null, null, 'Severe'), 'orange');
  assert.strictEqual(warningLevel(null, null, 'Minor'), 'yellow');
  assert.strictEqual(warningLevel(null, null, 'Moderate'), null, 'Moderate sin color no decide');
});

test('MA3 (REGRESIÓN t6): un entry REAL de ES produce level "yellow" (antes se descartaba)', () => {
  // Entry literal del feed de España: el color está en <title>, mientras
  // cap:event dice «Moderate coastalevent warning» (sin color). Con el `??`
  // anterior el title nunca se leía y el aviso se perdía.
  const xmlEs = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2">
  <rights>Copyright © 2026 MeteoAlarm.Org.</rights>
  <entry>
    <cap:areaDesc>Costa - Poniente y Almería Capital</cap:areaDesc>
    <cap:event>Moderate coastalevent warning</cap:event>
    <cap:sent>2026-11-16T10:44:09+00:00</cap:sent>
    <cap:expires>2026-11-17T22:59:59+00:00</cap:expires>
    <cap:onset>2026-11-17T17:00:00+00:00</cap:onset>
    <cap:severity>Moderate</cap:severity>
    <cap:identifier>2.49.0.0.724.0.ES.261116104409.610403COCO172325849</cap:identifier>
    <title>Yellow Coastalevent Warning issued for Spain - Costa - Poniente y Almería Capital</title>
    <updated>2026-11-16T10:44:09Z</updated>
  </entry></feed>`;

  const parsed = parseMeteoalarmFeed(xmlEs);
  assert.ok(parsed);
  assert.strictEqual(parsed.items.length, 1, 'el aviso ya NO se descarta');
  assert.strictEqual(parsed.items[0].level, 'yellow', 'nivel leído del <title>');
  assert.strictEqual(parsed.items[0].phenomenon, 'Moderate coastalevent warning', 'se conserva cap:event');
});

test('MA3 (REGRESIÓN t6): un entry REAL de FR produce level "yellow" (antes se descartaba)', () => {
  const xmlFr = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2">
  <rights>Copyright © 2026 MeteoAlarm.Org.</rights>
  <entry>
    <cap:areaDesc>Haute-Savoie</cap:areaDesc>
    <cap:event>Moderate avalanches warning</cap:event>
    <cap:sent>2026-11-16T16:02:37+00:00</cap:sent>
    <cap:expires>2026-11-17T23:00:00+00:00</cap:expires>
    <cap:onset>2026-11-16T23:00:00+00:00</cap:onset>
    <cap:severity>Moderate</cap:severity>
    <cap:identifier>2.49.0.0.250.0.FR.20261116160237.462028</cap:identifier>
    <title>Yellow Avalanches Warning issued for France - Haute-Savoie</title>
    <updated>2026-11-16T16:02:37Z</updated>
  </entry></feed>`;

  const parsed = parseMeteoalarmFeed(xmlFr);
  assert.ok(parsed);
  assert.strictEqual(parsed.items.length, 1);
  assert.strictEqual(parsed.items[0].level, 'yellow');
  assert.strictEqual(parsed.items[0].phenomenon, 'Moderate avalanches warning');
});

test('MA3: los feeds REALES ya no pierden avisos (ES 68, FR 233, PT 14)', () => {
  for (const [slug, expected] of [['spain', 68], ['france', 233], ['portugal', 14]] as const) {
    const p = parseMeteoalarmFeed(xml(slug));
    assert.ok(p);
    assert.strictEqual(p.entryCount, expected);
    assert.strictEqual(p.items.length, expected, `${slug}: ningún aviso debe descartarse`);
    assert.ok(p.items.every((i) => i.level === 'yellow'), `${slug}: todos son amarillos en la captura`);
  }
  const ad = parseMeteoalarmFeed(xml('andorra'));
  assert.ok(ad);
  assert.strictEqual(ad.items.length, 0, 'AD vacío sigue vacío');
});

test('MA3: un entry SIN color reconocible se SIGUE descartando (no se inventa nivel)', () => {
  const noColor = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom" xmlns:cap="urn:oasis:names:tc:emergency:cap:1.2">
  <rights>Copyright © 2026 MeteoAlarm.Org.</rights>
  <entry>
    <cap:areaDesc>Zona X</cap:areaDesc>
    <cap:event>Moderate generic warning</cap:event>
    <cap:sent>2026-11-16T10:00:00+00:00</cap:sent>
    <cap:expires>2026-11-18T00:00:00+00:00</cap:expires>
    <cap:severity>Moderate</cap:severity>
    <cap:identifier>no-color-1</cap:identifier>
    <title>Aviso sin color de nivel</title>
    <updated>2026-11-16T10:00:00Z</updated>
  </entry></feed>`;

  const parsed = parseMeteoalarmFeed(noColor);
  assert.ok(parsed);
  assert.strictEqual(parsed.entryCount, 1);
  assert.strictEqual(parsed.items.length, 0, 'sin color ⇒ se descarta, jamás se inventa un nivel');
});

// ------------------------------------------------------------------- MA4

test('MA4: feed vacío (AD) ⇒ no_data, jamás error ni aviso inventado', async () => {
  const a = adapter(okClient(xml('andorra')));
  const r = await a.fetch(input('AD'));
  assert.strictEqual(r.status, 'no_data');
  assert.strictEqual((r as { reason: string }).reason, 'source-silent');
});

test('MA4: país fuera de cobertura ⇒ no_data/not-covered sin tocar la red', async () => {
  const a = meteoalarmAdapter(authorizationFor('meteoalarm'), {
    http: async () => {
      throw new Error('no debería llamarse');
    },
  });
  const r = await a.fetch(input('IT' as 'ES'));
  assert.strictEqual(r.status, 'no_data');
  assert.strictEqual((r as { reason: string }).reason, 'not-covered');
});

// ------------------------------------------------------------------- MA5

test('MA5: XML malformado o documento ajeno ⇒ no_data/source-silent', async () => {
  for (const body of ['no es xml', '<html><body>error</body></html>', '<?xml version="1.0"?><rss></rss>']) {
    const r = await adapter(okClient(body)).fetch(input('ES'));
    assert.strictEqual(r.status, 'no_data', `cuerpo: ${body.slice(0, 24)}`);
    assert.strictEqual((r as { reason: string }).reason, 'source-silent');
  }
});

// ------------------------------------------------------------------- MA6

test('MA6: 503 ⇒ error retryable; 404 ⇒ no retryable; 429 ⇒ rate_limited', async () => {
  const err = (status: number): HttpClient => async () => ({ kind: 'http_error', status, retryAfterMs: null });
  const a503 = await adapter(err(503)).fetch(input('ES'));
  const a404 = await adapter(err(404)).fetch(input('ES'));
  const a429 = await adapter(async () => ({ kind: 'http_error', status: 429, retryAfterMs: 30_000 })).fetch(input('ES'));

  assert.strictEqual(a503.status, 'error');
  assert.strictEqual((a503 as { retryable: boolean }).retryable, true);
  assert.strictEqual(a404.status, 'error');
  assert.strictEqual((a404 as { retryable: boolean }).retryable, false);
  assert.strictEqual(a429.status, 'rate_limited');
  assert.strictEqual((a429 as { retryAfterMs: number }).retryAfterMs, 30_000);
});

test('MA6: timeout ⇒ error retryable', async () => {
  const r = await adapter(async () => ({ kind: 'timeout', timeoutMs: 8000 })).fetch(input('ES'));
  assert.strictEqual(r.status, 'error');
  assert.match((r as { message: string }).message, /timeout/);
});

// ------------------------------------------------------------------- MA7

test('MA7: un aviso caducado no está activo', () => {
  const item = { id: 'x', level: 'yellow' as const, phenomenon: 'p', validFrom: '2026-11-15T00:00:00.000Z', validUntil: '2026-11-15T10:00:00.000Z', area: 'a' };
  assert.strictEqual(isActive(item, FIXED_NOW), false);
  assert.strictEqual(isActive({ ...item, validUntil: '2026-11-17T00:00:00.000Z' }, FIXED_NOW), true);
});

test('MA7: el adapter no sirve avisos ya vencidos (PT real filtrado por reloj)', async () => {
  // Reloj muy posterior: los avisos de la fixture habrán vencido.
  const later = new Date('2026-12-01T00:00:00.000Z');
  const r = await adapter(okClient(xml('portugal'))).fetch({ ...input('PT'), requestedAt: later });
  assert.strictEqual(r.status, 'no_data', 'sin avisos vigentes ⇒ no_data');
});

// ------------------------------------------------------------------- MA8

test('MA8: atribución multi-país y por NMHS, más disclaimer LITERAL exigido', () => {
  assert.strictEqual(meteoalarmAttribution(['ES', 'FR', 'PT', 'AD']), 'EUMETNET – MeteoAlarm');
  assert.match(meteoalarmAttribution(['ES']), /AEMET/);
  assert.match(meteoalarmAttribution(['FR']), /Météo-France/);
  assert.match(meteoalarmAttribution(['PT']), /IPMA/);
  assert.match(meteoalarmAttribution(['AD']), /Meteo Andorra/);

  // t8: el disclaimer publicado es el LITERAL de los T&C, no la paráfrasis antigua
  // (que hablaba de «10 minutos» y de EUMETNET y nunca se publicaba).
  assert.strictEqual(METEOALARM_LATENCY_DISCLAIMER, METEOALARM_DISCLAIMER);
  assert.ok(METEOALARM_DISCLAIMER.startsWith('Time delays between this website'));
  assert.ok(METEOALARM_DISCLAIMER.endsWith('please refer to www.meteoalarm.org.'));
  assert.ok(!/10 minutos/.test(METEOALARM_DISCLAIMER), 'no debe conservar la paráfrasis');
  assert.ok(!/\]\(|\[|\]/.test(METEOALARM_DISCLAIMER), 'sin restos de Markdown');
});

test('MA8: el adapter emite la atribución y marca licencia con atribución', () => {
  const a = meteoalarmAdapter(authorizationFor('meteoalarm'), { http: okClient(xml('portugal')) });
  assert.strictEqual(a.id, 'meteoalarm');
  assert.strictEqual(a.licenseByType['weather-alert'], 'allowed-with-attribution');
  assert.strictEqual(a.attribution(), 'EUMETNET – MeteoAlarm');
  assert.strictEqual(a.canServe(input('ES')), true);
  assert.strictEqual(a.canServe({ ...input('ES'), dataType: 'forecast' }), false);
});

// ------------------------------------------------------------------- MA9

test('MA9: se usa la ruta REAL del feed; nunca /api/v1/warnings/feeds-XX', () => {
  assert.strictEqual(
    feedUrlFor('ES'),
    'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain',
  );
  assert.strictEqual(feedUrlFor('AD'), 'https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-andorra');
  for (const c of ['ES', 'AD', 'FR', 'PT'] as const) {
    assert.ok(!feedUrlFor(c).includes('/api/v1/warnings'), 'la ruta antigua está en 404');
  }
});

// ------------------------------------------------------------- MA10 (antigüedad)

test('MA10: observedAt es la EMISIÓN real del feed, no el instante de la petición', async () => {
  // Regresión t4: antes se pasaba `now` como observedAt y `freshness` valía
  // SIEMPRE 0, de modo que el usuario no podía saber si el aviso era de hace un
  // minuto o de hace horas. Ahora observedAt = emisión más reciente del feed.
  const later = new Date('2026-11-16T22:00:00.000Z');
  const r = await adapter(okClient(xml('portugal'))).fetch({ ...input('PT'), requestedAt: later });

  assert.strictEqual(r.status, 'ok');
  assert.notStrictEqual(r.provenance.observedAt, later.toISOString(), 'no debe ser el instante de la petición');
  assert.strictEqual(r.provenance.observedAt, '2026-11-16T12:53:51.000Z', 'emisión real más reciente del feed');
  assert.strictEqual(r.provenance.updatedAt, r.provenance.observedAt, 'updatedAt refleja la emisión');
  assert.ok(r.provenance.freshness > 0, `freshness debe MEDIR (>0), fue ${r.provenance.freshness}`);
  assert.strictEqual(
    r.provenance.freshness,
    Math.round((later.getTime() - Date.parse('2026-11-16T12:53:51.000Z')) / 1000),
    'freshness = petición − emisión real',
  );
});

test('MA10: sin avisos (AD vacío) la procedencia es `degraded` y no inventa emisión', async () => {
  const r = await adapter(okClient(xml('andorra'))).fetch(input('AD'));
  assert.strictEqual(r.status, 'no_data');
  assert.strictEqual(r.provenance.status, 'degraded');
  assert.strictEqual(r.provenance.updatedAt, null, 'sin avisos no hay emisión que declarar');
});

test('MA10: latestIssueTime elige la emisión MÁS RECIENTE de los avisos dados', () => {
  const sent = new Map([
    ['a', '2026-11-16T08:00:00.000Z'],
    ['b', '2026-11-16T11:30:00.000Z'],
    ['c', '2026-11-15T20:00:00.000Z'],
  ]);
  assert.strictEqual(latestIssueTime(['a', 'b', 'c'], sent), '2026-11-16T11:30:00.000Z');
  assert.strictEqual(latestIssueTime(['x'], sent), null, 'ids sin emisión conocida ⇒ null');
  assert.strictEqual(latestIssueTime([], sent), null);
});
