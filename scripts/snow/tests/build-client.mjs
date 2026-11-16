/**
 * Compila el código cliente de snow/* a ESM en `tmp/t6-k1/snow-client/` para
 * que los tests de `scripts/snow/tests/**` puedan IMPORTARLO y ejecutarlo de
 * verdad. Sin dependencias nuevas: usa el TypeScript del repo.
 *
 *   node scripts/snow/tests/build-client.mjs
 *
 * Emite `web-ssr/src/app/snow/client/ui/*.ts` + `web-ssr/src/app/snow/models/*.ts`
 * (funciones puras; los tipos se borran). NO compila nada de
 * `web-ssr/src/snow/**`: ese carril lo escribe otro agente.
 *
 * Limitación del entorno (medida, no supuesta): en este sandbox Node NO puede
 * lanzar procesos hijos (`spawnSync(...)` devuelve `EPERM`). Por eso este script
 * no invoca al tsc: genera la configuración con rutas ABSOLUTAS y la imprime.
 * Quien lo ejecute (CI, o un agente con pwsh) corre el comando del tsc después.
 * Un `spawn` que falla en silencio sería peor que no intentarlo.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
// Tres niveles desde `scripts/snow/tests/` => raíz del repo (`appski`).
const ROOT = resolve(HERE, "../../..");
const SRC = join(ROOT, "web-ssr/src");
const TMP = join(ROOT, "tmp/t6-k1");
const OUT = join(TMP, "snow-client");
const CFG = join(TMP, "tsconfig.client.json");
const TSC = join(ROOT, "node_modules/typescript/bin/tsc");

const posix = (p) => p.replace(/\\/g, "/");

if (!posix(ROOT).endsWith("/appski")) {
  console.error(`build-client: raíz sospechosa (${ROOT}); se esperaba terminar en /appski`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(
  CFG,
  JSON.stringify(
    {
      compilerOptions: {
        target: "es2022",
        module: "es2022",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
        noEmitOnError: true,
        outDir: posix(OUT),
        rootDir: posix(SRC),
      },
      // Rutas absolutas: los `include` relativos desde tmp/ ya fallaron en una
      // versión anterior de este script y no merece la pena reintentarlo.
      include: [
        posix(join(SRC, "app/snow/client/ui")) + "/*.ts",
        posix(join(SRC, "app/snow/models")) + "/*.ts",
      ],
    },
    null,
    2
  )
);

console.log("build-client: configuración escrita (sin ejecutar tsc: este entorno no permite spawn)");
console.log(`  config: ${posix(relative(ROOT, CFG))}`);
console.log(`  salida: ${posix(relative(ROOT, OUT))}`);
console.log("  ejecuta ahora:");
console.log(`    node ${posix(relative(ROOT, TSC))} -p ${posix(relative(ROOT, CFG))}`);
console.log("");
console.log("  OJO — paso que NO es cosmético:");
console.log("  tsc emite `from \"./format-measurement\"` (sin extensión), que es válido en");
console.log("  bundlers pero NO en ESM de Node: los tests fallarían con ERR_MODULE_NOT_FOUND.");
console.log("  Este script hace ese arreglo por ti si detecta la salida ya compilada.");

/**
 * Reescribe los imports relativos sin extensión de la salida compilada a `.js`.
 * No toca el código fuente: es un arreglo del ARTEFACTO de prueba, y se deja
 * explícito porque es la diferencia entre «7 tests pasan» y «1 test pasa».
 */
const jsFiles = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (p.endsWith(".js")) jsFiles.push(p);
  }
};
if (existsSync(OUT)) {
  walk(OUT);
  let patched = 0;
  for (const f of jsFiles) {
    const before = readFileSync(f, "utf8");
    const after = before.replace(
      /(from\s+")\.\/([A-Za-z0-9_\-]+)(")/g,
      (full, a, spec, b) => (spec.endsWith(".js") ? full : `${a}./${spec}.js${b}`)
    );
    if (after !== before) {
      writeFileSync(f, after);
      patched++;
    }
  }
  if (patched) console.log(`build-client: ${patched} import(s) compilados con extensión .js (para ESM de Node)`);
  else if (jsFiles.length) console.log("build-client: ningún import relativo necesitaba extensión");
  void statSync;
}
