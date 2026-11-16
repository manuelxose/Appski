# SNOW-02 — Arquitectura e inventario del backend operativo

**Hito:** SNOW-02 · **Autor:** `backend-architect` · **Fecha:** 2026-11-16
**Rama:** `feat/snow-02-operational-backend` (sin merge ni despliegue)
**Fuentes vinculantes:** [`EXECUTION-STATE.md`](./EXECUTION-STATE.md) (estado del hito anterior),
[`SNOW-01-RUNTIME-REPORT.md`](./SNOW-01-RUNTIME-REPORT.md) (evidencia de runtime),
[`06-architecture.md`](./06-architecture.md) (arquitectura del módulo `snow/*`),
[`02-feature-matrix.md`](./02-feature-matrix.md) (contrato HTTP y esquema).

> **Regla de este documento.** Cada fila del inventario cita `fichero:línea` leído del árbol real.
> Toda afirmación de "operativo" o "mock" va respaldada por una inspección directa de código; donde
> el dato no está implementado se escribe explícitamente `NO IMPLEMENTADO` / `GAP`. Este documento
> **no** escribe código de implementación (lo hacen las tareas de persistencia/API); fija el contrato
> que gobierna el resto del DAG de SNOW-02.

---

## 0. Resumen ejecutivo

El hito SNOW-01 dejó **dos mundos** conviviendo en `web-ssr`:

1. **El shell legacy** (`web-ssr/src/app/pages/**`): páginas de nieve/negocio que todavía sirven
   **datos ficticios** (mocks JSON en `/assets/mocks/**` o listas en memoria). Son el objeto de la
   migración de SNOW-02.
2. **El módulo nuevo** (`web-ssr/src/snow/**` + `web-ssr/src/app/snow/**`): un backend Express
   **ya operativo** (JSON store versionado + cadena de fallback + guard admin fail-closed) que
   devuelve estados **honestos** (`no_data`/`not_configured`/`blocked`) y nunca cifras inventadas.
   Es el **destino** de la reconexión, no un mock.

El objetivo de SNOW-02 es **reconectar** el primer mundo al segundo, con persistencia real y API
versionada, **sin** eliminar un mock antes de que exista su sustituto operativo o un adaptador de
indisponibilidad explícito.

La conclusión central de la reconciliación (§1) es que el laudo previo de "nueve servicios
dependientes de mocks" está **subestimado**: el inventario real arroja **14 grupos de servicios de
página con datos simulados** (grupo A) más **5 operaciones del módulo snow con estado fijo** (grupo
B). Además, la afirmación de que solo 5 servicios tienen `USE_MOCK_DATA` es **inexacta**: el flag
literal existe en **9** servicios, y `weather` no es uno de ellos (usa `fetch` directo a mocks).

---

## 1. Inventario de servicios simulados (antes) — reconciliación del laudo

### 1.1 Laudo del capitán vs. evidencia de código

| Afirmación del laudo | Veredicto (con evidencia) |
|---|---|
| "El hito anterior identificó **NUEVE** servicios dependientes de mocks" | **INCORRECTO (subestimado).** El `grep` de `USE_MOCK_DATA` más la inspección directa arroja **14** grupos de servicios de página con datos ficticios (§1.2), más las operaciones de estado fijo del módulo snow (§1.3). No hay 9, hay ≥ 14. |
| "Propuesta de claves = `{stations-list, station-detail, weather, home, planner}` (las 5 con `USE_MOCK_DATA` real)" | **INCORRECTO en el conteo y en la pertenencia.** El flag literal `USE_MOCK_DATA` existe en **9** ficheros, no 5: `stations-list.data.service.ts:28`, `station-detail.data.service.ts:20`, `home.data.service.ts:29`, `planner.data.service.ts:24`, `blog-list.data.service.ts:17`, `blog-article.data.service.ts:22`, `lodging-marketplace.data.service.ts:15`, `lodging-detail.data.service.ts:16`, `rental-marketplace.data.service.ts:15`. **`weather` NO usa el flag**: `meteo-data.service.ts` y `snow-data.service.ts` hacen `fetch` directo a `/assets/mocks/**` (sin flag). Los 5 citados son el **subconjunto prioritario de reconexión a nieve**, no el inventario completo. |
| `{snow-api/snow server borde, admin, account, editorial}` "pendientes de reconciliación" | **Mixto.** `admin` y `account` sí son mocks (grupos 14 y 13). `snow-api`/`snow server borde` **no es un mock**: es el backend operativo ya construido (`snow/server/*`, JSON store versionado, auth fail-closed). `editorial` **no es un mock**: es el adaptador editorial operativo (`isTerminal`, devuelve `no_data` honesto, no cifras inventadas). |

### 1.2 Grupo A — Servicios de datos de páginas (14 grupos)

Evidencia de código (`file:line`) de que cada uno devuelve datos ficticios:

| # | Servicio | Mock actual | Evidencia `fichero:línea` |
|---|---|---|---|
| 1 | **stations-list** | `USE_MOCK_DATA: true` + `fetch` a `/assets/mocks/stations-list/*` | `stations-list.data.service.ts:28` (flag), `:55` (rama mock), `:154-177` (`loadMockData`) |
| 2 | **station-detail** | `USE_MOCK_DATA = true` + `fetch` a `/assets/mocks/station-detail/*` | `station-detail.data.service.ts:20` (flag), `:49-72` (`loadFromMock`) |
| 3 | **weather/metéo** (`meteo-data.service` + `meteo-state.store`) | `fetch` a `/assets/mocks/{now,forecast72,webcams,radar}.mock.json` (sin flag) | `meteo-data.service.ts:13` (comentario "usa mocks locales"), `:40,:62,:83,:104` (fetch); `meteo-state.store.ts:118-123` (orquesta) |
| 4 | **weather/snow-data** (`snow-data.service`) | `fetch` a `/assets/mocks/snow-*.json` | `snow-data.service.ts:37,49,59,69,79` |
| 5 | **weather/alerts** (`alerts.service`) | 4 alertas hardcodeadas en memoria | `alerts.service.ts:69-124` (`loadMockAlerts`) |
| 6 | **weather/stations** (`stations.service`) | catálogo `SkiStation[]` hardcodeado en memoria | `stations.service.ts:13-132` |
| 7 | **home** | `USE_MOCK_DATA: true` + `fetch` a `/assets/mocks/home/home-page.mock.json` | `home.data.service.ts:29` (flag), `:164` (`loadMockData`) |
| 8 | **planner** | `USE_MOCK_DATA = true` + `fetch` a `/assets/mocks/planner/*` + `getDefaultData()` | `planner.data.service.ts:24` (flag), `:57` (`fetch`), `:98-119` (datos por defecto) |
| 9 | **blog-list** | `USE_MOCK_DATA = true` + `fetch` a `/assets/mocks/blog-list/*` + `getDefaultData()` | `blog-list.data.service.ts:17` (flag), `:52` (`fetch`), `:92-111` |
| 10 | **blog-article** | `CONFIG.USE_MOCK_DATA: true` + `fetch` + generación dinámica de contenido | `blog-article.data.service.ts:22` (flag), `:69` (`fetch`), `:120-253` (`generateSections` con `Math.random()`) |
| 11 | **lodging-marketplace** | `USE_MOCK_DATA = true` + `fetch` a `/assets/mocks/lodging-marketplace/*` + catálogo por defecto | `lodging-marketplace.data.service.ts:15` (flag), `:80` (`fetch`), `:99-136` |
| 12 | **lodging-detail** | `USE_MOCK_DATA = true` + `fetch` + generación de detalle | `lodging-detail.data.service.ts:16` (flag), `:76` (`fetch`), `:110-231` (`generateLodgingDetail`) |
| 13 | **rental-marketplace** | `USE_MOCK_DATA = true` + `fetch` a `/assets/mocks/rental-marketplace/*` | `rental-marketplace.data.service.ts:15` (flag), `:82` (`fetch`) |
| 14 | **premium** | `fetch` a `/assets/mocks/premium-page.mock.json` (sin flag) | `premium.data.service.ts:38` |
| 15 | **shop-detail** | `fetch` a `/assets/mocks/shop-detail.mock.json` (sin flag) | `shop-detail.service.ts:87` |
| 16 | **account** | import directo de 10 ficheros mock + `simulateApiDelay()` | `account.service.ts:34-43` (imports), `:221` (`userProfileMock as UserProfile`), `:1076-1078` (`simulateApiDelay`) |
| 17 | **admin** (dashboard + operations + financial + crm + content + analytics + advanced) | `fetch` a `/assets/mocks/admin/*.json` o señales en memoria | `admin.service.ts:81-101` (fetch metrics/activity/top-stations/revenue-chart), `:111,145,176,207,244` (más fetch); mismo patrón en `operations.service.ts`, `financial.service.ts`, `crm.service.ts`, `content.service.ts`, `analytics.service.ts`, `advanced.service.ts` |

> Nota de conteo: el grupo 3–6 (weather) es **un** área de página con **4 sub-servicios**; el grupo
> 17 (admin) es **un** área con **7 sub-servicios**. El total de *servicios de página* es 17; el total
> de *áreas de página* es 14. Ambas cifras superan el "nueve" del laudo.

### 1.3 Grupo B — Operaciones del módulo `snow/*` con estado fijo (no son mocks, son degradación honesta)

Estas **no** fabrican datos; devuelven estados canónicos del contrato. Solo se estaría "inventando"
si se sirviera un `data` fabricado; hoy **no** ocurre: la degradación es honesta y con `reason` tipado.

| # | Operación | Estado fijo hoy | Evidencia `fichero:línea` |
|---|---|---|---|
| B1 | `SnowService.getWebcams` | `status:'blocked'`, `reason:'license-prohibits'`, `grants:[]` **incondicional** (no consulta la estación) | `snow.service.ts:121-135` (`void slug`) |
| B2 | `SnowService.rankingNieve` | depende **solo** de `reports.listPublished`; vacío ⇒ `no_data`/`outside-season` | `snow.service.ts:139-148` |
| B3 | `SnowService.rankingKm` | ídem B2 sobre `operational.kmOpen` | `snow.service.ts:150-159` |
| B4 | `SnowService.getForecast` / `getAvalanche` | sin credencial ⇒ `not_configured` (`aemet`/`meteofrance`/`c3s`/`aemet-bpa`); **con** credencial ⇒ `error` retryable:false ("not wired in v1") | `snow.service.ts:108-117`; `env-gated.adapter.ts:48-56` |
| B5 | `SnowDataService` (cadena de fallback) | recorre `FALLBACK_CHAINS`; ausencia ⇒ `no_data` + `reason` tipado; `image` ⇒ `blocked` | `chain/chain.ts:29-63`; `fallback-chains.ts:4-13` |

El laudo incluye "snow-api/snow server borde" y "editorial" como pendientes: **no son mocks**. El
borde ya está operativo (SNOW-01 §10/§13.5) y el editorial es el adaptador terminal. Quedan
excluidos del inventario de mocks y clasificados como **destino** en §6.

### 1.4 Lista final numerada (reconciliada)

