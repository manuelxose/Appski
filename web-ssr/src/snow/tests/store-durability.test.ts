/**
 * SNOW-02 — Durabilidad real de la persistencia: el dato escrito por UN proceso
 * se recupera desde un proceso node NUEVO (sin memoria compartida, sin caché).
 *
 * Qué se demuestra (no se declara, se ejecuta):
 * - escritura con los repositorios ⇒ lectura desde `node -e` en un proceso hijo;
 * - el id interno y el slug sobreviven al reinicio, y `null` sigue siendo `null`;
 * - ninguna escritura deja `.tmp` huérfano (tmp + fsync + rename es atómico);
 * - si el proceso muere, el fichero previo sigue íntegro y legible.
 *
 * ¿Por qué un proceso hijo y no un `import()`? Un módulo JS comparte el heap del
 * runner: comprobaría la caché, no el disco. El hijo parte de cero.
 */
import test from 'node:test';
import assert from 'node:assert';
import { execFileSync } from 'node:child_process';
import { closeSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JsonStationRepository } from '../store/json-store/json-station-repository.ts';
import { JsonSnowReportRepository } from '../store/json-store/json-report-repository.ts';

const dirs = [];

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'snow-store-v2-'));
  dirs.push(dir);
  return dir;
}

test.after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

// <repo>/web-ssr/src/snow/tests/store-durability.test.ts → <repo>
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const LOADER = join(REPO_ROOT, 'scripts', 'snow', 'ts-loader.mjs');
const STATION_REPO = join(REPO_ROOT, 'web-ssr', 'src', 'snow', 'store', 'json-store', 'json-station-repository.ts');
const REPORT_REPO = join(REPO_ROOT, 'web-ssr', 'src', 'snow', 'store', 'json-store', 'json-report-repository.ts');

/** Specifier ESM válido en Windows (`file:///C:/...`), listo para interpolar. */
function repoUrl(path) {
  return JSON.stringify(pathToFileURL(path).href);
}

/**
 * Ejecuta un script ESM en un proceso node NUEVO y devuelve su stdout (JSON).
 *
 * Nace de un defecto REAL medido: con `execFileSync` (stdio pipeado), dentro del
 * sandbox de Windows del runner de verificación el spawn falla con `EPERM` y los
 * tests D1/D2/D5 se reportaban como fallo de persistencia cuando el fallo era del
 * entorno. Si los pipes no están permitidos, se vuelca la salida a un fichero
 * (descriptor heredado) y se lee de disco: el proceso sigue siendo NUEVO y sin
 * estado compartido, que es lo que el test debe demostrar.
 */
function runInFreshProcess(source) {
  const args = [
    '--experimental-transform-types',
    '--no-warnings',
    '--import',
    pathToFileURL(LOADER).href,
    '--input-type=module',
    '-e',
    source,
  ];
  try {
    const out = execFileSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf8' });
    return JSON.parse(out.trim());
  } catch (error) {
    if (error?.code !== 'EPERM') throw error;
    const sink = awaitableTempFile();
    const fd = openSync(sink, 'w');
    try {
      execFileSync(process.execPath, args, { cwd: REPO_ROOT, stdio: ['ignore', fd, fd] });
    } finally {
      closeSync(fd);
    }
    const raw = readFileSync(sink, 'utf8');
    return JSON.parse(raw.trim());
  }
}

/** Fichero temporal para la salida del proceso hijo (ruta única por invocación). */
function awaitableTempFile() {
  const dir = mkdtempSync(join(tmpdir(), 'snow-store-out-'));
  dirs.push(dir);
  return join(dir, 'stdout.json');
}

const STATION = {
  slug: 'durable-test',
  name: 'Durable Test',
  country: 'FR',
  region: 'Pyrénées',
  discipline: 'alpine',
  lat: 42.1,
  lng: 1.2,
  altitudeBaseM: null,
  altitudeTopM: 2400,
  website: null,
  seasonOpen: null,
  seasonClose: null,
  seasonConfirmed: false,
};

test('D1: escritura en ESTE proceso ⇒ un proceso node NUEVO recupera la estación (id + slug + null)', async () => {
  const dir = tempDir();
  const repo = new JsonStationRepository(dir);
  await repo.upsert(STATION);
  const writtenId = await repo.findIdBySlug('durable-test');
  assert.ok(writtenId, 'el registro debe tener id interno antes de reiniciar');

  // Proceso hijo: módulo y almacén nuevos, sin estado compartido.
  const read = runInFreshProcess(`
    const { JsonStationRepository } = await import(${repoUrl(STATION_REPO)});
    const repo = new JsonStationRepository(${JSON.stringify(dir)});
    const id = await repo.findIdBySlug('durable-test');
    const station = await repo.findBySlug('durable-test');
    const all = await repo.list();
    process.stdout.write(JSON.stringify({ id, station, count: all.length }));
  `);

  assert.strictEqual(read.id, writtenId, 'el id interno sobrevive al reinicio del proceso');
  assert.deepStrictEqual(read.station, STATION, 'la entidad se recupera íntegra (y altitudeBaseM sigue siendo null)');
  assert.strictEqual(read.station.altitudeBaseM, null, 'null ≠ 0 tras el reinicio');
  assert.strictEqual(read.count, 1);
});

