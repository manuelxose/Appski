#!/usr/bin/env node
/**
 * Sonda de diagnóstico del CAPITÁN para el runner confined de ENGINE-04.
 *
 * Averigua POR QUÉ algunas etapas fallan dentro del runner y otras no, midiendo
 * en lugar de suponiendo: crea un directorio temporal FUERA del workspace,
 * escribe y borra un fichero, y lanza procesos hijos con distintas opciones de
 * `stdio` / `windowsHide` para localizar la operación que el sandbox deniega.
 *
 * Uso: node scripts/snow02/confined-probe.mjs
 * Salida: exit 0 siempre (es diagnóstico). Nunca toca datos del producto.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = [];
const record = (name, detail) => out.push(`${name}: ${detail}`);

record('cwd', process.cwd());
record('TEMP', String(process.env.TEMP));
record('TMP', String(process.env.TMP));
record('TMPDIR', String(process.env.TMPDIR));
record('NX_DAEMON', String(process.env.NX_DAEMON));

// 1. Directorio temporal FUERA del workspace
try {
  const base = mkdtempSync(join(tmpdir(), 'snow02-probe-'));
  mkdirSync(join(base, 'sub'), { recursive: true });
  writeFileSync(join(base, 'sub', 'file.txt'), 'x');
  record('mkdtemp+write', `ok ${base}`);
  rmSync(base, { recursive: true, force: true });
} catch (error) {
  record('mkdtemp+write', `FAIL ${error?.code ?? error}`);
}

// 2. Proceso hijo con stdio heredado
const run = (label, options) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, ['-e', 'process.exit(0)'], options);
    child.on('error', (error) => {
      record(label, `FAIL ${error?.code ?? error}`);
      resolve();
    });
    child.on('exit', (code) => {
      record(label, `ok exit=${code}`);
      resolve();
    });
  });

await run('spawn inherit', { stdio: 'inherit' });
await run('spawn ignore', { stdio: ['ignore', 'ignore', 'ignore'] });
await run('spawn pipe', { stdio: ['ignore', 'pipe', 'pipe'] });
await run('spawn pipe windowsHide', { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
await run('spawn inherit windowsHide', { stdio: 'inherit', windowsHide: true });

// 3. Lanzar el bundle del producto con stdio heredado
await new Promise((resolve) => {
  const bundle = join(process.cwd(), 'dist', 'web-ssr', 'server', 'server.mjs');
  const child = spawn(process.execPath, [bundle], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: '0',
      SNOW_DATA_DIR: join(tmpdir(), 'snow02-probe-data'),
      SNOW_ADMIN_TOKEN: 'probe-canary',
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  });
  const timer = setTimeout(() => {
    try {
      child.kill();
    } catch {
      /* best effort */
    }
    record('bundle inherit', 'ok (arrancó y se detuvo a los 3 s)');
    resolve();
  }, 3000);
  child.on('error', (error) => {
    clearTimeout(timer);
    record('bundle inherit', `FAIL ${error?.code ?? error}`);
    resolve();
  });
});

console.log('--- confined-probe ---');
for (const line of out) console.log(line);
console.log('--- fin ---');
