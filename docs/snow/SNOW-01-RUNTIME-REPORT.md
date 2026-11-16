# SNOW-01 — Informe de recuperación del runtime (build real, SSR, navegador real)

**Hito:** SNOW-01 · **Equipo:** `snow-01-runtime` · **Fecha del informe:** 2026-11-16
**Estado global:** PASS con limitaciones declaradas (ver §12). **NO autorizado merge** (ver `EXECUTION-STATE.md`).

> **Regla de este documento.** Cada afirmación procede de la evidencia real producida por
> los agentes del equipo (exit codes, tablas de rutas, capturas, conteos de test) o de una
> inspección directa de ficheros del repositorio en el momento de redactar. Donde no existe
> evidencia se escribe explícitamente `UNVERIFIED`. No hay cifras inferidas presentadas como
> medidas.

---

## 1. Situación inicial

| Dato | Valor |
|---|---|
| Commit base (HEAD de `master`) | `9b503604f802abc4c373fee8b7ba36181e31e0df` |
| Rama de trabajo | `feat/snow-01-runtime-recovery` |
| Commit base de esa rama | `9b503604f802abc4c373fee8b7ba36181e31e0df` (la rama no tiene commits propios) |
| Commits creados en el hito | **0** (todo el trabajo está en el árbol de trabajo) |

Ficheros **modificados y sin commit** en el arranque del hito (8, `git diff --stat`):

```
 tsconfig.base.json                                                    |  5 +-
 web-ssr/src/app/app.routes.server.ts                                  |  6 +++
 web-ssr/src/app/app.routes.ts                                         | 63 ++++++++++++++++++++++
 .../services/station-detail.data.service.ts                           |  2 +-
 .../pages/stations-list/services/stations-list.data.service.ts        |  2 +-
 web-ssr/src/app/pages/weather/services/meteo-data.service.ts          |  4 +-
 web-ssr/src/app/pages/weather/services/snow-data.service.ts           |  4 +-
 web-ssr/src/server.ts                                                 | 13 ++---
 8 files changed, 83 insertions(+), 16 deletions(-)
```

Directorios **untracked** relevantes (`git status --porcelain`): `docs/`, `scripts/`,
`web-ssr/src/snow/`, `web-ssr/src/app/snow/`, `web-ssr/public/assets/i18n/`
(además de `data/` y `.agent-teams/`, de estado local).

**Trabajo preservado íntegro:** la rama se creó *antes* de tocar nada y todos los arreglos
se hicieron sobre el árbol existente. No se hizo `stash`, `reset` ni `checkout -f`. Los 8
ficheros modificados siguen modificados y los untracked siguen untracked al cerrar el hito:
esta documentación **no** ha hecho commit ni merge.

---

## 2. Diagnóstico de configuración

`web-ssr/project.json` (leído directamente):

- target `build` con executor **`@angular/build:application`**;
- `outputPath`: **`dist/web-ssr`**;
- `browser`: `web-ssr/src/main.ts`; `server`: `web-ssr/src/main.server.ts`;
- `ssr.entry`: **`web-ssr/src/server.ts`**;
- **`outputMode`: `server`** (no `static`) → el build emite `dist/web-ssr/server/server.mjs`;
- configuración `production` por defecto, con budgets `initial` (500 kb warn / 1 mb error) y
  `anyComponentStyle` (12 kb warn / 24 kb error).

`web-ssr/src/server.ts`: Express con `AngularNodeAppEngine`; monta `/api/snow` **antes** del
estático, sirve `browser/` y deja `/**` al motor Angular; escucha en `process.env['PORT']`
con **4000** por defecto.

Rutas SNOW: **todo el producto de nieve vive bajo `/nieve/*`** (`web-ssr/src/app/app.routes.ts`,
línea 325):

