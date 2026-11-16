/**
 * Diagnóstico del entorno confined de ENGINE-04 (secuencia completa).
 *
 * Medido hasta ahora, con `--stages confined-diagnostics`:
 *   control `node -e`                → 0
 *   escritura/lectura/borrado fichero → ok (también en .nx/)
 *   `spawn` con pipes                 → EPERM
 *   `nx show projects` / `ng build`   → 1 (no arrancan bajo el sandbox)
 *   suite en dos mitades              → 0 (con qa-unit.mjs + TEMP propio)
 *   drivers HTTP (bundle real)        → 0
 *
 * Aquí se revisa el resto de la cadena: el codec del pipe usado por los helpers
 * (`lib/child.mjs`) y que el bundle de producción siga levantándose desde el
 * sandbox con `SNOW_DATA_DIR` temporal y token canario.
 */
import { readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnNoPipe } from './lib/child.mjs';
import { startBundle, stopBundle, killBundle, http, authHeaders } from './lib/server.mjs';

const out = [];
const record = (name, value) => {
  out.push(`${name}=${value}`);
  console.log(`DIAG ${name}=${value}`);
};

// 1. El codec del pipe no debe cargar en este contexto.
try {
  await import('../../../node_modules/@deepseek-ai/dsh-sandbox-windows-acl/lib/runner.js');
  record('runner-import', 'loaded');
} catch (error) {
  record('runner-import', `absent:${error?.code ?? error?.name ?? error}`);
}

// 2. El bundle debe arrancar; se comprueba un endpoint real y se para.
const dataDir = mkdtempSync(join(tmpdir(), 'snow02-diag-'));
try {
  const srv = await startBundle({ dataDir });
  const stations = await http(srv.base, '/api/snow/v1/stations');
  const cfg = await http(srv.base, '/api/snow/v1/config', { headers: authHeaders(srv.token) });
  record('bundle-stations', stations.status);
  record('bundle-config-auth', cfg.status);
  await stopBundle(srv);
  const srv2 = await startBundle({ dataDir });
  const killed = await killBundle(srv2);
  record('bundle-sigkill', JSON.stringify(killed));
} catch (error) {
  record('bundle', `FAIL:${error?.message ?? error}`);
} finally {
  try {
    rmSync(dataDir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
}

// 3. La evidencia del árbol debe ser normalizable (lectura de los JSON de drivers).
try {
  const dir = 'docs/snow/snow02-evidence';
  const jsons = readdirSync(dir).filter((f) => f.endsWith('.json'));
  record('evidence-json', jsons.length);
} catch (error) {
  record('evidence-json', `FAIL:${error?.code ?? error}`);
}

console.log(`DIAG-END ${out.join(' ')}`);