**14 áreas de página con datos simulados (grupo A)** — `1..14` según §1.2 (los sub-servicios de
weather y admin se cuentan dentro de su área). **5 operaciones de estado fijo (grupo B)** — `B1..B5`.

Conclusión de reconciliación: la lista correcta **no** es "nueve" ni "cinco + cuatro". Es
**14 áreas de página (17 servicios) + 5 operaciones de borde**, donde el subconjunto
`{stations-list, station-detail, weather, home, planner}` es correcto como **orden de reconexión
prioritario a nieve**, no como inventario completo.

---

## 2. Matriz antes/después — fila completa por servicio

Columnas: **Consumidores** (ruta/componente) · **Contrato público** · **Dependencias** · **Mock
actual** · **Operativo requerido** · **Persistencia** · **Fuente de datos** · **Errores** · **Pruebas**.

### 2.1 Grupo A (servicios de página)

| # Servicio | Consumidores (ruta) | Contrato público | Dependencias | Mock actual | Operativo requerido | Persistencia | Fuente | Errores | Pruebas |
|---|---|---|---|---|---|---|---|---|---|
| 1 stations-list | `StationsList` (`/estaciones`) | `StationsListPageData` (`stations-list.models.ts`) | `fetch`, `HttpClient` (nulo en mock) | `USE_MOCK_DATA:true` + JSON | `GET /api/snow/v1/stations` + `/search` (filtros/orden por query) | JSON store `stations.json` | `editorial-stations` (maestro propio) | `try/catch` + throw; sin estado degradado | 0 (fuera de `node --test`) |
| 2 station-detail | `StationDetail` (`/estacion/:slug`) | `StationDetailPageData` | `fetch` | `USE_MOCK_DATA = true` + JSON por slug | `GET /api/snow/v1/stations/:slug` + `/report` | JSON store | editorial maestro + parte | `try/catch` + throw | 0 |
| 3 weather/metéo | `TiempoPageComponent` (`/meteorologia`, `/estacion/:slug/tiempo`) | `MeteoNow/MeteoForecast/WebcamItem/RadarInfo` | `MeteoDataService`, `MeteoStateStore` | `fetch` a mocks | `GET /api/snow/v1/stations/:slug/forecast` (+ `now`/`radar` si se añaden) | `forecast-cache.json` (futuro) | `aemet`/`meteofrance`/`c3s` (A1/A2) | `try/catch` + throw | 0 |
| 4 weather/snow-data | ídem (paneles nieve) | `SnowConditions/DetailedForecast/…` | `SnowDataService` | `fetch` a mocks | `GET /api/snow/v1/stations/:slug/report` (condiciones) | JSON store | editorial | sin manejo (fetch sin try) | 0 |
| 5 weather/alerts | `alerts-panel` | `Alert[]` | `AlertsService` (localStorage dismissed) | 4 alertas en memoria | `GET /api/snow/v1/stations/:slug/alerts` (**GAP: ruta no existe en `SNOW_ROUTES`**) | (n/a) | `aemet`/`meteofrance` | sin manejo | 0 |
| 6 weather/stations | selectores de cota/estación | `SkiStation` | — | catálogo en memoria | `GET /api/snow/v1/stations` | JSON store | editorial | `getStationBySlug → null` | 0 |
| 7 home | `Home` (`/`) | `HomePageData` | `fetch` | `USE_MOCK_DATA:true` + JSON | sin sustituto nieve v1 (se deja mock o adaptador de indisponibilidad) | n/a | editorial (solo bloque "estaciones destacadas") | `try/catch` + throw | 0 |
| 8 planner | `Planner` (`/plan`) | `PlannerPageData` | `fetch`, localStorage | `USE_MOCK_DATA = true` + JSON + defaults | sin sustituto nieve v1 | localStorage (planes) | n/a | defaults locales | 0 |
| 9 blog-list | `BlogList` (`/blog`) | `BlogListPageData` | `fetch` | `USE_MOCK_DATA = true` + JSON + defaults | sin sustituto nieve v1 | n/a | editorial propia (futuro) | defaults locales | 0 |
| 10 blog-article | `BlogArticle` (`/blog/:slug`) | `BlogArticleDetail` | `fetch` | flag + JSON + generación con `Math.random()` | sin sustituto nieve v1 | n/a | editorial propia (futuro) | `getDefaultArticleData` | 0 |
| 11 lodging-marketplace | `LodgingMarketplace` (`/alojamientos`) | `LodgingMarketplacePageData` | `fetch` | `USE_MOCK_DATA = true` + JSON + defaults | sin sustituto nieve v1 | n/a | marketplace propio (futuro) | defaults locales | 0 |
| 12 lodging-detail | `LodgingDetailComponent` (`/alojamiento/:id`) | `LodgingDetailPageData` | `fetch` | flag + JSON + `generateLodgingDetail` | sin sustituto nieve v1 | n/a | marketplace propio (futuro) | defaults locales | 0 |
| 13 rental-marketplace | `RentalMarketplaceComponent` (`/alquiler-material`) | `RentalMarketplacePageData` | `fetch` | `USE_MOCK_DATA = true` + JSON | sin sustituto nieve v1 | n/a | marketplace propio (futuro) | `catch` → throw | 0 |
| 14 premium | `PremiumComponent` (`/premium`) | `PremiumPageData` | `fetch` (relativo) | `fetch` a mock | sin sustituto nieve v1 | n/a | catálogo propio (futuro) | devuelve `null` | 0 |
| 15 shop-detail | `ShopDetailComponent` (`/tienda/:slug`) | `RentalShop/EquipmentItem` | `fetch` | `fetch` a mock | sin sustituto nieve v1 | n/a | marketplace propio (futuro) | `return false` | 0 |
| 16 account | `Account` (`/cuenta`, `authGuard`) | `UserProfile/Booking/Preferences/…` | import JSON + `simulateApiDelay` | mocks importados + delay simulado | sin sustituto nieve v1 (dominio de cuenta) | n/a | backend de cuenta (futuro) | señales de error | 1 (`account.spec.ts`) |
| 17 admin | `Admin` (`/admin`, `adminGuard` + 26 módulos) | `AdminMetrics/…` por dominio | `fetch` | `fetch` a `/assets/mocks/admin/*.json` | nieve editorial: `GET/POST /api/snow/v1/admin/reports` + `GET /config` | JSON store (solo nieve) | editorial (nieve) | señales de error | 0 |

