/**
 * C24 — El camino editorial NO es un stub.
 *
 * C24a CREA un parte (POST con token) y lo LEE de vuelta. No se limita a comprobar
 * que el fichero existe: con `snow-reports.json` vacío, "existe" pasaría sin
 * probar nada (§7.3, PASS-and-VACUOUS).
 * C24b–e: un rechazo 400 por cada campo obligatorio de 05b §7.3
 * (sourceUrl, capturedAt/observedAt, author, confidence), de modo que la
 * validación no pueda pasar por estar ausente.
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createSnowRouter } from '../../snow/server/index.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');
const clock = () => FIXED_NOW;
const TOKEN = 'token-c24';

function seedDir() {
  const dir = mkdtempSync(join(tmpdir(), 'snow-c24-'));
  writeFileSync(join(dir, 'stations.json'), JSON.stringify({
    schemaVersion: 1, updatedAt: FIXED_NOW.toISOString(),
    records: [
      { slug: 'formigal-panticosa', name: 'Formigal-Panticosa', country: 'ES', region: 'Aragón', lat: 42.77, lng: -0.37, altitudeBaseM: 1500, altitudeTopM: 2250, website: null },
    ],
  }));
  // VACÍO a propósito: el test debe crear el dato, no encontrarlo.
  writeFileSync(join(dir, 'snow-reports.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  writeFileSync(join(dir, 'osm-derived.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  return dir;
}

function validPayload() {
  return {
    stationSlug: 'formigal-panticosa',
    observedAt: FIXED_NOW.toISOString(),
    sourceUrl: 'https://www.aramon.com/formigal-panticosa/partes/parteNieve',
    author: 'operador-1',
    confidence: 0.9,
    operational: { liftsOpen: 12, liftsTotal: 21, pistesOpen: 40, pistesTotal: 118, kmOpen: 40, kmTotal: 161, isOpen: true, byLevel: null },
    snow: { baseCm: 40, midCm: 80, topCm: 110, newSnow24hCm: 5, quality: 'powder' },
  };
}

let server, base, dir;

/**
 * OJO (C25 real): con `--test-isolation=none` los hooks `before` de TODOS los
 * ficheros se ejecutan antes de los cuerpos de test, así que fijar el token en
 * un `before` compartido es frágil — otro fichero cuyo `before` lo borre deja
 * esta suite sin token (medido: 401 inesperado). Por eso el token se fija POR
 * TEST, y se restaura siempre.
 */
async function withAdminApp(fn) {
  const prev = process.env['SNOW_ADMIN_TOKEN'];
  process.env['SNOW_ADMIN_TOKEN'] = TOKEN;
  const app = express();
  app.use('/api/snow', createSnowRouter(dir, clock));
  const srv = app.listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  const localBase = `http://127.0.0.1:${srv.address().port}/api/snow`;
  try {
    await fn(localBase);
  } finally {
    srv.close();
    if (prev === undefined) delete process.env['SNOW_ADMIN_TOKEN'];
    else process.env['SNOW_ADMIN_TOKEN'] = prev;
  }
}

test.before(async () => {
  dir = seedDir();
});

test.after(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  delete process.env['SNOW_ADMIN_TOKEN'];
});

