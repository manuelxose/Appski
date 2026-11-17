#!/usr/bin/env node
/**
 * check-a11y-contrast.mjs — verificador REAL de WCAG 2.2 para docs/snow/07-ux-ui.md.
 *
 * Sin dependencias. Node >= 20 (aquí Node 24.18.0).
 *
 *   node scripts/snow/ux/check-a11y-contrast.mjs            # veredicto
 *   node scripts/snow/ux/check-a11y-contrast.mjs --report    # + tabla completa
 *
 * Qué comprueba:
 *   1. CONTRASTE (fórmula WCAG 2.x: luminancia relativa con linearización sRGB).
 *      Umbrales: texto 4.5:1 (SC 1.4.3) —se exige a TODO par de texto, sin la
 *      excepción de texto grande, para no depender del tamaño real que elija t8—;
 *      componentes de UI y anillo de foco 3:1 (SC 1.4.11 / 2.4.11).
 *   2. TOKENS: el par debe resolverse a tokens que existan en el documento
 *      (tabla de §5) o en web-ssr/src/styles.css. Un token inexistente es FAIL.
 *   3. SC 1.4.1: cada estado declara su glifo (el color nunca va solo).
 *   4. SC 1.4.4: ningún <meta name="viewport"> propuesto restringe el zoom.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const DOC = resolve(ROOT, "docs/snow/07-ux-ui.md");
const STYLES = resolve(ROOT, "web-ssr/src/styles.css");
const REPORT = process.argv.includes("--report");

/* --------------------------------- color --------------------------------- */

function parseHex(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) throw new Error(`color no soportado (se exige #rrggbb): ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
const lin = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4));

function luminance(hex) {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Ratio de contraste WCAG 2.x, siempre >= 1. */
export function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/* --------------------------------- tokens --------------------------------- */

const docRaw = readFileSync(DOC, "utf8");
const cssRaw = readFileSync(STYLES, "utf8");

function parseTokens(text, markdown) {
  const out = new Map();
  for (const line of text.split(/\r?\n/)) {
    // markdown: | `--token` | `#rrggbb` | `alias` | ...   (la 3ª celda evita
    //           las filas de estado/aludes, que también llevan hex)
    // css:      --token: #rrggbb;
    const m = markdown
      ? /^\s*\|\s*`?(--[a-z0-9-]+)`?\s*\|\s*`?(#[0-9a-fA-F]{6})`?\s*\|\s*(`--[a-z0-9-]+`|—)/.exec(line)
      : /^\s*(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{6})\s*;/.exec(line);
    if (m) out.set(m[1], m[2].toLowerCase());
  }
  return out;
}

const docTokens = parseTokens(docRaw, true);
const cssTokens = parseTokens(cssRaw, false);
const token = (name) => docTokens.get(name) ?? cssTokens.get(name) ?? null;

/* --------------------------------- matriz --------------------------------- */

const MIN = { text: 4.5, ui: 3.0 };

/** [id, token primer plano, token fondo, kind, criterio] */
const PAIRS = [
  // --- Estado de estación: insignia frente a su superficie y texto dentro (▲▼?◔⊘) ---
  ["state-open-text", "--ux-on-primary", "--ux-state-open-bg", "text", "1.4.3"],
  ["state-open-badge", "--ux-state-open-bg", "--ux-surface", "ui", "1.4.11"],
  ["state-closed-text", "--ux-on-primary", "--ux-state-closed-bg", "text", "1.4.3"],
  ["state-closed-badge", "--ux-state-closed-bg", "--ux-surface", "ui", "1.4.11"],
  ["state-unknown-text", "--ux-text", "--ux-state-unknown-bg", "text", "1.4.3"],
  // La insignia «Sin datos» es gris sobre blanco (1.09:1): se apoya en el icono
  // gris + la palabra, y su contorno informativo va en --ux-border-strong.
  ["state-unknown-border", "--ux-border-strong", "--ux-surface", "ui", "1.4.11"],
  // --- Texto base y enlaces ---
  ["body", "--ux-text", "--ux-surface", "text", "1.4.3"],
  ["body-on-page", "--ux-text", "--ux-bg", "text", "1.4.3"],
  ["muted", "--ux-text-muted", "--ux-surface", "text", "1.4.3"],
  ["muted-on-page", "--ux-text-muted", "--ux-bg", "text", "1.4.3"],
  ["muted-on-sunken", "--ux-text-muted", "--ux-surface-sunken", "text", "1.4.3"],
  ["link", "--ux-link", "--ux-surface", "text", "1.4.3"],
  // --- Acción y foco (el degradado del sistema se queda en 4.10:1 / 2.77:1) ---
  ["on-primary", "--ux-on-primary", "--primary-700", "text", "1.4.3"],
  ["focus-on-surface", "--ux-focus", "--ux-surface", "ui", "2.4.11"],
  ["focus-on-bg", "--ux-focus", "--ux-bg", "ui", "2.4.11"],
  ["focus-on-primary", "--ux-focus-on-primary", "--primary-700", "ui", "2.4.11"],
  ["border-strong", "--ux-border-strong", "--ux-surface", "ui", "1.4.11"],
  // --- Procedencia, frescura, ausencia y error ---
  ["prov-editorial", "--ux-text", "--ux-provenance-editorial-bg", "text", "1.4.3"],
  ["prov-official", "--ux-provenance-official-fg", "--ux-provenance-official-bg", "text", "1.4.3"],
  ["stale", "--ux-stale-fg", "--ux-stale-bg", "text", "1.4.3"],
  ["nodata", "--ux-text", "--ux-nodata-bg", "text", "1.4.3"],
  ["error", "--ux-error-fg", "--ux-error-bg", "text", "1.4.3"],
  ["error-on-danger", "--ux-on-primary", "--error-700", "text", "1.4.3"],
  ["blocked", "--ux-text", "--ux-blocked-bg", "text", "1.4.3"],
  // --- Escala europea de aludes (siempre número + palabra) ---
  ["ava-1", "--ux-ava-1-fg", "--ux-ava-1-bg", "text", "1.4.3"],
  ["ava-2", "--ux-ava-2-fg", "--ux-ava-2-bg", "text", "1.4.3"],
  ["ava-3", "--ux-ava-3-fg", "--ux-ava-3-bg", "text", "1.4.3"],
  ["ava-4", "--ux-ava-4-fg", "--ux-ava-4-bg", "text", "1.4.3"],
  ["ava-5", "--ux-ava-5-fg", "--ux-ava-5-bg", "text", "1.4.3"],
  // ava-1-bg (#f0f9ff) es decorativo: el nivel lo dicen el número «1» y la palabra
  // «Débil»; no se usa como frontera de componente (daría 1.07:1 sobre blanco).
  ["ava-5-on-surface", "--ux-ava-5-bg", "--ux-surface", "ui", "1.4.11"],
  // --- Modo oscuro: roles semánticos sobre las rampas invertidas del sistema ---
  ["dark-body", "--ux-dark-text", "--ux-dark-bg", "text", "1.4.3"],
  ["dark-muted", "--ux-dark-text-muted", "--ux-dark-bg", "text", "1.4.3"],
  ["dark-muted-on-surface", "--ux-dark-text-muted", "--ux-dark-surface", "text", "1.4.3"],
  ["dark-link", "--ux-dark-link", "--ux-dark-bg", "text", "1.4.3"],
  ["dark-focus", "--ux-dark-focus", "--ux-dark-surface", "ui", "2.4.11"],
  ["dark-focus-on-bg", "--ux-dark-focus", "--ux-dark-bg", "ui", "2.4.11"],
  ["dark-prov-editorial", "--ux-dark-provenance-editorial-fg", "--ux-dark-provenance-editorial-bg", "text", "1.4.3"],
  ["dark-stale", "--ux-dark-stale-fg", "--ux-dark-stale-bg", "text", "1.4.3"],
  ["dark-nodata", "--ux-dark-nodata-fg", "--ux-dark-nodata-bg", "text", "1.4.3"],
  ["dark-blocked", "--ux-dark-blocked-fg", "--ux-dark-blocked-bg", "text", "1.4.3"],
  ["dark-border", "--ux-dark-border", "--ux-dark-surface", "ui", "1.4.11"],
];

