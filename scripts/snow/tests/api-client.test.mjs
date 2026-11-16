/**
 * El cliente no puede inventarse el borde.
 *
 *   node --test --test-isolation=none scripts/snow/tests/api-client.test.mjs
 *
 * Este test compara `web-ssr/src/app/snow/client/snow-endpoints.ts` (lo que el
 * frontend cree que existe) con `SNOW_ROUTES` de
 * `web-ssr/src/snow/server/snow.routes.ts` (lo que el backend sirve de verdad).
 * Si el backend renombra, mueve o elimina una ruta, esto falla aquí y no en
 * producción con un 404 silencioso.
 *
 * No levanta Angular ni Express: es análisis de fuente. La razón es explícita —
 * en este sandbox Node no puede lanzar procesos (EPERM) y el entorno de test no
 * puede importar `.ts` con imports sin extensión (`ERR_MODULE_NOT_FOUND`), así
 * que este contrato se comprueba leyendo, no ejecutando.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const ROUTES_SRC = join(ROOT, "web-ssr/src/snow/server/snow.routes.ts");
const CLIENT_SRC = join(ROOT, "web-ssr/src/app/snow/client/snow-endpoints.ts");

/** Devuelve el fuente SIN comentarios: los comentarios no son contrato. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .map((line) => line.replace(/(^|[^:"'`])\/\/.*$/, "$1"))
    .join("\n");
}

/** Rutas del backend: `{ method, path, admin }` extraídas del array SNOW_ROUTES. */
function backendRoutes() {
  const src = stripComments(readFileSync(ROUTES_SRC, "utf8"));
  const start = src.indexOf("export const SNOW_ROUTES");
  assert.ok(start > 0, "no se encuentra SNOW_ROUTES en el backend");
  const body = src.slice(start);
  const out = [];
  for (const m of body.matchAll(/method:\s*'(GET|POST)',[\s\S]{0,400}?expectedNoCredential:\s*'([a-z_]+)'/g)) {
    const block = m[0];
    const path = /path:\s*'([^']+)'/.exec(block)?.[1];
    const admin = /admin:\s*(true|false)/.exec(block)?.[1] === "true";
    if (path) out.push({ method: m[1], path, admin, expectedNoCredential: m[2] });
  }
  assert.ok(out.length >= 8, `se esperaban al menos 8 rutas, se leyeron ${out.length}`);
  return out;
}

/** Rutas del cliente: los literales "/api/snow/v1/..." del módulo, sin comentarios. */
function clientPaths() {
  const src = stripComments(readFileSync(CLIENT_SRC, "utf8"));
  // Acepta literales y plantillas: `/…/${encodeURIComponent(slug)}` cuenta.
  return [...src.matchAll(/[`"](\/api\/snow\/v1\/[^`"]*)[`"]/g)].map((m) => m[1]);
}

/** Normaliza una plantilla del cliente (`${slug}`) al patrón del backend (`:slug`). */
const normalize = (p) =>
  p.replace(/\/api\/snow/g, "").replace(/\?.*$/, "").replace(/\$\{encodeURIComponent\(slug\)\}/g, ":slug");

test("existen las constantes del borde y el servicio que las usa", () => {
  const client = readFileSync(CLIENT_SRC, "utf8");
  assert.match(client, /export const SNOW_ENDPOINTS/);
  const service = readFileSync(join(ROOT, "web-ssr/src/app/snow/client/snow-api.service.ts"), "utf8");
  assert.match(service, /SNOW_ENDPOINTS\./);
});

test("TODA ruta del cliente existe en SNOW_ROUTES (ninguna inventada)", () => {
  const backend = new Set(backendRoutes().filter((r) => r.method === "GET").map((r) => r.path));
  const invented = [];
  for (const p of clientPaths()) {
    const norm = normalize(p);
    if (!backend.has(norm)) invented.push(`${p}  (normalizada: ${norm})`);
  }
  assert.deepEqual(invented, [], `rutas del cliente que el backend no declara:\n${invented.join("\n")}`);
});

test("las rutas públicas que la UI necesita están cubiertas", () => {
  const clientPathsSet = new Set(clientPaths().map(normalize));
  const required = [
    "/v1/stations",
    "/v1/stations/:slug",
    "/v1/stations/:slug/report",
    "/v1/stations/:slug/forecast",
    "/v1/stations/:slug/webcams",
    "/v1/rankings/nieve",
    "/v1/rankings/km",
    "/v1/season-dates",
    "/v1/search",
  ];
  const missing = required.filter((r) => !clientPathsSet.has(r));
  assert.deepEqual(missing, [], `el cliente no expone: ${missing.join(", ")}`);
});

test("el cliente NO llama a rutas de administración", () => {
  const adminPaths = new Set(
    backendRoutes()
      .filter((r) => r.admin)
      .map((r) => r.path)
  );
  const violations = clientPaths().map(normalize).filter((p) => adminPaths.has(p) || p.startsWith("/v1/admin"));
  assert.deepEqual(violations, [], `el cliente público toca rutas admin: ${violations.join(", ")}`);
});

test("los estados esperados sin credencial encajan con la matriz §7.7", () => {
  const backend = backendRoutes();
  const byPath = Object.fromEntries(backend.filter((r) => r.method === "GET").map((r) => [r.path, r]));
  assert.equal(byPath["/v1/stations/:slug/report"].expectedNoCredential, "no_data");
  assert.equal(byPath["/v1/stations/:slug/forecast"].expectedNoCredential, "not_configured");
  assert.equal(byPath["/v1/stations/:slug/webcams"].expectedNoCredential, "blocked");
  assert.equal(byPath["/v1/stations"].expectedNoCredential, "ok");
});

test("classifyHttp: 2xx es lectura válida aunque el cuerpo indique ausencia de dato", () => {
  const src = stripComments(readFileSync(CLIENT_SRC, "utf8"));
  // La función es pura respecto del código HTTP: se aísla su cuerpo y se
  // comprueba que no menciona ningún estado de DATO (eso lo decide el DTO).
  const fnStart = src.indexOf("export function classifyHttp");
  assert.ok(fnStart > 0, "no se encuentra classifyHttp");
  const fnBody = src.slice(fnStart, src.indexOf("\n}", fnStart));
  // Regla única y explícita, comprobada sobre el código, sin ejecutar Angular.
  assert.match(fnBody, /if \(httpStatus === null\) return \{ ok: false, kind: "network"/);
  assert.match(fnBody, /if \(httpStatus === 404\) return \{ ok: false, kind: "not-found"/);
  assert.match(fnBody, /if \(httpStatus >= 500\) return \{ ok: false, kind: "server"/);
  assert.match(fnBody, /return \{ ok: true \};/);
  // Y no debe mirar el cuerpo para decidir: ningún estado de DATO en la función.
  assert.doesNotMatch(
    fnBody,
    /no_data|not_configured|blocked/,
    "la clasificación HTTP no debe depender del estado de dato"
  );
});
