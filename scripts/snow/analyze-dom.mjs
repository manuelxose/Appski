#!/usr/bin/env node
// Read-only DOM analysis of the reference site's captured HTML.
// usage: node scripts/snow/analyze-dom.mjs <capture.dom.txt> [--mode=parte|links]
import { readFileSync } from "node:fs";

const path = process.argv[2];
const mode = (process.argv[3] ?? "--mode=links").split("=")[1];
const html = readFileSync(path, "utf8");

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};

if (mode === "parte") {
  const rows = [...html.matchAll(/<a class="td tdx1 " href="([^"/]+)\/([^"/]+)\/parte-de-nieve\/" title="Parte de nieve de ([^"]+)"/g)];
  const kinds = {};
  for (const [, section] of rows) kinds[section] = (kinds[section] ?? 0) + 1;
  console.log(`station rows: ${rows.length}`);
  console.log(`by section: ${JSON.stringify(kinds)}`);
  const groups = [...html.matchAll(/<div class="listado_cord">\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => `${m[2]} => ${m[1]}`);
  console.log(`area groups (${groups.length}):`);
  console.log(groups.join("\n"));
  // status pills
  const pills = [...html.matchAll(/background-color:(#[0-9A-Fa-f]{6});" title="([^"]+)"/g)].map((m) => m[2]);
  const pillCounts = {};
  for (const p of pills) pillCounts[p] = (pillCounts[p] ?? 0) + 1;
  console.log(`status pills: ${JSON.stringify(pillCounts)}`);
  // column headers
  const head = [...html.matchAll(/<div class="th (tdx\d+)">(?:<span[^>]*>)?([^<]*)/g)].map((m) => `${m[1]}:${m[2]}`);
  console.log(`columns: ${head.join(" | ")}`);
}

if (mode === "links") {
  const seen = new Map();
  for (const tag of html.matchAll(/<a\b[^>]*>/g)) {
    const href = attr(tag[0], "href");
    if (!href) continue;
    const key = href.replace(/\/$/, "");
    if (!seen.has(key)) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const list = [...seen.keys()].sort();
  console.log(`distinct links: ${list.length}`);
  console.log(list.join("\n"));
}