const failures = [];
const rows = [];

for (const [id, fgTok, bgTok, kind, sc] of PAIRS) {
  const fg = token(fgTok);
  const bg = token(bgTok);
  if (!fg || !bg) {
    failures.push(`${id}: token no resoluble (${fgTok}=${fg}, ${bgTok}=${bg})`);
    continue;
  }
  const min = MIN[kind];
  const ratio = contrast(fg, bg);
  const pass = ratio + 1e-9 >= min;
  rows.push({ id, fg, bg, ratio, min, sc, pass });
  if (!pass) failures.push(`${id}: ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1 < ${min}:1 (SC ${sc})`);
}

/* --------------------------- SC 1.4.1 / SC 1.4.4 --------------------------- */

const CUES = [
  ["Abierta", "▲"],
  ["Cerrada", "▼"],
  ["Sin datos", "?"],
  ["Desfasado", "◔"],
  ["Bloqueado", "⊘"],
];
for (const [state, glyph] of CUES) {
  if (!docRaw.includes(glyph)) failures.push(`SC 1.4.1: el estado "${state}" no declara su glifo "${glyph}"`);
}

for (const tag of docRaw.match(/<meta[^>]*name=["']viewport["'][^>]*>/gi) ?? []) {
  for (const banned of ["maximum-scale", "minimum-scale", "user-scalable=no"]) {
    if (tag.includes(banned)) failures.push(`SC 1.4.4: viewport propuesto con "${banned}": ${tag}`);
  }
}
const VIEWPORT_OK = "width=device-width, initial-scale=1";
const viewportCount = (docRaw.match(new RegExp(VIEWPORT_OK, "g")) ?? []).length;
if (viewportCount === 0) failures.push(`SC 1.4.4: el documento debe fijar "${VIEWPORT_OK}"`);

/* ---------------------------------- salida --------------------------------- */

const pad = (s, n) => String(s).padEnd(n);
if (REPORT) {
  console.log(pad("par", 24) + pad("fg", 9) + pad("bg", 9) + pad("ratio", 8) + pad("min", 6) + "SC");
  for (const r of rows) {
    console.log(
      pad(r.id, 24) + pad(r.fg, 9) + pad(r.bg, 9) + pad(r.ratio.toFixed(2), 8) + pad(r.min, 6) + r.sc +
        (r.pass ? "" : "  <-- FAIL")
    );
  }
  console.log("");
}

const worst = rows.reduce((a, b) => (a.ratio <= b.ratio ? a : b), rows[0]);
console.log(`pares evaluados:       ${rows.length}`);
console.log(`peor ratio:            ${worst ? worst.ratio.toFixed(2) : "n/a"}:1 (${worst ? worst.id : "n/a"})`);
console.log(`viewport correcto:     ${viewportCount} aparición(es)`);
console.log(`tokens doc/styles.css: ${docTokens.size} / ${cssTokens.size}`);
console.log("");
if (failures.length) {
  for (const f of failures) console.log(`FAIL  ${f}`);
  console.log(`RESULT: fail (${failures.length})`);
  process.exit(1);
}
console.log("RESULT: pass");
