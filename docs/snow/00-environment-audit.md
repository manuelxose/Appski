# FASE 0 — Auditoría de entorno

Proyecto: reconstrucción del módulo de nieve (referencia: `https://www.infonieve.es/`) dentro de la
aplicación existente `appski`.
Fecha de inspección: 2026-11-16 (Europe/Madrid).
Responsable de la inspección: Lead (inspección directa del workspace, sin ejecutar código de la app).

---

## 1. Repositorio principal

| Dato | Valor observado | Cómo se obtuvo |
|---|---|---|
| Ruta | `C:\Users\Admin\Documents\workspace\appski` | `Get-Location` |
| Git | `master` → `origin/master`, árbol limpio al inicio | `git status --short --branch` |
| HEAD inicial | `9b50360 chore: remove the old workflow tooling references` | `git log --oneline -10` |
| Cambios ajenos previos | **Ninguno** (árbol limpio) | `git status` |

Nota: dos procesos de Chrome lanzados manualmente durante la inspección quedaron bloqueados por el
sandbox de red (ver §7) y se abandonan; no afectan al repositorio.

## 2. Arquitectura frontend

- **Nx 21.5.3** monorepo, un solo `package.json` raíz (`@nieve/source`).
- **Angular 20.2** (standalone components, signals, `inject()`, control flow `@if/@for`).
- Aplicaciones: `web-ssr` (app principal, SSR con Express) y `mobile-ionic` (Capacitor/Ionic).
- Librerías Nx (`projectType: library`, solo target `lint`, **sin `test`**):
  `ads`, `analytics`, `auth`, `data-access`, `i18n`, `maps`, `seo`, `state`, `ui-design-system`.
  Todas contienen únicamente el scaffold del generador (`src/lib/<name>/<name>.ts|html|css`) — es decir,
  **son libs vacías**; nada las importa desde `web-ssr` (ver §4).
- Aliases en `tsconfig.base.json`: `@nieve/ads`, `@nieve/analytics`, `@nieve/auth`,
  `@nieve/data-access`, `@nieve/i18n`, `@nieve/maps`, `@nieve/seo`, `@nieve/state`,
  `@nieve/ui-design-system`.
- Convención de páginas: `web-ssr/src/app/pages/<page>/` con `components/`, `models/`,
  `services/`, y un `.data.service.ts` por página.

## 3. Backend

| Hecho | Evidencia |
|---|---|
| **No hay backend en el repositorio** | No existe proyecto `api`, `server` o `backend`; `server.ts` sólo sirve estáticos + SSR |
| Los servicios de datos llaman a `/api/v1/...` **con mocks activados** | `stations-list.data.service.ts`: `USE_MOCK_DATA: true`; `station-detail.data.service.ts`: `USE_MOCK_DATA = true` |
| El servicio meteo usa mocks explícitos | `meteo-data.service.ts`: `// TODO: En producción usar: ${apiUrl}/v1/meteo/...` + `assets/mocks/now.mock.json` |
| Bloques de API comentados | `home.data.service.ts`, `stations-list.data.service.ts` (`CONFIG.API_BASE_URL: environment.apiBaseUrl` comentado) |
| No existe `environment.ts` | `grep environment.` sólo devuelve comentarios |
| `server.ts` deja hueco para endpoints | `server.ts`: "Example Express Rest API endpoints can be defined here. Uncomment..." |
| Sólo 3 servicios tienen contrato HTTP real | `station-detail` (`/api/v1/stations/:slug`), `blog-list`, `planner` |
| Base URL SSR incorrecta | `getBaseUrl()` devuelve `http://localhost:4200` en servidor (el SSR corre en `:4000`) |

**Consecuencia para el diseño:** el módulo de nieve debe **crear la capa servidor** dentro de la app
SSR existente (`web-ssr/src/server.ts` → rutas `/api/snow/...`), no un backend paralelo. El patrón de
la propia app ya lo prevé ("Express Rest API endpoints can be defined here").

## 4. Sistema de diseño y componentes compartidos

- `web-ssr/src/styles.css` centraliza 230+ variables CSS (`--primary-*` azul/cyan, `--success-*`,
  `--error-*`, sombras, radios, easing `cubic-bezier(0.34, 1.56, 0.64, 1)`). Documentado en `DESIGN_SYSTEM.md`
  (inspiración Apple/Bolt: glassmorphism, gradientes, spring easing).
- Tailwind 3 con `web-ssr/tailwind.config.js`.
- Componentes reales y reutilizables en `web-ssr/src/app/components/`:
  `site-header`, `site-footer`, `station-card`, `stations-featured`, `stats-overview`,
  `features-grid`, `weather-widget`, `pricing-card`, `planner-banner`, `testimonials-carousel`,
  `lodging-carousel*`, `rental-*`, `admin-header`, `admin-sidebar`.
- **Ya existe dominio "estación"**: `pages/stations-list`, `pages/station-detail`
  (`station-hero`, `station-snow-report`, `station-lifts-slopes`), `pages/weather` (13 componentes:
  cota selector, forecast 72h, week forecast, season charts, webcams grid, webcam modal,
  radar widget, alerts panel, snow conditions…), con `models/meteo.models.ts` y 5 servicios.
  **La reconstrucción debe extender esto, no duplicarlo.**
- Panel admin existente: `pages/admin/**` con 26 módulos (`admin-stations` entre ellos) y 13
  componentes `shared/` (`admin-table`, `admin-filters`, `admin-empty-state`, `admin-badge`…).
- Guards: `guards/auth.guard.ts` (`authGuard`, `adminGuard`).
- Estado: no hay store global real; los servicios usan `signal()` locales. `state` lib está vacía.
  Autenticación: `auth` lib vacía; `pages/login` + `auth.guard` (lógica en el guard).

