# FASE 1 — Evidencia REA (trazabilidad)

Registro de **qué se capturó, con qué herramienta, qué Evidence ID tiene y qué afirma cada cosa**.
Regla: ninguna afirmación sobre la referencia entra en 01/02/04 sin apuntar aquí a un Evidence ID
**o** a un artefacto con su `sha256`. Las afirmaciones que vienen solo de enlaces de navegación
lo dicen explícitamente ("navegación") y **no** se usan como base de implementación.

- REA `rea-agents` 6.8.0 (server 2.3.1, protocolo 2026-07-28), skill `reverse-engineer-anything` v49.
- Proveedor de captura: `rea-playwright-browser-scenario` v1 · Chromium **157.0.8103.78**,
  `mode: launch`, proceso y perfil **propiedad del proveedor** (temporal, terminado al cerrar).
- Anti-trampa: `service_workers: block`, `locale: es-ES`, `timezone: Europe/Madrid`,
  `reduced_motion: reduce`, `color_scheme: light`, viewport explícito por captura.
- Fecha de todas las capturas de este documento: **2026-11-16**, ventana ≈ 14:18–14:35 Europe/Madrid.
- Alcance: **sin despliegue**, solo lectura de un sitio público. No se enviaron credenciales, no se
  publicó ningún parte de usuario (el formulario `publicar` se capturó sin enviarse).

---

## 1. Tabla maestra de capturas (todas las de este turno + heredadas)

| # | Página | URL | Viewport | Evidence ID | Origen |
|---|---|---|---|---|---|
| C1 | Portada | `https://www.infonieve.es/` | 1440×960 | `ev_c77a887b…77ded` | heredada (lead, re-capturada por mí sin artefactos) |
| C2 | Portada desktop (artefactos) | `/` | 1440×960 | **`ev_0d1021…`** (lead) | heredada → `home-desktop-1440.*` |
| C3 | Portada móvil | `/` | 430×932 | **`ev_05978a…`** (lead) | heredada → `home-mobile-430.*` |
| C4 | Parte de nieve | `/parte-de-nieve/` | 1440×960 | **`ev_2c29d6…`** (lead) | heredada → `parte-de-nieve-desktop-1440.*` |
| C5 | Estación Baqueira — parte | `/estacion-esqui/baqueira-beret/parte-de-nieve/` | 1440×960 | **`ev_022ffb…`** (lead) | heredada → `estacion-baqueira-parte-desktop-1440.*` |
| C6 | Recursos / legal (cabeceras) | `/recursos/`, `/aviso-legal/` | — | **`ev_dfca13…`** | heredada (lead/t11) |
| C7 | Directorio estaciones | `/estaciones-esqui/` | 1440×960 | `ev_ead04c7b4ce3210eaa3266cd6ec826b30163b8b2c304d083679f9e26723cd7c5` | **mía (t2)** |
| C8 | Meteo | `/meteo/` | 1440×960 | `ev_f0591799cc85d09188641a140dcec1ef6be3ad943168020ede03d8d56bdc7303` | **mía (t2)** |
| C9 | Sala de webcams | `/sala-de-webcams/` | 1440×960 | `ev_a969c99450e41e5f8db0b9d36131a798adeb9a2bb80bdbff958513906698b523` | **mía (t2)** |
| C10 | Mapa de webcams | `/mapa-de-webcams/` | 1440×960 | `ev_2dfdfb5db8fd616dec2e51766d6ca50322825a8f0ca61dd675e442c8c5464d38` | **mía (t2)** |
| C11 | Top nieve | `/parte-de-nieve/top-nieve/` | 1440×960 | `ev_e4d5420439429ebfa092c50c8a64cd13c62c40c46ec0827bfd9f1ee0cfa160c5` | **mía (t2)** |
| C12 | Aludes | `/parte-de-nieve/aludes/` | 1440×960 | `ev_c2af19ccd3f3abfec6838a92b22adceaeacc48eda3c94cc6497adada74ba76ab` | **mía (t2)** |
| C13 | Publicar parte | `/parte-de-nieve/publicar/` | 1440×960 | `ev_601c35a93db7d9f4f2e7d5360735448e8835f15fa160c7365f8096c816f3bead` | **mía (t2)** |
| C14 | Fechas temporada | `/estaciones-esqui/fecha-inicio-fin-temporada/` | 1440×960 | `ev_649d91bae5f3c901bfed4b29d4fdbabc1ea89dba1a64dde64bbd1c350b364b95` | **mía (t2)** |
| C15 | Top km | `/parte-de-nieve/top-km/` | 1440×960 | `ev_b1a983dcb0e036f3dc4e05a05a6b5211163b1733d0a49618f4d9b41ffda7f2a4` | **mía (t2)** |
| C16 | Estación Baqueira — **tablet** | idem C5 | **768×1024** | `ev_4dad8e5a0f00765801b1e99e0975959cd6166fe7279321bd64263502125edb10` | **mía (t2)** |
| C17 | **404 deliberado** | `/estacion-esqui/esto-no-existe-xyz/parte-de-nieve/` | 1440×960 | `ev_08d6149ba37097787e7c49462dcc724b6c05edbf0849137854309c39b9479557` | **mía (t2)** |
| C18 | País España | `/estaciones-esqui/pais/espana/` | 1440×960 | `ev_4e20056f08c79bc6fa973713c1ed4f6cc2d41629cf73a60eeb138080ab398c74` | **mía (t2)** |

