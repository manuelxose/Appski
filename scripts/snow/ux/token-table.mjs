#!/usr/bin/env node
/**
 * gen-ux-token-table.mjs — calcula la tabla de verificación de contraste de
 * docs/snow/07-ux-ui.md §12 a partir de los tokens del propio documento.
 *
 * No es un verificador (eso es check-a11y-contrast.mjs): es la herramienta que
 * produce los NÚMEROS que el documento cita, para que nadie los escriba a mano.
 *
 *   node scripts/snow/ux/gen-ux-token-table.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const DOC = resolve(ROOT, "docs/snow/07-ux-ui.md");

function parseHex(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lin = (c) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4));
const L = (h) => {
  const [r, g, b] = parseHex(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const x = L(a);
  const y = L(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const src = readFileSync(DOC, "utf8");
const tokens = new Map();
for (const line of src.split(/\r?\n/)) {
  const m = /^\s*\|\s*`(--ux-[a-z0-9-]+)`\s*\|\s*`(#[0-9a-f]{6})`\s*\|\s*(`--[a-z0-9-]+`|—)/.exec(line);
  if (m) tokens.set(m[1], { value: m[2], alias: m[3] });
}
if (tokens.size === 0) {
  console.error("no se encontró la tabla de tokens en 07-ux-ui.md");
  process.exit(1);
}

/** Pares de referencia con los que se comprueba cada token: [descripción, token de fondo]. */
const CHECKED_AGAINST = {
  "--ux-text": ["--ux-surface", "--ux-bg", "--ux-surface-alt", "--ux-nodata-bg", "--ux-blocked-bg", "--ux-state-unknown-bg"],
  "--ux-text-muted": ["--ux-surface", "--ux-bg", "--ux-surface-sunken"],
  "--ux-link": ["--ux-surface"],
  "--ux-focus": ["--ux-surface", "--ux-bg"],
  "--ux-focus-on-primary": ["--primary-700"],
  "--ux-on-primary": ["--primary-700", "--ux-state-open-bg", "--ux-state-closed-bg", "--ux-ava-3-bg", "--ux-ava-4-bg"],
  "--ux-border-strong": ["--ux-surface"],
  "--ux-state-open-bg": ["--ux-surface"],
  "--ux-state-closed-bg": ["--ux-surface"],
  "--ux-state-unknown-bg": ["--ux-surface"],
  "--ux-provenance-official-fg": ["--ux-provenance-official-bg"],
  "--ux-stale-fg": ["--ux-stale-bg"],
  "--ux-error-fg": ["--ux-error-bg"],
  "--ux-ava-1-fg": ["--ux-ava-1-bg"],
  "--ux-ava-2-fg": ["--ux-ava-2-bg"],
  "--ux-ava-3-fg": ["--ux-ava-3-bg"],
  "--ux-ava-4-fg": ["--ux-ava-4-bg"],
  "--ux-ava-5-fg": ["--ux-ava-5-bg"],
  "--ux-ava-1-bg": ["--ux-surface"],
  "--ux-ava-5-bg": ["--ux-surface"],
  "--ux-dark-text": ["--ux-dark-bg"],
  "--ux-dark-text-muted": ["--ux-dark-bg", "--ux-dark-surface"],
  "--ux-dark-link": ["--ux-dark-bg"],
  "--ux-dark-focus": ["--ux-dark-bg", "--ux-dark-surface"],
  "--ux-dark-border": ["--ux-dark-surface"],
  "--ux-dark-provenance-editorial-fg": ["--ux-dark-provenance-editorial-bg"],
  "--ux-dark-stale-fg": ["--ux-dark-stale-bg"],
  "--ux-dark-nodata-fg": ["--ux-dark-nodata-bg"],
  "--ux-dark-blocked-fg": ["--ux-dark-blocked-bg"],
};

const pad = (s, n) => String(s).padEnd(n);
console.log(pad("token", 38) + pad("valor", 9) + pad("alias", 15) + "peor ratio contra su par de referencia");
for (const [name, { value, alias }] of tokens) {
  const against = CHECKED_AGAINST[name];
  let worst = "—";
  if (against) {
    const rs = against
      .map((bg) => tokens.get(bg) ?? { value: null, name: bg })
      .filter((t) => t.value)
      .map((t) => ({ r: ratio(value, t.value), bg: t.name ?? t.value }));
    if (rs.length) {
      const w = rs.reduce((a, b) => (a.r <= b.r ? a : b));
      worst = `${w.r.toFixed(2)}:1 (sobre ${rs.find((x) => x.r === w.r).bg})`;
    }
  }
  console.log(pad(name, 38) + pad(value, 9) + pad(alias === "—" ? "—" : alias.replace(/`/g, ""), 15) + worst);
}