const auth = () => ({ 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` });

test('C24a: round-trip editorial — CREA y LEE de vuelta con atribución', async () => {
  await withAdminApp(async (base) => {
    const before = JSON.parse(readFileSync(join(dir, 'snow-reports.json'), 'utf8'));
    assert.strictEqual((before.records ?? []).length, 0, 'precondición: la semilla debe estar vacía (si no, el test sería vacuo)');

    const post = await fetch(`${base}/v1/admin/reports`, {
      method: 'POST', headers: auth(), body: JSON.stringify(validPayload()),
    });
    assert.strictEqual(post.status, 201, `el POST editorial debía dar 201, dio ${post.status}`);

    // Se LEE de vuelta (no se asume).
    const get = await fetch(`${base}/v1/admin/reports`, { headers: { authorization: `Bearer ${TOKEN}` } });
    assert.strictEqual(get.status, 200);
    const listed = await get.json();
    const reports = listed.reports ?? listed;
    assert.strictEqual(reports.length, 1, 'el parte creado debe aparecer al leer');
    const r = reports[0];
    assert.strictEqual(r.stationSlug, 'formigal-panticosa');
    assert.strictEqual(r.sourceUrl, 'https://www.aramon.com/formigal-panticosa/partes/parteNieve');
    assert.strictEqual(r.author, 'operador-1');
    assert.strictEqual(r.confidence, 0.9);
    assert.strictEqual(r.operational.liftsOpen, 12, 'el dato numérico debe persistir, no perderse');

    // Y en disco: persistencia real, no sólo eco en memoria.
    const onDisk = JSON.parse(readFileSync(join(dir, 'snow-reports.json'), 'utf8'));
    assert.strictEqual((onDisk.records ?? []).length, 1, 'el parte debe estar persistido en el almacén');
  });
});

test('C24a2: el parte leído por la ruta pública viene de la fuente editorial', async () => {
  await withAdminApp(async (base) => {
    const res = await fetch(`${base}/v1/stations/formigal-panticosa/report`);
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.ok(body.provenance, 'procedencia presente');
    assert.strictEqual(body.provenance.source, 'editorial-report', 'la fuente debe ser el parte editorial');
    assert.strictEqual(body.provenance.licenseStatus, 'allowed', 'el dato editorial es propio (licencia editorial)');

    // Invariante C9 (forma correcta): la atribución es OBLIGATORIA sólo cuando la
    // licencia lo exige. `editorial-own` es nuestra, así que attributionRequired=false
    // y attribution=null es CONFORME al contrato — no un defecto.
    const a = body.provenance.authorization;
    if (body.provenance.licenseStatus === 'allowed-with-attribution' || a?.attributionRequired) {
      assert.ok(body.provenance.attribution, 'si la licencia exige atribución, no puede faltar');
    } else {
      assert.strictEqual(a?.attributionRequired, false,
        'una licencia propia no debe declarar attributionRequired=true');
    }

    // Requisito de PRODUCTO (05b §7.3) — HALLAZGO F1, se deja EN ROJO:
    // la UI debe mostrar "Parte de estación (fuente: operador)" y enlazar sourceUrl,
    // pero ReportPayload sólo expone {operational, snow, noDataFields}: los campos
    // nunca salen del servidor, así que el frontend no puede cumplirlo.
    assert.ok(body.data?.sourceUrl || body.sourceUrl || body.data?.author || body.author,
      'F1: la respuesta pública debe exponer sourceUrl/autor para que la UI pueda etiquetar la fuente');
  });
});

test('C24b: falta sourceUrl => 400 nombrando el campo', async () => {
  await withAdminApp(async (base) => {
    const bad = validPayload();
    delete bad.sourceUrl;
    const res = await fetch(`${base}/v1/admin/reports`, { method: 'POST', headers: auth(), body: JSON.stringify(bad) });
    assert.strictEqual(res.status, 400, 'sin sourceUrl debe rechazar');
    const body = await res.json();
    assert.ok(JSON.stringify(body).toLowerCase().includes('sourceurl'), 'el error debe nombrar sourceUrl');
  });
});

test('C24c: confidence fuera de [0,1] => 400', async () => {
  await withAdminApp(async (base) => {
    const bad = { ...validPayload(), confidence: 1.5 };
    const res = await fetch(`${base}/v1/admin/reports`, { method: 'POST', headers: auth(), body: JSON.stringify(bad) });
    assert.strictEqual(res.status, 400, 'confidence 1.5 debe rechazar');
  });
});

test('C24d: author vacío => 400', async () => {
  await withAdminApp(async (base) => {
    const bad = { ...validPayload(), author: '' };
    const res = await fetch(`${base}/v1/admin/reports`, { method: 'POST', headers: auth(), body: JSON.stringify(bad) });
    assert.strictEqual(res.status, 400, 'author vacío debe rechazar');
  });
});

test('C24e: observedAt no ISO => 400', async () => {
  await withAdminApp(async (base) => {
    const bad = { ...validPayload(), observedAt: 'ayer por la tarde' };
    const res = await fetch(`${base}/v1/admin/reports`, { method: 'POST', headers: auth(), body: JSON.stringify(bad) });
    assert.strictEqual(res.status, 400, 'observedAt no ISO debe rechazar');
  });
});

test('C24f: los rechazos NO persistieron nada', () => {
  const onDisk = JSON.parse(readFileSync(join(dir, 'snow-reports.json'), 'utf8'));
  assert.strictEqual((onDisk.records ?? []).length, 1,
    'sólo el parte válido de C24a debe existir; los inválidos no deben escribirse');
});
