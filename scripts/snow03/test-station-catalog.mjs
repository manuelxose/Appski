#!/usr/bin/env node
/**
 * SNOW-03 · FASE B — pruebas deterministas y OFFLINE del extractor de catálogo.
 *
 * No toca la red: ejerce el núcleo puro exportado por build-station-catalog.mjs
 * (parsers, similitud, deduplicación, elevación, ensamblado) con fixtures escritos a
 * mano, y luego valida los invariantes del catálogo publicado y la reproducibilidad
 * del extractor en modo `--cache-only`.
 *
 * Uso: node scripts/snow03/test-station-catalog.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ANDORRA_OUTLINE,
  assembleCatalog,
  buildClusters,
  distanceMeters,
  isInsideCountry,
  isInsidePolygon,
  materialize,
  nameSimilar,
  parseOverpass,
  parseWikidata,
  parseWikidataStatements,
  resolveTerritory,
  slugify,
  wikidataStationElevation,
  DEDUPE_RADIUS_M,
  NAME_SIMILARITY_MIN,
} from './build-station-catalog.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const CATALOG = join(REPO_ROOT, 'web-ssr/src/snow/catalog/station-catalog.json');
const EVIDENCE = join(REPO_ROOT, 'docs/snow/snow03-evidence/catalog-build.json');
const RAW_DIR = join(REPO_ROOT, 'docs/snow/snow03-evidence/raw');

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (err) {
    results.push({ name, ok: false, error: String(err?.message ?? err) });
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg}: esperado ${e}, obtenido ${a}`);
}

// --- fixtures -----------------------------------------------------------------
const SRC_INFO = new Map([
  [
    'osm-ski_resort-test',
    {
      dataset: 'OpenStreetMap (Overpass API)',
      endpoint: 'https://overpass-api.de/api/interpreter',
      url: 'https://overpass-api.de/api/interpreter?data=test',
      sha256: 'a'.repeat(64),
      status: 200,
      capturedAt: '2026-11-16T00:00:00.000Z',
      license: { id: 'ODbL-1.0', name: 'Open Database License 1.0', url: 'https://example.invalid', attribution: '© OpenStreetMap contributors' },
    },
  ],
  [
    'wikidata-ski-resort-test',
    {
      dataset: 'Wikidata (SPARQL)',
      endpoint: 'https://query.wikidata.org/sparql',
      url: 'https://query.wikidata.org/sparql?query=test',
      sha256: 'b'.repeat(64),
      status: 200,
      capturedAt: '2026-11-16T00:00:00.000Z',
      license: { id: 'CC0-1.0', name: 'Creative Commons CC0 1.0 Universal', url: 'https://example.invalid', attribution: 'Wikidata (CC0)' },
    },
  ],
]);

function osmCand(over = {}) {
  return {
    origin: 'osm',
    layer: 'ski_resort',
    transport: 'area',
    geom: 'area',
    osmType: 'way',
    entityKind: 'resort',
    identity: 'leisure=ski_resort',
    sourceKey: 'osm-ski_resort-test',
    sourceRef: 'way/1',
    name: 'Estación de Prueba',
    lat: 42.7,
    lng: 0.9,
    country: 'ES',
    region: null,
    website: null,
    elevationM: null,
    descriptionElevationM: null,
    tags: { leisure: 'ski_resort' },
    aliases: [],
    wikidataQid: null,
    ...over,
  };
}

function wdCand(over = {}) {
  return {
    origin: 'wikidata',
    layer: 'wikidata_ski_resort',
    transport: 'wikidata',
    geom: 'point',
    osmType: null,
    entityKind: 'wikidata',
    identity: 'wikidata',
    sourceKey: 'wikidata-ski-resort-test',
    sourceRef: 'Q100',
    name: 'Estación Wikidata',
    lat: 42.7,
    lng: 0.9,
    country: 'ES',
    region: null,
    website: null,
    elevationM: null,
    elevationCount: 1,
    descriptionElevationM: null,
    tags: null,
    aliases: [],
    wikidataQid: 'Q100',
    ...over,
  };
}

// --- helpers puros ------------------------------------------------------------
check('distanceMeters: 1° de latitud ≈ 111,2 km', () => {
  const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert(Math.abs(d - 111_195) < 400, `distancia inesperada ${d}`);
});

check('nameSimilar: variantes con genéricos y acentos coinciden', () => {
  assert(nameSimilar('Estación de Esquí de Boí Taüll', 'Boí-Taüll') === 1, 'debería contenerse');
  assert(nameSimilar('Baqueira/Beret', 'Baqueira Beret') === 1, 'debería contenerse');
  assert(nameSimilar('Grandvalira', 'Grandvalira-Soldeu') === 1, 'debería contenerse');
  assert(nameSimilar('Grandvalira', 'Ordino-Arcalís') < NAME_SIMILARITY_MIN, 'no debería parecerse');
});

check('slugify: ASCII estable y sin bordes', () => {
  eq(slugify('Estació d´Esquí Boí-Taüll'), 'estacio-d-esqui-boi-taull', 'slug ca');
  eq(slugify('---'), 'sin-nombre', 'slug vacío');
});

// --- parsers fail-closed ------------------------------------------------------
check('parseOverpass: 502 XML NO se convierte en cero estaciones', () => {
  const r = parseOverpass('<!DOCTYPE html><html><body>502 Gateway Timeout</body></html>');
  eq(r.doc, null, 'doc');
  eq(r.reason, 'no_json', 'motivo');
});

check('parseOverpass: JSON sin elements ⇒ null', () => {
  eq(parseOverpass('{"foo":1}').doc, null, 'doc');
});

check('parseOverpass: acepta node/way con center, descarta sin coordenada', () => {
  const r = parseOverpass(
    JSON.stringify({
      version: 0.6,
      osm3s: { timestamp_osm_base: '2026-11-16T00:00:00Z' },
      elements: [
        { type: 'node', id: 1, lat: 42.5, lon: 1.5, tags: { name: 'A', leisure: 'ski_resort' } },
        { type: 'way', id: 2, center: { lat: 42.6, lon: 1.6 }, tags: { name: 'B' } },
        { type: 'way', id: 3, tags: { name: 'sin geometría' } },
      ],
    }),
  );
  eq(r.elements.length, 2, 'elementos aceptados');
  eq(r.doc.timestampOsmBase, '2026-11-16T00:00:00Z', 'timestamp');
});

check('parseWikidata: WKT invertido (lon lat), filas sin etiqueta descartadas, ítem agrupado', () => {
  const body = JSON.stringify({
    results: {
      bindings: [
        { item: { value: 'http://www.wikidata.org/entity/Q1' }, itemLabel: { value: 'Baqueira Beret' }, coord: { value: 'Point(0.9367 42.6999)' }, elev: { value: '1505' } },
        // misma estación repetida por el servicio de etiquetas: NO debe duplicar ni elevar
        { item: { value: 'http://www.wikidata.org/entity/Q1' }, itemLabel: { value: 'Baqueira Beret' }, coord: { value: 'Point(0.9367 42.6999)' }, elev: { value: '3747' } },
        { item: { value: 'http://www.wikidata.org/entity/Q2' }, itemLabel: { value: 'Q2' }, coord: { value: 'Point(1 2)' } },
      ],
    },
  });
  const r = parseWikidata(body, 'ES');
  eq(r.rows.length, 1, 'filas (agrupadas por ítem+coordenada)');
  eq([r.rows[0].lat, r.rows[0].lng], [42.6999, 0.9367], 'lat/lng desde WKT');
  eq(r.rows[0].serviceElevCount, 2, 'elevaciones de servicio contadas pero no publicadas');
  eq(r.rows[0].elevationM, undefined, 'el servicio SPARQL no publica elevación');
  eq(r.doc.malformed, 1, 'filas malformadas contadas');
});

check('wikidataStationElevation: una única P2044 en metros se acepta', () => {
  const e = wikidataStationElevation({
    qid: 'Q1',
    claims: { P2044: [{ rank: 'normal', quantity: '1500', unit: 'http://www.wikidata.org/entity/Q11573' }] },
  });
  eq(e.elevationM, 1500, 'elevación');
});

check('wikidataStationElevation: varias cotas ⇒ null (medido: Tignes 1440/2100/2384/3747)', () => {
  const e = wikidataStationElevation({
    qid: 'Q330899',
    claims: {
      P2044: [
        { rank: 'normal', quantity: '1440', unit: 'http://www.wikidata.org/entity/Q11573' },
        { rank: 'normal', quantity: '3747', unit: 'http://www.wikidata.org/entity/Q11573' },
      ],
    },
  });
  eq(e.elevationM, null, 'elevación');
  assert(e.reason.includes('ambigua'), 'motivo');
});

check('wikidataStationElevation: unidad no métrica ⇒ null', () => {
  const e = wikidataStationElevation({ qid: 'Q1', claims: { P2044: [{ rank: 'normal', quantity: '4921', unit: 'http://www.wikidata.org/entity/Q11574' }] } });
  eq(e.elevationM, null, 'elevación');
});

check('parseWikidataStatements: rank preferido gana sobre normal', () => {
  const body = JSON.stringify({
    results: {
      bindings: [
        { item: { value: 'http://www.wikidata.org/entity/Q9' }, rank: { value: 'http://wikidata.org/vocab/rank/preferred' }, height: { value: '1800' }, unit: { value: 'http://www.wikidata.org/entity/Q11573' } },
        { item: { value: 'http://www.wikidata.org/entity/Q9' }, rank: { value: 'http://wikidata.org/vocab/rank/normal' }, height: { value: '1500' }, unit: { value: 'http://www.wikidata.org/entity/Q11573' } },
      ],
    },
  });
  const r = parseWikidataStatements(body);
  eq(wikidataStationElevation(r.entities.get('Q9')).elevationM, 1800, 'elevación');
});

// --- deduplicación ------------------------------------------------------------
check('dedupe: dos OSM del mismo macizo (<1,5 km, nombre similar) ⇒ 1 entrada + 1 descarte', () => {
  const cands = [
    osmCand({ sourceRef: 'way/10', lat: 42.7, lng: 0.9, name: 'Baqueira Beret' }),
    osmCand({ sourceRef: 'way/11', lat: 42.701, lng: 0.901, name: 'Baqueira/Beret' }),
  ];
  const { clusters, rejections } = buildClusters(cands);
  eq(clusters.length, 1, 'macizos');
  eq(rejections.length, 1, 'descartes');
  eq(rejections[0].mergedInto, 'way/10', 'fusionado en');
  const { records } = assembleCatalog({ clusters, sourceInfo: SRC_INFO });
  eq(records.length, 1, 'entradas publicadas');
  assert(records[0].aliases.includes('Baqueira/Beret'), 'alias del fusionado');
});

check('dedupe: >1,5 km ⇒ dos entradas distintas', () => {
  const cands = [
    osmCand({ sourceRef: 'way/10', lat: 42.7, lng: 0.9, name: 'Baqueira Beret' }),
    osmCand({ sourceRef: 'way/12', lat: 42.75, lng: 0.95, name: 'Baqueira Beret' }),
  ];
  const { clusters, rejections } = buildClusters(cands);
  eq(clusters.length, 2, 'macizos');
  eq(rejections.length, 0, 'descartes');
});

check('dedupe: <1,5 km pero nombre distinto ⇒ NO se fusiona', () => {
  const cands = [
    osmCand({ sourceRef: 'way/10', lat: 42.7, lng: 0.9, name: 'Baqueira Beret' }),
    osmCand({ sourceRef: 'way/13', lat: 42.701, lng: 0.901, name: 'Tuca Blanca' }),
  ];
  eq(buildClusters(cands).clusters.length, 2, 'macizos');
});

check('dedupe: radio de 1,5 km respetado en el borde', () => {
  const a = osmCand({ sourceRef: 'way/20', lat: 42.7, lng: 0.9, name: 'Baqueira Beret' });
  const b = osmCand({ sourceRef: 'way/21', lat: 42.7 + 0.014, lng: 0.9, name: 'Baqueira Beret' });
  assert(distanceMeters(a, b) > DEDUPE_RADIUS_M, 'el fixture debe superar el radio');
  eq(buildClusters([a, b]).clusters.length, 2, 'macizos');
});

check('mismo dominio etiquetado como landuse y site ⇒ UNA sola estación publicada', () => {
  const cands = [
    osmCand({ sourceRef: 'way/30', identity: 'landuse=winter_sports', name: 'Baqueira Beret', tags: { landuse: 'winter_sports' } }),
    osmCand({ sourceRef: 'way/31', identity: 'site=piste', name: 'Baqueira Beret', tags: { site: 'piste' } }),
  ];
  const { clusters } = buildClusters(cands);
  eq(clusters.length, 1, 'macizos (mismo dominio)');
  eq(assembleCatalog({ clusters, sourceInfo: SRC_INFO }).records.length, 1, 'registros');
});

check('candidata sin nombre ⇒ ningún registro se publica (nunca se inventa)', () => {
  const { clusters } = buildClusters([osmCand({ sourceRef: 'way/40', name: '' })]);
  eq(clusters.length, 0, 'macizos');
  eq(assembleCatalog({ clusters, sourceInfo: SRC_INFO }).records.length, 0, 'registros');
});

check('punto de servicio (nodo de remonte) ⇒ NO se publica como estación; se referencia', () => {
  const zone = osmCand({ sourceRef: 'way/41', name: 'Zona de Prueba', lat: 42.7, lng: 0.9 });
  const lift = osmCand({
    sourceRef: 'node/42',
    name: 'Telecabina de Prueba',
    lat: 42.701,
    lng: 0.901,
    geom: 'point',
    osmType: 'node',
    transport: 'aerialway',
    identity: 'aerialway=station',
    layer: 'aerialway_station',
    entityKind: 'aerialway_station',
    tags: { aerialway: 'station', name: 'Telecabina de Prueba' },
  });
  const { clusters, servicePoints } = buildClusters([zone, lift]);
  eq(clusters.length, 1, 'macizos (sólo la zona)');
  const { records } = assembleCatalog({ clusters, sourceInfo: SRC_INFO });
  eq(records.length, 1, 'registros publicados');
  assert(!records.some((r) => r.name === 'Telecabina de Prueba'), 'el remonte no se publica');
  eq(servicePoints.length, 1, 'puntos de servicio en evidencia');
  eq(servicePoints[0].hostStation, 'way/41', 'estación anfitriona');
  eq(records[0].servicePointRefs, ['osm:node/42'], 'referencia declarada');
});

check('pista lineal (way con piste:type) ⇒ referencia, no estación', () => {
  const zone = osmCand({ sourceRef: 'way/50', name: 'Dominio', lat: 42.7, lng: 0.9 });
  const piste = osmCand({
    sourceRef: 'way/51',
    name: 'Piste du Bois',
    lat: 42.701,
    lng: 0.9,
    transport: 'piste',
    identity: 'piste:type=alpine',
    layer: 'piste_alpine',
    tags: { 'piste:type': 'alpine', name: 'Piste du Bois' },
  });
  const { clusters } = buildClusters([zone, piste]);
  eq(clusters.length, 1, 'macizos');
  eq(assembleCatalog({ clusters, sourceInfo: SRC_INFO }).records.length, 1, 'registros');
});

// --- elevación ----------------------------------------------------------------
check('elevación: OSM ele del polígono de la estación se publica con su fuente', () => {
  const c = { country: 'ES', identity: 'leisure=ski_resort', kind: 'resort', canonical: osmCand({ sourceRef: 'way/50', elevationM: 1900 }), members: [osmCand({ sourceRef: 'way/50', elevationM: 1900 })], points: [] };
  const e = materialize(c, { sourceInfo: SRC_INFO });
  eq(e.elevation.elevationM, 1900, 'elevación');
  eq(e.elevation.method, 'osm_tag_ele', 'método');
  eq(e.elevation.sourceRef, 'way/50', 'fuente');
});

check('elevación: ele de un NODO de cota dentro del polígono NO se publica', () => {
  // Un nodo NUNCA es zona (es punto de servicio), así que la cota se inyecta como
  // miembro del macizo igual que haría un nodo con el mismo nombre dentro del polígono.
  const zone = osmCand({ sourceRef: 'way/61', elevationM: null, name: 'Estación de Prueba' });
  const { clusters } = buildClusters([zone]);
  eq(clusters.length, 1, 'macizos');
  const summit = osmCand({ sourceRef: 'node/60', osmType: 'node', geom: 'point', elevationM: 2610, name: 'Estación de Prueba' });
  const forced = { ...clusters[0], members: [...clusters[0].members, summit] };
  const e = materialize(forced, { sourceInfo: SRC_INFO });
  eq(e.elevation.elevationM, null, 'elevación');
  eq(e.elevationDiscardedCandidates[0].sourceRef, 'node/60', 'descartada con fuente');
});

check('elevación: sin fuente fiable ⇒ null con motivo; texto libre no se usa', () => {
  const m = osmCand({ sourceRef: 'way/51', descriptionElevationM: 1500, tags: { leisure: 'ski_resort', description: 'Cota 1500 m' } });
  const e = materialize({ country: 'ES', identity: 'leisure=ski_resort', kind: 'resort', canonical: m, members: [m], points: [] }, { sourceInfo: SRC_INFO });
  eq(e.elevation.elevationM, null, 'elevación');
  eq(e.elevation.method, 'no_reliable_source', 'método');
  assert(e.elevationUnavailableReason.includes('texto libre'), 'motivo menciona texto libre');
});

check('elevación: P2044 única de Wikidata se usa y OSM tiene prioridad en su propia entrada', () => {
  // Bajo el criterio v3, una zona OSM y su elemento Wikidata con el mismo nombre y a
  // <1,5 km son la MISMA estación: elevación OSM (ODbL) gana en la entrada fusionada.
  const osm = osmCand({ sourceRef: 'way/70', elevationM: 1900, name: 'Estación Wikidata' });
  const wd = wdCand({ lat: 42.7, lng: 0.9 });
  const wdElev = new Map([['Q100', { elevationM: 1950, reason: null }]]);
  const merged = buildClusters([osm, wd], { wikidataElevation: wdElev });
  eq(merged.clusters.length, 1, 'macizo único (misma estación)');
  const em = materialize(merged.clusters[0], { sourceInfo: SRC_INFO, wikidataElevation: wdElev });
  eq(em.elevation.elevationM, 1900, 'prioridad OSM');
  eq(em.elevation.method, 'osm_tag_ele', 'método OSM');
  // El conflicto con Wikidata queda MEDIDO, no oculto.
  assert(
    em.elevationDiscardedCandidates.some((d) => /conflicto/.test(d.reason) && d.m === 1950),
    'conflicto 1950 m registrado como descartado',
  );
  // Sin zona OSM, la P2044 única es la fuente publicada.
  const soloWd = buildClusters([wd], { wikidataElevation: wdElev });
  const ew = materialize(soloWd.clusters[0], { sourceInfo: SRC_INFO, wikidataElevation: wdElev });
  eq(ew.elevation.elevationM, 1950, 'elevación Wikidata');
  eq(ew.elevation.method, 'wikidata_P2044', 'método Wikidata');
});

check('ensamblado: licencia ODbL y atribución presentes en cada entrada OSM', () => {
  const { clusters } = buildClusters([osmCand({ sourceRef: 'way/60', name: 'Baqueira Beret' })]);
  const { records } = assembleCatalog({ clusters, sourceInfo: SRC_INFO });
  eq(records[0].licenses, ['ODbL-1.0:Open Database License 1.0'], 'licencia');
  eq(records[0].attribution, ['© OpenStreetMap contributors'], 'atribución');
  eq(records[0].sources[0].status, 200, 'status de la fuente');
  eq(records[0].sources[0].sha256.length, 64, 'sha256 de la fuente');
});

check('ensamblado: id estable y slug a partir del nombre', () => {
  const { clusters } = buildClusters([osmCand({ sourceRef: 'way/70', name: 'Estación Boí Taüll' })]);
  eq(assembleCatalog({ clusters, sourceInfo: SRC_INFO }).records[0].id, 'snow03:es:estacion-boi-taull', 'id');
});

// --- regresión sobre el árbol real -------------------------------------------
check('catálogo publicado: existe y cumple invariantes de procedencia', () => {
  assert(existsSync(CATALOG), `${CATALOG} no existe: ejecuta antes el extractor`);
  assert(existsSync(EVIDENCE), `${EVIDENCE} no existe`);
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const ids = new Set();
  for (const r of catalog.records) {
    assert(!ids.has(r.id), `id duplicado ${r.id}`);
    ids.add(r.id);
    assert(typeof r.lat === 'number' && typeof r.lng === 'number', `coordenada ${r.id}`);
    assert(r.sources.length > 0, `${r.id} sin fuente`);
    for (const s of r.sources) {
      assert(/^[a-f0-9]{64}$/.test(s.sha256 ?? ''), `${r.id} fuente sin sha256`);
      assert(Number.isInteger(s.status) && s.status >= 200 && s.status < 300, `${r.id} fuente sin 2xx`);
      // Un 200 HTML (p. ej. la SPA de Wikidata) jamás cuenta como fuente válida.
      assert(!/wikidata\.org\/wiki\/Special:EntityData/.test(s.url ?? ''), `${r.id} cita EntityData (HTML)`);
    }
    assert(typeof r.firstCapturedAt === 'string', `${r.id} sin fecha de captura`);
    assert(r.licenses.length > 0, `${r.id} sin licencia`);
    if (r.elevation.elevationM !== null) {
      assert(r.elevation.kind === 'altitude' && r.elevation.sourceRef, `${r.id} elevación sin fuente`);
    } else {
      assert(typeof r.elevationUnavailableReason === 'string', `${r.id} elevación null sin motivo`);
    }
    // Un punto de servicio nunca se publica como estación.
    assert(!['aerialway_station', 'named_piste'].includes(r.entityKind), `${r.id} publica un punto de servicio como estación`);
  }
  eq(catalog.counts.incorporated, catalog.records.length, 'conteo incorporadas');
});

check('evidencia: toda fuente citada tiene su fichero de caché con sha256 coincidente', () => {
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const cited = new Set(catalog.records.flatMap((r) => r.sources.map((s) => s.sha256)));
  assert(cited.size > 0, 'el catálogo no cita fuentes');
  const rawShas = new Set();
  for (const f of existsSync(RAW_DIR) ? readdirSync(RAW_DIR).filter((n) => n.endsWith('.json')) : []) {
    const meta = JSON.parse(readFileSync(join(RAW_DIR, f), 'utf8'));
    if (meta.sha256) rawShas.add(meta.sha256);
  }
  for (const sha of cited) assert(rawShas.has(sha), `sha256 citado sin fichero de caché: ${sha}`);
});

check('extractor en --cache-only reproduce el mismo catálogo sin red (determinista)', () => {
  const before = JSON.parse(readFileSync(CATALOG, 'utf8'));
  execFileSync(process.execPath, [join(HERE, 'build-station-catalog.mjs'), '--cache-only'], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
  const after = JSON.parse(readFileSync(CATALOG, 'utf8'));
  eq(after.records, before.records, 'registros idénticos');
  eq(after.counts, before.counts, 'conteos idénticos');
});

// --- territorios y deduplicación (residuos cerrados 2026-11-17) ---------------
check('AD: ningún registro del catálogo cae fuera del territorio andorrano REAL', () => {
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const ad = catalog.records.filter((r) => r.country === 'AD');
  assert(ad.length > 0, 'el catálogo debe tener registros AD para que la prueba signifique algo');
  for (const r of ad) {
    assert(
      isInsidePolygon(r.lat, r.lng, ANDORRA_OUTLINE),
      `${r.id} está marcado AD pero cae FUERA del contorno real de Andorra (${r.lat},${r.lng})`,
    );
    assert(isInsideCountry(r.lat, r.lng, 'AD'), `${r.id}: isInsideCountry('AD') debe ser true`);
  }
});

check('frontera: Porté-Puymorens y Porté-Pimorent son FR, no AD', () => {
  // Verificado con el municipio real (OSM relation/409377) y fuera del contorno de AD.
  eq(resolveTerritory(42.55214, 1.796588), 'FR', 'Porté-Puymorens');
  eq(resolveTerritory(42.55575, 1.80613), 'FR', 'Porté-Pimorent');
});

check('frontera: estaciones conocidas siguen en su país (ES/AD/PT/null)', () => {
  const cases = [
    ['Baqueira', 42.6999, 0.9367, 'ES'],
    ['Vallter', 42.43, 2.26, 'ES'],
    ['Espot', 42.55, 1.08, 'ES'],
    ['Boí', 42.47, 0.87, 'ES'],
    ['La Molina', 42.33, 1.94, 'ES'],
    ['Tavascan', 42.62, 1.26, 'ES'],
    ['Formigal', 42.76, -0.39, 'ES'],
    ['Sierra Nevada', 37.09, -3.39, 'ES'],
    ['Pas de la Casa', 42.541151, 1.733279, 'AD'],
    ['Ordino', 42.627388, 1.489741, 'AD'],
    ['Grau Roig', 42.532911, 1.698725, 'AD'],
    ['Arinsal', 42.552284, 1.469895, 'AD'],
    ['Serra da Estrela', 40.32, -7.61, 'PT'],
    ['Almatý (KZ)', 43.27, 77.36, null],
  ];
  for (const [name, lat, lng, expected] of cases) {
    eq(resolveTerritory(lat, lng), expected, name);
  }
});

check('contorno de Andorra: 2499 vértices y anillo cerrado', () => {
  eq(ANDORRA_OUTLINE.length, 2499, 'vértices');
  eq(ANDORRA_OUTLINE[0], ANDORRA_OUTLINE[ANDORRA_OUTLINE.length - 1], 'primer vértice == último');
});

check('dedupe: misma estación dibujada dos veces en OSM (mismo punto, nombre afín) ⇒ 1', () => {
  // Medido: "Le Revard" way/1254296225 y "Plateau du Revard" relation/10059812.
  const a = osmCand({ sourceRef: 'way/1254296225', name: 'Le Revard', lat: 45.673193, lng: 6.011493 });
  const b = osmCand({ sourceRef: 'relation/10059812', name: 'Plateau du Revard', lat: 45.673193, lng: 6.011493 });
  a.identity = b.identity = 'weak_area';
  const { clusters } = buildClusters([a, b]);
  eq(clusters.length, 1, 'macizos');
  eq(assembleCatalog({ clusters, sourceInfo: SRC_INFO }).records.length, 1, 'registros');
});

check('dedupe: ningún par publicado comparte coordenada exacta (4 decimales)', () => {
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const seen = new Map();
  for (const r of catalog.records) {
    const k = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
    assert(!seen.has(k), `coordenada ${k} publicada dos veces: ${seen.get(k)} y ${r.id}`);
    seen.set(k, r.id);
  }
});

check('dedupe: el mismo punto nunca aparece con dos países distintos', () => {
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'));
  const seen = new Map();
  for (const r of catalog.records) {
    const k = `${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
    if (seen.has(k)) assert(seen.get(k) === r.country, `punto ${k} con dos países`);
    seen.set(k, r.country);
  }
});

const failed = results.filter((r) => !r.ok);
process.stdout.write(
  `${results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? '' : ` :: ${r.error}`}`).join('\n')}\n` +
    `\n${results.length - failed.length}/${results.length} PASS\n`,
);
if (failed.length) process.exitCode = 1;
