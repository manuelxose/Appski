# FASE 6 — Arquitectura e integración del módulo `snow/*` en el monorepo

Tarea `t13` · Autor: `backend-impl` · Fecha: **2026-11-16**.
Fuentes vinculantes: [`00b-environment-corrections.md`](./00b-environment-corrections.md) (qué
se puede verificar aquí), [`05b-provider-contracts.md`](./05b-provider-contracts.md) (tipos y
constantes ejecutables), [`02-feature-matrix.md`](./02-feature-matrix.md) (contrato HTTP y esquema),
[`05-provider-registry.md`](./05-provider-registry.md) (veredictos legales citados).

> Consolida las decisiones finales del capitán R1–R5 (§1) sobre el borrador previo de t5. El
> módulo ya está implementado en `web-ssr/src/snow/**`; este documento es el **contrato de
> arquitectura** que t7 (backend), t8 (frontend) y t9 (QA) siguen, y la fuente de verdad de los
> límites de módulo y los comandos de verificación.

---

## 0. Resumen ejecutivo

`snow/*` se construye **dentro** de `web-ssr` (no como lib Nx nueva: Nx está roto en este sandbox,
[00b C1](./00b-environment-corrections.md)), sobre tres carriles con reglas de importación estrictas:

1. **Compartido** (`snow/contracts`, `snow/models`): tipos puros de 05b y DTOs del borde. Sin
   `express`, sin `node:*`, sin Angular. Es lo único que cruza al navegador.
2. **Servidor** (`snow/providers`, `snow/chain`, `snow/cache`, `snow/store`, `snow/server`,
   `snow/config`): adaptadores, cadena de fallback, caché, almacén y rutas Express. Solo se importa
   desde `web-ssr/src/server.ts`, nunca desde componentes.
3. **Cliente** (`app/snow/*`): servicios y páginas Angular. Consume el borde HTTP
   `/api/snow/v1/**` y **solo** los tipos compartidos, nunca los adaptadores ni las constantes de
   caché.

**La restricción que manda sobre todo lo demás** (05 §2, 05b §0 D4): el estado operativo y los
espesores medidos **no tienen fuente automática legalmente reutilizable**. Por eso el adaptador
**editorial es el primero que se construye y es `isTerminal`**, con `sourceUrl` + `capturedAt` +
`author` + `confidence` validados en el borde. No es un parche: es la fuente primaria de F02/F03/
F12/F13, y la API debe poder decir "esto lo reportó un operador humano, desde esta URL, a esta
hora" de forma distinguible de una lectura de proveedor licenciado.

Hoy **0 proveedores con credencial** (A1/A2 pendientes, 05b §9). Toda lectura automática arranca en
`not_configured` → `no_data` → "Sin datos disponibles" con **HTTP 200**, nunca 500. El sistema se
demuestra por su **degradación**, no esperando claves.

---

## 1. Decisiones cerradas (del capitán; no se reabren)

| # | Decisión | Consecuencia en la arquitectura |
|---|---|---|
| R1 | Modelo compartido en `snow/models` + alias en `tsconfig.base.json` | Sin lib Nx nueva, sin `data-access` (scaffold vacío) |
| R2 | v1 almacén = **JSON versionado** tras interfaz de repositorio; SQL documentado como destino | `node:sqlite` solo en tests; sin BD en runtime v1 |
| R3 | Runner = `node:test` nativo | Nada nuevo instalado; **corrección en §12** (hace falta `--test-isolation=none`) |
| R4 | Favoritos sin servidor | `localStorage` + `signal`; sin login |
| R5 | Sin credencial ⇒ `not_configured` → `no_data` → "Sin datos disponibles", HTTP 200 | Degradación probada en test, no esperar claves |

---

## 2. Cómo se verifica aquí (antes de leer el resto)

[`00b C1`](./00b-environment-corrections.md) establece que `nx build` / `nx serve` / `nx run-many`
**no** son gates válidos en este sandbox (fallo del *plugin worker* de Nx, no de la red). Los gates
ejecutables, **verificados de verdad durante esta tarea**, son:

| Gate | Comando exacto | Estado medido (2026-11-16) |
|---|---|---|
| Type-check (todo `web-ssr/src`, incluye `snow/*`) | `node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit` | **exit 0** |
| Tests de dominio/servidor | `node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs --test --test-isolation=none <ficheros…>` | **exit 0** (32/32 pass) |
| Invariantes de esquema SQL | `node scripts/snow/check-schema.mjs` | **exit 0**, 8/8 PASS |
| Auditoría estática | `node scripts/snow/audit.mjs` | **exit 0** (PASS=27 FAIL=0) |

> **Comando de test — forma que SÍ corre aquí (verificada por QA en t9):**
> `node --test <fichero>` falla con `spawn EPERM` (el runner aísla cada fichero en un proceso hijo
> con stdio pipeado, bloqueado por el sandbox de Windows). Además el *type stripping* de Node no
> resuelve imports **sin extensión** (necesita un resolve hook) ni admite **parameter properties**
> (necesita `--experimental-transform-types`). La forma operativa, y la única que C22/C24/C26 usan, es:
>
> ```text
> node --experimental-transform-types \
>   --import ./scripts/snow/ts-loader.mjs \
>   --test --test-isolation=none <f1> <f2> …
> ```
>
> Sin `--test-isolation=none` no corre ni un test; con un **directorio** en vez de ficheros explícitos
> da `ERR_UNSUPPORTED_DIR_IMPORT`. El script `test` debe enumerar los ficheros.

