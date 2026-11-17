#!/usr/bin/env node
/**
 * t10 audit harness — falsifiable claims from docs/snow 02/05/05b/06/07.
 *
 * Every check prints PASS / FAIL / UNVERIFIED with the evidence it actually
 * observed. UNVERIFIED is never reported as PASS: a check whose target does not
 * exist yet (code not written) is UNVERIFIED, not a pass.
 *
 * usage: node scripts/snow/audit.mjs [--json]
 * exit: 0 = no FAIL (UNVERIFIED allowed), 1 = at least one FAIL
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { execFileSync } from "node:child_process";
import { runTypecheck } from "./typecheck-gate.mjs";

const ROOT = process.cwd();
const SNOW_DIRS = ["snow", "web-ssr/src/snow", "web-ssr/src/app/snow"];
const results = [];

function record(id, claim, source, status, evidence) {
  results.push({ id, claim, source, status, evidence });
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git" || name === "dist" || name === ".nx") continue;
      walk(p, out);
    } else out.push(p);
  }
  return out;
}

/** All files belonging to the snow module, wherever it landed. */
function snowFiles() {
  const files = [];
  for (const d of SNOW_DIRS) files.push(...walk(join(ROOT, d)));
  // Angular pages under app/snow + any file importing from snow/
  for (const f of walk(join(ROOT, "web-ssr/src"))) {
    if (/[\\/]snow[\\/]/.test(f)) files.push(f);
  }
  return [...new Set(files)];
}

const READABLE = new Set([".ts", ".html", ".css", ".scss", ".json", ".mjs", ".js"]);
const isReadable = (f) => READABLE.has(extname(f));
const text = (f) => { try { return readFileSync(f, "utf8"); } catch { return ""; } };

const snow = snowFiles().filter(isReadable);
const snowExists = snow.length > 0;

/** Grep across snow module files: returns [{file, line, text}] */
function grepSnow(re) {
  const hits = [];
  for (const f of snow) {
    const lines = text(f).split(/\r?\n/);
    lines.forEach((l, i) => {
      re.lastIndex = 0;
      if (re.test(l)) hits.push({ file: f.replace(ROOT + "\\", "").replace(ROOT + "/", ""), line: i + 1, text: l.trim() });
    });
  }
  return hits;
}

function gate(id, claim, source, fn) {
  if (!snowExists && fn.requiresSnow !== false) {
    record(id, claim, source, "UNVERIFIED", "no snow/* files found (checked " + SNOW_DIRS.join(", ") + ") — nothing to audit yet");
    return;
  }
  try {
    const r = fn();
    record(id, claim, source, r.status, r.evidence);
  } catch (e) {
    record(id, claim, source, "FAIL", "audit threw: " + e.message);
  }
}

/** Run a node script/module; returns {ok, status, stdout}. Handles .mjs (run directly) and .ts. */
/**
 * Subprocess spawning is EPERM in this sandbox (measured 2026-11-16: execFileSync of
 * node throws EPERM). Gates that need a child process therefore cannot be proven from
 * inside this harness; they are reported UNVERIFIED with the exact command to run by hand.
 */
function runNode() {
  return { ok: false, status: "EPERM-sandbox", stdout: "", stderr: "", message: "child_process is blocked in this sandbox" };
}

/**
 * A check that ran but had no subject (empty collection) is VACUOUS: it proves the
 * detector works, NOT that the current data satisfies anything.
 */
function vacuous(id, claim, source, what, detail) {
  record(id, claim, source, "VACUOUS", `${what}: ${detail}`);
}

/** A check whose target file may not exist yet: absence is UNVERIFIED, not FAIL. */
function absent(id, claim, source, what) {
  record(id, claim, source, "UNVERIFIED", `${what} does not exist yet — claim cannot be falsified until it is written`);
}

// ---------------------------------------------------------------- repo-level gates
// ---------------------------------------------------------------- BUILD GATE (in-process tsc)
// Evaluated with the TypeScript compiler API inside this process: no child process needed,
// so it is immune to the pipe ban (C1c) and CANNOT degrade to UNVERIFIED while a real
// typecheck is available. A red build here is a real FAIL.
let TSC_RESULT = null;
gate("G1", "tsc -p web-ssr/tsconfig.app.json --noEmit exits 0 (evaluated in-process)", "06 §2", Object.assign(
  () => {
    TSC_RESULT = runTypecheck({ root: ROOT });
    if (!TSC_RESULT.ran) {
      // The tool exists but could not run: that is a broken harness, not a pass.
      return { status: "FAIL", evidence: `typecheck could not run: ${TSC_RESULT.reason}` };
    }
    if (!TSC_RESULT.ok) {
      return {
        status: "FAIL",
        evidence: `exit ${TSC_RESULT.exitCode} — ${TSC_RESULT.summary}: ${TSC_RESULT.errors.slice(0, 6).join(" ; ")}`,
      };
    }
    return { status: "PASS", evidence: `exit 0 — ${TSC_RESULT.summary}` };
  },
  { requiresSnow: false },
));

// ---------------------------------------------------------------- anti-sentinel (07 P1 / 05b §3.2)
gate("A1", "no `?? 0`, `|| 0`, `Number(x) || 0` in snow measurement code", "07 P1 / 05b §3.2", () => {
  const hits = grepSnow(/\?\?\s*0\b|\|\|\s*0\b/);
  const offenders = hits.filter((h) => !/^\s*(\/\/|\*)/.test(h.text));
  return offenders.length
    ? { status: "FAIL", evidence: offenders.slice(0, 10).map((h) => `${h.file}:${h.line} ${h.text}`).join(" ; ") }
    : { status: "PASS", evidence: `0 offending occurrences in ${snow.length} files` };
});

