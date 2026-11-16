/**
 * Diagnóstico del entorno confined de ENGINE-04 (etapa NO requerida del manifiesto).
 *
 * Objetivo: saber si la construcción de producción puede ocurrir DENTRO del sandbox.
 * Prueba, por separado y con la salida descartada (el runner confined deniega pipes):
 *   1. que un hijo Node se lance y termine (control),
 *   2. que Nx arranque (`show projects`),
 *   3. que el Angular CLI construya desde `web-ssr`,
 *   4. que el artefacto resultante exista.
 * Resultado: `CAP ...` en una línea y código de salida por bits (1 nx, 2 angular).
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();

const run = (args, cwd, timeoutMs = 600000) =>
  new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    try {
      const child = spawn(process.execPath, args, { cwd, stdio: 'ignore', windowsHide: true });
      const timer = setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          /* best effort */
        }
        done('timeout');
      }, timeoutMs);
      child.on('error', (error) => {
        clearTimeout(timer);
        done(`ERR:${error?.code ?? error}`);
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        done(code);
      });
    } catch (error) {
      done(`ERR:${error?.code ?? error}`);
    }
  });

const control = await run(['-e', 'process.exit(0)'], ROOT, 30000);
const nx = await run(['node_modules/nx/bin/nx.js', 'show', 'projects', '--outputStyle=static'], ROOT);
const ng = await run(['../node_modules/@angular/cli/bin/ng.js', 'build', '--configuration=production'], `${ROOT}/web-ssr`);
const dist = existsSync(`${ROOT}/dist/web-ssr/server/server.mjs`);

console.log(`CAP control=${control} nx=${nx} ng=${ng} dist=${dist}`);

let code = 0;
if (nx !== 0) code |= 1;
if (ng !== 0) code |= 2;
if (!dist) code |= 4;
process.exit(code);
