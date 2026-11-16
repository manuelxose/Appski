/**
 * In-process TypeScript gate. Uses the compiler API directly, so no child process
 * is needed (child_process is EPERM in this sandbox — C1c). Equivalent to:
 *   node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit
 * Returns { ran, ok, exitCode, errors[], summary }.
 */
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);

export function runTypecheck({ root, project = "web-ssr/tsconfig.app.json" } = {}) {
  let ts;
  try {
    ts = require("typescript");
  } catch (e) {
    return { ran: false, ok: false, reason: `typescript package not resolvable: ${e.message}` };
  }

  const configPath = join(root, project);
  const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
  if (readResult.error) {
    return { ran: false, ok: false, reason: `cannot read ${project}: ${ts.flattenDiagnosticMessageText(readResult.error.messageText, " ")}` };
  }

  const parsed = ts.parseJsonConfigFileContent(
    readResult.config,
    ts.sys,
    join(root, "web-ssr"),
    undefined,
    configPath,
  );
  if (parsed.errors?.length) {
    const msg = parsed.errors
      .slice(0, 5)
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
      .join(" | ");
    return { ran: false, ok: false, reason: `config errors: ${msg}` };
  }

  const program = ts.createProgram(parsed.fileNames, { ...parsed.options, noEmit: true });
  const diagnostics = ts.getPreEmitDiagnostics(program);

  const errors = diagnostics.map((d) => {
    const msg = ts.flattenDiagnosticMessageText(d.messageText, " ");
    if (d.file && typeof d.start === "number") {
      const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
      const rel = d.file.fileName.replace(root + "\\", "").replace(root + "/", "").replace(/\\/g, "/");
      return `${rel}(${line + 1},${character + 1}): TS${d.code}: ${msg}`;
    }
    return `TS${d.code}: ${msg}`;
  });

  return {
    ran: true,
    ok: errors.length === 0,
    exitCode: errors.length === 0 ? 0 : 2,
    errors,
    summary: `${parsed.fileNames.length} files checked, ${errors.length} error(s)`,
    fileNames: parsed.fileNames.length,
  };
}
