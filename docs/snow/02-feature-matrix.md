# FASE 2 — Matriz funcional, contratos y esquema propuestos

Tarea `t4` · Autor: `re-researcher` · Fecha: **2026-11-16**.
Fuentes obligatorias: [`01-reference-inventory.md`](./01-reference-inventory.md) (qué hace la
referencia), [`05-provider-registry.md`](./05-provider-registry.md) y
[`05b-provider-contracts.md`](./05b-provider-contracts.md) (qué es legal y con qué tipos).

---

## 0. Cómo leer esta matriz (reglas, no adorno)

### 0.1 Las cuatro columnas de estado

| Columna | Pregunta que responde | Fuente |
|---|---|---|
| **Referencia (observado)** | ¿Qué hace infonieve, visto y con evidencia? | 01 con Evidence ID / sha256 |
| **Clasificación** | ¿Cuánto de eso existe **hoy en nuestro repo**? | `git`/disco, verificado en §0.3 |
| **Restricción legal aplicable** | ¿Qué permite 05/05b para el dato que la pantalla necesita? | 05 §2, 05b §3–§4 |
| **Mejora planificada** | ¿Qué hacemos distinto/mejor y por qué? | 01 §9 + criterio propio |

### 0.2 Vocabulario de clasificación (definición operativa)

- **NO INICIADA** — la capacidad del brief no tiene ningún artefacto de `snow/*` en el repo.
  Puede tener antecedente heredado (una página existente en `web-ssr`), y esa página **no** cuenta
  como implementación de la capacidad snow: no usa datos de proveedor ni el contrato.
- **PARCIAL** — existe algo utilizable en producción propia y trazable al brief, con huecos declarados.
- **IMPLEMENTADA** — la capacidad está completa, con datos de proveedor autorizado, tests y aceptación.
- **BLOQUEADA** — no se puede completar **por una restricción externa** (licencia, credencial,
  configuración) y el motivo está documentado. Una fila puede estar **NO INICIADA *y* limitada por
  bloqueo**: se clasifica NO INICIADA (no hay código) y se anota el bloqueo en la columna legal.

> **Estado de esta pasada: 0 IMPLEMENTADAS, 0 PARCIALES, 25 NO INICIADAS** (22 capacidades del brief
> en §1.1–§1.6 + 2 capacidades propias en §1.7 + F25 comparador, nueva de t6/§1.8).
> No hay pre-claim de trabajo que los implementadores no hayan hecho.

### 0.3 Verificación del estado actual (hecha para este documento, 2026-11-16)

```text
Test-Path snow                    -> False      # no existe el módulo snow/*
Test-Path web-ssr/src/app/snow    -> False
Select-String app.routes.ts -Pattern 'nieve|snow'  -> (sin resultados)
Select-String server.ts     -Pattern 'app.get|app.post|api' -> (sin resultados)
git status --short        -> ?? .agent-teams/ ?? .nx/ ?? docs/ ?? scripts/   (solo docs/scripts; cero código)
```

Conclusión verificada: **no existe ninguna línea de implementación `snow/*`**, ninguna ruta, ningún
endpoint `/api/snow/**`. Lo único en disco son documentos y scripts de investigación.

### 0.4 Antecedentes heredados que **no** son implementación snow

`web-ssr` ya tiene `pages/stations-list`, `pages/station-detail` (`station-snow-report`,
`station-lifts-slopes`, `station-hero`), `pages/weather` (13 componentes, incl. webcams, radar, cota,
gráficas) y 26 módulos de admin. **Todos corren con `USE_MOCK_DATA = true`** (00 §3) y ninguno consume
`ProviderResult`. Se citan como **punto de extensión** (reutilizar el design system y la ruta), nunca
como capacidad entregada. Esto también corrige la expectativa de "reconstrucción desde cero": hay
pantallas que hay que **reconectar a datos reales**, no crear.

---

## 1. Matriz funcional (una fila por capacidad del brief)

Leyenda columna legal: **[E]** = solo editorial (nuestro admin con `sourceUrl`+`capturedAt`),
**[A]** = automático desde proveedor autorizado, **[X]** = bloqueado por licencia, **[?]** = requiere
credencial/autorización (A1…A5 de 05b §9).

