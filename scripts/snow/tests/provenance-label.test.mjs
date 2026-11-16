/**
 * Contrato F1: procedencia editorial en pantalla (05b §7.3).
 *
 *   node scripts/snow/tests/build-client.mjs
 *   node node_modules/typescript/bin/tsc -p tmp/t6-k1/tsconfig.client.json
 *   node scripts/snow/tests/build-client.mjs     # extensión .js en imports
 *   node --test --test-isolation=none scripts/snow/tests/provenance-label.test.mjs
 *
 * Lo que se demuestra aquí, y no en un comentario:
 *   - un dato editorial NO se rotula con la licencia de un proveedor bloqueado;
 *   - el texto del operador no se copia: hay etiqueta + enlace;
 *   - `sourceUrl` sólo se enlaza si es http(s) (nada de `javascript:`);
 *   - sin campos editoriales, la etiqueta oficial usa la atribución del backend;
 *   - la ausencia usa las cinco frases canónicas, no frases inventadas.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = join(ROOT, "tmp/t6-k1/snow-client");
const MOD = "app/snow/client/ui/provenance-label.js";

const load = async () => {
  assert.ok(
    existsSync(join(OUT, MOD)),
    "falta el JS compilado: build-client.mjs + tsc -p tmp/t6-k1/tsconfig.client.json + build-client.mjs"
  );
  return import(pathToFileURL(join(OUT, MOD)).href);
};

const prov = (over = {}) => ({
  source: "editorial-report",
  observedAt: "2026-11-16T10:00:00.000Z",
  updatedAt: null,
  status: "live",
  licenseStatus: "allowed",
  freshness: 600,
  authorization: {
    registryRef: "05#editorial-report",
    licenseId: "proprietary",
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: false,
  },
  attribution: null,
  ...over,
});

const editorial = {
  sourceUrl: "https://www.aramon.com/parte",
  author: "operador-1",
  capturedAt: "2026-11-16T12:00:00.000Z",
  confidence: 0.9,
};

test("editorial: etiqueta + enlace, y NO se copia texto del operador", async () => {
  const { provenanceLabel } = await load();
  const l = provenanceLabel(prov(), editorial);
  assert.equal(l.role, "editorial");
  assert.match(l.text, /^Parte de estación · fuente: operador-1$/);
  assert.equal(l.href, "https://www.aramon.com/parte");
  assert.equal(l.attribution, null, "un dato editorial no lleva atribución de tercero");
});

test("editorial sin autor: etiqueta genérica, nunca vacía ni «undefined»", async () => {
  const { provenanceLabel } = await load();
  for (const author of [undefined, "", "   "]) {
    const l = provenanceLabel(prov(), { ...editorial, author });
    assert.equal(l.text, "Parte de estación · fuente: operador");
    assert.ok(!/undefined|null/.test(l.text));
  }
});

test("el dato editorial NO hereda la licencia del proveedor bloqueado", async () => {
  const { provenanceLabel } = await load();
  // Caso real del producto: estado/espesores vienen sólo del editorial, mientras
  // la cadena de proveedores está bloqueada para ese tipo de dato.
  const l = provenanceLabel(
    prov({ source: "editorial-report", licenseStatus: "allowed" }),
    editorial
  );
  assert.equal(l.role, "editorial");
  assert.doesNotMatch(l.text, /licencia|bloquead|prohibid/i);
  assert.equal(l.attribution, null);
});

test("sourceUrl insegura no se convierte en enlace", async () => {
  const { provenanceLabel, isSafeHref } = await load();
  for (const bad of [
    "javascript:alert(1)",
    "data:text/html,<script>",
    "https://evil.example/<script>",
    " ",
    "",
    undefined,
  ]) {
    assert.equal(isSafeHref(bad), false, `debería rechazar ${String(bad)}`);
    const l = provenanceLabel(prov(), { ...editorial, sourceUrl: bad });
    assert.equal(l.href, null, `no debe enlazar ${String(bad)}`);
  }
  assert.equal(isSafeHref("https://ok.example/p"), true);
  assert.equal(isSafeHref("http://ok.example/p"), true);
});

test("oficial: se usa la atribución pre-interpolada del backend", async () => {
  const { provenanceLabel } = await load();
  const l = provenanceLabel(
    prov({
      source: "aemet",
      licenseStatus: "allowed-with-attribution",
      attribution: "Información elaborada por AEMET",
    })
  );
  assert.equal(l.role, "official");
  assert.equal(l.text, "Información elaborada por AEMET");
  assert.equal(l.attribution, "Información elaborada por AEMET");
  assert.equal(l.href, null);
});

test("oficial sin texto de atribución: cae al identificador, no inventa frase", async () => {
  const { provenanceLabel } = await load();
  const l = provenanceLabel(prov({ source: "meteofrance", attribution: null }));
  assert.equal(l.text, "meteofrance");
});

test("ausencia: usa la frase canónica de la razón, no una inventada", async () => {
  const { provenanceLabel, REASON_TEXT } = await load();
  const reasons = [
    "outside-season",
    "source-silent",
    "not-yet-published",
    "not-covered",
    "license-prohibits",
  ];
  for (const r of reasons) {
    const l = provenanceLabel(prov({ licenseStatus: "blocked" }), {}, r);
    assert.equal(l.role, "absent");
    assert.equal(l.text, REASON_TEXT[r], `frase canónica de ${r}`);
  }
});

test("las cinco frases coinciden literalmente con 05b §3.2 y con el i18n", async () => {
  const { REASON_TEXT } = await load();
  const expected = {
    "outside-season": "Temporada cerrada — sin parte publicado",
    "source-silent": "La estación no ha publicado parte hoy",
    "not-yet-published": "Pendiente de publicación por la fuente",
    "not-covered": "Sin cobertura de datos para esta estación",
    "license-prohibits": "No disponible por condiciones de uso de la fuente",
  };
  assert.deepEqual({ ...REASON_TEXT }, expected);

  const { readFileSync } = await import("node:fs");
  const es = JSON.parse(
    readFileSync(join(ROOT, "web-ssr/public/assets/i18n/snow/es.json"), "utf8")
  );
  for (const [k, v] of Object.entries(expected)) {
    assert.equal(es.snow.reason[k], v, `el namespace i18n debe coincidir para ${k}`);
  }
});
