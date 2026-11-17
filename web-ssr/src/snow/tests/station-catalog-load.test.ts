/**
 * SNOW-03 · t7 — Integración del catálogo maestro (Fase B) en el almacén de estaciones.
 *
 * Verifica EJECUTANDO (no leyendo fuente), contra el catálogo real versionado y el
 * almacén real en directorios temporales:
 *
 *   K1 idempotencia      — dos arranques ⇒ mismo conteo y bytes idénticos
 *   K2 editorial manda   — una fila editorial no la toca el catálogo (slug y valores)
 *   K3 seed intacto      — las 3 curadas siguen resolviéndose por slug, con sus datos
 *   K4 /v1/stations > 3  — el borde sirve el catálogo, con procedencia y sin inventar
 *   K5 proyección        — null en altitud/región/temporada cuando la fuente no los da
 *   K6 atribución        — ODbL ⇒ allowed-with-attribution; CC0 ⇒ allowed
 */
import test from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';

import { createSnowRouter } from '../../snow/server/index.ts';
import { bootstrapStore } from '../store/json-store/file-io.ts';
import {
  applyCatalogToStore,
  catalogLicensing,
  defaultCatalogPath,
  projectCatalogRecord,
  readCatalog,
  SIN_REGION,
} from '../catalog/station-loader.ts';

const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');
const clock = () => FIXED_NOW;
const SEED_SLUGS = ['baqueira-beret', 'formigal-panticosa', 'grandvalira'];

const dirs: string[] = [];
function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'snow-catalog-'));
  dirs.push(dir);
  return dir;
}
test.after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

async function withApp(dir: string, fn: (base: string) => Promise<void>): Promise<void> {
  const app = express();
  app.use('/api/snow', createSnowRouter(dir, clock));
  const srv = app.listen(0, '127.0.0.1');
  await new Promise((r) => srv.once('listening', r));
  const { port } = srv.address() as { port: number };
  try {
    await fn(`http://127.0.0.1:${port}/api/snow`);
  } finally {
    srv.close();
  }
}

/** Conjunto COMPLETO de slugs servidos (la ruta está paginada: 20 por defecto). */
async function allServedSlugs(base: string): Promise<{ slugs: Set<string>; total: number }> {
  const slugs = new Set<string>();
  let total = 0;
  for (let page = 1; page < 50; page += 1) {
    const r = await fetch(`${base}/v1/stations?pageSize=100&page=${page}`);
    const body = await r.json();
    for (const s of body.stations ?? []) slugs.add(s.slug);
    total = body.pagination?.total ?? total;
    if (!body.pagination?.hasNext) break;
  }
  return { slugs, total };
}

test('K0: el catálogo real se lee entero y sin registros malformados', () => {
  const r = readCatalog(defaultCatalogPath());
  assert.ok(r.records > 500, `el catálogo debe tener cientos de registros, tiene ${r.records}`);
  assert.strictEqual(r.malformed, 0, 'ningún registro del catálogo puede ser ilegible');
  const slugs = new Set(r.projected.map((x) => x['slug']));
  assert.strictEqual(slugs.size, r.projected.length, 'slugs únicos');
});

test('K1: el loader es IDEMPOTENTE — dos pasadas = mismo conteo y bytes idénticos', async () => {
  const dir = tempDir();
  bootstrapStore(dir);
  const first = await applyCatalogToStore(dir);
  const stationsFile = join(dir, 'stations.json');
  const provFile = join(dir, 'provenance.json');
  const snap1 = readFileSync(stationsFile, 'utf8');
  const snapProv1 = readFileSync(provFile, 'utf8');

  const second = await applyCatalogToStore(dir);

  assert.strictEqual(second.inserted, 0, 'la segunda pasada no inserta');
  assert.strictEqual(second.updated, 0, 'la segunda pasada no actualiza');
  assert.strictEqual(second.unchanged, first.inserted, 'la segunda pasada reconoce todo lo insertado');
  assert.strictEqual(second.provenanceWritten, 0, 'la segunda pasada no reescribe procedencia');
  assert.strictEqual(second.noop, true, 'y la pasada entera es un no-op');
  assert.strictEqual(readFileSync(stationsFile, 'utf8'), snap1, 'estaciones: bytes idénticos');
  assert.strictEqual(readFileSync(provFile, 'utf8'), snapProv1, 'procedencia: bytes idénticos');

  // Y con un TERCER arranque completo del router sobre el mismo dir.
  await withApp(dir, async (base) => {
    const a = await allServedSlugs(base);
    const b = await allServedSlugs(base);
    assert.strictEqual(a.total, b.total, 'el conteo servido no cambia entre arranques');
    assert.strictEqual(a.slugs.size, b.slugs.size);
  });
});

