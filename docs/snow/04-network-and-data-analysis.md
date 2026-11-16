# FASE 1 — Análisis de red y de datos de la referencia

Pregunta del encargo: **¿de dónde saca infonieve.es los datos, y hay una API que podamos consumir?**

Respuesta corta: **en las páginas capturadas no hay API de datos observable.** El HTML llega completo
en la primera respuesta y el tráfico no documental es analytics y publicidad. Por tanto **no hay nada
que consumir legítimamente desde el sitio público**, y el producto propio **no puede depender de
infonieve** como fuente (además del bloqueo legal de 05: `aviso-legal/` §3/§5, sin autorización
expresa). Los datos propios vienen de los proveedores autorizados de `05-provider-registry.md`.

Este documento aporta las **cuentas y transacciones** que sustentan esa conclusión. No se inventa
ninguna API.

---

## 1. Método

- REA `capture_browser_scenario` (Chromium 157, launch, headless), `locale es-ES`,
  `timezone Europe/Madrid`, `service_workers: block`.
- Captura instrumentada con **cuerpos** de petición y respuesta (`network.request_body` y
  `network.response_body`): **N1**, Evidence ID
  `ev_ead04c7b4ce3210eaa3266cd6ec826b30163b8b2c304d083679f9e26723cd7c5`, URL
  `https://www.infonieve.es/estaciones-esqui/`, 1440×960, `duration_ms = 7852`.
- Inventario generado con `node scripts/snow/summarize-capture.mjs <spill> --extract …`, que reconstruye
  una fila por `transaction_id` a partir de los eventos REA (`request`, `response`, `request-finished`,
  `network-content`).

**Limitación declarada por REA (y aplicada):** los bytes de `Response.body()` de Playwright pueden
venir de una recarga autenticada de la URL; por eso aquí se usa el cuerpo **solo para clasificar el
tipo de respuesta** (`content-type`) y el tamaño, **nunca como prueba de valores de datos**.

---

## 2. La observación clave

`estaciones-esqui/` es el directorio completo de estaciones alpinas, con 82 filas de tabla de datos,
estado por estación, km, pistas, nieve, meteo y webcams. Si hubiera una API de datos, **esta** página
la llamaría.

**No lo hizo.**

---

## 3. Resultado de N1 (`/estaciones-esqui/`)

```
evidence_id:  ev_ead04c7b4ce3210eaa3266cd6ec826b30163b8b2c304d083679f9e26723cd7c5
url:          https://www.infonieve.es/estaciones-esqui/
duration_ms:  7852 ; transactions: 68 ; events: 340 ; retained: 340
by type:      {"document":1,"stylesheet":11,"script":11,"image":41,"font":1,"fetch":1,"other":2}
by status:    {"200":67,"204":1}
hosts (7):    {"www.infonieve.es":61,"fonts.googleapis.com":1,"www.googletagmanager.com":1,
               "www.googletagservices.com":1,"fonts.gstatic.com":1,
               "securepubads.g.doubleclick.net":2,"region1.google-analytics.com":1}
failures/4xx-5xx: 0
```

### 3.1 Inventario por tipo (68 transacciones)

| Tipo | N | Qué son |
|---|---:|---|
| `document` | 1 | El HTML de la página (ya con todas las filas). |
| `stylesheet` | 11 | 8 hojas `css/*_v460.css` + `fonts.googleapis.com/css` + 2 de cookieconsent. |
| `script` | 11 | jQuery, dragscroll, `funciones.*_v460.js`, cookieconsent, GTM, GPT, `gpt.js`. |
| `image` | 41 | Iconos SVG (26), logos SVG/PNG (7), **iconos meteo `images/meteo/svg-dark/dNNNN.svg`** (8). |
| `font` | 1 | `fonts.gstatic.com` (Open Sans). |
| `fetch` | 1 | `POST https://region1.google-analytics.com/g/collect` → **204** (analytics, no datos). |
| `other` | 2 | `securepubads.g.doubleclick.net/pagead/managed/dict/…/gpt` y `favicon_infonieve.ico`. |

### 3.2 Candidatos "API" y por qué ninguno lo es

El script marca como candidatos cualquier cosa no `document/script/stylesheet/font/image/media` o con
JSON/XML en URL o `content-type`. Salieron **43**: **41 son SVG** (icons/logos/meteo), **1 es la GA
`collect`** (204, sin cuerpo) y **1 es el diccionario comprimido de Google Ad Manager** (`text/plain`,
64 597 B, infraestructura de anuncios, no datos de estaciones).