### 1.1 Núcleo del parte de nieve

| # | Capacidad | Referencia (observado) | Clasificación | Restricción legal aplicable (05/05b) | Mejora planificada |
|---|---|---|---|---|---|
| F01 | **Portada / dashboard** | Sin `<h1>`; 6 webcams; bloques de destacadas + publicidad + iframe de viajes (`home-desktop-1440`) | **NO INICIADA** (existe `pages/home` con mocks) | Datos que muestra: estado **[E]**, espesores **[E]**, previsión **[A]**/[?] A1·A2; imágenes **[X]** | `<h1>` real, sin `keywords`, sin publicidad de terceros; tarjetas con `Provenance` y "actualizado hace X" por dato; estado vacío de pretemporada explicado |
| F02 | **Parte de nieve (listado diario)** | 90 filas (60+30), columnas `Estación/Estado/Remontes/Pistas·Circuitos/Kilómetros/Nieve/Meteo`, pastilla por color, sello "Actualizado el 16/11/26 05:45" (`ev_2c29d6…`, E1–E4) | **NO INICIADA** | Estado y espesores **solo [E]** (`FALLBACK_CHAINS['operational-status']` = `['editorial-report']`); ninguna fuente automática autorizada | Tabla semántica `<table>`, filtros por sistema/país/estado, `null`≠0 explícito, sello por fila con zona horaria, estado vacío canónico por `NoDataReason` ("Temporada cerrada — sin parte publicado") |
| F03 | **Detalle de estación** | Pestañas La estación·Parte·Webcams·Tiempo·Plano·Ficha; sectores; donuts pistas/remontes; desglose por dificultad; fechas temporada; partes de usuarios vacío (`ev_022ffb…`, E5) | **NO INICIADA** (existe `pages/station-detail` con mocks) | Mezcla de **[E]** (estado/espesor), **[A]** (previsión), **[X]** (webcam) | Una sola página con secciones ancladas en URL, cada bloque con su `Provenance` y su `NoDataReason`; sin pestañas que dupliquen navegación (mejor scroll + anclas y `aria-current`) |

### 1.2 Directorio y búsqueda

| # | Capacidad | Referencia (observado) | Clasificación | Restricción legal aplicable | Mejora planificada |
|---|---|---|---|---|---|
| F04 | **Directorio de estaciones** | 82 filas en 14 tablas, columnas `Km. abiertos/Pistas/Nieve/Meteo/Webcams`; agrupado por sistema y país; **0 filtros, 0 orden** (`ev_ead04c7b…`, E12–E13) | **NO INICIADA** (existe `pages/stations-list` con mocks) | Maestro **[A]** propio+OSM (`station-master`), estado **[E]** | Filtros (país, sistema, estado, nieve mín.) y orden **en URL** (SSR + compartible), estado en `aria-label`, no solo color (WCAG 1.4.1) |
| F05 | **Página de país** | `pais/espana/` 39 filas/6 tablas, **sin canonical** (`ev_4e20056f…`, E14) | **NO INICIADA** | Igual que F04 | Canonical + `hreflang` si hay idiomas; misma parrilla filtrable, no tablas separadas |
| F06 | **Búsqueda de estaciones** | `form action="buscar.php" method="get"` con `query` en **todas** las páginas (E25); página de resultados **no capturada** | **NO INICIADA** | Sin impacto de licencia (solo maestro propio) | Búsqueda propia indexada (sin `buscar.php`), tolerante a acentos y con resultados en SSR; sin `enctype=multipart` en un GET |
| F07 | **Favoritos de estación** | Control `#barbox_tools_fav` sin `href`, texto "Aun no has marcado ninguna estación como favorita" (E28) — comportamiento **no capturado** | **NO INICIADA** | Ninguna (dato de usuario) | Persistencia en `localStorage` + `signal` (sin servidor), sincronizada entre pestañas, con estado vacío claro, sin exigir cuenta ni login | |

### 1.3 Meteorología y webcams

