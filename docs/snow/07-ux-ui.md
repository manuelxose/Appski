# FASE 7 — Sistema visual y especificación UX/UI (pantallas A–G)

Tarea `t6` · Autor: `frontend-impl` · Fecha: **2026-11-16** · Estado: **especificación, sin
implementación** (la implementación es `t8`).

Documentos de los que depende (no se reabren aquí, se citan):

| Doc | Qué aporta a este documento |
|---|---|
| [`00b-environment-corrections.md`](./00b-environment-corrections.md) | **VINCULANTE**: `nx build`/`nx serve` están roto aquí (plugin worker de Nx). No hay bundle → **no hay captura propia, ni medición de Core Web Vitals, ni E2E en navegador**. El gate es `tsc -p web-ssr/tsconfig.app.json --noEmit`. |
| [`01-reference-inventory.md`](./01-reference-inventory.md) | 18 anatomías de pantalla observadas con Evidence ID y **14 defectos** (D1–D14) que hay que superar uno a uno. |
| [`02-feature-matrix.md`](./02-feature-matrix.md) | Capacidades F01–F24, contrato `SnowReportDto`/`ProvenanceDto` del borde HTTP y estados de respuesta. |
| [`05-provider-registry.md`](./05-provider-registry.md) §3–§5, §7 | Qué dato es legal mostrar, texto de atribución exacto y "qué NO se puede mostrar". |
| [`05b-provider-contracts.md`](./05b-provider-contracts.md) §1, §3.2, §7 | `ProviderResult` discriminado, `Provenance`, `NoDataReason` y los **5 textos canónicos de "sin dato"**. |
| `DESIGN_SYSTEM.md` + `web-ssr/src/styles.css` | **El sistema visual que se extiende**, no se sustituye: 164 variables en `:root`, rampas `--primary-*`, `--neutral-*`, `--success-*`, `--warning-*`, `--error-*`, `--info-*`; radios, sombras, `--transition-spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1)`; Tailwind 3.4 (`web-ssr/tailwind.config.js`, `theme.extend` vacío). |

**Cómo se verifica este documento (y no de palabra):**

```text
node scripts/snow/ux/check-a11y-contrast.mjs --report   # ratios WCAG calculados + viewport + glifos
node scripts/snow/ux/extract-ux-tokens.mjs              # tokens del doc == tokens de styles.css
```

Ambos son ejecutables y se ejecutaron; los resultados reales están en §12. Ninguna afirmación de
contraste de este documento es una aserción sin número: todas salen de la herramienta.

---

## 0. Reglas de lectura

| Etiqueta | Significado |
|---|---|
| **OBSERVADO** | Visto en una captura de `docs/snow/captures/` con Evidence ID de `03-rea-evidence.md`. |
| **NO OBSERVADO** | El estado es real en el dominio pero la captura del 2026-11-16 (pretemporada) no lo contenía. Se diseña desde las **reglas de dominio** de 02, y así se marca. |
| **DISEÑO PROPIO** | Decisión nuestra que la referencia no tiene (procedencia por dato, frescura, estados de licencia). |
| **PROHIBIDO** | No se puede implementar así por licencia (05) o por accesibilidad (WCAG 2.2 AA). |

**Regla de oro del documento:** todo dato que se pinte en pantalla llega en forma de
`ProviderResult<T>` (05b §1). La UI **nunca** recibe un `number` suelto de nieve: recibe o un valor
con `Provenance`, o una ausencia con `NoDataReason`. Esto es lo que impide "inventar" telemetría que
no tenemos derecho a mostrar.

---

## 1. Limitación de este documento, dicha antes que nada

1. **No hay captura propia.** `nx serve` no arranca en este sandbox (00b C1). Este documento
   especifica layouts con medidas, jerarquía, estados y microcopy; **no** puede mostrar "así se ve".
   Cualquier maqueta visual posterior necesita un entorno con Nx operativo, y así debe declararse.
2. **Nada de esto está medido en navegador.** No hay Core Web Vitals, ni LCP/CLS/INP, ni prueba real
   de ampliación al 200 %. Lo que sí hay es: contraste **calculado** con la fórmula WCAG, el viewport
   **verificado por script**, y el modelo de foco/teclado especificado para que t8 lo implemente y t9
   pueda comprobarlo con teclado real y `prefers-reduced-motion`.
3. **El estado poblado está NO OBSERVADO** (00b C6, 01 §4): el 16/11/2026 todo leía "Cerrada" y ambos
   rankings devolvían su estado vacío. Por eso las pantallas de §9.2 (B) y §9.4 (D) se diseñan desde
   reglas de dominio (02 §1) y **cada bloque poblado va marcado `NO OBSERVADO`** (B §9.2, C §9.3, G §9.7).
4. **Cero datos reales hoy**: 0 proveedores con credencial (05b §9). El producto arranca en
   `not_configured` → `no_data` → "Sin datos disponibles". El diseño **demuestra la degradación**, no
   espera a las claves.

---

## 2. Objetivo de diseño: 14 defectos de la referencia, 14 respuestas verificables

`01-reference-inventory.md` §9 enumera D1–D14. Este es el contrato de "superarlo" —cada fila dice
**dónde** se resuelve y **cómo se comprueba**. Si t8 no puede responder la columna "Comprobación",
el defecto sigue vivo.

| # | Defecto de la referencia | Respuesta en nuestro producto | Dónde | Comprobación |
|---|---|---|---|---|
| D1 | atributos de viewport que bloquean el zoom (SC 1.4.4) | `<meta name="viewport" content="width=device-width, initial-scale=1">` **sin** ninguna restricción de escala. | §5.1 | §6.1 | `check-a11y-contrast.mjs` falla si algún viewport del documento restringe el zoom; t9: grep en `index.html`/`server.ts` |
| D2 | Portada sin `<h1>` | Un `<h1>` por pantalla, jerarquía `h1→h2→h3` sin saltos dentro de `main`. | §9.1 | t9: 1 `h1` por ruta, orden de encabezados |
| D3 | `Keywords`, `Robots` en mayúsculas | Solo metadatos modernos: `description`, `canonical`, `og:*`, `twitter:*`; **nunca** `keywords`; `robots` vía `Meta` de Angular. | §11 | t9: inspección de `<head>` SSR |
| D4 | Sin JSON-LD | JSON-LD `Dataset` + `SportsActivityLocation` + `BreadcrumbList` por pantalla. | §11 | t9: validador de JSON-LD |
| D5 | Sin canonical fuera del detalle | `canonical` **en todas** las rutas indexables, **incluida la exploradora con filtros** (canonical a la URL limpia, la variante filtrada va `noindex, follow` si supera 3 filtros). | §11 | t9: matriz ruta→canonical |
| D6 | 404 → redirección silenciosa al directorio (`ev_08d6149b`) | 404 real: `**` en `app.routes.ts`, `RenderMode.Server`, estado `404`, mensaje, buscador y 3 estaciones sugeridas. | §9.1 nota + §11 | t9: `/estacion-no-existe` → HTTP 404 + contenido |
| D7 | Rankings con tabla vacía | Estado vacío con **motivo** (`NoDataReason`), "última vez con datos" y CTA; nunca una tabla con cabecera y cero filas. | §7.2, §9.1 | revisión de template + `@empty` bloque en la tabla |
| D8 | Sin API; widget de pago | `/api/snow/v1/**` propio (02 §3.2), el frontend solo consume ese borde. | §4.3 | revisión de imports |
| D9 | Webcams de terceros embebidas | **Cero** `img src`/iframe/proxy: solo `ImageGrant.linkUrl` con atribución del titular. | §9.4 | t9: grep `img`/`iframe` en `snow/client/webcam*` |
| D10 | Tiles `tile.openstreetmap.org` | PMTiles autohospedado (Protomaps), atribución ODbL; **sin `PROTOMAPS_BASE_URL` el mapa se declara no disponible**, no se cae la página. | §9.6 | t9: sin referencias a `tile.openstreetmap.org` en el código |
| D11 | Sin filtros ni orden | Exploradora con filtros y orden **en la URL** (`?pais=&sistema=&estado=&orden=`), SSR y compartible; layout de mapa sincronizado con la query. | §9.2 | t9: deep-link restaura el mismo estado |
| D12 | Tablas hechas con `div` | Tablas semánticas `<table>` con `<caption>`, `scope="col"` y `aria-sort`; en móvil se convierten en **tarjetas** (mismo dato), no en `div`-tabla. | §6.3 | t9: auditoría de tabla |
| D13 | Sin `prefers-reduced-motion` | El `styles.css` ya redujo `animation/transition` a 0.01 ms; **además** el JS respeta la media query (los gráficos ECharts no animan, el auto-refresco se pausa). | §6.5 | t9: `matchMedia('(prefers-reduced-motion: reduce)')` en el store de UI |
| D14 | Color de estado incrustado en `style` | Tokens `--ux-state-*` + **glifo + texto**; y `style="…"` con color **prohibido**. | §5.3 | `check-a11y-contrast.mjs` verifica los glifos; t9: grep `style="background` |

Cada defecto citado arriba proviene de 01 §9 con la captura correspondiente; no se ha inventado
ninguno. Los únicos defectos **propios del repo** (no de la referencia) están en §10.4 y son igual de
vinculantes.

---

## 3. Principios (cortos y ejecutables)

1. **El dato honesto gana al dato bonito.** Una tarjeta con "—" ganada es mejor que una tarjeta con
   "0 cm" inventado. Los `null` se pintan como ausencia explícita, nunca como cero.
2. **La procedencia viaja con el dato.** Cada valor de nieve/estado lleva su etiqueta
   (`Parte de estación · fuente: Aramón` / `© AEMET` / `Sin datos disponibles`) y su frescura.
   La referencia no expone procedencia en **ninguna** pantalla (01 §5); nosotros, siempre.
3. **Un solo lenguaje visual.** Se **extiende** `styles.css`: se añaden ~50 tokens semánticos `--ux-*`
   y **no** se re-tiñe el sistema. Sin segundo design system, sin librería de componentes nueva.
4. **Lo que no se ve tiene que existir para quien no ve.** Color nunca solo (SC 1.4.1): glifo +
   texto. Tabla de verdad como `<table>`. Foco visible y predecible.
5. **El vacío es un contenido, no un error.** Pretemporada, fuente caída, sin credencial o licencia
   que lo prohíbe son **cuatro estados distintos** y se explican por separado (§7).
6. **Reglas del sistema que se respetan** (verificadas en los componentes reales del repo): variables
   CSS en lugar de hex sueltos (`DESIGN_SYSTEM.md` §Anti-Patrones), `ChangeDetectionStrategy.OnPush`,
   API de signals (`input()`/`output()`/`signal()`), componentes `standalone`, `track` obligatorio en
   cada `@for` (Angular 17+ lo exige) y sin `NgZone` manual.

---

## 4. Inventario de lo que se reutiliza (y de lo que no)

### 4.1 Reutilización directa (sin cambios de API)

Verificado leyendo los componentes en disco el 2026-11-16:

| Componente | Ruta | Uso en A–G | Nota |
|---|---|---|---|
| `site-header` / `site-footer` | `web-ssr/src/app/components/` | A–G | Cabecera con buscador y `isPlatformBrowser` ya correcto. |
| `station-card` | `web-ssr/src/app/components/station-card/` | A, B | Recibe `Station` de `stations-list.models` (**contrato mock**, ver §10.2). |
| `weather-widget` | `web-ssr/src/app/components/weather-widget/` | A | Igual: contrato mock. |
| `stats-overview` | `web-ssr/src/app/components/stats-overview/` | A | Idem. |
| `TiempoCotaSelectorComponent` | `pages/weather/components/tiempo-cota-selector/` | E | Selector base/mid/top ya implementado. |
| `TiempoNowPanelComponent`, `TiempoSnowSummaryComponent` | `pages/weather/components/` | E | ⚠️ `{{ data()!.snowNew24hCm ?? 0 }}` **viola D3 anti-sentinel** (§10.4-D2). |
| `Forecast72hTableComponent`, `week-forecast-charts`, `detailed-forecast-table` | `pages/weather/components/` | E | Tablas de previsión existentes. |
| `TiempoRadarWidgetComponent` | `pages/weather/components/` | E | Requiere URL de radar con licencia (§10.3). |
| `AlertsPanelComponent` | `pages/weather/components/alerts-panel/` | E | Mapea a `WeatherAlertBundle`. |
| `SeasonChartsPanelComponent` | `pages/weather/components/season-charts-panel/` | E | ECharts cargado con `import('echarts')` dinámico **fuera del SSR**: patrón correcto, se copia. |
| `TiempoWebcamsGridComponent`, `webcam-timeline` | `pages/weather/components/` | D | ⚠️ pintan `snapshotUrl` (imagen). **No se puede**: §9.4. |
| `TiempoSkeletonComponent`, `TiempoErrorStateComponent` | `pages/weather/components/` | A–G | Base de los estados de §7. |
| `StationSnowReportComponent`, `StationLiftsSlopesComponent`, `StationHeroComponent` | `pages/station-detail/components/` | C | Reutilizables **solo tras** reescribir su input a `ReportPayload` (§10.2). |
| `admin-*` (14 shared) | `pages/admin/components/shared/` | (modo admin) | `admin-empty-state`, `admin-table`, `admin-badge` sirven de patrón; no se usan en público. |

### 4.2 Lo que **no** se reutiliza tal cual (y por qué)

- **Los modelos `*.models.ts` de `stations-list`, `station-detail`, `home`**: son contratos de mock con
  campos que el proveedor no aporta (`price.adult`, `heroImage`, `review.rating`). Reutilizar la
  pantalla sobre esos tipos obligaría a inventar datos. Decisión: **nuevo modelo de vista** en
  `snow/models` (02 §3.1) y adaptadores de presentación, sin tocar los modelos viejos (que siguen
  sirviendo al resto del sitio).
- **`leaflet`** sí se reutiliza (está en `package.json` 1.9.4 y su CSS ya está en el build), pero
  **en carga diferida** y con `L.tileLayer` apuntando a **PMTiles/Protomaps**, nunca a OSM público.
- **ECharts vs ApexCharts**: ambos están instalados. Se elige **ECharts** (ya usado con `import()`
  dinámico en `season-charts-panel`, y con `echarts.init` en `isPlatformBrowser`). ApexCharts queda
  sin uso nuevo. Motivo: una sola librería por superficie y un patrón SSR ya probado en el repo.
- **iconos**: el `index.html` carga *Material Icons* desde Google Fonts (render-blocking, tercero).
  **PROHIBIDO añadir más iconos por fuente**; los glifos del sistema de estados son caracteres
  Unicode (▲ ▼ ? ◔ ⊘) con `aria-hidden="true"` y texto visible al lado (§5.3).

**Corrección de un dato heredado (00 §2).** El informe de entorno dice «230+ variables CSS».
Contado en el fichero el 2026-11-16: **164 declaraciones, 147 nombres únicos** en `styles.css` (más la
redefinición de `--neutral-*` dentro del bloque de modo oscuro). Se documenta la cifra real porque este
documento se apoya en ella; el "230+" es optimista, no falso en intención.

### 4.3 Frontera de datos del frontend

```text
Angular (SSR/browser)  ──HTTP──►  GET /api/snow/v1/stations/:slug/report      → SnowReportDto
                                 GET /api/snow/v1/stations                   → StationListDto (filtrable)
                                 GET /api/snow/v1/stations/:slug/forecast     → ForecastDto
                                 GET /api/snow/v1/stations/:slug/avalanche    → AvalancheDto
                                 GET /api/snow/v1/rankings/:kind             → RankingDto
                                 GET /api/snow/v1/compare?slugs=a,b,c        → CompareDto
```

Reglas: el cliente **no** importa `snow/providers/contracts.ts` (constantes de caché server-side, 02
§3.1); consume el DTO del borde, que es subconjunto estable con `ProvenanceDto`. Toda respuesta
`200` puede venir con `status: 'no_data' | 'not_configured' | 'blocked'` y **eso es un dato, no un
error** (02 §3.2): la matriz de §7.7 mapea cada `status` a un estado de UI, y solo `error`/`4xx`/`5xx`
caen en `ErrorState`.

---

## 5. Sistema visual (delta, no sustituto)

### 5.1 Tokens: qué se añade, qué se hereda y dos hallazgos incómodos

**Hallazgo 1 — el anillo de foco del sistema no cumple.** `styles.css` define
`--focus-ring: 0 0 0 3px var(--primary-200)` y `--primary-200` es `#bae6fd`, que sobre blanco da
**1.33:1** (medido con la herramienta, §12). Un foco así es invisible para quien no ve el elemento
activo. Se **sustituye su uso** en las pantallas snow por `--ux-focus` (`#0369a1`, 5.93:1 sobre
superficie). No se edita el token del sistema (otras pantallas lo usan); se declara la regla: **en
snow/\* no se usa `--focus-ring`**.

**Hallazgo 2 — el degradado primario no aguanta texto blanco.** `--gradient-primary` va de
`--primary-600` (`#0284c7`, blanco = **4.10:1**) a `--primary-400` (`#38bdf8`, blanco = **2.14:1**).
Para texto blanco se necesita `--primary-700` (**5.93:1**). Regla: el botón primario de snow es
**relleno sólido `--primary-700`**; el degradado del sistema se reserva para superficies decorativas
sin texto encima.

Tokens nuevos (todos `--ux-*`, ninguno re-tiñe el sistema), en **una sola tabla** que es el contrato
de tokens para t8. `extract-ux-tokens.mjs` verifica cuatro cosas: (a) cada token `--ux-*` de la tabla
está en la lista blanca del verificador y viceversa —nada prometido sin entregar—; (b) todo token del
sistema citado como alias existe en `styles.css` **con ese mismo valor en el `:root` claro** (si
`--primary-700` cambiara en el sistema, el alias miente y la herramienta falla); (c) ningún `--ux-*`
choca con un token existente; (d) la tabla y la lista blanca coinciden en los dos sentidos (nada
prometido sin entregar, nada entregado sin declarar).

### 5.2 Superficies, texto, estado, procedencia y modo oscuro

`styles.css` invierte **solo** `--neutral-*` bajo `@media (prefers-color-scheme: dark)`; las rampas
`--primary-*`, `--success-*`, `--error-*` y `--warning-*` **no** se invierten. Por eso el modo oscuro
no re-tiñe nada: redefine **solo roles semánticos** (`--ux-dark-*`) sobre las rampas ya invertidas del
sistema, y `--ux-dark-link` usa `--primary-400` porque `--primary-700` sobre negro daría 2.55:1.

<!-- ux-tokens:begin -->
| Token nuevo | Valor | Alias (`styles.css`) | Rol |
|---|---|---|---|
| `--ux-bg` | `#fafafa` | `--neutral-50` | Fondo de página |
| `--ux-surface` | `#ffffff` | — (blanco literal) | Superficie de tarjeta |
| `--ux-surface-alt` | `#f5f5f5` | `--neutral-100` | Cabecera de tabla, fila alterna |
| `--ux-surface-sunken` | `#f5f5f5` | `--neutral-100` | Hueco de esqueleto, bloque de ausencia |
| `--ux-text` | `#404040` | `--neutral-700` | Texto principal (10.37:1 sobre blanco; no usamos `--neutral-900` para dejar aire al fondo) |
| `--ux-text-muted` | `#525252` | `--neutral-600` | Texto secundario y microcopy (7.81:1 sobre blanco; 14 px ≤ tamaño normal) |
| `--ux-border` | `#e5e5e5` | `--neutral-200` | Borde **decorativo** (§6.4: no transmite información) |
| `--ux-border-strong` | `#0369a1` | `--primary-700` | Borde que **sí** informa (3:1 exigido y cumplido) |
| `--ux-link` | `#0369a1` | `--primary-700` | Enlace en línea (5.93:1) |
| `--ux-focus` | `#0369a1` | `--primary-700` | Anillo de foco (5.93:1 sobre superficie, 5.68:1 sobre página) |
| `--ux-focus-on-primary` | `#ffffff` | — | Outline interior sobre botón primario (primary-700 sobre sí mismo = 1:1) |
| `--ux-on-primary` | `#ffffff` | — | Texto sobre relleno `--primary-700` |
| `--ux-state-open-bg` | `#15803d` | `--success-700` | Insignia «Abierta» |
| `--ux-state-closed-bg` | `#b45309` | `--warning-700` | Insignia «Cerrada» |
| `--ux-state-unknown-bg` | `#f5f5f5` | `--neutral-100` | Insignia «Sin datos» |
| `--ux-provenance-editorial-bg` | `#f5f5f5` | `--neutral-100` | Etiqueta de procedencia editorial |
| `--ux-provenance-official-bg` | `#f0f9ff` | `--primary-50` | Etiqueta de procedencia oficial |
| `--ux-provenance-official-fg` | `#0369a1` | `--primary-700` | Texto de la etiqueta oficial |
| `--ux-stale-bg` | `#fffbeb` | `--warning-50` | Aviso de dato desfasado |
| `--ux-stale-fg` | `#b45309` | `--warning-700` | Texto del aviso de desfase |
| `--ux-nodata-bg` | `#f5f5f5` | `--neutral-100` | Bloque de ausencia |
| `--ux-error-bg` | `#fef2f2` | `--error-50` | Error recuperable |
| `--ux-error-fg` | `#b91c1c` | `--error-700` | Texto del error |
| `--ux-blocked-bg` | `#f5f5f5` | `--neutral-100` | Bloqueado por licencia |
| `--ux-ava-1-bg` | `#f0f9ff` | `--primary-50` | Aludes nivel 1 |
| `--ux-ava-1-fg` | `#0369a1` | `--primary-700` | Texto nivel 1 |
| `--ux-ava-2-bg` | `#fffbeb` | `--warning-50` | Aludes nivel 2 |
| `--ux-ava-2-fg` | `#b45309` | `--warning-700` | Texto nivel 2 |
| `--ux-ava-3-bg` | `#b45309` | `--warning-700` | Aludes nivel 3 |
| `--ux-ava-3-fg` | `#ffffff` | — | Texto nivel 3 |
| `--ux-ava-4-bg` | `#b91c1c` | `--error-700` | Aludes nivel 4 |
| `--ux-ava-4-fg` | `#ffffff` | — | Texto nivel 4 |
| `--ux-ava-5-bg` | `#171717` | `--neutral-900` | Aludes nivel 5 |
| `--ux-ava-5-fg` | `#ffffff` | — | Texto nivel 5 |
| `--ux-dark-bg` | `#171717` | `--neutral-900` | Fondo de página en oscuro (§5.3) |
| `--ux-dark-surface` | `#262626` | `--neutral-800` | Superficie de tarjeta en oscuro |
| `--ux-dark-surface-alt` | `#404040` | `--neutral-700` | Superficie alterna en oscuro |
| `--ux-dark-text` | `#f5f5f5` | — | Texto principal en oscuro |
| `--ux-dark-text-muted` | `#a3a3a3` | `--neutral-400` | Texto secundario en oscuro |
| `--ux-dark-border` | `#e5e5e5` | — | Borde informativo en oscuro |
| `--ux-dark-link` | `#38bdf8` | `--primary-400` | Enlace en oscuro (`--primary-700` daría 2.55:1) |
| `--ux-dark-focus` | `#bae6fd` | `--primary-200` | Foco en oscuro |
| `--ux-dark-provenance-editorial-bg` | `#404040` | `--neutral-700` | Procedencia editorial en oscuro |
| `--ux-dark-provenance-editorial-fg` | `#ffffff` | — | Texto de esa etiqueta |
| `--ux-dark-stale-bg` | `#404040` | `--neutral-700` | Desfase en oscuro |
| `--ux-dark-stale-fg` | `#ffffff` | — | Texto del desfase |
| `--ux-dark-nodata-bg` | `#171717` | `--neutral-900` | Ausencia en oscuro |
| `--ux-dark-nodata-fg` | `#a3a3a3` | `--neutral-400` | Texto de ausencia en oscuro |
| `--ux-dark-blocked-bg` | `#262626` | `--neutral-800` | Bloqueado en oscuro |
| `--ux-dark-blocked-fg` | `#ffffff` | — | Texto bloqueado en oscuro |
<!-- ux-tokens:end -->

