/**
 * Loader de desarrollo/verificación para ejecutar `web-ssr/src/snow/**` y
 * `web-ssr/src/server.ts` bajo Node plano, SIN el bundler de Angular.
 *
 * DECISIÓN DE CARGA (t7/t13, opción B del capitán): el código fuente está
 * escrito para el bundler de Angular (esbuild), donde la extensión en imports
 * relativos es opcional y un directorio resuelve a su `index.ts`. El resolver
 * ESM de Node no admite ninguna de las dos cosas.
 *
 *   - En PRODUCCIÓN el bundler resuelve todo en build-time: no hay fragilidad.
 *   - Bajo Node plano (`node --test`, `node -e`, tooling de verificación) se
 *     usa ESTE loader, que es una pieza del repo (no un helper de test).
 *
 * Uso canónico:
 *   node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs …
 *
 * Sin dependencias. Sin procesos hijos.
 */
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./ts-resolver.mjs', pathToFileURL(import.meta.filename));
