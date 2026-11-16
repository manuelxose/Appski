// Find relative imports that are VALUE imports (not `import type`) and lack a file extension.
// Those break Node's ESM resolver under type-stripping tests, even when tsc is happy.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith(".ts")) out.push(p);
  }
  return out;
}

const root = "web-ssr/src/snow";
const offenders = [];
for (const file of walk(root)) {
  const src = readFileSync(file, "utf8");
  const lines = src.split(/\r?\n/);
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(import|export)\s+(.*?)\s+from\s+['"](\.[^'"]*)['"]/);
    if (!m) return;
    const [, kind, clause, spec] = m;
    const isTypeOnly = /\btype\b/.test(clause) && /^(type\s|\{\s*type\b|\{\s*type )/.test(clause.trim()) ? true : /^type\s/.test(clause.trim());
    // `export *` / `export type *` and `import type` are erased at runtime.
    const erased = isTypeOnly || /^type\s/.test(clause.trim());
    if (erased) return;
    if (/\.(ts|js|json|mjs|cjs)$/.test(spec)) return;
    offenders.push({ file, line: i + 1, kind, spec, text: line.trim() });
  });
}
console.log(`VALUE imports without extension: ${offenders.length}`);
for (const o of offenders) console.log(`  ${o.file.replace(process.cwd() + "\\", "")}:${o.line}  ${o.text}`);
