# SNOW-02 — Informe de entrega y revisión independiente del backend operativo

**Hito:** SNOW-02 · **Revisor:** `independent-reviewer` (t7) · **Fecha:** 2026-11-16
**Rama:** `feat/snow-02-operational-backend` · **Merge a `master`: NO AUTORIZADO**

> Regla de este informe: cada «exit code», «pass/fail» y «200/401/429/413» que aparece
> aquí fue **ejecutado por el revisor en esta sesión** contra el árbol real y el bundle
> de producción (`dist/web-ssr/server/server.mjs`), no copiado de los informes de los
> implementadores. Las salidas crudas quedan en `docs/snow/snow02-evidence/`.

---

## 0. Veredicto global

| Dimensión | Veredicto |
|---|---|
| **Veredicto de revisión** | **PASS** |
| Estado de merge | **NO AUTORIZADO** (la revisión no autoriza merge; requiere autorización explícita del usuario) |

**Motivo del PASS:** los 6 criterios de aceptación del encargo están cubiertos por
evidencia reproducida por el revisor (builds, suites, 15 endpoints por HTTP, persistencia
tras SIGKILL con `liftsOpen === 12`, seguridad administrativa con rechazos sin efecto y
límite de tasa, contratos Angular/backend coherentes y ausencia de datos inventados). No
se reprodujo ninguna regresión B2 ni F1. No hay hallazgo de severidad alta/blocker.

---

## 1. Identidad del árbol (medida, no asumida)

| Dato | Valor |
|---|---|
| Commit base (`master`) | `9b503604f802abc4c373fee8b7ba36181e31e0df` |
| HEAD de la rama | `baec0c865e44e08590e4209eb56d87539b847821` |
| Commits de la rama por delante de `master` | 4 (`7277cc8` núcleo snow · `f033696` conexión SSR · `02b82e1` docs/REA · `baec0c8` gitignore data/team) — trabajo del hito anterior |
| **Commits creados por SNOW-02** | **0** |
| Estado del árbol SNOW-02 | Todo **sin commit**: 36 modificados + untracked (`git status --porcelain`), ~2 935 ins / 1 225 del en el árbol de trabajo |
| `git diff master..HEAD` | 201 ficheros, 38 802 ins / 16 del (los 4 commits previos) |

Consecuencia documentada: la identidad de contenido de SNOW-02 no está sellada en un
commit; el hito vive en el árbol de trabajo. **Esto no es una regresión funcional** pero
es un **pendiente de entrega** (ver §8) que debe resolverse antes de cualquier merge.

---

## 2. Matriz de servicios antes/después (reconciliada, con evidencia)

La reconciliación de `docs/snow/SNOW-02-ARCHITECTURE.md` §1 es **correcta**: el laudo
«nueve servicios con mocks» está **subestimado**. El inventario real es:

- **14 áreas de página con datos simulados** = **17 servicios** (grupo A).
- **5 operaciones de estado fijo del módulo `snow/*`** (grupo B) — *no* son mocks, son
  degradación honesta (`no_data`/`not_configured`/`blocked`).

### 2.1 Estado tras SNOW-02 (verificado por el revisor)

| # Área (servicios) | ¿Reconectado al backend v1? | Evidencia (grep/lectura) |
|---|---|---|
| 1 stations-list | **SÍ** | `stations-list.data.service.ts` solo cita `USE_MOCK_DATA` en comentario («Antes: …»), sin rama mock activa |
| 2 station-detail | **SÍ** | `station-detail.data.service.ts:8` solo comentario; sin fallback a `baqueira-beret.mock.json` |
| 3–6 weather (meteo-data, snow-data, alerts, stations) | **SÍ** | `weather/services/*.ts` solo citan mocks en comentarios «Antes: …»; `availability.ts` modela indisponibilidad explícita |
| 7 home | **NO (declarado)** | `home.data.service.ts:29` `USE_MOCK_DATA: true` |
| 8 planner | **NO (declarado)** | `planner.data.service.ts:24` `USE_MOCK_DATA = true` |
| 9–10 blog-list / blog-article | **NO (declarado)** | `blog-list:17`, `blog-article:22` `USE_MOCK_DATA: true` |
| 11–12 lodging marketplace/detail | **NO (declarado)** | `lodging-marketplace:15`, `lodging-detail:16` `USE_MOCK_DATA = true` |
| 13 rental-marketplace | **NO (declarado)** | `rental-marketplace:15` `USE_MOCK_DATA = true` |
| 14–17 premium / shop-detail / account / admin(7) | **NO (declarado)** | `premium`/`shop-detail` `fetch` a mocks sin flag; `account` importa mocks; `admin` `fetch` a `/assets/mocks/admin/*` |