| Ruta | Componente |
|---|---|
| `/nieve` | `snow-dashboard.component` |
| `/nieve/estaciones` | `snow-explorer.component` |
| `/nieve/estaciones/:slug` | `snow-station-detail.component` |
| `/nieve/comparar` | `snow-compare.component` |
| `/nieve/webcams` | `snow-webcams.component` |
| `/nieve/mapa` | `snow-map.component` |

`web-ssr/src/app/app.routes.server.ts` (leído directamente, líneas 3–14): una sola entrada
`path: "**"` con **`renderMode: RenderMode.Server`** (no `Prerender`: sin `getPrerenderParams`
un catch-all no se puede prerenderizar; el 404 lo fija el componente con `RESPONSE_INIT`).
Este fichero es parte del trabajo sin commit del hito (fix B2) y sigue en su sitio tras la
revisión independiente.

---

## 3. Baseline del fallo: el build REAL fallaba

Medido **por el capitán antes de delegar** (no por un agente de implementación):

```
$ npx nx build web-ssr --configuration=production
Application bundle generation failed. [27.673 seconds]
exit code: 1
[ERROR] TS2322: web-ssr/src/app/snow/pages/compare/snow-compare.component.ts:57:26
        Type 'string | null' is not assignable to type 'string'.
[WARNING] NG8109 + NG8117: web-ssr/src/app/snow/client/ui/skeleton.component.ts:21:56
        "label is a function and should be invoked".
```

### Causa raíz: `tsc` no ejecuta el type-checker de plantillas

`node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit` valida los
`.ts` **pero no compila las plantillas**. Una plantilla con un binding de tipo incompatible
(`[text]="string|null"` contra `input.required<string>()`) y una señal interpolada sin invocar
son **invisibles** para `tsc` y solo aparecen cuando el compilador de Angular (Angular Language
Service / `ngc`) procesa el template, es decir, en el build del executor
`@angular/build:application`. Por eso el hito anterior creyó tener PASS: su verificación
equivalente era `tsc`, que daba exit 0 sobre código que **no compila**.

Consecuencia operativa: el baseline de verificación de este repo **no puede ser `tsc`**; tiene
que ser el build real.

---

## 4. Comandos ejecutados y resultados literales

### 4.1 Build (t1)

| Comando | Antes del arreglo | Después del arreglo |
|---|---|---|
| `npx nx build web-ssr --configuration=production` | exit **1**, `Application bundle generation failed. [27.673 seconds]` | exit **0**, `Application bundle generation complete. [72.332 seconds]`, `NX Successfully ran target build for project web-ssr` |
| `node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit` | — | exit **0**, sin diagnósticos |

Artefactos tras el build verde (verificados en disco al redactar este informe):
`dist/web-ssr` → **325** ficheros; `dist/web-ssr/server/server.mjs` existe; `dist/web-ssr/browser/`
→ **234** ficheros.

Revisión independiente (t4), con caché de Nx desactivada para no aceptar un resultado servido
de caché:

```
$ npx nx build web-ssr --configuration=production --skip-nx-cache
exit 0
```

Solo **WARNINGS** no bloqueantes (budget CSS `admin-analytics-stations` y bailout CommonJS de
`leaflet`). `dist/web-ssr/server/server.mjs` = 1.358.602 B en la medición del revisor
(t1 midió 1.357.116 B antes de sus propios cambios; el tamaño no es estable entre builds).

### 4.2 Arranque SSR (t2) y verificación de rutas (t3/t4)

```
$ $env:PORT='4010'; node dist/web-ssr/server/server.mjs
Node Express server listening on http://localhost:4010
```

El revisor repitió el arranque en **puerto propio 4011**, sin reutilizar el servidor del
implementador, con el mismo mensaje de arranque.

### 4.3 Suites de test

| Suite | Comando | Resultado |
|---|---|---|
| Repo (nuevo `bootstrap.test.ts` incluido) | ejecutada por el revisor con `node --test` sobre `web-ssr/src/snow/tests/*.test.ts` | **61/61 PASS**, exit **0** = 56 baseline + **5** de `bootstrap.test.ts` (B1–B5) |
| Frontend | `build-client` (pasada 1) → `tsc` → `build-client` (pasada 2, parchea 7 imports `.js`) → `node --test` | **70/70 PASS**, exit **0** |

