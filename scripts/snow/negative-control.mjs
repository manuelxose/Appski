/**
 * Negative control: prove the detectors CAN fail when violated.
 *
 * SCOPE — read before citing a green result:
 *   A pass here proves **detection capability**: the check is not inert. It proves
 *   NOTHING about current coverage, because every case INJECTS the violation first.
 *   "The F3 detector works" and "today's data satisfies F3" are different claims.
 *   Current coverage is the audit's own PASS/VACUOUS count, not this script.
 *
 * Runs the audit IN-PROCESS (child_process is EPERM in this sandbox) against a mutable
 * copy of the tree. Each case injects one violation and asserts the check flips to FAIL.
 *
 * usage: node scripts/snow/negative-control.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { chdir } from "node:process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const WORK = join(ROOT, "tmp/negctl");

const cases = [
  {
    id: "F3",
    name: "snow-report referencing an osm_derived id",
    mutate: (d) => {
      const p = join(d, "web-ssr/src/snow/store/json-store/seed/snow-reports.json");
      const j = JSON.parse(readFileSync(p, "utf8"));
      j.records = [{ stationSlug: "baqueira-beret", osmId: "node/12345" }];
      writeFileSync(p, JSON.stringify(j));
    },
  },
  {
    id: "A2",
    name: "hyphenated identifier 'operador-1' must NOT be flagged (false-positive guard)",
    // INVERSE case: the check must stay PASS.
    expect: "PASS",
    mutate: (d) => {
      const p = join(d, "web-ssr/src/snow/providers/provenance.ts");
      writeFileSync(p, readFileSync(p, "utf8") + "\nexport const fixtureName = { author: 'operador-1' };\n");
    },
  },
  {
    id: "A2b",
    name: "empty-string author at an editorial boundary",
    mutate: (d) => {
      const p = join(d, "web-ssr/src/snow/models/snow-report.ts");
      writeFileSync(p, readFileSync(p, "utf8") + "\nexport const badReport = { author: '', sourceUrl: 'https://x.example/r' };\n");
    },
  },
  {
    id: "A2b",
    name: "numeric 0 used as a stand-in for a missing capturedAt",
    mutate: (d) => {
      const p = join(d, "web-ssr/src/snow/models/snow-report.ts");
      writeFileSync(p, readFileSync(p, "utf8") + "\nexport const badReport2 = { capturedAt: 0 };\n");
    },
  },
  {
    id: "O1",
    name: "file-level before() deleting SNOW_ADMIN_TOKEN (the QA contamination scenario)",
    mutate: (d) => {
      const dir = join(d, "web-ssr/src/snow/tests");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "contamination-probe.test.ts"),
        [
          "import { before, deleteProcessEnvShim } from 'node:test';",
          "before(() => {",
          "  delete process.env['SNOW_ADMIN_TOKEN'];",
          "});",
          "",
        ].join("\n"),
      );
    },
  },
  {
    id: "O1",
    name: "beforeEach (test-scoped) mutating env must NOT be flagged",
    expect: "PASS",
    mutate: (d) => {
      const dir = join(d, "web-ssr/src/snow/tests");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "scoped-hook.test.ts"),
        ["import { beforeEach } from 'node:test';", "beforeEach(() => {", "  process.env['SNOW_ADMIN_TOKEN'] = 'x';", "});", ""].join("\n"),
      );
    },
  },
  {
    id: "J3",
    name: "inline template with a hard-coded background-color hex",
    mutate: (d) => {
      const dir = join(d, "web-ssr/src/app/snow/pages/probe");
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "probe.component.ts"),
        [
          "import { Component } from '@angular/core';",
          "@Component({",
          "  selector: 'app-probe',",
          "  standalone: true,",
          "  template: `<div [style.background-color]=\"'#FA8574'\">x</div>`,",
          "})",
          "export class ProbeComponent {}",
          "",
        ].join("\n"),
      );
    },
  },
  {
    id: "J4",
    name: "status badge with colour only (no glyph, no label)",
    mutate: (d) => {
      const p = join(d, "web-ssr/src/app/snow/client/ui/status-badge.component.ts");
      writeFileSync(
        p,
        [
          "import { Component } from '@angular/core';",
          "@Component({",
          "  selector: 'app-snow-status-badge',",
          "  standalone: true,",
          "  template: `<span class=\"dot\"></span>`,",
          "})",
          "export class SnowStatusBadgeComponent {}",
          "",
        ].join("\n"),
      );
    },
  },
  {
    id: "M2",
    name: "credential literal in a seed file",
    mutate: (d) => {
      const p = join(d, "web-ssr/src/snow/store/json-store/seed/stations.json");
      const j = JSON.parse(readFileSync(p, "utf8"));
      j.apiKey = "AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI";
      writeFileSync(p, JSON.stringify(j, null, 2));
    },
  },
  {
    id: "M1",
    name: "doc claiming exit 0 for a command nobody ran",
    mutate: (d) => {
      const p = join(d, "docs/snow/02-feature-matrix.md");
      writeFileSync(p, readFileSync(p, "utf8") + "\n\nEl comando `npx some-fake-tool --verify` exit 0.\n");
    },
  },
  {
    id: "A1",
    name: "?? 0 in a snow measurement path",
    mutate: (d) => {
      const p = join(d, "web-ssr/src/snow/models/dto.ts");
      writeFileSync(p, readFileSync(p, "utf8") + "\nexport const bad = (x: number | null) => (x ?? 0) + 1;\n");
    },
  },
  {
    id: "H1",
    name: "image fallback chain made non-empty",
    mutate: (d) => {
      const p = join(d, "web-ssr/src/snow/chain/fallback-chains.ts");
      let s = readFileSync(p, "utf8");
      s = s.replace(/image:\s*\[\s*\]/, "image: ['feratel']");
      s = s.replace(/'image'\s*:\s*\[\s*\]/, "'image': ['feratel']");
      writeFileSync(p, s);
    },
  },
];

/** Run the audit against dir, capturing its JSON output. */
async function runAuditIn(dir) {
  const prev = process.cwd();
  chdir(dir);
  try {
    // Fresh module instance each time so module-level state doesn't leak.
    const url = pathToFileURL(join(dir, "scripts/snow/audit.mjs")).href + "?v=" + Date.now();
    const mod = await import(url);
    return mod.default ?? mod.results ?? null;
  } finally {
    chdir(prev);
  }
}

