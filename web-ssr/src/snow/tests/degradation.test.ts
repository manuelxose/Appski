/**
 * C22 — Degradación enumerada: con CERO credenciales, TODA ruta /v1/** responde
 * 200 con la tupla de procedencia completa, y NINGUNA responde 500.
 *
 * Enumeración: `SNOW_ROUTES` exportado por el router (B1), no una lista a mano.
 * Una ruta nueva que olvide el contrato hace fallar este test automáticamente.
 *
 * Reloj fijo (§2bis) para que `freshness` sea reproducible.
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createSnowRouter, SNOW_ROUTES } from '../../snow/server/index.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');
const clock = () => FIXED_NOW;

function seedDir() {
  const dir = mkdtempSync(join(tmpdir(), 'snow-c22-'));
  writeFileSync(join(dir, 'stations.json'), JSON.stringify({
    schemaVersion: 1, updatedAt: FIXED_NOW.toISOString(),
    records: [
      { slug: 'baqueira-beret', name: 'Baqueira Beret', country: 'ES', region: 'Valle de Arán', lat: 42.7, lng: 0.93, altitudeBaseM: 1500, altitudeTopM: 2510, website: null },
      { slug: 'formigal-panticosa', name: 'Formigal-Panticosa', country: 'ES', region: 'Aragón', lat: 42.77, lng: -0.37, altitudeBaseM: 1500, altitudeTopM: 2250, website: null },
      { slug: 'grandvalira', name: 'Grandvalira', country: 'AD', region: 'Andorra', lat: 42.57, lng: 1.66, altitudeBaseM: 1710, altitudeTopM: 2640, website: null },
    ],
  }));
  writeFileSync(join(dir, 'snow-reports.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  writeFileSync(join(dir, 'osm-derived.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  return dir;
}

const PROVENANCE_FIELDS = [
  'source', 'observedAt', 'updatedAt', 'status', 'licenseStatus',
  'freshness', 'authorization', 'attribution',
];

let server, base, dir;

test.before(async () => {
  for (const k of ['AEMET_API_KEY', 'METEOFRANCE_API_KEY', 'PROTOMAPS_BASE_URL', 'SNOW_ADMIN_TOKEN']) {
    delete process.env[k];
  }
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

test('C22: se enumeran las rutas de SNOW_ROUTES (no vaciedad)', () => {
  assert.ok(SNOW_ROUTES.length >= 10, `se esperaban >=10 rutas, hay ${SNOW_ROUTES.length}`);
  const paths = SNOW_ROUTES.map((r) => r.path);
  assert.ok(paths.includes('/v1/stations'), 'falta /v1/stations en SNOW_ROUTES');
});

test('C22: matriz por ruta — 200, procedencia completa, sin 500', async (t) => {
  const nonAdmin = SNOW_ROUTES.filter((r) => !r.admin);
  assert.ok(nonAdmin.length > 0, 'no hay rutas no-admin que probar');

  for (const route of nonAdmin) {
    await t.test(`${route.method} ${route.sample}`, async () => {
      const res = await fetch(`${base}${route.sample}`, { method: route.method });
      assert.notStrictEqual(res.status, 500, `${route.sample} devolvió 500`);
      assert.strictEqual(res.status, 200, `${route.sample} debía degradar a 200, dio ${res.status}`);

      const body = await res.json();
      // La tupla de procedencia puede colgar de la raíz o de .provenance
      const prov = body.provenance ?? body;
      assert.ok(prov, `${route.sample} sin procedencia`);

      for (const f of PROVENANCE_FIELDS) {
        assert.ok(f in prov, `${route.sample}: procedencia sin '${f}'`);
      }
      assert.strictEqual(prov.freshness, 0, `${route.sample}: freshness debe ser 0 con reloj fijo y sin datos`);
      assert.ok(
        ['not_configured', 'blocked', 'ok', 'no_data'].includes(body.status ?? 'ok'),
        `${route.sample}: estado inesperado '${body.status}'`,
      );

      // Invariante real (no "todo debe ser not_configured"): si la ruta devuelve
      // `ok`, los datos deben venir de una fuente que NO requiere credencial de
      // proveedor — es decir, de la base editorial propia, nunca de un proveedor
      // externo sin configurar.
      if (body.status === 'ok') {
        assert.ok(
          ['editorial-stations', 'editorial-report'].includes(prov.source),
          `${route.sample}: status 'ok' sin credenciales debe venir de fuente editorial, no de '${prov.source}'`,
        );
        assert.notStrictEqual(prov.licenseStatus, 'blocked',
          `${route.sample}: una fuente editorial no puede estar 'blocked'`);
      }
      // Y si no devuelve `ok`, debe ser una degradación explícita, nunca un dato.
      if (body.status && body.status !== 'ok') {
        assert.ok(
          ['not_configured', 'blocked', 'no_data'].includes(body.status),
          `${route.sample}: degradación inesperada '${body.status}'`,
        );
      }
    });
  }
});

test('C22: las rutas admin con cero credenciales responden 401 (no 500, no 200)', async (t) => {
  for (const route of SNOW_ROUTES.filter((r) => r.admin)) {
    await t.test(`${route.method} ${route.sample}`, async () => {
      const res = await fetch(`${base}${route.sample}`, { method: route.method });
      assert.notStrictEqual(res.status, 500, `${route.sample} devolvió 500`);
      assert.strictEqual(res.status, 401, `${route.sample} debía fallar cerrado (401), dio ${res.status}`);
    });
  }
});