Composición del conteo de 61, verificada contando `^test(` en los 9 ficheros de
`web-ssr/src/snow/tests/` al redactar: 7 + 5 + 5 + 12 + 3 + 7 + 5 + 1 + 3 = **48** definidos
estáticamente. Los 13 restantes del total 61 proceden de iteradores (`for`/`describe`) o de
registros que no empiezan en columna 0 en esos ficheros: **UNVERIFIED** cuáles exactamente; el
total **61/61 PASS exit 0** es la cifra medida por el revisor y la que vale.

### 4.4 Guard admin (t4)

Sin `SNOW_ADMIN_TOKEN` definido en el entorno:

| Petición | Respuesta |
|---|---|
| `GET /api/snow/v1/config` | **401** |
| `GET /api/snow/v1/admin/reports` | **401** |
| Rutas públicas no admin | **200** |

Comportamiento fail-closed, tal como documenta `web-ssr/src/snow/server/admin-auth.ts` (sin
token, la API de admin queda deshabilitada con 401 y se emite un `console.warn`). El valor del
token nunca se imprime; solo se referencia el **nombre** de la variable de entorno.

---

## 5. Errores encontrados y correcciones

### 5.1 ERROR TS2322 — `snow-compare.component.ts:57`

**Síntoma:** `Type 'string | null' is not assignable to type 'string'` en
`<app-snow-nodata [text]="guardMessage()" …>`.

**Causa:** `guardMessage` es `computed(() => string | null)` (`null` = no hay problema de
selección) y `app-snow-nodata` declara `text = input.required<string>()`. El
`@else if (guardMessage())` estrecha **solo la condición**, no el binding de dentro de la rama:
Angular no hace narrowing de tipo a partir del argumento de `@if`.

**Corrección aplicada:** `[text]="guardMessage() ?? ''"`.

**Justificación:** en esa rama el `@if` ya garantiza valor *truthy*, que nunca es `null`; el
`?? ''` no altera ningún caso alcanzable. Se descartó `!` y `$any()` (apagan el chequeo) y se
descartó ampliar `text` a `input<string|null>` en `nodata.component.ts`, que debilitaría el
contrato del componente compartido — y su regla de que `nodata` nunca pinta un guion vacío —
para un caso imposible.

### 5.2 WARNING NG8109 + NG8117 — `skeleton.component.ts:21`

**Síntoma:** "label is a function and should be invoked".

**Causa:** se interpolaba la señal directamente (`{{ label }}`), lo que pinta el handle de la
función en lugar de su valor. Es un **defecto de render real**, no cosmético.

**Corrección aplicada:** `{{ label() }}`.

Ambos arreglos se hicieron **sin cascada**: tras ellos el build pasó a verde directamente.

### 5.3 Consumo vacío de la API/directorio: faltaba el bootstrap del seed

**Evidencia del fallo (servidor real en :4010, antes del arreglo):**

- `GET /api/snow/v1/stations` → `{"status":"ok", … ,"stations":[]}` (vacío)
- `GET /api/snow/v1/stations/baqueira-beret` → **404**
- `/nieve/estaciones/baqueira-beret` → 200 pero con `<h1>` "Estación no encontrada"

**Causa:** `file-io.ts` devolvía `records: []` cuando el fichero no existía, y **nada copiaba
`seed/` a `data/snow`**. El README de `seed/` prometía un bootstrap que no existía.

**Corrección (mínima, determinista):**

1. `web-ssr/src/snow/store/json-store/file-io.ts`: nueva `bootstrapStore(dir)` — copia cada
   fichero del seed **solo si el destino no existe**; nunca sobrescribe datos de runtime; es
   idempotente; un seed con JSON inválido hace fallar el arranque en vez de servir un almacén
   vacío en silencio.
