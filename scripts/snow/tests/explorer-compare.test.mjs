/**
 * Contraste de filas del comparador (F25) y de la lógica de exploradora.
 *
 *   node scripts/snow/tests/build-client.mjs
 *   node node_modules/typescript/bin/tsc -p tmp/t6-k1/tsconfig.client.json
 *   node scripts/snow/tests/build-client.mjs
 *   node --test --test-isolation=none scripts/snow/tests/explorer-compare.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = join(ROOT, "tmp/t6-k1/snow-client");
const load = async (rel) => {
  const p = join(OUT, rel);
  assert.ok(existsSync(p), `falta ${rel}: build-client + tsc + build-client`);
  return import(pathToFileURL(p).href);
};
const EXP = "app/snow/client/ui/explorer-logic.js";
const CMP = "app/snow/client/ui/compare-logic.js";

/* ------------------------------- fixtures ------------------------------- */

const st = (slug, name, region, country, discipline) => ({
  slug,
  name,
  country,
  region,
  lat: 42,
  lng: 0,
  altitudeBaseM: 1500,
  altitudeTopM: 2500,
  website: null,
  discipline,
});

const row = (station, status, snowBaseCm, kmOpen, observedAt = null) => ({
  station,
  status,
  snowBaseCm,
  kmOpen,
  observedAt,
});

const ROWS = [
  row(st("baqueira-beret", "Baqueira Beret", "Pirineo Catalán", "ES", "alpine"), "open", 120, 40, "2026-11-16T05:45:00.000Z"),
  row(st("espot", "Espot", "Pirineo Catalán", "ES", "alpine"), "closed", 0, 0, null),
  row(st("boi-tauill", "Boí Taüll", "Pirineo Catalán", "ES", "alpine"), "unknown", null, null, null),
  row(st("formigal", "Formigal-Panticosa", "Aragón", "ES", "alpine"), "open", 45, 12, "2026-11-16T06:00:00.000Z"),
  row(st("tuixent", "Tuixent-La Vansa", "Pirineo Catalán", "ES", "nordic"), "closed", 30, 8, null),
  row(st("grandvalira", "Grandvalira", "Andorra", "AD", "alpine"), "blocked", null, null, null),
];

/* ------------------------------- explorador ------------------------------- */

test("parseQuery sanea valores desconocidos sin reventar", async () => {
  const { parseQuery } = await load(EXP);
  const q = parseQuery(
    new URLSearchParams("pais=ES,XX&disciplina=nordic,bogus&estado=open,pepino&orden=basura&dir=desc&pagina=-3")
  );
  assert.deepEqual(q.filters.countries, ["ES"]);
  assert.deepEqual(q.filters.disciplines, ["nordic"]);
  assert.deepEqual(q.filters.statuses, ["open"]);
  assert.equal(q.sort.field, "name", "orden desconocido vuelve al por defecto");
  assert.equal(q.sort.dir, "desc");
  assert.equal(q.page, 1, "página inválida vuelve a 1");
});

test("la URL es canónica: mismo estado ⇒ misma cadena, y la vuelta es identidad", async () => {
  const { parseQuery, toParams } = await load(EXP);
  const url = "pais=ES&sistema=Pirineo%20Catal%C3%A1n&orden=snow&dir=desc";
  const q1 = parseQuery(new URLSearchParams(url));
  const s1 = toParams(q1);
  const q2 = parseQuery(new URLSearchParams(s1));
  assert.equal(toParams(q2), s1, "round-trip inestable");
  // Los valores por defecto no se escriben.
  assert.equal(toParams(parseQuery(new URLSearchParams(""))), "");
});

test("el filtro de nieve EXCLUYE las filas sin dato (no las trata como 0)", async () => {
  const { filterAndSort, parseQuery } = await load(EXP);
  const q = parseQuery(new URLSearchParams("nieveMin=40"));
  const got = filterAndSort(ROWS, q).map((r) => r.station.slug);
  // El orden por defecto es alfabético: Baqueira, Formigal. Tuixent (30 cm) NO
  // entra porque 30 < 40 — el filtro es un umbral real, no un «mayor que cero».
  assert.deepEqual(got, ["baqueira-beret", "formigal"]);
  assert.ok(!got.includes("tuixent"), "30 cm no supera el umbral de 40");
  assert.ok(!got.includes("boi-tauill"), "una estación sin dato no puede superar un umbral");
  // Un umbral por encima del máximo deja sólo las que lo superan de verdad.
  const high = parseQuery(new URLSearchParams("nieveMin=100&orden=snow&dir=desc"));
  assert.deepEqual(filterAndSort(ROWS, high).map((r) => r.station.slug), ["baqueira-beret"]);
});

