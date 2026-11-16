# FASE 1 — Inventario de referencia (infonieve.es)

Referencia: `https://www.infonieve.es/` · Fecha de captura: **2026-11-16** (Europe/Madrid) ·
Herramienta: REA 6.8.0, proveedor `rea-playwright-browser-scenario`, Chromium 157 headless,
launch mode. Colaborador: re-researcher (t2). Sin despliegue en ningún momento.

Este documento describe **qué existe y cómo se comporta en la referencia**, no qué vamos a construir.
La matriz de capacidades propias (02), las evidencias (03), el análisis de red (04) y el registro
de proveedores (05) son documentos separados.

---

## 0. Reglas de lectura de este documento

Cada afirmación lleva una etiqueta:

| Etiqueta | Significado |
|---|---|
| **OBSERVADO** | Visto en un DOM/HTML capturado por REA, con su `sha256` en §11 o su Evidence ID en `03-rea-evidence.md`. |
| **INFERIDO** | Deducción razonable a partir de lo observado (p. ej. "parece PHP" a partir de `buscar.php`), no comprobada internamente. |
| **NO VERIFICABLE** | No podemos comprobarlo desde fuera (código interno, base de datos, contrato comercial, comportamiento con licencia de pago). |
| **MEJORA PLANIFICADA** | Comportamiento que **no** copiamos: dónde la referencia falla y qué hará el producto propio distinto. |

**Regla legal vinculante (de `05-provider-registry.md`, t3/t11):** la referencia es **solo referencia
UX/funcional**. `aviso-legal/` §3 y §5 prohíben la reutilización sin autorización expresa. **Ningún
dato, HTML, CSS, imagen, texto ni icono de infonieve se ingiere en nuestro producto.** Los nombres de
campo, columnas y secciones se documentan aquí para entender la paridad funcional; los valores que se
muestren en nuestro producto vienen exclusivamente de los proveedores autorizados de 05.

---

## 1. Resumen ejecutivo

- Sitio **clásico renderizado en servidor** (HTML completo en la primera respuesta), con jQuery y un
  stack de publicidad/analytics en todas las páginas.
- **No se observó ninguna API JSON** en las páginas capturadas: ver `04-network-and-data-analysis.md`.
  La aplicación es *server-rendered* y el único tráfico no documental es analytics y publicidad.
  **INFERIDO:** los datos se resuelven en el servidor; **NO VERIFICABLE:** cómo los obtiene.
- Cobertura de catálogo observada: **90 estaciones en el parte diario** (60 alpinas `estacion-esqui` +
  30 nórdicas `espacio-nordico`), agrupadas por **sistemas montañosos** en 4 países (ES, AD, FR, PT).
- El sitio estaba, en la fecha de captura, **en pretemporada**: parte del `Lunes 16 de Noviembre`,
  todas las estaciones en estado **Cerrada** (`#FA8574`) y los rankings **sin datos**. Esto importa:
  es justo **el estado vacío** que hay que diseñar bien, y la referencia lo hace mal (§9).
- **Defectos de referencia que se convierten en requisitos de mejora** (accesibilidad, SEO, estados
  vacíos, sin API): §9.

---

## 2. Mapa de navegación observado

Navegación de cabecera (presente en todas las páginas capturadas — **OBSERVADO**):

| Elemento | URL | Capturado |
|---|---|---|
| Logo / portada | `/` | ✅ `home-desktop-1440`, `home-mobile-430` |
| Parte de nieve | `parte-de-nieve/` | ✅ `parte-de-nieve-desktop-1440` |
| Webcams | `sala-de-webcams/` | ✅ `sala-de-webcams-desktop-1440` |
| Estaciones esquí | `estaciones-esqui/` | ✅ `estaciones-esqui-desktop-1440` |
| El tiempo | `meteo/` | ✅ `meteo-desktop-1440` |
| Mapa de webcams | `mapa-de-webcams/` | ✅ `mapa-de-webcams-desktop-1440` |
| Esquí de fondo | `esqui-de-fondo/` | ❌ **observado en navegación, página no capturada** |
| #infonieve (muro social) | `muro-social/` | ❌ **observado en navegación, página no capturada** |
| Mis estaciones favoritas | control `#barbox_tools_fav` (sin href; favoritos en cliente) | ⚠️ **OBSERVADO** como control con texto "Aun no has marcado ninguna estación como favorita" |
| Buscar estación | `buscar.php?query=…` (GET) | ❌ **observado en navegación, página no capturada** |

