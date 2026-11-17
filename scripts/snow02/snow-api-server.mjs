#!/usr/bin/env node
/**
 * Servidor SOLO-nieve para verificación de seguridad (sin renderizador Angular).
 *
 * Monta el MISMO router que producción (`createSnowRouter`) bajo `/api/snow`, de
 * modo que la evidencia HTTP es real sobre el código del borde v1 y no depende
 * del build de la SPA Angular (que en SNOW-02 se construye en otra fase).
 *
 * Uso (nunca un secreto real; SNOW_ADMIN_TOKEN canario):
 *   node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
 *     scripts/snow02/snow-api-server.mjs
 *
 * Escribe `SNOW_READY <puerto>` en stdout cuando escucha. `SNOW_DATA_DIR`
 * (obligatorio en el driver) y `SNOW_ADMIN_TOKEN` se leen del entorno.
 */
import express from 'express';
import { createSnowRouter, awaitCatalogLoad } from '../../web-ssr/src/snow/server';

const dataDir = process.env['SNOW_DATA_DIR'];
const app = express();
app.use('/api/snow', createSnowRouter(dataDir));

// La carga del catálogo maestro es asíncrona y no debe bloquear el arranque; se declara
// `SNOW_READY` cuando YA terminó, de modo que cualquier verificación que espere la señal
// vea el almacén completo y no una foto intermedia.
const state = dataDir === undefined ? null : await awaitCatalogLoad(dataDir, 60_000);
if (state?.status === 'failed') {
  process.stderr.write(`CATALOG_LOAD_FAILED ${JSON.stringify(state)}\n`);
} else if (state !== null) {
  process.stdout.write(`CATALOG_LOADED ${JSON.stringify(state.result ?? {})}\n`);
}

const port = Number(process.env['PORT'] ?? 0);
const server = app.listen(port, '127.0.0.1', () => {
  const addr = server.address();
  const bound = typeof addr === 'object' && addr !== null ? addr.port : port;
  process.stdout.write(`SNOW_READY ${bound}\n`);
});