test('K2: EDITORIAL MANDA — una fila editorial no la pisa el catálogo, ni cambia su id', async () => {
  const dir = tempDir();
  bootstrapStore(dir);
  // 'grandvalira' está a la vez en el seed editorial y en el catálogo (AD).
  await withApp(dir, async (base) => {
    const before = await (await fetch(`${base}/v1/stations/grandvalira`)).json();
    assert.strictEqual(before.station.slug, 'grandvalira');
    // El seed editorial trae región y altitud curadas.
    assert.strictEqual(before.station.region, 'Pirineo Andorrano', 'la región editorial se conserva');
    assert.strictEqual(before.station.altitudeBaseM, 1710, 'la altitud editorial se conserva');
  });
  const result = await applyCatalogToStore(dir);
  assert.ok(result.editorialPreserved >= 1, `debe preservar al menos grandvalira (${result.editorialPreserved})`);
  await withApp(dir, async (base) => {
    const after = await (await fetch(`${base}/v1/stations/grandvalira`)).json();
    assert.strictEqual(after.station.region, 'Pirineo Andorrano', 'el catálogo no pisa la región editorial');
    assert.strictEqual(after.station.altitudeBaseM, 1710, 'el catálogo no pisa la altitud editorial');
    assert.strictEqual(after.station.altitudeTopM, 2640);
  });
});

test('K3: el SEED sigue intacto — las 3 curadas se resuelven por slug y con sus datos', async () => {
  const dir = tempDir();
  await withApp(dir, async (base) => {
    for (const slug of SEED_SLUGS) {
      const r = await fetch(`${base}/v1/stations/${slug}`);
      assert.strictEqual(r.status, 200, `${slug} debe seguir resolviéndose (no romper bookmarks)`);
      const body = await r.json();
      assert.strictEqual(body.station.slug, slug);
      // El parte del seed sigue respondiendo su estado tipado (no 404).
      const rep = await fetch(`${base}/v1/stations/${slug}/report`);
      assert.strictEqual(rep.status, 200, `${slug}/report debe seguir respondiendo 200`);
    }
    const { slugs } = await allServedSlugs(base);
    for (const slug of SEED_SLUGS) assert.ok(slugs.has(slug), `${slug} debe seguir en el directorio`);
  });
});

test('K4: /v1/stations sirve MÁS de 3 estaciones tras la carga, con procedencia', async () => {
  const dir = tempDir();
  await withApp(dir, async (base) => {
    const first = await (await fetch(`${base}/v1/stations`)).json();
    assert.strictEqual(first.status, 'ok');
    assert.ok(first.pagination.total > 3, `debe servir el catálogo, sirve ${first.pagination.total}`);
    const { slugs, total } = await allServedSlugs(base);
    assert.ok(total > 3, `total servido ${total}`);
    assert.strictEqual(slugs.size, total, 'el directorio no repite slugs');

    // Procedencia de la fuente del maestro.
    assert.ok(typeof first.provenance?.source === 'string' && first.provenance.source.length > 0);

    // Países: sólo los del catálogo, sin inventar cobertura.
    const countries = new Set([...slugs].length > 0 ? [] : []);
    void countries;
    const page = await (await fetch(`${base}/v1/stations?pageSize=100&page=1`)).json();
    for (const s of page.stations) assert.ok(['ES', 'AD', 'FR', 'PT'].includes(s.country), `país válido: ${s.country}`);
  });
});

test('K4b: cada estación del catálogo conserva su trazabilidad (catalogRef + licencia)', async () => {
  const dir = tempDir();
  bootstrapStore(dir);
  await applyCatalogToStore(dir);
  const raw = JSON.parse(readFileSync(join(dir, 'stations.json'), 'utf8')) as {
    records: Array<{ id: string; record: Record<string, unknown> }>;
  };
  const catalogRows = raw.records.filter((r) => r.record['origin'] === 'catalog');
  assert.ok(catalogRows.length > 500, `filas de catálogo esperadas, hay ${catalogRows.length}`);
  for (const row of catalogRows.slice(0, 50)) {
    const ref = row.record['catalogRef'] as Record<string, unknown> | undefined;
    assert.ok(ref, `${String(row.record['slug'])} sin catalogRef`);
    assert.ok(typeof ref!.catalogId === 'string', 'catalogRef.catalogId');
    assert.ok(typeof ref!.coordinateSource === 'string', 'catalogRef.coordinateSource (OSM/Wikidata)');
    assert.ok(Array.isArray(ref!.sources) && (ref!.sources as unknown[]).length > 0, 'fuentes citadas');
    for (const s of ref!.sources as Array<Record<string, unknown>>) {
      assert.match(String(s.sha256), /^[a-f0-9]{64}$/, 'cada fuente conserva su sha256');
      assert.ok(typeof s.licenseId === 'string', 'cada fuente declara licencia');
    }
  }
});