Pie de página (**OBSERVADO** en todos los DOM; enlaces parcialmente sin capturar):

- Estaciones: `estaciones-esqui/pais/espana/` ✅ · `/andorra/` ❌ · `/pirineo-frances/` ❌ · `/portugal/` ❌
- `estaciones-esqui/fecha-inicio-fin-temporada/` ✅
- Parte de nieve: `parte-de-nieve/top-nieve/` ✅ · `top-km/` ✅ · `aludes/` ✅ · `usuarios/` ❌ ·
  `publicar/` ✅ · `snowparks/` ❌ · `skimo/` ❌ · `itinerarios-raquetas/` ❌ · `pistas-trineos/` ❌
- Webcams: `sala-de-webcams/reg/alpes/`, `/reg/norteamerica/`, `/reg/sudamerica/`, `/reg/oceania/`,
  `/reg/africa/`, `sala-de-webcams/donde-esta-nevando/` ❌ (todas vistas en navegación)
- Legal: `contacto/`, `publicidad/`, `aviso-legal/`, `privacidad/`, `cookies/` ❌ (contenido legal
  verificado por t11; cabeceras capturadas bajo `ev_dfca13…`, ver 03)
- `recursos/` (widgets y **APIs** comerciales) ❌ — su existencia está establecida por t3/t11; ver 05

**NO VERIFICABLE:** si existe alguna página no enlazada desde la navegación.

---

## 3. Catálogo de estaciones (**OBSERVADO**)

Fuente: `parte-de-nieve-desktop-1440.dom.txt` (`node scripts/snow/analyze-dom.mjs <file> --mode=parte`).

- **90 filas de parte**: `estacion-esqui` ×**60**, `espacio-nordico` ×**30**.
- **14 sistemas montañosos** en el índice de áreas (24 grupos repetidos por sección alpina/nórdica):
  Pirineo Catalán, Pirineo Aragonés, Pirineo Navarro, Cordillera Cantábrica, Sistema Ibérico,
  Sistema Central, Sistema Penibético, Andorra, Pyrénées Atlantiques, Hautes Pyrénées, Haute Garonne,
  Ariège Pyrénées, Aude, Neiges Catalanes, Portugal.
- **Países**: España, Andorra, Pirineo Francés, Portugal.
- `estaciones-esqui/` (lista alpina) muestra **82 filas** de tabla en 14 tablas y una lista aparte
  "Otras estaciones cerradas o no operativas" con 4 entradas observadas (Lunada, Puigmal 2900,
  Puyvalador, Vallnord) — **OBSERVADO**.
- Los `select` de "elegir estación" del meteo contienen **100 opciones** (alpino) y **16** (fondo) —
  **OBSERVADO**; los `value` de esas opciones son **URLs** (p. ej.
  `https://www.infonieve.es/espacio-nordico/beille/meteo/`) — **OBSERVADO**.

**Importante para nuestro producto:** este catálogo (90 estaciones, con sus nombres y sistemas) es
**dato de referencia, no dato de origen**. Nuestro maestro de estaciones debe venir de IGN/CNIG,
IGN Francia, operadores y proveedores autorizados (05 §2.6–2.7, §2.15). Podemos usar la lista de
**sistemas montañosos** como estructura editorial propia (son nombres geográficos públicos).

---

## 4. Pantallas capturadas y su anatomía

