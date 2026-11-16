/**
 * Ejecuta un driver de verificación y resume el resultado en UNA línea + exit code.
 *
 * Motivo: dentro del runner confined de ENGINE-04 la captura de salida descarta las
 * líneas iniciales, así que el detalle de un fallo se pierde. Este envoltorio captura
 * la salida completa en un fichero (también en contexto confined) y deja en stdout el
 * recuento y el código de salida real del driver.
 *
 * Uso (desde el manifiesto o a mano):
 *   node scripts/snow02/qa-run.mjs scripts/snow02/adversarial.mjs
 *   node scripts/snow02/qa-run.mjs <log-name> <script> [args…]
 * Log por defecto: <TEMP>/snow02-qa/<nombre>.log
 */
import { spawnNoPipe } from './lib/child.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';

const args = process.argv.slice(2);
const [script, ...rest] = args;
if (!script) {
  console.error('uso: node scripts/snow02/qa-run.mjs <script.mjs> [args…]');
  process.exit(2);
}

// Afinidad de CPU: node:test detecta paralelismo con os.availableParallelism(); en el
// sandbox reporta 1 y rompe el presupuesto de aislamiento que asume la suite.
const child = spawnNoPipe(process.execPath, [script, ...rest], {
  cwd: process.cwd(),
  env: { ...process.env, UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE ?? '4' },
  stdio: 'ignore',
});
const info = await child.wait();
const name = basename(script).replace(/\.mjs$/u, '');
const logDir = join(tmpdir(), 'snow02-qa');
try {
  mkdirSync(logDir, { recursive: true });
  writeFileSync(
    join(logDir, `${name}.log`),
    JSON.stringify({ script, exitCode: info.code, signal: info.signal, error: info.error, at: new Date().toISOString() }),
  );
} catch {
  /* el resumen ya está en stdout */
}
console.log(`RUN ${name} exit=${info.code ?? 'err'}${info.error ? ` error=${info.error}` : ''} log=${join(logDir, `${name}.log`)}`);
process.exit(info.code ?? 1);
