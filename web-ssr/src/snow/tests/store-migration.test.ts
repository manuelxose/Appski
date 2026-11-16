/**
 * SNOW-02 — Migración v1 → v2 del almacén JSON (persistencia durable).
 *
 * Reglas que estos tests fijan (§3.3 del contrato de arquitectura):
 * - una migración NO pierde registros y NO inventa ninguno;
 * - `null` sigue siendo `null` (nunca 0) después de migrar;
 * - ids internos estables + clave legible (slug);
 * - un fichero v1 antiguo (con o sin campos opcionales) migra y queda legible;
 * - una lectura de runtime NO reescribe el fichero v1 (nada de "migrar por sorpresa");
 * - un fichero corrupto lanza en vez de degradar a "sin datos".
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JsonStationRepository } from '../store/json-store/json-station-repository.ts';
import { JsonSnowReportRepository } from '../store/json-store/json-report-repository.ts';
import { JsonForecastCacheRepository } from '../store/json-store/json-forecast-repository.ts';
import { migrateStoreDir, collectionSpec, COLLECTIONS } from '../store/json-store/file-io.ts';
import { convertV1ToV2 } from '../store/json-store/convert.ts';

/** Prefijo con el que `leak-guard.test.ts` reconoce los temporales de ESTE runner. */
const dirs = [];

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'snow-store-v2-'));
  dirs.push(dir);
  return dir;
}

test.after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const SEED = join(import.meta.dirname, '..', 'store', 'json-store', 'seed');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

// --------------------------------------------------------------- conversión pura

test('V2a: convertV1ToV2 conserva el número de registros y NO inventa (3 → 3)', () => {
  const v1 = readJson(join(SEED, 'stations.json'));
  const v2 = convertV1ToV2(v1, 'stations');
  assert.strictEqual(v2.schemaVersion, 2);
  assert.strictEqual(v2.records.length, v1.records.length, 'la migración no puede inventar ni perder registros');
  assert.deepStrictEqual(
    v2.records.map((r) => r.record),
    v1.records,
    'cada entidad debe viajar íntegra: mismas claves y valores',
  );
  assert.deepStrictEqual(v2.records.map((r) => r.id), ['1', '2', '3'], 'ids internos 1..n asignados en orden');
  assert.strictEqual(v2.seq, 3, 'seq = último id entregado');
});

test('V2b: convertV1ToV2 preserva null (NO convierte a 0) y conserva ids existentes (UUID)', () => {
  const v1 = {
    schemaVersion: 1,
    updatedAt: '',
    records: [
      { id: '8f14e45f-ceea-467a-9d0e-1c2a3b4c5d6e', stationSlug: 'x', snow: { baseCm: null, topCm: 120 }, avalancheLevel: null },
      { stationSlug: 'y', snow: null },
    ],
  };
  const v2 = convertV1ToV2(v1, 'snow-reports');
  assert.strictEqual(v2.records.length, 2);
  assert.strictEqual(v2.records[0].id, '8f14e45f-ceea-467a-9d0e-1c2a3b4c5d6e', 'un id heredado se conserva');
  const snow = v2.records[0].record.snow;
  assert.strictEqual(snow.baseCm, null, 'null debe seguir siendo null (regla null ≠ 0)');
  assert.strictEqual(snow.topCm, 120);
  assert.strictEqual(v2.records[0].record.avalancheLevel, null);
  assert.strictEqual(v2.records[1].record.snow, null, 'un bloque ausente no se materializa como ceros');
});

test('V2c: un v1 corrupto (records no array) LANZA en vez de servir un almacén vacío', () => {
  assert.throws(() => convertV1ToV2({ schemaVersion: 1, records: 'nope' }, 'stations'), /corrupto/);
  assert.throws(() => convertV1ToV2({ schemaVersion: 1 }, 'stations'), /corrupto/);
});

// ------------------------------------------------------------------ en disco

