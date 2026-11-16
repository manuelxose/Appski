/**
 * Bootstrap del seed editorial (R2).
 *
 * El README de `seed/` prometía "se copian la primera vez que el servidor
 * arranca", pero `readStore` devolvía `records: []` si el fichero no existía: el
 * maestro se servía VACÍO y todo detalle daba 404. Estos tests fijan el contrato
 * del bootstrap para que esa promesa no vuelva a quedar sin implementar.
 *
 * Se comprueba EJECUTANDO `createSnowRouter` contra un directorio temporal
 * vacío, no leyendo fuente (un test vacuo pasaría con el bug presente).
 */
import test from 'node:test';
import assert from 'node:assert';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createSnowRouter } from '../../snow/server/index.ts';
import { bootstrapStore } from '../store/json-store/file-io.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');
const clock = () => FIXED_NOW;

const SEED_DIR = join(import.meta.dirname, '..', 'store', 'json-store', 'seed');

/** Los 3 registros curados del seed editorial (no inventados por el test). */
const CURATED_SLUGS = ['baqueira-beret', 'formigal-panticosa', 'grandvalira'];

const dirs = [];

function emptyDir() {
  const dir = mkdtempSync(join(tmpdir(), 'snow-bootstrap-'));
  dirs.push(dir);
  return dir;
}

async function withApp(dir, fn) {
  const app = express();
  app.use('/api/snow', createSnowRouter(dir, clock));
  const srv = app.listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  try {
    return await fn(`http://127.0.0.1:${srv.address().port}/api/snow`);
  } finally {
    srv.close();
  }
}

test.after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

test('B1: directorio de datos VACÍO => el seed se importa y /v1/stations sirve 3 estaciones', async () => {
  const dir = emptyDir();
  await withApp(dir, async (base) => {
    const res = await fetch(`${base}/v1/stations`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ok');
    assert.deepStrictEqual(
      body.stations.map((s) => s.slug).sort(),
      CURATED_SLUGS,
      'el maestro debe servir los 3 registros curados del seed, no un array vacío',
    );
  });
  for (const f of ['stations.json', 'snow-reports.json', 'osm-derived.json']) {
    assert.ok(existsSync(join(dir, f)), `el bootstrap debe crear ${f} en el dir de runtime`);
  }
});

test('B2: el detalle de baqueira-beret se sirve y el parte queda en no_data (no se inventan cifras)', async () => {
  const dir = emptyDir();
  await withApp(dir, async (base) => {
    const st = await fetch(`${base}/v1/stations/baqueira-beret`);
    assert.strictEqual(st.status, 200, 'el detalle de una estación del seed no debe dar 404');
    const station = await st.json();
    assert.strictEqual(station.station.slug, 'baqueira-beret');

    const rp = await fetch(`${base}/v1/stations/baqueira-beret/report`);
    assert.strictEqual(rp.status, 200, 'estación existente sin parte => 200, no 404 (contraste C23b)');
    const report = await rp.json();
    assert.strictEqual(report.status, 'no_data', 'pretemporada: el parte debe ser no_data');
    assert.ok(report.reason, 'un no_data debe explicar el motivo');
    // Ausencia honesta: ninguna cifra de nieve puede aparecer publicada.
    assert.strictEqual(report.report.snow, null, 'sin parte no hay espesores publicados');
    assert.strictEqual(report.report.operational, null, 'sin parte no hay estado operativo publicado');
    assert.strictEqual(report.sourceUrl, undefined, 'sin parte editorial no debe haber fuente atribuible');
  });
});

test('B3: el bootstrap NO sobrescribe datos de runtime ya existentes', () => {
  const dir = emptyDir();
  writeFileSync(join(dir, 'stations.json'), JSON.stringify({
    schemaVersion: 1,
    updatedAt: FIXED_NOW.toISOString(),
    records: [{ slug: 'editada-a-mano', name: 'Editada', country: 'ES', region: 'X', discipline: 'alpine', lat: 1, lng: 2, altitudeBaseM: 100, altitudeTopM: 200, website: null, seasonOpen: null, seasonClose: null, seasonConfirmed: false }],
  }));

  const result = bootstrapStore(dir);

  assert.deepStrictEqual(result.skipped, ['stations.json'], 'un fichero existente debe respetarse');
  assert.ok(!result.created.includes('stations.json'));
  const raw = JSON.parse(readFileSync(join(dir, 'stations.json'), 'utf8'));
  assert.strictEqual(raw.records[0].slug, 'editada-a-mano', 'el dato de runtime no debe ser pisado por el seed');
});

test('B4: el bootstrap es idempotente — la segunda llamada no reescribe nada', () => {
  const dir = emptyDir();
  const first = bootstrapStore(dir);
  const second = bootstrapStore(dir);

  assert.deepStrictEqual([...first.created].sort(), ['osm-derived.json', 'snow-reports.json', 'stations.json']);
  assert.deepStrictEqual(second.created, [], 'la segunda llamada no debe crear/reescribir ficheros');
  assert.strictEqual(second.skipped.length, 3);
});

test('B5: los valores por defecto embebidos son idénticos a los ficheros de seed/ (no pueden divergir en silencio)', () => {
  // `dist/` no emite `seed/`, así que en producción se usan los valores
  // embebidos. Si alguien edita el seed y no el embebido (o al revés), los datos
  // servidos en dev y en prod divergirían: esto lo convierte en fallo de test.
  const dir = emptyDir();
  bootstrapStore(dir);
  for (const f of ['stations.json', 'snow-reports.json', 'osm-derived.json']) {
    const fromSeed = JSON.parse(readFileSync(join(SEED_DIR, f), 'utf8'));
    const fromDefaults = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    assert.deepStrictEqual(fromDefaults, fromSeed, `${f}: el valor embebido debe ser igual al seed versionado`);
  }
});