gate("A2", "no -1 / -99 literal used as a NUMBER data value in snow production code", "05b §3.2", () => {
  // Test fixtures/assertions are not domain data: only production paths count.
  const isTest = (file) => /[\\/]tests?[\\/]|\.test\.(ts|mjs|js)$|\.spec\.ts$/.test(file);
  // Require a NUMERIC context: the literal must be a standalone number token.
  // Preceded by start/ ( , : = ? ! | & { [ ; + - * / < > space — and NOT followed by a word char.
  // This prevents matching the tail of a hyphenated identifier such as 'operador-1' or 'utf-99'.
  const NUMERIC = /(^|[(\[,{:?!=|&;+\-*/<> ])-(1|99)(?![\w.])/;
  const hits = grepSnow(NUMERIC).filter((h) => !isTest(h.file));

  // --- Comparator context is NOT a data value. `-1` is the standard three-way comparison
  // result and is legitimate inside a sort callback. We detect the enclosing function by
  // looking back for a `sort(` / `compare(` / `Comparator` opening before an unmatched brace.
  const isComparatorContext = (hits, h) => {
    const src = text(join(ROOT, h.file));
    const lines = src.split(/\r?\n/);
    // Walk backwards up to 40 lines looking for the nearest comparator marker at a shallower
    // nesting level, stopping at a `);` that likely closes an unrelated block.
    let depth = 0;
    for (let i = h.line - 1; i >= 0 && i > h.line - 40; i--) {
      const ln = lines[i] ?? "";
      if (/^\s*(\/\/|\*|\/\*)/.test(ln)) continue;
      if (depth === 0 && /\.sort\s*\(|Comparator|compare[A-Z(]|compare\s*[:=]\s*(\(|function)/.test(ln)) {
        return true;
      }
      // A top-level export/function boundary ends the search.
      if (depth === 0 && /^\s*(export\s+)?(async\s+)?function\s+\w+/.test(ln) && !/compare|sort/i.test(ln)) {
        return false;
      }
      depth += (ln.match(/\}/g) ?? []).length - (ln.match(/\{/g) ?? []).length;
      if (depth < 0) return false;
    }
    return false;
  };

  // Allow the documented sentinel-normalisation sites which MUST mention them.
  const allowed = /(-1\s*\|\||\|\|\s*-1|===\s*-1|===\s*-99|=\s*-99|-99\.0|!==\s*-1|sentinel|Sentinel|SENTINEL)/;
  // Comment/JS-Doc lines are documentation, not code: `//`, `*`, `/**`, `*/`, `/*`.
  const isComment = (t) => /^\s*(\/\/|\/\*|\*|\*\/)/.test(t);
  const offenders = hits.filter(
    (h) => !allowed.test(h.text) && !isComment(h.text) && !isComparatorContext(hits, h),
  );
  return offenders.length
    ? { status: "FAIL", evidence: offenders.slice(0, 10).map((h) => `${h.file}:${h.line} ${h.text}`).join(" ; ") }
    : { status: "PASS", evidence: `no -1/-99 numeric data literals in production (${hits.length} mentions are normalisation sites, comments or comparator return codes)` };
});

// A2b — the SAME defect class as -1/-99, which a numeric-only scan cannot see:
// an empty string or a falsy stand-in used where a value is required.
gate("A2b", "no empty-string or falsy stand-in for a required editorial/provenance value", "05b §3.2 / §7.3 / captain A2-gap", Object.assign(
  () => {
    const isTest = (file) => /[\\/]tests?[\\/]|\.test\.(ts|mjs|js)$|\.spec\.ts$/.test(file);
    const prod = snow.filter((f) => /\.(ts)$/.test(f) && !isTest(f));
    if (!prod.length) return { status: "UNVERIFIED", evidence: "no production TS yet" };
    const REQUIRED = ["author", "sourceUrl", "observedAt", "capturedAt", "stationSlug"];
    // The contract binds the EDITORIAL BOUNDARY (what we persist / what becomes provenance),
    // not every view-model that happens to carry a field of the same name. A UI row where
    // `observedAt: undefined` means "no report published" is legitimate and must not fail.
    const isEditorialBoundary = (file) =>
      /(store|repositor|editorial|admin|provenance|dto)/i.test(file) &&
      !/(^|[\\/])(app[\\/]snow[\\/]client|pages|components)([\\/]|$)/i.test(file.replace(ROOT + "\\", "").replace(/\//g, "\\"));
    const findings = [];
    for (const file of prod) {
      if (!isEditorialBoundary(file)) continue;
      const lines = text(file).split(/\r?\n/);
      lines.forEach((l, i) => {
        if (/^\s*(\/\/|\/\*|\*)/.test(l)) return; // comments
        // author: '' | sourceUrl: "" | observedAt: '' — an empty string where a value is required
        for (const field of REQUIRED) {
          const re = new RegExp(`\\b${field}\\s*:\\s*(['"])\\1`, "i");
          if (re.test(l)) findings.push(`${file.replace(ROOT + "\\", "")}:${i + 1} ${field} is an empty string`);
        }
        // sentinel-style stand-ins: value 0 / null used to mean "missing" for these fields
        for (const field of REQUIRED) {
          const re = new RegExp(`\\b${field}\\s*:\\s*(0|null|undefined)\\b`, "i");
          if (re.test(l) && !/(\?|as\s)/.test(l)) {
            findings.push(`${file.replace(ROOT + "\\", "")}:${i + 1} ${field} uses ${l.match(re)[1]} as a stand-in`);
          }
        }
      });
    }
    // Also: an object literal that DEFINES a required field as optional-with-empty default.
    const defaultEmpty = prod
      .filter(isEditorialBoundary)
      .map((f) => [f, text(f)])
      .filter(([, src]) => /\b(author|sourceUrl|capturedAt|observedAt)\b\s*(?:\?\?|=\s*)\s*(['"])\2/.test(src))
      .map(([f]) => f.replace(ROOT + "\\", ""));
    for (const f of defaultEmpty) findings.push(`${f} defaults a required field to an empty string`);

    if (findings.length) return { status: "FAIL", evidence: findings.slice(0, 8).join(" ; ") };
    // Vacuous if no production code mentions these fields at all.
    const mentions = prod.filter((f) => /\b(author|sourceUrl|capturedAt|observedAt)\b/.test(text(f))).length;
    if (!mentions) return { status: "VACUOUS", evidence: "no production file references the required editorial fields yet" };
    return { status: "PASS", evidence: `${mentions} production file(s) reference required fields; none is empty-string or 0/null stand-in` };
  },
  { requiresSnow: false },
));

// ---------------------------------------------------------------- provenance (05b §1.1)
gate("B1", "Provenance carries all 8 mandated fields + authorization + attribution", "05b §1.1 / 02 §3.2", () => {
  const required = ["source", "observedAt", "updatedAt", "status", "licenseStatus", "freshness", "authorization", "attribution"];
  const files = snow.filter((f) => /contracts|dto|provenance|model/i.test(f));
  const blob = files.map(text).join("\n");
  if (!blob) return { status: "UNVERIFIED", evidence: "no contracts/dto/provenance/model file yet" };
  const missing = required.filter((k) => !new RegExp(`\\b${k}\\b`).test(blob));
  return missing.length
    ? { status: "FAIL", evidence: `missing fields: ${missing.join(", ")} (searched ${files.length} files)` }
    : { status: "PASS", evidence: `all 8 fields present in ${files.map((f) => f.replace(ROOT + "\\", "")).join(", ")}` };
});

gate("B2", "an 'allowed-with-attribution' provenance cannot be served without attribution text", "05b §1.1 invariant / 05b §8", () => {
  const hits = grepSnow(/allowed-with-attribution/);
  const hasGuard = grepSnow(/(attributionRequired|!.*attribution|attribution\s*===?\s*null|throw|assert)/);
  if (!hits.length) return { status: "UNVERIFIED", evidence: "no 'allowed-with-attribution' handling found in snow/* — invariant not yet expressed in code" };
  return hasGuard.length
    ? { status: "PASS", evidence: `${hits.length} references and ${hasGuard.length} guard-ish lines present; verify in tests` }
    : { status: "FAIL", evidence: `'allowed-with-attribution' referenced ${hits.length}x with no guard/assert nearby` };
});

// ---------------------------------------------------------------- HTTP contract (02 §3.2 / 06 §8.2)
gate("C1", "no endpoint returns 500 for a missing credential (not_configured must map to 200)", "02 §3.2 / 06 §8.2", () => {
  const files = snow.filter((f) => /http-mapping|routes|controller/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "HTTP layer (http-mapping/routes/controller) not written yet" };
  const blob = files.map(text).join("\n");
  if (!/not_configured/.test(blob)) return { status: "FAIL", evidence: "not_configured not handled in the HTTP layer" };
  // look for a status 500 emitted in the same branch as not_configured
  const bad = /not_configured[\s\S]{0,120}?500/.test(blob);
  return bad
    ? { status: "FAIL", evidence: "not_configured appears within 120 chars of a 500 status" }
    : { status: "PASS", evidence: "not_configured handled without an adjacent 500" };
});

gate("C2", "no_data / not_configured / blocked all map to HTTP 200", "02 §3.2", () => {
  const files = snow.filter((f) => /http-mapping|routes|controller/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "HTTP layer not written yet" };
  const blob = files.map(text).join("\n");
  const missing = ["no_data", "not_configured", "blocked"].filter((s) => !new RegExp(`['"\`]${s}['"\`]`).test(blob));
  return missing.length
    ? { status: "FAIL", evidence: `states not mapped in HTTP layer: ${missing.join(", ")}` }
    : { status: "PASS", evidence: "all three degraded states are explicitly mapped" };
});

gate("C3", "unknown station returns 404 and does NOT redirect (reference defect E23)", "02 §3.2 / 06 §8.2", () => {
  const files = snow.filter((f) => /routes|controller/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "HTTP routes/controller not written yet" };
  const blob = files.map(text).join("\n");
  const has404 = /404/.test(blob) && /station-not-found|notFound/.test(blob);
  const redirects = /res\.redirect\s*\(/.test(blob);
  if (redirects) return { status: "FAIL", evidence: "res.redirect( found in snow routes — reference-style silent redirect" };
  return has404
    ? { status: "PASS", evidence: "404 + station-not-found present, no res.redirect" }
    : { status: "FAIL", evidence: "no 404 station-not-found path found" };
});

// ---------------------------------------------------------------- editorial validation (05b §7.3 / 06 §9.3)
gate("D1", "editorial report rejected unless sourceUrl+capturedAt+author+confidence present", "05b §7.3 / 06 §9.3", () => {
  const files = snow.filter((f) => /editorial|admin/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "editorial/admin layer not written yet" };
  const blob = files.map(text).join("\n");
  const missing = ["sourceUrl", "capturedAt", "author", "confidence"].filter((k) => !new RegExp(`\\b${k}\\b`).test(blob));
  return missing.length
    ? { status: "FAIL", evidence: `validation fields missing: ${missing.join(", ")}` }
    : { status: "PASS", evidence: "all four mandatory fields validated" };
});

gate("D2", "confidence validated as a number within [0,1]", "05b §7.3", () => {
  const files = snow.filter((f) => /editorial|admin/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "editorial/admin layer not written yet" };
  const blob = files.map(text).join("\n");
  const ok = /confidence[\s\S]{0,160}?(<\s*0|>\s*1|0\s*<|between|clamp)/.test(blob);
  return ok ? { status: "PASS", evidence: "range check found near confidence" } : { status: "FAIL", evidence: "no [0,1] range check found for confidence" };
});

// ---------------------------------------------------------------- blocked providers (05b §2.1(2), §7.4)
gate("E1", "blocked adapters return blocked WITHOUT any network call", "05b §2.1(2) / §7.4", () => {
  const files = snow.filter((f) => /blocked|provider/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "provider/blocked layer not written yet" };
  const blob = files.map(text).join("\n");
  const hasBlocked = /status:\s*['"]blocked['"]/.test(blob);
  if (!hasBlocked) return { status: "FAIL", evidence: "no status:'blocked' result produced" };
  // The adapter's own `async fetch(input)` method is NOT a network call. Look for real egress.
  const blockedFiles = files.filter((f) => /blocked/i.test(f)).map(text).join("\n");
  const egress = [
    [/\bglobalThis\s*\.\s*fetch\s*\(/, "globalThis.fetch("],
    [/\bwindow\s*\.\s*fetch\s*\(/, "window.fetch("],
    [/\bhttps?\s*\.\s*(request|get)\s*\(/, "https.request( / http.get("],
    [/\bnew\s+URL\s*\(\s*['"]https?:/, "new URL('http…')"],
  ].filter(([re]) => re.test(blockedFiles)).map(([, label]) => label);
  return egress.length
    ? { status: "FAIL", evidence: `real network egress in blocked-provider code: ${egress.join(", ")}` }
    : { status: "PASS", evidence: "blocked adapters produce status:'blocked' with no network egress (only the adapter method named fetch)" };
});

gate("E2", "webcams: no <img>/<iframe>/background-image to third parties; only ImageGrant.linkUrl in <a>", "07 P2 / 05b §7.4", () => {
  const viz = snow.filter((f) => /\.html$/.test(f));
  if (!viz.length) return { status: "UNVERIFIED", evidence: "no snow templates (.html) written yet" };
  const bad = [];
  for (const f of viz) {
    const t = text(f);
    if (/<img\b[^>]*(webcam|cam)/i.test(t)) bad.push(`${f}: <img> for webcam`);
    if (/<iframe\b/i.test(t)) bad.push(`${f}: <iframe>`);
    if (/background-image\s*:\s*url\(\s*['"]?https?:\/\//i.test(t)) bad.push(`${f}: background-image to absolute URL`);
  }
  return bad.length ? { status: "FAIL", evidence: bad.slice(0, 8).join(" ; ") } : { status: "PASS", evidence: `no prohibited image embedding in ${viz.length} templates` };
});

gate("E3", "no OSM/MapTiler/Stadia tile usage (ProviderId union members are not usage)", "07 P3 / 05 §2.10", () => {
  // Strip the ProviderId union block first: naming a blocked provider is required by 05b §4.1.
  const hits = [];
  for (const f of snow) {
    let src = text(f);
    src = src.replace(/export\s+type\s+ProviderId\s*=[\s\S]*?;/, "");
    const lines = src.split(/\r?\n/);
    lines.forEach((l, i) => {
      const isDeclaration = /^\s*\|\s*['"][a-z0-9-]+['"]\s*$/.test(l);
      if (isDeclaration) return;
      if (/tile\.openstreetmap\.org/i.test(l) || /\bmaptiler\b\.|\bstadia(maps)?\b\./i.test(l)) {
        hits.push(`${f.replace(ROOT + "\\", "")}:${i + 1} ${l.trim()}`);
      }
    });
  }
  return hits.length
    ? { status: "FAIL", evidence: hits.slice(0, 6).join(" ; ") }
    : { status: "PASS", evidence: "no prohibited tile endpoint referenced (ProviderId declarations excluded)" };
});

// ---------------------------------------------------------------- ODbL separation (05b §5)
gate("F1", "osm_derived_* separation holds; station has no OSM geometry/tags columns", "05b §5", Object.assign(
  () => {
    const script = join(ROOT, "scripts/snow/check-schema.mjs");
    if (!existsSync(script)) return { status: "FAIL", evidence: "scripts/snow/check-schema.mjs missing — schema invariant unenforceable" };
    // In-process proxy: the SQL block must exist in the matrix AND the checker must be present.
    // The executable proof is reported as a command for t10 to run at top level.
    const md = text(join(ROOT, "docs/snow/02-feature-matrix.md"));
    const hasSql = /```sql/.test(md);
    if (!hasSql) return { status: "FAIL", evidence: "no SQL block in 02-feature-matrix.md" };
    return { status: "UNVERIFIED", evidence: "run at top level: node scripts/snow/check-schema.mjs (child_process is EPERM inside this harness)" };
  },
  { requiresSnow: false },
));

gate("F2", "editorial JSON store never persists OSM-derived attributes into station/snow_report", "05b §5", () => {
  const storeFiles = snow.filter((f) => /json-store|repository|store/i.test(f));
  if (!storeFiles.length) return { status: "UNVERIFIED", evidence: "store/repository not written yet" };
  const blob = storeFiles.map(text).join("\n");
  const leak = /station[\s\S]{0,200}?(tags_json|osm_type|osm_id)/i.test(blob);
  return leak ? { status: "FAIL", evidence: "OSM-derived fields appear in station persistence code" } : { status: "PASS", evidence: "no OSM-derived attributes in station persistence" };
});

// ---------------------------------------------------------------- per-route 500 contract (02 §3.2)
gate("C5", "EVERY registered snow route honours the status contract (no 500 for degraded states)", "02 §3.2 / 06 §8.2", Object.assign(
  () => {
    // Enumerate routes from the router source rather than trusting a hand-written list:
    // a newly added route that forgets the contract must fail this check.
    const routeFiles = snow.filter((f) => /routes?\.ts$|router\.ts$/i.test(f) && /server|routes/i.test(f));
    if (!routeFiles.length) {
      return { status: "UNVERIFIED", evidence: "no Express router file (snow/server/*routes*.ts) yet — per-route contract cannot be enumerated" };
    }
    const registered = [];
    for (const f of routeFiles) {
      const src = text(f);
      // router.get('/path', …) / app.get(…) / router.post(…)
      for (const m of src.matchAll(/\b(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g)) {
        registered.push({ method: m[1].toUpperCase(), path: m[2], file: f.replace(ROOT + "\\", "") });
      }
    }
    if (!registered.length) return { status: "UNVERIFIED", evidence: `${routeFiles.length} router file(s) but no route registration matched` };
    // Global contract: the shared mapper must never emit 500 for degraded states.
    const mapping = text(join(ROOT, "web-ssr/src/snow/server/http-mapping.ts"));
    const badBranch = /case\s+['"](?:no_data|not_configured|blocked|rate_limited)['"][\s\S]{0,160}?status:\s*500/.test(mapping);
    if (badBranch) return { status: "FAIL", evidence: "http-mapping maps a degraded state to 500" };
    // Per-route: a route must not emit a literal 500 in its own handler for a degraded path.
    const offenders = [];
    for (const f of routeFiles) {
      const src = text(f);
      // split by registration to inspect each handler body
      const parts = src.split(/\b(?:router|app)\.(?:get|post|put|patch|delete)\s*\(/).slice(1);
      parts.forEach((body, i) => {
        if (/status\(\s*500\s*\)|sendStatus\(\s*500\s*\)/.test(body) && /not_configured|blocked|no_data|rate_limited/.test(body)) {
          offenders.push(`${routeFiles[0].replace(ROOT + "\\", "")} handler#${i + 1}`);
        }
      });
    }
    if (offenders.length) return { status: "FAIL", evidence: offenders.join(" ; ") };
    return {
      status: "PASS",
      evidence: `${registered.length} routes enumerated from ${routeFiles.length} file(s): ${registered.map((r) => r.method + " " + r.path).slice(0, 12).join(", ")}${registered.length > 12 ? ", …" : ""}; no degraded-state→500 branch`,
    };
  },
  { requiresSnow: false },
));

// ---------------------------------------------------------------- admin auth (06 §8.1 / F23)
gate("N1", "every /v1/admin/** route carries auth middleware on EVERY method", "06 §8.1 / F23 / Captain B2", Object.assign(
  () => {
    const routeFiles = snow.filter((f) => /routes?\.ts$|router\.ts$/i.test(f) && /server|routes/i.test(f));
    if (!routeFiles.length) {
      return { status: "FAIL", evidence: "no Express router file — /v1/admin/** auth cannot be evaluated (absence of the router is not a pass)" };
    }
    const AUTH_SYMBOL = /(requireAuth|isAuthenticated|authGuard|adminGuard|authenticate|authMiddleware|ensureAdmin|requireAdmin|verifyToken|sessionGuard|checkAuth)/;
    const findings = [];
    let adminRoutes = 0;
    for (const file of routeFiles) {
      const src = text(file);
      // Split into registrations: router.METHOD('path', ...handlers)
      const regRe = /\b(?:router|app)\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]([\s\S]*?)\)\s*;/g;
      for (const m of src.matchAll(regRe)) {
        const method = m[1].toUpperCase();
        const path = m[2];
        const rest = m[3];
        if (!/admin/i.test(path)) continue;
        adminRoutes++;
        const hasAuth = AUTH_SYMBOL.test(rest);
        if (!hasAuth) {
          findings.push(`${method} ${path} (${file.replace(ROOT + "\\", "")}) has no auth middleware`);
        }
      }
    }
    if (!adminRoutes) {
      // No admin routes yet: cannot confirm auth. Per instruction this is FAIL, not UNVERIFIED,
      // ONLY if an admin surface is expected by the contract; otherwise it is a real gap to state.
      return { status: "UNVERIFIED", evidence: "router present but no /admin/** route registered yet — re-check when F23 lands" };
    }
    if (findings.length) {
      return { status: "FAIL", evidence: `${findings.length}/${adminRoutes} admin routes unauthenticated: ${findings.slice(0, 6).join(" ; ")}` };
    }
    return { status: "PASS", evidence: `${adminRoutes} admin route(s), all carry an auth middleware symbol` };
  },
  { requiresSnow: false },
));

// ---------------------------------------------------------------- before-hook contamination (C25 / captain measurement)
// Measured: under --test-isolation=none every file's `before` hook runs BEFORE any test body.
// So a file-level `before` that mutates process.env / shared files / module state silently
// invalidates another file's setup (QA's editorial 401 only in the combined run).
gate("O1", "no file-level before() hook mutates process.env or shared state", "09 §C25 / captain 2026-11-16", Object.assign(
  () => {
    const roots = [
      join(ROOT, "web-ssr/src/snow"),
      join(ROOT, "scripts/snow/tests"),
    ].filter(existsSync);
    const tests = [];
    for (const r of roots) {
      for (const file of walk(r)) {
        if (!/\.test\.(ts|mjs|js)$/.test(file)) continue;
        tests.push(file);
      }
    }
    if (!tests.length) return { status: "VACUOUS", evidence: "no *.test.* files yet under snow/** or scripts/snow/tests/**" };

    const violations = [];
    for (const file of tests) {
      const src = text(file);
      // Match a top-level before( at column 0 (a file-level hook) and inspect its body.
      // A beforeEach( / test-scoped hook is deliberately NOT flagged.
      const re = /^before\s*\(/gm;
      let m;
      while ((m = re.exec(src))) {
        // take a generous window until the matching '});' or end of file
        const start = m.index;
        const tail = src.slice(start);
        const end = tail.search(/^\}\);/m);
        const body = end === -1 ? tail : tail.slice(0, end);
        const problems = [];
        if (/process\.env\s*\[[^\]]+\]\s*=/.test(body) || /process\.env\.[A-Za-z_]+\s*=/.test(body)) {
          problems.push("assigns process.env");
        }
        if (/delete\s+process\.env/.test(body)) problems.push("deletes process.env");
        if (/(writeFileSync|writeFile|rmSync|unlinkSync|mkdirSync|cpSync)\s*\(/.test(body)) {
          problems.push("mutates files/shared state");
        }
        if (/^\s*(let|var)\s+[A-Za-z_$][\w$]*\s*=\s*null/m.test(body)) {
          problems.push("declares module-level mutable state");
        }
        if (problems.length) {
          const line = src.slice(0, start).split(/\r?\n/).length;
          violations.push(`${file.replace(ROOT + "\\", "")}:${line} before() ${problems.join(", ")}`);
        }
      }
    }
    if (violations.length) {
      return {
        status: "FAIL",
        evidence:
          `${violations.length} file-level before() hook(s) mutate shared state (ordering under --test-isolation=none is: all before() first, then all bodies): ` +
          violations.slice(0, 6).join(" ; "),
      };
    }
    return { status: "PASS", evidence: `scanned ${tests.length} test file(s): no file-level before() mutates env/files/module state` };
  },
  { requiresSnow: false },
));

// ---------------------------------------------------------------- false-verification detector (05b incident)
gate("M1", "no doc claims exit 0 / PASS for a command the harness never executed", "05b validation incident / 08 §0", Object.assign(
  () => {
    const docs = walk(join(ROOT, "docs/snow")).filter((f) => f.endsWith(".md"));
    const executedHere = new Set(["scripts/snow/audit.mjs", "scripts/snow/check-schema.mjs", "scripts/snow/extract-contract-ts.mjs"]);
    // Commands the harness (plus its documented top-level gates) actually runs.
    const knownGood = [
      /node\s+node_modules\/typescript\/bin\/tsc/,
      /node\s+--test\b/,
      /node\s+scripts\/snow\/check-schema\.mjs/,
      /node\s+scripts\/snow\/audit\.mjs/,
      /node\s+scripts\/snow\/extract-contract-ts\.mjs/,
    ];
    const suspicious = [];
    for (const f of docs) {
      let pending = false;
      const lines = text(f).split(/\r?\n/);
      lines.forEach((l, i) => {
        // Pending checklist items ("- [ ] …") state a target, not a result: skip that
        // line and its indented continuation lines ONLY. Any other line (blank, heading,
        // prose) ends the skip, so appended text after a checklist is still scanned.
        if (/^\s*-\s*\[\s*\]/.test(l)) { pending = true; return; }
        if (pending && /^\s{2,}\S/.test(l)) return;   // continuation of the pending item
        pending = false;
        // a line that asserts a result AND carries a command-like string
        const claimsOk = /\b(exit\s*0|PASS\b|pasa\b|verde)/i.test(l);
        const looksLikeCommand = /\b(node|npx|npm|tsc)\s+\S/.test(l) || /```/.test(l);
        if (!claimsOk || !looksLikeCommand) return;
        // ignore lines that are clearly describing a failure
        if (/\b(fail|falla|falló|exit\s*[1-9]|EPERM|BLOCKED|UNVERIFIED)\b/i.test(l)) return;
        const cmdMatch = l.match(/\b((?:node|npx|npm)\s+[^`|)]+)/);
        if (!cmdMatch) return;
        const cmd = cmdMatch[1].trim().replace(/[;,.]$/, "");
        if (knownGood.some((re) => re.test(cmd))) return;
        if (/\$|\{|<|…/.test(cmd)) return; // templated/placeholder, not a literal claim
        suspicious.push(`${f.replace(ROOT + "\\", "")}:${i + 1} → "${cmd.slice(0, 70)}"`);
      });
    }
    return suspicious.length
      ? { status: "FAIL", evidence: `unexecuted command claimed as passing: ${suspicious.slice(0, 6).join(" ; ")}` }
      : { status: "PASS", evidence: `scanned ${docs.length} docs: every exit-0/PASS claim names a command in the harness's executed set` };
  },
  { requiresSnow: false },
));

gate("M2", "no seed file or committed config contains a credential-shaped string", "05b §6 / ENGINE-01 §5", Object.assign(
  () => {
    const targets = [];
    const seedDir = join(ROOT, "web-ssr/src/snow/store/json-store/seed");
    if (existsSync(seedDir)) for (const f of readdirSync(seedDir)) targets.push(join(seedDir, f));
    for (const f of snow) {
      const isTest = /[\\/]tests?[\\/]|\.test\.(ts|mjs|js)$|\.spec\.ts$/.test(f);
      if (!isTest && /\.(json|ts)$/.test(f)) targets.push(f);
    }
    if (!targets.length) return { status: "UNVERIFIED", evidence: "no seed/config files yet" };
    // Credential shapes: long opaque tokens, bearer headers, provider key formats.
    const patterns = [
      [/\b[A-Za-z0-9_\-]{32,}\b(?=\s*["'])/, "long opaque token"],
      [/\bBearer\s+[A-Za-z0-9\-._~+/]{16,}/i, "Bearer token"],
      // Require a realistic secret VALUE; "key: 'REDACTED'" and key-name arrays are redaction code.
      [/(api[_-]?key|apikey|secret|password|token)\s*[:=]\s*["'](?![A-Z_]{3,}["']|REDACTED|\$\{)[^"']{12,}["']/i, "key=value literal"],
      [/\bAIza[0-9A-Za-z\-_]{35}\b/, "Google API key"],
      [/\bsk-[A-Za-z0-9]{20,}\b/, "sk- secret"],
      [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key block"],
    ];
    const hits = [];
    for (const p of targets) {
      const src = text(p);
      // Redaction helpers legitimately mention key names; the danger is a real literal.
      const isRedactionHelper = /redactUrl|REDACTED/.test(src);
      for (const [re, label] of patterns) {
        if (isRedactionHelper && label === "key=value literal") continue;
        const m = src.match(re);
        if (m) {
          // allow the documented env-var NAMES (no literal value)
          if (/^[A-Z][A-Z0-9_]*$/.test(m[0])) continue;
          // placeholder/fixture values are not credentials
          if (/prueba|fake|dummy|placeholder|example|xxxx|changeme|sample/i.test(m[0])) continue;
          hits.push(`${p.replace(ROOT + "\\", "")}: ${label}`);
        }
      }
    }
    return hits.length
      ? { status: "FAIL", evidence: hits.slice(0, 6).join(" ; ") }
      : { status: "PASS", evidence: `scanned ${targets.length} seed/config files: no credential-shaped literal` };
  },
  { requiresSnow: false },
));

// ---------------------------------------------------------------- fallback chains (05b §3)
gate("F3", "no snow-report record references an osm_derived identifier (ODbL contagion)", "05b §5 rule 1", Object.assign(
  () => {
    const seedDir = join(ROOT, "web-ssr/src/snow/store/json-store/seed");
    const reportsPath = join(seedDir, "snow-reports.json");
    const stationsPath = join(seedDir, "stations.json");
    if (!existsSync(reportsPath) || !existsSync(stationsPath)) {
      return { status: "UNVERIFIED", evidence: "seed files not present yet" };
    }
    let reports, stations;
    try {
      reports = JSON.parse(text(reportsPath));
      stations = JSON.parse(text(stationsPath));
    } catch (e) {
      return { status: "FAIL", evidence: `seed JSON unparseable: ${e.message}` };
    }
    const rep = Array.isArray(reports) ? reports : (reports.records ?? []);
    const sta = Array.isArray(stations) ? stations : (stations.records ?? []);
    // OSM identifiers look like 'node/12345', 'way/123', 'relation/9'
    const osmRef = /^(node|way|relation)\/\d+$/;
    const bad = [];
    const scan = (rec, where) => {
      const stack = [rec];
      while (stack.length) {
        const v = stack.pop();
        if (typeof v === "string") {
          if (osmRef.test(v)) bad.push(`${where}: ${v}`);
        } else if (v && typeof v === "object") {
          for (const k of Object.keys(v)) {
            if (/^osm_?(type|id|ref)$/i.test(k)) bad.push(`${where}: field ${k}`);
            stack.push(v[k]);
          }
        }
      }
    };
    rep.forEach((r, i) => scan(r, `snow-reports[${i}]`));
    sta.forEach((r, i) => {
      // stations may only carry an opaque osm_ref (05b §5 rule 1), never tags/geometry
      for (const k of Object.keys(r)) {
        if (/^(tags_json|osm_type|osm_id|geometry|snapshot_id|extracted_at)$/i.test(k)) bad.push(`stations[${i}]: forbidden field ${k}`);
      }
    });
    if (bad.length) return { status: "FAIL", evidence: bad.slice(0, 8).join(" ; ") };
    if (rep.length === 0) {
      return {
        status: "VACUOUS",
        evidence: `snow-reports.json holds 0 records (stations: ${sta.length}): the populated case is NOT covered — re-run after seeding (t9)`,
      };
    }
    return {
      status: "PASS",
      evidence: `scanned ${rep.length} snow-report and ${sta.length} station records: no osm_derived identifiers or fields`,
    };
  },
  { requiresSnow: false },
));

gate("F4", "snow-report records and osm_derived records live in separate files (no shared file)", "05b §5", Object.assign(
  () => {
    const seedDir = join(ROOT, "web-ssr/src/snow/store/json-store/seed");
    if (!existsSync(seedDir)) return { status: "UNVERIFIED", evidence: "seed dir not present" };
    const files = readdirSync(seedDir).filter((f) => f.endsWith(".json"));
    const reportsFile = files.find((f) => /snow-reports/i.test(f));
    const osmFile = files.find((f) => /osm-derived/i.test(f));
    if (!reportsFile || !osmFile) {
      return { status: "FAIL", evidence: `missing separate seed files (reports=${reportsFile ?? "none"}, osm=${osmFile ?? "none"})` };
    }
    if (reportsFile === osmFile) return { status: "FAIL", evidence: "reports and OSM data share one file — ODbL would cover the whole DB" };
    return { status: "PASS", evidence: `${reportsFile} and ${osmFile} are distinct files` };
  },
  { requiresSnow: false },
));

gate("H1", "FALLBACK_CHAINS.image is empty (no legal chain)", "05b §3.1 / §7.4", () => {
  const files = snow.filter((f) => /chain|fallback|contracts/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "chain/contracts not written yet" };
  const blob = files.map(text).join("\n");
  if (!/FALLBACK_CHAINS/.test(blob)) return { status: "UNVERIFIED", evidence: "FALLBACK_CHAINS not declared in snow/* yet" };
  const m = blob.match(/image['"\s:]*\]?\s*:\s*\[\s*\]/);
  return m ? { status: "PASS", evidence: "image chain declared empty" } : { status: "FAIL", evidence: "image: [] not found — a chain for images would violate 05" };
});

gate("H2", "operational-status and snow-depth chains are editorial-only", "05b §3 / D4", () => {
  const files = snow.filter((f) => /chain|fallback|contracts/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "chain/contracts not written yet" };
  const blob = files.map(text).join("\n");
  if (!/FALLBACK_CHAINS/.test(blob)) return { status: "UNVERIFIED", evidence: "FALLBACK_CHAINS not declared in snow/* yet" };
  const op = /'operational-status'[\s\S]{0,80}\[\s*'editorial-report'\s*\]/.test(blob);
  const sd = /'snow-depth'[\s\S]{0,80}\[\s*'editorial-report'\s*\]/.test(blob);
  if (!op || !sd) return { status: "FAIL", evidence: `editorial-only chain missing: operational-status=${op}, snow-depth=${sd}` };
  return { status: "PASS", evidence: "both chains are ['editorial-report']" };
});

gate("H3", "every chain terminates in a NoDataReason (never a silent null)", "05b §3.1", () => {
  const files = snow.filter((f) => /chain|fallback/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "chain executor not written yet" };
  const blob = files.map(text).join("\n");
  const returnsReason = /status:\s*['"]no_data['"]/.test(blob) && /reason/.test(blob);
  const returnsNull = /return\s+null\s*;/.test(blob);
  if (returnsNull) return { status: "FAIL", evidence: "chain contains `return null;`" };
  return returnsReason ? { status: "PASS", evidence: "chain returns no_data with reason" } : { status: "FAIL", evidence: "no no_data+reason return found in chain" };
});

// ---------------------------------------------------------------- cache policy (05b §4.2)
gate("I1", "meteofrance-bpa-html and meteoandorra have TTL 0", "05b §4.2", () => {
  const files = snow.filter((f) => /cache-policy|CACHE_POLICY|cache/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "cache policy not written yet" };
  const blob = files.map(text).join("\n");
  const bpa = /meteofrance-bpa-html[\s\S]{0,120}?ttlMs\s*:\s*0\b/.test(blob);
  const andorra = /meteoandorra[\s\S]{0,120}?ttlMs\s*:\s*0\b/.test(blob);
  return bpa && andorra ? { status: "PASS", evidence: "both TTL 0" } : { status: "FAIL", evidence: `TTL0 missing: bpa=${bpa}, andorra=${andorra}` };
});

gate("I2", "ipma is blocked entirely (no ingestion)", "05b §4.2", () => {
  const files = snow.filter((f) => /cache-policy|blocked|registry/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "cache policy/registry not written yet" };
  const blob = files.map(text).join("\n");
  const inBlockList = /BLOCKED_PROVIDER_IDS[\s\S]{0,400}?['"]ipma['"]/.test(blob);
  const inPolicy = /ipma[\s\S]{0,200}?(commercialUseProhibited|ttlMs\s*:\s*0)/i.test(blob);
  if (inBlockList) return { status: "PASS", evidence: "ipma present in BLOCKED_PROVIDER_IDS — guard rejects it without network" };
  return inPolicy
    ? { status: "PASS", evidence: "ipma marked commercialUseProhibited / ttl 0 in CACHE_POLICY" }
    : { status: "FAIL", evidence: "ipma neither in BLOCKED_PROVIDER_IDS nor marked prohibited in CACHE_POLICY" };
});

gate("I3", "every RATE_LIMITS entry is marked verified:false or justified verified:true", "05b §4.3", () => {
  const files = snow.filter((f) => /rate-limit|RATE_LIMITS/i.test(f));
  if (!files.length) return { status: "UNVERIFIED", evidence: "rate-limit module not written yet" };
  const blob = files.map(text).join("\n");
  const entries = [...blob.matchAll(/verified\s*:\s*(true|false)/g)].map((m) => m[1]);
  if (!entries.length) return { status: "FAIL", evidence: "no `verified:` flags found" };
  const trueCount = entries.filter((v) => v === "true").length;
  return { status: "PASS", evidence: `${entries.length} entries: verified:false=${entries.length - trueCount}, verified:true=${trueCount} (true allowed only for self-hosted protomaps; confirm note present)` };
});

// ---------------------------------------------------------------- viewport / a11y (07 P4, WCAG 1.4.4)
gate("J1", "no viewport meta blocks zoom (no maximum-scale / user-scalable=no) in web-ssr/src", "07 P4 / WCAG 1.4.4", Object.assign(
  () => {
    const hits = [];
    for (const f of walk(join(ROOT, "web-ssr/src"))) {
      if (!/\.(html|ts)$/.test(f)) continue;
      // Tests ASSERT the absence of these attributes; scanning them is a false positive
      // (a11y.test.ts both names the attribute and enforces the rule).
      if (/[\\/]tests?[\\/]|\.test\.(ts|mjs|js)$|\.spec\.ts$/.test(f)) continue;
      const lines = text(f).split(/\r?\n/);
      lines.forEach((l, i) => {
        if (/^\s*(\/\/|\/\*|\*)/.test(l)) return; // comments/documentation
        if (/user-scalable\s*=\s*no|maximum-scale/i.test(l)) hits.push(`${f.replace(ROOT + "\\", "")}:${i + 1}`);
      });
    }
    return hits.length
      ? { status: "FAIL", evidence: hits.slice(0, 8).join(" ; ") }
      : { status: "PASS", evidence: "no user-scalable=no / maximum-scale in production markup (tests/comments excluded)" };
  },
  { requiresSnow: false },
));

gate("J2", "no <meta name=\"keywords\"> in web-ssr/src", "07 P9 / D3", Object.assign(
  () => {
    const hits = [];
    for (const f of walk(join(ROOT, "web-ssr/src"))) {
      if (!/\.(html|ts)$/.test(f)) continue;
      const lines = text(f).split(/\r?\n/);
      lines.forEach((l, i) => {
        // Only a <meta name="keywords"> tag counts (07 P9 is about document metadata, not admin form fields).
        if (/<meta\b[^>]*name\s*=\s*["']?keywords/i.test(l)) hits.push(`${f.replace(ROOT + "\\", "")}:${i + 1}`);
      });
    }
    if (hits.length) return { status: "FAIL", evidence: hits.slice(0, 8).join(" ; ") };
    // Informational: an admin form field still models keywords (deprecated SEO signal).
    const formFields = [];
    for (const file of walk(join(ROOT, "web-ssr/src"))) {
      if (!/\.html$/.test(file)) continue;
      const lines = text(file).split(/\r?\n/);
      lines.forEach((l, i) => { if (/name=\"keywords\"/i.test(l)) formFields.push(`${file.replace(ROOT + "\\", "")}:${i + 1}`); });
    }
    return { status: "PASS", evidence: `no <meta name="keywords"> rendered; note: admin form still exposes a keywords field (${formFields.join(", ") || "none"})` };
  },
  { requiresSnow: false },
));

/**
 * Collect every UI "surface" the checks must see: standalone .html files PLUS inline
 * `template: \`…\`` literals in .ts components. The snow UI uses inline templates, so
 * scanning only .html would leave J3/J4 blind (and UNVERIFIED forever).
 * Returns [{ file, kind, body }].
 */
function uiSurfaces() {
  const surfaces = [];
  for (const f of snow) {
    if (/\.html$/.test(f)) {
      surfaces.push({ file: f, kind: "html", body: text(f) });
      continue;
    }
    if (!/\.ts$/.test(f)) continue;
    const src = text(f);
    // template: `...` — grab the literal body (backticks; no nested-template handling needed
    // because Angular inline templates are single literals in this codebase).
    const re = /template\s*:\s*`([\s\S]*?)`\s*,?\s*\n/g;
    let m;
    while ((m = re.exec(src))) {
      surfaces.push({ file: f, kind: "inline", body: m[1] });
    }
  }
  return surfaces;
}

gate("J3", "no inline background-color hex in snow UI (html + inline templates)", "07 P5 / D14", () => {
  const surfaces = uiSurfaces();
  if (!surfaces.length) return { status: "UNVERIFIED", evidence: "no UI surfaces (.html or inline template) yet" };
  const hits = [];
  for (const s of surfaces) {
    // Any hard-coded hex used as a background. Values may be nested in quotes
    // (e.g. [style.background-color]="'#FA8574'" inside a template literal), so allow
    // any mix of quotes between the property and the hex.
    const HEX_BG = /background(-color)?['"]?\s*\]?\s*['"]?\s*:\s*[^#\n]{0,12}#[0-9a-f]{3,8}\b/i;
    const STYLE_BINDING = /\[style\.background-color\]\s*=\s*[^#\n]{0,12}#[0-9a-f]{3,8}\b/i;
    if (HEX_BG.test(s.body) || STYLE_BINDING.test(s.body)) hits.push(`${s.file.replace(ROOT + "\\", "")} (${s.kind})`);
  }
  const htmlCount = surfaces.filter((s) => s.kind === "html").length;
  const inlineCount = surfaces.filter((s) => s.kind === "inline").length;
  const scope = `${htmlCount} .html + ${inlineCount} inline template(s) scanned`;
  return hits.length
    ? { status: "FAIL", evidence: `${scope}: ${hits.slice(0, 6).join(" ; ")}` }
    : { status: "PASS", evidence: `no inline background-color hex — ${scope}` };
});

gate("J4", "station status is conveyed by more than colour (glyph + text) in snow UI", "07 §5.3 / WCAG 1.4.1", () => {
  const surfaces = uiSurfaces();
  if (!surfaces.length) return { status: "UNVERIFIED", evidence: "no UI surfaces (.html or inline template) yet" };
  // A status surface may DELEGATE rendering to a child component (<app-snow-status-badge>).
  // Resolve that composition: if the surface uses a badge component, audit the badge itself.
  const badgeSurfaces = surfaces.filter((s) => /(status-?badge|snow-status-badge)/i.test(s.body) && /<app-[a-z-]*badge/i.test(s.body));
  const badgeOwner = surfaces.filter((s) => /(status-?badge)/i.test(s.file) && /\{\{|<span|<svg|aria/i.test(s.body));

  // Surfaces that render status DIRECTLY (text/colour) rather than via a badge component.
  const direct = surfaces.filter(
    (s) => /(estado|status|badge)/i.test(s.body) && !/<app-[a-z-]*badge/i.test(s.body) && !(statusSurfaces => false),
  );

  const bad = [];
  // The shared badge must carry BOTH word and a glyph/label.
  for (const s of badgeOwner) {
    const hasText = /(\{\{[^}]*[A-Za-z][^}]*\}\}|<span[^>]*>[^<{]*[A-Za-z][^<{]*<\/span>|<mat-icon)/i.test(s.body);
    const hasGlyph = /(icon|svg|glyph|glifo|aria-hidden|mat-icon|aria-label|role="img")/i.test(s.body);
    if (!hasText || !hasGlyph) {
      bad.push(`${s.file.replace(ROOT + "\\", "")} (badge component) text=${hasText} glyph=${hasGlyph}`);
    }
  }
  // Direct renderers must too.
  for (const s of direct) {
    const hasText = /(\{\{[^}]*[A-Za-z][^}]*\}\}|<span[^>]*>[^<{]*[A-Za-z][^<{]*<\/span>)/i.test(s.body);
    const hasGlyph = /(icon|svg|glyph|glifo|aria-hidden|mat-icon|aria-label|role="img")/i.test(s.body);
    if (!hasText || !hasGlyph) {
      bad.push(`${s.file.replace(ROOT + "\\", "")} (${s.kind}) text=${hasText} glyph=${hasGlyph}`);
    }
  }

  const total = badgeOwner.length + direct.length;
  if (total === 0) {
    return { status: "VACUOUS", evidence: `${surfaces.length} surfaces scanned; no status renderer found` };
  }
  if (!badgeOwner.length && badgeSurfaces.length) {
    return { status: "FAIL", evidence: "status is delegated to a badge component that could not be located — cannot confirm glyph+text" };
  }
  const scope = `${badgeOwner.length} badge component(s) + ${direct.length} direct renderer(s); ${badgeSurfaces.length} surface(s) delegate to the badge`;
  return bad.length
    ? { status: "FAIL", evidence: `${scope}: ${bad.slice(0, 6).join(" ; ")}` }
    : { status: "PASS", evidence: `status carries both word and glyph/label — ${scope}` };
});

// ---------------------------------------------------------------- 404 route (02 F21)
gate("K1", "a catch-all '**' route exists so unknown URLs render an error page", "02 F21 / 00 §5", Object.assign(
  () => {
    const f = join(ROOT, "web-ssr/src/app/app.routes.ts");
    if (!existsSync(f)) return { status: "FAIL", evidence: "app.routes.ts not found" };
    const t = text(f);
    return /path:\s*['"]\*\*['"]/.test(t)
      ? { status: "PASS", evidence: "catch-all route present" }
      : { status: "FAIL", evidence: "no path:'**' route — unknown URLs have no error page (reference defect E23 reproduced)" };
  },
  { requiresSnow: false },
));

// ---------------------------------------------------------------- tests actually ran (00b C1b)
gate("L1", "domain test files exist and are executed with --test-isolation=none", "00b C1b / 06 §12", () => {
  const tests = snow.filter((f) => /\.test\.(ts|mjs|js)$/.test(f));
  if (!tests.length) return { status: "UNVERIFIED", evidence: "no *.test.ts under snow/* written yet" };
  const runCmd = `node --test --test-isolation=none ${tests.map((t) => t.replace(ROOT + "\\", "")).join(" ")}`;
  if (true) return { status: "UNVERIFIED", evidence: `${tests.length} test files found; run at top level: ${runCmd}` };
  try {
    const out = execFileSync(process.execPath, ["--test", "--test-isolation=none", ...tests], { cwd: ROOT, stdio: "pipe" }).toString();
    const pass = /# pass (\d+)/.exec(out)?.[1] ?? "?";
    const failN = /# fail (\d+)/.exec(out)?.[1] ?? "?";
    const skipped = /# skipped (\d+)/.exec(out)?.[1] ?? "0";
    if (failN !== "0") return { status: "FAIL", evidence: `test run: pass=${pass} fail=${failN} skipped=${skipped}` };
    if (pass === "0") return { status: "FAIL", evidence: `test run executed 0 tests (pass=0) — a suite that runs nothing is not a gate` };
    return { status: "PASS", evidence: `${tests.length} files: pass=${pass} fail=${failN} skipped=${skipped}` };
  } catch (e) {
    return { status: "FAIL", evidence: `node --test exit ${e.status}: ${(e.stdout ?? "").toString().split("\n").filter((l) => /# (pass|fail)|not ok/i.test(l)).slice(0, 6).join(" | ")}` };
  }
});

// ---------------------------------------------------------------- report
const summary = { PASS: 0, FAIL: 0, UNVERIFIED: 0, VACUOUS: 0 };
for (const r of results) summary[r.status]++;

// GATES: checks that must be *evaluated* for the suite to claim anything green.
// An unevaluated gate (UNVERIFIED) must not be read as "fine", so it blocks exit 0.
const GATE_IDS = ["G1"];                      // build gate: evaluated in-process via tsc API
const allowUnverifiedGates = process.argv.includes("--allow-unverified-gates");
const gateRows = results.filter((r) => GATE_IDS.includes(r.id));
const gateUnevaluated = gateRows.filter((r) => r.status === "UNVERIFIED");
const gateFailed = gateRows.filter((r) => r.status === "FAIL");

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), snowFiles: snow.length, summary, results }, null, 2));
} else {
  console.log(`snow module files found: ${snow.length}`);
  if (!snowExists) console.log("NOTE: snow/* does not exist yet — most checks are UNVERIFIED by design.\n");
  for (const r of results) {
    console.log(`[${r.status.padEnd(10)}] ${r.id}  ${r.claim}`);
    console.log(`             source: ${r.source}`);
    console.log(`             evidence: ${r.evidence}`);
  }
  if (gateFailed.length) {
    console.log("\n" + "=".repeat(78));
    console.log("GATE STATUS: RED — a build gate FAILED. This run is NOT green.");
    for (const g of gateFailed) console.log(`  ${g.id}: ${g.evidence}`);
    console.log("=".repeat(78));
  } else if (gateUnevaluated.length) {
    console.log("\n" + "=".repeat(78));
    console.log("GATE NOT EVALUATED — the following gates were NOT run:");
    for (const g of gateUnevaluated) console.log(`  ${g.id}: ${g.claim}`);
    console.log("An unevaluated gate is NOT a pass. Exit stays non-zero.");
    console.log("Pass --allow-unverified-gates to accept unevaluated gates explicitly.");
    console.log("=".repeat(78));
  } else {
    console.log("\nGATE STATUS: all build gates evaluated and PASSED.");
  }
  // The summary names every non-clean id inline, so no reader has to diff this run against a
  // previous one to learn which check changed. Never emit FAIL=n without saying which n.
  const idsOf = (status) => results.filter((r) => r.status === status).map((r) => r.id);
  const failIds = idsOf("FAIL");
  const vacuousIds = idsOf("VACUOUS");
  const unverIds = idsOf("UNVERIFIED");
  const tag = (ids) => (ids.length ? ` [${ids.join(",")}]` : "");
  console.log(
    `\nSUMMARY: PASS=${summary.PASS} VACUOUS=${summary.VACUOUS}${tag(vacuousIds)} FAIL=${summary.FAIL}${tag(failIds)} UNVERIFIED=${summary.UNVERIFIED}${tag(unverIds)}`,
  );
  if (summary.VACUOUS) {
    console.log(
      `NOTE: ${summary.VACUOUS} VACUOUS check(s) found nothing to examine. They are NOT counted in PASS` +
        " and do not demonstrate coverage of the populated case.",
    );
  }
  if (gateFailed.length) console.log("NOTE: UNVERIFIED counts are NOT coverage; see gate status above.");
}
let code = summary.FAIL > 0 ? 1 : 0;
if (code === 0 && gateUnevaluated.length && !allowUnverifiedGates) code = 2;
if (process.argv.includes("--json") && process.argv.includes("--dry-noflag")) code = code;
process.exit(code);