Los IDs heredados están truncados aquí porque su forma completa figura en el mensaje de hand-off y en
`docs/snow/captures/`; los **míos son exactos** y permiten `inspect_analysis_view` en esta sesión REA.

### 1.1 Captura con contenido de red (para 04)

| # | Página | Qué se capturó | Evidence ID |
|---|---|---|---|
| N1 | `/estaciones-esqui/` | **request_body + response_body** de todas las transacciones (68), tipos, hosts, estados, content-types, bytes | `ev_ead04c7b…3cd7c5` (misma que C7, captura separada con `network`) |

Solo se hizo una pasada con cuerpos: el resultado fue **suficiente y concluyente** (cero endpoints de
datos), y las capturas con `response_body` producen spills de ~1,2 MB que no aportan nada más. Ver 04 §3.

---

## 2. Claims → evidencia

Formato: **[ID] claim** ← fuente. "OBSERVADO" = en un DOM/red capturada; "navegación" = solo enlace.

| ID | Claim | Evidencia |
|---|---|---|
| E1 | 90 filas de parte: 60 `estacion-esqui` + 30 `espacio-nordico` | C4 + `analyze-dom --mode=parte` sobre `parte-de-nieve-desktop-1440.dom.txt` (sha `99a90c04d0881e87…`) |
| E2 | Columnas del parte `Estación/Estado/Remontes/Pistas/Kilómetros/Nieve/Meteo`, con `Circuitos` en nórdico | C4 idem |
| E3 | Estado = pastilla con color hex en `style` y `title` (`#FA8574`, "Cerrada"); forma larga/corta | C4 idem |
| E4 | 14 sistemas montañosos agrupando el parte | C4 idem |
| E5 | Detalle de estación: pestañas, sectores, webcams 21, fechas 28/11/2026–04/04/2027, partes de usuarios vacío | C5 + `page-facts.mjs` sobre `estacion-baqueira-parte-desktop-1440.dom.txt` (sha `01a203514f19757a…`) |
| E6 | `canonical` presente en portada y en detalle de estación; **ausente** en directorio, país, meteo, webcams, mapa, rankings, fechas, aludes, publicar | `check-seo.mjs` + `page-facts.mjs` sobre todos los DOM |
| E7 | `viewport` con `user-scalable=no, maximum-scale=1, minimum-scale=1` en **todas** las páginas | `page-facts.mjs` (14 ficheros) |
| E8 | `<meta name="Keywords">` y `<meta name="Robots">` (mayúsculas) en todas | `check-seo.mjs` |
| E9 | **0 bloques JSON-LD** en todas las páginas capturadas | `check-seo.mjs` (`json-ld blocks: 0`) |
| E10 | Portada **sin `<h1>`**; detalle/listados con `<h1>` | `page-facts.mjs` (`h1: (none)`) |
| E11 | `jquery` presente en todas; 22–23 `<script>` por página; GTM `G-1ZZ37QJFPL`, GPT `/1020536/…`, reCAPTCHA, Leaflet, Google Fonts | `check-seo.mjs` + DOM |
| E12 | Directorio: columnas `Estación/Estado/Km. abiertos/Pistas/Nieve/Meteo/Webcams`; **0 `<select>`**, sin filtros/orden | `page-facts.mjs` sobre `estaciones-esqui-desktop-1440.dom.txt` (sha `1056171306763777…`) |
| E13 | Directorio lista 82 filas en 14 tablas + bloque "Otras estaciones cerradas o no operativas" (4) | idem E12 |
| E14 | País España: 39 filas en 6 tablas; sin canonical | `pais-espana-desktop-1440.dom.txt` (sha `d0ce6bf1d144f64c…`) |
| E15 | Meteo: 2 `<select>` (16 y 100 opciones, **valores = URLs de estación**); 8 webcams; sin tabla | `meteo-desktop-1440.dom.txt` (sha `b1e18f809e5b4dbb…`) |
| E16 | Sala webcams: 24 cámaras; orígenes `infonieve.es/webcams/<est>-<cam>_YYYY-MM-DD-HH-MM-NNN.jpg` (13), `webtvpicture.feratel.com` (5), `webtvhotspot.feratel.com` (5), `funiviecampiglio.it` (1) | `sala-de-webcams-desktop-1440.dom.txt` (sha `69486584c96ad6bc…`) |
| E17 | Atribución por cámara `© feratel.com, astun.com, 3cat.cat, featel.com, viewsurf.com, panomax.com, roundshot.com, funiviecampiglio.it` | idem E16 |
| E18 | Mapa de webcams: Leaflet + **tiles `*.tile.openstreetmap.org`**, atribución "© OpenStreetMap contributors" | `mapa-de-webcams-desktop-1440.dom.txt` (sha `77da7d2dc8f0dbe9…`) |
| E19 | Aludes: escala 1–5 completa con textos; mapa Leaflet + tiles OSM | `aludes-desktop-1440.dom.txt` (sha `6a1c36fafc919b87…`) |
| E20 | Fechas: tabla actual con "sin determinar" + leyenda 2 estados + **histórico 17 temporadas (2009-2010…2025-2026)**; orden por `$.post` | `fechas-temporada-desktop-1440.dom.txt` (sha `abe3e1ba9a5718ba…`) |
| E21 | Rankings top-nieve y top-km: `tbody` vacío + aviso "Actualmente ninguna estación dispone de los datos para generar este ránking." | `top-nieve-…dom.txt` (sha `9ceb6f68b88f9606…`), `top-km-…dom.txt` (sha `f1ae77bf9c631929…`) |
| E22 | Publicar: `form action="parte-de-nieve/publicar/" method="post"`, reCAPTCHA v2, valoración Penoso/Malo/Aceptable/Bueno/Excelente, **vigencia 10 días** | `publicar-desktop-1440.dom.txt` (sha `ac0336121d9bb65d…`) |
| E23 | **404 no existe como estado**: la URL inexistente redirige a `/estaciones-esqui/` (`after_url` final) y sirve esa página sin mensaje | C17 (`ev_08d6149b…`): `after_url = /estaciones-esqui/`, título "Estaciones de esquí", 168 122 B ≈ 168 145 B de C7 |
| E24 | Tablet 768×1024 sirve el **mismo HTML** (mismas clases `box_l_/box_m_/div_m_fila`) → responsive por CSS | C16 `estacion-baqueira-parte-tablet-768.dom.txt` (62 964 B) vs C5 (62 970 B) |
| E25 | Formulario de búsqueda `buscar.php?query=…` GET en **todas** las páginas | `page-facts` (`forms: buscar.php get`) |
| E26 | **Cero endpoints de datos**: 68 transacciones en `/estaciones-esqui/`, 0 JSON/XHR/fetch salvo GA `collect` y la diccionario GPT | N1 + 04 §3 |
| E27 | Navegación incluye `esqui-de-fondo/`, `muro-social/`, `parte-de-nieve/usuarios|snowparks|skimo|itinerarios-raquetas|pistas-trineos/`, `estaciones-esqui/pais/{andorra,pirineo-frances,portugal}/`, `sala-de-webcams/reg/{alpes,norteamerica,sudamerica,oceania,africa}/`, `sala-de-webcams/donde-esta-nevando/`, `recursos/` | **navegación** (DOM de C2/C4/C5) — **páginas no capturadas** |
| E28 | Control de favoritos `#barbox_tools_fav` sin `href`, con texto "Aun no has marcado ninguna estación como favorita" | **navegación/DOM** de C7 — comportamiento de favoritos **no capturado** (cliente) |
| E29 | Título del parte "Parte de Nieve, estado actual…"; sello de página "Actualizado el 16/11/26 05:45" | C4/C5 (heredadas; el sello de página está en el mensaje de hand-off y en el DOM de C5) |
| E30 | Redirección de 404 confirmada también por la vista de red (`goto_start.after_url`) | C17 `steps[0].after_url` |