**BLOCKED en este sandbox** (se declara, no se simula): `nx build` / `nx serve`, bundle real, E2E en
navegador, medición de Core Web Vitals reproducible. Ningún paso de t7/t8/t9 puede colgar su
aceptación de esos artefactos.

---

## 3. Objetivos y no-objetivos

**Objetivos de esta arquitectura** (qué fija t5):

- Dónde vive `snow/*`, quién puede importar qué, y dónde se engancha `server.ts`.
- El borde HTTP `/api/snow/v1/**` con su contrato 200/404/500 (hereda 02 §3.2, no lo reabre).
- El mapeo 1:1 de 05b (§1–§6) a ficheros: adaptadores, cadena, caché, breaker, configuración.
- El almacén: interfaz de repositorio + JSON v1 + SQL como destino documentado.
- Los **puntos de extensión** en las tres páginas existentes (`stations-list`, `station-detail`,
  `weather`) y las rutas nuevas.
- El editorial como adaptador de primera clase y el camino de degradación.
- La lista exacta de comandos que prueban la implementación (los que corren aquí).

**No-objetivos** (queda fuera de t5; dueños indicados):

- Implementar código (`t7` backend, `t8` frontend).
- Estrategia/cobertura de tests (`t9`/QA).
- Migración real a SQLite o montar BD (fuera de v1; `t7` solo deja la interfaz).
- Conseguir credenciales A1/A2/A3 o contratar API de infonieve (A5). Fuera del equipo.
- Reabrir los veredictos legales de 05/05b.

---

## 4. Vista de componentes

```
                             ┌──────────────────────────────────────────────┐
                             │  web-ssr/src/server.ts  (Express, Node 24)    │
                             │  ┌──────────────────────────────────────────┐ │
  navegador ── HTTP ───────► │  │  snow/server/snow.routes.ts              │ │
  GET /api/snow/v1/**        │  │   controllers → http-mapping (200/404/500)│ │
                             │  └───────────────┬──────────────────────────┘ │
                             │                  ▼                             │
                             │  snow/chain/chain.ts  (FALLBACK_CHAINS)        │
                             │                  ▼                             │
                             │  snow/providers/*.adapter.ts  (05b §2)         │
                             │      [E] editorial-report (TERMINAL, 1.º)      │
                             │      [A] aemet / meteofrance / c3s / osm / …   │
                             │      [X] blocked-providers (sin red)           │
                             │                  ▼                             │
                             │  snow/cache/*  (CACHE_POLICY, breaker, TTL)    │
                             │                  ▼                             │
                             │  snow/store/repository.ts  →  JSON v1  (R2)    │
                             └──────────────────────────────────────────────┘
                                          ▲ HTTP (mismo proceso, loopback)
                                          │ solo durante SSR (con TransferState)
                             ┌────────────┴──────────────────────────────────┐
                             │  web-ssr/src/app (Angular 20, SSR)            │
                             │  app/snow/snow-api.service.ts  → DTO          │
                             │  app/snow/pages/*  (F01..F19)                  │
                             │  + reconecta pages/stations-list · station-   │
                             │    detail · weather  (F04 · F03 · F08)         │
                             └──────────────────────────────────────────────┘
```

El único contrato que cruza el borde es el **DTO** (`snow/models/dto.ts`), un subconjunto estable
de `ProviderResult` con `Provenance` ya aplanado (02 §3.1–§3.2). El cliente **no** ve
`CACHE_POLICY`, `RATE_LIMITS`, `BREAKER`, `FALLBACK_CHAINS` ni ningún adaptador.

---

## 5. Layout físico (árbol de ficheros)