### 2.2 Grupo B (operaciones del módulo snow) — fila completa

| # | Consumidores | Contrato público | Dependencias | Estado fijo hoy | Operativo requerido | Persistencia | Fuente | Errores | Pruebas |
|---|---|---|---|---|---|---|---|---|---|
| B1 getWebcams | `snow-webcams.component` (`/nieve/webcams`), `station-snow-report` | `{status:'blocked', grants: ImageGrant[]}` | `makeProvenance`, `authorizationFor` | `blocked` incondicional | autorización de enlace editorial por estación (cuando exista fuente) | n/a | `ImageGrant.linkUrl` editorial | n/a (nunca 500) | `degradation.test.ts` |
| B2 rankingNieve | `snow-dashboard`/rankings | `{status, ranking[]}` | `reports.listPublished` | vacío ⇒ `no_data` | ranking desde partes publicados | `snow-reports.json` | editorial | n/a | `chains-and-time.test.ts` |
| B3 rankingKm | ídem | `{status, ranking[]}` | ídem | ídem | ídem | ídem | ídem | ídem | ídem |
| B4 getForecast/getAvalanche | `tiempo-page` (futuro), aludes | `ProviderResult<ForecastBundle\|AvalancheBulletin>` | `env-gated.adapter` | `not_configured` sin cred | cablear proveedores A1/A2/A3 (fuera de v1) | `forecast-cache.json` | `aemet`/`meteofrance`/`c3s` | `error` retryable:false | `degradation.test.ts`, `chains-and-time.test.ts` |
| B5 SnowDataService | todo el borde | `ProviderResult<T>` discriminado | `FALLBACK_CHAINS`, `Breaker` | `no_data`+`reason` / `blocked` | cadena real con rate-limit+breaker | n/a | adaptadores | nunca `null` | `chains-and-time.test.ts`, `execution.test.ts` |

---

## 3. Modelo de datos

### 3.1 Entidades requeridas

La fuente autoritativa del esquema es `web-ssr/src/snow/store/schema.sql` (validado por
`scripts/snow/check-schema.mjs`, 8/8 invariantes). Las entidades:

| Entidad | Almacenamiento v1 | Claves / ids | Notas |
|---|---|---|---|
| **Estación** (`station`) | `stations.json` (`Station`) | `slug` único (id interno + slug público) | maestro editorial; `discipline: 'alpine'\|'nordic'`; coordenadas `lat/lng`; altitudes base/top; `seasonOpen/Close/Confirmed` |
| **Región / sistema montañoso** | campo `region` en `Station` (sin tabla propia en v1) | — | `region` es editorial (p. ej. "Pirineo Catalán"), no OSM |
| **Ubicación/coordenadas** | campos `lat/lng` en `Station` | — | editorial propio; el extracto OSM va separado en `osm-derived.json` |
| **Pistas y remontes** | sub-campos de `OperationalStatus` (`liftsOpen/Total`, `pistesOpen/Total`, `kmOpen/Total`, `byLevel`) | dentro de `SnowReport` | parte editorial (05b §3: estado/espesores solo editorial) |
| **Parte operativo** (`snow_report`) | `snow-reports.json` (`SnowReport`) | `id` UUID + `stationSlug` + `observedAt` | obligatorio `sourceUrl/capturedAt/author/confidence`; `mood` draft/pending/published/rejected |
| **Observaciones meteorológicas** (`now`/condiciones) | v1: **NO IMPLEMENTADO** (sin endpoint `now`); degrada a `no_data` | — | requiere proveedor A1/A2; se documenta como GAP |
| **Pronósticos** (`forecast_cache`) | `forecast-cache.json` (`ForecastCacheEntry`) | `stationSlug` + `source` | automático; guardado con procedencia; sin proveedor ⇒ vacío |
| **Webcams autorizadas** (`ImageGrant`) | **NO persistido en v1** (solo `linkUrl` editorial cuando exista) | — | `embedAllowed: false` siempre |
| **Alertas** (`weather-alert`) | **NO persistido en v1** (sin endpoint ni adapter funcional) | — | GAP a cerrar en persistencia/API |
| **Proveedores** | `providers/authorizations.ts` + `registry.ts` (tabla estática) | `ProviderId` | veredictos legales copiados de 05 §2 |
| **Informes editoriales** | `snow-reports.json` (`SnowReport`) | `id` UUID | mismo que "parte operativo" |
| **Usuarios/favoritos/preferencias** | **NO existe en nieve** (R4: favoritos `localStorage` client-only) | — | no hay modelo de usuario en v1 |
| **Historial y procedencia** | `Provenance` (tupla obligatoria por lectura) + `forecast-cache.json` | `source/observedAt/updatedAt/licenseStatus` | procedencia SIEMPRE presente, incluso sin dato |