### 2.1 Claims deliberadamente NO hechos

- **No** afirmamos nada sobre el código fuente de infonieve, su base de datos ni su pipeline.
- **No** afirmamos que la API comercial de `recursos/` tenga un contrato concreto (ver 05; no consultada).
- **No** afirmamos que el sitio tenga versión en otros idiomas en el mismo dominio.
- **No** afirmamos el comportamiento en temporada alta (el 16/11/2026 es pretemporada).
- **No** afirmamos que `-` signifique siempre "sin dato" (podría ser "cerrado sin parte"); se observa
  la forma, no la semántica interna.

---

## 3. Artefactos: `sha256` completos

Todos en `docs/snow/captures/`. Comprobación: `Get-FileHash <file> -Algorithm SHA256` (Windows) o
`sha256sum <file>`. El `sha256` del screenshot correspondiente lo reporta además REA en el artefacto
(`artifacts.screenshot.value.sha256`); abajo se incluye la comparación cuando existe.

`sha256` completo, recomputado con `node -e "crypto.createHash('sha256')"` sobre los ficheros en disco
(2026-11-16). Cualquiera puede verificarlo con `sha256sum <file>` / `Get-FileHash <file> -Algorithm SHA256`.

| Fichero | Bytes | sha256 |
|---|---|---|
| `home-desktop-1440.png` | 487 943 | `ffb3ef13a4d9dccfc98619b27c25d95c2c0589c7686e7f620a48241dfd38ff0b` |
| `home-desktop-1440.dom.txt` | 155 268 | `bf418437da41db5fdf75fc1f09b79391b450ab781c5417951aa424d55184ade4` |
| `home-desktop-1440.accessibility.txt` | 27 830 | `b3aecf7876e348412abaaec21bd73519156a204f91bec04d86209e75278c6805` |
| `home-mobile-430.png` | 31 638 | `de701e061de999fb748dc7e8602f651194e868a8ddd41cd06760a8c8e5aff1ca` |
| `home-mobile-430.dom.txt` | 155 375 | `f3c37466662ff736287201c55a12abea402fb6d9b359bcbe152426a4f34db02d` |
| `parte-de-nieve-desktop-1440.png` | 114 804 | `23a38b804f302dd9a13eaa4e7f3a91c7850007373135a78ec6ec8d68f5abb453` |
| `parte-de-nieve-desktop-1440.dom.txt` | 258 565 | `99a90c04d0881e875152d4aab65668ece42fc663fcd5294264e7eff10de0d11f` |
| `estacion-baqueira-parte-desktop-1440.png` | 347 685 | `77546084d5fe0a59ddba837e30f9c3d173a630f101e3a2297f4a2b1c0b73c691` |
| `estacion-baqueira-parte-desktop-1440.dom.txt` | 62 970 | `01a203514f19757a7da68160c655cfa8aebe9e105c21d0f6d26107e76d67e035` |
| `estacion-baqueira-parte-tablet-768.dom.txt` | 62 964 | `2b936c952c0af8d2620fcce24dc4f3d4e3a841578850cf6306a1004288bc7f6c` |
| `estaciones-esqui-desktop-1440.png` | 105 213 | `fc29e4dd4384aa8aa3469185d774c9b1308ec1eb00b7da2dd23f7e4bb6c34492` |
| `estaciones-esqui-desktop-1440.dom.txt` | 168 145 | `10561713067637771e0c37c026b7ce6f82aaa035919c61b997bb43b8ecbb1fa7` |
| `estaciones-esqui-desktop-1440.network.json` | 17 353 | ver 04 §3 (inventario de 68 transacciones; regenerado por script, no es artefacto REA literal) |
| `pais-espana-desktop-1440.dom.txt` | 101 344 | `d0ce6bf1d144f64ca4e013ff5d2aa0f8a7394b7c83dd9cf64fd102eb4c726308` |
| `meteo-desktop-1440.png` | 99 992 | `fee6392aeaa26c56762da970ab68f63877066416b1ec2e75a164daf9c2fcea14` |
| `meteo-desktop-1440.dom.txt` | 65 690 | `b1e18f809e5b4dbb49fdbf786fce70e454bc3fdccd7f1af7873ba8a507e025e9` |
| `sala-de-webcams-desktop-1440.png` | 741 623 | `04ea0d754df3e9859ba7b47e94c60442008960e756bf27bd4707bb3ac84235e5` |
| `sala-de-webcams-desktop-1440.dom.txt` | 77 015 | `69486584c96ad6bc1bd0eef7589ed39089521440ec8df471a1c8f47d990b7b43` |
| `mapa-de-webcams-desktop-1440.png` | 641 212 | `280bcd72535763e41b3894215d9b220834062ca3eb22145e3ff8ad8386460d53` |
| `mapa-de-webcams-desktop-1440.dom.txt` | 715 013 | `77da7d2dc8f0dbe99ac19b78f970c5b02c5debd54511c0ea31117ec19642fc08` |
| `fechas-temporada-desktop-1440.dom.txt` | 92 928 | `abe3e1ba9a5718ba1e2f25957d5066566bb7876bbb578b568095d6ef8e9ecd60` |
| `top-nieve-desktop-1440.png` | 559 694 | `ceeb9da9dc9a1ab1829a6a0350b3fc588bee71d3a4e5cd6db957c3acff0bf009` |
| `top-nieve-desktop-1440.dom.txt` | 42 780 | `9ceb6f68b88f960691c9acfcd0070ad7d43ce7bd67a6088cc538f2ae55f65e76` |
| `top-km-desktop-1440.dom.txt` | 42 779 | `f1ae77bf9c6319296443b6595aa9d2ee26a30026571393f07733d3c1ecc1166f` |
| `aludes-desktop-1440.png` | 648 671 | `a37b2963ab5e0ef1b06d9888c15ab76640a9a3d3eb54da4e9e224197843d3871` |
| `aludes-desktop-1440.dom.txt` | 51 955 | `6a1c36fafc919b8773abad3f82ff6f36c1bffeef7999c45101d70dd761683f7f` |
| `publicar-desktop-1440.png` | 84 790 | `08020949450a28eb4282f051ed2b281ed3bdced2a816bf5325ac5acdf806fc9c` |
| `publicar-desktop-1440.dom.txt` | 56 682 | `ac0336121d9bb65dfd77f0db60318231c59e2016e5844455c0ee47ec4c73b79c` |
| `404-estacion-inexistente-desktop-1440.dom.txt` | 168 122 | `b5573207e1b76a1a14578b12723ad19837f0716280279b9d283fcd65c26eb5d4` |

