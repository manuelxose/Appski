#!/usr/bin/env node
/**
 * Wrapper Nx para la etapa `build-production` del manifiesto ENGINE-04.
 *
 * Por qué existe: dentro del runner confined, `node ../node_modules/nx/bin/nx.js
 * build …` desde `web-ssr` termina con un error de arranque (la salida capturada
 * sólo deja `}\r | \r | Node.js v24.18.0`), mientras el MISMO comando ejecutado
 * sin confinamiento devuelve exit 0. Este wrapper lanza Nx sin pipes —el sandbox
 * deniega pipes, no procesos (ver scripts/snow02/confined-identity.mjs)— y
 * reenvía el código de salida real. No sustituye ninguna verificación: ejecuta
 * exactamente el mismo build. Si Nx falla, el wrapper falla.
 */
import { spawnNoPipe } from './lib/child.mjs';

const NX = '../node_modules/nx/bin/nx.js';
const ARGS = ['build', 'web-ssr', '--configuration=production', '--skip-nx-cache', '--outputStyle=static'];

const child = spawnNoPipe(process.execPath, [NX, ...ARGS], { cwd: process.cwd(), stdio: 'ignore' });
const info = await child.wait();
if (info.error) {
  console.error(`build-production: no se pudo lanzar Nx: ${info.error}`);
  process.exit(127);
}
process.exit(info.code ?? 1);