**Endpoints de datos propios (`/api`, `.json`, `xhr`, `fetch` a infonieve): 0.**

### 3.3 Lo que esto demuestra y lo que no

- **Demuestra:** en esta página, en este navegador, en este momento, **la información de estaciones
  llegó dentro del documento HTML**; no hubo llamada XHR/fetch al dominio propio.
- **No demuestra** (y no lo afirmamos): que no exista API **con contrato comercial** — existe, como
  producto de pago, en `recursos/` (widgets y APIs). Que la exista no la hace utilizable: requiere
  contrato, y el sitio en sí no la expone al navegador.

---

## 4. Los ficheros de red heredados no contienen datos

Los `*.network.json` / `*.network-api.txt` de las capturas del lead tienen **2 bytes (`[]`) y 0 bytes**
respectivamente: son ficheros vacíos. Es decir, **aquellas capturas no tenían eventos de red**, y
cualquier conclusión basada en ellos sería un artefacto del proceso, no una observación. Por eso la
afirmación "no hay API" se basa **solo en N1**, que sí trae 68 transacciones y 340 eventos.

| Fichero | Bytes | Estado |
|---|---|---|
| `home-desktop-1440.network.json` | 2 | vacío (`[]`) — no usar |
| `home-mobile-430.network.json` | 2 | vacío — no usar |
| `parte-de-nieve-desktop-1440.network.json` | 2 | vacío — no usar |
| `estacion-baqueira-parte-desktop-1440.network.json` | 2 | vacío — no usar |
| `*.network-api.txt` (5 ficheros) | 0 | vacíos — no usar |
| `estaciones-esqui-desktop-1440.network.json` | 17 353 | **válido**: 68 transacciones (N1) |

---

## 5. Qué significa esto para nuestro diseño

1. **Sin dependencia del sitio de referencia:** nuestro módulo `snow/*` no puede leer los datos de
   infonieve (ni técnicamente con XHR, ni legalmente por `aviso-legal/` §3/§5). La vía es proveedor
   autorizado (AEMET, Météo-France, SMC Andorra, IPMA, operadores de estación…) según 05.
2. **Sin scrapers:** ni en tiempo real ni en build. Prohibido por la referencia y frágil como
   ingeniería.
3. **Una API propia, documentada:** exponer `/api/snow/**` desde `web-ssr/src/server.ts` (Express ya
   presente) es una **mejora** sobre la referencia, no una paridad. Debe tener contrato, validación de
   esquema y caché acorde a la licencia del proveedor (05 §4).
4. **El coste real del producto es la ingesta**, no el HTML: hay que implementar adaptadores por
   proveedor, normalización a un modelo propio, caché y marca de procedencia/antigüedad por campo.
5. **La referencia no es una fuente de datos ni de licencia**; lo único que aporta es **qué pantallas
   existen y cómo se comportan** (01/02). Su CSS/HTML/imágenes tampoco se reutilizan.

---

## 6. Comportamiento de la red que sí conviene replicar (mejorado) o evitar

| Observado en la referencia | Nuestra posición |
|---|---|
| 1 documento con todo el HTML (SSR puro) | **Replicable conceptualmente**: nuestro `web-ssr` ya es SSR (`RenderMode.Server` para todas las rutas). |
| 11 scripts + jQuery en todas las páginas | **Evitar**: Angular standalone ya instalado; sin jQuery. |
| Analytics `g/collect` (204) | Usar la lib `analytics` propia (hoy vacía) con consentimiento. |
| Google Ad Manager + `setTargeting(…)` con ids internos (`estacion=16`, `in_pais=1`) | **No** copiar la publicidad; nada de terceros en el HTML propio. |
| `preconnect`/`compression-dictionary` de Google | Irrelevante para nosotros. |
| Iconos meteo como **SVG estáticos** `dNNNN.svg` | Podemos usar iconografía propia del design system (no reutilizar los suyos). |

---

## 7. Reproducción

```bash
# Captura con cuerpos (REA MCP capture_browser_scenario):
#   capture.network = { request_body: true, response_body: true }
#   capture.at_end = ["url"] (sin screenshot/dom para limitar el spill)
# Resumen:
node scripts/snow/summarize-capture.mjs <spill.txt>
```

El spill de N1 pesa ~1,2 MB porque incluye iconos en base64; el resumen (transacciones por tipo, hosts,
estados, candidatos) es lo que se cita en §3.