| # | Capacidad | Referencia (observado) | Clasificación | Restricción legal aplicable | Mejora planificada |
|---|---|---|---|---|---|
| F08 | **El tiempo (previsión)** | `meteo/` con 2 `<select>` de 16/100 opciones cuyos **valores son URLs**; sin tabla propia (`ev_f0591799…`, E15) | **NO INICIADA** (existe `pages/weather` con mocks) | **[A] con credencial**: AEMET (ES) / Météo-France (FR) / C3S (AD·PT) — **A1/A2 pendientes** ⇒ hoy `not_configured`→`no_data`. Andorra **restricted** | Selectores con `value = slug`, no URLs; previsión por punto con `validAt` ISO y `snowLineM` propio; degradación "Sin datos disponibles" sin error 500 |
| F09 | **Webcams** | `sala-de-webcams/` 24 cámaras; imágenes de `infonieve.es/webcams/…` (13), feratel (10), funiviecampiglio (1); atribución `© …` por cámara (E16–E17) | **NO INICIADA** | **[X] siempre**: `FALLBACK_CHAINS.image = []`; solo `ImageGrant.linkUrl` | **Nunca** `img src`/iframe/proxy/caché. Solo enlaces salientes `target=_blank rel=noopener` con operador y titular; "cámara no disponible" en vez de `onerror` silencioso |
| F10 | **Mapa de webcams** | Leaflet + **tiles `*.tile.openstreetmap.org`** (E18) | **NO INICIADA** | Tiles OSM **bloqueados** en producción (05 §2.10) ⇒ **[A] Protomaps** autohospedado | PMTiles propio + atribución "© OpenStreetMap contributors" + ODbL; si falta `PROTOMAPS_BASE_URL` ⇒ mapa deshabilitado con aviso, resto de página operativo |

### 1.4 Tipologías y rankings

| # | Capacidad | Referencia (observado) | Clasificación | Restricción legal aplicable | Mejora planificada |
|---|---|---|---|---|---|
| F11 | **Alpino vs esquí de fondo** | 60 `estacion-esqui` + 30 `espacio-nordico`; la sección nórdica cambia `Pistas` por **`Circuitos`** (E1–E2); `esqui-de-fondo/` **no capturado** | **NO INICIADA** | Maestro **[A]**, estado **[E]** | Modelo explícito `discipline: 'alpine' \| 'nordic'` que cambia las etiquetas de columna (no dos plantillas copiadas); el directorio no mezcla km de pista con circuitos |
| F12 | **Ranking de espesores (top nieve)** | `tbody` vacío + "Actualmente ninguna estación dispone de los datos para generar este ránking." (`ev_e4d54204…`, E21) | **NO INICIADA** | Espesores **solo [E]** ⇒ el ranking depende de partes publicados | Estado vacío con **motivo** (`outside-season`) y "última vez con datos"; ranking calculado en servidor desde partes vigentes, no desde HTML |
| F13 | **Ranking de km abiertos (top km)** | Idéntico vacío (`ev_b1a983dc…`, E21) | **NO INICIADA** | **[E]** | Ídem F12; además desambiguar km de pista vs circuitos nórdicos |
| F14 | **Fechas de apertura/cierre** | Tabla actual con "sin determinar" + leyenda 2 estados + **histórico 17 temporadas (2009-2010…2025-2026)**; orden por `$.post` y recarga (`ev_649d91ba…`, E20) | **NO INICIADA** | Editorial/calendario propio (**[E]**); sin dependencia de proveedor | Fechas como dato tipado (`confirmed: boolean`, no icono), histórico propio desde nuestro maestro; orden en URL (GET), sin POST+recarga |

### 1.5 Riesgo y usuario

