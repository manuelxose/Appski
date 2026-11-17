/**
 * Contrato de las PANTALLAS A–G del módulo nieve (`nieve/*`).
 *
 *   node --test --test-isolation=none scripts/snow/tests/screens.test.mjs
 *
 * Con Nx roto (00b C1) no hay build ni navegador: no se puede renderizar un
 * componente. Lo que SÍ se puede comprobar, y se comprueba aquí de forma
 * mecánica:
 *
 *  1. cada pantalla existe, está enrutada bajo `nieve/*` y carga en diferido;
 *  2. el catch-all `**` sigue siendo el ÚLTIMO (la 404 no se ha comido rutas);
 *  3. **ninguna medida se interpola sin `| snowMeasure`** en ninguna plantilla;
 *  4. ningún estado se comunica sólo con color: cada badge pinta glifo + palabra;
 *  5. las siete etiquetas de estado y las cinco frases canónicas coinciden con
 *     el namespace `snow` de `es.json` (los literales no divergen del origen);
 *  6. ninguna pantalla introduce `ngx-translate` (decisión del capitán);
 *  7. cada pantalla declara sus tres breakpoints;
 *  8. no hay `img`/`iframe` de terceros ni endpoints de teselas prohibidos.
 *
 * Esto NO sustituye una prueba en navegador: el 404 en el cable, el zoom al
 * 200 %, el orden de foco y las Core Web Vitals siguen UNVERIFIED.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SNOW = join(ROOT, "web-ssr/src/app/snow");
const ROUTES = join(ROOT, "web-ssr/src/app/app.routes.ts");
const I18N = join(ROOT, "web-ssr/public/assets/i18n/snow/es.json");

const read = (p) => readFileSync(p, "utf8");
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/(^|[^:"'`])\/\/.*$/, "$1"))
    .join("\n");

function snowFiles() {
  const out = [];
  const rec = (d) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) rec(p);
      else if (/\.(ts|html)$/.test(p)) out.push(p);
    }
  };
  rec(SNOW);
  return out;
}

const rel = (p) => p.slice(ROOT.length + 1);

const SCREENS = [
  { id: "A", route: "nieve", file: "pages/dashboard/snow-dashboard.component.ts", name: "Panel" },
  { id: "B", route: "nieve/estaciones", file: "pages/explorer/snow-explorer.component.ts", name: "Exploradora" },
  { id: "C", route: "nieve/estaciones/:slug", file: "pages/station/snow-station-detail.component.ts", name: "Detalle" },
  { id: "G", route: "nieve/comparar", file: "pages/compare/snow-compare.component.ts", name: "Comparador" },
  { id: "D", route: "nieve/webcams", file: "pages/webcams/snow-webcams.component.ts", name: "Webcams" },
  { id: "F", route: "nieve/mapa", file: "pages/map/snow-map.component.ts", name: "Mapa" },
];

/* ------------------------------ 1. rutas ------------------------------ */

test("las seis pantallas existen y están enrutadas bajo nieve/*", () => {
  const routes = stripComments(read(ROUTES));
  for (const s of SCREENS) {
    assert.ok(existsSync(join(SNOW, s.file)), `falta ${s.file}`);
    const seg = s.route === "nieve" ? 'path: ""' : `path: "${s.route.split("/").slice(1).join("/")}"`;
    assert.ok(routes.includes(seg), `la ruta ${s.route} no está declarada (buscaba ${seg})`);
    const comp = s.file.replace("pages/", "").replace(/\.component\.ts$/, ".component");
    assert.ok(
      routes.includes(`./snow/pages/${comp}`),
      `la ruta ${s.route} no carga ${s.file} en diferido`
    );
  }
});