test("la búsqueda ignora acentos y mayúsculas", async () => {
  const { foldText, filterAndSort, parseQuery } = await load(EXP);
  // El pliegue en sí: la letra con diéresis pasa a su base.
  assert.equal(foldText("Boí"), "boi");
  // Nota: «Taüll» se escribe con diéresis sobre la «u» pero sin «u» adicional;
  // el pliegue debe dar «taull», no «tauull». La prueba va con el spelling real.
  assert.equal(foldText("TAÜLL"), "taull");
  for (const term of ["boi", "BOÍ", "taull", "TAÜLL"]) {
    const got = filterAndSort(ROWS, parseQuery(new URLSearchParams(`q=${encodeURIComponent(term)}`)));
    assert.ok(
      got.some((r) => r.station.slug === "boi-tauill"),
      `«${term}» no encontró Boí Taüll`
    );
  }
  // La forma partida («boi tau») se cubre por el slug, que va sin separador raro.
  const split = filterAndSort(ROWS, parseQuery(new URLSearchParams("q=boi-tau")));
  assert.ok(split.some((r) => r.station.slug === "boi-tauill"));
});

test("el estado desconocido es un valor filtrable, no una fila perdida", async () => {
  const { filterAndSort, parseQuery } = await load(EXP);
  const q = parseQuery(new URLSearchParams("estado=unknown"));
  assert.deepEqual(filterAndSort(ROWS, q).map((r) => r.station.slug), ["boi-tauill"]);
});

test("la búsqueda ignora acentos y mayúsculas", async () => {
  const { filterAndSort, parseQuery } = await load(EXP);
  for (const term of ["boi", "BOÍ", "taull"]) {
    const got = filterAndSort(ROWS, parseQuery(new URLSearchParams(`q=${encodeURIComponent(term)}`)));
    assert.ok(
      got.some((r) => r.station.slug === "boi-tauill"),
      `«${term}» no encontró Boí Taüll`
    );
  }
});

test("ordenar por nieve pone los NULL al final, en ambos sentidos", async () => {
  const { filterAndSort, parseQuery } = await load(EXP);
  for (const dir of ["asc", "desc"]) {
    const got = filterAndSort(ROWS, parseQuery(new URLSearchParams(`orden=snow&dir=${dir}`)))
      .map((r) => r.snowBaseCm);
    const firstNull = got.indexOf(null);
    assert.ok(firstNull > 0, `${dir}: debería haber valores antes de los nulos`);
    assert.ok(
      got.slice(firstNull).every((v) => v === null),
      `${dir}: después del primer null no puede haber valores: ${JSON.stringify(got)}`
    );
  }
});

test("paginación: límites correctos y página fuera de rango se recorta", async () => {
  const { paginate } = await load(EXP);
  const p1 = paginate(ROWS, 1, 4);
  assert.deepEqual([p1.from, p1.to, p1.pages, p1.items.length], [1, 4, 2, 4]);
  const p9 = paginate(ROWS, 9, 4);
  assert.equal(p9.page, 2, "página fuera de rango se recorta a la última");
  assert.deepEqual([p9.from, p9.to], [5, 6]);
  const empty = paginate([], 1, 4);
  assert.deepEqual([empty.from, empty.to, empty.pages], [0, 0, 1]);
});

test("noindex a partir de 2 filtros (canonical limpio de §11)", async () => {
  const { parseQuery, shouldIndex, activeFilterCount } = await load(EXP);
  assert.equal(shouldIndex(parseQuery(new URLSearchParams("")).filters), true);
  assert.equal(shouldIndex(parseQuery(new URLSearchParams("pais=ES")).filters), true, "un país es indexable");
  assert.equal(shouldIndex(parseQuery(new URLSearchParams("pais=ES&estado=open")).filters), false);
  assert.equal(activeFilterCount(parseQuery(new URLSearchParams("q=x&pais=ES")).filters), 2);
});

test("columnas: nórdico dice «Circuitos», alpino dice «Pistas» (F11)", async () => {
  const { pisteColumnLabel, facetOptions } = await load(EXP);
  assert.equal(pisteColumnLabel("nordic"), "Circuitos");
  assert.equal(pisteColumnLabel("alpine"), "Pistas");
  const f = facetOptions(ROWS);
  assert.deepEqual(f.countries, ["ES", "AD"], "países ordenados por la lista canónica");
  assert.ok(f.regions.includes("Andorra"));
  assert.deepEqual(f.disciplines, ["alpine", "nordic"]);
});