### 4.1 Portada — `home-desktop-1440`, `home-mobile-430`
**OBSERVADO:** sin `<h1>` (defecto, §9); 6 imágenes `.webcam`; canonical `https://www.infonieve.es/`;
bloques de navegación, buscador, franjas publicitarias `div-banpub-…`, iframe de viajes
(`viajes.infonieve.es`), pastillas de estaciones destacadas.

### 4.2 Parte de nieve — `parte-de-nieve-desktop-1440`
**OBSERVADO:**
- `<h1>Parte de Nieve</h1>`, `<h3>Estado actual de apertura y de la nieve…</h3>`.
- Tabla por sistema montañoso. **Columnas**: `Estación | Estado | Remontes | Pistas` (**`Circuitos`
  en la sección nórdica**) `| Kilómetros | Nieve | Meteo`.
- Celda **Estado** = pastilla con **color hexadecimal por estado** en `style` y `title` textual
  (`background-color:#FA8574; title="Cerrada"`), con forma larga `Cerrada` y corta `C` para móvil.
- Celda **Remontes/Pistas/Kilómetros**: `abiertos/total` (p. ej. `-/25`, `-/140`, `-,/112,5`),
  con `-` cuando no hay dato.
- Celda **Nieve**: `- CM`.
- Celda **Meteo**: icono (fichero `images/meteo/svg-dark/dNNNN.svg`) + mín/máx; el código `dNNNN`
  **parece** un identificador de condición meteorológica (**INFERIDO**; no está documentado).
- Sello por estación "Actualizado el Lunes 16 de Noviembre" y sello de página
  "Actualizado el 16/11/26 05:45" (**OBSERVADO** en capturas previas del lead, ver 03).
- Cabecera de la tabla repetida **por cada grupo**, con scroll horizontal y submenú `dragscroll`.

**MEJORA PLANIFICADA:** mostrar solo filas con dato real y un estado global claro de pretemporada;
sello de actualización por dato (no por página) con zona horaria explícita.

### 4.3 Detalle de estación — `estacion-baqueira-parte-desktop-1440`, `…-tablet-768`
**OBSERVADO:**
- `<h1>Baqueira Beret</h1>`, `<h3>Parte de Nieve</h3>`; `canonical = …/estacion-esqui/baqueira-beret/parte-de-nieve/`.
- Pestañas de estación: **La estación · Parte de Nieve · Webcams · El Tiempo · Plano de Pistas · Ficha Técnica**
  (URLs `…/parte-de-nieve/`, `…/webcams/`, `…/meteo/`, `…/plano-de-pistas/`, `…/ficha-tecnica/`).
- Sub-pestañas del parte: **Parte actual · Partes de usuarios · Publicar parte · Histórico de apertura y nieve**
  (`…/partes-usuarios/`, `…/partes-publicar/`, `…/historico-nieve/`).
- Bloques: estado (mín/máx espesor, calidad, peligro de aludes), **Pistas y Remontes** (dona abiertos/total),
  **Desglose por tipo** (Verdes/Azules/Rojas/Negras/Itinerarios), **Actividades** (p. ej. Esquí de fondo con
  estado Cerrado), **Sectores** (Baqueira, Beret, Bonaigua, Baciver) con estado por sector, **Meteo 3 días**
  (Hoy/Mañana/Miércoles con `-4º / 11º`), **Webcams en directo (21)** con atribución `© roundshot.com`,
  **Fechas temporada** (`APERTURA 28/11/2026` + "Apertura sin confirmar", `CIERRE 04/04/2027`),
  **Partes de nieve de usuarios** (estado vacío: "No hay partes de nieve recientes publicados por los usuarios").
- Contadores laterales: WEBCAMS · PREVISIÓN METEO · FICHA TÉCNICA · PLANO DE PISTAS.
- **Tablet 768×1024:** mismo contenido servido; **OBSERVADO** que no hay DOM alternativo (mismo HTML,
  mismas clases `box_l_`/`box_m_`/`div_m_fila`), es decir el layout responsive se resuelve por CSS
  (**INFERIDO**: clases de maqueta por breakpoint).

