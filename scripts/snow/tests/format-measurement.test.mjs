/**
 * Contrato del formateo de medidas (07-ux-ui.md §10.3, regla P1).
 *
 *   node scripts/snow/tests/build-client.mjs
 *   node node_modules/typescript/bin/tsc -p tmp/t6-k1/tsconfig.client.json
 *   node --test --test-isolation=none scripts/snow/tests/format-measurement.test.mjs
 *
 * Se ejecuta el JavaScript COMPILADO por el tsc del repo, no una copia a mano:
 * la prueba cubre el mismo código que typechequea el gate. Si el build no se ha
 * hecho, el test falla con el comando exacto que falta; no se salta en silencio.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = join(ROOT, "tmp/t6-k1/snow-client");
const MOD = (rel) => pathToFileURL(join(OUT, rel)).href;

const load = async (rel, hint) => {
  assert.ok(
    existsSync(join(OUT, rel)),
    `falta ${rel}: ejecuta \`node scripts/snow/tests/build-client.mjs\` y luego \`node node_modules/typescript/bin/tsc -p tmp/t6-k1/tsconfig.client.json\` (${hint})`
  );
  return import(MOD(rel));
};

const FMT = "app/snow/client/ui/format-measurement.js";

test("null / undefined / NaN / ±Infinity son ausencia, nunca 0", async () => {
  const { formatMeasurement } = await load(FMT, "format-measurement");
  for (const v of [null, undefined, Number.NaN, Infinity, -Infinity]) {
    assert.deepEqual(formatMeasurement(v, "cm"), { kind: "nodata" }, `valor ${String(v)}`);
  }
});

test("los centinelas heredados -1 y -99 (05b §3.2) son ausencia", async () => {
  const { formatMeasurement } = await load(FMT, "format-measurement");
  assert.deepEqual(formatMeasurement(-1, "cm"), { kind: "nodata" });
  assert.deepEqual(formatMeasurement(-99, "cm"), { kind: "nodata" });
  assert.deepEqual(formatMeasurement(-99.0, "km"), { kind: "nodata" });
});

test("un cero MEDIDO se pinta «0 cm»: es un dato, no una ausencia", async () => {
  const { formatMeasurement } = await load(FMT, "format-measurement");
  assert.deepEqual(formatMeasurement(0, "cm"), { kind: "value", text: "0 cm" });
});

test("formato es-ES: coma decimal, sin redondeo agresivo, punto de millar", async () => {
  const { formatMeasurement } = await load(FMT, "format-measurement");
  assert.equal(formatMeasurement(112.5, "km").text, "112,5 km");
  assert.equal(formatMeasurement(45.25, "cm").text, "45,3 cm");
  assert.equal(formatMeasurement(35, "%").text, "35%");
  assert.equal(formatMeasurement(2100, "m").text, "2.100 m");
});

test("hasMeasurement y formatMeasurement aplican la MISMA regla", async () => {
  const { hasMeasurement, formatMeasurement } = await load(FMT, "format-measurement");
  for (const v of [null, undefined, 0, -1, -99, 12, Number.NaN, Infinity, -0.5]) {
    const viaFormat = formatMeasurement(v, "cm").kind === "value";
    assert.equal(hasMeasurement(v), viaFormat, `divergen para ${String(v)}`);
  }
});

test("NINGÚN template de snow interpola una medida sin el pipe snowMeasure", () => {
  const dir = join(ROOT, "web-ssr/src/app/snow");
  const files = [];
  const rec = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) rec(p);
      else if (/\.(ts|html)$/.test(p)) files.push(p);
    }
  };
  rec(dir);

  const measureFields =
    "baseCm|midCm|topCm|newSnow24hCm|liftsOpen|liftsTotal|pistesOpen|pistesTotal|kmOpen|kmTotal|altitudeBaseM|altitudeTopM";
  const offenders = [];
  for (const f of files) {
    const src = readFileSync(f, "utf8");
    // Sólo cuenta lo que se RENDERIZA: las interpolaciones `{{ … }}` del template.
    for (const m of src.matchAll(/\{\{([^}]*)\}\}/g)) {
      const expr = m[1];
      if (!new RegExp(`\\.(${measureFields})\\b`).test(expr)) continue;
      if (/\|\s*snowMeasure\b/.test(expr)) continue;
      offenders.push(`${f.slice(ROOT.length + 1)}: {{${expr.trim()}}}`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `interpolación de medida sin el pipe snowMeasure:\n${offenders.join("\n")}`
  );
});

test("el pipe snowMeasure no puede devolver «undefined» ni cadena vacía", async () => {
  const { SnowMeasurePipe } = await load("app/snow/client/ui/snow-measure.pipe.js", "pipe");
  const pipe = new SnowMeasurePipe();
  // Se llama al transform directamente: no hay DI implicada en el pipe.
  const cases = [
    [null, "cm", "FA"],
    [42, "cm", "FA"],
    [-99, "km", "FA"],
    [0, "cm", "FA"],
  ];
  for (const [v, unit, fallback] of cases) {
    const out = pipe.transform(v, unit, fallback);
    assert.equal(typeof out, "string");
    assert.notEqual(out, "", `salida vacía para ${String(v)}`);
    assert.notEqual(out, "undefined");
    assert.notEqual(out, "null");
    if (v === null || v === -99) assert.equal(out, fallback, `la ausencia debe usar el texto i18n`);
  }
});
