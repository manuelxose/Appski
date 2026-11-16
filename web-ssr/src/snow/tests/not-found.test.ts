/**
 * C23/C23b — Not-found con cuerpo en forma de procedencia.
 *
 * C23:  slug desconocido  => 404 JSON con provenance y status 'not_found'
 *                           (nunca 200 con array vacío, nunca 500).
 * C23b: slug válido sin parte => 200 con 'no_data' (contraste).
 *
 * La pareja existe para que nadie pueda "arreglar" el 404 devolviendo 200.
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createSnowRouter } from '../../snow/server/index.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');
const clock = () => FIXED_NOW;

function seedDir() {
  const dir = mkdtempSync(join(tmpdir(), 'snow-c23-'));
  writeFileSync(join(dir, 'stations.json'), JSON.stringify({
    schemaVersion: 1, updatedAt: FIXED_NOW.toISOString(),
    records: [
      { slug: 'formigal-panticosa', name: 'Formigal-Panticosa', country: 'ES', region: 'Aragón', lat: 42.77, lng: -0.37, altitudeBaseM: 1500, altitudeTopM: 2250, website: null },
    ],
  }));
  writeFileSync(join(dir, 'snow-reports.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  writeFileSync(join(dir, 'osm-derived.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  return dir;
}

let server, base, dir;

test.before(async () => {
  for (const k of ['AEMET_API_KEY', 'METEOFRANCE_API_KEY', 'PROTOMAPS_BASE_URL', 'SNOW_ADMIN_TOKEN']) delete process.env[k];
  dir = seedDir();
  const app = express();
  app.use('/api/snow', createSnowRouter(dir, clock));
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/snow`;
});

test.after(() => {
  server?.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

test('C23: slug desconocido => 404 con provenance y status not_found', async () => {
  const res = await fetch(`${base}/v1/stations/no-existe-xyz`);
  assert.strictEqual(res.status, 404, 'un slug desconocido debe dar 404, no 200 ni 500');
  assert.match(res.headers.get('content-type') ?? '', /application\/json/, 'el 404 debe ser JSON');

  const body = await res.json();
  assert.ok(body.provenance, 'el 404 debe llevar procedencia (no un sobre de error)');
  assert.strictEqual(body.status, 'not_found', "el cuerpo debe declarar status 'not_found'");
  for (const f of ['source', 'observedAt', 'updatedAt', 'status', 'licenseStatus', 'freshness', 'authorization', 'attribution']) {
    assert.ok(f in body.provenance, `procedencia del 404 sin '${f}'`);
  }
  assert.ok(!Array.isArray(body), 'no debe ser una colección vacía');
});

test('C23: slug desconocido en /report y /forecast también 404 con procedencia', async () => {
  for (const path of ['/v1/stations/no-existe-xyz/report', '/v1/stations/no-existe-xyz/forecast']) {
    const res = await fetch(`${base}${path}`);
    assert.strictEqual(res.status, 404, `${path} debía ser 404, dio ${res.status}`);
    const body = await res.json();
    assert.ok(body.provenance, `${path} sin procedencia`);
    assert.strictEqual(body.status, 'not_found', `${path} sin status 'not_found'`);
  }
});

test('C23b: slug VÁLIDO sin parte => 200 con no_data (contraste)', async () => {
  const res = await fetch(`${base}/v1/stations/formigal-panticosa/report`);
  assert.strictEqual(res.status, 200, 'una estación existente sin parte debe dar 200, no 404');
  const body = await res.json();
  assert.notStrictEqual(body.status, 'not_found', "un slug válido NO debe responder 'not_found'");
  assert.ok(body.provenance, 'debe llevar procedencia');
});
