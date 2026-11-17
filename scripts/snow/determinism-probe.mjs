// Determinism probe: run the audit N times in-process and report every differing result.
import { readFileSync } from "node:fs";
import { chdir } from "node:process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const N = Number(process.argv[2] ?? 10);

async function runOnce() {
  let buf = "";
  let code = 0;
  const oL = console.log, oE = process.exit, oA = process.argv;
  console.log = (...a) => { buf += a.join(" ") + "\n"; };
  process.exit = (c) => { code = c ?? 0; throw new Error("__EXIT__"); };
  process.argv = [process.execPath, "audit.mjs"];
  try {
    await import(pathToFileURL(join(ROOT, "scripts/snow/audit.mjs")).href + "?r=" + Math.random());
  } catch (e) {
    if (e.message !== "__EXIT__") buf += "THREW " + e.message;
  }
  console.log = oL; process.exit = oE; process.argv = oA;
  const rows = {};
  for (const l of buf.split("\n")) {
    const m = l.match(/^\[(PASS|FAIL|VACUOUS|UNVERIFIED)\s*\]\s+(\S+)/);
    if (m) rows[m[2]] = m[1];
  }
  const summary = (buf.match(/SUMMARY:.*/) ?? [""])[0];
  return { code, rows, summary, buf };
}

const runs = [];
for (let i = 0; i < N; i++) runs.push(await runOnce());

const codes = new Set(runs.map((r) => r.code));
console.log(`runs: ${N}; distinct exit codes: ${[...codes].join(",")}`);
const ids = Object.keys(runs[0].rows);
let unstable = 0;
for (const id of ids) {
  const vals = new Set(runs.map((r) => r.rows[id]));
  if (vals.size > 1) {
    unstable++;
    console.log(`UNSTABLE ${id}: ${[...vals].join(" | ")}`);
    for (const r of runs) if (r.rows[id] === "FAIL") {
      const line = r.buf.split("\n").find((l) => l.includes(`] ${id} `));
      const ev = r.buf.split("\n")[r.buf.split("\n").indexOf(line) + 2];
      console.log("   on FAIL: " + (ev ?? "").trim().slice(0, 200));
    }
  }
}
console.log(unstable === 0 && codes.size === 1 ? "DETERMINISTIC: identical status and exit code every run" : `NON-DETERMINISTIC: ${unstable} unstable check(s), ${codes.size} distinct exit codes`);