### 3.2 Decisión de persistencia — JSON store v2 sobre `data/snow` (justificada)

**Decisión:** mantener el **JSON store versionado** (`data/snow/*.json`, `schemaVersion: 1`) como
soporte de runtime v1, y **no** introducir SQLite en runtime salvo que se justifique y pruebe.

**Justificación comprobable:**

1. El repositorio **ya tiene** un JSON store operativo con escritura atómica (`renameSync` en
   `file-io.ts:42`) y bootstrap determinista idempotente (`bootstrapStore`, `file-io.ts:139-157`),
   probado por B1–B5 (`bootstrap.test.ts`). Cambiar de soporte ahora reabriría trabajo verificado.
2. El esquema SQL (`schema.sql`) **ya está validado** con `node:sqlite` en tests
   (`check-schema.mjs`, 8/8 PASS). Es el **destino documentado**, no un rival de v1.
3. El volumen de datos v1 (≤ decenas de estaciones y partes) no justifica un motor relacional; el
   riesgo de concurrencia se mitiga con la interfaz de repositorio (`repository.ts`) y escritura
   atómica.
4. `node:sqlite` es experimental en Node 24 y su uso en runtime **no** aporta nada que el JSON no
   dé ya para el contrato actual. **SQLite opcional SOLO** si una futura necesidad (búsqueda de
   texto, índices por rango) lo justifica **y** se prueba contra la misma interfaz de repositorio.

**Riesgo declarado:** el JSON store no es transaccional multi-proceso. Se acepta en v1 porque hay
**un** proceso Express y las escrituras son atómicas por fichero.

### 3.3 Migración desde `data/snow/*.json` actual

| Fichero actual | Contenido hoy | Acción SNOW-02 | Destino |
|---|---|---|---|
| `data/snow/stations.json` | 3 estaciones (seed) | **conservar**; añadir upsert admin para el maestro | JSON v2 (mismo `schemaVersion: 1`) |
| `data/snow/snow-reports.json` | `records: []` | **conservar**; el admin editorial la puebla | JSON v2 |
| `data/snow/osm-derived.json` | `records: []` | **conservar** vacío (separación ODbL) | JSON v2 |
| `web-ssr/src/snow/store/json-store/seed/*` | seed curado | **no tocar** (fuente de bootstrap, embebido en bundle) | seed |

**Regla de migración:** no hay "migración destructiva"; el esquema `schemaVersion: 1` se mantiene.
Los nuevos campos (si los hubiera) se añaden con valores por defecto y `updatedAt` se reescribe solo
en escritura. El `bootstrapStore` nunca sobrescribe datos de runtime existentes (B3).

### 3.4 IDs internos + slugs

- **Slug público:** `Station.slug` (p. ej. `baqueira-beret`) — estable, en URL, único.
- **ID interno de parte:** `SnowReport.id` = UUID v4 (`randomUUID()` en `snow.service.ts:186`).
- **Puente OSM opaco:** `station_osm_link` (sin FK fuerte), si se importa OSM en el futuro.

---

## 4. Contratos API v1 (lista canónica, sin duplicados)

La fuente única de verdad **hoy** es el array `SNOW_ROUTES` (`snow.routes.ts:30-185`) y su espejo
tipado `SNOW_ENDPOINTS` (`app/snow/client/snow-endpoints.ts`). El contrato v1 se fija así:

### 4.1 Endpoints públicos (sin auth)

| # | Método | Ruta | Auth | Query permitidos | Respuesta | Errores tipados |
|---|---|---|---|---|---|---|
| 1 | GET | `/api/snow/v1/stations` | — | `country`, `region`, `discipline`, `status`, `snowMin`, `sort`, `sortDir`, `page`, `pageSize` (filtros/orden/paginación a implementar sobre el maestro) | `{ status:'ok', provenance, stations: StationSummary[] }` | `500 internal` |
| 2 | GET | `/api/snow/v1/stations/:slug` | — | — | `{ status:'ok', provenance, station: StationSummary }` | `404 station-not-found`, `500` |
| 3 | GET | `/api/snow/v1/stations/:slug/report` | — | — | `SnowReportDto` (`status ok/stale/no_data/not_configured/blocked` + `reason` + `provenance` + campos editoriales opcionales) | `404`, `500` |
| 4 | GET | `/api/snow/v1/stations/:slug/forecast` | — | — | `{ status, data?, reason?, provenance }` (degradado a `not_configured`) | `404`, `500` |
| 5 | GET | `/api/snow/v1/stations/:slug/alerts` | — | — | `{ status:'no_data'|'not_configured', reason, provenance, alerts }` | `404`, `500` — **GAP: ruta no existe aún en `SNOW_ROUTES`; la añade la tarea de API** |
| 6 | GET | `/api/snow/v1/stations/:slug/webcams` | — | — | `{ status:'blocked', reason:'license-prohibits', provenance, grants: [] }` | `404` (no se consulta hoy; se fija `404` para coherencia), `500` |
| 7 | GET | `/api/snow/v1/avalanche` | — | — | `{ status, data?, provenance }` (degradado `not_configured`) | `500` |
| 8 | GET | `/api/snow/v1/rankings/nieve` | — | — | `{ status:'ok'|'no_data', reason?, provenance, ranking[] }` | `500` |
| 9 | GET | `/api/snow/v1/rankings/km` | — | — | ídem (sobre `kmOpen`) | `500` |
| 10 | GET | `/api/snow/v1/season-dates` | — | — | `{ status:'ok', provenance, dates[] }` | `500` |
| 11 | GET | `/api/snow/v1/search` | — | `q` (obligatorio, normalizado) | `{ status:'ok', provenance, stations[] }` | `500` |