**Verificación independiente:** `grep USE_MOCK_DATA web-ssr/src/app` devuelve 29 matches;
los únicos flags **activos** son los de la columna «NO (declarado)»; los tres servicios
prioritarios (stations-list, station-detail, weather) solo conservan la palabra en
comentarios de migración. Consistente con los límites declarados por t4.

### 2.2 Operaciones de estado fijo (grupo B) — comportamiento medido

| Operación | Estado medido (bundle real, sin credenciales) |
|---|---|
| B1 `getWebcams` | 200 `status:'blocked'` `reason:'license-prohibits'` `grants:[]` (no consulta estación) |
| B2/B3 rankings nieve/km | 200 `status:'no_data'` `reason:'outside-season'` sin partes; con parte ⇒ ranking con `baseCm`/`kmOpen` real |
| B4 `getForecast`/`getAvalanche` | 200 `status:'no_data'` `reason:'not-covered'`/`not-yet-published` sin `data` |
| B5 cadena de fallback | degradación honesta: nunca `data` inventado, nunca 500 por falta de credencial |

---

## 3. Endpoints v1 comprobados por HTTP por el revisor

Los 15 endpoints del contrato (`SNOW_ROUTES`, `snow.routes.ts:100-385`) fueron recorridos
por `integration-http.mjs` (ejecutado por el revisor) y por la sonda propia
`reviewer-security-bundle.mjs`, contra el **bundle de producción**. Resultado: **60/60
checks exit 0**.

| # | Método | Ruta | Auth | Estado medido |
|---|---|---|---|---|
| 1 | GET | `/v1/stations` | — | 200 + procedencia + paginación |
| 2 | GET | `/v1/stations/:slug` | — | 200; 404 tipado para slug inexistente |
| 3 | GET | `/v1/stations/:slug/report` | — | 200 (`ok`/`no_data`); 404 tipado |
| 4 | GET | `/v1/stations/:slug/forecast` | — | 200 `no_data`/`not-covered`, sin `data` |
| 5 | GET | `/v1/stations/:slug/alerts` | — | 200 `alerts:[]`, sin avisos inventados |
| 6 | GET | `/v1/stations/:slug/webcams` | — | 200 `blocked` `grants:[]` |
| 7 | GET | `/v1/avalanche` | — | 200 degradado |
| 8 | GET | `/v1/rankings/nieve` | — | 200 `no_data`/`ok` |
| 9 | GET | `/v1/rankings/km` | — | 200 `no_data`/`ok` |
| 10 | GET | `/v1/season-dates` | — | 200 |
| 11 | GET | `/v1/search?q=` | — | 200; 400 sin `q` |
| 12 | GET | `/v1/config` | Bearer | 200 con token; **401 sin token**; sin nombres de env |
| 13 | GET | `/v1/admin/reports` | Bearer | 200 con token; 401 sin token |
| 14 | POST | `/v1/admin/reports` | Bearer | 201 con token; 401 sin token; 400 tipado en centinela |
| 15 | PUT | `/v1/admin/stations/:slug` | Bearer | 201 crear / 200 actualizar; 401 sin token; 400 cuerpo incompleto |

**Procedencia:** los 8 campos (`source/observedAt/updatedAt/status/licenseStatus/
freshness/authorization/attribution`) presentes en **todas** las respuestas 200, **también
en los 404/400** (`provenanceErrors` vacío en los 400/404 verificados). `freshness` es
número finito ≥ 0 y `observedAt` ISO válido.

**No duplicación de endpoints:** `http-contract.test.ts` C28a (parte de la suite 123/123)
verifica que los 15 endpoints existen **exactamente una vez**; `api-client.test.mjs` (6/6)
verifica que el cliente Angular no inventa rutas y no llama a rutas admin.