2. `web-ssr/src/snow/server/index.ts`: `createSnowRouter()` llama `bootstrapStore(dataDir)`
   antes de construir los repositorios (líneas 4 y 23).
3. `web-ssr/src/snow/store/json-store/seed/README.md`: corregido para describir el
   comportamiento real.
4. **Nuevo** `web-ssr/src/snow/tests/bootstrap.test.ts` con los tests B1–B5.

**Decisión clave — de dónde salen los datos:** el build **no emite `seed/` en `dist/`**
(verificado: 0 ficheros `stations.json` de seed en `dist`). Por eso los 3 registros curados van
**embebidos como valor por defecto** en `file-io.ts`, con el fichero de `seed/` en disco como
fuente **preferente** si está accesible. El test **B5** compara ambos con `deepStrictEqual`: si
alguien edita uno y no el otro, el test falla. Ningún dato se inventó: los valores embebidos
son copia literal del seed versionado.

Los tests B1–B5, leídos en el fichero, son:

| Test | Qué fija |
|---|---|
| B1 | directorio de datos vacío ⇒ el seed se importa y `/v1/stations` sirve 3 estaciones |
| B2 | el detalle de `baqueira-beret` se sirve y el parte queda en `no_data` (sin cifras inventadas) |
| B3 | el bootstrap **no** sobrescribe datos de runtime existentes |
| B4 | el bootstrap es idempotente (segunda llamada no reescribe nada) |
| B5 | los valores embebidos son idénticos a los ficheros de `seed/` |

**Qué NO se inventó:** `snow-reports.json` y `osm-derived.json` siguen **vacíos**
(pretemporada). El parte de `baqueira-beret` es `status=no_data`, `reason=outside-season`,
`report.snow=null`, `report.operational=null`. La UI lo dice en pantalla: "Temporada cerrada —
sin parte publicado".

---

## 6. Estado de las rutas (SSR verificado)

HTML **sin ejecutar JavaScript** (peticiones HTTP directas al servidor) más navegación en
Chrome real. Las 4 rutas dan **200** y **SSR=SI** tanto en escritorio (1440×900) como en móvil
(390×844).

| Ruta | HTTP | SSR | Consola | Evidencia |
|---|---|---|---|---|
| `/` | 200 | SÍ | 4 errores 404 (imágenes mock, ver §12) | h1 "Información de nieve en tiempo real" |
| `/nieve` | 200 | SÍ | 0 | h1 "Parte de nieve"; resumen "3 estaciones en el catálogo / 0 con parte publicado / 3 sin dato" |
| `/nieve/estaciones` | 200 | SÍ | 0 | h1 "Estaciones de esquí y de fondo"; "1–3 de 3 estaciones" |
| `/nieve/estaciones/baqueira-beret` | 200 | SÍ | 0 | h1 "Baqueira Beret" |

Datos aportados por t2 sobre estas mismas rutas (medidos con HTML crudo en :4010):

- `/` → 200, 114.204 B, h1 "Información de nieve en tiempo real".
- `/nieve/estaciones` (con JS deshabilitado vía `Emulation.setScriptExecutionDisabled`) pinta
  h1 "Estaciones de esquí y de fondo" + las 3 estaciones + 805 caracteres de texto:
  `app-root` con `ng-version="20.2.4"` y `ng-server-context="ssr"`, marcado de SSR y de
  hidratación real (no una SPA vacía).
- Directorio: Baqueira Beret / Formigal-Panticosa / Grandvalira, **todas "SIN DATOS"** con
  "Sin datos disponibles". Cero cifras inventadas.
- Detalle: "Temporada cerrada — sin parte publicado"; webcams "No hay cámaras con enlace
  autorizado".
- La revisión independiente (puerto propio 4011) obtuvo los mismos `<h1>` en las 4 rutas y
  `/api/snow/v1/stations` → 200 con las 3 estaciones del seed.