### 4.4 Directorio — `estaciones-esqui-desktop-1440`, `pais-espana-desktop-1440`
**OBSERVADO:**
- `<h1>Estaciones de esquí</h1>`; tabla con **columnas distintas al parte**:
  `Estación | Estado | Km. abiertos | Pistas | Nieve | Meteo | Webcams`.
- Agrupación por sistema montañoso (`div.listado_cord > a`), país (`div.listado_pais > a`).
- **No hay controles de filtrado ni ordenación** visibles en el DOM: 0 `<select>`, 4 `<input>` (todos del
  buscador). **MEJORA PLANIFICADA:** filtros por país/sistema/estado/nieve y ordenación accesible.
- `pais/espana/`: 39 filas en 6 tablas; **no** declara canonical — **OBSERVADO**.

### 4.5 Meteo — `meteo-desktop-1440`
**OBSERVADO:** `<h1>El Tiempo</h1>`; **2 `<select>`** (Seleccionar… + 16 y 100 opciones que son URLs de
estación); 8 imágenes `.webcam`; sin tablas propias (el detalle de pronóstico vive en la página de estación
`/estacion-esqui/<slug>/meteo/`, no capturada).

### 4.6 Webcams — `sala-de-webcams-desktop-1440`
**OBSERVADO:** `<h1>Sala de Webcams</h1>`; 24 cámaras enlazadas a su estación; **orígenes de imagen**:
`www.infonieve.es/webcams/<estacion>-<camara>_YYYY-MM-DD-HH-MM-NNN.jpg` (13), `webtvpicture.feratel.com` (5),
`webtvhotspot.feratel.com` (5), `funiviecampiglio.it` (1). **Atribución por cámara** en
`salawebcams_author`: `© feratel.com, © astun.com, © 3cat.cat, © featel.com, © viewsurf.com,
© panomax.com, © roundshot.com, © funiviecampiglio.it`. Secciones temáticas observadas
(`sala-de-webcams/tem/snowparks/`, `/tem/glaciares-de-verano/`) y regionales (`/reg/…`).

**Aviso legal para nosotros:** las imágenes de terceros tienen **sus propios titulares**; nuestro
producto **no** puede reutilizarlas. La vía legítima es solicitar feed al proveedor de cámara o enlazar
con atribución explícita (05 §2.15). **MEJORA PLANIFICADA:** atribución estructurada por cámara + enlace
al titular + `rel="noopener"`, y estado "cámara no disponible" en vez de `onerror` silencioso.

### 4.7 Mapa de webcams — `mapa-de-webcams-desktop-1440`
**OBSERVADO:** `<h1>Mapa de Webcams</h1>`; Leaflet (`leaflet-container`, controles de zoom y
pantalla completa); **tiles de OpenStreetMap** (`https://{a,b,c}.tile.openstreetmap.org/6/…png`),
atribución "Leaflet | © OpenStreetMap contributors"; `select` de mapa por estaciones.
**Aviso:** el uso de `tile.openstreetmap.org` en producción comercial está prohibido (05 §2.10);
nuestro producto usará PMTiles autohospedado (05 §2.11).

### 4.8 Aludes — `aludes-desktop-1440`
**OBSERVADO:** `<h1>Peligro de Aludes</h1>`; mapa Leaflet con tiles OSM; **leyenda de escala europea
de 5 niveles** (`1. Débil, 2. Limitado, 3. Notable, 4. Fuerte, 5. Extremo`) con texto de estabilidad del
manto y probabilidad de desencadenamiento; tabla `Nivel de Peligro | Icono | Estabilidad | Probabilidad`.
**NO OBSERVADO** en esta captura: marcadores por estación (el mapa se veía sin pines en el DOM parcial).