// The audit currently prints instead of exporting; capture stdout instead.
async function captureFresh(dir) {
  const prev = process.cwd();
  const origLog = console.log;
  const origExit = process.exit;
  let buf = "";
  console.log = (...a) => { buf += a.join(" ") + "\n"; };
  process.exit = () => {};
  chdir(dir);
  try {
    const url = pathToFileURL(join(dir, "scripts/snow/audit.mjs")).href + "?v=" + Date.now() + Math.random();
    await import(url);
  } catch (e) {
    buf += `\nAUDIT_THREW: ${e.message}\n`;
  } finally {
    chdir(prev);
    console.log = origLog;
    process.exit = origExit;
  }
  return buf;
}

let failures = 0;
for (const c of cases) {
  if (existsSync(WORK)) rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  for (const sub of ["web-ssr/src/snow", "docs/snow", "scripts/snow", "web-ssr/src/app"]) {
    const from = join(ROOT, sub);
    if (existsSync(from)) cpSync(from, join(WORK, sub), { recursive: true });
  }
  c.mutate(WORK);
  const out = await captureFresh(WORK);
  const line = out.split("\n").find((l) => l.includes(`] ${c.id} `)) ?? "";
  const observed = (line.match(/\[(PASS|FAIL|VACUOUS|UNVERIFIED)\s*\]/) ?? [])[1] ?? "?";
  const expected = c.expect ?? "FAIL";
  const flipped = observed === expected;
  console.log(`${flipped ? "OK  " : "MISS"} ${c.id} (${c.name}) [expected ${expected}, got ${observed}]`);
  if (line) console.log(`     ${line.trim().slice(0, 120)}`);
  else console.log(`     (no ${c.id} line in audit output)\n     ${out.split("\n").slice(0, 3).join(" / ")}`);
  if (!flipped) failures++;
  rmSync(WORK, { recursive: true, force: true });
}
console.log(
  failures === 0
    ? "NEGATIVE CONTROL: all injected violations detected"
    : `NEGATIVE CONTROL: ${failures} check(s) failed to detect a violation`,
);
process.exit(failures === 0 ? 0 : 1);