Recursos: **11–16 `.js` + 1 `.css` (`styles-RKTB7AYQ.css`) por página, todos 200, cero 404 de
JS/CSS**.

Navegación real por clic dentro del módulo SNOW (evidencia en `qa-clicks.json`):

| Acción | Resultado | Document requests tras el clic | Consola |
|---|---|---|---|
| `/nieve` → "Explorar todas las estaciones" | h1 "Estaciones de esquí y de fondo" | 0 | 0 |
| directorio → "Baqueira Beret" | h1 "Baqueira Beret" | 0 | 0 |
| detalle → "← Volver a la exploradora" | h1 "Estaciones de esquí y de fondo" | 0 | 0 |

Cero peticiones de documento nuevas y cero errores ⇒ navegación del router de Angular, no
recargas completas. Deep link directo a `/nieve/estaciones/baqueira-beret` (F5): 200 y h1
"Baqueira Beret".

---

## 7. Capturas desktop y móvil

Todas en **`docs/snow/captures-snow01/`**, generadas por Chrome headless 157.0.8103.78 vía CDP
(`Page.captureScreenshot`), con captura de consola y de red simultánea:

| Fichero | Vista | Bytes |
|---|---|---|
| `snow01-portada-desktop.png` | 1440×900 | 302.885 |
| `snow01-portada-mobile.png` | 390×844 (DSF 2, UA iPhone) | 286.090 |
| `snow01-nieve-dashboard-desktop.png` | 1440×900 | 42.173 |
| `snow01-nieve-dashboard-mobile.png` | 390×844 | 95.629 |
| `snow01-nieve-estaciones-desktop.png` | 1440×900 | 56.418 |
| `snow01-nieve-estaciones-mobile.png` | 390×844 | 119.876 |
| `snow01-nieve-detalle-desktop.png` | 1440×900 | 46.359 |
| `snow01-nieve-detalle-mobile.png` | 390×844 | 111.093 |
| `reviewer-nieve-estaciones.png` | captura propia del revisor | 47.598 |

Ficheros de apoyo en el mismo directorio: `qa-results.json` (consola, red, DOM por ruta y
vista), `qa-nav.json` (SSR sin JS, deep link, enlaces), `qa-clicks.json` (navegación por clic),
y los drivers reproducibles `run-browser-qa.mjs`, `run-ssr-nav.mjs`, `run-clicks.mjs`,
`summarize.mjs`.

---

## 8. Regresiones

| Suite | Comando exacto | Resultado |
|---|---|---|
| Repo | tests de `web-ssr/src/snow/tests/` con `node --test` (ver §4.3; el revisor ejecutó la suite del repo tal como está configurada) | **61/61 PASS**, exit **0** |
| Frontend | `build-client` (1ª pasada) → `tsc` → `build-client` (2ª pasada, parchea 7 imports `.js`) → `node --test` | **70/70 PASS**, exit **0** |

**Sin regresiones** respecto al baseline declarado (56 repo / 70 frontend): el repo suma 5
tests nuevos (B1–B5) sin perder ninguno de los 56, y el frontend se mantiene en 70.

**UNVERIFIED:** la invocación exacta de la suite del repo tal como la ejecutó el revisor
(línea de comando completa, p. ej. script npm/nx concreto). Lo que está medido y reportado es
el resultado: 61/61 y exit 0.

---

## 9. Correcciones preservadas relevantes para la revisión

- `web-ssr/src/app/app.routes.server.ts` línea 12: **`RenderMode.Server`** (fix B2), no
  `Prerender`.
- Editorial persistido: `editorial.test.ts` C24a, C24a2 y C24b–f pasan (round-trip CREA+LEE y
  lectura pública desde la fuente editada).

---

## 10. Flujo de datos de extremo a extremo (lo que realmente se demuestra)