**Sin endpoint propio (por decisión R4 / reutilización):**
- **Comparador** (F25): client-side; reutiliza `GET /stations` (N fichas) + `GET /stations/:slug/report`
  (N partes). No añade ruta. La distancia exige origen explícito del usuario.
- **Favoritos** (F07): `localStorage` + `signal` en cliente; **sin servidor** (R4).
- **Mapa** (F10): tiles por `PROTOMAPS_BASE_URL`; sin endpoint v1.

### 4.2 Endpoints admin (auth `Bearer SNOW_ADMIN_TOKEN`, fail-closed)

| # | Método | Ruta | Auth | Cuerpo | Respuesta | Errores |
|---|---|---|---|---|---|---|
| 12 | GET | `/api/snow/v1/config` | Bearer | — | `{ providers[], breaker[], rateLimits{} }` (estado de fuentes) | `401 unauthorized`, `500` |
| 13 | GET | `/api/snow/v1/admin/reports` | Bearer | — | `{ reports: SnowReport[] }` | `401`, `500` |
| 14 | POST | `/api/snow/v1/admin/reports` | Bearer | `NewSnowReportInput` (validado) | `201 { report }` | `400 invalid` + `fields[]`, `401`, `500` |
| 15 | PUT | `/api/snow/v1/admin/stations/:slug` | Bearer | `Station` (upsert maestro) | `200 { station }` | `400`, `401`, `500` — **propuesta; hoy `StationRepository.upsert` existe (`json-station-repository.ts:19`) pero no hay ruta** |

### 4.3 Mapeo de estado → HTTP (no negociable, 02 §3.2)

| `ProviderResult` | HTTP | Cuerpo |
|---|---|---|
| `ok` / `stale` | 200 | `status` + `data` + `provenance` |
| `no_data` | **200** | `status:'no_data'` + `reason` + `provenance` |
| `not_configured` | **200** | `status:'not_configured'` + `reason:'not-covered'` |
| `blocked` | **200** | `status:'blocked'` + `reason:'license-prohibits'` |
| `rate_limited` | 200 | `status:'no_data'` + `reason:'source-silent'` |
| `error` (cualquiera) | 500 | `{ error:'internal' }` + log con `redactUrl` |
| estación inexistente | 404 | `{ status:'not_found', provenance }` |

**Errores tipados canónicos:** `station-not-found` (404), `internal` (500), `unauthorized` (401),
`invalid` + `fields[]` (400). Los estados `no_data`/`not_configured`/`blocked`/`stale` son **datos**,
nunca errores HTTP. **Nunca** 500 por falta de credencial, ni `302`, ni `data:0` como "sin dato".

---

## 5. Integridad de datos

### 5.1 Contrato de campos (por lectura)

Todo payload con `provenance` obliga a estos campos (definidos en `provider-contracts.ts:78-87` y
proyectados en `models/dto.ts:6-21`):

| Campo | Tipo | Regla |
|---|---|---|
| `source` | `ProviderId` | siempre presente; identifica la fuente real |
| `observedAt` | ISO 8601 UTC string | fecha del dato (no de la petición) |
| `updatedAt` | `string \| null` | **null si no hay actualización de operador**; nunca `observedAt` como sustituto |
| `status` | `live/cached/stale/degraded` | degradación explícita |
| `licenseStatus` | `LicenseStatus` | `allowed/with-attribution/restricted/blocked/unverified` |
| `freshness` | número (segundos) | `now - observedAt`, mínimo 0 |
| `authorization` | objeto | `registryRef/licenseId/commercialUse/storageAllowed/attributionRequired` |
| `attribution` | `string \| null` | obligatorio si `licenseStatus === 'allowed-with-attribution'` |

### 5.2 Reglas null ≠ 0 y anti-sentinel

1. **Ausencia = `null` + `reason`** (`NoDataReason`), nunca `0`, `-1`, `-99`, `NaN`, `Infinity`.
2. `normalizeNoData` (`providers/normalize.ts:5-10`) mapea `-99`/`NaN`/`±∞` → `null` (centinela AEMET/IPMA).
3. El CHECK SQL rechaza negativos y enums inválidos (`check-schema.mjs`, invariantes 3/6/7/8).
4. `updatedAt ?? observedAt` está **prohibido**: SNOW-01 ya corrigió dos sitios donde se presentaba el
   instante de la petición como fecha de parte (`EXECUTION-STATE.md §7`,
   `station-state.component.ts`, `snow-station-detail.component.ts`).
5. **No reutilizar datos caducados como actuales:** el consumidor solo puede leer `data` tras
   discriminar `status === 'ok' | 'stale'` (`ProviderResult` discriminado). Un `stale` se rotula como
   tal (`stale-ribbon.component.ts`), nunca como `live`.

---

## 6. Plan de integración frontend (por data service)

Regla: **no se elimina un mock sin sustituto operativo o adaptador de indisponibilidad explícito.**
El estado de indisponibilidad es un **componente/estado visual**, no un error 500.