**Concordancia con REA:** los `sha256` de `dom` coinciden **byte a byte** con
`artifacts.dom.value.sha256` que REA reporta en cada captura; los de `screenshot` coinciden con
`artifacts.screenshot.value.sha256` (p. ej. C11 `ceeb9da9…bf009`, C12 `a37b2963…d3871`). Los ficheros
`*.network-api.txt` de 0 bytes son los heredados del lead y su hash es el de la cadena vacía
(`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`): **no contienen datos**, por eso
04 se basa en la captura N1, no en esos ficheros.

---

## 4. Limitaciones de la evidencia (declaradas por REA y por mí)

Declaradas por el proveedor en cada captura:

1. Los eventos de red conservan el **orden de recepción**, no la causalidad del navegador.
2. Los cuerpos capturados con `response_body` son el resultado de `Response.body()` de Playwright;
   Playwright puede servirlos con una recarga autenticada de la URL — no se garantiza que sean los
   bytes del cable. **Por eso 04 usa el contenido solo para clasificar el tipo de respuesta, no como
   prueba de valores.**
3. No se exponen pilas de iniciador de peticiones.
4. Los valores de almacenamiento se hashean tras redactar secretos (no se pidió almacenamiento).
5. "No exposed" en cuerpos no prueba ausencia de cuerpo.

