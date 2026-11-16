# SNOW-02 — Hallazgos de seguridad administrativa (t6)

Fecha de generación: 2026-11-16 (Europe/Madrid).
Carril: **seguridad** (security-engineer). Rama `feat/snow-02-operational-backend`, sin merge.

Este documento registra los hallazgos B1–B4 del laudo del capitán (67 checks, 6 FAIL)
contra el bundle real, su **estado en el árbol actual** y la evidencia que lo respalda.
Los hallazgos B2/B3/B4 pertenecen al carril API; el carril de seguridad los reporta y
**no** los modifica (fuera de su `inScope`: `web-ssr/src/snow/store/`).

---

## B1 — `/config` filtraba NOMBRES de variables de entorno — CORREGIDO (carril seguridad)

**Hallazgo.** `GET /v1/config` con token válido devolvía en `providers[].missingEnv` y
`providers[].requiredEnv` las cadenas literales `AEMET_API_KEY`, `METEOFRANCE_API_KEY`,
`C3S_API_KEY`, `CLMS_API_KEY`, `PROTOMAPS_BASE_URL`, y los `limitations[].detail`
también las contenían. No es el valor secreto, pero es superficie de enumeración/filtración.

**Corrección (carril seguridad).**
- `web-ssr/src/snow/server/snow.routes.ts` (ruta `GET /v1/config`): `redactConfig()` reduce
  `providers[].missingEnv` / `providers[].requiredEnv` a su **recuento** numérico y sanea
  `limitations[].detail` con `redactEnvNames()`. La decisión vive en el borde; el DTO del
  servicio no cambia.

**Verificación.**
- `web-ssr/src/snow/tests/security-hardening.test.ts` C29a: `/config` con token ⇒ 200 y el
  cuerpo no contiene `_API_KEY`, `_TOKEN`, `BASE_URL`, `SNOW_ADMIN_TOKEN`, el token de prueba
  ni trazas de pila. **PASS**.
- `scripts/snow02/security-http-verify.mjs` (servidor real, HTTP): checks «/config no filtra
  `_API_KEY`/`_TOKEN`/`BASE_URL`/`SNOW_ADMIN_TOKEN`/token/stack». **exit 0**.

---

## B2 — `POST /admin/reports` aceptaba `snow.baseCm = -99` — CORREGIDO (carril API)

**Hallazgo (capitán, contra bundle).** Un parte con `snow.baseCm: -99` se persistía (201):
`parseNewReportInput` hacía `const snow = (b['snow'] ?? null) as ...` y no invocaba los
validadores de `editorial-payload.ts`.

**Estado actual (carril API, concurrente).** El carril API ha sustituido el `as` por la
validación campo a campo:
`web-ssr/src/snow/store/repository.ts:118-123`
```ts
const op = parseOperationalStatus(b['operational']);
const sd = parseSnowDepthReport(b['snow']);
const payloadErrors: EditorialValidationError[] = [...(op.ok ? [] : op.errors), ...(sd.ok ? [] : sd.errors)];
if (payloadErrors.length > 0) return { ok: false, errors: payloadErrors };
```
`parseSnowDepthReport` (en `store/editorial-payload.ts`) rechaza negativos con mensaje
«never a negative sentinel». **No lo arregla el carril de seguridad** (implica `store/`).

---

## B3 — `PUT /admin/stations/:slug` exige el cuerpo COMPLETO — POR DISEÑO (carril API)

**Hallazgo (capitán).** Un `PUT` parcial válido (p. ej. sólo `name`) devuelve 400.

**Estado.** `parseStationUpsert` (`web-ssr/src/snow/store/repository.ts`) valida como
obligatorios `slug`, `name`, `country`, `region`, `discipline`, `lat`, `lng` y
`seasonConfirmed`. El `PUT` es un **upsert de documento completo**, no un `PATCH`.
Esto es **fail-closed** (más estricto que lo necesario, nunca acepta un documento a medias);
no es una fuga ni una escritura no autenticada. Decisión de contrato del carril API, no un
defecto de seguridad. Se documenta para la revisión independiente.