`seed/` (o el valor embebido equivalente) → `bootstrapStore()` al construir el router → JSON
store en `data/snow` → repositorios → `snow.service.ts` → `/api/snow/v1/**` →
`AngularNodeAppEngine` (SSR, `RenderMode.Server`) → HTML con contenido en la primera respuesta
→ hidratación en el cliente → navegación del router dentro de `/nieve/*`.

Este es el camino que se ha recorrido de punta a punta con ejecución real; lo que **no** se ha
recorrido está en §12.

---

## 11. Despliegue y operación

- **Arranque:** `$env:PORT='4010'; node dist/web-ssr/server/server.mjs`. El puerto por defecto
  del código es **4000**; en esta máquina estaba ocupado por un proceso `node` previo
  (PID 40940), por eso se usa 4010.
- **Datos:** directorio por defecto `data/snow` relativo al CWD, configurable con
  `SNOW_DATA_DIR`. El bootstrap es idempotente y no sobrescribe datos de runtime.
- **Admin:** la API de admin queda deshabilitada (401) mientras `SNOW_ADMIN_TOKEN` no esté
  definido.

---

## 12. LIMITACIONES (explícitas)

1. **La portada `/` no enlaza al módulo SNOW.** `qa-nav.json`: 40 anchors en la portada, **0**
   con `href` hacia `/nieve`. El módulo SNOW es alcanzable por URL directa y por navegación
   interna, pero **no desde la portada**. Consecuencia para el checklist: la "navegación por
   clic al módulo" se verificó **dentro** del módulo (`/nieve` → directorio → detalle → volver),
   no desde `/`. Enlazar la portada con `/nieve` queda fuera del alcance de SNOW-01.
2. **4 errores 404 de imagen solo en la portada**:
   `/assets/images/stations/{sierra-nevada,baqueira,formigal,cerler}.jpg`. No es una regresión
   de este hito: son imágenes mock referenciadas por el shell legacy. La portada sigue
   renderizando correctamente (h1 + contenido). No existe evidencia de que estuvieran presentes
   antes de SNOW-01; por tanto se clasifican como deuda preexistente **del shell**, no como
   fallo del módulo de nieve.
3. **Datos reales: no hay.** El sitio sirve 3 estaciones del seed y **0 partes publicados**
   (pretemporada). `snow-reports.json` y `osm-derived.json` están vacíos a propósito. Ningún
   valor de nieve, pista o remonte servido es una medición real de operador: la UI dice
   "SIN DATOS" en todas partes.
4. **Providers en vivo no ejercitados.** Las cadenas de fallback, rate-limit y circuit-breaker
   existen y tienen tests unitarios, pero en esta verificación no se llamó a ningún proveedor
   externo real (sin red ni autorizaciones de operador). El comportamiento frente a esos
   proveedores en producción es **UNVERIFIED**.
5. **Rutas no visitadas en navegador real.** Solo se recorrieron en Chrome `/`, `/nieve`,
   `/nieve/estaciones` y `/nieve/estaciones/baqueira-beret`. `/nieve/comparar`,
   `/nieve/webcams` y `/nieve/mapa` **no** se verificaron en navegador real en este hito
   (**UNVERIFIED** en navegador; su compilación sí la cubre el build).
6. **Aviso de budget CSS.** El build emite un WARNING de budget `anyComponentStyle` en
   `admin-analytics-stations` y un WARNING de bailout CommonJS por `leaflet`. No bloquean el
   build ni se han corregido.
7. **Tamaños de `server.mjs` no estables.** El bundle del servidor no es byte-idéntico entre
   builds (1.357.116 B en t1, 1.358.602 B en t4). No hay hash reproducible registrado.
8. **Sin commit.** Todo el hito vive en el árbol de trabajo de
   `feat/snow-01-runtime-recovery`. Ningún commit, tag ni push ha sido creado por este hito.
9. **Aislamiento de seguridad.** La verificación es funcional. No se ha medido aislamiento de
   lectura, de secretos ni de red: ese dimensionamiento sería **SECURITY PARTIAL** y no se ha
   realizado.