Declaradas por mí (analista):

6. **Naturaleza de la captura:** `authority = controlled-replay` (un navegador real controlado por
   REA, no el sitio original en su CDN): si el sitio sirve variantes por geolocalización, lo capturado
   es lo que vió *nuestro* Chromium desde *este* host.
7. **Pretemporada:** fecha fija; todos los estados son "Cerrada" y los rankings están vacíos. Los
   estados con datos (abierta, parcial, espesores reales) **no están observados**.
8. **6 IDs heredados truncados** (C2–C6): provienen del hand-off del lead; no puedo re-autenticarlos
   en esta sesión REA. Se citan como contexto y **nada crítico depende solo de ellos**: cada claim
   heredado se vuelve a anclar en un artefacto con `sha256` o en una captura mía.
9. **Huecos de cobertura** (páginas enlazadas no capturadas) listados en 01 §10, con motivo.
10. **Sin despliegue, sin escritura en el sitio:** no se publicó ningún parte, no se envió ningún
    formulario POST, no se creó cuenta en `recursos/`.

---

## 5. Método reproducible

```bash
# 1) Capturar (REA MCP): capture_browser_scenario con
#    browser.mode=launch, executable_path=<chrome>, headless=true
#    environment {viewport, locale es-ES, timezone Europe/Madrid}
#    capture.at_end ["screenshot","dom"] (+accessibility si interesa)
#    network.response_body/request_body solo cuando hace falta (04)
# 2) Extraer el spill a docs/snow/captures (conserva sha256 de REA):
node scripts/snow/summarize-capture.mjs <spill.txt> --extract docs/snow/captures <slug>
# 3) Analizar (read-only):
node scripts/snow/analyze-dom.mjs <dom.txt> --mode=parte     # 90 estaciones, áreas, pastillas, columnas
node scripts/snow/analyze-dom.mjs <dom.txt> --mode=links     # inventario de enlaces
node scripts/snow/check-seo.mjs <dom.txt> [...]              # title/h1/metas/canonical/JSON-LD/scripts/hosts
node scripts/snow/page-facts.mjs <dom.txt> [...]             # tablas, columnas, forms, no-data, sellos
node scripts/snow/detail-facts.mjs                           # meteo/webcams/mapa/aludes/fechas/publicar
```