| # | Capacidad | Referencia (observado) | Clasificación | Restricción legal aplicable | Mejora planificada |
|---|---|---|---|---|---|
| F15 | **Peligro de aludes** | Escala europea 1–5 completa con textos + mapa Leaflet (E19) | **NO INICIADA** | AEMET BPA **PDF** **[A]**/[?] A1; Météo-France BPA HTML **restricted** (ttl 0, deep-link); Andorra **restricted** | Nivel 1–5 tipado + `validFrom/validUntil` + enlace al documento original; sin parsear PDF en v1 (05b §7.1) |
| F16 | **Partes de usuarios** | Estado vacío en detalle de estación (E5); publicación con reCAPTCHA v2, valoración 1–5 (Penoso…Excelente), **vigencia 10 días** (E22); listado `usuarios/` **no capturado** | **NO INICIADA** | **[E]** propio (UGC con moderación) | Moderación en admin (estado `pending/published/rejected`), caducidad a 10 días **explícita en UI**, sin reCAPTCHA de terceros si hay rate-limit server-side propio |
| F17 | **Publicar parte de usuario** | `form method=post` con `enctype=multipart/form-data` sin ficheros, 8 inputs, reCAPTCHA (E22) | **NO INICIADA** | **[E]** | Formulario Angular reactivo con validación tipada, hora de estancia obligatoria, borrador local; `enctype` solo si hay foto |
| F18 | **Snowparks** | Enlace en navegación + `sala-de-webcams/tem/snowparks/` (**E27**, no capturado) | **NO INICIADA** | **[E]** (ningún proveedor lo publica autorizado) | Sub-recurso del parte: `facility` tipado por estación con estado propio, reutilizando la tabla F02 |
| F19 | **Skimo / raquetas / trineos** | Tres enlaces en navegación (**E27**, no capturado) | **NO INICIADA** | **[E]** | Un único modelo `activity-route` con `activity: 'skimo' \| 'snowshoe' \| 'sled'` y una página filtrable, en lugar de tres páginas casi iguales |

### 1.6 Plataforma: estado, responsive, i18n, errores

| # | Capacidad | Referencia (observado) | Clasificación | Restricción legal aplicable | Mejora planificada |
|---|---|---|---|---|---|
| F20 | **Responsive (móvil y tablet)** | `viewport` con `user-scalable=no, maximum-scale=1` (E7); mismo HTML en 430/768/1440 ⇒ CSS por breakpoints (E24) | **NO INICIADA** | Ninguna | Zoom permitido (WCAG 1.4.4), `prefers-reduced-motion`, tablas con scroll accesible y cabecera sticky; probado a 430/768/1440 |
| F21 | **Errores y estados sin datos** | **404 no existe**: URL inexistente redirige a `/estaciones-esqui/` sin mensaje (`ev_08d6149b`, E23). Estados vacíos: rankings con tabla vacía; "sin determinar" reiterado | **NO INICIADA** | Ninguna | 404 real (`**` en `app.routes.ts`, hoy ausente), textos canónicos por `NoDataReason` (05b §3.2), `ErrorState` propio y `retry` para `error` retryable |
| F22 | **i18n / idioma** | `lang="es"`, `content-language: es`; sitio hermano `pyreneige.fr`; `&idioma=` en iframes (**INFERIDO**, 01 §6) | **NO INICIADA** (existe `@ngx-translate` y la lib `i18n` vacía) | Ninguna | URLs por idioma con `hreflang` recíproco, textos de UI por `NoDataReason` traducidos, fuentes externas mostradas en su idioma original con etiqueta |

**Recuento:** 22 filas del brief (F01–F22) + 2 propias (F23, F24) + F25 comparador (t6) = **25 filas** ·
**0 IMPLEMENTADA** · **0 PARCIAL** · **25 NO INICIADA**.
**Limitadas además por bloqueo externo:** F08 (A1/A2), F09 (prohibición total), F10 (PROTOMAPS_BASE_URL),
F15 (A1 + restricted FR/AD). El resto no está bloqueada: se puede empezar ya con editorial + maestro.

### 1.7 Capacidad del brief que la referencia **no** cubre (ventaja propia)