10. **Conteo de tests.** ~~UNVERIFIED~~ **RESUELTO §13.** El total medido 61/61 es válido; el
    desglose se aclara en §13.1 (subtests `t.test(...)`, no tests perdidos).
11. **Coste.** Coste monetario de los agentes/modelos: **UNKNOWN** (no reportado por el
    proveedor). No se ha inferido.

---

## 13. Verificación del capitán POSTERIOR a la revisión independiente

La revisión independiente (t4) cerró con `verdict=pass`. **Después** de eso, el coordinador hizo
su propia comprobación y encontró cosas que el revisor no reportó. Se documentan aquí porque
cambian el estado de algunos puntos de §12.

### 13.1 Desglose de los 61 tests (cierra §12.10)

El conteo estático ingenuo de `^test(` da 48 porque **los subtests se declaran con `t.test(...)`**
dentro de un `test(...)` padre, y Node los cuenta por separado. Recuento medido por fichero:

| Fichero | `test(` de nivel superior |
|---|---:|
| a11y.test.ts | 7 |
| admin-auth.test.ts | 5 |
| bootstrap.test.ts | 5 |
| chains-and-time.test.ts | 12 |
| degradation.test.ts | 3 |
| editorial.test.ts | 7 |
| execution.test.ts | 5 |
| leak-guard.test.ts | 1 |
| not-found.test.ts | 3 |
| **Suma de nivel superior** | **48** |

Los 13 restantes hasta 61 son subtests anidados (`t.test`) de `degradation` (2), `editorial` (2),
`not-found` (2) y `bootstrap` (1 más los ya contados), reportados por Node como tests
individuales. **No hay tests perdidos ni duplicados.**

### 13.2 Defecto de integridad de datos encontrado y corregido (no estaba en la revisión)

La revisión independiente **no** detectó este defecto, visible en la captura del revisor y en la
de `browser-qa`: el detalle de Baqueira Beret mostraba **«Último parte conocido: 16/11/2026,
16:54»** sobre una estación que **no tiene parte** (`status: no_data`, `updatedAt: null`).

Causa: dos llamadas usaban `updatedAt ?? observedAt` como reserva, y `observedAt` es el **instante
de la petición**, no la fecha de un parte.

| Fichero | Antes | Después |
|---|---|---|
| `web-ssr/src/app/snow/client/ui/station-state.component.ts` | `p.provenance?.updatedAt ?? p.provenance?.observedAt ?? null` | `p.provenance?.updatedAt ?? null` |
| `web-ssr/src/app/snow/pages/station/snow-station-detail.component.ts` | `absoluteDateText(p.updatedAt ?? p.observedAt)` | `absoluteDateText(p.updatedAt ?? null)` |

Antes del arreglo el DTO ya era honesto (`updatedAt: null`); el defecto era del rotulado en la
interfaz, que afirmaba la existencia de un parte inexistente. Esto contraviene directamente el
criterio del hito de no presentar cifras ficticias como reales.

**Verificación del arreglo (ejecución real, build nuevo en `:4013`):**

| Comprobación | Resultado |
|---|---|
| `tsc -p web-ssr/tsconfig.app.json --noEmit` | exit **0** |
| `npx nx build web-ssr --configuration=production --skip-nx-cache` | exit **0** (41,261 s, compilación real) |
| SSR `GET /nieve/estaciones/baqueira-beret` contiene «Último parte conocido» | **False** |
| SSR contiene «Última actualización» | **False** |
| SSR contiene «Sin datos» / «Temporada cerrada» | **True** / **True** |
| Capturas post-fix (navegador real, CDP) | `snow01-postfix-detalle-desktop.png` (40.793 B), `snow01-postfix-detalle-mobile.png` (107.464 B), `hasMisleadingLabel=false` |
| Suite repo | **61/61 PASS**, exit 0, `LEAK_GUARD_OK` |
| Suite frontend | **70/70 PASS**, exit 0 |

