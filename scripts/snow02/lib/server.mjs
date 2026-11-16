#!/usr/bin/env node
/**
 * SNOW-02 — helper de arranque/parada del SERVIDOR DE PRODUCCIÓN para drivers.
 *
 * Arranca el bundle YA CONSTRUIDO `dist/web-ssr/server/server.mjs` (no el source)
 * en un puerto libre, con `SNOW_DATA_DIR` temporal y `SNOW_ADMIN_TOKEN` canario,
 * y ofrece parada ordenada y **SIGKILL** para demostrar persistencia.
 *
 * No sustituye ni edita `scripts/snow02/captain-http-verify.mjs`: ese driver es
 * del capitán y su patrón queda intacto.
 *
 * Uso típico (desde un driver):
 *   import { startBundle, stopBundle, killBundle, freePort, tempDataDir } from './lib/server.mjs';
 *   const dir = tempDataDir('snow02-t5-');
 *   const srv = await startBundle({ dataDir: dir });
 *   ...  await killBundle(srv);  const again = await startBundle({ dataDir: dir, port: srv.port });
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
export const BUNDLE = 'dist/web-ssr/server/server.mjs';
/** Token CANARIO: nunca un secreto real. */
export const CANARY_TOKEN = 'snow02-t5-canary-token';

/** Puerto libre elegido por el sistema (se cierra inmediatamente). */
export function freePort() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.unref();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

/** Directorio de datos temporal EXCLUSIVO de esta ejecución. */
export function tempDataDir(prefix = 'snow02-t5-') {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function bundleExists() {
  return existsSync(resolve(ROOT, BUNDLE));
}

/**
 * Arranca el bundle. `TEMP`/`TMPDIR` del hijo apuntan al `dataDir` para no dejar
 * residuos en el TEMP compartido (el leak-guard del repo vigila ese directorio).
 */
export async function startBundle({ dataDir, port, token = CANARY_TOKEN, timeoutMs = 120_000 }) {
  const bundle = resolve(ROOT, BUNDLE);
  if (!existsSync(bundle)) {
    throw new Error(`bundle no construido: ${BUNDLE} (ejecuta nx build web-ssr)`);
  }
  const chosen = port ?? (await freePort());
  const env = {
    ...process.env,
    PORT: String(chosen),
    SNOW_DATA_DIR: dataDir,
    SNOW_ADMIN_TOKEN: token,
    NODE_ENV: 'production',
    TEMP: dataDir,
    TMPDIR: dataDir,
  };
  // Sin credenciales de proveedor: el driver mide degradación honesta.
  for (const k of ['AEMET_API_KEY', 'METEOFRANCE_API_KEY', 'C3S_API_KEY', 'CLMS_API_KEY', 'PROTOMAPS_BASE_URL']) {
    delete env[k];
  }
  // stdio 'inherit': los drivers se invocan también desde un runner confined cuyo
  // spawn con pipes puede denegarse; heredar los descriptores del padre funciona.
  const child = spawn(process.execPath, [bundle], { cwd: ROOT, env, stdio: 'inherit' });
  const log = '(stdio heredado: la salida del bundle va a la consola del runner)';

  const base = `http://127.0.0.1:${chosen}`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`el bundle terminó antes de escuchar: ${log.slice(-400)}`);
    try {
      const r = await fetch(`${base}/api/snow/v1/season-dates`, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return { child, base, port: chosen, dataDir, token, getLog: () => log };
    } catch {
      // aún no escucha
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`timeout esperando al bundle en ${base}: ${log.slice(-400)}`);
}

/** Parada ORDENADA (SIGTERM) y espera al cierre. */
export function stopBundle(srv) {
  return new Promise((res) => {
    if (!srv?.child || srv.child.exitCode !== null) return res();
    srv.child.once('exit', () => res());
    srv.child.kill('SIGTERM');
  });
}

/**
 * Muerte BRUTAL (SIGKILL). Es la que demuestra que la persistencia no depende de
 * un cierre ordenado ni de un volcado en memoria. En Windows `kill` sin señal
 * equivale a TerminateProcess (mata el proceso sin cleanup).
 */
export function killBundle(srv) {
  return new Promise((res) => {
    if (!srv?.child || srv.child.exitCode !== null) return res({ alreadyExited: true });
    srv.child.once('exit', (code, signal) => res({ code, signal }));
    srv.child.kill('SIGKILL');
  });
}

/**
 * Petición JSON con estado y texto crudo (nunca lanza por 4xx/5xx).
 *
 * `base`+`path` se concatenan, pero se tolera que `path` ya sea una URL absoluta
 * (http://…): en ese caso se usa tal cual. Así un llamador no puede producir la
 * URL rota `http://hosthttp://host/...` — un defecto real que tuvo el driver
 * adversarial y que se corrigió aquí, en el helper, en vez de caso por caso.
 */
export async function http(base, path = '', init = {}) {
  const url = /^https?:\/\//.test(path) ? path : base + path;
  const res = await fetch(url, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // cuerpo no-JSON: el driver lo reporta como tal
  }
  return { status: res.status, text, json, headers: res.headers };
}

export function authHeaders(token = CANARY_TOKEN) {
  return { 'content-type': 'application/json', authorization: `Bearer ${token}` };
}

export function cleanupDir(dir) {
  try {
    rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}
