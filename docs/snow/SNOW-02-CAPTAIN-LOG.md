# SNOW-02 — Bitácora de hallazgos del capitán (medidos por el capitán)

Este fichero registra SOLO hallazgos producidos por verificación propia del capitán
(driver `scripts/snow02/captain-http-verify.mjs`, suite, tsc, build) y su estado.
Última actualización: 2026-11-16 (fin de sesión de ejecución).

## Estado de evidencia cruda

| Evidencia | Comando | Resultado real |
|---|---|---|
| tsc app | `node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit` | exit 0 |
| Suite base (9 ficheros) | `node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs --test --test-isolation=none <9 ficheros>` | 61/61 exit 0 |
| Suite ampliada (12 ficheros, TEMP aislado) | ídem + `http-contract`, `store-migration`, `store-durability` | 101/101 exit 0 |
| Migración/durabilidad | `node --test … store-migration.test.ts store-durability.test.ts` | 15/15 y 5/5 exit 0 |
| Validador de cargas | `node --test … editorial-payload.test.ts` | antes 5/7, **después 7/7** |
| Build producción | `npx nx build web-ssr --configuration=production --skip-nx-cache` | exit 0 |
| Esquema SQL | `node scripts/snow/check-schema.mjs` | 8/8 PASS exit 0 |
| HTTP contra bundle real | `node scripts/snow02/captain-http-verify.mjs` | ver `captain-http-verify.json` |

**Nota operativa:** el script `leak-guard` falla con un proceso EXTERNO del host que
crea `%TEMP%/embarcarte-*` en bucle (documentado ya en `EXECUTION-STATE.md` §5.1).
Toda verificación de pruebas del hito se ejecuta con `TMP`/`TEMP` apuntando a un
directorio propio; con esa condición `LEAK_GUARD_OK`.

## Hallazgos del capitán y estado

| ID | Severidad | Hallazgo | Estado | Evidencia |
|---|---|---|---|---|
| C1 | ALTA | `POST /admin/reports` aceptaba y persistía `snow.baseCm = -99` (201). Causa: dos `as` en `store/repository.ts` que saltaban la validación de `store/editorial-payload.ts`. | **CORREGIDO** — validación en la puerta; `editorial-payload.test.ts` 7/7; HTTP real: 400 con `field: snow.baseCm` | `captain-http-verify.json`, `editorial-payload.test.ts` |
| C2 | MEDIA | `PUT /admin/stations/:slug` devolvía 400 por cuerpo parcial sin explicar la semántica. | **RESUELTO POR CONTRATO** — PUT = reemplazo total; el 400 incluye campo `body` que lo declara | `parseStationUpsert`, §9 arquitectura |
| C3 | MEDIA | Un parte recién capturado nacía `stale` en ranking/lista mientras `/report` decía `ok` (frescura comparada contra `observedAt` del operador). | **REGLA UNIFICADA** `editorialFreshness(observedAt, capturedAt, now)` (`age = now − max(...)`, live ≤ 30 min) para directorio, rankings y `/report` | `server/station-query.ts`, §9 arquitectura |
| C4 | MEDIA | `GET /config` devuelve la cadena literal `AEMET_API_KEY` en `missingEnv`. | **DERIVADO A t6** (seguridad): `/config` no debe exponer nombres de variables de entorno | t6 |
| C5 | ALTA | `json-report-repository.listPublished()` filtraba `notAfter(observedAt, at)`: un parte con `observedAt` posterior al reloj del servidor era invisible en `/report` y rankings. | **DERIVADO A persistence-engineer** (autorizado): la visibilidad la decide el motivo de publicación, no el reloj; la antigüedad sólo la decide `editorialFreshness` | `json-report-repository.ts:87` |

Bloqueantes para aceptar SNOW-02 (decididos por el arquitecto en §9): **C1 y C3**.
C5 es condición necesaria para que C3 sea demostrable de punta a punta.

## Lo que NO se declara hecho

- t4 (integración frontend ↔ backend) **no implementado**: no se ha tocado `web-ssr/src/app`.
  Plan por turnos acordado (A: `snow-endpoints`/`snow-api` + `stations-list` + `station-detail`
  + quitar `snowBaseCm+50` de `stations-featured`; B: `weather`). Los data services de
  páginas siguen con sus mocks y así debe decirlo el informe de entrega.
- t5 (drivers de integración del especialista) no ejecutado como tarea; el driver del
  capitán (`scripts/snow02/captain-http-verify.mjs`) cubre el mismo terreno y es la evidencia
  usada, pero no sustituye la tarea aprobada.
- t7 (revisión independiente), t8 (reparación formal) y t6 (seguridad) no cerrados.
- Sin commits, sin merge, sin push, sin despliegue.

## Reproducción mínima (para el revisor)

```powershell
$env:TMP='<workspace>\data\qa-temp'; $env:TEMP=$env:TMP
npx nx build web-ssr --configuration=production --skip-nx-cache
node scripts/snow02/captain-http-verify.mjs
```
El driver arranca `dist/web-ssr/server/server.mjs` en un puerto libre con
`SNOW_DATA_DIR` temporal y un token canario, recorre los 16 endpoints, ejecuta la
matriz de rechazos (token/JSON/centinelas), demuestra escritura → disco → reinicio →
lectura con `liftsOpen === 12` y atribución, y escribe el resumen JSON.