```
web-ssr/src/
├── server.ts                                  # [INTEGRACIÓN] monta snow/server/snow.routes.ts
│
├── snow/                                      # ← módulo snow/* (servidor + compartido)
│   ├── index.ts                               # re-exporta solo lo compartido (contratos+modelos)
│   ├── contracts/                             # COMPARTIDO (tipos puros, sin node/express/angular)
│   │   ├── provider-contracts.ts              # 05b §1: ProviderResult, Provenance, Authorization,
│   │   │                                      #   LicenseStatus, NoDataReason, SnowDataType, ProviderId
│   │   ├── data-type-map.ts                   # 05b §2.2: StationMaster, OperationalStatus,
│   │   │                                      #   SnowDepthReport, ForecastBundle, AvalancheBulletin,…
│   │   │                                      #   (único import cruzado sancionado: SnowQuality)
│   │   └── index.ts
│   ├── models/                                # COMPARTIDO (dominio + DTO del borde) — alias R1
│   │   ├── station.ts                         # dominio editorial: Station (maestro)
│   │   ├── snow-report.ts                     # dominio editorial: SnowReport (parte)
│   │   ├── dto.ts                             # 02 §3.2: SnowReportDto, ProvenanceDto, StationSummary
│   │   └── index.ts
│   ├── providers/                             # SERVIDOR (red)
│   │   ├── provider-adapter.ts                # 05b §2: ProviderAdapter<T>, ProviderInput, StationRef
│   │   ├── registry.ts                        # PROVIDERS: id → adapter + licenseByType (guarda runtime)
│   │   ├── editorial-stations.adapter.ts      # [E] maestro, isTerminal — PRIMERO
│   │   ├── editorial-report.adapter.ts        # [E] parte, isTerminal — PRIMERO
│   │   ├── aemet.adapter.ts                   # [A] (A1)
│   │   ├── aemet-bpa.adapter.ts               # [A] (A1, PDF→enlace+metadatos en v1)
│   │   ├── meteofrance.adapter.ts             # [A] (A2)
│   │   ├── copernicus-c3s.adapter.ts          # [A] (AD/PT)
│   │   ├── osm.adapter.ts                     # [A] ODbL, solo geometría/nombres → osm_derived_*
│   │   ├── basemap/ (protomaps, ign-es, ign-fr, copernicus-clms)   # [A]
│   │   └── blocked-providers.ts               # infonieve/ipma/maptiler/stadia/… → blocked sin red
│   ├── chain/
│   │   └── chain.ts                           # 05b §3: FALLBACK_CHAINS + executeChain()
│   ├── cache/
│   │   ├── cache-policy.ts                    # 05b §4.2: CACHE_POLICY
│   │   ├── rate-limit.ts                      # 05b §4.3: RATE_LIMITS (verified:false)
│   │   ├── breaker.ts                         # 05b §4.3: BREAKER
│   │   └── memory-cache.ts                    # TTL en memoria (por petición SSR; opcional compartido)
│   ├── store/                                 # SERVIDOR (persistencia, R2)
│   │   ├── repository.ts                      # interfaces StationRepository · SnowReportRepository ·
│   │   │                                      #   ForecastCacheRepository (las únicas que importa server)
│   │   ├── json-store/                        # v1: JSON versionado (node:fs)
│   │   │   ├── file-io.ts                     # lectura/escritura atómica + versionado
│   │   │   ├── json-station-repository.ts
│   │   │   ├── json-report-repository.ts
│   │   │   ├── json-forecast-repository.ts
│   │   │   └── seed/                          # datos EDITORIALES propios, commitables (nuestra curaduría)
│   │   ├── schema.sql                         # 02 §3.3 (destino documentado; se aplica en tests)
│   │   └── sqlite-repository.ts               # adaptador futuro (NO se construye en v1)
│   ├── server/                                # SERVIDOR (Express)
│   │   ├── snow.routes.ts                     # Router: GET /api/snow/v1/…
│   │   ├── http-mapping.ts                    # ProviderResult → HTTP 200/404/500 (02 §3.2)
│   │   ├── controllers/
│   │   │   ├── stations.controller.ts         # GET /stations, /stations/:slug, /search
│   │   │   ├── report.controller.ts           # GET /stations/:slug/report  (F02/F03)
│   │   │   ├── forecast.controller.ts         # GET /stations/:slug/forecast (F08)
│   │   │   ├── avalanche.controller.ts        # GET /avalanche (F15)
│   │   │   ├── webcams.controller.ts          # GET /stations/:slug/webcams → ImageGrant (F09)
│   │   │   ├── rankings.controller.ts         # GET /rankings/nieve · /rankings/km (F12/F13)
│   │   │   ├── calendar.controller.ts         # GET /season-dates (F14)
│   │   │   └── admin.controller.ts            # POST/PUT/DELETE /admin/** (F23, protegido)
│   └── config/
│       └── env.ts                             # 05b §6: requireEnv, ConfigStatus, redactUrl
│
└── app/
    └── snow/                                  # CLIENTE (Angular)
        ├── snow-api.service.ts                # HttpClient → /api/snow/v1/**; tipos = models/dto.ts
        ├── snow-state.service.ts              # signals + caché cliente; favoritos (localStorage, R4)
        ├── provenance/                        # render de Provenance + etiquetas NoDataReason (05b §3.2)
        ├── components/                        # componentes compartidos nieve (empty-state, chip, …)
        └── pages/                             # F01, F02, F09, F12–F19 (las rutas nuevas, §11)
```

---

## 5.1 Inventario de módulos (una entrada por capacidad del encargo)

Cada módulo nombra su capacidad (02 §1), su tipo de dato (05b), y en qué carril vive.

