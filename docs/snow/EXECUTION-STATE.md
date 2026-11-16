# EXECUTION-STATE — SNOW-01 (runtime recovery)

**Última actualización:** 2026-11-16 · **Rama:** `feat/snow-01-runtime-recovery`
**Estado:** PASS con limitaciones declaradas · **Merge a `master`: NO AUTORIZADO**

---

## 1. Identidad del árbol

| Dato | Valor |
|---|---|
| Commit base | `9b503604f802abc4c373fee8b7ba36181e31e0df` (HEAD de `master` al empezar) |
| Rama actual | `feat/snow-01-runtime-recovery` |
| HEAD de la rama | `9b503604f802abc4c373fee8b7ba36181e31e0df` — **sin commits propios** |
| Commits creados en el hito | **0** |
| Cambios no commitados | 8 modificados (`git diff --stat` = 83 insertions / 16 deletions) + untracked `docs/`, `scripts/`, `web-ssr/src/snow/`, `web-ssr/src/app/snow/`, `web-ssr/public/assets/i18n/` |

Ficheros modificados (sin commit):

```
tsconfig.base.json
web-ssr/src/app/app.routes.server.ts
web-ssr/src/app/app.routes.ts
web-ssr/src/app/pages/station-detail/services/station-detail.data.service.ts
web-ssr/src/app/pages/stations-list/services/stations-list.data.service.ts
web-ssr/src/app/pages/weather/services/meteo-data.service.ts
web-ssr/src/app/pages/weather/services/snow-data.service.ts
web-ssr/src/server.ts
```

---

## 2. Funciones DEMOSTRADAS (con ejecución real)

| Función | Evidencia | Estado |
|---|---|---|
| Build Angular SSR de producción | `npx nx build web-ssr --configuration=production` → **exit 0**; `--skip-nx-cache` → **exit 0** (revisor); `dist/web-ssr/server/server.mjs` existe, `browser/` con 234 ficheros | DEMOSTRADO |
| Type-check de aplicación | `tsc -p web-ssr/tsconfig.app.json --noEmit` → **exit 0** | DEMOSTRADO |
| Arranque del servidor Express SSR | `PORT=4010 node dist/web-ssr/server/server.mjs` → "Node Express server listening on http://localhost:4010"; repetido en :4011 por el revisor | DEMOSTRADO |
| Renderizado SSR de `/`, `/nieve`, `/nieve/estaciones`, `/nieve/estaciones/baqueira-beret` | 200 + `<h1>` correcto por HTTP directo; SSR confirmado con JS deshabilitado (`ng-server-context="ssr"`, `ng-version="20.2.4"`, 805 chars en `/nieve/estaciones`) | DEMOSTRADO |
| Hidratación en Chrome real (desktop 1440×900 y móvil 390×844) | 8 capturas + `qa-results.json`; 11–16 JS + 1 CSS por página, todos 200, cero 404 de JS/CSS | DEMOSTRADO |
| Navegación por clic dentro del módulo | `qa-clicks.json`: `/nieve` → directorio → detalle → volver, 0 document requests, 0 errores de consola | DEMOSTRADO |
| Bootstrap del seed editorial | `bootstrapStore()` en `file-io.ts` invocado por `createSnowRouter()`; tests B1–B5; `/api/snow/v1/stations` → 200 con 3 estaciones | DEMOSTRADO |
| Honestidad de datos (sin cifras inventadas) | Directorio: 3/3 "SIN DATOS"; detalle: "Temporada cerrada — sin parte publicado"; dashboard 3 catálogo / 0 con parte / 3 sin dato | DEMOSTRADO |
| Guard admin fail-closed | Sin `SNOW_ADMIN_TOKEN`: `/api/snow/v1/config` → 401, `/api/snow/v1/admin/reports` → 401; rutas públicas 200 | DEMOSTRADO |
| No regresión repo | 61/61 PASS exit 0 (56 baseline + 5 nuevos B1–B5) | DEMOSTRADO |
| No regresión frontend | 70/70 PASS exit 0 (build-client → tsc → build-client → node --test) | DEMOSTRADO |
| Correcciones preservadas | `app.routes.server.ts:12` `RenderMode.Server`; `editorial.test.ts` C24a/C24a2/C24b–f pasan | DEMOSTRADO |