test('V2d: migración en disco — escribe stations.v2.json, conserva el v1 y no reescribe si ya es v2', () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'stations.json'), readFileSync(join(SEED, 'stations.json')));
  const before = readFileSync(join(dir, 'stations.json'), 'utf8');

  const out = migrateStoreDir(dir, [COLLECTIONS.stations]);
  const stations = out.find((o) => o.collection === 'stations');
  assert.ok(stations, 'debe reportar la colección');
  assert.strictEqual(stations.migrated, true);
  assert.strictEqual(stations.recordsIn, 3);
  assert.strictEqual(stations.recordsOut, 3, 'sin pérdida');

  const v2Path = join(dir, 'stations.v2.json');
  assert.ok(existsSync(v2Path), 'la migración escribe el destino v2');
  const v2 = readJson(v2Path);
  assert.strictEqual(v2.schemaVersion, 2);
  assert.strictEqual(v2.records.length, 3);
  assert.strictEqual(readFileSync(join(dir, 'stations.json'), 'utf8'), before, 'el v1 no se toca (backup)');

  const again = migrateStoreDir(dir, [COLLECTIONS.stations]);
  assert.strictEqual(again.find((o) => o.collection === 'stations').migrated, false, 'idempotente: ya es v2');
  assert.deepStrictEqual(readJson(v2Path), v2, 'la segunda pasada no reescribe');
});

test('V2e: colección inexistente ⇒ no se inventa ningún fichero', () => {
  const dir = tempDir();
  const out = migrateStoreDir(dir, [COLLECTIONS.alerts]);
  assert.strictEqual(out[0].migrated, false);
  assert.strictEqual(out[0].recordsIn, 0);
  assert.deepStrictEqual(readdirSync(dir), [], 'no debe aparecer alerts.json vacío por crear');
});

test('V2f: la lectura de un fichero v1 NO lo reescribe en disco (migración explícita)', async () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'stations.json'), readFileSync(join(SEED, 'stations.json')));
  const before = readFileSync(join(dir, 'stations.json'), 'utf8');

  const list = await new JsonStationRepository(dir).list();
  assert.strictEqual(list.length, 3);
  assert.strictEqual(readFileSync(join(dir, 'stations.json'), 'utf8'), before, 'leer no migra ni reescribe');
  assert.ok(!existsSync(join(dir, 'stations.v2.json')), 'leer no crea el destino v2');
});

test('V2g: un stations.json v1 CON campos opcionales ausentes migra y queda legible (no lanza)', async () => {
  const dir = tempDir();
  const slim = {
    schemaVersion: 1,
    updatedAt: '',
    records: [
      { slug: 'minima', name: 'Mínima', country: 'ES', region: 'Pirineo', lat: 42.5, lng: 0.5 },
      { slug: 'con-altitud', name: 'Con altitud', country: 'AD', region: 'Andorra', lat: 42.6, lng: 1.5, altitudeBaseM: 1500, altitudeTopM: 2000, website: null, seasonOpen: null, seasonClose: null, seasonConfirmed: false, discipline: 'nordic' },
    ],
  };
  writeFileSync(join(dir, 'stations.json'), JSON.stringify(slim));

  const list = await new JsonStationRepository(dir).list();
  assert.strictEqual(list.length, 2, 'un v1 antiguo debe servir sus registros');
  const minima = list.find((s) => s.slug === 'minima');
  assert.strictEqual(minima.altitudeBaseM, null, 'ausencia ⇒ null, nunca 0');
  assert.strictEqual(minima.altitudeTopM, null);
  assert.strictEqual(minima.website, null);
  assert.strictEqual(minima.seasonOpen, null);
  assert.strictEqual(minima.discipline, 'alpine', 'disc. ausente ⇒ valor por defecto del contrato');
  assert.strictEqual(list.find((s) => s.slug === 'con-altitud').discipline, 'nordic', 'el valor presente se respeta');
});

test('V2h: campo OBLIGATORIO ausente SI lanza (fichero corrupto, no se "repara" inventando)', async () => {
  const dir = tempDir();
  writeFileSync(
    join(dir, 'stations.json'),
    JSON.stringify({ schemaVersion: 1, records: [{ slug: 'rota', name: 'Rota', country: 'ES', region: 'R' }] }),
  );
  await assert.rejects(() => new JsonStationRepository(dir).list(), /campo 'lat' debe ser número/);
});

// ------------------------------------------------------- repositorios con ids

