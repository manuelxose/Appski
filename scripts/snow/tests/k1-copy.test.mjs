/**
 * Contrato de la copia derivada de estado en la página de error (K1).
 *
 *   node scripts/snow/tests/build-client.mjs
 *   node node_modules/typescript/bin/tsc -p tmp/t6-k1/tsconfig.client.json
 *   node scripts/snow/tests/build-client.mjs     # extensión .js en los imports
 *   node --test --test-isolation=none scripts/snow/tests/k1-copy.test.mjs
 *
 * Lo que este fichero demuestra y el anterior no: que la frase «no ofrecemos
 * sugerencias» depende del estado real (¿falló la consulta? ¿hay partes?) y no
 * de una afirmación fija sobre el producto. La frase de la versión anterior
 * —«todavía no tenemos partes publicados»— dejaría de ser cierta el día que se
 * publique el primero, y el test de abajo la habría dejado pasar.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = join(ROOT, "tmp/t6-k1/snow-client");
const SUGG = "app/snow/client/ui/suggestions.js";

const COMPONENT = join(
  ROOT,
  "web-ssr/src/app/snow/pages/not-found/snow-not-found.component.ts"
);
const I18N = join(ROOT, "web-ssr/public/assets/i18n/snow/es.json");

const load = async () => {
  assert.ok(
    existsSync(join(OUT, SUGG)),
    "falta el JS compilado: `node scripts/snow/tests/build-client.mjs` + `node node_modules/typescript/bin/tsc -p tmp/t6-k1/tsconfig.client.json` + `node scripts/snow/tests/build-client.mjs`"
  );
  return import(pathToFileURL(join(OUT, SUGG)).href);
};

const st = (slug) => ({
  slug,
  name: slug.toUpperCase(),
  country: "ES",
  region: "Pirineo",
  lat: 42,
  lng: 0,
  altitudeBaseM: 1500,
  altitudeTopM: 2600,
  website: null,
  discipline: "alpine",
});

test("con partes publicados se OFRECEN estaciones (máximo 3)", async () => {
  const { suggestStations } = await load();
  const s = suggestStations(true, [st("a"), st("b"), st("c"), st("d")], null);
  assert.equal(s.kind, "list");
  assert.equal(s.stations.length, 3);
  assert.deepEqual(
    s.stations.map((x) => x.slug),
    ["a", "b", "c"]
  );
});

test("sin partes, el motivo es el que reporta el borde (no una frase fija)", async () => {
  const { suggestStations } = await load();
  for (const reason of [
    "outside-season",
    "source-silent",
    "not-yet-published",
    "not-covered",
    "license-prohibits",
  ]) {
    const s = suggestStations(true, [], reason);
    assert.equal(s.kind, "none");
    assert.equal(s.reason, reason);
  }
});

test("si la consulta falla se dice «reporting-failed», no se inventa un motivo", async () => {
  const { suggestStations } = await load();
  const s = suggestStations(false, [], "outside-season");
  assert.deepEqual(s, { kind: "none", reason: "reporting-failed" });
});

test("traducciones: cada motivo tiene frase y NINGUNA afirma una ausencia permanente", () => {
  const es = JSON.parse(readFileSync(I18N, "utf8"));
  const copy = es.snow.notFound.noSuggestions;
  const reasons = [
    "outside-season",
    "source-silent",
    "not-yet-published",
    "not-covered",
    "license-prohibits",
    "reporting-failed",
  ];
  for (const r of reasons) {
    assert.ok(typeof copy[r] === "string" && copy[r].length > 10, `falta la frase ${r}`);
    // Fechas absolutas o «todavía no tenemos» petrifican el estado: son frases
    // que se vuelven falsas. Ninguna traducción puede contenerlas.
    for (const bad of ["todavía no tenemos", "nunca", "no habrá", "no hay partes en la plataforma"]) {
      assert.ok(!copy[r].includes(bad), `la frase ${r} contiene «${bad}»: es una afirmación fija`);
    }
    assert.match(copy[r], /hoy|publicad|disponibles|permiten/, `${r} debe referirse al estado de hoy`);
  }
});

test("las frases del componente coinciden con el namespace i18n", () => {
  const es = JSON.parse(readFileSync(I18N, "utf8"));
  const copy = es.snow.notFound.noSuggestions;
  const src = readFileSync(COMPONENT, "utf8");
  for (const [reason, text] of Object.entries(copy)) {
    assert.ok(
      src.includes(text),
      `el componente no contiene la frase ${reason} del namespace i18n`
    );
  }
});

test("la página NO afirma que la plataforma no tiene partes (regresión de la K1 v1)", () => {
  const src = readFileSync(COMPONENT, "utf8");
  assert.ok(
    !src.includes("todavía no tenemos partes"),
    "volvió la frase fija que el capitán rechazó: el texto debe derivar de NoDataReason"
  );
});

test("la consulta de sugerencias pasa por el cliente tipado y admite fallo", () => {
  const src = readFileSync(COMPONENT, "utf8");
  // La URL ya no vive en el componente: está en el cliente tipado, que a su vez
  // se contrasta contra SNOW_ROUTES en `api-client.test.mjs`. Aquí se exige que
  // el componente pase por ese cliente y que trate el fallo de lectura.
  assert.match(
    src,
    /client\/snow-api\.service/,
    "el componente debe usar el cliente tipado del borde"
  );
  assert.doesNotMatch(src, /"\/api\/snow/, "la ruta del borde no se escribe en el componente");
  assert.match(src, /if\s*\(\s*!res\.ok\s*\)/, "debe tratar el fallo de lectura: un 404 no puede romperse");
  assert.doesNotMatch(src, /redirectTo/);
  assert.doesNotMatch(src, /router\.navigate/);
});