### 4.9 Fechas de temporada — `fechas-temporada-desktop-1440`
**OBSERVADO:** `<h1>Fechas de apertura y cierre</h1>`; tabla actual (64 filas) `Estación | Apertura | Cierre`
con valor **"sin determinar"** fuera de fecha, y **leyenda de 2 estados** (apertura confirmada / fecha
programada sin confirmar); **histórico de 17 temporadas** (2009-2010 … 2025-2026) con fecha de primera
apertura y última cierre y estación que las marcó. Ordenación vía `$.post('estaciones-esqui/fecha-inicio-fin-temporada/', {sort:1, orden:…})`
seguido de recarga (**OBSERVADO**: usa POST a la misma URL y recarga — patrón jQuery, no AJAX de datos).

### 4.10 Rankings — `top-nieve-desktop-1440`, `top-km-desktop-1440`
**OBSERVADO:** `<h1>Estaciones con más nieve</h1>` / `<h1>Top kilómetros abiertos</h1>`, con tabla vacía
(`tbody` sin filas) y aviso **"Actualmente ninguna estación dispone de los datos para generar este ránking."**
Estado vacío correcto en texto, pero la tabla se renderiza con cabecera y sin filas.

### 4.11 Publicar parte — `publicar-desktop-1440`
**OBSERVADO:** `<h1>Publica tu parte de nieve</h1>`; `<form action="parte-de-nieve/publicar/" method="post">`
con: `select` de estación (100 opciones), `select` de fecha (7 días), `textarea` "Estado de la estación",
valoración 1–5 con etiquetas **Penoso / Malo / Aceptable / Bueno / Excelente**, **reCAPTCHA v2**
(`data-sitekey` público), aviso de privacidad y "todos los campos son obligatorios". Regla de negocio
**OBSERVADA**: "Los partes de nieve tendrán una **vigencia de 10 días** a partir de la fecha de estancia".
**Nota:** el `enctype="multipart/form-data"` con `method=post` y sin ficheros es un olor a legado (**INFERIDO**).

### 4.12 Estado 404 — `404-estacion-inexistente-desktop-1440`
**OBSERVADO (decisivo):** pedir `/estacion-esqui/esto-no-existe-xyz/parte-de-nieve/` **redirige a
`/estaciones-esqui/`** y sirve esa página (título "Estaciones de esquí"), **sin mensaje de error**.
Es decir: **no hay estado de error dedicado**, el usuario aterriza en el directorio sin saber por qué.
**MEJORA PLANIFICADA:** 404 real con `state=404`, mensaje, buscador y estaciones sugeridas; y en la app
propia una ruta `**` que renderice una página de error (hoy `web-ssr/src/app/app.routes.ts` no la tiene).

---

## 5. Estados de estación y semántica de datos (**OBSERVADO**)

| Concepto | Observación |
|---|---|
| Estado de parte | Pastilla con color hex por estado; en la captura todos `#FA8574` / `Cerrada` / `C`. |
| Abiertos/total | Formato `abiertos/total` con separador `,` decimal (`112,5`) — formato es-ES. |
| Sin dato | Guion `-` (no 0). Distinguible de "cerrado". |
| Espesores | `- CM` con min/máx en la ficha de estación. |
| Calidad nieve | Texto libre por estación (bloque "Calidad"). |
| Peligro aludes | Escala 1–5 + texto (misma escala europea que §4.8). |
| Fechas temporada | Apertura/cierre + estado (confirmada / sin confirmar) + histórico por temporada. |
| Partes de usuarios | Valoración 1–5 con 5 etiquetas + texto libre, caducidad 10 días, moderación por reCAPTCHA. |
| Webcams | N por estación, con titular y marca de tiempo en el nombre de fichero. |

**MEJORA PLANIFICADA (modelo de datos propio):** `null` explícito ≠ `0`, unidades tipadas, `updatedAt`
por dato con `timezone`, estados enumerados (no colores en `style`), y **procedencia** por campo
(qué proveedor autorizado lo aportó), que la referencia no expone en ningún sitio.

