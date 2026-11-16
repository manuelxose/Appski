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
import { createSnowRouter } from '../../web-ssr/src/snow/server';

const app = express();
app.use('/api/snow', createSnowRouter(process.env['SNOW_DATA_DIR']));

const port = Number(process.env['PORT'] ?? 0);
const server = app.listen(port, '127.0.0.1', () => {
  const addr = server.address();
  const bound = typeof addr === 'object' && addr !== null ? addr.port : port;
  process.stdout.write(`SNOW_READY ${bound}\n`);
});