| # | Capacidad | Referencia | Clasificación | Restricción legal | Mejora |
|---|---|---|---|---|---|
| F23 | **Admin editorial de partes** (el brief lo pide; la referencia no lo expone) | No observable (`aviso-legal`, sin área pública de gestión) | **NO INICIADA** (existen 26 módulos admin, ninguno de nieve) | **[E]** con validación en el borde (05b §7.3) | Alta de parte con `sourceUrl`+`capturedAt`+`author`+`confidence` obligatorios, rechazo si faltan; auditoría de quién cambió qué; es **el desbloqueante de F02/F03/F12/F13** |
| F24 | **API propia documentada** (`/api/snow/**`) | **No existe** (04: 68 transacciones, 0 endpoints de datos) | **NO INICIADA** | Solo sirve datos autorizados; nunca datos de infonieve | Contrato versionado + `Provenance` en cada respuesta; la API comercial de infonieve queda **bloqueada** y fuera de alcance salvo contrato (A5) |

### 1.8 Capacidad nueva identificada por t6 (Fase 3, pantalla G)

| # | Capacidad | Referencia | Clasificación | Restricción legal | Mejora |
|---|---|---|---|---|---|
| F25 | **Comparador de estaciones (pantalla G)** — comparar 2–4 estaciones en estado, distancia, km abiertos, % apertura, espesor, meteo, **nieve prevista**, webcams y acceso/aparcamiento | **La referencia NO tiene comparador.** Comprobado el 2026-11-16 sobre los **16 ficheros `*.dom.txt`** de `docs/snow/captures/`: la búsqueda `/compar(ar\|ador\|ativa\|ison)/i` devuelve **0 coincidencias en 0 ficheros** — no hay enlace "comparar" en cabecera, pie, directorio ni detalle. Tampoco apareció en la vista de red (04: 0 endpoints de datos). Es una **capacidad que la referencia no implementa**: no hay nada que copiar, solo algo que superar | **NO INICIADA** (no existe `snow/` en el repo; ver §0.3) | Por columna del comparador: estado y espesor **[E]** (solo editorial, `FALLBACK_CHAINS['operational-status'\|'snow-depth'] = ['editorial-report']`); km abiertos y % apertura derivan de **[E]**; meteo **[A]**/[?] A1·A2; nieve prevista **[A]**/[?] A1·A2 (`forecast`, campo `precipMm`/`snowLine` — no hay proveedor de "cm previstos" autorizado, se deriva); **webcams [X]** (`FALLBACK_CHAINS.image = []` ⇒ solo `ImageGrant.linkUrl`, nunca `<img>`/iframe/proxy); **distancia**: requiere **origen aportado por el usuario** (geolocalización explícita o texto) — **prohibido** inferir/geolocalizar por IP o por la estación; **acceso/aparcamiento: sin fuente autorizada ⇒ `no_data` + `not-covered`** (no se inventa ni se scrapea del operador; Baqueira además está `blocked` por 403, 05 §2.15) | Comparador de 2–4 estaciones en **URL compartible** (`?ids=slug1,slug2&origin=lat,lng`), server-rendered (SSR) para que funcione sin JS; cada celda con su `Provenance` y su `NoDataReason` en vez de un guion; diferencia resaltada con texto+icono (no solo color, WCAG 1.4.1); origen opcional explícito — sin origen se oculta la fila de distancia diciendo "Añade tu origen para ver distancias"; degradación parcial: si una estación no tiene parte, la columna se marca vacía con motivo y el resto compara igual |

> **Nota de encuadre (para no confundirla con paridad):** F25 no es una reconstrucción de la
> referencia — la referencia no la tiene — sino una capacidad del brief de producto (Fase 3, pantalla G,
> establecida por t6). Al documentarla aquí se mantiene la matriz como catálogo único de capacidades,
> sin renumerar F01–F24.


---

## 2. Dependencias entre filas (para ordenar la implementación)

```
F23 (admin editorial)  ──► F02 (parte) ──► F12/F13 (rankings) ──► F01 (portada)
                       └─► F03 (detalle) ──► F18/F19 (actividades)
F04 (directorio) ──► F05 (país) ──► F06 (búsqueda)
F24 (API)  ── base de todo lo anterior ──  requiere maestro (station-master)
F08 (previsión)  requiere A1/A2 (credenciales)  ── independiente del resto
F09/F10 (webcams/mapa)  independientes; F10 requiere PROTOMAPS_BASE_URL
F20/F21/F22  transversales: se aplican desde la primera pantalla
```

