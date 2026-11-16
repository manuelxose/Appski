#!/usr/bin/env node
// Summarise a REA capture_browser_scenario spill file: transactions by type/host,
// candidate data endpoints, and (optionally) extract dom/screenshot artifacts.
// usage: node scripts/snow/summarize-capture.mjs <spill.txt> [--extract <outDir> <slug>]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [spill, flag, outDir, slug] = process.argv.slice(2);
if (!spill) {
  console.error("usage: summarize-capture.mjs <spill.txt> [--extract <outDir> <slug>]");
  process.exit(2);
}

const text = readFileSync(spill, "utf8");
const start = text.indexOf('{"evidence_id"');
if (start < 0) throw new Error("no evidence JSON found in spill");
const parsed = JSON.parse(text.slice(start));
const nr = parsed.normalized_result ?? {};
const events = nr.events?.items ?? [];

// One record per transaction, rebuilt from its events in sequence order.
const tx = new Map();
for (const e of events) {
  if (!e.transaction_id) continue;
  const t = tx.get(e.transaction_id) ?? { id: e.transaction_id, seq: e.sequence ?? 0 };
  if (e.kind === "request") {
    t.method = e.method;
    t.url = e.url?.url;
    t.type = e.resource_type;
    t.initiator = e.initiator_type ?? e.initiator ?? null;
  }
  if (e.kind === "response") {
    t.status = e.status;
    t.headers = e.header_names ?? [];
  }
  if (e.kind === "request-finished") {
    t.elapsed = e.elapsed_ms;
    t.failure = e.failure;
  }
  if (e.kind === "network-content" && e.phase === "response") {
    t.body = e.body;
  }
  tx.set(e.transaction_id, t);
}
const rows = [...tx.values()];
const host = (u) => {
  try { return new URL(u).host; } catch { return "(inline)"; }
};
const path = (u) => { try { return new URL(u).pathname; } catch { return u; } };

const byType = {};
const byHost = {};
const byStatus = {};
for (const r of rows) {
  byType[r.type ?? "unknown"] = (byType[r.type ?? "unknown"] ?? 0) + 1;
  byHost[host(r.url)] = (byHost[host(r.url)] ?? 0) + 1;
  byStatus[r.status ?? "pending"] = (byStatus[r.status ?? "pending"] ?? 0) + 1;
}

// A data endpoint candidate is anything that is not a document, script, stylesheet,
// font or image, OR whose body/URL looks like JSON/XML.
const DATA_TYPES = new Set(["document", "script", "stylesheet", "font", "image", "media"]);
const dataish = rows.filter((r) => {
  const ct = (r.body?.media_type ?? "").toLowerCase();
  if (/json|xml|csv|protobuf|graphql/.test(ct)) return true;
  if (r.type && !DATA_TYPES.has(r.type)) return true;
  return /\.(json|php|xml|csv)(\?|$)|api|ajax|graphql/i.test(r.url ?? "");
});

console.log(`evidence_id: ${parsed.evidence_id}`);
console.log(`url: ${nr.steps?.at(-1)?.after_url?.url ?? "-"}`);
console.log(`duration_ms: ${nr.duration_ms}; transactions: ${rows.length}; events: ${events.length}; retained: ${nr.events?.retained}`);
console.log(`by type: ${JSON.stringify(byType)}`);
console.log(`by status: ${JSON.stringify(byStatus)}`);
console.log(`hosts (${Object.keys(byHost).length}): ${JSON.stringify(byHost)}`);
console.log(`data-ish candidates: ${dataish.length}`);
for (const r of dataish) {
  const ct = r.body?.media_type ?? "-";
  console.log(`  ${r.method ?? "?"} ${r.status ?? "-"} ${host(r.url)}${path(r.url)} [${r.type}] ct=${ct} bytes=${r.body?.bytes ?? "-"}`);
}
const failed = rows.filter((r) => r.failure || (r.status && r.status >= 400));
console.log(`failures/4xx-5xx: ${failed.length}`);
for (const r of failed.slice(0, 20)) console.log(`  ${r.method ?? "?"} ${r.status ?? "-"} ${r.failure ?? ""} ${r.url}`);

if (flag === "--extract" && outDir && slug) {
  const steps = nr.steps ?? [];
  const last = steps[steps.length - 1] ?? {};
  const artifacts = last.artifacts ?? {};
  const written = [];
  mkdirSync(outDir, { recursive: true });
  for (const kind of ["screenshot", "dom", "accessibility"]) {
    const a = artifacts[kind];
    if (a?.state !== "captured") continue;
    if (kind === "screenshot") {
      const p = join(outDir, `${slug}.png`);
      writeFileSync(p, Buffer.from(a.value.data_base64, "base64"));
      written.push(p);
    } else {
      const p = join(outDir, `${slug}.${kind}.txt`);
      const body = typeof a.value === "string" ? a.value : (a.value?.text ?? JSON.stringify(a.value, null, 2));
      writeFileSync(p, body);
      written.push(p);
    }
  }
  const netRows = rows.map((r) => ({
    method: r.method, status: r.status, type: r.type, url: r.url,
    contentType: r.body?.media_type ?? null, bytes: r.body?.bytes ?? null, elapsedMs: r.elapsed ?? null,
  }));
  const p = join(outDir, `${slug}.network.json`);
  writeFileSync(p, JSON.stringify({ evidence_id: parsed.evidence_id, page: nr.steps?.at(-1)?.after_url?.url ?? null, transactions: netRows }, null, 2));
  written.push(p);
  console.log(`written: ${written.join(", ")}`);
}