---

## B4 — Marca `stale` por antigüedad teñía un parte recién escrito — CORREGIDO (carril API)

**Hallazgo (capitán).** El ranking del parte recién insertado nacía `status: 'stale'` con
reloj real porque la frescura se calculaba sólo sobre `observedAt`.

**Estado actual (carril API, concurrente).** La frescura editorial ahora considera
`observedAt` **y** `capturedAt`:
- `web-ssr/src/snow/server/station-query.ts:257` `editorialFreshness(observedAt, capturedAt, now)`.
- `web-ssr/src/snow/server/snow.service.ts:616-618` `freshnessStatus(r, now)` delega en
  `editorialFreshness(r.observedAt, r.capturedAt, now)`.

Un dato recién capturado ya no se presenta como caducado. **No lo arregla el carril de
seguridad.**

---

## Endurecimiento del carril de seguridad (t6)

Cambios en el borde y su evidencia (todo en `inScope`):

| Control | Dónde | Evidencia |
|---|---|---|
| 401 fail-closed con token ausente / vacío / whitespace / formato erróneo / `bearer` minúsculas / `Basic` | `admin-auth.test.ts` C26a–C26j (ampliado) | 41/41 verify, LEAK_GUARD_OK |
| Rechazos no modifican registros (conteo antes/después, fichero byte-idéntico) | `security-hardening.test.ts` C29f + `security-http-verify.mjs` | HTTP real |
| Límite de tasa en escritura admin (429 + Retry-After) | `cache/rate-limit.ts` + `snow.routes.ts` | C29b + driver |
| Límite de tasa en lectura costosa (search/rankings, 429) | `snow.routes.ts` (`costly: true`) | C29c + driver |
| Cuerpo >64kb ⇒ 413 tipado, sin stack | `snow.routes.ts` (`bodyErrorHandler`) | C29d + driver |
| JSON malformado ⇒ 400 tipado, sin stack | `snow.routes.ts` (`bodyErrorHandler`) | C29e + driver |
| `/config` sin filtrado de nombres de variables | `snow.routes.ts` (`redactConfig`) | C29a + driver |

---

## Verificación medida (no afirmada)

- `node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs --test
  --test-isolation=none <admin-auth|leak-guard|editorial|execution|degradation>.test.ts`
  ⇒ **tests 41 · pass 41 · fail 0 · LEAK_GUARD_OK · exit 0**.
- `node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs --test
  --test-isolation=none web-ssr/src/snow/tests/security-hardening.test.ts`
  ⇒ **tests 7 · pass 7 · fail 0 · exit 0**.
- `node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs --test
  --test-isolation=none web-ssr/src/snow/tests/http-contract.test.ts`
  ⇒ **tests 18 · pass 18 · fail 0 · exit 0**.
- `node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit` ⇒ **exit 0**.
- `node scripts/snow02/security-http-verify.mjs` ⇒ **checks 54 · passed 54 · failed 0 · exit 0**
  (HTTP real contra el servidor nieve con `SNOW_DATA_DIR` temporal y token canario).

### Nota sobre el build de producción y LEAK_GUARD

- `npx nx build web-ssr --configuration=production` **falla** por un error de plantilla
  Angular **fuera de `inScope`** (`web-ssr/src/app/pages/stations-list/.../station-card-grid.component.html:94`,
  `station.snowNew24h` possibly null). El carril de seguridad no toca `web-ssr/src/app/`.
- La suite completa (124/124 pass) reporta en ocasiones `LEAK_GUARD_FAIL fichero temporal
  residual: embarcarte-mc10-research-*`: son directorios temporales de OTRO proceso
  concurrente en el `TMP` compartido, no residuos de snow (no queda ningún `snow-cNN-*`).
  El verify de 5 ficheros da `LEAK_GUARD_OK`.