---

## 4. Pruebas ejecutadas por el revisor (exit codes reales)

| Comando | Resultado | Exit |
|---|---|---|
| `node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit` | OK | **0** |
| `node scripts/snow/check-schema.mjs` | 8/8 «all invariants hold» | **0** |
| `npx nx build web-ssr --configuration=production --skip-nx-cache` | bundle generado (62.5 s) | **0** |
| suite completa `node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs --test --test-isolation=none "web-ssr/src/snow/tests/*.test.ts"` (TMP aislado) | **123/123 pass, 0 fail, LEAK_GUARD_OK** | **0** |
| `node scripts/snow02/integration-http.mjs` | 60/60 | **0** |
| `node scripts/snow02/persistence-restart.mjs` | 18/18 (SIGKILL → reinicio → `liftsOpen===12`) | **0** |
| `node scripts/snow02/adversarial.mjs` | 14/14 | **0** |
| `node scripts/snow02/security-http-verify.mjs` | 51/51 | **0** |
| `node scripts/snow02/captain-http-verify.mjs` | 68/68 | **0** |
| `node docs/snow/snow02-evidence/reviewer-security-bundle.mjs` (sonda propia contra el bundle) | 22/22 | **0** |
| `node scripts/snow/tests/api-client.test.mjs` | 6/6 | **0** |

> Nota de aislamiento de TEMP: la suite se ejecutó con `TMP/TEMP/TMPDIR` apuntando a un
> directorio propio (`data/qa-temp-snow02`, eliminado al final) para neutralizar el
> proceso externo `embarcarte-*` del host. Con esa condición `LEAK_GUARD_OK` y 0 residuos.

> Nota sobre el aviso de t6 («tsc/nx build fallan por errores de frontend t5»): **ya no es
> cierto**. El revisor midió `tsc` exit 0 y `nx build --skip-nx-cache` exit 0 — el defecto
> de `station-card-grid.component.html` quedó corregido por t4.

---

## 5. Seguridad administrativa — verificación propia del revisor

La sonda **propia** `reviewer-security-bundle.mjs` (22/22, contra el bundle de producción,
no contra el source) y `security-http-verify.mjs` (51/51) acreditan:

| Control | Resultado medido |
|---|---|
| Token ausente / inválido / vacío / whitespace / sin esquema / `Token` (no `Bearer`) / `Bearer` sin valor / `bearer` minúsculas / `Basic` | **401** en los 8 casos; `admin-auth.ts` compara `Bearer ${token}` con `timingSafeEqual` (case-sensitive, esquema exacto) |
| Rechazos sin efecto | conteo de partes (HTTP **y** en disco) idéntico antes/después de 401/400/413 |
| Centinela `snow.baseCm=-99` / `operational.liftsOpen=-99` | **400** tipado nombrando el campo; no persiste |
| JSON malformado | **400** `{error:'invalid', message:'malformed JSON body'}` sin stack |
| Cuerpo >64kb | **413** `{error:'invalid', message:'request body too large'}` sin stack |
| Límite de tasa admin (20/min) | 20 escrituras ⇒ 200; **21ª ⇒ 429 + `Retry-After`** (medido `60`) |
| Límite de tasa lectura costosa (100/min) | 100 `search` ⇒ 200; **101ª ⇒ 429** |
| `/config` con token | 200; **sin** `AEMET_API_KEY`/`_TOKEN`/`BASE_URL`/`SNOW_ADMIN_TOKEN`/token canario/stack (B1 corregido en `redactConfig`, `snow.routes.ts:71-81`) |
| Credenciales en código | `grep` de valores literales de API keys en `web-ssr/src` ⇒ **0 matches** |

**Sin regresiones B2 ni F1 reproducidas por el revisor:** B2 (centinela -99 aceptado) no
se reproduce — el borde rechaza con 400; F1 (`liftsOpen === 12` tras reinicio) se reproduce
correctamente (ver §6).

---

## 6. Persistencia tras reinicio (regresión F1)

`persistence-restart.mjs` (18/18, ejecutado por el revisor) demuestra el ciclo completo:

1. Arranque #1 del bundle con `SNOW_DATA_DIR` temporal y token canario.
2. `POST /admin/reports` con `liftsOpen: 12` + atribución ⇒ **201**.
3. Lectura del **fichero en disco** `snow-reports.json` ⇒ `schemaVersion: 2`, registro presente,
   `liftsOpen === 12`, `author/sourceUrl/capturedAt/confidence` persistidos.
4. **SIGKILL** (señal `SIGKILL` confirmada, sin cierre ordenado).
5. Arranque #2 sobre el **mismo** `SNOW_DATA_DIR`.
6. `GET /stations/baqueira-beret/report` ⇒ 200 con `liftsOpen === 12` (no 0, no null),
   espesores (`baseCm 60`/`topCm 120`), atribución y procedencia completa; `rankings/nieve`
   incluye la estación con `baseCm 60`; `/admin/reports` devuelve el parte.

La escritura atómica (tmp + `fsync` + `rename`, `file-io.ts:132-163`) y la migración v1→v2
no destructiva (`migrateStoreDir`, con guarda «no perder ni inventar registros») quedan
cubiertas además por `store-durability.test.ts` (D1–D5) y `store-migration.test.ts`
(V2a–V2o) dentro de la suite 123/123.

---

## 7. Honestidad de datos (sin cifras inventadas, null ≠ 0)

Medido contra el bundle:

- **Sin partes ⇒ `snow: null`** en directorio y ficha (no `baseCm: 0`); `rankings` devuelve
  `no_data`/`outside-season` con `ranking: []` (no filas con 0).