**Camino crítico:** `F24 (API+maestro)` → `F23 (admin)` → `F02 (parte)` → `F03 (detalle)`.
Previsión (F08) puede ir en paralelo pero **no muestra datos** hasta A1/A2.

---

## 3. Contratos propuestos (derivados de 05b, sin reabrirla)

Estos son los **únicos** tipos que deben usar t7 (backend) y t8 (frontend). 05b §1–§2 es la fuente;
aquí se fija su ubicación, el borde HTTP y lo que **no** se duplica.

### 3.1 Ubicación y propiedad

| Artefacto | Ruta propuesta | Dueño |
|---|---|---|
| Contratos de proveedor (`ProviderResult`, `Provenance`, `ProviderId`, `SnowDataType`, `CACHE_POLICY`, `RATE_LIMITS`, `BREAKER`, `FALLBACK_CHAINS`) | `snow/providers/contracts.ts` | t5/t7 |
| Modelo de dominio compartido (`Station`, `SnowReport`, `ForecastBundle`, `AvalancheBulletin`, `ActivityRoute`) | `snow/models/*.ts` (o lib `data-access` si el capitán lo decide) | t5 |
| Adaptadores | `snow/providers/<id>.adapter.ts` | t7 |
| Orquestador de cadena | `snow/providers/chain.ts` | t7 |
| Router Express | `web-ssr/src/server.ts` → `snow/server/snow.routes.ts` | t7 |
| Cliente Angular | `snow/client/snow-api.service.ts` | t8 |

**Regla:** el frontend **no** importa `contracts.ts` con las constantes de caché (son server-side);
consume el DTO del borde (§3.3), que es un **subconjunto estable** con `Provenance`.

### 3.2 Borde HTTP: `GET /api/snow/v1/stations/:slug/report`

**Validación del bloque TypeScript (2026-11-16, hecha para este documento).** El bloque `ts` de §3.2
se extrae con `node scripts/snow/extract-contract-ts.mjs` (que antepone 6 declaraciones mínimas para
nombres que viven en 05b: `LicenseStatus`, `NoDataReason`, `StationSummary`, `OperationalStatusDto`,
`SnowDepthDto`) y se compila con el TypeScript del repo:

```
node node_modules/typescript/bin/tsc --noEmit --strict --target es2022 \
  --module esnext --moduleResolution bundler --skipLibCheck tmp/t4-tscheck/contract.ts
=> exit 0   (1 bloque ts extraído)
```

Limitación honesta: compila **con** ese preludio; el DTO no es autocontenido respecto de 05b (los
tipos base los importará t7/t8 del módulo de contratos real). `tmp/` está en `.gitignore`.


```ts
/** DTO del borde: lo único que cruza al navegador. */
export interface SnowReportDto {
  readonly station: StationSummary;
  readonly report: ReportPayload;
  /** SIEMPRE presente, incluso cuando no hay dato. */
  readonly provenance: ProvenanceDto;
  /** Estado global de la lectura, para que la UI no adivine. */
  readonly status: 'ok' | 'stale' | 'no_data' | 'not_configured' | 'blocked';
  readonly reason?: NoDataReason;      // solo si status = no_data | blocked
}

export interface ProvenanceDto {
  source: string;
  observedAt: string;      // ISO 8601 UTC
  updatedAt: string | null;
  status: 'live' | 'cached' | 'stale' | 'degraded';
  licenseStatus: LicenseStatus;
  freshness: number;       // segundos
  authorization: {
    registryRef: string;   // "05#aemet"
    licenseId: string;
    commercialUse: boolean;
    storageAllowed: boolean;
    attributionRequired: boolean;
  };
  attribution: string | null;
}

export interface ReportPayload {
  operational: OperationalStatusDto | null;   // null cuando no hay parte
  snow: SnowDepthDto | null;
  /** Nunca 0 como "sin dato": ausencia = null + reason. */
  readonly noDataFields: readonly (keyof ReportPayload)[];
}
```

**Contrato de respuesta (no negociable):**

