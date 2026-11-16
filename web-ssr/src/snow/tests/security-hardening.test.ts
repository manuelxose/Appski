/**
 * C29 — Endurecimiento de seguridad administrativa (B2 ampliado + antiabuso).
 *
 * Ejerce el borde por HTTP in-process con canarios de prueba (nunca un secreto
 * real) y demuestra:
 *
 *  C29a  /config NO filtra nombres de variables de entorno, token ni stack;
 *  C29b  límite de tasa sobre escritura admin (429 con Retry-After);
 *  C29c  límite de tasa sobre lectura costosa (search/rankings);
 *  C29d  cuerpo >64kb ⇒ 413 tipado, sin stack y sin escribir;
 *  C29e  JSON malformado ⇒ 400 tipado, sin stack;
 *  C29f  un rechazo 400 deja el almacén byte-idéntico.
 *
 * Límite declarado: el límite de tasa es EN MEMORIA y por proceso; cada
 * `createSnowRouter` recibe una instancia nueva (aislamiento en tests).
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createSnowRouter } from '../../snow/server/index.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');
const clock = () => FIXED_NOW;
const TOKEN = 'token-c29-canary';

/** Nunca deben aparecer NOMBRES de variables de entorno ni credenciales. */
const SECRET_PATTERNS = ['_API_KEY', '_TOKEN', 'BASE_URL', 'SNOW_ADMIN_TOKEN'];

function station() {
  return {
    slug: 'baqueira-beret', name: 'Baqueira Beret', country: 'ES', region: 'Valle de Arán',
    discipline: 'alpine', lat: 42.7, lng: 0.93, altitudeBaseM: 1500, altitudeTopM: 2510,
    website: null, seasonOpen: null, seasonClose: null, seasonConfirmed: false,
  };
}

function seedDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'snow-c29-'));
  dirs.push(dir);
  writeFileSync(join(dir, 'stations.json'), JSON.stringify({ schemaVersion: 1, updatedAt: FIXED_NOW.toISOString(), records: [station()] }));
  writeFileSync(join(dir, 'snow-reports.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  writeFileSync(join(dir, 'osm-derived.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  return dir;
}

const dirs: string[] = [];
const servers: Array<ReturnType<express.Express['listen']>> = [];

async function boot(token: string, dir: string): Promise<string> {
  process.env['SNOW_ADMIN_TOKEN'] = token;
  const app = express();
  app.use('/api/snow', createSnowRouter(dir, clock));
  const srv = app.listen(0, '127.0.0.1');
  servers.push(srv);
  await new Promise((r) => srv.once('listening', r));
  const addr = srv.address();
  const port = typeof addr === 'object' && addr !== null ? addr.port : 0;
  return `http://127.0.0.1:${port}/api/snow`;
}

async function closeAll(): Promise<void> {
  for (const s of servers.splice(0)) {
    await new Promise<void>((r) => s.close(() => r()));
  }
  delete process.env['SNOW_ADMIN_TOKEN'];
}

test.after(async () => {
  await closeAll();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  for (const k of ['AEMET_API_KEY', 'METEOFRANCE_API_KEY', 'C3S_API_KEY', 'CLMS_API_KEY', 'PROTOMAPS_BASE_URL', 'SNOW_ADMIN_TOKEN']) {
    delete process.env[k];
  }
});

function validReport() {
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

function validStation() {
  return station();
}

function reportCount(dir: string): number {
  const j = JSON.parse(readFileSync(join(dir, 'snow-reports.json'), 'utf8'));
  return (j.records ?? []).length;
}

/** Un cuerpo de error válido es JSON puro, sin secretos, sin stack, sin `stack`. */
function assertNoLeak(text: string, label: string): void {
  for (const p of SECRET_PATTERNS) assert.ok(!text.includes(p), `${label} filtra '${p}'`);
  assert.ok(!text.includes(TOKEN), `${label} filtra el token de prueba`);
  assert.ok(!text.includes('node_modules'), `${label} filtra node_modules`);
  assert.ok(!text.includes('at Object.'), `${label} filtra una traza de pila`);
  const body = JSON.parse(text);
  assert.ok(!('stack' in body), `${label} expone la clave 'stack'`);
}

test('C29a: /config con token NO filtra nombres de variables, token ni stack', async () => {
  const dir = seedDir();
  const base = await boot(TOKEN, dir);
  const res = await fetch(`${base}/v1/config`, { headers: { authorization: `Bearer ${TOKEN}` } });
  assert.strictEqual(res.status, 200);
  const text = await res.text();
  assertNoLeak(text, '/config');
  const body = JSON.parse(text);
  const aemet = body.providers.find((p: { id: string }) => p.id === 'aemet');
  assert.strictEqual(typeof aemet.missingEnv, 'number', 'missingEnv debe ser un recuento, no una lista de nombres');
  await closeAll();
});

test('C29b: límite de tasa en escritura admin (PUT) => 429 tras superar el tope', async () => {
  const dir = seedDir();
  const base = await boot(TOKEN, dir);
  const headers = { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' };
  const body = JSON.stringify(validStation());
  // max=20 por ventana de 60s: las 20 primeras pasan, la 21ª se rechaza.
  for (let i = 1; i <= 20; i += 1) {
    const res = await fetch(`${base}/v1/admin/stations/baqueira-beret`, { method: 'PUT', headers, body });
    assert.strictEqual(res.status, 200, `PUT #${i} debía pasar, dio ${res.status}`);
  }
  const blocked = await fetch(`${base}/v1/admin/stations/baqueira-beret`, { method: 'PUT', headers, body });
  assert.strictEqual(blocked.status, 429, 'la 21ª escritura admin debe ser 429');
  assert.ok(blocked.headers.get('retry-after'), 'el 429 debe llevar Retry-After');
  assertNoLeak(await blocked.text(), '429 de escritura admin');
  await closeAll();
});

test('C29c: límite de tasa en lectura costosa (search) => 429', async () => {
  const dir = seedDir();
  const base = await boot(TOKEN, dir);
  // max=100 por ventana de 60s.
  for (let i = 1; i <= 100; i += 1) {
    const res = await fetch(`${base}/v1/search?q=baqueira`);
    assert.strictEqual(res.status, 200, `search #${i} debía pasar, dio ${res.status}`);
  }
  const blocked = await fetch(`${base}/v1/search?q=baqueira`);
  assert.strictEqual(blocked.status, 429, 'la 101ª lectura costosa debe ser 429');
  assertNoLeak(await blocked.text(), '429 de lectura costosa');
  await closeAll();
});

test('C29d: cuerpo >64kb => 413 tipado, sin stack y sin escribir', async () => {
  const dir = seedDir();
  const base = await boot(TOKEN, dir);
  const before = reportCount(dir);
  const big = { ...validReport(), author: 'x'.repeat(70 * 1024) };
  const res = await fetch(`${base}/v1/admin/reports`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(big),
  });
  assert.strictEqual(res.status, 413, 'cuerpo >64kb debe ser 413');
  assertNoLeak(await res.text(), '413 de tamaño');
  assert.strictEqual(reportCount(dir), before, 'un 413 no debe escribir nada');
  await closeAll();
});

test('C29e: JSON malformado => 400 tipado, sin stack', async () => {
  const dir = seedDir();
  const base = await boot(TOKEN, dir);
  const res = await fetch(`${base}/v1/admin/reports`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: '{"stationSlug":',
  });
  assert.strictEqual(res.status, 400, 'JSON malformado debe ser 400');
  assertNoLeak(await res.text(), '400 de JSON malformado');
  await closeAll();
});

test('C29f: un rechazo 400 deja el almacén byte-idéntico', async () => {
  const dir = seedDir();
  const base = await boot(TOKEN, dir);
  const file = join(dir, 'snow-reports.json');
  const before = readFileSync(file, 'utf8');
  const bad = { ...validReport(), confidence: 7 };
  const res = await fetch(`${base}/v1/admin/reports`, {
    method: 'POST',
    headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(bad),
  });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(readFileSync(file, 'utf8'), before, 'el fichero debe quedar byte-idéntico tras un rechazo');
  await closeAll();
});