- **`null` explícito se conserva `null`** (caso adversarial #8 y sonda propia): `snow.baseCm:
  null` nunca se rellena con 0; la distinción clave-presente-con-`null` vs clave-ausente se
  comprueba con `hasOwnProperty`.
- **Centinelas negativos** (`-99`, `-1`) rechazados en `operational` y `snow` con `fields[]`.
- **Estados degradados** (`no_data`/`not_configured`/`blocked`/`stale`) son 200 con `reason`
  y procedencia — datos, no errores HTTP; `forecast` sin proveedor **no** incluye `data`.
- **`/alerts` sin proveedor** ⇒ `alerts: []` (nunca 4 alertas inventadas); `/webcams` ⇒
  `blocked` `grants: []`; borrador (`mood: 'draft'`) invisible en público y visible solo en
  `/admin/reports`; `observedAt` futuro **visible** (el reloj no decide visibilidad).
- **Sin mock presentado como dato real** en el módulo nieve: los 3 servicios prioritarios
  conectan al backend; los mocks restantes (home/planner/blog/lodging/rental/premium/
  shop-detail/account/admin) quedan **fuera del alcance nieve v1** y así se declaran.

---

## 8. Limitaciones declaradas (por consumidor frontend no conectado)

| Consumidor | Limitación declarada | Estado |
|---|---|---|
| `home` | Se mantiene mock (bloques de negocio fuera de nieve); el bloque «destacadas» puede reutilizar `/v1/stations` | no conectado |
| `planner` | Mock-first (`USE_MOCK_DATA = true`); no es nieve | no conectado |
| `blog-list` / `blog-article` | Mock (`USE_MOCK_DATA = true`); editorial de blog fuera de nieve v1 | no conectado |
| `lodging-marketplace` / `lodging-detail` / `rental-marketplace` | Mock (`USE_MOCK_DATA = true`); marketplace fuera de nieve v1 | no conectado |
| `premium` / `shop-detail` / `account` | Mock (fetch/imports a mocks); dominios de negocio/cuenta | no conectado |
| `admin` (26 módulos) | Solo el módulo nieve se reconecta (`GET/POST /admin/reports`, `GET /config`); el resto del admin es mock | parcial (nieve) |
| `weather` radar / histórico webcam | Sin endpoint en v1 ⇒ `unavailable` explícito (`availability.ts`) | degradación honesta |
| Comparador / favoritos | Sin endpoint (R4/R7): comparador reutiliza `/stations`+`/report`; favoritos `localStorage` client-only | por diseño |
| `forecast` / `avalanche` / `alerts` | Sin proveedor vivo A1/A2/A3 ⇒ degradan a `not_configured`/`no_data` | degradación honesta |

### Pendientes de entrega (no bloquean la aceptación funcional)

1. **Commit del trabajo SNOW-02**: 0 commits propios; todo el hito vive en el árbol de
   trabajo. Debe sellarse en un commit antes de cualquier integración/merge (identidad de
   contenido, ENGINE-04 §8.1).
2. **Ningún enlace portada → `/nieve`** y **4 imágenes 404 de la portada** (deuda previa,
   fuera de SNOW-02).
3. **Warnings de build** (budget CSS de `shop-detail`/`admin-analytics-*` y bailout CommonJS
   de `leaflet`): no bloqueantes, documentados desde SNOW-01.

### Observación de severidad BAJA (no bloqueante, no requiere revisión)

- Para un parte con `observedAt` **futuro**, el directorio/ranking lo etiquetan `stale`
  (porque `editorialFreshness` devuelve `stale` para edad negativa, `station-query.ts:269`),
  mientras `/report` lo etiqueta `live` (usa solo `capturedAt`). La visibilidad **sí** es
  coherente en ambos (el dato se sirve); solo difiere la etiqueta de frescura en ese caso
  patológico de reloj. La arquitectura §9 lo reconoce como «no se marca explícitamente como
  futuro en v1». No es una regresión B2/F1 ni un defecto de seguridad o de integridad.

---

## 9. Evidencia cruda

`docs/snow/snow02-evidence/`:

| Fichero | Origen | Resultado |
|---|---|---|
| `integration-http.json` | revisor (driver ejecutado) | 60/60 exit 0 |
| `persistence-restart.json` | revisor (driver ejecutado) | 18/18 exit 0 |
| `adversarial.json` | revisor (driver ejecutado) | 14/14 exit 0 |
| `security-http-verify` (stdout) | revisor (driver ejecutado) | 51/51 exit 0 |
| `captain-http-verify.json` | revisor (driver del capitán ejecutado intacto) | 68/68 exit 0 |
| `reviewer-security-bundle.json` + `.mjs` | **sonda propia del revisor** | 22/22 exit 0 |
| `security-findings.md` | t6 | B1–B4 documentados (B1/B2/B4 corregidos; B3 por diseño) |

---

## 10. Criterios de aceptación, uno a uno

| Criterio | Estado | Evidencia |
|---|---|---|
| Nueve servicios clasificados y reconciliados con evidencia | **PASS** | §2; inventario 14 áreas/17 servicios + 5 operaciones, con `file:line` y grep del revisor |
| APIs documentadas y comprobadas por HTTP por el propio revisor | **PASS** | §3; 15 endpoints, 60/60 + 22/22 propios |
| Persistencia demostrada tras reinicio de proceso | **PASS** | §6; SIGKILL → `liftsOpen === 12`, atribución y ranking |
| Seguridad administrativa verificada con pruebas propias y rechazos sin efecto | **PASS** | §5; matriz 8×401, 400/413, 429, /config sin filtrado, conteo inalterado |
| Contratos tipados coherentes con Angular y sin datos inventados | **PASS** | `api-client.test.mjs` 6/6, tsc exit 0, DTO sin `any`; §7 |
| Sin regresiones B2 ni F1 reproducidas por el revisor | **PASS** | B2 rechaza -99; F1 `liftsOpen===12` tras reinicio |
| Informe SNOW-02-BACKEND-REPORT.md y EXECUTION-STATE.md actualizados | **PASS** | este fichero + `EXECUTION-STATE.md` actualizado |

---

## 11. Veredicto

**PASS** — sin hallazgos de severidad alta/blocker. El hito SNOW-02 cumple funcionalmente
el encargo (backend operativo, persistencia durable, API v1, seguridad admin y reconexión
frontend de las 3 áreas prioritarias) con evidencia reproducida por el revisor.

**Bloqueo de entrega (independiente del PASS de revisión):** el trabajo **no está
commiteado** (0 commits propios) y **no está autorizado el merge a `master`**. Ambas cosas
requieren la autorización explícita del usuario, conforme a ENGINE-01 §4 y ENGINE-02 §6.