| Situación | HTTP | Cuerpo |
|---|---|---|
| Dato presente | `200` | `status: 'ok'` \| `'stale'` + payload + `provenance` |
| Sin dato legal (fuera de temporada, etc.) | **`200`** | `status: 'no_data'`, `reason`, `provenance` presente |
| Sin credencial | **`200`** | `status: 'not_configured'`, `reason: 'not-covered'` |
| Prohibido por licencia (p. ej. imagen) | **`200`** | `status: 'blocked'`, `reason: 'license-prohibits'` |
| Estación inexistente | `404` | `{ error: 'station-not-found' }` — **no** redirigir a la lista (defecto de la referencia, E23) |
| Bug propio | `500` | `{ error: 'internal' }` + log con `redactUrl` |

**Nunca**: `500` por falta de credencial, `302` a otra página por recurso inexistente, ni
`data: 0` para "sin dato" (violaría la regla anti-sentinel de 05b §3.2).

### 3.3 Esquema de datos propuesto (SQL, coherente con 05b §5)

Nombres en `snake_case`; el prefijo `osm_derived_*` es **vinculante** para separar la base derivada
ODbL de la editorial (el repo no tiene BD todavía: esto es propuesta para t5/t7).

**Validación del esquema (2026-11-16, real).** El bloque SQL se aplica sobre una BD en memoria con el
`node:sqlite` nativo de Node 24 (`node scripts/snow/check-schema.mjs`) y se comprueban los invariantes;
`exit 0`. Resultado real:

```
schema applied: ok
tables: forecast_cache, osm_derived_station, snow_report, station, station_osm_link
PASS  station has no OSM-derived columns
PASS  osm_derived_station has no editorial columns
PASS  negative base_cm (-1) rejected by CHECK
PASS  negative lifts_open (-99) rejected by CHECK
PASS  invalid mood rejected by CHECK
PASS  avalanche_level 6 rejected by CHECK
PASS  NULL represents absence (accepted)
PASS  invalid discipline rejected by CHECK
RESULT: all invariants hold
```

Durante la construcción del test apareció un fallo propio del **arnés** (mi helper de inserción omitía
`created_at`/`updated_at`, que son `NOT NULL`): se corrigió el arnés, **no** el esquema. Se deja dicho
para que nadie lea ese histórico como un defecto del esquema.

```sql
-- Maestro EDITORIAL (nuestra curaduría; no proviene de OSM ni de infonieve)
CREATE TABLE station (
  id            INTEGER PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,          -- 'baqueira-beret'
  name          TEXT NOT NULL,
  country       TEXT NOT NULL CHECK (country IN ('ES','AD','FR','PT')),
  region        TEXT NOT NULL,                 -- sistema montañoso (estructura editorial propia)
  discipline    TEXT NOT NULL CHECK (discipline IN ('alpine','nordic')),  -- F11
  lat           REAL NOT NULL,
  lng           REAL NOT NULL,
  alt_base_m    INTEGER,
  alt_top_m     INTEGER,
  website       TEXT,
  season_open   TEXT,                          -- 'MM-DD' (F14)
  season_close  TEXT,
  season_confirmed INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Parte EDITORIAL (única fuente legal de estado y espesores: 05b §3)
CREATE TABLE snow_report (
  id            INTEGER PRIMARY KEY,
  station_id    INTEGER NOT NULL REFERENCES station(id),
  observed_at   TEXT NOT NULL,                 -- fecha del parte
  captured_at   TEXT NOT NULL,                 -- cuándo lo transcribimos
  source_url    TEXT NOT NULL,                 -- obligatorio (05b §7.3)
  author        TEXT NOT NULL,                 -- operador humano
  confidence    REAL NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  lifts_open    INTEGER, lifts_total INTEGER,
  pistes_open   INTEGER, pistes_total INTEGER,
  km_open       REAL,    km_total    REAL,
  base_cm       INTEGER, mid_cm INTEGER, top_cm INTEGER,
  new_snow_24h_cm INTEGER,
  quality       TEXT,                          -- enum propio (reutiliza SnowQuality)
  avalanche_level INTEGER CHECK (avalanche_level BETWEEN 1 AND 5),
  mood          TEXT NOT NULL DEFAULT 'published'
                CHECK (mood IN ('draft','pending','published','rejected')),  -- F16
  expires_at    TEXT,                          -- partes de usuario: +10 días (F16)
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  -- Regla anti-sentinel: nada de -1/-99 como "sin dato".
  CHECK (lifts_open IS NULL OR lifts_open >= 0),
  CHECK (base_cm   IS NULL OR base_cm   >= 0)
);
CREATE INDEX snow_report_station_observed ON snow_report(station_id, observed_at DESC);

-- Previsión / aludes: AUTOMÁTICOS, guardados con su procedencia
CREATE TABLE forecast_cache (
  id          INTEGER PRIMARY KEY,
  station_id  INTEGER NOT NULL REFERENCES station(id),
  source      TEXT NOT NULL,      -- ProviderId
  observed_at TEXT NOT NULL,
  updated_at  TEXT NOT NULL,      -- obligatorio (AEMET/Licence Ouverte)
  expires_at  TEXT NOT NULL,      -- CACHE_POLICY[source].ttlMs
  payload_json TEXT NOT NULL
);

-- Aislamiento ODbL (05b §5): aquí SOLO campos derivados de OSM
CREATE TABLE osm_derived_station (
  id INTEGER PRIMARY KEY, osm_type TEXT NOT NULL, osm_id TEXT NOT NULL,
  name TEXT, lat REAL, lng REAL, tags_json TEXT,
  snapshot_id TEXT NOT NULL, extracted_at TEXT NOT NULL
);
CREATE TABLE station_osm_link (               -- puente opaco, sin geometría
  station_id INTEGER NOT NULL REFERENCES station(id),
  osm_ref    TEXT NOT NULL,                   -- 'node/12345'
  PRIMARY KEY (station_id, osm_ref)
);
```