test('K5: proyección honesta — sin región, sin altitud base/top y sin temporada inventadas', async () => {
  const dir = tempDir();
  bootstrapStore(dir);
  await applyCatalogToStore(dir);
  const raw = JSON.parse(readFileSync(join(dir, 'stations.json'), 'utf8')) as {
    records: Array<{ record: Record<string, unknown> }>;
  };
  const rows = raw.records.map((r) => r.record).filter((r) => r['origin'] === 'catalog');
  assert.ok(rows.length > 500);
  for (const r of rows) {
    // El catálogo no publica cota base ni superior verificadas: NUNCA se rellenan.
    assert.strictEqual(r['altitudeBaseM'], null, `${String(r['slug'])} no debe inventar cota base`);
    assert.strictEqual(r['altitudeTopM'], null, `${String(r['slug'])} no debe inventar cota superior`);
    // Sin temporada: no se deriva de nada.
    assert.strictEqual(r['seasonOpen'], null);
    assert.strictEqual(r['seasonClose'], null);
    assert.strictEqual(r['seasonConfirmed'], false);
    // Región: o la que da la fuente, o el literal honesto.
    assert.ok(typeof r['region'] === 'string' && (r['region'] as string).length > 0);
  }
  // La cota publicada por el catálogo se conserva ÍNTEGRA en catalogRef.
  const withElev = rows.filter((r) => {
    const ref = r['catalogRef'] as { elevationM?: number | null; elevationMethod?: string | null };
    return typeof ref?.elevationM === 'number';
  });
  assert.ok(withElev.length > 0, 'el catálogo sí tiene cotas fiables: deben conservarse en catalogRef');
  for (const r of withElev) {
    const ref = r['catalogRef'] as { elevationM: number; elevationMethod: string; elevationSourceRef: string | null };
    assert.strictEqual(typeof ref.elevationMethod, 'string', 'la cota conserva su método');
    assert.ok(ref.elevationSourceRef === null || typeof ref.elevationSourceRef === 'string');
  }
});

test('K5b: proyecto un registro mínimo a mano y compruebo qué NO se inventa', () => {
  const row = projectCatalogRecord({ slug: 'x', name: 'X', country: 'ES', lat: 1, lng: 2 });
  assert.ok(row, 'un registro con identidad mínima se proyecta');
  assert.strictEqual(row!['region'], SIN_REGION, 'sin región ⇒ literal honesto, no el país');
  assert.strictEqual(row!['altitudeBaseM'], null);
  assert.strictEqual(row!['altitudeTopM'], null);
  assert.strictEqual(row!['seasonOpen'], null);
  assert.strictEqual(row!['seasonConfirmed'], false);
  assert.strictEqual(row!['origin'], 'catalog');
  // Un registro sin coordenadas válidas NO se proyecta (no se inventa).
  assert.strictEqual(projectCatalogRecord({ slug: 'y', name: 'Y', country: 'ES' }), null);
  assert.strictEqual(projectCatalogRecord({ slug: 'z', name: 'Z', country: 'XX', lat: 1, lng: 2 }), null);
});

test('K6: atribución — ODbL exige atribución; CC0 no la requiere', () => {
  const odbl = catalogLicensing({
    sources: [{ license: { id: 'ODbL-1.0', attribution: '© OpenStreetMap contributors' } }],
  });
  assert.strictEqual(odbl.licenseStatus, 'allowed-with-attribution', 'ODbL ⇒ con atribución');
  assert.strictEqual(odbl.attribution, '© OpenStreetMap contributors');
  assert.strictEqual(odbl.source, 'osm');

  const cc0 = catalogLicensing({ sources: [{ license: { id: 'CC0-1.0' } }] });
  assert.strictEqual(cc0.licenseStatus, 'allowed', 'CC0 ⇒ allowed, sin obligación de atribución');
  assert.strictEqual(cc0.attribution, null, 'sin atribución inventada');
});

test('K6b: la procedencia persistida de station-master declara licencia y atribución', async () => {
  const dir = tempDir();
  bootstrapStore(dir);
  await applyCatalogToStore(dir);
  const prov = JSON.parse(readFileSync(join(dir, 'provenance.json'), 'utf8')) as {
    records: Array<{ record: Record<string, unknown> }>;
  };
  const master = prov.records.map((r) => r.record).filter((r) => r['dataType'] === 'station-master');
  assert.ok(master.length > 500, `procedencia de station-master esperada, hay ${master.length}`);
  const withAttribution = master.filter((r) => r['licenseStatus'] === 'allowed-with-attribution');
  assert.ok(withAttribution.length > 0, 'las estaciones con fuente ODbL declaran atribución');
  for (const r of withAttribution.slice(0, 20)) {
    assert.ok(typeof r['attribution'] === 'string' && (r['attribution'] as string).length > 0);
  }
  for (const r of master) {
    assert.ok(['allowed', 'allowed-with-attribution'].includes(String(r['licenseStatus'])));
    assert.strictEqual(r['updatedAt'], null, 'sin actualización de operador inventada');
  }
});