---

## 6. Cobertura geográfica y multilingüe

- **OBSERVADO:** `lang="es"`, `content-language: es`, `Language: Spanish` en todas las páginas.
- Hay un directorio francés hermano enlazado (`pyreneige.fr`) y un valor de idioma en los iframes
  (`&idioma=`), lo que indica **INFERIDO**: variantes de idioma gestionadas por parámetro/sitio hermano.
- **NO VERIFICADO:** si infonieve tiene versión catalán/francés servida desde el mismo dominio.
- Nuestro producto: i18n propia con `@ngx-translate` (ya instalado) y URLs por idioma; la lib `i18n`
  del monorepo está vacía (ver 00 §2).

---

## 7. Responsive observado

- **OBSERVADO:** viewport `width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1,
  user-scalable=no` (**violación WCAG 2.2 1.4.4** — se convierte en requisito de mejora).
- **OBSERVADO:** mismas clases de maqueta (`box_l_`, `box_m_`, `box_s_`, `div_m_fila`) en desktop,
  tablet y móvil; el HTML es idéntico entre `home-desktop-1440` (155 268 bytes) y `home-mobile-430`
  (155 375 bytes) salvo contenido dinámico → el responsive es **CSS puro** (**INFERIDO**).
- **OBSERVADO:** la captura móvil de portada pesa 31 638 bytes de PNG frente a 487 943 del escritorio,
  consistente con un hueco grande bajo el mapa (defecto reportado por el lead).

---

## 8. Componentes de terceros en la página (**OBSERVADO** vía DOM)

`jquery.min`, `dragscroll`, `cookieconsent` (CC), Google Tag Manager (`G-1ZZ37QJFPL`), Google Ad
Manager (`securepubads.g.doubleclick.net`, slots `/1020536/Infonieve_…`), Google reCAPTCHA,
Leaflet + tiles OSM, Google Fonts (Open Sans), y un iframe `viajes.infonieve.es`.
**Consecuencia para nosotros:** ninguno de estos se copia; nuestro producto usa Angular + el design
system propio del monorepo y, si hace falta analytics, la lib `analytics` (hoy vacía).

---

## 9. Defectos de la referencia → requisitos de mejora (MEJORA PLANIFICADA)

| # | Defecto observado | Mejora en nuestro producto |
|---|---|---|
| D1 | `user-scalable=no` y `maximum-scale=1` | Zoom permitido; viewport sin restricciones (WCAG 1.4.4). |
| D2 | Portada sin `<h1>` | Un `<h1>` por página, jerarquía de encabezados correcta. |
| D3 | `<meta name="Keywords">` y `<meta name="Robots">` (mayúsculas) heredados | Metadatos modernos; sin `keywords`; `robots` minúsculas vía API de Angular. |
| D4 | Sin JSON-LD observado en ninguna página capturada | JSON-LD (`Dataset`/`SportsActivityLocation`/`BreadcrumbList`) generado por la lib `seo`. |
| D5 | Sin canonical en directorio, país, meteo, webcams, mapa, rankings, fechas | Canonical en **todas** las rutas indexables. |
| D6 | 404 → redirección al directorio sin mensaje | 404 real con estado, buscador y sugerencias. |
| D7 | Estados vacíos de rankings con tabla vacía | Estado vacío explicativo + motivo (pretemporada) + última actualización. |
| D8 | Sin API pública observada; widget/API de pago (`recursos/`) | API propia `/api/snow/**` documentada, con datos de proveedores autorizados (05). |
| D9 | Imágenes de webcam de terceros embebidas | Enlaces/feeds autorizados con atribución explícita; nunca hotlink sin permiso. |
| D10 | Tiles de OSM público | PMTiles autohospedado (05 §2.11). |
| D11 | Filtros/orden ausentes en el directorio | Filtros y ordenación accesibles y en URL (compartible/SSR). |
| D12 | Sin `aria`/rol claro en tablas hechas con `div` | Tablas semánticas `<table>` o roles ARIA correctos. |
| D13 | Sin `prefers-reduced-motion` (carruseles/animaciones) | Respetar `prefers-reduced-motion`. |
| D14 | Color de estado incrustado en `style` | Tokens del design system + texto/icono (no solo color, WCAG 1.4.1). |