test('V2i: ids internos estables + slug legible; upsert admin conserva el id y añade los slugs nuevos', async () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'stations.json'), readFileSync(join(SEED, 'stations.json')));
  const repo = new JsonStationRepository(dir);

  const idBaqueira = await repo.findIdBySlug('baqueira-beret');
  assert.strictEqual(idBaqueira, '1', 'el id interno se asigna en la migración y es estable');

  await repo.upsert({
    slug: 'baqueira-beret',
    name: 'Baqueira Beret (editada)',
    country: 'ES',
    region: 'Pirineo Catalán',
    discipline: 'alpine',
    lat: 42.6999,
    lng: 0.9367,
    altitudeBaseM: 1500,
    altitudeTopM: 2610,
    website: 'https://www.baqueira.es/',
    seasonOpen: '12-01',
    seasonClose: '04-15',
    seasonConfirmed: true,
  });
  assert.strictEqual(await repo.findIdBySlug('baqueira-beret'), idBaqueira, 'upsert NO renumera el id');

  await repo.upsert({
    slug: 'nueva-estacion',
    name: 'Nueva',
    country: 'FR',
    region: 'Pyrénées',
    discipline: 'nordic',
    lat: 43,
    lng: 1,
    altitudeBaseM: null,
    altitudeTopM: null,
    website: null,
    seasonOpen: null,
    seasonClose: null,
    seasonConfirmed: false,
  });
  assert.strictEqual(await repo.findIdBySlug('nueva-estacion'), '4', 'el siguiente id continúa la secuencia');

  const persisted = readJson(join(dir, 'stations.json'));
  // El v1 sigue siendo el destino (compatibilidad con los consumidores v1); el
  // documento se normaliza a v2 EN disco y conserva las entidades existentes.
  assert.strictEqual(persisted.schemaVersion, 2, 'la escritura persiste el documento normalizado v2');
  assert.strictEqual(persisted.records.length, 4, 'los 3 del seed siguen ahí + 1 nuevo (sin pérdida)');
  assert.deepStrictEqual(
    persisted.records.map((r) => r.record.slug),
    ['baqueira-beret', 'formigal-panticosa', 'grandvalira', 'nueva-estacion'],
    'los registros existentes no se reordenan ni se pierden',
  );
  const nueva = persisted.records.find((r) => r.record.slug === 'nueva-estacion');
  assert.strictEqual(nueva.record.altitudeBaseM, null, 'null persistido tal cual, no 0');
});

test('V2j: partes — el id del dominio (UUID) se conserva y findById acepta id interno o UUID', async () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'snow-reports.json'), JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }));
  const repo = new JsonSnowReportRepository(dir);
  const report = {
    id: '11111111-2222-3333-4444-555555555555',
    stationSlug: 'baqueira-beret',
    observedAt: '2026-11-16T08:00:00.000Z',
    capturedAt: '2026-11-16T09:00:00.000Z',
    sourceUrl: 'https://www.baqueira.es/parte',
    author: 'operador',
    confidence: 0.8,
    operational: { liftsOpen: 10, liftsTotal: 20, pistesOpen: null, pistesTotal: null, kmOpen: null, kmTotal: null, isOpen: null, byLevel: null },
    snow: null,
    avalancheLevel: null,
    mood: 'published',
  };
  await repo.insert(report);

  assert.deepStrictEqual(await repo.findById(report.id), report, 'buscable por el UUID del dominio');
  assert.deepStrictEqual(await repo.findById('1'), report, 'buscable por el id interno del almacén');
  const latest = await repo.latestPublishedForStation('baqueira-beret', new Date('2026-11-16T12:00:00.000Z'));
  assert.strictEqual(latest.snow, null, 'sin parte de nieve ⇒ null, no ceros');
  assert.strictEqual(latest.operational.pistesOpen, null, 'ausencia preservada (null ≠ 0)');
});

