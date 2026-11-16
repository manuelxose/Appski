#!/usr/bin/env node
// Read-only structural facts for the reference-inventory: per captured DOM, extract
// page title/canonical/viewport, table headers, counts and key blocks.
// usage: node scripts/snow/page-facts.mjs <file.dom.txt> [...]
import { readFileSync } from "node:fs";

const names = process.argv.slice(2);
if (!names.length) {
  console.error("usage: page-facts.mjs <file.dom.txt> [...]");
  process.exit(2);
}

const one = (re, s) => (s.match(re) ?? [])[1] ?? null;
const squash = (s) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const count = (re, s) => (s.match(re) ?? []).length;

for (const file of names) {
  const s = readFileSync(file, "utf8");
  const heads = [...new Set([...s.matchAll(/<div class="th (tdx\d+)">([\s\S]*?)<\/div>/g)]
    .map((m) => `${m[1]}:${squash(m[2])}`))];
  const h1 = squash(one(/<h1>([\s\S]*?)<\/h1>/, s));
  const h3 = squash(one(/<h3>([\s\S]*?)<\/h3>/, s));
  const forms = [...new Set([...s.matchAll(/<form\b[^>]*>/g)].map((m) =>
    `${one(/action="([^"]*)"/, m[0]) ?? "-"} ${one(/method="([^"]*)"/, m[0]) ?? "-"}`))];
  const selects = count(/<select\b/g, s);
  const inputs = count(/<input\b/g, s);
  const tables = count(/<div class="table/g, s);
  const rows = count(/<div class="tr">/g, s);
  const cams = count(/class="webcam"/g, s);
  const leaflet = /leaflet-container/.test(s);
  const recaptcha = /g-recaptcha/.test(s);
  const canonical = one(/<link href="([^"]+)" rel="canonical">/, s);
  const viewport = one(/name="viewport" content="([^"]+)"/, s);
  const nodata = [...new Set([...s.matchAll(/<div class="box_[a-z_]*noinfo[^"]*"[^>]*>\s*<p>([\s\S]*?)<\/p>/g)].map((m) => squash(m[1])))];
  const updated = [...new Set([...s.matchAll(/Actualizado el ([^<]+)</g)].map((m) => m[1]))];
  console.log(`### ${file}`);
  console.log(`  title: ${squash(one(/<title>([\s\S]*?)<\/title>/, s))}`);
  console.log(`  canonical: ${canonical ?? "(none)"}`);
  console.log(`  viewport: ${viewport ?? "(none)"}`);
  console.log(`  h1: ${h1 || "(none)"}${h3 ? ` | h3: ${h3}` : ""}`);
  console.log(`  tables: ${tables}; rows: ${rows}; selects: ${selects}; inputs: ${inputs}; webcam-imgs: ${cams}`);
  console.log(`  leaflet: ${leaflet}; recaptcha: ${recaptcha}`);
  console.log(`  forms: ${forms.length ? forms.join(" ; ") : "(none)"}`);
  if (heads.length) console.log(`  columns: ${heads.join(" | ")}`);
  if (updated.length) console.log(`  station updated stamps: ${[...new Set(updated)].slice(0, 4).join(", ")} (${updated.length} distinct)`);
  if (nodata.length) console.log(`  no-data notices: ${nodata.join(" || ")}`);
  console.log("");
}
