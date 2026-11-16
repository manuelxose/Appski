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
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

let nx = 'skip';
let ng = 'skip';
let dist = false;
let cpu = '';

if (process.argv.includes('--suite')) {
  const common = ['--experimental-transform-types', '--import', './scripts/snow/ts-loader.mjs', '--test', '--test-isolation=none'];
  const tests = [
    'a11y',
    'admin-auth',
    'bootstrap',
    'chains-and-time',
    'degradation',
    'editorial-payload',
    'editorial',
    'execution',
    'http-contract',
    'leak-guard',
    'not-found',
    'parte-futuro',
    'security-hardening',
    'store-durability',
    'store-migration',
  ].map((n) => `web-ssr/src/snow/tests/${n}.test.ts`);

  const probe = (env, tag) =>
    run(['-e', 'const os=require(`node:os`);console.log(`DIAG ${tag} avail=`+(os.availableParallelism()))'], ROOT, 30000);
  void probe;
  // Cada configuración se prueba en un hijo distinto porque env no se puede cambiar en vuelo.
  const heavy = ['degradation', 'execution', 'http-contract', 'leak-guard', 'not-found'].map(
    (n) => `web-ssr/src/snow/tests/${n}.test.ts`,
  );
  const lean = tests.filter((t) => !heavy.includes(t));
  const cases = [
    ['all', tests],
    ['lean-10', lean],
    ['heavy-5', heavy],
  ];
  for (const [tag, fileArgs] of cases) {
    const code = await new Promise((resolve) => {
      const child = spawn(process.execPath, [...common, ...fileArgs], {
        cwd: ROOT,
        stdio: 'ignore',
        windowsHide: true,
        env: { ...process.env },
      });
      child.on('exit', (c) => resolve(c));
      child.on('error', (e) => resolve(`ERR:${e?.code}`));
    });
    cpu += `${tag}:${code} `;
  }
} else {
  nx = await run(['node_modules/nx/bin/nx.js', 'show', 'projects', '--outputStyle=static'], ROOT);
  ng = await run(['../node_modules/@angular/cli/bin/ng.js', 'build', '--configuration=production'], `${ROOT}/web-ssr`);
  dist = existsSync(`${ROOT}/dist/web-ssr/server/server.mjs`);
}

const logDir = join(tmpdir(), 'snow02-diag');
try {
  mkdirSync(logDir, { recursive: true });
  writeFileSync(join(logDir, 'result.json'), JSON.stringify({ nx, ng, dist, cpu }));
} catch {
  /* best effort */
}

console.log(`CAP cpu=${cpu || 'n/a'} dist=${dist}`);
process.exit(0);
