/**
 * SNOW-03 · t8 — CONFORMIDAD LEGAL LITERAL de MeteoAlarm (finding L1 de t5).
 *
 * El blocker: la API servía avisos de MeteoAlarm SIN el disclaimer ni el enlace
 * que sus T&C exigen, y el texto publicado era una PARÁFRASIS que además nunca
 * llegaba a servirse. Estos tests fijan la conformidad contra el texto LITERAL
 * verificado en la Fase A (no contra una copia reescrita por mí):
 *
 *   LC1  el disclaimer es IDÉNTICO carácter a carácter al de los T&C
 *   LC2  incluye las dos frases exigidas y la URL www.meteoalarm.org
 *   LC3  el enlace obligatorio existe y apunta a meteoalarm.org
 *   LC4  la latencia efectiva está acotada: TTL ≤ 10 min
 *   LC5  la atribución por NMHS cuando el aviso es de UN país (L2)
 */
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  METEOALARM_DISCLAIMER,
  METEOALARM_LATENCY_DISCLAIMER,
  METEOALARM_LINK_TARGET,
  METEOALARM_SOURCE_URL,
  meteoalarmAttribution,
  METEOALARM_NMHS,
} from '../providers/authorizations.ts';
import { CACHE_POLICY } from '../cache/cache-policy.ts';

const HERE = fileURLToPath(import.meta.url);
// tests → snow → src → web-ssr → raíz del repo
const ROOT = resolve(HERE, '..', '..', '..', '..', '..');

/** Texto literal de los T&C tal como lo capturó la Fase A. */
function literalTermsFromEvidence(): readonly string[] {
  const path = join(ROOT, 'docs', 'snow', 'snow03-t1-verification-cache.json');
  const raw = JSON.parse(readFileSync(path, 'utf8')) as {
    literal_extracts: Record<string, readonly string[]>;
  };
  return raw.literal_extracts.meteoalarm_terms ?? [];
}

/** Extrae el texto entrecomillado del extracto «must publish the following disclaimer: "…"». */
function disclaimerFromTerms(): string {
  const line = literalTermsFromEvidence().find((x) =>
    x.startsWith('All redistributors must publish the following disclaimer'),
  );
  assert.ok(line, 'la evidencia de Fase A debe contener la cláusula del disclaimer');
  const first = line.indexOf('"');
  const last = line.lastIndexOf('"');
  assert.ok(first >= 0 && last > first, 'el disclaimer debe ir entrecomillado en los T&C');
  return line.slice(first + 1, last);
}

// ------------------------------------------------------------------- LC1