| Data service | Llamada real que lo sustituye | Estado de indisponibilidad (sin proveedor) |
|---|---|---|
| stations-list | `GET /api/snow/v1/stations` + `/search` (filtros/orden como query) | lista vacía + "Sin datos disponibles" (`nodata.component.ts`) |
| station-detail | `GET /api/snow/v1/stations/:slug` + `/report` | "Temporada cerrada — sin parte publicado" (`status: no_data`, `reason: outside-season`) |
| weather/metéo | `GET /api/snow/v1/stations/:slug/forecast` | "Sin datos disponibles" (`not_configured` → `no_data`) |
| weather/snow-data | `GET /api/snow/v1/stations/:slug/report` | ídem (parte `no_data`) |
| weather/alerts | `GET /api/snow/v1/stations/:slug/alerts` (GAP: añadir ruta) | panel sin alertas + `not_configured` |
| weather/stations | `GET /api/snow/v1/stations` | selector con estaciones del maestro |
| home | **se mantiene mock** (bloques de negocio fuera de nieve); el bloque "estaciones destacadas" puede reutilizar `GET /stations` | estado vacío si no hay dato |
| planner | **se mantiene mock** (no es nieve) | datos por defecto locales |
| blog-list / blog-article | **se mantienen mock** (editorial de blog, fuera de nieve v1) | defaults locales |
| lodging-*/rental-*/premium/shop-detail | **se mantienen mock** (dominios de negocio fuera de nieve) | defaults locales |
| account | **se mantiene mock** (dominio de cuenta) | señales de error existentes |
| admin (26 módulos) | **solo el módulo de nieve** se reconecta: `GET/POST /api/snow/v1/admin/reports` + `GET /config`; el resto del admin se mantiene mock | nieve: 401 fail-closed si falta token |
| snow-webcams | `GET /api/snow/v1/stations/:slug/webcams` | `blocked`/`license-prohibits` → "No hay cámaras con enlace autorizado" |

**Prioridad de reconexión:** `stations-list` → `station-detail` → `weather` → `home` → `planner`
(coincide con el subconjunto correcto del laudo), porque son las 5 páginas que la arquitectura 06
ya definió como puntos de extensión (§11.2). El resto es deuda de negocio fuera del alcance nieve.

---

## 7. Riesgos y decisiones (con alternativa rechazada)

| # | Decisión | Alternativa rechazada | Motivo |
|---|---|---|---|
| R1 | Mantener JSON store v2 (`data/snow`) como runtime v1 | Introducir SQLite en runtime ahora | `node:sqlite` es experimental; el JSON ya está probado (B1–B5) y el esquema SQL ya está validado como destino; reabrir el soporte sin necesidad real |
| R2 | Reconectar solo las 5 páginas nieve prioritarias | Reconectar también blog/lodging/rental/account/admin completos | Son dominios fuera del alcance nieve; su reconexión es trabajo de otro hito; eliminar sus mocks sin sustituto violaría la regla del encargo |
| R3 | No inventar cifras: sin credencial ⇒ `not_configured`→`no_data` (HTTP 200) | Lanzar 500 o fabricar datos de relleno | Contrato 02 §3.2 + regla anti-sentinel; el 500 por falta de credencial está prohibido y la fabricación ya fue señalada como defecto en SNOW-01 |
| R4 | Favoritos client-only (`localStorage`+`signal`) | Endpoint de favoritos con auth | No hay modelo de usuario en v1 (R4); añadir auth multiplicaría el alcance sin desbloquear F02/F03 |
| R5 | Webcams solo `ImageGrant.linkUrl` (`embedAllowed:false`) | Proxy/iframe/img embebida | `FALLBACK_CHAINS.image = []`; la imagen está prohibida por licencia (05b §3) |
| R6 | GAP alertas: fijar `GET /stations/:slug/alerts` en el contrato y añadirlo en la tarea de API | Dejarlo fuera del contrato | El encargo exige "alertas" en la lista canónica; hoy no está cableado (`SNOW_ROUTES` no lo tiene) |
| R7 | Comparador sin endpoint propio (reutiliza `/stations` + `/report`) | Endpoint `/compare?ids=` | F25 reutiliza DTOs existentes; un endpoint nuevo duplicaría lógica y no aporta cacheabilidad adicional en v1 |

**Riesgos residuales (declarados, no ocultos):**
- El JSON store no es transaccional multi-proceso (mitigado: un proceso Express + escritura atómica).
- `forecast`/`avalanche`/`alerts` siguen sin proveedor vivo (A1/A2/A3 pendientes): degradan a
  `not_configured` y la UI debe mostrarlo, no esperarlo.
- La ruta `/alerts` es un GAP del backend actual que la tarea de API debe cerrar antes de que
  `weather/alerts` se reconecte.

---

## 8. Verificación (comandos reales)

Los dos comandos obligatorios se ejecutan al final de esta tarea y su salida real se registra en la
actualización de la tarea (`commandsRun`):

```text
node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit   # esperado exit 0
node scripts/snow/check-schema.mjs                                           # esperado exit 0 (8/8 PASS)
```

Si se tocan contratos, se añade la suite (61/61) enumerando los 9 ficheros de
`web-ssr/src/snow/tests/` explícitamente. Este documento **no** modifica contratos ni modelos.

---

## 9. Reconciliación post-implementación (hallazgos del capitán contra el bundle real)

Medido por el capitán contra el bundle real (67 checks,
`docs/snow/snow02-evidence/captain-http-verify.json`). Cada punto fija la **decisión de contrato**
(no es código: es lo que el revisor independiente evaluará) y su carácter bloqueante.

