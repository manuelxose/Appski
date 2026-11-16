// Reproduce the G1 flake: run the typecheck gate many times in one process and record
// failures verbatim. Any nondeterminism here is the delivery-gate flake.
import { runTypecheck } from "./typecheck-gate.mjs";

const N = Number(process.argv[2] ?? 12);
const codes = {};
const details = [];
for (let i = 0; i < N; i++) {
  const r = runTypecheck({ root: process.cwd() });
  const key = r.ran ? (r.ok ? "PASS" : "FAIL") : "UNRAN";
  codes[key] = (codes[key] ?? 0) + 1;
  if (key !== "PASS") details.push({ i, key, reason: r.reason, summary: r.summary, errs: (r.errors ?? []).slice(0, 4) });
}
console.log(JSON.stringify(codes));
for (const d of details.slice(0, 5)) console.log(JSON.stringify(d, null, 1));
console.log(Object.keys(codes).length === 1 && codes.PASS === N ? "DETERMINISTIC" : "NON-DETERMINISTIC");
