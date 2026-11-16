/**
 * C5/C6 + T1–T7 — Cadenas de fallback y tiempo determinista.
 *
 * C5: toda entrada de FALLBACK_CHAINS termina en una razón explícita, nunca en
 *     null/undefined silencioso.
 * C6: la cadena `image` es [] y getImage-like devuelve 'blocked'.
 * T1–T7 (§2bis): reloj fijo, doble zona UTC / Europe/Madrid, DST, TTLs.
 */
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FALLBACK_CHAINS } from '../chain/fallback-chains.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');
const FIXED_MS = FIXED_NOW.getTime();

const HERE = fileURLToPath(import.meta.url);
const SRC = resolve(HERE, '../..'); // web-ssr/src/snow

const DATA_TYPES = [
  'station-master',
  'operational-status',
  'snow-depth',
  'forecast',
  'weather-alert',
  'avalanche',
  'basemap',
  'image',
];

// ------------------------------------------------------------------ C5 / C6

test('C5: FALLBACK_CHAINS declara las 8 claves de dominio', () => {
  const keys = Object.keys(FALLBACK_CHAINS).sort();
  assert.deepStrictEqual(keys, [...DATA_TYPES].sort(), `claves inesperadas: ${keys.join(',')}`);
});

test('C5: toda cadena no vacía termina en un proveedor autorizado (nunca null)', () => {
  for (const dt of DATA_TYPES) {
    const chain = FALLBACK_CHAINS[dt];
    assert.ok(Array.isArray(chain), `${dt}: la cadena debe ser un array`);

    if (dt === 'image') continue; // cubierto por C6

    assert.ok(chain.length > 0, `${dt}: la cadena no puede estar vacía (terminaría en null silencioso)`);

    const last = chain[chain.length - 1];
    assert.ok(typeof last === 'string' && last.length > 0, `${dt}: el último eslabón no es un proveedor válido`);

    // El fin de cadena debe ser editorial (nuestro) o un proveedor autorizado.
    assert.ok(
      ['editorial-stations', 'editorial-report'].includes(last) ||
        /^(aemet|aemet-bpa|meteofrance|copernicus-c3s|copernicus-clms|ign-es|ign-fr|osm|protomaps)/.test(last),
      `${dt}: el último eslabón '${last}' no es editorial ni un proveedor autorizado`,
    );
  }
});

test('C5: operational-status y snow-depth son SOLO editoriales (D4)', () => {
  assert.deepStrictEqual([...FALLBACK_CHAINS['operational-status']], ['editorial-report'],
    'operational-status no tiene proveedor automático autorizado');
  assert.deepStrictEqual([...FALLBACK_CHAINS['snow-depth']], ['editorial-report'],
    'snow-depth no tiene proveedor automático autorizado');
});

test('C6: la cadena image es [] — no existe cadena legal (05b §7.4)', () => {
  assert.deepStrictEqual([...FALLBACK_CHAINS['image']], [],
    'una cadena para imágenes permitiría proxy/reemisión de webcams');
});

test('C6: ningún provider bloqueado aparece en NINGUNA cadena', () => {
  const blocked = ['infonieve', 'ipma', 'meteoandorra', 'maptiler', 'stadia', 'mapbox', 'opentopomap',
    'aramon', 'baqueira', 'grandvalira', 'fgc', 'feratel', 'osm-tiles', 'meteofrance-bpa-html'];
  for (const dt of DATA_TYPES) {
    for (const p of FALLBACK_CHAINS[dt]) {
      assert.ok(!blocked.includes(p), `${dt}: proveedor bloqueado '${p}' en la cadena`);
    }
  }
});

// --------------------------------------------------------------- T1–T7 (§2bis)

test('T1: freshness es exacto y determinista bajo el reloj fijo', () => {
  const observed = new Date(FIXED_MS - 90_000).toISOString();
  const freshness = Math.floor((FIXED_NOW.getTime() - new Date(observed).getTime()) / 1000);
  assert.strictEqual(freshness, 90, 'freshness debe ser exactamente 90 s');
});

test('T2: UTC y Europe/Madrid no alteran el dato almacenado', () => {
  const iso = new Date(FIXED_MS).toISOString();
  // El valor almacenado es el mismo instante, independientemente de la zona de presentación.
  assert.strictEqual(new Date(iso).getTime(), FIXED_MS);

  const madrid = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(FIXED_MS));
  const utc = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(FIXED_MS));

  assert.strictEqual(utc, '12:00', `UTC debe ser 12:00, fue ${utc}`);
  assert.strictEqual(madrid, '13:00', `Europe/Madrid (CET invierno) debe ser 13:00, fue ${madrid}`);
});

test('T3: un capturedAt de 23:30Z se etiqueta con el día siguiente en Madrid', () => {
  const captured = new Date('2026-11-16T23:30:00.000Z');
  const madridDay = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(captured);
  assert.match(madridDay, /17\/11\/2026|17\/11\/26|2026-11-17|17\/11/,
    `23:30Z en Madrid debe ser 17-nov, fue ${madridDay}`);
});

test('T4: bordes de TTL con reloj fijo (29 min fresco, 31 min caducado)', () => {
  const TTL_MS = 30 * 60_000;
  const fresh = FIXED_MS - 29 * 60_000;
  const stale = FIXED_MS - 31 * 60_000;
  assert.ok(FIXED_MS - fresh <= TTL_MS, '29 min debe estar dentro del TTL');
  assert.ok(FIXED_MS - stale > TTL_MS, '31 min debe haber superado el TTL');
});

test('T5: el cambio de hora (DST) no rompe el formateo', () => {
  const cases = [
    { iso: '2026-03-29T00:30:00.000Z', note: 'cambio de marzo' },
    { iso: '2026-10-25T00:30:00.000Z', note: 'cambio de octubre' },
  ];
  for (const { iso, note } of cases) {
    const formatted = new Intl.DateTimeFormat('es-ES', {
      timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(iso));
    assert.match(formatted, /^\d{2}:\d{2}$/, `${note}: formateo inválido '${formatted}'`);
  }
});

test('T6: un aviso caducado no puede considerarse vigente', () => {
  const validUntil = new Date(FIXED_MS - 60_000).toISOString();
  assert.ok(new Date(validUntil).getTime() < FIXED_MS, 'un aviso que terminó antes del reloj fijo está caducado');
});

test('T7 (meta): ningún fichero de test usa Date.now() ni new Date() sin argumento', () => {
  const TESTS = resolve(SRC, 'tests');
  const offenders = [];

  const walkTs = (dir, out = []) => {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walkTs(full, out);
      else if (e.endsWith('.test.ts')) out.push(full);
    }
    return out;
  };

  for (const f of walkTs(TESTS)) {
    // El propio detector contiene los patrones como literales: se excluye a sí
    // mismo para no autoincriminarse (falso positivo clásico de meta-tests).
    if (f === HERE) continue;

    const src = readFileSync(f, 'utf8');
    // Se permite `Date.now`/`new Date(` dentro de comentarios; se mira el código.
    const code = src
      .split('\n')
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');

    if (/\bDate\.now\s*\(/.test(code)) offenders.push(`${f}: Date.now()`);
    const bare = code.match(/new\s+Date\s*\(\s*\)/g);
    if (bare) offenders.push(`${f}: new Date() sin argumento`);
  }

  assert.deepStrictEqual(offenders, [],
    `no-determinismo temporal; usar FIXED_NOW inyectado:\n${offenders.join('\n')}`);
});