---

## 10. Cobertura: qué está capturado y qué no

| Página | Estado | Artefacto |
|---|---|---|
| Portada (desktop/móvil) | ✅ | `home-desktop-1440.*`, `home-mobile-430.*` |
| Parte de nieve | ✅ | `parte-de-nieve-desktop-1440.*` |
| Detalle estación (desktop/tablet) | ✅ | `estacion-baqueira-parte-desktop-1440.*`, `…-tablet-768.dom.txt` |
| Directorio estaciones | ✅ | `estaciones-esqui-desktop-1440.*` |
| País España | ✅ | `pais-espana-desktop-1440.dom.txt` |
| Meteo | ✅ | `meteo-desktop-1440.*` |
| Sala de webcams | ✅ | `sala-de-webcams-desktop-1440.*` |
| Mapa de webcams | ✅ | `mapa-de-webcams-desktop-1440.*` |
| Fechas apertura/cierre | ✅ | `fechas-temporada-desktop-1440.dom.txt` |
| Top nieve / Top km | ✅ | `top-nieve-desktop-1440.*`, `top-km-desktop-1440.dom.txt` |
| Aludes | ✅ (nice-to-have, hecho) | `aludes-desktop-1440.*` |
| Publicar parte | ✅ (nice-to-have, hecho) | `publicar-desktop-1440.*` |
| 404 | ✅ | `404-estacion-inexistente-desktop-1440.dom.txt` |
| País Andorra / Pirineo Francés / Portugal | ❌ **no capturado** | mismo patrón que `pais/espana/` (**INFERIDO** por URL y navegación) |
| Partes de usuarios | ❌ **no capturado** | enlace en navegación; estado vacío visto en detalle de estación |
| Snowparks, skimo, raquetas, trineos | ❌ **no capturado** | enlaces en navegación de todas las páginas |
| Esquí de fondo | ❌ **no capturado** | menú principal + `select` de 16 opciones `espacio-nordico` |
| `buscar.php` | ❌ **no capturado** | formulario GET observado en todas las páginas |
| Muro social (`muro-social/`) | ❌ **no capturado** | menú/acciones de cabecera |
| Páginas de estación: webcams / meteo / ficha / plano / histórico / partes-usuarios / partes-publicar | ❌ **no capturadas** | pestañas observadas en el detalle |
| Recursos / widgets / APIs | ❌ **no capturado por mí** | tratado por t3/t11 en 05; enlace observado |
| Legal (aviso/privacidad/cookies) | ⚠️ **cabeceras** por `ev_dfca13…` (lead/t11) | texto completo verificado por t11 |

**Razón de los huecos:** el alcance de t2 se recortó explícitamente (instrucción del captain) para no
bloquear 02/04; los huecos son de **baja incertidumbre** porque su patrón se deduce del de las páginas
hermanas capturadas, y están marcados como tales. Si un implementador necesita uno, debe pedir captura
antes de codificar — no inventarlo.

---

## 11. Artefactos y digests (verificación)

Ficheros en `docs/snow/captures/`. `sha256` completo en `03-rea-evidence.md` §3; aquí los 16 primeros
caracteres para comprobación rápida (`Get-FileHash <file> -Algorithm SHA256`).