test('D2: el parte escrito por este proceso se lee desde un proceso NUEVO (persistencia cross-process)', async () => {
  const dir = tempDir();
  const repo = new JsonSnowReportRepository(dir);
  const report = {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    stationSlug: 'durable-test',
    observedAt: '2026-11-16T08:00:00.000Z',
    capturedAt: '2026-11-16T09:00:00.000Z',
    sourceUrl: 'https://example.invalid/parte',
    author: 'operador-1',
    confidence: 0.75,
    operational: null,
    snow: { baseCm: 40, midCm: null, topCm: 120, newSnow24hCm: null, quality: null },
    avalancheLevel: null,
    mood: 'published',
  };
  await repo.insert(report);

  const read = runInFreshProcess(`
    const { JsonSnowReportRepository } = await import(${repoUrl(REPORT_REPO)});
    const repo = new JsonSnowReportRepository(${JSON.stringify(dir)});
    const byId = await repo.findById('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    const latest = await repo.latestPublishedForStation('durable-test', new Date('2026-11-16T12:00:00.000Z'));
    const published = await repo.listPublished(new Date('2026-11-16T12:00:00.000Z'));
    process.stdout.write(JSON.stringify({ byId, latest, publishedCount: published.length }));
  `);

  assert.deepStrictEqual(read.byId, report, 'el parte se recupera íntegro desde otro proceso');
  assert.strictEqual(read.byId.snow.midCm, null, 'null dentro de la carga anidada sobrevive');
  assert.strictEqual(read.byId.avalancheLevel, null);
  assert.strictEqual(read.latest.id, report.id, 'latestPublishedForStation también en el proceso nuevo');
  assert.strictEqual(read.publishedCount, 1);
});

test('D3: las escrituras son ATÓMICAS — no queda ningún .tmp huérfano tras varias escrituras', async () => {
  const dir = tempDir();
  const repo = new JsonStationRepository(dir);
  for (let i = 0; i < 5; i++) {
    await repo.upsert({ ...STATION, slug: `estacion-${i}`, name: `Estación ${i}` });
  }
  const files = readdirSync(dir);
  assert.deepStrictEqual(
    files.filter((f) => f.endsWith('.tmp')),
    [],
    `un tmp+rename debe dejar el directorio limpio; hay: ${files.join(', ')}`,
  );
  assert.strictEqual((await repo.list()).length, 5);
});

test('D4: un fichero truncado (proceso muerto a media escritura) LANZA en vez de servir datos a medias', async () => {
  const dir = tempDir();
  writeFileSync(join(dir, 'stations.json'), '{"schemaVersion": 2, "records": [ {"id": "1", "record": {"slug": "cor');
  await assert.rejects(() => new JsonStationRepository(dir).list(), /JSON/i);

  // Y una vez íntegro, vuelve a leerse: la rotura no se propaga a otros ficheros.
  writeFileSync(
    join(dir, 'stations.json'),
    JSON.stringify({ schemaVersion: 2, store: 'snow', collection: 'stations', updatedAt: '', seq: 1, records: [{ id: '1', record: STATION }] }),
  );
  const repo = new JsonStationRepository(dir);
  assert.strictEqual((await repo.list()).length, 1);
  assert.strictEqual(readFileSync(join(dir, 'stations.json'), 'utf8').includes('durable-test'), true);
});

test('D5: dos procesos consecutivos acumulan escrituras (el segundo ve lo del primero)', async () => {
  const dir = tempDir();
  const first = runInFreshProcess(`
    const { JsonStationRepository } = await import(${repoUrl(STATION_REPO)});
    await new JsonStationRepository(${JSON.stringify(dir)}).upsert(${JSON.stringify(STATION)});
    process.stdout.write(JSON.stringify({ ok: true }));
  `);
  assert.strictEqual(first.ok, true);

  const second = runInFreshProcess(`
    const { JsonStationRepository } = await import(${repoUrl(STATION_REPO)});
    const repo = new JsonStationRepository(${JSON.stringify(dir)});
    await repo.upsert({ ...${JSON.stringify(STATION)}, slug: 'desde-proceso-2', name: 'Proceso 2' });
    const all = await repo.list();
    process.stdout.write(JSON.stringify({ slugs: all.map((s) => s.slug).sort(), ids: [await repo.findIdBySlug('durable-test'), await repo.findIdBySlug('desde-proceso-2')] }));
  `);
  assert.deepStrictEqual(second.slugs, ['desde-proceso-2', 'durable-test'], 'ninguna escritura previa se pierde');
  assert.deepStrictEqual(second.ids, ['1', '2'], 'los ids internos siguen la secuencia sin reutilizarse');
});

