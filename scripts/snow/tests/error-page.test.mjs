/**
 * Contrato verificable de la página de error (K1 / F21 / 07-ux-ui.md §11).
 *
 *   node --test --test-isolation=none scripts/snow/tests/error-page.test.mjs
 *
 * node:test + node:assert, sin levantar Angular (con Nx roto no hay build:
 * 00b C1). Comprueba el CONTRATO del código y del microcopy — lo único
 * comprobable sin navegador:
 *
 *   1. existe una ruta `**` y es la ÚLTIMA declarada;
 *   2. está en el nivel raíz, no dentro de los hijos de `admin`;
 *   3. el componente fija el 404 con RESPONSE_INIT y no rompe en navegador;
 *   4. no redirige (ni `redirectTo` ni navegación propia);
 *   5. el texto visible está en español y el título/descripción coinciden con
 *      el namespace `snow` de i18n;
 *   6. no inventa estaciones: las sugerencias las decide `suggestions.ts`
 *      (probado en `k1-copy.test.mjs`) y el componente sólo pinta lo que llega;
 *   7. accesibilidad mínima y cero color en línea.
 *
 * Los comentarios se eliminan antes de comprobar texto: no se renderizan, y
 * comprobarlos produjo falsos negativos en la primera versión de este test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ROUTES = join(ROOT, "web-ssr/src/app/app.routes.ts");
const COMPONENT = join(
  ROOT,
  "web-ssr/src/app/snow/pages/not-found/snow-not-found.component.ts"
);
const I18N = join(ROOT, "web-ssr/public/assets/i18n/snow/es.json");

const routesSrc = () => readFileSync(ROUTES, "utf8");
const componentSrc = () => readFileSync(COMPONENT, "utf8");

/** Quita comentarios de bloque y de línea sin tocar cadenas. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|[^:"'`])\/\/.*$/, "$1"))
    .join("\n");
}

/** Texto visible: el template del componente (de `template: \`` a `\`, styles`). */
function templateText(src) {
  const m = /template:\s*`([\s\S]*?)`\s*,\s*styles:/.exec(src);
  assert.ok(m, "no se localiza el template del componente");
  return m[1];
}

const norm = (s) => s.replace(/\s+/g, " ").trim();

test("app.routes.ts existe y termina con el catch-all (**)", () => {
  assert.ok(existsSync(ROUTES), "app.routes.ts no encontrado");
  const code = stripComments(routesSrc());
  const wildcards = [...code.matchAll(/path:\s*["']\*\*["']/g)];
  assert.equal(wildcards.length, 1, `se esperaba un único catch-all, hay ${wildcards.length}`);
  const after = code.slice(wildcards[0].index);
  const further = after.match(/path:\s*["'][^"']+["']\s*,/g) ?? [];
  assert.equal(further.length, 1, `después del catch-all hay más rutas: ${further.join(", ")}`);
});

test("el catch-all está en el nivel raíz, no dentro de los hijos de admin", () => {
  const code = stripComments(routesSrc());
  const adminAt = code.indexOf('path: "admin"');
  const wildcardAt = code.indexOf('path: "**"');
  assert.ok(adminAt > 0 && wildcardAt > adminAt, "orden de rutas inesperado");
  const between = code.slice(adminAt, wildcardAt);
  const tail = between.slice(between.lastIndexOf("],"));
  assert.match(
    tail,
    /^\],\s*\}\s*,?\s*\{\s*$/,
    `el catch-all debe ser una entrada del array raíz; cola: ${JSON.stringify(tail)}`
  );
});

test("el catch-all carga el componente bajo demanda", () => {
  const code = stripComments(routesSrc());
  const block = code.slice(code.indexOf('path: "**"'));
  assert.match(block, /snow\/pages\/not-found\/snow-not-found\.component/);
  assert.match(block, /SnowNotFoundComponent/);
});

test("el 404 se fija en servidor con RESPONSE_INIT y no rompe en navegador", () => {
  const code = stripComments(componentSrc());
  assert.match(code, /RESPONSE_INIT/);
  assert.match(
    code,
    /inject\(\s*RESPONSE_INIT\s*,\s*\{\s*optional:\s*true\s*\}\s*\)/,
    "RESPONSE_INIT debe ser opcional (en navegador vale null)"
  );
  assert.match(code, /responseInit\.status\s*=\s*404/);
  assert.match(code, /if\s*\(\s*this\.responseInit\s*\)/);
});

test("no redirige: un slug mal escrito se explica, no se manda a una lista", () => {
  const code = stripComments(componentSrc());
  assert.doesNotMatch(code, /redirectTo/);
  assert.doesNotMatch(code, /router\.navigate/);
  assert.doesNotMatch(code, /location\.(href|replace)\s*=/);
});

test("el microcopy visible está en español y coincide con el namespace snow", () => {
  assert.ok(existsSync(I18N), "falta web-ssr/public/assets/i18n/snow/es.json");
  const es = JSON.parse(readFileSync(I18N, "utf8"));
  const copy = es.snow.notFound;

  const visible = norm(templateText(componentSrc()));
  assert.ok(visible.includes(norm(copy.title)), "el <h1> no coincide con title");
  assert.ok(visible.includes(norm(copy.description)), "la descripción no coincide");
  for (const key of ["home", "explorer", "dashboard"]) {
    assert.ok(visible.includes(norm(copy[key])), `el template no contiene ${key} ("${copy[key]}")`);
  }
  for (const banned of ["Not Found", "Page not found", "Return home", "404 error", "Go back"]) {
    assert.ok(!visible.includes(banned), `texto en inglés en el 404: "${banned}"`);
  }
});

test("las sugerencias NO se escriben a mano: las decide suggestions.ts", () => {
  const src = componentSrc();
  assert.match(
    src,
    /client\/ui\/suggestions/,
    "el componente debe delegar en la función pura de sugerencias"
  );
  const visible = norm(templateText(src));
  assert.doesNotMatch(visible, /destacad|popular|recomendad/i);
  assert.match(visible, /noSuggestionsText\(\)/, "la frase debe venir de la lógica de estado");
});

test("accesibilidad mínima: un h1, destino #main, navegación etiquetada, glifo oculto", () => {
  const visible = templateText(componentSrc());
  const h1s = visible.match(/<h1[\s>]/g) ?? [];
  assert.equal(h1s.length, 1, `se esperaba un único <h1>, hay ${h1s.length}`);
  assert.match(visible, /<main id="main"/);
  assert.match(visible, /aria-label="Accesos alternativos"/);
  assert.match(visible, /aria-hidden="true"/);
  assert.doesNotMatch(visible, /<img|<iframe/, "un 404 no debe traer recursos de terceros");
});

test("sin color en línea ni background-color con hex (J3)", () => {
  const code = stripComments(componentSrc());
  assert.doesNotMatch(code, /style\s*=\s*["'][^"']*background/i);
  assert.doesNotMatch(code, /background-color\s*:\s*#/i);
});