---

## 3. Funciones PENDIENTES (no demostradas en este hito)

| Pendiente | Motivo | Estado |
|---|---|---|
| Enlace desde la portada `/` al módulo `/nieve` | `qa-nav.json`: 40 anchors en `/`, **0** hacia `/nieve` | PENDIENTE (fuera de alcance SNOW-01) |
| Partes de nieve reales (espesores, pistas, remontes) | Pretemporada; `snow-reports.json` y `osm-derived.json` vacíos a propósito | PENDIENTE (dato de dominio, no de runtime) |
| Providers externos en vivo (cadena de fallback real, rate-limit real, circuit-breaker real) | Sin llamadas a proveedores externos; solo tests unitarios | UNVERIFIED en vivo |
| Navegador real en `/nieve/comparar`, `/nieve/webcams`, `/nieve/mapa` | No se recorrieron en Chrome en este hito | UNVERIFIED en navegador (compilan en build) |
| Imágenes de estaciones de la portada (4 × 404) | `/assets/images/stations/{sierra-nevada,baqueira,formigal,cerler}.jpg` ausentes; deuda previa del shell legacy | PENDIENTE |
| Budget CSS `admin-analytics-stations` y bailout CommonJS de `leaflet` | Warnings del build | PENDIENTE (no bloqueante) |
| Aislamiento de seguridad (lectura / secretos / red) | No medido | SECURITY PARTIAL (no realizado) |
| Commit del trabajo | Todo en árbol de trabajo | PENDIENTE |

---

## 4. Dependencias del siguiente hito

1. **Commit de entrada:** el siguiente hito debe partir de un commit en
   `feat/snow-01-runtime-recovery` que capture los 8 modificados + untracked; hoy no existe.
   Sin commit no hay identidad de contenido para una revisión content-bound.
2. **Datos reales de operador:** para poblar `snow-reports.json` hacen falta fuentes de
   operador autorizadas (`authorizations.ts`). Sin ellas, la UI debe seguir diciendo "SIN DATOS".
3. **Enlace portada → `/nieve`:** depende de una decisión de producto sobre el shell legacy
   (`/` y `/estaciones` se mantienen sin cambios por decisión del capitán, ver comentario en
   `app.routes.ts:320-323`).
4. **Providers externos:** requieren red y credenciales por nombre de variable de entorno
   (`SNOW_ADMIN_TOKEN` y las que declare el registro de providers); nunca valores en claro.
5. **Puerto 4000:** está ocupado por un proceso `node` previo (PID 40940) en este host; el
   siguiente hito debe elegir puerto explícito o liberar el proceso.

---

## 5. Evidencias verificables

| Evidencia | Ubicación | Comprobación |
|---|---|---|
| Informe completo del hito | `docs/snow/SNOW-01-RUNTIME-REPORT.md` | lectura directa |
| Capturas desktop + móvil | `docs/snow/captures-snow01/snow01-*.png` (8 ficheros) | existen, tamaños en el informe §7 |
| Captura del revisor | `docs/snow/captures-snow01/reviewer-nieve-estaciones.png` (47.598 B) | existe |
| Consola / red / DOM por ruta y vista | `docs/snow/captures-snow01/qa-results.json` | JSON válido con `desktop`/`mobile` |
| SSR sin JS, deep link, anchors de la portada | `docs/snow/captures-snow01/qa-nav.json` | 40 anchors, 0 `/nieve` |
| Navegación por clic | `docs/snow/captures-snow01/qa-clicks.json` | 3 clics + history.back, 0 errores |
| Drivers reproducibles | `run-browser-qa.mjs`, `run-ssr-nav.mjs`, `run-clicks.mjs`, `summarize.mjs` | reejecutables contra :4010 y CDP :9222 |
| Artefactos de build | `dist/web-ssr/server/server.mjs`, `dist/web-ssr/browser/` | 325 ficheros totales en `dist/web-ssr` |
| Tests de bootstrap | `web-ssr/src/snow/tests/bootstrap.test.ts` (B1–B5) | 5 tests |
| Bootstrap del seed | `web-ssr/src/snow/store/json-store/file-io.ts` (`bootstrapStore`) + `web-ssr/src/snow/server/index.ts:23` | lectura directa |
| Fixes del build | `snow-compare.component.ts:57` (`?? ''`), `skeleton.component.ts:21` (`label()`) | lectura directa |
| Render mode | `web-ssr/src/app/app.routes.server.ts:12` (`RenderMode.Server`) | lectura directa |
| **Capturas post-fix (posteriores a la revisión)** | `docs/snow/captures-snow01/snow01-postfix-detalle-{desktop,mobile}.png` | `labelEnganosa=false`, estados honestos presentes |
| **Script de captura post-fix** | `scripts/snow-01-postfix-capture.mjs` | reejecutable: `node scripts/snow-01-postfix-capture.mjs <baseUrl>` |
| **Arreglo de integridad de datos** | `station-state.component.ts` y `snow-station-detail.component.ts` | `updatedAt ?? observedAt` → `updatedAt ?? null` (ver informe §13.2) |

