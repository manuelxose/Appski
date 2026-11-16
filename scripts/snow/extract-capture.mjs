#!/usr/bin/env node
// Extract REA capture artifacts (screenshot / dom / accessibility) from a spilled
// capture_browser_scenario result into docs/snow/captures.
// usage: node scripts/snow/extract-capture.mjs <spill.txt> <outDir> <slug>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [spill, outDir, slug] = process.argv.slice(2);
if (!spill || !outDir || !slug) {
  console.error("usage: extract-capture.mjs <spill.txt> <outDir> <slug>");
  process.exit(2);
}
mkdirSync(outDir, { recursive: true });

const text = readFileSync(spill, "utf8");
const start = text.indexOf('{"evidence_id"');
if (start < 0) throw new Error("no evidence JSON found in spill");
const parsed = JSON.parse(text.slice(start));

const steps = parsed.normalized_result?.steps ?? [];
const last = steps[steps.length - 1] ?? {};
const artifacts = last.artifacts ?? {};
const written = [];
for (const kind of ["screenshot", "dom", "accessibility"]) {
  const a = artifacts[kind];
  if (a?.state !== "captured") {
    written.push(`${kind}: ${a?.state ?? "absent"}`);
    continue;
  }
  if (kind === "screenshot") {
    const p = join(outDir, `${slug}.png`);
    writeFileSync(p, Buffer.from(a.value.data_base64, "base64"));
    written.push(`${p} (${a.value.bytes} bytes, sha256 ${a.value.sha256})`);
  } else {
    // dom/accessibility artifacts are {sha256, bytes, text}; keep the text only.
    const p = join(outDir, `${slug}.${kind}.txt`);
    const body = typeof a.value === "string" ? a.value : (a.value?.text ?? JSON.stringify(a.value, null, 2));
    writeFileSync(p, body);
    written.push(`${p} (${a.value?.bytes ?? body.length} bytes, sha256 ${a.value?.sha256 ?? "-"})`);
  }
}

// Compact network inventory: one line per transaction, no bodies.
const tx = new Map();
for (const e of parsed.normalized_result?.events?.items ?? []) {
  if (!e.transaction_id) continue;
  const t = tx.get(e.transaction_id) ?? { id: e.transaction_id, method: e.method, url: e.url?.url, type: e.resource_type };
  if (e.kind === "response") { t.status = e.status; t.ctype = undefined; }
  if (e.kind === "request") { t.method = e.method; t.type = e.resource_type; t.url = e.url?.url; }
  if (e.kind === "request-finished") { t.elapsed = e.elapsed_ms; t.failure = e.failure; }
  tx.set(e.transaction_id, t);
}
const rows = [...tx.values()];
writeFileSync(join(outDir, `${slug}.network.json`), JSON.stringify(rows, null, 2));
const apiish = rows.filter((r) => /json|api|ajax|xhr|fetch|php/.test(`${r.type} ${r.url}`));
writeFileSync(join(outDir, `${slug}.network-api.txt`), apiish.map((r) => `${r.method} ${r.status ?? "-"} ${r.url}`).join("\n"));
console.log(`evidence ${parsed.evidence_id}`);
console.log(`transactions ${rows.length}; api-ish ${apiish.length}`);
console.log(written.join("\n"));