test('LC1: el disclaimer publicado NO contiene restos de Markdown', () => {
  // TRAMPA documentada: el CMS sirve el texto con enlaces Markdown DENTRO de las
  // comillas ("[www.meteoalarm.org](https://…)"). Si se copia el HTML crudo se
  // publicarían corchetes y paréntesis en el texto VISIBLE, y un test de igualdad
  // ingenua lo aprobaría. El texto publicado debe ser texto PLANO con el Markdown
  // RESUELTO; la URL obligatoria va en `sourceUrl`, no incrustada.
  assert.ok(!METEOALARM_DISCLAIMER.includes(']('), 'no debe contener enlaces Markdown');
  assert.ok(!METEOALARM_DISCLAIMER.includes('['), 'no debe contener corchetes');
  assert.ok(!METEOALARM_DISCLAIMER.includes(']'), 'no debe contener corchetes');
  assert.ok(!/https?:\/\//.test(METEOALARM_DISCLAIMER), 'la URL va en sourceUrl, no en el texto');
  // Y sí contiene el dominio como texto visible (lo que el usuario debe leer).
  assert.ok(METEOALARM_DISCLAIMER.includes('www.meteoalarm.org'));
});

test('LC1: el texto de la evidencia está libre de Markdown (canónico, no HTML crudo)', () => {
  const raw = disclaimerFromTerms();
  assert.ok(!raw.includes(']('), 'la evidencia canónica no debe traer Markdown');
  assert.ok(!raw.includes('['), 'la evidencia canónica no debe traer corchetes');
});

test('LC1: el disclaimer es IDÉNTICO carácter a carácter al de los T&C', () => {
  const expected = disclaimerFromTerms();
  assert.strictEqual(
    METEOALARM_DISCLAIMER,
    expected,
    'el disclaimer publicado debe ser LITERAL; una paráfrasis incumple los T&C',
  );
  // Blindaje extra: longitud y notablemente que no es el texto antiguo.
  assert.strictEqual(METEOALARM_DISCLAIMER.length, expected.length);
  assert.ok(
    !METEOALARM_DISCLAIMER.includes('En una emergencia'),
    'no debe reaparecer la paráfrasis anterior',
  );
});

test('LC1: el alias antiguo apunta al texto LITERAL, no a una paráfrasis', () => {
  assert.strictEqual(METEOALARM_LATENCY_DISCLAIMER, METEOALARM_DISCLAIMER);
});

// ------------------------------------------------------------------- LC2

test('LC2: el disclaimer contiene las dos frases y la URL exigidas', () => {
  assert.ok(
    METEOALARM_DISCLAIMER.startsWith('Time delays between this website and the www.meteoalarm.org website are possible.'),
    'primera frase exigida',
  );
  assert.ok(
    METEOALARM_DISCLAIMER.endsWith('please refer to www.meteoalarm.org.'),
    'segunda frase exigida, terminando en la URL',
  );
  assert.ok(METEOALARM_DISCLAIMER.includes('National Meteorological and Hydrological Services'));
});

test('LC2: la cláusula de enlace está en la evidencia y nombra www.meteoalarm.org', () => {
  const linkLine = literalTermsFromEvidence().find((x) => x.includes('must include a link'));
  assert.ok(linkLine, 'la evidencia debe contener la cláusula de enlace');
  assert.ok(linkLine.includes(METEOALARM_LINK_TARGET));
});

// ------------------------------------------------------------------- LC3

test('LC3: el enlace obligatorio apunta a meteoalarm.org (HTTPS)', () => {
  const url = new URL(METEOALARM_SOURCE_URL);
  assert.strictEqual(url.protocol, 'https:');
  assert.match(url.hostname, /(^|\.)meteoalarm\.org$/);
  assert.ok(METEOALARM_SOURCE_URL.startsWith('https://meteoalarm.org/'));
});

// ------------------------------------------------------------------- LC4

test('LC4: la latencia efectiva está acotada a ≤10 min por el TTL', () => {
  const ttl = CACHE_POLICY.meteoalarm?.ttlMs ?? Number.NaN;
  assert.ok(Number.isFinite(ttl) && ttl > 0, 'debe existir TTL para meteoalarm');
  assert.ok(ttl <= 10 * 60_000, `el TTL (${ttl} ms) no puede superar los 10 min de los T&C`);
  // La media exigida es <5 min: el TTL de 10 min es el TECHO legal, no la media,
  // así que se documenta el margen y se exige que nunca exceda el máximo.
  assert.strictEqual(ttl, 10 * 60_000, 'TTL de 10 min = máximo legal permitido');
});

// ------------------------------------------------------------------- LC5

test('LC5 (L2): un aviso de UN país se atribuye al NMHS correspondiente', () => {
  assert.strictEqual(meteoalarmAttribution(['ES']), `${METEOALARM_NMHS.ES} vía EUMETNET – MeteoAlarm`);
  assert.match(meteoalarmAttribution(['FR']), /Météo-France/);
  assert.match(meteoalarmAttribution(['PT']), /IPMA/);
  assert.match(meteoalarmAttribution(['AD']), /Meteo Andorra/);
});

test('LC5 (L2): multi-país se atribuye EXACTAMENTE a «EUMETNET – MeteoAlarm»', () => {
  const multi = literalTermsFromEvidence().find((x) => x.includes('spans more than one country'));
  assert.ok(multi, 'la evidencia debe contener la cláusula multi-país');
  assert.strictEqual(meteoalarmAttribution(['ES', 'FR', 'PT', 'AD']), 'EUMETNET – MeteoAlarm');
  assert.strictEqual(meteoalarmAttribution(['ES', 'ES', 'FR']), 'EUMETNET – MeteoAlarm');
});