Regla de implementación para t8: ese bloque completo (más la variante oscura bajo
`@media (prefers-color-scheme: dark)`) va en `snow/client/ux-tokens.css`, importado **después** de
`styles.css`. Nada de `!important` y nada de duplicar rampas: los alias se declaran
(`--ux-bg: var(--neutral-50)`) para que el modo oscuro del sistema siga funcionando.

### 5.3 Estados de estación y de dato — color + glifo + texto (SC 1.4.1)

El color **nunca** va solo. Cada estado es la tupla `(fondo, texto, glifo, palabra)`; el glifo va
`aria-hidden="true"` y la palabra es la que lee el lector de pantalla.

<!-- ux-state:begin -->
| Estado | Fondo | Texto | Glifo | Palabra (visible y accesible) |
|---|---|---|---|---|
| `open` | `#15803d` | `#ffffff` | `▲` | Abierta |
| `closed` | `#b45309` | `#ffffff` | `▼` | Cerrada |
| `unknown` | `#f5f5f5` | `#404040` | `?` | Sin datos |
| `stale` | `#fffbeb` | `#b45309` | `◔` | Desfasado |
| `blocked` | `#f5f5f5` | `#404040` | `⊘` | No disponible |
<!-- ux-state:end -->

Notas de decisión:

- **`closed` es ámbar/teja oscuro**, no el coral `#FA8574` de la referencia: ese coral con blanco da
  **1.73:1** (calculado, §12) — ilegible. `#b45309` con blanco da **5.02:1**.