| Fichero | Bytes | sha256 (16) |
|---|---|---|
| `home-desktop-1440.png` | 487 943 | `ffb3ef13a4d9dccf` |
| `home-desktop-1440.dom.txt` | 155 268 | `bf418437da41db5f` |
| `home-desktop-1440.accessibility.txt` | 27 830 | `b3aecf7876e34841` |
| `home-mobile-430.png` | 31 638 | `de701e061de999fb` |
| `home-mobile-430.dom.txt` | 155 375 | `f3c37466662ff736` |
| `parte-de-nieve-desktop-1440.png` | 114 804 | `23a38b804f302dd9` |
| `parte-de-nieve-desktop-1440.dom.txt` | 258 565 | `99a90c04d0881e87` |
| `estacion-baqueira-parte-desktop-1440.png` | 347 685 | `77546084d5fe0a59` |
| `estacion-baqueira-parte-desktop-1440.dom.txt` | 62 970 | `01a203514f19757a` |
| `estacion-baqueira-parte-tablet-768.dom.txt` | 62 964 | `2b936c952c0af8d2` |
| `estaciones-esqui-desktop-1440.png` | 105 213 | `fc29e4dd4384aa8a` |
| `estaciones-esqui-desktop-1440.dom.txt` | 168 145 | `1056171306763777` |
| `pais-espana-desktop-1440.dom.txt` | 101 344 | `d0ce6bf1d144f64c` |
| `meteo-desktop-1440.png` | 99 992 | `fee6392aeaa26c56` |
| `meteo-desktop-1440.dom.txt` | 65 690 | `b1e18f809e5b4dbb` |
| `sala-de-webcams-desktop-1440.png` | 741 623 | `04ea0d754df3e985` |
| `sala-de-webcams-desktop-1440.dom.txt` | 77 015 | `69486584c96ad6bc` |
| `mapa-de-webcams-desktop-1440.png` | 641 212 | `280bcd72535763e4` |
| `mapa-de-webcams-desktop-1440.dom.txt` | 715 013 | `77da7d2dc8f0dbe9` |
| `fechas-temporada-desktop-1440.dom.txt` | 92 928 | `abe3e1ba9a5718ba` |
| `top-nieve-desktop-1440.png` | 559 694 | `ceeb9da9dc9a1ab1` |
| `top-nieve-desktop-1440.dom.txt` | 42 780 | `9ceb6f68b88f9606` |
| `top-km-desktop-1440.dom.txt` | 42 779 | `f1ae77bf9c631929` |
| `aludes-desktop-1440.png` | 648 671 | `a37b2963ab5e0ef1` |
| `aludes-desktop-1440.dom.txt` | 51 955 | `6a1c36fafc919b87` |
| `publicar-desktop-1440.png` | 84 790 | `08020949450a28eb` |
| `publicar-desktop-1440.dom.txt` | 56 682 | `ac0336121d9bb65d` |
| `404-estacion-inexistente-desktop-1440.dom.txt` | 168 122 | `b5573207e1b76a1a` |

**Nota de honestidad:** `404-…dom.txt` tiene 168 122 bytes frente a 168 145 de
`estaciones-esqui-…dom.txt`; la diferencia es el `canonical`/`og:` ausente y el ítem de menú activo —
el contenido es la **misma página**, lo que confirma la redirección (§4.12).

Scripts de análisis añadidos en este turno (read-only, sin dependencias):
`scripts/snow/summarize-capture.mjs`, `scripts/snow/check-seo.mjs`, `scripts/snow/page-facts.mjs`,
`scripts/snow/detail-facts.mjs`.

---

## 12. Qué NO sabemos (lista honesta)

1. **NO VERIFICABLE:** tecnología de servidor, esquema de base de datos, cadencia de ingesta y fuentes
   internas reales de infonieve.
2. **NO VERIFICABLE:** el contrato de `recursos/` (API widgets): existe comercialmente, no lo hemos
   consultado; ver 05.
3. **NO VERIFICABLE:** comportamiento en plena temporada (todos los rankings estaban vacíos).
4. **NO VERIFICADO:** si existe app móvil infonieve (la app del monorepo es `mobile-ionic`, propia).
5. **NO VERIFICADO:** versiones de idioma del mismo dominio.