test('V2k: caché de pronóstico — clave (estación, fuente), upsert conserva id y la caducidad se respeta', async () => {
  const dir = tempDir();
  const repo = new JsonForecastCacheRepository(dir);
  const entry = {
    stationSlug: 'grandvalira',
    source: 'aemet',
    observedAt: '2026-11-16T06:00:00.000Z',
    updatedAt: '2026-11-16T06:05:00.000Z',
    expiresAt: '2026-11-16T12:00:00.000Z',
    payloadJson: '{"points":[]}',
  };
  await repo.put(entry);
  // Colección nueva ⇒ se persiste directo en v2 (no se fabrica un v1).
  const first = readJson(join(dir, 'forecast-cache.v2.json'));
  assert.strictEqual(first.records.length, 1, 'una fuente ⇒ una entrada');
  assert.strictEqual(first.records[0].id, '1');

  await repo.put({ ...entry, payloadJson: '{"points":[1]}' });
  const second = readJson(join(dir, 'forecast-cache.v2.json'));
  assert.strictEqual(second.records.length, 1, 'misma tupla ⇒ actualiza, no duplica');
  assert.strictEqual(second.records[0].id, '1', 'el id interno se conserva entre actualizaciones');
  assert.strictEqual((await repo.get('grandvalira', 'aemet')).payloadJson, '{"points":[1]}', 'lectura = último valor');

  const beforeExpiry = new Date('2026-11-16T11:00:00.000Z');
  const afterExpiry = new Date('2026-11-16T12:30:00.000Z');
  assert.strictEqual(repo.isFresh(entry, beforeExpiry), true);
  assert.strictEqual(repo.isFresh(entry, afterExpiry), false, 'caducada ⇒ NO es fresca (no se sirve como live)');
  assert.strictEqual((await repo.listFresh('grandvalira', afterExpiry)).length, 0);
});

test('V2l: la lectura tolera el destino v1 y el v2 indistintamente (misma interfaz)', async () => {
  const dirV1 = tempDir();
  const dirMigrated = tempDir();
  writeFileSync(join(dirV1, 'stations.json'), readFileSync(join(SEED, 'stations.json')));
  writeFileSync(join(dirMigrated, 'stations.json'), readFileSync(join(SEED, 'stations.json')));
  migrateStoreDir(dirMigrated, [COLLECTIONS.stations]);

  const a = await new JsonStationRepository(dirV1).list();
  const b = await new JsonStationRepository(dirMigrated).list();
  assert.deepStrictEqual(b, a, 'el repositorio devuelve lo mismo antes y después de migrar');
});

test('V2m: collectionSpec documenta el contrato de ficheros (v2 se lee primero; v1 es el destino de runtime)', () => {
  const spec = collectionSpec('alerts', ['stationSlug', 'source']);
  assert.deepStrictEqual(spec.files, ['alerts.v2.json', 'alerts.json'], 'tras migrar se lee el v2, no el backup v1');
  assert.strictEqual(spec.target, 'alerts.json');
  assert.deepStrictEqual(spec.keyFields, ['stationSlug', 'source']);
});

test('V2n: tras migrar, las escrituras van al v2 y el v1 queda como backup congelado', async () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'stations.json'), readFileSync(join(SEED, 'stations.json')));
  const backup = readFileSync(join(dir, 'stations.json'), 'utf8');
  migrateStoreDir(dir, [COLLECTIONS.stations]);

  const repo = new JsonStationRepository(dir);
  const original = await repo.findBySlug('grandvalira');
  await repo.upsert({ ...original, name: 'Grandvalira (editada)' });

  assert.strictEqual(readFileSync(join(dir, 'stations.json'), 'utf8'), backup, 'el backup v1 no se reescribe');
  const v2 = readJson(join(dir, 'stations.v2.json'));
  assert.strictEqual(v2.records.find((r) => r.record.slug === 'grandvalira').record.name, 'Grandvalira (editada)');
  assert.strictEqual((await repo.findBySlug('grandvalira')).name, 'Grandvalira (editada)', 'la lectura ve la escritura');
});

test('V2o: una colección NUEVA se persiste directo en v2 (no se crea un v1 para datos nuevos)', async () => {
  const { JsonAlertRepository } = await import('../store/json-store/json-alert-repository.ts');
  const dir = tempDir();
  const repo = new JsonAlertRepository(dir);
  await repo.upsert({
    id: 'aemet-1',
    stationSlug: 'baqueira-beret',
    source: 'aemet',
    level: 'yellow',
    phenomenon: 'viento',
    validFrom: '2026-11-16T00:00:00.000Z',
    validUntil: '2026-11-17T00:00:00.000Z',
    area: 'Val d’Aran',
    observedAt: '2026-11-16T06:00:00.000Z',
    updatedAt: '2026-11-16T06:00:00.000Z',
    expiresAt: null,
    licenseStatus: 'allowed-with-attribution',
    attribution: 'Datos: AEMET',
  });
  assert.ok(existsSync(join(dir, 'alerts.v2.json')), 'colección nueva ⇒ v2');
  assert.ok(!existsSync(join(dir, 'alerts.json')), 'no se fabrica un fichero v1 para datos nuevos');
  assert.deepStrictEqual(readdirSync(dir), ['alerts.v2.json']);
});
