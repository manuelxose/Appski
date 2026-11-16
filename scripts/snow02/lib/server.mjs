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
import { createServer } from 'node:net';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnNoPipe, waitUntilReady } from './child.mjs';

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
  // Sin pipes: el runner confined de ENGINE-04 deniega crearlos (EPERM). Se usa el
  // lanzador que hereda/ignora descriptores (ver lib/child.mjs y la medición en
  // scripts/snow02/confined-identity.mjs).
  const child = spawnNoPipe(process.execPath, [bundle], { cwd: ROOT, env, stdio: 'ignore' });

  const base = `http://127.0.0.1:${chosen}`;
  await waitUntilReady(
    async () => {
      const r = await fetch(`${base}/api/snow/v1/season-dates`, { signal: AbortSignal.timeout(2000) });
      return r.ok ? true : null;
    },
    {
      timeoutMs,
      onDead: () => (child.exited ? new Error(`el bundle terminó antes de escuchar (${child.exitCode?.()})`) : null),
    },
  );
  return { child, base, port: chosen, dataDir, token, getLog: () => '(stdio no capturado en contexto confined)' };
}

/** Parada ORDENADA (SIGTERM) y espera al cierre. */
export async function stopBundle(srv) {
  if (!srv?.child || srv.child.exited) return;
  srv.child.kill('SIGTERM');
  await srv.child.wait();
}

/**
 * Muerte BRUTAL (SIGKILL). Es la que demuestra que la persistencia no depende de
 * un cierre ordenado ni de un volcado en memoria. En Windows `kill` sin señal
 * equivale a TerminateProcess (mata el proceso sin cleanup).
 */
export async function killBundle(srv) {
  if (!srv?.child || srv.child.exited) return { alreadyExited: true };
  srv.child.kill('SIGKILL');
  const info = await srv.child.wait();
  return { code: info.code, signal: info.signal };
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