| Módulo | Capacidad (F#) | Tipo de dato 05b | Lado servidor | Lado cliente |
|---|---|---|---|---|
| **stations** | F04 directorio · F05 país · F06 búsqueda | `station-master` | `GET /stations`, `/search`, `/stations/:slug` + `editorial-stations.adapter` | `app/snow` (directorio/país) + reconecta `stations-list` |
| **conditions** | F02 parte · F03 detalle | `operational-status` + `snow-depth` | `GET /stations/:slug/report` + `editorial-report.adapter` (TERMINAL) | `station-snow-report`/`station-lifts-slopes` + reconecta `station-detail` |
| **forecasts** | F08 previsión | `forecast` | `GET /stations/:slug/forecast` + `aemet`/`meteofrance`/`copernicus-c3s` | reconecta `weather` (`tiempo-page`) |
| **webcams** | F09 webcams | `image` (SIEMPRE `blocked`) | `GET /stations/:slug/webcams` → `ImageGrant.linkUrl` | `webcams` (solo enlaces `target=_blank rel=noopener`, nunca `img`/iframe) |
| **maps** | F10 mapa | `basemap` | adaptadores `protomaps`/`ign-es`/`ign-fr`/`copernicus-clms` (sin endpoint v1; config por env) | Leaflet + PMTiles propio; deshabilitado con aviso si falta `PROTOMAPS_BASE_URL` |
| **alerts** | avisos meteorológicos | `weather-alert` | `GET /stations/:slug/alerts` → `aemet`/`meteofrance` (not_configured sin A1/A2) | `alerts-panel` (reutiliza `weather` alerts) |
| **reports** | F16/F17 partes de usuario + F02 | editorial | `POST/GET /admin/reports` (auth) + `editorial-report.adapter` | `user-reports` (form + listado) |
| **favorites** | F07 favoritos | (dato de usuario) | **sin servidor** (R4) | `snow-state.service` `localStorage` + `signal` |
| **comparison** | F25 comparar estaciones lado a lado | `station-master` + `operational-status`/`snow-depth` | **sin endpoint nuevo**: reutiliza `GET /stations` + `/report` | `app/snow/comparison` (elige N estaciones, muestra sus partes) |
| **providers** | capa de datos | todos (05b §1–§4) | `snow/providers/*` + `chain` + `cache` (CACHE_POLICY, RATE_LIMITS, BREAKER) | — |
| **admin** | F23 editorial | editorial | `GET/POST /admin/**` + `admin-auth` (fail-closed) + `parseNewReportInput` | `admin-snow` (partes CRUD con validación) |

Regla de oro: **un carril no se cruza salvo por lo declarado.** Un import ilegal debe romper en
revisión, no en runtime.

| Desde → | Puede importar | Prohibido importar |
|---|---|---|
| `app/snow/**` (cliente) | `snow/contracts/**`, `snow/models/**`, `@angular/*`, `rxjs` | `snow/providers/**`, `snow/chain/**`, `snow/cache/**`, `snow/store/**`, `snow/server/**`, `snow/config/**`, `express`, `node:*` |
| `snow/server/**`, `snow/providers/**`, `snow/chain/**`, `snow/cache/**`, `snow/store/**`, `snow/config/**` (servidor) | compartido + entre sí + `express`, `@angular/ssr/node`, `node:*` | `@angular/core`, `@angular/router`, componentes/páginas de `app/**` |
| `snow/contracts/**`, `snow/models/**` (compartido) | entre sí | `express`, `node:*`, `@angular/*`, `rxjs`, cualquier `app/**` (con UNA excepción) |

**Excepción única sancionada (05b §2):** `snow/contracts/data-type-map.ts` importa
`type { SnowQuality }` desde `web-ssr/src/app/pages/weather/models/meteo.models.ts` (verificado:
el tipo existe en [L198](../../web-ssr/src/app/pages/weather/models/meteo.models.ts)). Es un import
**de tipo**, no de valor, y evita redefinir `SnowQuality` (que ya es `"powder"|"fresh"|"packed"|
"spring"|"icy"|"wet"`). Cualquier otro import desde `app/**` hacia `snow/contracts` queda prohibido.

**Alias (R1)** — se añade a `tsconfig.base.json` (junto a los `@nieve/*` existentes):

```jsonc
"paths": {
  "@nieve/snow": ["web-ssr/src/snow/index.ts"],
  "@nieve/snow/contracts": ["web-ssr/src/snow/contracts/index.ts"],
  "@nieve/snow/models": ["web-ssr/src/snow/models/index.ts"]
}
```

El alias da a `snow/models` identidad de módulo estable (lo pide el encargo "módulo snow/* propio")
sin crear lib Nx. Los imports relativos dentro de `web-ssr` también funcionan como respaldo; la
fuente de verdad del contrato es `snow/models/index.ts`.

---

## 7. Punto de integración: `web-ssr/src/server.ts`

El `server.ts` actual ([66 líneas](../../web-ssr/src/server.ts)) tiene exactamente el hueco previsto
para APIs ("Example Express Rest API endpoints can be defined here"). Se inserta **una** línea de
montaje antes del `express.static` (las rutas API deben resolverse antes que el estático):

```ts
// antes de app.use(express.static(...)):
import { createSnowRouter } from './snow/server';
app.use('/api/snow', createSnowRouter());   // sirve /api/snow/v1/** (reloj inyectable)
```

Reglas del montaje:

1. **Sin `express.json()` global nuevo** si no hay cuerpo; el admin (F23) necesita
   `express.json({ limit: '64kb' })` aplicado **solo** a `snowRouter`, no a toda la app.
2. Las rutas `snow/*` se montan **antes** de `express.static` y **antes** del `app.use('/**')` del
   SSR, para que nunca caigan en el renderizador Angular.
3. El handler SSR (`app.use('/**')`) queda como está; el 404 real del módulo es una **ruta Angular**
   (comodín `**` en `app.routes.ts`, §11), no un cambio en `server.ts`.
4. `getBaseUrl()` de los servicios cliente (§9) **ya no** devuelve `localhost:4200` en servidor:
   usa `process.env.PORT || 4000` (aplicado en `stations-list`/`station-detail`/`meteo-data`/
   `snow-data`).

---

## 8. Borde HTTP `/api/snow/v1/**` (contrato no negociable)

Hereda el contrato de [02 §3.2](./02-feature-matrix.md) **sin reabrirlo**; aquí solo se fija su
ubicación y su tabla de rutas.

### 8.1 Tabla de rutas

| Método | Ruta | Capacidad | Tipo de dato (05b) | Cuerpo |
|---|---|---|---|---|
| GET | `/api/snow/v1/stations` | F04/F05 directorio | `station-master` | `{ stations: StationSummary[], provenance }` |
| GET | `/api/snow/v1/stations/:slug` | F03 detalle (maestro) | `station-master` | `{ station, provenance }` |
| GET | `/api/snow/v1/stations/:slug/report` | F02/F03 parte | `operational-status` + `snow-depth` | `SnowReportDto` (02 §3.2) |
| GET | `/api/snow/v1/stations/:slug/forecast` | F08 previsión | `forecast` | `{ forecast: ForecastBundle, provenance }` |
| GET | `/api/snow/v1/stations/:slug/alerts` | avisos meteorológicos | `weather-alert` | `{ alerts: WeatherAlertBundle, provenance }` (not_configured sin A1/A2) |
| GET | `/api/snow/v1/stations/:slug/webcams` | F09 webcams | `image` | `{ grants: ImageGrant[], provenance }` (siempre `blocked` por licencia) |
| GET | `/api/snow/v1/avalanche` | F15 aludes | `avalanche` | `{ bulletin, provenance }` |
| GET | `/api/snow/v1/rankings/nieve` · `/rankings/km` | F12/F13 | `snow-depth` · `operational-status` | `{ ranking: [], provenance }` (vacío con `reason`) |
| GET | `/api/snow/v1/season-dates` | F14 calendario | editorial | `{ dates: [], provenance }` |
| GET | `/api/snow/v1/search?q=` | F06 búsqueda | `station-master` | `{ stations: [], provenance }` |
| GET | `/api/snow/v1/config` | telemetría (admin) | — | estado de proveedores y breaker (§10) |
| POST/PUT/DELETE | `/api/snow/v1/admin/**` | F23 editorial | `editorial-report`/`editorial-stations` | validado en borde (§9.3) |

**Sin endpoint propio (client-only, R4):** `maps` (config de teselas por `PROTOMAPS_BASE_URL`, el mapa
se deshabilita con aviso si falta), `comparison` (reutiliza `GET /stations` + `/stations/:slug/report`),
`favorites` (`localStorage` + `signal`). No añaden rutas al borde.

### 8.2 Mapeo de estado → HTTP (02 §3.2, transcrito a código)

| `ProviderResult` | HTTP | Cuerpo |
|---|---|---|
| `ok` / `stale` | `200` | `status:'ok'\|'stale'` + payload + `provenance` |
| `no_data` | **`200`** | `status:'no_data'` + `reason` + `provenance` |
| `not_configured` | **`200`** | `status:'not_configured'` + `reason:'not-covered'` |
| `blocked` | **`200`** | `status:'blocked'` + `reason:'license-prohibits'` |
| `rate_limited` | `200` | `status:'stale'` si hay caché, si no `no_data` (nunca `503` en v1) |
| `error` (retryable) | `500` | `{ error:'internal' }` + log con `redactUrl` |
| `error` (no retryable) | `500` | ídem |
| estación inexistente | `404` | `{ error:'station-not-found' }` — **no** redirigir (defecto de la ref., E23) |

`http-mapping.ts` es una función pura `ProviderResult → { status, body }`, **testeable sin red**, que
convierte en invariante las filas "nunca 500 por falta de credencial" y "nunca `data:0`" (anti-sentinel,
05b §3.2). El 404 por estación inexistente lo decide el controller **antes** de llamar a la cadena.

---

## 9. Capa de datos

### 9.1 Adaptadores (mapeo 05b §2 → ficheros)

- `provider-adapter.ts`: `ProviderAdapter<T>`, `ProviderInput`, `StationRef`, `DataTypeMap`. Sin
  `enum` (TS `erasableSyntaxOnly`), sin dependencias, solo `fetch` nativo y `rxjs`/tipos.
- `registry.ts`: `PROVIDERS: Readonly<Record<ProviderId, ProviderAdapter<unknown>>>` con
  `licenseByType` **copiado de 05 §2**. La guarda runtime de 05b §2.1(2) vive aquí: un adapter que
  intenta servir un tipo `blocked` devuelve `{ status:'blocked' }` **sin tocar la red**.
- `blocked-providers.ts`: `infonieve`, `ipma`, `maptiler`, `stadia`, `mapbox`, `opentopomap`,
  `meteoandorra`, `meteofrance-bpa-html`, `osm-tiles`, y los operadores de estación (`aramon`,
  `baqueira`, `grandvalira`, `fgc`, `feratel`) existen en el union `ProviderId` **sin adapter
  funcional**, para que la guarda los rechace.

**Los dos primeros que se implementan** (porque desbloquean F02/F03/F12/F13 sin credenciales):

- `editorial-report.adapter.ts` — `isTerminal: true`, `provides: ['operational-status','snow-depth']`.
  Lee del `SnowReportRepository`; `canServe` es puro; valida en el borde (§9.3).
- `editorial-stations.adapter.ts` — `isTerminal: true`, `provides: ['station-master']`. Lee del
  `StationRepository`.

El resto (`aemet`, `aemet-bpa`, `meteofrance`, `copernicus-c3s`, `osm`, basemaps) se escriben contra
los tipos de 05b y arrancan en `not_configured` (requieren A1/A2/env, 05b §6). `osm.adapter` solo
contribuye geometría/nombres al extracto `osm_derived_*`, nunca estado/espesores.

### 9.2 Cadena (`chain/chain.ts`)

`FALLBACK_CHAINS` y el bucle de 05b §3.1 tal cual, con una única responsabilidad añadida: **inyectar
`requestedAt`** y devolver siempre `ProviderResult` (nunca `null`/`undefined`). La cadena de
`image` es `[]` → todo intento de webcam devuelve `blocked`/`license-prohibits` (05b §3).

### 9.3 Editorial de primera clase (validación en el borde)

El `admin.controller.ts` (F23) **rechaza** una alta de parte si falta cualquiera de:

- `sourceUrl` — URL http/https válida (05b §7.3);
- `capturedAt` — ISO 8601;
- `author` — no vacío;
- `confidence` — `∈ [0,1]`.

Si falla, no se escribe registro y se devuelve `400` con el campo. Nunca se copia texto verbatim del
operador: se transcriben **valores** (números/booleanos). El registro público rotula
"Parte de estación (fuente: operador)" con enlace a `sourceUrl`, y su `Provenance.licenseStatus` es
`allowed` (propio), **no** la licencia del proveedor bloqueado (05b §3.2).

### 9.4 Caché, rate-limit, breaker (mapeo 05b §4)

- `cache/cache-policy.ts`: `CACHE_POLICY` literal (AEMET 30 min/≤3 h + `mustStoreUpdatedAt`;
  Météo-France 60 min + `noImpliedEndorsement`; `meteofrance-bpa-html` y `meteoandorra` TTL 0;
  `ipma` TTL 0 + `commercialUseProhibited`; OSM 90 d; Protomaps `immutable`).
- `cache/rate-limit.ts`: `RATE_LIMITS` con `verified:false` y `note` explícito (05b §4.3).
- `cache/breaker.ts`: `BREAKER` + convenciones 429/5xx/4xx (05b §4.3).
- `cache/memory-cache.ts`: TTL en memoria por instante SSR. El histórico persistente NO se guarda en
  memoria: lo guarda el repositorio (`forecast_cache`), conforme a `storageAllowed`.

### 9.5 Configuración (`config/env.ts`)

`requireEnv(id, names) → ConfigStatus`, `redactUrl` (05b §6). Solo **nombres** de variables; ningún
valor en el repo. `SITE_URL`/`CONTACT_EMAIL` alimentan el User-Agent
`appski-snow/1.0 (+<SITE_URL>; contact: <CONTACT_EMAIL>)`.

---

## 10. Almacén: interfaz de repositorio + JSON v1 + SQL destino (R2)

**Interfaz única** que importa `snow/server/**` (nunca una implementación concreta):

```ts
export interface StationRepository {
  list(): Promise<readonly Station[]>;
  findBySlug(slug: string): Promise<Station | null>;
  upsert(s: Station): Promise<void>;
}
export interface SnowReportRepository {
  listPublished(at: Date): Promise<readonly SnowReport[]>;
  listAll(): Promise<readonly SnowReport[]>;
  latestPublishedForStation(stationSlug: string, at: Date): Promise<SnowReport | null>;
  insert(r: SnowReport): Promise<void>;      // la validación de borde es parseNewReportInput (§9.3)
}
export interface ForecastCacheRepository {
  get(stationSlug: string, source: ProviderId): Promise<ForecastCacheEntry | null>;
  put(e: ForecastCacheEntry): Promise<void>; // aplica CACHE_POLICY[source]
}
```

`parseNewReportInput(body: unknown)` vive en `snow/store/repository.ts` y es la **única** puerta de
entrada de un parte editorial: devuelve el input tipado o los errores por campo (C24b–e).

**Implementación v1 (`json-store/`):** ficheros JSON versionados en un directorio **servidor** (no
en `assets/`, que se sirve estático y los filtraría). Ruta por `SNOW_DATA_DIR`, por defecto
`./data/snow` (raíz del repo, en `.gitignore`). Cada fichero lleva `{ "schemaVersion": 1, "updatedAt":
…, "records": […] }`. Los `seed/` (maestro editorial y partes de ejemplo, **datos nuestros**, sin
problema de licencia) se versionan en git y se copian/importan la primera vez.

**Destino documentado (`schema.sql` + `sqlite-repository.ts`):** el esquema de 02 §3.3 **ya se
valida** con `node scripts/snow/check-schema.mjs` (8/8 invariantes, exit 0, verificado en esta tarea).
El adaptador SQLite queda **declarado pero no construido** en v1; `node:sqlite` solo se usa en tests.
La regla ODbL (05b §5, 02 §3.3) es vinculante **en ambos** soportes: `station`/`snow_report` son
editoriales; `osm_derived_*` solo geometría/nombres; el puente `station_osm_link` es opaco y sin FK.

---

## 11. Integración del cliente y rutas

### 11.1 `snow-api.service.ts`

`provideHttpClient(withFetch())` ya está activo ([app.config.ts:16](../../web-ssr/src/app/app.config.ts)),
así que el `HttpClient` funciona en SSR **si la URL es absoluta**. El servicio:

- construye URLs absolutas en servidor (corrige `getBaseUrl()` §7.4) y relativas en navegador;
- tipa las respuestas con `snow/models/dto.ts` (nunca con `ProviderResult` crudo);
- expone el DTO **tal cual** + un `status` para que la UI no adivine.

**Deducción SSR→cliente:** se añade `TransferState` + `withTransferCache()` en `app.config.ts`
(adición pequeña y opcional), para que el cliente no repita la llamada que ya hizo el SSR. Sin esto
el sistema funciona igual (el cliente re-consulta el mismo borde), solo con una petición extra.

### 11.2 Puntos de extensión (reconectar, no duplicar)

Los tres servicios existentes corren con `USE_MOCK_DATA = true`. La reconexión consiste en **sustituir
el interior** de cada servicio por `snow-api.service`, sin tocar los componentes:

| Página existente | Ruta | Capacidad | Qué se cambia |
|---|---|---|---|
| `stations-list` (`stations-list.data.service.ts`) | `estaciones` | F04 | `loadStations`/`loadFilterOptions`/`searchStations` → `/api/snow/v1/stations` y `/search`; los filtros/orden pasan a query params (ya hay `buildQueryParams`) |
| `station-detail` (`station-detail.data.service.ts`) | `estacion/:slug` | F03 | el bloque de parte (`station-snow-report`, `station-lifts-slopes`) → `/api/snow/v1/stations/:slug/report`; cada bloque muestra su `Provenance` + `NoDataReason` |
| `weather` (`meteo-data.service.ts` + `snow-data`/`alerts`) | `meteorologia` | F08 | previsión → `/api/snow/v1/stations/:slug/forecast`; arranca `not_configured`→"Sin datos disponibles" (A1/A2) |

**Regla:** estos componentes **no** importan `ProviderResult`; consumen el DTO y el estado
`ok/no_data/not_configured/blocked` del borde. Los mocks existentes (`assets/mocks/**`) quedan
intactos para el resto de la app y no se mezclan con nieve.

### 11.3 Rutas nuevas (añadir a `app.routes.ts`) y el 404

| Ruta | Capacidad |
|---|---|
| `nieve` | F01 portada de nieve |
| `nieve/parte-de-nieve` | F02 listado diario |
| `nieve/rankings` (nieve/km) | F12/F13 |
| `nieve/aludes` | F15 |
| `nieve/webcams` | F09 (solo enlaces `ImageGrant`) |
| `nieve/fechas-temporada` | F14 |
| `nieve/partes` | F16/F17 (partes de usuario) |
| `nieve/actividades` | F18/F19 |
| `**` | **404 real (F21)** — hoy ausente ([app.routes.ts:319](../../web-ssr/src/app/app.routes.ts)); corrige el defecto de la referencia (E23) |

Todo sigue `RenderMode.Server` ([app.routes.server.ts:6](../../web-ssr/src/app/app.routes.server.ts)),
sin cambio. Los favoritos (F07) son `localStorage` + `signal` en `snow-state.service.ts` (R4), sin
ruta ni backend.

---

## 12. Estrategia de tests (con los comandos que corren aquí)

**Runner:** `node:test` (R3). **Alcance testeable con `node --test`:** la capa de dominio/servidor
(contratos, cadena, `http-mapping`, `cache-policy`, `rate-limit`, `breaker`, `json-store`, validación
editorial). Es código TypeScript **erasable** (solo `type`/`interface`, sin `enum`/decoradores), que
el *type stripping* nativo de Node 24 ejecuta.

**Fuera de `node --test`:** componentes/servicios Angular (necesitan el runner de Angular, ausente).
Los 8 `.spec.ts` existentes son Jasmine **sin target `test`** (00b C2); no aportan. En v1, la UI se
cubre por revisión + los DTO tipados; E2E queda **BLOCKED** (§13).

**Decisión de carga (opción B, t7):** `node --test <fichero>` falla con `spawn EPERM` (aislamiento
por proceso con stdio pipeado). Además el *type stripping* de Node 24: (a) **no resuelve imports sin
extensión** — los 48 imports de valor relativos del módulo necesitan un resolve hook; (b) **rechaza
parameter properties** — el código usa `constructor(private readonly …)`, así que hace falta
`--experimental-transform-types`. El hook **no es un helper de test**: es un artefacto del repo en
`scripts/snow/ts-loader.mjs` + `scripts/snow/ts-resolver.mjs`. En PRODUCCIÓN el bundler de Angular
(esbuild) resuelve los imports en build-time (sin fragilidad); bajo Node plano se carga con el loader
del repo. Comando canónico:

```text
node --experimental-transform-types \
  --import ./scripts/snow/ts-loader.mjs \
  --test --test-isolation=none <f1> <f2> …          # exit 0 (32/32 en la suite de QA)
```

**Comandos de verificación de la implementación (t7/t8/t9)** — todos ejecutados con éxito en esta
tarea o heredados como reproducibles:

```text
# 1. Type-check de todo web-ssr/src (incluye snow/*)
node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit     # exit 0

# 2. Tests de dominio/servidor (comando canónico: ts-loader + transform-types + aislamiento none)
node --experimental-transform-types \
  --import ./scripts/snow/ts-loader.mjs \
  --test --test-isolation=none web-ssr/src/snow/tests/*.test.ts                # exit 0 (32/32)

# 3. Invariantes de esquema SQL
node scripts/snow/check-schema.mjs                                             # exit 0, 8/8 PASS

# 4. Auditoría estática del módulo
node scripts/snow/audit.mjs                                                    # exit 0 (PASS=27 FAIL=0)
```

**Invariantes que t9 debe convertir en tests (§12 scope):** imposibilidad de leer `data` sin
`status==='ok'`; ningún `allowed-with-attribution` sin `attribution`; adapter bloqueado → `blocked`
sin fetch; ausencia = `null`/`no_data` (nunca `-1`/`-99`/`NaN`); `-99.0` → `null`; TTL 0 para
`meteofrance-bpa-html`/`meteoandorra`; sin credencial → 200 y nunca 500; `osm_derived_*` separado;
webcams solo `linkUrl`.

---

## 13. BLOCKED en este sandbox (se declara, no se simula)

| Elemento | Motivo | Consecuencia |
|---|---|---|
| `nx build` / `nx serve` / `nx run-many` | plugin worker de Nx falla ("Failed to start plugin worker"), [00b C1](./00b-environment-corrections.md) | sin bundle real; el gate es `tsc` |
| `nx lint` | mismo worker de plugins | lint vía binario `eslint` directo si hiciera falta; no es gate |
| E2E en navegador | sin dev-server ni build | E2E queda **BLOCKED**; no se simula |
| Core Web Vitals / medición reproducible | sin bundle servido | **BLOCKED** |
| `node --test` con aislamiento por proceso | `spawn EPERM` (sandbox Windows) | usar `--test-isolation=none` (§12) |

---

## 14. Orden de implementación (mapeado a tareas y capacidades)

```
t7 (backend)
  1. snow/contracts + snow/models + alias (R1)      → sin red, compila con tsc
  2. snow/config/env + store/repository + json-store → editorial-store y JSON v1 (R2)
  3. snow/providers: editorial-report + editorial-stations (TERMINAL) + registry + blocked-guard
  4. snow/chain + snow/cache (policy/rate/breaker)
  5. snow/server: http-mapping + stations + report + rankings + calendar (200/404/500)
  6. server.ts montaje + getBaseUrl SSR
  └─ gate: tsc + node --test --test-isolation=none + check-schema

t8 (frontend)
  7. app/snow/snow-api.service + snow-state.service + provenance
  8. reconectar stations-list · station-detail · weather (F04 · F03 · F08)
  9. rutas nuevas nieve/* + 404 (F01 · F02 · F09 · F12–F19 · F21)
  10. admin editorial (F23) + favoritos (F07, localStorage)

t9 (QA)
  11. tests de dominio + invariantes 05b §8 + revisión independiente
```

**Camino crítico:** editorial store + adaptador `editorial-report` (paso 3) desbloquean F02/F03/F12/
F13. Previsión (F08) puede ir en paralelo pero no muestra datos hasta A1/A2 (05b §9).

---

## 15. Riesgos y decisiones que quedan abiertas al capitán

| # | Asunto | Recomendación |
|---|---|---|
| O1 | ¿`TransferState` + `withTransferCache()` en v1? | Sí, adición de 1 línea; reduce la doble petición SSR→cliente; si no, el sistema es correcto igualmente |
| O2 | `SNOW_DATA_DIR` por defecto `./data/snow` | Confirmar ruta y añadirla a `.gitignore` |
| O3 | Alcance de `node --test` sobre código Angular | Ninguno en v1 (sin runner Angular); si se quiere, añadir un runner Angular es decisión aparte y requiere Nx operativo |
| O4 | `aemet-bpa` PDF en v1 | 05b §7.1 recomienda (a): servir `documentUrl` + metadatos sin parsear PDF. Confirmar |

---

## 16. Criterios de aceptación de esta arquitectura

- [x] Límites de módulo (servidor/compartido/cliente) y reglas de importación explícitos.
- [x] Punto de integración en `server.ts` concreto (una línea de montaje + orden de middlewares).
- [x] Borde HTTP `/api/snow/v1/**` con tabla de rutas y mapeo 200/404/500 (hereda 02 §3.2).
- [x] Mapeo 1:1 de 05b §1–§6 a ficheros (adaptadores, cadena, caché, breaker, config).
- [x] Almacén como interfaz de repositorio + JSON v1 + SQL destino (R2); editorial de primera clase.
- [x] Puntos de extensión en `stations-list`, `station-detail`, `weather` (reconectar, no duplicar).
- [x] Rutas nuevas + 404 real; SEO/i18n/errores/accesibilidad transversales.
- [x] Comandos de verificación exactos, **todos ejecutados aquí o heredados como reproducibles**,
      con `--test-isolation=none` documentado y la lista BLOCKED declarada.