## 5. Routing, SSR y publicación

`web-ssr/src/app/app.routes.ts` (lazy `loadComponent`):

```
""                       home
estaciones               stations-list
estacion/:slug           station-detail
alojamientos[/:station]  lodging-marketplace
alojamiento/:id          lodging-detail
alquiler-material        rental-marketplace
tienda/dashboard | :slug shop
plan                     planner
meteorologia | :lang/estacion/:slug/tiempo | estacion/:slug/tiempo   weather
premium, blog, blog/:slug, login
cuenta                   (authGuard)
admin/**                 (adminGuard) + 26 hijos
```

- **Sin comodín `**`** → las URLs inexistentes no renderizan una página de error propia.
- `app.routes.server.ts`: `{ path: "**", renderMode: RenderMode.Server }` (todo Server, nada prerender).
- Build: `@angular/build:application`, `outputMode: "server"`, presupuesto inicial 500 kB warn / 1 MB error,
  `anyComponentStyle` 12 kB warn / 24 kB error (ampliado en `c32bc66`).
- Despliegue: `.github/workflows/ci.yml` (lint, format, build) y `bitbucket-pipelines.yml`.
  **No hay target de deploy ni configuración de producción en el repo.**

## 6. REA

- Servidor MCP `rea-agents` **6.8.0** conectado (skill `reverse-engineer-anything` v49).
- Proveedores útiles: `rea-playwright-browser-scenario` (captura web), `inspect_web_page`,
  `analyze_javascript_application`, `inspect_web_network_capture`.
- No disponibles en este host: Ghidra (`GHIDRA_INSTALL_DIR` sin definir), Hopper/macOS, JADX, adb…
  **Irrelevante** para un objetivo web.
- Navegador de investigación: **Chrome 157** en
  `C:\Program Files\Google\Chrome\Application\chrome.exe`; REA lo lanza headless con perfil temporal propio.

## 7. Herramientas y servicios disponibles

| Herramienta | Estado | Nota |
|---|---|---|
| Node | v24.18.0 (sistema) / v24.22.2 (runtime DSH) | CI usa Node 20 |
| npm | 12.0.1, registro accesible | `npm ci` completado (1525 paquetes) |
| Nx | 21.5.3 | `nx lint --all`, `nx build` |
| TypeScript | ~5.9.2 | `tsc --noEmit` por tsconfig |
| Tests | **Sin runner unitario configurado**; 8 `.spec.ts` existentes (sin target `test`) | `ci.yml`: "(No test target configured yet)" |
| E2E | **Ninguno** (sin Playwright/Cypress) | Requiere añadirse |
| Python | 3.13 + libs (Pillow, pandas…) | Para utilidades de medición/extensión `extract-capture.mjs` no hace falta |
| Puertos locales | **Bloqueados** por el sandbox (`127.0.0.1:9333/9334` → "denegó expresamente la conexión") | Impide CDP manual y **probablemente un dev-server en loopback**; a validar con `nx serve` |

## 8. Módulos meteorológicos/geográficos existentes

Sí existen, y hay que reutilizarlos/reemplazarlos con datos reales:

- `pages/weather/**:` modelo `MeteoNow`, `MeteoForecast`, `WebcamItem`, `RadarInfo`, `WebcamHistory`;
  servicios `meteo-data`, `meteo-mapper`, `snow-data`, `stations`, `alerts`, `meteo-state.store`;
  componentes de gráficas (`ngx-echarts` + `apexcharts` instalados), cota de nieve, leyenda, radar.
- Mapas: `leaflet` 1.9.4 + `@types/leaflet` instalados y `leaflet.css` en los styles del build; la lib
  `maps` está vacía → **capacidad declarada pero no implementada**.
- Datos en `web-ssr/src/assets/mocks/` y `pages/*/mocks/*.json` (sintéticos).

## 9. Configuración del navegador de investigación

`capture_browser_scenario` con `browser.mode=launch`, `headless=true`, viewport explícito
(1440×960 / 430×932 / 1440×1100), `locale=es-ES`, `timezone=Europe/Madrid`, `reduced_motion=reduce`,
service workers bloqueados. Artefactos (`screenshot`, `dom`, `accessibility`) extraídos a
`docs/snow/captures/` con `scripts/snow/extract-capture.mjs` (conserva SHA-256 del Evidence).

## 10. Riesgos y restricciones detectadas

1. **Puertos loopback bloqueados** → verificar `nx serve` (puerto 4200) antes de planificar E2E;
   si también falla, el E2E deberá ejecutarse contra el bundle SSR servido por otro medio o quedar
   como BLOCKED documentado.
2. **Sin backend ni base de datos**: la capa servidor del módulo nieve hay que crearla aquí; no existe
   "la base de datos existente" que el encargo asume.
3. **Sin runner de tests**: hay que añadir uno (mínimo, coherente con Nx) para poder aportar pruebas.
4. **CI en Node 20** mientras el entorno local usa Node 24: fijar scripts compatibles.
5. Los servicios `web-ssr` existentes están en modo mock: **cualquier pantalla nueva debe declarar su
   fuente y no mezclarse con los mocks existentes**.

## 11. Decisiones de alcance derivadas (para FASE 4)

- Crear la capa de integración como **rutas Express dentro de `web-ssr/src/server.ts`**
  (`/api/snow/**`), con un módulo `snow/*` por dominio tal como pide el encargo.
- Extender `station-detail` / `stations-list` / `weather` (no duplicar) mediante un subárbol de rutas
  `nieve/*` nuevo que reuse `site-header`, `site-footer` y las variables de `styles.css`.
- Añadir un target de test mínimo y E2E donde el entorno lo permita.