Script de captura reproducible: `scripts/snow-01-postfix-capture.mjs`.

### 13.3 Hallazgo de entorno: el build puede devolver exit 0 desde caché

`npx nx build web-ssr --configuration=production` **sin `--skip-nx-cache`** puede devolver `exit 0`
en segundos leyendo de la caché de Nx (`Nx read the output from the cache instead of running the
command`). Eso **no es un build**. Toda compilación real de este informe usó
`--skip-nx-cache` y se comprobó el tiempo de compilación. El revisor independiente detectó lo
mismo. **Cualquier verificación futura debe usar `--skip-nx-cache`.**

### 13.4 Hallazgo de entorno: `LEAK_GUARD_FAIL` intermitente por un proceso ajeno

El test C25 (`leak-guard.test.ts`) compara la lista de ficheros de `%TEMP%` al arrancar y al
salir. Durante este hito apareció de forma intermitente:

```
LEAK_GUARD_FAIL fichero temporal residual: embarcarte-mc10r-recovery-...
```

**Causa identificada con evidencia, no supuesta:** otro repositorio de la misma máquina
(`C:\Users\Admin\Documents\workspace\embarcarte`) ejecuta en bucle
`scripts/check-marea-customer-recovery.mjs`, que **crea y borra directorios
`embarcarte-mc10r-recovery-*` en `%TEMP%` cada pocos segundos**. Se confirmó por línea de
comandos del proceso (`Get-CimInstance Win32_Process`), y por correlación:

| Condición de `%TEMP%` durante la ejecución | Resultado |
|---|---|
| `%TEMP%` estable | `LEAK_GUARD_OK`, exit **0** |
| `%TEMP%` mutado por el proceso ajeno | `LEAK_GUARD_FAIL`, exit **1**, **pero `tests 61 / pass 61 / fail 0`** |

**Conclusión:** no es una regresión de SNOW-01, ni un fallo del producto, ni un test perdido. Los
tests del producto pasan siempre (61/61, 70/70). Es una **debilidad de diseño del guard**: compara
un recurso compartido (`%TEMP%`) que no controla. Mitigación aplicada en esta verificación:
ejecutar con `TMP`/`TEMP` aislado (`snow01-isolated-tmp`) → `LEAK_GUARD_OK`, exit 0.

**Recomendación para el siguiente hito:** que el guard haga seguimiento sólo de los prefijos que
él mismo crea (`snow-*`) en lugar de todo `%TEMP%`, o que aísle su propio directorio temporal.

### 13.5 Estado final de regresiones (medido tras los arreglos)

| Suite | Comando exacto | Resultado |
|---|---|---|
| TypeScript app | `node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit` | exit **0** |
| Build producción (real) | `npx nx build web-ssr --configuration=production --skip-nx-cache` | exit **0**, `dist/web-ssr/server/server.mjs` + `browser/` (234 ficheros) |
| Suite repo | `node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs --test --test-isolation=none web-ssr/src/snow/tests/*.test.ts` (con `TMP` aislado) | **61/61 PASS**, exit **0**, `LEAK_GUARD_OK` |
| Suite frontend | `build-client` → `tsc -p tmp/t6-k1/tsconfig.client.json` → `build-client` → `node --test --test-isolation=none scripts/snow/tests/*.test.mjs` | **70/70 PASS**, exit **0** |
| Guard admin sin `SNOW_ADMIN_TOKEN` | `GET /api/snow/v1/config` y `/api/snow/v1/admin/reports` | **401** / **401** (fail-closed) |
| Informe editorial persistido (F1) | `GET /api/snow/v1/stations/baqueira-beret/report` | **200**, `status=no_data`, `reason=outside-season`, `updatedAt=` (vacío, honesto) |
| Fix B2 | `app.routes.server.ts` | `RenderMode.Server` presente (líneas 6 y 12) |