| # | Hallazgo medido | Decisión de contrato (una frase) | Ref. | ¿Bloqueante? |
|---|---|---|---|---|
| 1 | `POST /admin/reports` acepta y persiste `snow.baseCm = -99` (201) | El borde debe validar los campos numéricos anidados de `operational` y `snow` (≥ 0 o `null`; prohibido `-1`/`-99`/`NaN`/`±∞`) y rechazar con `400 invalid` + `fields[]`, igual que ya hace con `avalancheLevel` y como fija la regla anti-sentinel. | §5.2 | **SÍ (bloqueante)** |
| 2 | `PUT /admin/stations/:slug` exige el cuerpo completo (400 si solo se envía `website`) | `PUT` es **reemplazo total** (semántica idempotente, coherente con `StationRepository.upsert` que sustituye el registro): el cliente debe enviar el `Station` completo; la actualización parcial (PATCH) queda fuera de v1 y se documenta así. | §4.2 | NO (decisión documentada) |
| 3 | El parte recién escrito sale `stale` en el ranking mientras `/report` sale `ok` | Debe existir **una única regla de frescura** para el dato editorial (p. ej. `freshness > UMBRAL ⇒ stale`) aplicada idénticamente por `/report` (`deriveReportStatus`) y por rankings/listados; el TTL de 30 min de AEMET es política de **caché de proveedor**, no la regla de frescura editorial, y no debe reutilizarse para rotular datos editoriales. | §5.1 | **SÍ (bloqueante)** |
| 4 | `GET /config` devuelve la cadena literal `AEMET_API_KEY` en `missingEnv` | `/config` no debe exponer nombres de variables de entorno: `missingEnv` se sustituye por un id de capacidad redactado (el `ProviderId` ya presente) o por un booleano, alineado con `redactUrl` y la regla de no exponer configuración sensible. | §5 + `config/env.ts:redactUrl` | NO (endpoint admin-only; endurecimiento requerido) |
| 5 | Comparador y favoritos no tienen endpoint | **Decisión ratificada por diseño** (no es un defecto): comparador reutiliza `GET /stations` + `GET /stations/:slug/report` (R7) y favoritos son `localStorage` client-only (R4); no se añaden rutas. | §4.1 | NO (ya documentado) |
| 6 | `listPublished()` descarta partes con `observedAt` futuro (`notAfter(observedAt, at)`, `json-report-repository.ts:87`): un operador con reloj adelantado o un servidor retrasado hace invisible todo parte recién transcrito (medido: 4 POST → 201 pero `/report` sirve parte viejo y `/rankings/nieve`/`/stations` dan `no_data`) | La **visibilidad la decide `mood === 'published'`**, nunca el reloj; la **antigüedad** la decide una única `editorialFreshness(observedAt, capturedAt, now) = max(0, now − max(observedAt, capturedAt))` con `≤ 30 min ⇒ live`, `> 30 min ⇒ stale`; `capturedAt` (servidor) es el ancla autoritativa y `freshness` nunca es negativa. | §5.1 (freshness) + §5.2 | **SÍ (bloqueante)** |

**Justificación (punto 6):** el reloj solo puede rotular *antigüedad* (`live`/`stale`), nunca borrar
*presencia*. La ausencia de dato solo la justifican `reason` (`NoDataReason`) o `mood ≠ published`,
no un skew de reloj. `capturedAt` lo fija el servidor (`snow.service.ts:188`), así que
`now − max(observedAt, capturedAt)` está acotado superiormente por la edad de transcripción y,
clampado a 0, nunca es negativo. Consecuencias de contrato: (i) `mood: 'draft'|'pending'|'rejected'`
es invisible en público (`listPublished`) y visible solo en `GET /admin/reports` (`listAll`);
(ii) un `observedAt` futuro se sirve **visible** con `freshness: 0` y `status: 'live'` (no se oculta,
no se marca explícitamente como "futuro" en v1).

**Condición de verificación (punto 6):** `POST /admin/reports` con `observedAt` futuro ⇒
`GET /stations/:slug/report` lo sirve con `status:'live'`, `freshness: 0` y `GET /rankings/nieve` lo
incluye; un parte `mood:'draft'` no aparece en ningún endpoint público y sí en `GET /admin/reports`.

**Resumen de bloqueo:** para aceptar SNOW-02 son **bloqueantes** los puntos **1** (integridad,
anti-sentinel), **3** (frescura unificada/etiqueta) y **6** (reloj no decide visibilidad). Los puntos
2, 4 y 5 son decisiones de contrato o endurecimientos que deben quedar documentados pero no impiden
la aceptación funcional.

---

## Anexo A — Mapa de ficheros citados

| Fichero | Rol |
|---|---|
| `web-ssr/src/snow/contracts/provider-contracts.ts` | tipos puros de proveedor (`ProviderResult`, `Provenance`, `ProviderId`, `SnowDataType`) |
| `web-ssr/src/snow/contracts/data-type-map.ts` | formas de carga por tipo (`StationMaster`, `OperationalStatus`, `SnowDepthReport`, `ForecastBundle`, `ImageGrant`, …) |
| `web-ssr/src/snow/models/{station,snow-report,dto}.ts` | dominio + DTO del borde |
| `web-ssr/src/snow/store/repository.ts` | interfaces de persistencia + `parseNewReportInput` |
| `web-ssr/src/snow/store/json-store/*` | JSON v1 (file-io + repositorios + seed) |
| `web-ssr/src/snow/providers/*` | adaptadores (editorial terminal, env-gated, osm, blocked) + autorizaciones |
| `web-ssr/src/snow/chain/{chain,fallback-chains}.ts` | orquestador de fallback |
| `web-ssr/src/snow/cache/{cache-policy,rate-limit,breaker}.ts` | política de caché/cuota/breaker |
| `web-ssr/src/snow/server/{snow.routes,snow.service,http-mapping,admin-auth,index}.ts` | borde Express + mapeo 200/404/500 |
| `web-ssr/src/app/snow/**` | cliente Angular (snow-api, endpoints, páginas, UI) |
| `scripts/snow/{check-schema,ts-loader,ts-resolver}.mjs` | verificación de esquema + loader de tests |