### 5.1 Nota sobre la re-ejecución (medido tras la revisión)

- El build **debe** ejecutarse con `--skip-nx-cache`; sin esa bandera Nx puede devolver `exit 0`
  desde caché sin compilar (informe §13.3).
- La suite del repo debe ejecutarse con `TMP`/`TEMP` **aislado** si en la máquina corre otro
  proceso que escribe en `%TEMP%`: en este host, un proceso ajeno
  (`workspace/embarcarte`, `check-marea-customer-recovery.mjs`) crea directorios temporales cada
  pocos segundos y hace que `leak-guard` falle **sin que falle ningún test** (informe §13.4).
  Con `%TEMP%` aislado: `LEAK_GUARD_OK`, 61/61, exit 0.

---

## 6. Estado de aprobación del merge

**MERGE A `master`: NO AUTORIZADO.**

- No hay merge, fast-forward, tag ni push realizados por este hito.
- La rama `feat/snow-01-runtime-recovery` contiene los commits del hito; `master` permanece en
  `9b503604f802abc4c373fee8b7ba36181e31e0df`.
- La revisión independiente (t4) emitió **PASS** sobre lo que verificó, pero un PASS de
  revisión **no** es autorización de merge (política ENGINE-01 §4 y ENGINE-02 §6).
- El merge a `master` requiere **autorización explícita del usuario**.

### Condiciones que el usuario debería ver antes de autorizar

1. ~~Commit del trabajo en la rama con identidad de contenido.~~ **Hecho**: ver §1/§7.
2. ~~Re-ejecución del build sin caché y de las dos suites desde ese commit.~~ **Hecho**: ver §5.1
   y el informe §13.5 (build exit 0, 61/61, 70/70).
3. Decisión sobre las 4 imágenes 404 de la portada y sobre el enlace portada → `/nieve`.
4. Decisión sobre los warnings de budget CSS y de `leaflet`.

---

## 7. Cambios realizados por el coordinador DESPUÉS de la revisión independiente

La revisión (t4) cerró con PASS. Posteriormente el coordinador verificó por su cuenta y encontró
un defecto **no reportado por ningún agente**, que ya está corregido:

| Fichero | Cambio | Motivo |
|---|---|---|
| `web-ssr/src/app/snow/client/ui/station-state.component.ts` | `updatedAt ?? observedAt` → `updatedAt ?? null` | «Último parte conocido» aparecía en estaciones **sin parte** |
| `web-ssr/src/app/snow/pages/station/snow-station-detail.component.ts` | `updatedAt ?? observedAt` → `updatedAt ?? null` | «Última actualización» era el instante de la petición |

Verificación del arreglo: `tsc` exit 0 · build `--skip-nx-cache` exit 0 · SSR sin las frases
engañosas (`False`/`False`) y con los estados honestos (`Sin datos`/`Temporada cerrada`
presentes) · 61/61 y 70/70 · capturas post-fix en navegador real.

> Consecuencia: las capturas de §5 tomadas **antes** de este arreglo muestran la etiqueta
> engañosa. Las capturas `snow01-postfix-*.png` son las que representan el estado actual del
> código.
