/**
 * C26 — Autenticación de administración, probada ADVERSARIALMENTE.
 *
 * Motivo (hallazgo B2): en el árbol previo, GET/POST /admin/reports no tenían
 * autenticación, de modo que cualquiera podía escribir el parte editorial,
 * que es la única fuente lícita de estado operativo del producto.
 *
 * Regla: B2 NO pasa por que exista un middleware en el código. Se ejerce por
 * HTTP in-process. C26c es el caso decisivo: un 401 que aún así escribe es
 * exactamente el fallo grave. Por eso se comprueba el recuento antes/después.
 *
 * Sin dependencias. Sin hijos (C1c). Reloj fijo (§2bis).
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createSnowRouter } from '../../snow/server/index.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');
const clock = () => FIXED_NOW;

/** Semilla mínima: una estación real para que las rutas tengan contenido. */
function seedDir() {
  const dir = mkdtempSync(join(tmpdir(), 'snow-c26-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'stations.json'),
    JSON.stringify({
      schemaVersion: 1,
      updatedAt: FIXED_NOW.toISOString(),
      records: [
        { slug: 'baqueira-beret', name: 'Baqueira Beret', country: 'ES', region: 'Valle de Arán', lat: 42.7, lng: 0.93, altitudeBaseM: 1500, altitudeTopM: 2510, website: null },
        { slug: 'formigal-panticosa', name: 'Formigal-Panticosa', country: 'ES', region: 'Aragón', lat: 42.77, lng: -0.37, altitudeBaseM: 1500, altitudeTopM: 2250, website: null },
      ],
    }),
  );
  writeFileSync(join(dir, 'snow-reports.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  writeFileSync(join(dir, 'osm-derived.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  return dir;
}

async function listen(router) {
  // C27b: montaje DE TEST. createSnowRouter devuelve un Router; se monta en una
  // app Express efímera. Prueba el módulo, no el cableado enviado (C27a).
  const app = express();
  app.use('/api/snow', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}/api/snow` };
}

function validPayload() {
  return {
    stationSlug: 'baqueira-beret',
    observedAt: FIXED_NOW.toISOString(),
    sourceUrl: 'https://www.baqueira.es/parte-de-nieve',
    author: 'operador-1',
    confidence: 0.9,
    operational: { liftsOpen: 12, liftsTotal: 21, pistesOpen: 40, pistesTotal: 118, kmOpen: 40, kmTotal: 161, isOpen: true, byLevel: null },
    snow: { baseCm: 40, midCm: 80, topCm: 110, newSnow24hCm: 5, quality: 'powder' },
  };
}

/** Recuento de partes persistidos, leído del fichero: prueba que NO se escribió. */
function reportCount(dir) {
  const p = join(dir, 'snow-reports.json');
  if (!existsSync(p)) return 0;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  return Array.isArray(j) ? j.length : (j.records ?? []).length;
}

const TOKEN = 'token-de-prueba-c26';

async function withApp(fn, { token } = {}) {
  const dir = seedDir();
  const prev = process.env['SNOW_ADMIN_TOKEN'];
  if (token === undefined) delete process.env['SNOW_ADMIN_TOKEN'];
  else process.env['SNOW_ADMIN_TOKEN'] = token;
  const { server, base } = await listen(createSnowRouter(dir, clock));
  try {
    await fn({ base, dir });
  } finally {
    server.close();
    if (prev === undefined) delete process.env['SNOW_ADMIN_TOKEN'];
    else process.env['SNOW_ADMIN_TOKEN'] = prev;
    rmSync(dir, { recursive: true, force: true });
  }
}

test('C26a: GET admin sin cabecera => 401', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(`${base}/v1/admin/reports`);
    assert.strictEqual(res.status, 401, 'sin cabecera debe rechazar');
  }, { token: TOKEN });
});

test('C26b: token incorrecto => 401', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(`${base}/v1/admin/reports`, {
      headers: { authorization: 'Bearer token-incorrecto' },
    });
    assert.strictEqual(res.status, 401, 'un token erróneo debe rechazar');
  }, { token: TOKEN });
});

test('C26c: POST anónimo => 401 Y el recuento de partes NO cambia', async () => {
  await withApp(async ({ base, dir }) => {
    const before = reportCount(dir);
    const res = await fetch(`${base}/v1/admin/reports`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validPayload()),
    });
    assert.strictEqual(res.status, 401, 'POST anónimo debe rechazar');
    const after = reportCount(dir);
    assert.strictEqual(after, before, `un POST anónimo NO debe persistir nada (antes=${before}, después=${after})`);
  }, { token: TOKEN });
});

test('C26d: token correcto => 201 en POST y 200 en GET', async () => {
  await withApp(async ({ base }) => {
    const post = await fetch(`${base}/v1/admin/reports`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(validPayload()),
    });
    assert.strictEqual(post.status, 201, 'el camino legítimo debe funcionar');
    const get = await fetch(`${base}/v1/admin/reports`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.strictEqual(get.status, 200);
  }, { token: TOKEN });
});

test('C26e: SNOW_ADMIN_TOKEN sin definir => admin DESHABILITADO (401), nunca abierto', async () => {
  await withApp(async ({ base, dir }) => {
    const before = reportCount(dir);
    const get = await fetch(`${base}/v1/admin/reports`, {
      headers: { authorization: 'Bearer cualquier-cosa' },
    });
    assert.strictEqual(get.status, 401, 'sin token configurado el admin debe fallar cerrado');

    const post = await fetch(`${base}/v1/admin/reports`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer cualquier-cosa' },
      body: JSON.stringify(validPayload()),
    });
    assert.strictEqual(post.status, 401, 'sin token configurado no debe poder escribirse');
    assert.strictEqual(reportCount(dir), before, 'sin token no debe persistirse nada');
  });
});

test('C26f: cabecera authorization vacía => 401', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(`${base}/v1/admin/reports`, { headers: { authorization: '' } });
    assert.strictEqual(res.status, 401, 'authorization vacío debe rechazar');
  }, { token: TOKEN });
});

test('C26g: token solo whitespace => 401 y NO persiste', async () => {
  await withApp(async ({ base, dir }) => {
    const before = reportCount(dir);
    const get = await fetch(`${base}/v1/admin/reports`, { headers: { authorization: '   ' } });
    assert.strictEqual(get.status, 401, 'authorization solo whitespace debe rechazar');
    const post = await fetch(`${base}/v1/admin/reports`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: ' \t ' },
      body: JSON.stringify(validPayload()),
    });
    assert.strictEqual(post.status, 401, 'un token solo whitespace no debe escribir');
    assert.strictEqual(reportCount(dir), before, 'un rechazo no debe persistir nada');
  }, { token: TOKEN });
});

test('C26h: formato erróneo (sin esquema Bearer / Bearer sin valor / separador no espacio) => 401', async () => {
  await withApp(async ({ base }) => {
    const malformed = [TOKEN, `Token ${TOKEN}`, 'Bearer', 'Bearer ', `Bearer  ${TOKEN}`, `Bearer\t${TOKEN}`];
    for (const h of malformed) {
      const res = await fetch(`${base}/v1/admin/reports`, { headers: { authorization: h } });
      assert.strictEqual(res.status, 401, `formato '${JSON.stringify(h)}' debe rechazar`);
    }
  }, { token: TOKEN });
});

test('C26i: esquema bearer en minúsculas => 401 (comparación case-sensitive)', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(`${base}/v1/admin/reports`, { headers: { authorization: `bearer ${TOKEN}` } });
    assert.strictEqual(res.status, 401, 'bearer minúsculas no es el esquema admitido');
  }, { token: TOKEN });
});

test('C26j: Basic auth => 401', async () => {
  await withApp(async ({ base }) => {
    const res = await fetch(`${base}/v1/admin/reports`, {
      headers: { authorization: `Basic ${Buffer.from(TOKEN).toString('base64')}` },
    });
    assert.strictEqual(res.status, 401, 'Basic no es el esquema admitido');
  }, { token: TOKEN });
});
