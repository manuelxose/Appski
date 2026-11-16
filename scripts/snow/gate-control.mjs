/**
 * Negative controls for the GATE machinery — proves that a green summary with a red or
 * unevaluated build gate is impossible. Runs the audit in a copied tree (in-process, since
 * child_process is EPERM) and asserts the exit code / banner for each scenario.
 *
 * usage: node scripts/snow/gate-control.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync } from "node:fs";
import { chdir } from "node:process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const WORK = join(ROOT, "tmp/gatectl");

async function runAudit(dir, argv = []) {
  const prev = process.cwd();
  const origLog = console.log;
  const origExit = process.exit;
  const origArgv = process.argv;
  let buf = "";
  let exitCode = 0;
  console.log = (...a) => { buf += a.join(" ") + "\n"; };
  process.exit = (c) => { exitCode = c ?? 0; throw new Error("__EXIT__"); };
  process.argv = [process.execPath, "audit.mjs", ...argv];
  chdir(dir);
  try {
    const url = pathToFileURL(join(dir, "scripts/snow/audit.mjs")).href + "?v=" + Date.now() + Math.random();
    await import(url);
  } catch (e) {
    if (e.message !== "__EXIT__") buf += `\nAUDIT_THREW: ${e.message}\n`;
  } finally {
    chdir(prev);
    console.log = origLog;
    process.exit = origExit;
    process.argv = origArgv;
  }
  return { buf, exitCode };
}

function stage(mutate) {
  if (existsSync(WORK)) rmSync(WORK, { recursive: true, force: true });
  mkdirSync(WORK, { recursive: true });
  for (const sub of ["web-ssr/src/snow", "docs/snow", "scripts/snow", "web-ssr/src/app", "web-ssr"]) {
    const from = join(ROOT, sub);
    if (!existsSync(from)) continue;
    if (sub === "web-ssr") {
      const t = join(WORK, "web-ssr");
      mkdirSync(t, { recursive: true });
      for (const f of ["tsconfig.app.json", "tsconfig.json", "tsconfig.spec.json"]) {
        if (existsSync(join(from, f))) cpSync(join(from, f), join(t, f));
      }
      continue;
    }
    cpSync(from, join(WORK, sub), { recursive: true });
  }
  // TypeScript must be resolvable from the copied scripts dir.
  if (existsSync(join(ROOT, "node_modules/typescript"))) {
    mkdirSync(join(WORK, "node_modules"), { recursive: true });
    cpSync(join(ROOT, "node_modules/typescript"), join(WORK, "node_modules/typescript"), { recursive: true, dereference: true });
  }
  if (mutate) mutate(WORK);
}

let failures = 0;
const check = (label, cond, detail) => {
  console.log(`${cond ? "OK  " : "MISS"} ${label}${detail ? " — " + detail : ""}`);
  if (!cond) failures++;
};

// 1) As-is tree: build gate FAILS -> exit must be non-zero and banner RED.
stage();
let r = await runAudit(WORK);
check("red build → non-zero exit", r.exitCode !== 0, `exit=${r.exitCode}`);
check("red build → RED banner", /GATE STATUS: RED/.test(r.buf));
check("red build → G1 is FAIL (not UNVERIFIED)", /\[FAIL\s*\] G1/.test(r.buf));

// 2) Build gate cannot run at all (no toolchain): this must be FAIL (closed), never a pass.
stage((d) => {
  const f = join(d, "scripts/snow/typecheck-gate.mjs");
  writeFileSync(
    f,
    `export function runTypecheck() { return { ran: false, ok: false, reason: "simulated: no toolchain" }; }\n`,
  );
});
r = await runAudit(WORK);
check("unrunnable gate → non-zero exit", r.exitCode !== 0, `exit=${r.exitCode}`);
check("unrunnable gate → G1 is FAIL (closed), not UNVERIFIED", /\[FAIL\s*\] G1/.test(r.buf));
check("unrunnable gate → names the reason", /typecheck could not run|no toolchain/.test(r.buf));

// 3) Pathological: a gate reported UNVERIFIED must still block exit 0 unless the caller opts in.
//    Restaged cleanly so no earlier mutation leaks into this scenario.
const forceGateUnverified = (d) => {
  // Stub the typecheck to succeed so the ONLY signal is the forced-UNVERIFIED gate.
  writeFileSync(
    join(d, "scripts/snow/typecheck-gate.mjs"),
    'export function runTypecheck() { return { ran: true, ok: true, exitCode: 0, summary: "stub", errors: [] }; }\n',
  );
  const auditPath = join(d, "scripts/snow/audit.mjs");
  let t = readFileSync(auditPath, "utf8");
  // Isolate the scenario: neutralise every non-gate FAIL so exit code reflects ONLY the gate rule.
  // (Otherwise a live-tree FAIL would mask whether the gate rule itself works.)
  t = t.replace(
    /const summary = \{ PASS: 0, FAIL: 0, UNVERIFIED: 0, VACUOUS: 0 \};/,
    'for (const __r of results) if (__r.id !== "G1" && __r.status === "FAIL") __r.status = "PASS";\n' +
      'const __g1 = results.find((x) => x.id === "G1"); if (__g1) __g1.status = "UNVERIFIED";\n' +
      'const summary = { PASS: 0, FAIL: 0, UNVERIFIED: 0, VACUOUS: 0 };',
  );
  if (!/const summary = \{ PASS: 0, FAIL: 0, UNVERIFIED: 0, VACUOUS: 0 \};/.test(readFileSync(auditPath, "utf8"))) {
    throw new Error("gate-control: could not find the summary initialiser to isolate the scenario");
  }
  writeFileSync(auditPath, t);
};
stage(forceGateUnverified);
r = await runAudit(WORK);
check("forced UNVERIFIED gate → exit 2 without flag", r.exitCode === 2, `exit=${r.exitCode}`);
check("forced UNVERIFIED gate → 'GATE NOT EVALUATED' banner", /GATE NOT EVALUATED/.test(r.buf));

stage(forceGateUnverified); // fresh tree: the previous run's mutation must not persist
r = await runAudit(WORK, ["--allow-unverified-gates"]);
check("forced UNVERIFIED gate + --allow-unverified-gates → exit 0", r.exitCode === 0, `exit=${r.exitCode}`);
check("opt-in still prints the warning", /GATE NOT EVALUATED/.test(r.buf));

rmSync(WORK, { recursive: true, force: true });
console.log(
  failures === 0
    ? "GATE CONTROL: a green summary with a red or unevaluated build gate is impossible"
    : `GATE CONTROL: ${failures} assertion(s) failed`,
);
process.exit(failures === 0 ? 0 : 1);