**Invariantes verificables en test (t9):**
1. `station` y `snow_report` no contienen columnas derivadas de OSM salvo el puente `station_osm_link`.
2. `osm_derived_*` no contiene campos editoriales.
3. Ningún campo numérico es `-1`, `-99`, `NaN` o `Infinity` (la ausencia es `NULL` + `reason`).
4. `snow_report.source_url`, `author`, `captured_at` nunca vacíos en `mood='published'`.

---

## 4. Riesgos y decisiones que necesitan al capitán

| # | Decisión pendiente | Por qué está aquí | Recomendación |
|---|---|---|---|
| R1 | ¿Ubicación del modelo compartido (`snow/models` vs lib `data-access`)? | Afecta a `tsconfig` paths y a t5/t7/t8 | `snow/models` + alias en `tsconfig.base.json`, sin crear lib Nx nueva (mínimo cambio) |
| R2 | ¿BD real o JSON versionado para v1? | No hay BD en el repo (00 §3); montar una BD es alcance grande | v1: **JSON versionado** con el mismo esquema lógico; el contrato no cambia al migrar |
| R3 | ¿Se añade runner de tests? | Sin runner, "tests" no existen (00 §7, corregido en t2) | Sí, **mínimo**: `node:test` nativo (sin dependencias nuevas) para t9 |
| R4 | Favoritos sin servidor | F07 se puede cerrar sin backend | `localStorage` + `signal`; no bloquear por auth |
| R5 | Fuentes reales hoy | 0 proveedores con credencial (A1/A2 pendientes) | Arrancar todo en `not_configured`/editorial y **demostrar la degradación**, no esperar a las claves |

---

## 5. Criterios de aceptación de esta matriz

- [x] Las 22 capacidades del brief (F01–F22) tienen fila, más F23/F24 propias y F25 comparador (t6),
  con referencia
  **observada** y su Evidence ID en 01/03.
- [x] Clasificación honesta: **0 IMPLEMENTADAS**, verificado en §0.3 contra el repo.
- [x] Cada fila nombra la **restricción legal aplicable** de 05/05b (no inventada aquí).
- [x] Cada fila tiene una **mejora planificada** concreta, sin copiar nada de la referencia.
- [x] Contratos y esquema propuestos, coherentes con 05b §1–§5 (incluida la separación ODbL).
- [x] Dependencias y camino crítico explícitos.