/* ------------------------------- comparador ------------------------------- */

const column = (over = {}) => ({
  slug: "x",
  name: "X",
  region: "Pirineo",
  status: { key: "unknown", labelKey: "snow.status.unknown.label", glyph: "?", depthUnknown: false, supportKey: null },
  isOpen: null,
  baseCm: null,
  topCm: null,
  newSnow24hCm: null,
  kmOpen: null,
  liftsOpen: null,
  liftsTotal: null,
  observedAt: null,
  provenanceText: "Parte de estación · fuente: operador",
  hasAnyValue: false,
  ...over,
});

test("guarda de selección: 2–3 estaciones, sin duplicados", async () => {
  const { guardSelection } = await load(CMP);
  assert.equal(guardSelection(["a"]).ok, false);
  assert.equal(guardSelection(["a"]).reason, "too-few");
  assert.equal(guardSelection(["a", "b"]).ok, true);
  assert.equal(guardSelection(["a", "b", "c"]).ok, true);
  assert.deepEqual(guardSelection(["c", "a", "b"]).slugs, ["c", "a", "b"], "conserva el orden");
  const tooMany = guardSelection(["a", "b", "c", "d"]);
  assert.equal(tooMany.ok, false);
  assert.equal(tooMany.reason, "too-many");
  assert.equal(guardSelection(["a", "a"]).reason, "duplicate");
  assert.equal(guardSelection(["a", " "]).ok, false, "los slugs vacíos no cuentan");
});

test("una celda sin dato NO se oculta: se compara la ausencia", async () => {
  const { compareRows } = await load(CMP);
  const cols = [
    column({ slug: "a", baseCm: 80, status: { key: "open", glyph: "▲", labelKey: "x", depthUnknown: false, supportKey: null } }),
    column({ slug: "b", baseCm: null }),
  ];
  const base = compareRows(cols).find((r) => r.key === "base");
  assert.equal(base.cells[0].kind, "value");
  assert.equal(base.cells[0].text, "80 cm");
  assert.equal(base.cells[1].kind, "nodata");
  assert.equal(base.cells[1].text, "Sin datos");
  assert.equal(base.cells.length, cols.length, "siempre una celda por columna");
});

test("un 0 medido se compara como 0 cm, no como ausencia", async () => {
  const { compareRows } = await load(CMP);
  const r = compareRows([column({ baseCm: 0 }), column({ slug: "b", baseCm: 5 })]);
  const base = r.find((x) => x.key === "base");
  assert.equal(base.cells[0].kind, "value");
  assert.equal(base.cells[0].text, "0 cm");
});

test("el estado se pinta con glifo + palabra (SC 1.4.1)", async () => {
  const { compareRows, STATUS_TEXT } = await load(CMP);
  const r = compareRows([column({ status: { key: "closed", glyph: "▼", labelKey: "x", depthUnknown: false, supportKey: null } })]);
  const cell = r.find((x) => x.key === "status").cells[0];
  assert.equal(cell.text, "▼ Cerrada");
  assert.equal(STATUS_TEXT.closed, "Cerrada");
});

test("STATUS_TEXT coincide con el namespace i18n (etiquetas)", async () => {
  const { STATUS_TEXT } = await load(CMP);
  const es = JSON.parse(readFileSync(join(ROOT, "web-ssr/public/assets/i18n/snow/es.json"), "utf8"));
  for (const [k, v] of Object.entries(STATUS_TEXT)) {
    assert.equal(es.snow.status[k].label, v, `el i18n discrepa en ${k}`);
  }
});

test("comparación vacía y filas plenamente comparables se detectan", async () => {
  const { comparisonIsEmpty, comparableRowCount, compareRows } = await load(CMP);
  const none = [column({ slug: "a" }), column({ slug: "b" })];
  assert.equal(comparisonIsEmpty(none), true);
  const some = [column({ slug: "a", baseCm: 12, hasAnyValue: true }), column({ slug: "b" })];
  assert.equal(comparisonIsEmpty(some), false);
  assert.ok(comparableRowCount(compareRows(some)) >= 1, "la fila de procedencia tiene valor en ambas");
});

test("worstStatus elige el estado menos informativo", async () => {
  const { worstStatus } = await load(CMP);
  const mk = (key) => column({ status: { key, glyph: "?", labelKey: "x", depthUnknown: false, supportKey: null } });
  assert.equal(worstStatus([mk("open"), mk("blocked")]), "blocked");
  assert.equal(worstStatus([mk("open"), mk("open")]), "open");
  assert.equal(worstStatus([mk("closed"), mk("unknown")]), "unknown");
});
