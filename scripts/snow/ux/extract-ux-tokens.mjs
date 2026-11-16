#!/usr/bin/env node
/**
 * extract-ux-tokens.mjs — contrato de tokens entre docs/snow/07-ux-ui.md y
 * web-ssr/src/styles.css.
 *
 * Sin dependencias. Uso:
 *   node scripts/snow/ux/extract-ux-tokens.mjs          # veredicto
 *   node scripts/snow/ux/extract-ux-tokens.mjs --emit   # imprime CSS para t8
 *
 * Comprueba de verdad:
 *   1. Parsea la tabla de tokens del documento (| `--token` | `#rrggbb` | `alias` | rol |).
 *   2. UDOM_EXPECTED (lista blanca de este archivo) y la tabla deben coincidir
 *      EXACTAMENTE en los dos sentidos: ni tokens inventados por el documento,
 *      ni tokens prometidos y no entregados.
 *   3. Todo alias `--sistema` citado debe existir en styles.css con EL MISMO
 *      valor (normalizado a minúsculas). Si el sistema cambia un color, el
 *      alias del documento miente y esta herramienta falla.
 *   4. Ningún `--ux-*` del documento puede existir ya en styles.css.
 *   5. --emit imprime el bloque :root listo para snow/client/ux-tokens.css,
 *      derivado del documento (no escrito a mano).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const DOC = resolve(ROOT, "docs/snow/07-ux-ui.md");
const STYLES = resolve(ROOT, "web-ssr/src/styles.css");
const EMIT = process.argv.includes("--emit");

/** Contrato mínimo: todo token que t8 espera encontrar. Se amplía aquí Y en el doc. */
const UDOM_EXPECTED = [
  "--ux-bg", "--ux-surface", "--ux-surface-alt", "--ux-surface-sunken",
  "--ux-text", "--ux-text-muted", "--ux-border", "--ux-border-strong",
  "--ux-link", "--ux-focus", "--ux-focus-on-primary", "--ux-on-primary",
  "--ux-state-open-bg", "--ux-state-closed-bg", "--ux-state-unknown-bg",
  "--ux-provenance-editorial-bg", "--ux-provenance-official-bg", "--ux-provenance-official-fg",
  "--ux-stale-bg", "--ux-stale-fg", "--ux-nodata-bg", "--ux-error-bg", "--ux-error-fg",
  "--ux-blocked-bg",
  "--ux-ava-1-bg", "--ux-ava-1-fg", "--ux-ava-2-bg", "--ux-ava-2-fg", "--ux-ava-3-bg",
  "--ux-ava-3-fg", "--ux-ava-4-bg", "--ux-ava-4-fg", "--ux-ava-5-bg", "--ux-ava-5-fg",
  "--ux-dark-bg", "--ux-dark-surface", "--ux-dark-surface-alt", "--ux-dark-text",
  "--ux-dark-text-muted", "--ux-dark-border", "--ux-dark-link", "--ux-dark-focus",
  "--ux-dark-provenance-editorial-bg", "--ux-dark-provenance-editorial-fg",
  "--ux-dark-stale-bg", "--ux-dark-stale-fg", "--ux-dark-nodata-bg", "--ux-dark-nodata-fg",
  "--ux-dark-blocked-bg", "--ux-dark-blocked-fg",
];

/**
 * Tokens del `:root` BASE de styles.css.
 *
 * Ojo (hallazgo real, no adorno): `styles.css` redefine `--neutral-50`… `--neutral-950`
 * dentro de `@media (prefers-color-scheme: dark)`. Un parseo ingenuo de todo el
 * fichero se queda con los valores OSCUROS y cree que `--neutral-50` es `#0a0a0a`.
 * Eso es exactamente lo que pasó en la primera ejecución de esta herramienta
 * (20 falsos FAIL). Aquí se corta el fichero en el bloque oscuro y se lee solo
 * el `:root` light, que es el que documenta la tabla.
 */
function parseBaseRootTokens(css) {
  const darkAt = css.indexOf("/* ===== DARK MODE ===== */");
  const light = darkAt > 0 ? css.slice(0, darkAt) : css;
  const out = new Map();
  for (const line of light.split(/\r?\n/)) {
    const m = /^\s*(--[a-z0-9-]+)\s*:\s*(#[0-9a-f]{6})\s*;/.exec(line);
    if (m) out.set(m[1], m[2].toLowerCase());
  }
  return out;
}

const docRaw = readFileSync(DOC, "utf8");
const cssRaw = readFileSync(STYLES, "utf8");

const docTokens = new Map();
for (const line of docRaw.split(/\r?\n/)) {
  const m = /^\s*\|\s*`(--ux-[a-z0-9-]+)`\s*\|\s*`(#[0-9a-f]{6})`\s*\|\s*(`--[a-z0-9-]+`|—)/.exec(line);
  if (m) docTokens.set(m[1], { value: m[2].toLowerCase(), alias: m[3].replace(/`/g, "") });
}

const cssTokens = parseBaseRootTokens(cssRaw);

const failures = [];

for (const [name, { value, alias }] of docTokens) {
  if (!UDOM_EXPECTED.includes(name)) failures.push(`token ${name} no está en UDOM_EXPECTED (token inventado o lista desactualizada)`);
  if (cssTokens.has(name)) failures.push(`token ${name} ya existe en styles.css (colisión con el sistema)`);
  if (alias !== "—") {
    const system = cssTokens.get(alias);
    if (!system) failures.push(`${name}: el alias ${alias} no existe en styles.css`);
    else if (system !== value) failures.push(`${name}: alias ${alias} vale ${system} en styles.css pero el documento dice ${value}`);
  }
}
for (const name of UDOM_EXPECTED) {
  if (!docTokens.has(name)) failures.push(`${name} se promete en UDOM_EXPECTED y no aparece en la tabla del documento`);
}

let aliasChecked = 0;
for (const [, { alias }] of docTokens) if (alias !== "—") aliasChecked++;

if (EMIT && failures.length === 0) {
  console.log(":root {");
  for (const [name, { value, alias }] of docTokens) {
    if (name.startsWith("--ux-dark-")) continue;
    console.log(`  ${name}: ${alias === "—" ? value : `var(${alias}, ${value})`};`);
  }
  console.log("}\n\n@media (prefers-color-scheme: dark) {\n  :root {");
  for (const [name, { value, alias }] of docTokens) {
    if (!name.startsWith("--ux-dark-")) continue;
    console.log(`  ${name}: ${alias === "—" ? value : `var(${alias}, ${value})`};`);
  }
  console.log("  }\n}");
}

console.log(`tokens --ux-* en el documento: ${docTokens.size} (lista blanca: ${UDOM_EXPECTED.length})`);
console.log(`aliases al design system verificados: ${aliasChecked}`);
console.log("");
if (failures.length) {
  for (const f of failures) console.log(`FAIL  ${f}`);
  console.log(`RESULT: fail (${failures.length})`);
  process.exit(1);
}
console.log("RESULT: pass");