- **`open` es `--success-700` (#15803d)**: blanco = 5.02:1. `--success-600` (`#16a34a`) da 3.30:1 y
  **no** se usa para texto.
- **`stale` no es un color de estado**: es un modificador que se superpone con anillo y etiqueta
  ("Desfasado · hace 41 min"); se diseñó así porque un dato puede ser stale *y* estar abierto.
- `unknown` y `blocked` comparten fondo a propósito: el texto dice **por qué**. Sin datos ≠ sin
  permiso, y el microcopy lo distingue (§8).

### 5.4 Procedencia y frescura (lo que la referencia no tiene)

Tres roles, tres tratamientos. El texto de atribución **no se inventa**: viene de
`Provenance.attribution` (05b §1.1) ya interpolado, y los literales por fuente son los de 05 §5.

<!-- ux-prov:begin -->
| Rol | Fondo | Texto | Contenido obligatorio |
|---|---|---|---|
| Editorial | `#f5f5f5` | `#404040` | `Parte de estación · fuente: <operador> · actualizado <fecha>` + enlace `sourceUrl` |
| Oficial (AEMET / Météo-France / IGN / Copernicus / OSM) | `#f0f9ff` | `#0369a1` | Texto exacto de 05 §5 + `updatedAt` cuando la licencia lo exige |
| Ausencia | `#f5f5f5` | `#404040` | La frase canónica de §8.1 según `NoDataReason` |
<!-- ux-prov:end -->

Reglas:

1. El dato editorial **no se rotula nunca** con la licencia del proveedor que no lo dio (05b §3.2).
2. Frescura siempre visible en el detalle: `hace 12 min` / `hace 3 h` / `de ayer 05:45`. Zona horaria
   explícita cuando se muestra una fecha absoluta (`Europe/Madrid`), nunca solo `05:45`.
3. Si `status === 'stale'`, la etiqueta aparece **aunque** el valor sea correcto: es el punto 3 del
   encargo del Lead (§1, "el vacío es un contenido" y "stale no es un espacio en blanco").
4. Atribución de mapa: "© OpenStreetMap contributors" + enlace a ODbL, **fuera** del canvas del mapa
   (esquina inferior derecha) y también en texto accesible dentro de `<figcaption>`.

### 5.5 Escala europea de aludes

Cinco niveles, con número + palabra + color (nunca solo color). Colores propios porque la referencia
no publica su paleta y su imagen de leyenda no es reutilizable (licencia).

<!-- ux-ava:begin -->
| Nivel | Fondo | Texto | Glifo | Palabra |
|---|---|---|---|---|
| 1 | `#f0f9ff` | `#0369a1` | `1` | Débil |
| 2 | `#fffbeb` | `#b45309` | `2` | Limitado |
| 3 | `#b45309` | `#ffffff` | `3` | Notable |
| 4 | `#b91c1c` | `#ffffff` | `4` | Fuerte |
| 5 | `#171717` | `#ffffff` | `5` | Extremo |
<!-- ux-ava:end -->

### 5.6 Tipografía, retícula y escala

Se heredan las variables del sistema (`--font-sans`, `--font-size-*`, `--space-*`, `--radius-*`,
`--shadow-*`). Delta de snow:

| Rol | Escala | Justificación |
|---|---|---|
| `h1` de pantalla | `clamp(1.75rem, 3.2vw, 2.25rem)` / weight 700 / `--line-height-tight` | El `--font-size-6xl` (3.75 rem) del sistema es un titular de marketing, no de página de datos. |
| `h2` de sección | `--font-size-xl` (20 px) / weight 600 | Igual que la referencia en jerarquía, distinto en tamaño fijo. |
| Cuerpo | `--font-size-base` (16 px) / `--line-height-relaxed` | 16 px de base (no 13 px) por legibilidad y por evitar el zoom automático de iOS. |
| Datos numéricos | `--font-mono` + `font-variant-numeric: tabular-nums` | Las cifras `112,5 km` de la referencia bailan en la tabla; tabular las alinea. |
| Cifra de portada | `--font-size-4xl` (36 px) weight 700 tabular | Única cifra grande por pantalla, la del esqueleto de estado. |

Retícula: **12 columnas**, `--container-max-width: 1280px` del sistema, gutter `--space-6` (24 px) en
≥1024, `--space-4` (16 px) en 768–1023, `--space-3` (12 px) en <768.

### 5.7 Componentes compartidos nuevos (nombre → responsabilidad)

| Componente (`snow/client/ui/`) | Responsabilidad única | No hace |
|---|---|---|
| `provenance-badge` | Pinta `ProvenanceDto`: rol (editorial/oficial), `attribution`, frescura. | No decide si el dato es válido. |
| `data-state` | Pinta uno de los 5 estados §5.3 a partir de `ProviderResult['status']`. | No pinta valores. |
| `nodata-block` | Pinta la frase de §8.1 + motivo + CTA. | No pinta "0". |
| `stale-ribbon` | Cinta superior de tarjeta con la frescura. | No modifica el valor. |
| `freshness` | `hace X` con `time` semántico (`<time datetime=…>`). | No hace `setInterval` global. |
| `snow-metric` | Valor + unidad + `data-state` + `provenance-badge` en una sola pieza. | Nada más. |
| `station-status-badge` | Insignia §5.3 con `aria-label` completo. | No colorea filas. |
| `avalanche-scale` | Nivel 1–5 de §5.5. | No interpreta el boletín. |
| `filters-bar` | Filtros de la exploradora, con `(change)` que solo emite. | No filtra (filtra la página). |
| `sort-section` | Orden con `aria-sort` en `th`. | No re-ordena datos en cliente. |

Regla: **un componente = un `input()` tipado + cero `HttpClient`**. Los componentes de UI no piden
datos; la página los pide y los baja.

---

## 6. Accesibilidad y navegación (WCAG 2.2 AA como mínimo)

### 6.1 Viewport (SC 1.4.4) — el defecto D1 resuelto de raíz

`web-ssr/src/index.html` ya trae el viewport correcto (**OBSERVADO** en disco el 2026-11-16):

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

Nada de bloqueo del zoom (ni escala máxima/mínima fija, ni desactivar el zoom del usuario). El script de verificación falla si ese
viewport se reintroduce en el documento. Requisito para t8/t9: **zoom 200 % y 400 % sin pérdida de
contenido ni scroll horizontal en `main`** (SC 1.4.10 Reflow: a 320 px CSS de ancho no debe haber
scroll horizontal bidimensional). Se comprueba en el navegador del entorno de t9, **no aquí** (§1: sin
Nx no hay navegador).

Nota honesta sobre el repo actual: `index.html` declara `<html lang="en">` mientras todo el contenido
está en español. En snow se sirve `lang` correcto por ruta (SC 3.1.1); corregir el resto del sitio no
es alcance de t8 y se registra en §10.4.

### 6.2 Foco y teclado (SC 2.1.1, 2.4.3, 2.4.7, 2.4.11)

| Requisito | Especificación | Verificación |
|---|---|---|
| Foco visible | `outline: 3px solid var(--ux-focus); outline-offset: 2px` en `:focus-visible`. **Prohibido** `outline: none` sin sustituto. En botón primario: `outline: 3px solid var(--ux-focus-on-primary); outline-offset: -4px` (interior) **+** `box-shadow: 0 0 0 2px var(--ux-surface)` (separación). | t9: recorrido con `Tab` y captura de cada foco |
| Orden de foco | Sigue el orden del DOM del layout **activo**. En tablas con primera columna `sticky` se mantiene el orden horizontal. | t9 |
| Sin ratoneras | El panel de filtros móvil y el diálogo de enlace de webcam atrapan el foco y devuelven el foco al disparador al cerrar; `Escape` siempre cierra. | t9 |
| Salto al contenido | Primer elemento del `body`: `a.skip-link` → `#main`, visible al recibir foco. | t9 |
| Atajos | Sin atajos de una tecla (SC 2.1.4). Los filtros no reaccionan a teclas sueltas. | revisión |
| Anuncios | Resultados de filtro y cambios del comparador: `role="status"` (nunca `assertive`). Errores: `role="alert"`. | t9 |

**Modelo de interacción por control:**

| Control | Teclado | Semántica |
|---|---|---|
| Filtros (país/sistema/estado/disciplina) | `Tab` entra al grupo; control nativo (`<select>`, `checkbox`); `Space` alterna; `Enter` aplica. | `<fieldset><legend>` por grupo. |
| Chips de filtro activo | `Tab` a cada chip; `Delete`/`Backspace` con foco lo quita; `Enter` lo abre. | `aria-label="Quitar filtro: Pirineo Aragonés"`. |
| Tabla de exploradora | `Tab` por cabecera ordenable; `Enter`/`Space` ordena. | `<table>` + `<caption>` + `aria-sort`. |
| Vista tarjetas ↔ mapa | `Tab` a `role="tablist"`; `←`/`→` mueven; `Home`/`End` extremos (patrón APG de pestañas). | `role="tab"`/`tabpanel`. |
| Mapa Leaflet | El mapa recibe foco, flechas desplazan, `+`/`-` zoom (Leaflet 1.9 lo trae), **y** un botón «Lista de estaciones del mapa» da el mismo contenido sin leer el canvas. | SC 1.1.1 + 2.1.1 |
| Comparador | `Tab` entre columnas; flechas dentro de una columna. | `<table>` con `scope="row"`. |
| Carrusel de destacadas | Botones «Anterior»/«Siguiente» reales; sin `autoplay` o con pausa (SC 2.2.2). | revisión |

### 6.3 Tablas (SC 1.3.1) — el defecto D12

- Toda tabla de datos es `<table>` con `<caption>` (puede ser `.sr-only` si el `h2` ya la titula, pero
  existe).
- Cabeceras `scope="col"`; primera celda de fila `scope="row"`.
- **Móvil (<768 px):** la misma tabla se convierte visualmente en tarjetas **con CSS**, pero el DOM
  sigue siendo la tabla. Prohibido duplicar el contenido en `div` (duplica en el árbol de
  accesibilidad).
- Ningún `div` con `role="table"` (SC 4.1.2).

### 6.4 Contraste — resultados medidos, no asertados

Ejecutado el 2026-11-16 con `check-a11y-contrast.mjs` (§12): **41 pares, peor ratio 4.84:1** para
texto (mínimo 4.5:1) y el resto ≥ 3:1 para UI. **No** se dice "cumple AA" en bloque: es la matriz de
pares controlables desde tokens, no una auditoría AA completa; faltan los pares que dependen de
contenido aún desconocido y así se declara.

Casos que **no** cumplen 3:1 y por eso **no** se usan como información única:

| Elemento | Ratio | Por qué se acepta |
|---|---|---|
| `--ux-border` (`#e5e5e5`) sobre blanco | 1.26:1 | Borde **decorativo**. Toda frontera informativa usa `--ux-border-strong` (5.93:1) o el propio texto. |
| Insignia «Sin datos» (`#f5f5f5` sobre blanco) | 1.09:1 | El estado lo dicen el icono `?` en `--ux-text` y la palabra «Sin datos»; el contorno informativo es `--ux-border-strong` (5.93:1, medido como `state-unknown-border`). |
| Fondo del nivel 1 de aludes (`#f0f9ff`) sobre blanco | 1.07:1 | Se lee «1 · Débil» en `--ux-ava-1-fg` (5.57:1); el color no es la señal. |
| `--focus-ring` del sistema (`--primary-200`) | 1.33:1 | **No se usa** en snow; se sustituye por `--ux-focus` (§5.1). |

### 6.5 Movimiento (SC 2.3.3, D13)

- `styles.css` ya reduce animaciones bajo `prefers-reduced-motion: reduce`; el JS **también** debe
  consultarlo: ECharts con `animation: false`, Leaflet con `zoomAnimation: false`, auto-refresco de
  datos desactivado.
- Sin parpadeos > 3 Hz (SC 2.3.1). Ningún `pulse` infinito en datos (el `pulse` de `DESIGN_SYSTEM.md`
  es para insignias de marketing, no para estados de estación).

### 6.6 Alternativas textuales y nombres accesibles

- Insignia de estado: `aria-label="Estado: Cerrada"`. `title` nunca sustituye al texto (SC 1.4.13).
- Icono meteorológico: SVG decorativo (`aria-hidden="true"`) + texto "Nublado, −4 °C / 11 °C".
- Enlace de webcam: `Webcam de Baqueira · Bonaigua-Cap del Port (abre en el sitio del titular,
  © roundshot.com)`; no "Ver webcam".
- Gráficos: `role="img"` con `aria-label` resumen **y** tabla de datos en `<details>` (SC 1.1.1).
- Mapa: `aria-label="Mapa de estaciones del Pirineo; 14 estaciones"` + lista textual obligatoria.

### 6.7 Textos e i18n

El microcopy sale de `@ngx-translate` (ya instalado) con claves `ux.snow.nodata.<reason>`. Los tests
de t9 deben comprobar las 5 claves de §8.1 en español y que ninguna cae al texto de respaldo en
inglés. Regla: **el texto de la UI vive en un fichero de traducción, no en los templates** (excepto
etiquetas de `aria-label` cortas, que también van por clave).


---

## 7. Los siete estados transversales (toda pantalla los tiene)

Toda pieza de datos de A–G solo puede estar en uno de estos siete estados. La correspondencia con el
contrato es **mecánica** (§7.7): t8 no inventa transiciones, las lee de `ProviderResult`.

### 7.1 Carga (`loading`)

- **Esqueleto con la forma exacta del contenido**, no un spinner centrado: el esqueleto debe evitar
  cambio de layout (CLS). Medida: el contenedor reserva la misma altura que el estado poblado usando
  `aspect-ratio` en las tarjetas y un `min-height` por fila de tabla (`--space-12`), **sin** números.
- El esqueleto NO muestra cifras falsas ni ceros. Nunca.
- Accesible: `aria-busy="true"` en la región, `role="status"` con texto «Cargando parte de nieve…»
  (una vez, no por tarjeta) para que el lector anuncie el cambio.
- `prefers-reduced-motion`: sin `shimmer`; fondo estático `--ux-surface-sunken`.
- Streaming SSR: la página renderiza la cáscara + `<h1>` + procedencia de la estación **en el HTML
  inicial**; el parte llega en la misma respuesta si está en caché (05b §4.2), o el esqueleto queda y
  el cliente refresca. Ninguna página depende de un `fetch` sólo-cliente para su `<h1>`.

### 7.2 Sin datos (`no_data`) — cinco frases canónicas

Debe coincidir **literalmente** con 05b §3.2. Cambiarlas aquí rompe la paridad con el contrato.

| `NoDataReason` | Texto visible (es) | Segunda línea (contexto, opcional) | CTA |
|---|---|---|---|
| `outside-season` | **Temporada cerrada — sin parte publicado** | «Las estaciones abren en diciembre; el parte se publica el primer día de apertura.» | «Ver fechas de temporada» |
| `source-silent` | **La estación no ha publicado parte hoy** | «Suele publicarse entre 07:00 y 09:00.» | «Avísame cuando haya parte» (solo si hay favorito) |
| `not-yet-published` | **Pendiente de publicación por la fuente** | «Último parte disponible: {fecha}.» | «Ver histórico» |
| `not-covered` | **Sin cobertura de datos para esta estación** | «No hay fuente autorizada para este dato en esta ubicación.» | «Ver estaciones cubiertas» |
| `license-prohibits` | **No disponible por condiciones de uso de la fuente** | «El titular no permite mostrar este dato aquí.» | Enlace al titular, si existe (`ImageGrant.linkUrl`) |

Reglas:

1. **Nunca** se pinta «0» ni «—» a secas: el guion sin frase es exactamente el defecto de la
   referencia (01 §4.10, 02 F12/F13).
2. Un `no_data` **nunca** se viste de error: fondo `--ux-nodata-bg`, glifo `?`, sin color rojo.
3. Si hay un último dato conocido, se muestra **fechado** debajo del bloque («Último parte:
   08/04/2026 05:45, hace 7 meses»), marcado como histórico. No es un dato vigente.

### 7.3 Desfasado (`stale`)

- Se pinta el valor **con** cinta superior `--ux-stale-bg` + glifo `◔` + «Desfasado · {frescura}».
- El valor mantiene su formato y su procedencia; la cinta es un modificador, no un estado sustituto.
- Motivo obligatorio en la frase: «El proveedor no ha actualizado desde {fecha}», cuando lo sabemos
  (`updatedAt`). Si no lo sabemos, solo se dice la frescura.
- El tope de desfase no se inventa aquí: quien lo decide es `Provenance.status` del backend
  (`'stale'`). La UI **no** recalcula la caducidad; solo la muestra.

### 7.4 Error recuperable (`error`)

- Fondo `--ux-error-bg`, texto `--ux-error-fg`, glifo `!` + «No hemos podido cargar {dato}.»
- Botón «Reintentar» si `retryable === true`; si es `false`, texto «Vuelve más tarde» y sin botón.
- `role="alert"` en el contenedor (una vez por región, no por tarjeta).
- Nunca se muestra el mensaje técnico del backend (`message` de `ProviderResult` es para logs, no
  para el usuario; si se quiere traza, va en un `<details>` colapsado con «Detalles técnicos»).

### 7.5 Bloqueado por licencia (`blocked`)

- Fondo `--ux-blocked-bg`, glifo `⊘` + «No disponible por condiciones de uso de la fuente».
- **No** hay botón de reintentar: reintentar no cambia una licencia.
- El bloque `--ux-provenance-*` **no** aparece (no hay dato que atribuir). Si hay titular, su nombre y
  el enlace saliente sí aparecen, con su `rel` y su atribución (`ImageGrant.linkUrl`).
- Esta es la única situación en la que la UI puede enseñar un dato "que existe en el mundo pero no
  aquí". Nunca se pinta la imagen.

### 7.6 Debug / sin credencial (`not_configured`)

- Para el usuario, `not_configured` **no se distingue** visualmente de `not-covered`: misma frase
  ("Sin cobertura de datos para esta estación"), porque el usuario no puede hacer nada con "falta una
  clave". El detalle real queda en la procedencia técnica (`/admin/snow/providers`, §9.7 y F23).
- Nunca se muestra en público `AEMET_API_KEY` ni ningún nombre de variable de entorno.

### 7.7 Matriz estado ↔ contrato (para t8, sin interpretación)

| `providerResult.status` | Estado de UI | Texto | ¿Puede haber valor visible? |
|---|---|---|---|
| `ok` | poblado | procedencia + frescura | sí |
| `stale` | desfasado | valor + cinta | sí |
| `no_data` | sin datos | §7.2 según `reason` | no (solo "último conocido", fechado) |
| `not_configured` | sin datos | misma frase que `not-covered` | no |
| `blocked` | bloqueado | §7.5 | no |
| `rate_limited` | desfasado/casi error | "Esperando a la fuente…" + reintento tras `retryAfterMs` | sí, si hay caché; si no, sin datos |
| `error` (`retryable`) | error | §7.4 + reintentar | no |
| `error` (`!retryable`) | error | §7.4 sin botón | no |

---

## 8. Microcopy en español: cada ruta que dice "no hay dato"

### 8.1 Vocabulario fijo

- «**Parte de estación**» = dato editorial (lo transcribió una persona). **Nunca** «parte oficial».
- «**Previsión de {AEMET|Météo-France}**» = dato de proveedor autorizado, con su atribución.
- «**Actualizado**» = `updatedAt` de la fuente. «**Consultado**» = `observedAt` nuestro.
- «**hace X**» = frescura calculada respecto de `requestedAt`. Si la hora es absoluta, «a las 05:45
  (Europe/Madrid)».
- No se usa «tiempo real», «directo», «en vivo» para datos que no lo son.

### 8.2 Frases por pantalla y estado

| Pantalla | Estado | Texto exacto |
|---|---|---|
| A Portada | `no_data` global (sin ningún parte vigente) | Título: «Hoy no hay partes publicados». Cuerpo: «Ninguna estación en cobertura tiene parte vigente en este momento. Último parte: {fecha, hora, zona}.» CTA: «Ver histórico de partes». |
| A Portada | `stale` global | «Partes con más de {n} h de antigüedad. Se muestran marcados en cada estación.» |
| A Portada | 0 estaciones con dato | Se muestra la lista de estaciones **sin** cifras y con «Sin parte» en cada tarjeta (no se oculta la lista). |
| B Exploradora | resultado vacío por filtros | «Ninguna estación coincide con estos filtros.» + «Quitar filtros» + lista de los filtros activos. |
| B Exploradora | resultado vacío sin filtros | «No hay estaciones en cobertura todavía.» |
| B Exploradora | orden por nieve sin datos | «No se puede ordenar por espesor sin partes publicados.» (el botón de orden por espesor aparece deshabilitado con `aria-disabled` y `title` explicativo) |
| C Detalle | bloque de estado | §7.2 según `reason` + «Parte de estación · fuente: {operador} · actualizado {fecha}» o el aviso del proveedor. |
| C Detalle | espesores sin dato | «Espesor no publicado — la estación no reporta espesores medidos.» (nunca «0 cm»). |
| C Detalle | previsión ES sin clave A1 | «Previsión no disponible para esta estación.» + «Sin cobertura de datos para esta estación.» |
| C Detalle | aludes AD/FR (`restricted`) | «Boletín no disponible aquí por condiciones de uso de la fuente. » + enlace al boletín oficial (deep-link, TTL 0, 05b §4.2). |
| C Detalle | webcams | «Las cámaras son del operador y no se pueden mostrar aquí. Se abren en su sitio:» + botón-enlace «Abrir cámara (© {titular})». |
| D Webcams | sin enlaces | «No hay cámaras con enlace autorizado para esta zona todavía.» |
| D Webcams | `blocked` | «Las imágenes de cámara las publica el operador; aquí solo aparecen los enlaces necesarios.» |
| E Meteorología | región sin proveedor | «Sin proveedor autorizado para esta zona. Las previsiones por país: España (AEMET), Francia (Météo-France).» |
| E Meteorología | `not_configured` en producción | Idéntico texto que la fila anterior (el usuario no ve claves). |
| F Mapas | falta `PROTOMAPS_BASE_URL` | «El mapa no está disponible en este momento. La lista de estaciones está abajo y funciona igual.» + lista. **La página no falla.** |
| F Mapas | PMTiles cargados, sin estaciones con dato | «Las {n} estaciones siguen en el mapa; ninguna tiene parte vigente.» |
| G Comparador | 0 estaciones seleccionadas | «Elige dos o tres estaciones para comparar.» |
| G Comparador | >3 con selección | «Se comparan como máximo 3 estaciones. Quita una para añadir otra.» |
| G Comparador | fila sin dato en una columna | Celda «Sin datos» + procedencia aplicable. La fila **no** se oculta: se compara la ausencia también. |
| 404 / ** | cualquier ruta desconocida | Título: «No encontramos esta página». Cuerpo: «La dirección no existe o ha cambiado. Estos son algunos accesos:». Botones: buscador, «Ver todas las estaciones», inicio. |

### 8.3 Errores técnicos: qué se dice y qué no

- No se muestran códigos HTTP, ni `stack`, ni el `message` del backend.
- Sí se registra en telemetría con `redactUrl`, y sí se conserva un `requestId` visible en
  `<details>` «Detalles técnicos» para que soporte lo pueda buscar.
- Falta de credencial jamás se presenta como "error del sitio".

---

## 9. Especificación de pantallas A–G

Convenciones de todas las fichas: medidas en px CSS; "≥1024 / 768–1023 / <768" = escritorio, tablet,
móvil. Todos los bloques con datos llevan `provenance-badge`; no se repite en cada fila de la tabla.

### 9.1 A — Panel de inicio (`/`)

**Corregido respecto a `02`:** la ruta de inicio **no** se inventa: hoy `app.routes.ts` mapea `""` →
`pages/home/home`. El panel snow es la **portada sustituida** (recomendación: usar el `Home` existente
con un bloque snow, para no romper otras páginas que cuelgan del mismo layout). Decisión abierta para
el capitán: (a) `/` = panel snow; (b) `/` = home actual + bloque; (c) `/parte-de-nieve` = panel.

Objetivo: en 5 segundos, saber **si hoy hay nieve, dónde y con qué calidad de dato**.

Estructura (DOM en orden de lectura):

1. `<header>` global (reutilizado).
2. `<main id="main">`
   - `<h1>Parte de nieve — {fecha en Europe/Madrid}</h1>` (siempre existe; D2).
   - **Franja de estado global**: una sola línea que responde "¿hay datos hoy?":
     «{n} estaciones con parte · {m} sin dato · actualizado hace {x}». 2–3 cifras tabulares.
   - **Buscador de estación** (input + `datalist` de 100 estaciones + submit) — reemplaza a
     `buscar.php` (D8/F06).
   - **6–8 tarjetas de estación destacadas** (NO todo el catálogo): selección determinista por
     `rank` editorial + estado poblado. Tarjeta = `station-card` reescrito con `snow-metric`.
   - **Bloque "Top espesores hoy"** (F12): lista de 5 con barra comparativa; si vacío, §7.2 con
     motivo y «última vez con datos».
   - **Bloque "Top kilómetros abiertos"** (F13): idem, desambiguando pistas vs circuitos nórdicos
     (`discipline`, F11).
   - **Últimas actualizaciones**: log de `updatedAt` más recientes (3 líneas) — responde "¿esto está
     vivo?".
3. `<footer>` global (atribuciones y legal).

Breakpoints:

| ≥1024 | 768–1023 | <768 |
|---|---|---|
| Grid 12 cols: franja a ancho completo; buscador 4 cols; destacadas 3 por fila (4 cols cada una); dos rankings lado a lado (6+6). | Buscador a ancho completo; destacadas 2 por fila; rankings apilados. | Todo a 1 columna; destacadas en **carrusel con botones** (no `swipe` obligatorio); rankings colapsados en `<details>` con `open` el primero. |

Estados: cargando (esqueleto de franja + 6 tarjetas), sin datos global (§8.2), stale global (§8.2),
error global (bloque con reintento, resto de la página viva), 0 destacadas con dato (lista completa sin
cifras).

Datos: `GET /api/snow/v1/stations?limit=…` y `GET /api/snow/v1/rankings/{snow,km}`. **Prohibido** que
la portada haga 90 peticiones de parte; una sola llamada agregada o SSR con caché de 5 min.

### 9.2 B — Exploradora (`/estaciones`)

Sustituye a `pages/stations-list` (hoy con mocks). Objetivo: **encontrar** una estación y comparar
dónde hay nieve, con filtros y orden **en la URL** (D11).

Controles (todos SSR-visibles en el HTML inicial, no tras JS):

- `q` (texto, buscador tolerante a acentos, F06).
- `pais` ∈ ES, AD, FR, PT (multi). `sistema` = sistema montañoso (multi, derivado del maestro
  editorial, 02 §0.4). `disciplina` ∈ alpino | fondo (F11). `estado` ∈ abierta | cerrada | sin dato.
  `nieve_min` (número, cm). `orden` ∈ nombre | nieve_desc | km_desc | estado; `dir` ∈ asc | desc.
- Barra de chips con los filtros activos + «Quitar todos».
- Contador de resultados en `role="status"` y en el `<h1>` secundario: «{n} estaciones».

Layout: dos modos, **vista tarjetas** (por defecto <1024) y **vista tabla** (por defecto ≥1024), y
opcionalmente **vista mapa** (F). La conmutación va en la URL (`vista=tarjetas|tabla|mapa`), de modo
que se puede compartir.

Tabla (vista tabla, ≥1024): columnas `Estación | Estado | Remontes | Pistas/Circuitos | Km | Nieve |
Actualizado | Meteo`. Estado = insignia §5.3. `Pistas` se rotula «Circuitos» cuando
`discipline === 'nordic'` (F11), y **no** se mezclan ambas en la misma columna. Orden de la tabla por
`aria-sort`.

Móvil (<768): mismas filas como tarjetas (DOM tabla, CSS tarjeta, §6.3). Filtros en un `<dialog>`
abierto por «Filtrar» con `aria-expanded`.

Paginación: «Cargar más» (botón real, no scroll infinito) con `aria-controls`; la URL mantiene
`pagina`.

Estados: vacío por filtros (§8.2) + botón que restaura la URL sin query; vacío de datos con motivo;
stale por fila (cinta pequeña en la columna «Actualizado»); error (bloque con reintento, los filtros
quedan operativos).

**NO OBSERVADO:** la referencia nunca muestra una tabla poblada (todas cerradas). El formato de
`abiertos/total` (`-/25`) se decide así: **columna con dos números** `12 / 25` en fuente tabular,
`—` reemplazado por «Sin dato» en texto (no guion), y `total` siempre visible aunque `abiertos` sea
`null`.

### 9.3 C — Detalle de estación (`/estacion/:slug`)

**Arquitectura de navegación distinta de la referencia, a propósito.** La referencia usa 6 pestañas
de estación × 4 sub-pestañas (24 combinaciones, con URLs distintas), lo que rompe el enlace profundo a
un bloque y crea páginas casi duplicadas. Nosotros: **una sola página con secciones ancladas**
(`#parte`, `#pistas`, `#meteo`, `#aludes`, `#webcams`, `#ficha`) y un índice lateral que marca
`aria-current="true"` con `IntersectionObserver`. Cada ancla es enlazable y cada sección es un
`<section aria-labelledby>`.

Orden: `<h1>{estación}</h1>` + procedencia global + «Parte de {fecha, hora, zona}»

1. **Esqueleto de estado**: insignia (§5.3) + 3–5 cifras clave (espesor base/cima, km abiertos,
   remontes) cada una con `snow-metric` (valor + unidad + estado + procedencia).
2. **Pistas y remontes** (`station-lifts-slopes` reescrito): donuts abiertos/total por dificultad
   (verde/azul/roja/negra + itinerarios). En móvil: barras apiladas con el número al lado.
3. **Previsión** (AEMET/Météo-France según país): 72 h + 8 días. Si no hay datos → §7.2/§8.2.
4. **Aludes** (`avalanche-scale`): nivel 1–5 + `validFrom/validUntil` + enlace al boletín original. Sin
   parsear el PDF en v1 (05b §7.1).
5. **Webcams**: solo enlaces (§9.4). Nunca `img`.
6. **Ficha técnica**: altitudes, fechas de temporada (`confirmed: boolean`, texto no icono), sitio del
   operador, maestro editorial (sin datos de OSM copiados a esta ficha, 05b §5).
7. **Histórico de parte**: últimos 30 días de `snow_report` (tabla pequeña) y «último parte conocido»
   cuando esté fuera de temporada.

Móvil: índice como `<select>` nativo ("Ir a sección") — patrón accesible sin JS.

`<title>`/`<h1>`/`breadcrumb` desde el maestro; canonical propio (D5).

### 9.4 D — Centro de webcams (`/webcams`)

Lo que **puede** hacer: un **directorio de enlaces** a cámaras, con operador, titular, zona/estación,
estado y `rel="noopener"`. Lo que **no** puede hacer: incrustar, proxear, cachear ni generar miniaturas
(05b §7.4, `FALLBACK_CHAINS.image = []`).

- Filas/`<figure>` por cámara: nombre de cámara, estación, titular (`© roundshot.com`…), botón-enlace
  «Abrir cámara ↗» con nombre accesible completo.
- Filtros por sistema/estación/titular.
- Sustituto visual: un **icono de cámara** (no una imagen). No hay miniatura. Es una decisión: mostrar
  un `img` con `src` al tercero es exactamente el defecto D9 y además violación de licencia.
- Si el backend no tiene ningún `ImageGrant`: §8.2.

Nota de expectativa: es la pantalla **más árida** del producto frente a la referencia (24 imágenes
frente a 24 enlaces). Se ha decidido así por licencia; no hay alternativa legal sin acuerdos (A5/A3).
El valor añadido que la referencia no tiene: titular explícito, estado de la cámara («sin enlace
autorizado») y agrupación por zona con la estación.

### 9.5 E — Centro meteorológico (`/meteorologia` y `/estacion/:slug/tiempo`)

Reutiliza el stack `pages/weather/**` (13 componentes) — es la pantalla del repo con más activos
reales. Cambios necesarios:

| Componente | Cambio |
|---|---|
| `TiempoCotaSelectorComponent` | se queda; añade `aria-label` por botón. |
| `TiempoNowPanelComponent` | quitar `?? 0` (§10.4-D2); cada métrica pasa a `snow-metric`. |
| `Forecast72hTableComponent`, `week-forecast-charts`, `detailed-forecast-table` | `role="img"` + tabla `details` (§6.6). |
| `TiempoWebcamsGridComponent`, `webcam-timeline` | **fuera**: pintan imágenes. Se elimina su uso en snow; se sustituye por el directorio de §9.4. |
| `AlertsPanelComponent` | mapea `WeatherAlertBundle`; nivel → color + texto. |
| `SeasonChartsPanelComponent` | patrón `import('echarts')` dentro de `isPlatformBrowser`: se copia, no se reescribe. |
| `TiempoSkeletonComponent`, `TiempoErrorStateComponent` | base de §7.1/§7.4. |

Datos: solo AEMET (ES) y Météo-France (FR); para Andorra/Portugal, `copernicus-c3s` como relleno y,
si no hay, §7.2 `not-covered`. Cota (base/mid/top) explicada con un botón «¿Qué es la cota?» que abre
un texto breve.

Estados: `not_configured` (clave ausente) se pinta como `not-covered`; si hay caché desfasada, `stale`
con cinta; error del proveedor → §7.4 con «reintentar».

### 9.6 F — Mapas (`/mapa`)

Objetivo: ver **dónde** hay nieve y **cuánta**, con un mapa que no incumpla licencia.

- **Base**: PMTiles/Protomaps autohospedado (`PROTOMAPS_BASE_URL`). Atribución «© OpenStreetMap
  contributors» + ODbL, visible en la esquina **y** en `<figcaption>`. Prohibido
  `tile.openstreetmap.org`, MapTiler Free y Stadia Free (05 §2.10, §2.12–2.13).
- **Carga diferida**: Leaflet fuera del bundle inicial (`await import('leaflet')`), `isPlatformBrowser`;
  el SSR pinta el `<figure>` con la **lista de estaciones** ya en el HTML (así el mapa se puede ignorar
  sin perder contenido).
- **Marcadores**: cluster por sistema montañoso; clic abre un panel (no un popup de píxeles) con la
  tarjeta de estación (mismo `station-card` de A). Teclado: recorrido de marcadores como lista
  enfocable (`<ul>` de botones sincronizados con el mapa).
- **Capas** (todas con atribución propia): estaciones (ODbL), aludes por zona cuando llegue AEMET BPA,
  previsión por zona.
- **Sin datos**: si falta `PROTOMAPS_BASE_URL`, §8.2 F con la lista funcionando. Si el mapa carga pero
  no hay partes, los marcadores siguen y el texto lo dice.

### 9.7 G — Comparador (`/comparar`)

Objetivo: comparar **2–3** estaciones en filas de datos, con la fuente de cada celda.

- Selección: desde la exploradora («Comparar» con `checkbox` por fila) o en la propia página
  (`combobox` con autocompletado). Estado en la URL (`?slugs=a,b,c`), SSR.
- Tabla: filas = métricas (Estado, Espesor base/cima, Nieve 24 h, Km abiertos, Remontes, Pistas,
  Calidad, Aludes, Actualizado, Procedencia). Columnas = estaciones.
- **Cada celda lleva su procedencia** (punto de color + `title`/`aria-label` con la fuente) porque la
  procedencia puede diferir entre estaciones.
- Una celda `no_data` **no** oculta la fila; se pinta «Sin datos» + motivo abreviado.
- Accesible: `<table>` con `scope="row"` en la métrica; en móvil, comparación **por pares** (una tabla
  de 2 columnas por vez con un `<select>` para elegir el par) porque 3 columnas a 320 px es ilegible.
- Sin JS: el formulario `GET` funciona (progressive enhancement).

**Corrección de la premisa.** `02-feature-matrix.md` **no** asigna ID a un comparador: sus 24 filas son
F01–F24 y ninguna es "comparador". La pantalla G es **capacidad nueva**, pedida en el encargo del
Lead. Se propone `F25` y el capitán decide si entra en la matriz (no la edito: su dueño es
`re-researcher`).

---

## 10. Contrato de implementación para t8

Esta sección es **vinculante**. No es "sugerencias": si t8 se desvía, el auditor de t10 debe abrir
hallazgo. Las decisiones abiertas (§13) se cierran antes de codificar, no durante.

### 10.1 Ubicaciones

```text
web-ssr/src/app/snow/
├── models/
│   ├── dto.ts                 # copia literal de 02 §3.2 (SnowReportDto, ProvenanceDto, ReportPayload)
│   └── view-state.ts          # ViewState + toViewState() + formatMeasurement() (§10.3)
├── client/
│   ├── ux-tokens.css          # bloque --ux-* de §5.2 (generado con extract-ux-tokens.mjs --emit)
│   ├── snow-api.service.ts    # HttpClient tipado al borde /api/snow/v1
│   └── ui/                    # componentes presentacionales de §5.7
├── pages/
│   ├── dashboard/             # A
│   ├── explorer/              # B
│   ├── station/               # C
│   ├── webcams/               # D
│   ├── weather/               # E (consume pages/weather/**)
│   ├── map/                   # F
│   ├── compare/               # G
│   └── not-found/             # 404 real (D6)
└── snow.routes.ts             # se inserta en app.routes.ts (NO se reescribe el fichero a mano a ciegas)
```

Rutas nuevas: `/parte-de-nieve` (opcional, alias de A), `/estaciones/:slug` (C), `/webcams` (D),
`/mapa` (F), `/comparar` (G), y `**` → `not-found` al final de `app.routes.ts`.

### 10.2 Prohibiciones ejecutables (cada una con su comprobación)

| # | Prohibido | Comprobación |
|---|---|---|
| P1 | `?? 0`, `\|\| 0`, `Number(x) \|\| 0` en cualquier cálculo o pintado de nieve/km/remontes | grep en `snow/**`; además el tipo `formatMeasurement` hace el trabajo (§10.3) |
| P2 | `<img>`, `<iframe>`, `background-image: url(...)` apuntando a terceros en pantallas snow | grep; la única URL permitida es `ImageGrant.linkUrl` en un `<a>` |
| P3 | `tile.openstreetmap.org`, `maptiler`, `stadia` | grep |
| P4 | cualquier atributo de viewport que bloquee el zoom (SC 1.4.4) | grep en todo `web-ssr/src` |
| P5 | `style="background-color:#…"` (color en línea) | grep; usar token + clase |
| P6 | `--focus-ring` en componentes snow | grep |
| P7 | `<div class="table">` / `role="table"` | revisión + grep de `role="table"` |
| P8 | `HttpClient` dentro de un componente de `ui/` | revisión de imports |
| P9 | `keywords` en metadatos | grep |
| P10 | Nombres de variables de entorno en HTML público | grep `_API_KEY`, `_BASE_URL` en templates |

### 10.3 El modelo de vista (TypeScript real, compilado)

Este bloque se compila con el TypeScript del repo **en esta tarea** (resultado en §12) y es el que t8
debe implementar. La idea central: la ausencia es un **tipo**, no un valor; y el formateo de medidas
es una función única que **no puede** devolver "0" para un `null`.

```ts
// snow/models/view-state.ts  — verificado con tsc --strict (ver §12)
export type LicenseStatus =
  | "allowed" | "allowed-with-attribution" | "restricted" | "blocked" | "unverified";

export type NoDataReason =
  | "outside-season" | "source-silent" | "not-yet-published" | "not-covered" | "license-prohibits";

/** Los siete estados visuales de §7. */
export type ViewState = "loading" | "ready" | "stale" | "nodata" | "blocked" | "error" | "partial";

/** Mapeo puro del estado de borde a estado visual. Sin rama que fabrique un número. */
export function toViewState(dto: { readonly status: string }): ViewState {
  switch (dto.status) {
    case "ok": return "ready";
    case "stale": return "stale";
    case "no_data":
    case "not_configured": return "nodata";   // §7.6: el usuario no ve claves
    case "blocked": return "blocked";
    case "error": return "error";
    default: return "nodata";
  }
}

/**
 * ÚNICA función autorizada a convertir una medida nullable en texto.
 * `null`, `undefined`, -1, -99 y no-finitos ⇒ absentens. Nunca "0".
 */
export function formatMeasurement(
  value: number | null | undefined,
  unit: "cm" | "km" | "%",
  locale: "es-ES"
): { readonly kind: "value"; readonly text: string } | { readonly kind: "nodata" } {
  if (value === null || value === undefined) return { kind: "nodata" };
  if (!Number.isFinite(value)) return { kind: "nodata" };
  if (value === -1 || value === -99) return { kind: "nodata" };  // sentinelos heredados (05b §3.2)
  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const spacer = unit === "%" ? "" : " ";
  return { kind: "value", text: `${formatter.format(value)}${spacer}${unit}` };
}
```

**Prueba negativa ejecutada (y fallida como debe):** importar `formatMeasurement(null, "cm", "es-ES")`
y leer `.text` **no compila** (`TS2339: Property 'text' does not exist on type '{ readonly kind:
"nodata" }'`). Es decir: el error de "pintar 0 como sin dato" es **un error de compilación**, no un
fallo de disciplina. Ver §12.

### 10.4 Defectos **propios del repo** que t8 hereda (y no puede reproducir)

Estos no vienen de infonieve: están en `web-ssr` hoy. Se documentan aquí para que t8 los corrija en el
código nuevo y **no** los arrastre reutilizando componentes tal cual.

| # | Defecto propio | Dónde (verificado) | Qué hace t8 | Severidad |
|---|---|---|---|---|
| R1 | **Contrato mock en todas las páginas de estación**: `StationHeroData.price`, `SnowReport.snowBase: number` (no nullable), `ReviewStatus`, `heroImage` | `pages/station-detail/models/station-detail.models.ts` | No usa ese modelo; usa `snow/models/dto.ts`. El modelo viejo se queda para el resto del sitio. | alta |
| R2 | **Sentinel `?? 0` en previsión**: `{{ data()!.snowNew24hCm ?? 0 }} cm` | `pages/weather/components/tiempo-now-panel/tiempo-now-panel.component.ts:31` (OBSERVADO con `Select-String`) | Si el componente se reutiliza, se corrige a `formatMeasurement`. En caso contrario se crea sustituto. | **alta** (viola 05b §3.2) |
| R3 | **Webcams con `snapshotUrl`**: `WebcamItem.snapshotUrl`, `TiempoWebcamsGridComponent`, `webcam-timeline` | `pages/weather/models/meteo.models.ts`, `pages/weather/components/` | No se usan en snow (P2). | alta (licencia) |
| R4 | **`<html lang="en">`** con contenido en español | `web-ssr/src/index.html` | Snow sirve `lang` por ruta (§6.1); el resto del sitio queda fuera de alcance y se anota. | media |
| R5 | **Iconos por Google Fonts** (tercero, bloqueante) | `web-ssr/src/index.html` (`fonts.googleapis.com/icon`) | Snow no añade iconos por fuente; usa glifos Unicode + SVG en línea. | media |
| R6 | **`data-i18n="…"` sin motor** en filtros (`stations-filters`: regiones hardcodeadas, sin sistema montañoso ni disciplina) | `pages/stations-list/components/stations-filters/` | Exploradora B nueva con `@ngx-translate` y filtros de 02 §1 (país, sistema, disciplina, estado). | media |
| R7 | **Filtros de región de España solo** (5 regiones) pese a que el dominio cubre ES/AD/FR/PT | `stations-filters.models.ts` (`Region` union) | Modelo nuevo de país/sistema. | media |
| R8 | **8 `.spec.ts` sin runner**: no hay target `test` (00b C2) | `web-ssr/src/app/**` | Tarea de t9/t12; aquí solo se exige que el código nuevo sea testeable (funciones puras, sin HttpClient en UI). | alta (proceso) |

### 10.5 SSR y seo: qué tiene que estar en el HTML inicial

Obligatorio en la primera respuesta HTTP (sin JS), por pantalla: `<h1>`, `<title>`, `meta
description`, `link rel=canonical`, `og:*`, `twitter:card`, JSON-LD (§5.3 del apartado SEO de esta
misma sección), franja de estado global o bloque `nodata` con su frase, lista de estaciones de la
exploradora (primera página), y enlaces de webcam. **Prohibido** servir una cáscara vacía y rellenar
todo en cliente: duplica el trabajo y deja sin contenido a los rastreadores.

Implementación: `RenderMode.Server` ya está para `**` (`app.routes.server.ts`, OBSERVADO). Los datos se
resuelven en el `resolver`/`loadComponent` del servidor con `provideServerRendering`; el cliente
rehidrata el mismo estado (`TransferState`) **sin volver a pedir** lo que ya vino (§7.1).

Este apartado **SEO** (título, canonical, JSON-LD, sitemap) se especifica en §11.

---

## 11. SEO/SSR (pantallas A–G) — D3, D4, D5

| Ruta | `<title>` | `description` | canonical | JSON-LD |
|---|---|---|---|---|
| `/` | `Parte de nieve de hoy — {sitio}` | «Estado de apertura, espesores y previsión de {n} estaciones de España, Andorra, Francia y Portugal, con la fuente de cada dato.» | `/` | `Dataset` + `WebSite` |
| `/parte-de-nieve` | `Parte de nieve completo — {fecha}` | igual, con fecha | `/parte-de-nieve` | `Dataset` |
| `/estaciones` | `Estaciones de esquí y de fondo` | «Explora {n} estaciones por país, sistema montañoso, estado de apertura y espesor de nieve.» | `/estaciones` (sin query) | `ItemList` (solo si orden por defecto) |
| `/estaciones?sistema=…&orden=…` | idem + « — {filtro}» | idem | `/estaciones` + `noindex, follow` si filtros > 1 | — |
| `/estaciones/{slug}` | `{estación}: parte de nieve y estado de pistas` | «Parte de {fecha}: espesores, pistas y remontes abiertos, previsión y boletín de aludes de {estación}.» | `…/estaciones/{slug}` | `SportsActivityLocation` + `BreadcrumbList` + `Dataset` |
| `/webcams` | `Webcams de estaciones de esquí` | «Directorios de cámaras con enlace al titular y su atribución.» | `/webcams` | `BreadcrumbList` |
| `/meteorologia` | `El tiempo en las estaciones de esquí` | «Previsión por cota, cota de nieve y avisos, con AEMET y Météo-France.» | `/meteorologia` | `BreadcrumbList` |
| `/estaciones/{slug}/tiempo` | `El tiempo en {estación}: previsión 72 h` | … | `…/tiempo` | `BreadcrumbList` |
| `/mapa` | `Mapa de estaciones y nieve` | «Mapa de {n} estaciones con su estado y enlaces a su parte.» | `/mapa` | `BreadcrumbList` |
| `/comparar?slugs=…` | `Comparar estaciones` | «Compara hasta 3 estaciones: espesores, pistas abiertas, previsión y procedencia de cada dato.» | `/comparar` (sin slugs) | — (`noindex, follow`: combinatoria) |
| `**` (404) | `No encontramos esta página - {sitio}` | — | — | — (HTTP 404 + página) |

Reglas:

1. **`keywords` prohibido** (D3). `robots` solo vía `Meta` de Angular y en minúsculas.
2. El canonical de B **descarta** la query filtrada (evita duplicados infinitos por combinatoria); las
   variantes con más de un filtro activo van `noindex, follow`.
3. `hreflang` **no** se emite todavía: el producto hoy es `lang="es"` y no hay URLs por idioma
   implementadas (F22 sin implementar). Crear `hreflang` sin variantes reales es peor que no tenerlo.
   Queda nota para cuando F22 exista.
4. **Titles en español con `{sitio}`** y sin keyword-stuffing; longitud objetivo ≤ 60 caracteres con
   los datos disponibles (verificado por test, no por ojo).
5. Atribución de licencias **también** en el pie de cada página: un párrafo «Fuentes y licencias» que
   enlace a `/fuentes` (contenido editorial propio, fuera de t8).
6. El 404 debe devolver **HTTP 404 real**, no un 200 con texto (D6). Para SSR esto significa que el
   componente de error debe fijar el código de respuesta (`REQUEST`/`RESPONSE` token) — requisito
   explícito para t8.
7. `sitemap.xml` y `robots.txt`: los genera t7/t10 desde el maestro; aquí solo se define que las rutas
   con `noindex` **no** aparecen.

---

## 12. Verificación ejecutada (resultados reales, 2026-11-16)

Todo lo que sigue se ejecutó en esta máquina, con Node 24.18.0 y el TypeScript 5.9.2 del repo
(`node_modules/typescript/bin/tsc`, la versión que instala `npm ci`). Los `exit code` son los que
devolvió el proceso.

### 12.1 Contraste, viewport y glifos

```text
$ node scripts/snow/ux/check-a11y-contrast.mjs --report
par                          fg       bg       ratio   min   SC
… (41 filas, ver tabla abajo)
pares evaluados:       41
peor ratio:            4.84:1 (stale)
viewport correcto:     1 aparición(es)
tokens doc/styles.css: 50 / 46
RESULT: pass                                   exit 0
```

Tabla completa (peor ratio por token, calculada con `scripts/snow/ux/token-table.mjs`, misma fórmula
que el verificador):

| Token | Valor | Alias de `styles.css` | Peor ratio medido contra su par |
|---|---|---|---|
| `--ux-text` | `#404040` | `--neutral-700` | 9.51:1 sobre `#f5f5f5` |
| `--ux-text-muted` | `#525252` | `--neutral-600` | 7.17:1 sobre `#f5f5f5` |
| `--ux-link` | `#0369a1` | `--primary-700` | 5.93:1 sobre blanco |
| `--ux-focus` | `#0369a1` | `--primary-700` | 5.68:1 sobre `#fafafa` |
| `--ux-on-primary` | `#ffffff` | — | 5.02:1 sobre `#15803d` (peor de los rellenos) |
| `--ux-provenance-official-fg` | `#0369a1` | `--primary-700` | 5.57:1 sobre `#f0f9ff` |
| `--ux-stale-fg` | `#b45309` | `--warning-700` | 4.84:1 sobre `#fffbeb` |
| `--ux-error-fg` | `#b91c1c` | `--error-700` | 5.91:1 sobre `#fef2f2` |
| `--ux-ava-1-fg` | `#0369a1` | `--primary-700` | 5.57:1 sobre `#f0f9ff` |
| `--ux-ava-2-fg` | `#b45309` | `--warning-700` | 4.84:1 sobre `#fffbeb` |
| `--ux-ava-3-fg` | `#ffffff` | — | 5.02:1 sobre `#b45309` |
| `--ux-ava-4-fg` | `#ffffff` | — | 6.47:1 sobre `#b91c1c` |
| `--ux-ava-5-fg` | `#ffffff` | — | 17.93:1 sobre `#171717` |
| `--ux-dark-text` | `#f5f5f5` | — | 16.44:1 sobre `#171717` |
| `--ux-dark-text-muted` | `#a3a3a3` | `--neutral-400` | 6.00:1 sobre `#262626` |
| `--ux-dark-link` | `#38bdf8` | `--primary-400` | 8.37:1 sobre `#171717` |
| `--ux-dark-focus` | `#bae6fd` | `--primary-200` | 11.40:1 sobre `#262626` |
| `--ux-dark-border` | `#e5e5e5` | — | 12.01:1 sobre `#262626` |
| `--ux-dark-provenance-editorial-fg` | `#ffffff` | — | 10.37:1 sobre `#404040` |
| `--ux-dark-stale-fg` | `#ffffff` | — | 10.37:1 sobre `#404040` |
| `--ux-dark-nodata-fg` | `#a3a3a3` | `--neutral-400` | 7.11:1 sobre `#171717` |
| `--ux-dark-blocked-fg` | `#ffffff` | — | 15.13:1 sobre `#262626` |
| `--ux-border-strong` | `#0369a1` | `--primary-700` | 5.93:1 sobre blanco |
| `--ux-state-open-bg` | `#15803d` | `--success-700` | 5.02:1 sobre blanco |
| `--ux-state-closed-bg` | `#b45309` | `--warning-700` | 5.02:1 sobre blanco |

Ratios de referencia que justifican decisiones (calculados, no citados de memoria):

| Combinación | Ratio | Consecuencia |
|---|---|---|
| blanco sobre `--primary-600` (#0284c7) | 4.10:1 | Por eso el botón primario **no** usa el extremo claro del degradado |
| blanco sobre `--primary-400` (#38bdf8) | 2.14:1 | Idem |
| blanco sobre `--primary-700` (#0369a1) | **5.93:1** | Relleno elegido |
| `--primary-200` sobre blanco | **1.33:1** | `--focus-ring` del sistema **descartado** |
| blanco sobre coral de la referencia (`#FA8574`) | **1.73:1** | Estado «Cerrada» elegido en `#b45309` (5.02:1) |
| blanco sobre `--success-600` (#16a34a) | 3.30:1 | No se usa para texto; sí `--success-700` (5.02:1) |

### 12.2 Tokens: documento ↔ design system

```text
$ node scripts/snow/ux/extract-ux-tokens.mjs
tokens --ux-* en el documento: 50 (lista blanca: 50)
aliases al design system verificados: 39

RESULT: pass                                   exit 0
```

**Fallo real encontrado durante esta tarea (y corregido en la herramienta, no tapado).** La primera
versión de `extract-ux-tokens.mjs` parseaba todo `styles.css` y reportó **20 FAIL falsos**: decía que
`--neutral-50` valía `#0a0a0a`. La causa es real y merece constar: `styles.css` **redefine** la rampa
`--neutral-*` dentro de `@media (prefers-color-scheme: dark)` (líneas ~829 en adelante), y un parseo
ingenuo se queda con la última declaración. La herramienta ahora corta el fichero en el bloque oscuro
y lee solo el `:root` claro, que es el que documenta la tabla. Consecuencia para t8: **el modo oscuro
del sistema invierte `--neutral-*`, pero no `--primary-*`/`--success-*`/`--error-*`**; por eso el modo
oscuro de snow usa roles `--ux-dark-*` (§5.2) y no retoques de rampa.

### 12.3 View-model compilado con el TypeScript del repo

```text
$ node node_modules/typescript/bin/tsc --noEmit --strict --target es2022 --module esnext \
      --moduleResolution bundler --skipLibCheck --lib es2022 tmp/t6-uxcheck/view-model.ts
exit 0
```

El fichero `tmp/t6-uxcheck/view-model.ts` contiene el preludio de 05b (`LicenseStatus`, `NoDataReason`
y las tres cargas) más §10.3. `tmp/` está en `.gitignore`, igual que en t4.

**Prueba negativa (el contrato tiene dientes):**

```text
$ node node_modules/typescript/bin/tsc … tmp/t6-uxcheck/negative-control.ts
tmp/t6-uxcheck/negative-control.ts(9,39): error TS2339: Property 'text' does not exist on type
  '{ readonly kind: "value"; readonly text: string; } | { readonly kind: "nodata"; }'.
exit 2
```

Es decir: leer el texto de una medición **sin comprobar que existe** es un error de compilación. El
defecto R2 (`?? 0`) no puede reproducirse con este contrato.

### 12.4 Lo que **no** se pudo verificar (declarado, no disimulado)

| Elemento | Por qué | Quién puede verificarlo |
|---|---|---|
| Captura/maqueta de A–G | `nx serve`/`nx build` rotos (00b C1) | nadie hasta arreglar el entorno |
| Zoom 200 %/400 %, reflow 320 px, orden de foco, trampas de foco | requieren navegador | t9 en el entorno con Nx |
| Core Web Vitals (LCP/CLS/INP) | sin bundle no hay medición | fuera de alcance hasta C1 |
| Contraste de contenido real (imágenes, mapas, gráficos) | no existe contenido todavía | t9 + auditoría visual |
| Comportamiento de Leaflet 1.9 con teclado en este repo | sin navegador | t9 |
| Estados poblados (§9.2, §9.3, §9.7) | NO OBSERVADOS en la referencia (00b C6) | cuando exista un parte real (F23 → F02) |

---

## 13. Decisiones — RESUELTAS por el capitán (2026-11-16)

Estas eran decisiones abiertas; el capitán las cerró. **Lo de abajo manda sobre la columna
"Recomendación" anterior, que se conserva tachada para trazar el cambio.**

| # | Decisión final del capitán | Consecuencia vinculante para t8 |
|---|---|---|
| U1 | ✅ `/` es la **home existente** (`pages/home/home`) **extendida** con un bloque de nieve. El panel completo (pantalla A) pasa a ruta propia `nieve/`. Se conserva el hero y la superficie SEO actuales. | No se sustituye `Home`: se extiende. La pantalla A no vive en `/`. |
| U2 | ✅ El comparador es capacidad **nueva: `F25`**, clasificada **NO INICIADA**. `02-feature-matrix.md` **no** lo edita este documento; la fila la añade `re-researcher`. | Se implementa como capacidad (pantalla G), sin tocar la matriz. |
| U3 | ❌ **No.** El admin **no** puede marcar `isOpen` sin espesores. Estado y espesor son campos separados con procedencia separada; "abierta" con espesor desconocido se pinta como **abierta-con-espesor-desconocido**, nunca como `0 cm`. | Ninguna ruta de UI fabrica `0`. |
| U4 | ✅ Exploradora **nueva**; **no** se reescribe `stations-list`. | `snow/pages/explorer` nueva; `stations-list` sigue funcionando. |
| U5 | ✅ Sí se muestra **"último parte con datos" con su fecha**. | Camino de honestidad en A, B y C. |
| U6 | ✅ Snow tiene su **propio namespace i18n** (`snow/es.json`); la lib `i18n` vacía no es prerrequisito. | Sin dependencia del i18n global. |
| U7 | ✅ Arreglar `<html lang="en">` **globalmente**; si una ruta es realmente inglesa, fija su `lang`. | Cambio de un atributo, con nota de alcance global. |

### 13.1 Reglas de estilo de código que el capitán va a comprobar personalmente

1. **No "arreglar" el design system cambiando páginas existentes en silencio.** Los tokens van como
   `--ux-*`. Si se corrige `--focus-ring` o `--gradient-primary` en `styles.css`, es un cambio
   **global** y va **aparte, explícito y con nota**, no metido en un commit de snow.
2. **Todo número pasa por el view-model de §10.3.** Ninguna plantilla lee `.text`/`.value` sin
   estrechar el tipo; el capitán grepeará interpolación numérica sin proteger.
3. **Viewport intacto** en cualquier fichero que se toque (SC 1.4.4).
4. **Estados A–G honestos sin credenciales**: `not_configured` → "Sin datos disponibles"; nunca error,
   nunca tarjeta vacía que parezca rota.
5. **Reutilizar antes de crear**, y decir explícitamente qué se **extendió** y qué se **creó**.
6. **Gate del entorno**: `tsc -p web-ssr/tsconfig.app.json --noEmit` + los dos check scripts; los
   tests sólo cuentan si corren con `node --test --test-isolation=none <ficheros>`.


---

## 14. Checklist de aceptación para t8 (y para t10)

- [ ] A–G existen como rutas SSR; `**` → 404 con **HTTP 404 real**, mensaje, buscador y 3 sugerencias.
- [ ] Ningún `?? 0` / `|| 0` en datos de nieve, km, remontes (§10.2 P1).
- [ ] `formatMeasurement` es la única vía de medida→texto y tiene test del caso `null`, `-1`, `-99`,
      `NaN` (§10.3).
- [ ] Cero `img`/`iframe` de webcam; solo `ImageGrant.linkUrl` (§10.2 P2).
- [ ] Cero tiles de OSM público; PMTiles con atribución; sin `PROTOMAPS_BASE_URL` el mapa degrada
      (§9.6, §8.2).
- [ ] Viewport sin restricciones; `lang` correcto por ruta; `focus-visible` con `--ux-focus`.
- [ ] Tablas semánticas con `caption`/`scope`/`aria-sort`; móvil = CSS, no duplicado (§6.3).
- [ ] Las 5 frases de §7.2 literales, en i18n, con test.
- [ ] `--ux-tokens.css` generado con `extract-ux-tokens.mjs --emit` (no escrito a mano) y ambos
      scripts en verde en CI.
- [ ] `prefers-reduced-motion` respetado también en ECharts/Leaflet (no solo en CSS).
- [ ] `nx` no se usa como gate: el gate es `tsc -p web-ssr/tsconfig.app.json --noEmit` (00b C1).

---

## 15. Artefactos de esta tarea

| Fichero | Qué es | Ejecutado |
|---|---|---|
| `docs/snow/07-ux-ui.md` | Este documento | — |
| `scripts/snow/ux/check-a11y-contrast.mjs` | Verificador WCAG real (contraste, viewport, glifos) | sí, exit 0 |
| `scripts/snow/ux/extract-ux-tokens.mjs` | Contrato de tokens doc↔`styles.css`; `--emit` genera el CSS | sí, exit 0 |
| `scripts/snow/ux/token-table.mjs` | Calcula los ratios que cita §12 | sí |
| `tmp/t6-uxcheck/view-model.ts` | §10.3 compilado con el tsc del repo | sí, exit 0 |
| `tmp/t6-uxcheck/negative-control.ts` | Prueba negativa: el bug de sentinelo debe fallar | sí, exit 2 (esperado) |

Los tres scripts no añaden dependencias (`node:` builtins) y son de solo lectura sobre el repo salvo
`--emit`, que imprime por stdout.