test("la ruta raíz `/` NO se ha sustituido (decisión U1) y `/estaciones` sigue intacta (U4)", () => {
  const routes = stripComments(read(ROUTES));
  assert.match(routes, /path: "",\s*loadComponent: \(\) => import\("\.\/pages\/home\/home"\)/, "la home sigue siendo la existente");
  assert.match(routes, /path: "estaciones",\s*loadComponent: \(\) =>\s*import\("\.\/pages\/stations-list/, "/estaciones sigue siendo stations-list");
  assert.ok(!routes.includes('path: "nieve/estaciones"'), "el módulo nieve no debe secuestrar /estaciones");
});

test("el catch-all ** sigue siendo la ÚLTIMA ruta", () => {
  const routes = stripComments(read(ROUTES));
  const i = routes.indexOf('path: "**"');
  assert.ok(i > 0, "no hay catch-all");
  const after = routes.slice(i);
  const more = after.match(/path:\s*["'][^"']+["']\s*,/g) ?? [];
  assert.equal(more.length, 1, `hay rutas después del catch-all: ${more.join(", ")}`);
});

/* ---------------------- 2. medidas y estados ---------------------- */

test("NINGUNA medida se interpola sin | snowMeasure en ninguna plantilla de snow", () => {
  const fields =
    "baseCm|midCm|topCm|newSnow24hCm|liftsOpen|liftsTotal|pistesOpen|pistesTotal|kmOpen|kmTotal|altitudeBaseM|altitudeTopM";
  const offenders = [];
  for (const f of snowFiles()) {
    const src = read(f);
    for (const m of src.matchAll(/\{\{([^}]*)\}\}/g)) {
      const expr = m[1];
      if (!new RegExp(`\\.(${fields})\\b`).test(expr)) continue;
      if (/\|\s*snowMeasure\b/.test(expr)) continue;
      // El componente `app-snow-measure` recibe el valor por input, no interpola.
      offenders.push(`${rel(f)}: {{${expr.trim()}}}`);
    }
  }
  assert.deepEqual(offenders, [], `medidas interpoladas sin el pipe:\n${offenders.join("\n")}`);
});

test("el badge de estado pinta SIEMPRE glifo y palabra (SC 1.4.1)", () => {
  const src = stripComments(read(join(SNOW, "client/ui/status-badge.component.ts")));
  assert.match(src, /aria-hidden="true">\{\{ status\(\)\.glyph \}\}/, "falta el glifo visible");
  assert.match(src, /\{\{ label\(\) \}\}/, "falta la palabra visible");
  assert.match(src, /aria-label/, "falta el nombre accesible");
  for (const word of ["Abierta", "Cerrada", "Sin datos", "No disponible"]) {
    assert.ok(src.includes(word), `el mapa de etiquetas no incluye «${word}»`);
  }
});

test("los estados de pantalla cubren los siete y no pintan valores fuera de ready/stale", () => {
  const src = stripComments(read(join(SNOW, "client/ui/screen-state.ts")));
  for (const s of ["loading", "ready", "stale", "nodata", "blocked", "error", "not_configured"]) {
    assert.ok(src.includes(`"${s}"`), `falta el estado ${s}`);
  }
  assert.match(src, /export function hasValues[\s\S]{0,120}ready[\s\S]{0,60}stale/);
});

test("la ausencia se pinta con frase canónica, nunca con 0", () => {
  const nod = stripComments(read(join(SNOW, "client/ui/nodata.component.ts")));
  assert.match(nod, /\{\{ text\(\) \}\}/);
  assert.ok(!/0\s*cm/.test(nod), "el bloque de ausencia no puede contener un valor 0");
  const state = stripComments(read(join(SNOW, "client/ui/station-state.component.ts")));
  assert.match(state, /REASON_TEXT\[publicReason/);
});

/* ---------------------- 3. literales vs i18n ---------------------- */

test("las etiquetas de estado coinciden con snow.status.<key>.label de es.json", () => {
  const es = JSON.parse(read(I18N));
  const badge = read(join(SNOW, "client/ui/status-badge.component.ts"));
  const map = { open: "Abierta", closed: "Cerrada", unknown: "Sin datos", blocked: "No disponible" };
  for (const [k, v] of Object.entries(map)) {
    assert.equal(es.snow.status[k].label, v, `divergen en ${k}`);
    assert.ok(badge.includes(`"${v}"`), `el badge no contiene «${v}»`);
  }
});

test("las cinco frases canónicas coinciden entre código, i18n y es.json", () => {
  const es = JSON.parse(read(I18N));
  const src = read(join(SNOW, "client/ui/screen-state.ts"));
  const expected = {
    "outside-season": "Temporada cerrada — sin parte publicado",
    "source-silent": "La estación no ha publicado parte hoy",
    "not-yet-published": "Pendiente de publicación por la fuente",
    "not-covered": "Sin cobertura de datos para esta estación",
    "license-prohibits": "No disponible por condiciones de uso de la fuente",
  };
  for (const [k, v] of Object.entries(expected)) {
    assert.ok(src.includes(v), `el código no contiene la frase ${k}`);
    assert.equal(es.snow.reason[k], v, `es.json discrepa en ${k}`);
  }
});

test("las pantallas no introducen ngx-translate (decisión del capitán)", () => {
  for (const f of snowFiles()) {
    const src = read(f);
    assert.ok(!/ngx-translate/.test(src), `${rel(f)} introduce ngx-translate`);
  }
});

/* ---------------------- 4. layout y recursos ---------------------- */

test("cada pantalla declara los tres breakpoints (1023 y 767)", () => {
  for (const s of SCREENS) {
    const src = read(join(SNOW, s.file));
    assert.match(src, /max-width:\s*1023px/, `${s.id}: falta el breakpoint de tablet`);
    assert.match(src, /max-width:\s*767px/, `${s.id}: falta el breakpoint de móvil`);
  }
});

test("ninguna pantalla incrusta imágenes ni iframes de terceros (F09/D)", () => {
  for (const f of snowFiles()) {
    const src = stripComments(read(f));
    assert.ok(!/<img\b/i.test(src), `${rel(f)} usa <img>`);
    assert.ok(!/<iframe\b/i.test(src), `${rel(f)} usa <iframe>`);
  }
});

test("no se citan endpoints de teselas prohibidos (05 §2.10)", () => {
  for (const f of snowFiles()) {
    const src = stripComments(read(f));
    for (const bad of ["tile.openstreetmap.org", "maptiler.com", "stadiamaps.com"]) {
      assert.ok(!src.includes(bad), `${rel(f)} cita ${bad}`);
    }
  }
});

test("el mapa declara el estado honesto sin capa base", () => {
  const src = read(join(SNOW, "pages/map/snow-map.component.ts"));
  assert.match(src, /Sin capa base configurada/);
  assert.match(src, /© OpenStreetMap contributors/);
});

test("la exploradora es una <table> semántica con caption y scope (SC 1.3.1)", () => {
  const src = read(join(SNOW, "pages/explorer/snow-explorer.component.ts"));
  assert.match(src, /<table/);
  assert.match(src, /<caption/);
  assert.match(src, /scope="col"/);
  assert.match(src, /scope="row"/);
  assert.match(src, /aria-sort/);
});

test("cada pantalla tiene un único <h1> y un destino #main", () => {
  for (const s of SCREENS) {
    const src = read(join(SNOW, s.file));
    const h1 = src.match(/<h1[\s>]/g) ?? [];
    assert.equal(h1.length, 1, `${s.id}: ${h1.length} <h1>`);
    assert.match(src, /id="main"/, `${s.id}: falta el destino del skip-link`);
  }
});
