# FASE 8 — Revisión independiente y estados de cierre (t10)

Revisor: `re-researcher` · Fecha: **2026-11-16** · Tarea `t10`.
Método: **cada comando citado se ejecutó en este turno, contra el árbol actual**. Ningún resumen de otro
miembro se acepta como evidencia. Donde no se pudo ejecutar se escribe `UNVERIFIED`/`BLOCKED` con la
causa, nunca `PASS`.

**Estado del entorno en el momento de la revisión:** `dist/` **no existe**, `nx build` está denegado por
tuberías (C1c). Por tanto **no hay bundle, no hay servidor servido y no hay navegador**. Todo lo que
dependa de eso es `BLOCKED`, no "probablemente bien".

---

## 0. Regla de la cifra (cinco instancias del mismo error en este milestone)

Destilada de cinco casos reales —tres míos, uno del capitán, uno compartido—:

> **Nunca reportes un recuento como evidencia: reporta el fallo con el comando y su código de salida.**
> Cuando dos personas discrepan, lo más probable es que la pregunta esté mal planteada.
> Una cifra es, como mucho, una pista para diseñar la medición.

| # | Instancia | Quién | Qué estaba mal |
|---|---|---|---|
| 1 | 46 coincidencias de `Authorization` leídas como «hay auth en las rutas» | capitán | el `grep` contaba menciones, no comportamiento: una ruta sin middleware también lo contiene |
| 2 | «puertos loopback bloqueados» | capitán → corregido por mí | se midió un puerto ajeno cerrado, no la capacidad; loopback funcionaba |
| 3 | cinco recuentos distintos de imports sin extensión (48 / 32 / 17 / 12 / «ninguno») | ambos | cada uno medía con otro patrón; el número dependía del `grep`, no del código |
| 4 | un **comentario** leído como prueba de que `/api/snow` estaba montado | capitán | el texto decía `Montado ANTES del estático`; el montaje real está en `server.ts:22` |
| 5 | una fila de tabla (`provenance` sin `sourceUrl`) leída como «F1 roto» | capitán | la ausencia era **por diseño** (solo se exponen si `provenance.source === 'editorial-report'`) |

**Consecuencia práctica en este documento:** ninguna cifra va sola. Cada afirmación lleva (a) el comando,
(b) su código de salida, (c) el fragmento de salida que la sostiene.

### 0.1 La meta-observación que hay que conservar

`data-providers` **corrigió su propia aserción errónea de C24** (un test que atribuía mal el origen del
dato). Al corregir el test, el fallo real que estaba ocultando —**F1: las cifras del operador no llegaban
a la UI**— quedó visible. Es decir: **un test defectuoso estaba tapando una carencia real del producto.**

Ese es el argumento, con evidencia y no con principio, de por qué **escribir los tests y verificar el
producto deben estar en manos distintas**. Un autor que valida su propio trabajo tiende a escribir la
aserción que pasa, no la que comprueba.

---

## 0.2 Nota sobre una discrepancia que resolví mal, y que el capitán corrigió

Reporté que las suites **no corrían** (`ERR_MODULE_NOT_FOUND`, 4/5 ficheros en rojo) y deduje que
`/api/snow` estaba "roto en runtime". **Medido: verdadero. Inferido: falso.** Ambas cosas, separadas,
porque la distinción es el contenido útil:

- **MEDIDO (verdadero):** existen **48** imports relativos de valor sin extensión bajo
  `web-ssr/src/snow/**`; `tsc` los acepta (`moduleResolution: bundler`) y el **resolver ESM por defecto
  de Node los rechaza**. Reproducible: `node scripts/snow/find-runtime-imports.mjs` → `48`.
  Sin loader, `import('./web-ssr/src/snow/server/index.ts')` → `ERR_MODULE_NOT_FOUND`.
- **INFERIDO (falso):** que eso rompiera el runtime. No es así. Es una **propiedad de resolución de
  herramienta**, no un defecto de ejecución.

### Decisión de carga (de `06 §12`, transcrita)

> En **producción** el bundler de Angular (esbuild) resuelve los imports en **build-time** (sin
> fragilidad); bajo **Node plano** (`node --test`, `node -e`, tooling de verificación) se carga con el
> loader del repo: `scripts/snow/ts-loader.mjs` + `scripts/snow/ts-resolver.mjs`. El hook **no es un
> helper de test**: es un artefacto del repo.

Verificado por mí, extremo a extremo:

```
$ node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
    -e "import('./web-ssr/src/snow/server/index.ts')…"
→ createSnowRouter = function | SNOW_ROUTES = object | len 13        (exit 0)
```

**Comando canónico** (`06 §12` L518–522):

```text
node --experimental-transform-types \
  --import ./scripts/snow/ts-loader.mjs \
  --test --test-isolation=none <f1> <f2> …
```

> **Las suites NO son autocontenidas: requieren el loader.** Quien reproduzca sin él obtendrá
> `ERR_MODULE_NOT_FOUND` y podría concluir —como concluí yo— que las cifras son inventadas.

### Divergencia entre los dos resolvers (hallazgo)

El capitán pidió comparar. Resultado:

| Invocación | Resultado |
|---|---|
| `--import ./scripts/snow/ts-loader.mjs` + suite | **56/56 pass, exit 0**, 5/5 ejecuciones |
| `--import ./scripts/snow/ts-resolver.mjs` + suite | **exit 1**, `ERR_MODULE_NOT_FOUND` en `chain/chain` |

**No es un bug de resolución, es una distinción de uso:** `ts-loader.mjs` es el **punto de entrada**
que hace `register('./ts-resolver.mjs', …)`; `ts-resolver.mjs` es el **hook** y no debe importarse
directamente con `--import`. El comando canónico es el de `ts-loader.mjs`.
El antiguo `web-ssr/src/snow/tests/support/resolve-hook.mjs` **ya no existe** (QA delegó al resolver del
repo, como se le pidió); las mediciones que lo citaban dejan de ser reproducibles y quedan superadas por
el comando canónico.

La lección —para mí primero— es que "no se reproduce con mi variante" no es "no se reproduce": hay que
reproducir el comando del otro equipo antes de cuestionar su cifra.

---

## 1. Estado de cierre por dimensión

Vocabulario: `PASS` (ejecutado aquí, se sostiene) · `PARTIAL` (parte verificada, parte no) ·
`BLOCKED` (imposible por entorno) · `FAIL` (contradicción demostrada) · `UNVERIFIED` (no ejecutado).
**`PASS` aquí nunca significa "el producto está bien": significa "esta afirmación concreta no es falsa
en la forma medida".** El arnés es un control de forma (ver `08` §0).

| # | Dimensión | Veredicto |
|---|---|---|
| A | Reverse engineering (REA) | **PASS** |
| B | UX/UI | **PARTIAL** |
| C | Backend | **PASS** (con el límite del loader, §0) |
| D | Frontend | **PARTIAL** |
| E | Datos reales / legalidad | **PASS** (análisis) + **BLOCKED** (ejecución real) |
| F | Tests | **PASS** con reserva de autocontención |
| G | SEO / Performance | **BLOCKED** |
| H | Integración | **PARTIAL** |
| I | Production readiness | **PARTIAL** |

---

## A. Reverse engineering — **PASS**

```
$ (Get-ChildItem docs/snow/captures -Filter *.dom.txt).Count
16                                  # + 2 PNG-only (home-mobile, etc.) = 18 artefactos
```

- Inventario `01-reference-inventory.md` (25 639 B), evidencia `03-rea-evidence.md` con **18 Evidence
  IDs** y `sha256` completos recomputados y cotejados con los digests que reporta REA.
- **Hallazgo negativo de datos**: `/estaciones-esqui/` = 68 transacciones, **0 endpoints de datos**
  (`01` §…, `04`); los `*.network.json` heredados estaban vacíos y **no** se usaron como prueba.
- 404 de la referencia redirige sin mensaje (`ev_08d6149b`) → requisito propio implementado (K1 PASS).
- **C6 — estados poblados NO observados**: la captura es de pretemporada (todo "Cerrada", rankings
  vacíos). El formato de un parte con nieve **no está observado**; nadie debe asumirlo como hecho.
- **Limitación declarada:** 6 Evidence IDs heredados del hand-off no se pueden re-autenticar en esta
  sesión; nada crítico depende solo de ellos (cada claim se re-ancló a un artefacto con `sha256`).

## B. UX/UI — **PARTIAL**

Especificación `07-ux-ui.md` (73 980 B). Componentes verificados en disco por mí:

```
$ Get-ChildItem web-ssr/src/app/snow/pages -Directory
compare · dashboard · explorer · map · not-found · station · webcams        (7)
$ Test-Path web-ssr/src/app/snow/pages/meteo          → False
```

| Pantalla | Estado verificado |
|---|---|
| A panel, B explorador, C detalle, D webcams, F mapas, G comparador, + página 404 propia | **implementadas** (7 componentes) |
| **E — centro meteorológico** | **NO IMPLEMENTADA** — `pages/meteo` no existe |
| **F — mapa con Leaflet real** | **NO montado** — `snow-map.component.ts:18` lo declara en el propio código: *"Esta pantalla NO monta Leaflet todavía"*; renderiza "Sin capa base configurada" porque `PROTOMAPS_BASE_URL` no está definido |

- `J1` (sin bloqueo de zoom) PASS · `J2` (sin `meta keywords`) PASS · `J3` (sin hex de fondo en **15
  plantillas inline**, 0 `.html`) PASS · `J4` (estado con palabra + glifo, resuelto a través de
  `SnowStatusBadgeComponent` y sus 2 delegaciones) PASS.
- **404 en wire / foco / lectores de pantalla / zoom al 200 %: UNVERIFIED** — sin bundle no hay render,
  y **ningún humano ha visto una página pintada**.
- Contraste: medido sobre tokens en `07` §12.1, **no** sobre píxeles renderizados → **UNVERIFIED**.

## C. Backend — **PASS** (con el límite del loader, §0)

Ejecutado por mí:

```
$ node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
    -e "import('./web-ssr/src/snow/server/index.ts')…"
→ createSnowRouter = function | SNOW_ROUTES = object | len 13              (exit 0)

$ node -e "import('./web-ssr/src/snow/server/index.ts')"                  → ERR_MODULE_NOT_FOUND
                                                                            (esperado sin loader, §0)
```

- **13 rutas** declaradas en `SNOW_ROUTES` (`snow.routes.ts:30`).
- Admin **fail-closed**: `admin-auth.ts` — sin `SNOW_ADMIN_TOKEN` ⇒ `401 unauthorized` en todo
  `/admin/**` (líneas 6, 14–17).
- `tsc -p web-ssr/tsconfig.app.json --noEmit` → **exit 0**.
- `node scripts/snow/check-schema.mjs` → **exit 0**, `RESULT: all invariants hold` (8/8).
- Suite backend: **56/56** con el comando canónico (§F).
- Arnés: `PASS=29 VACUOUS=1 [F3] FAIL=0 UNVERIFIED=5`.
- **No verificado:** comportamiento con proveedor real (sin credencial, §E) y `C5`/`N1` (router
  table-driven: el arnés no enumera registros).

## D. Frontend — **PARTIAL**

```
$ node --test --test-isolation=none scripts/snow/tests/*.test.mjs   → # tests 70 · # pass 70 · # fail 0 · exit 0
```

- 6 componentes enrutados; lógica de vista, formateo y procedencia cubiertos por 70 tests en proceso.
- **No hay bundle, no hay render, no hay CWV.** Nada de lo visual está verificado por observación.

## E. Datos reales / legalidad — **PASS** (análisis) + **BLOCKED** (ejecución)

- `05-provider-registry.md` (43 765 B): 20 proveedores, veredicto por tipo de dato con cláusula citada.
  `05b` traduce los veredictos a tipos y constantes ejecutables.
- **Estado operativo y espesores: `blocked` en TODOS los proveedores** — no existe fuente automática
  autorizada. La única vía lícita es **editorial** (nuestro admin, con `sourceUrl`+`capturedAt`+`author`+
  `confidence`), y está implementada y probada (`editorial.test.ts`).
- Webcams: `FALLBACK_CHAINS.image = []` → siempre `blocked`/`license-prohibits`; solo `linkUrl`.
  Verificado en el arnés (H1 PASS).
- Teselas OSM/MapTiler/Stadia: prohibidas; `E3` PASS (sin uso real).
- **A1/A2 (credenciales AEMET/Météo-France) ausentes** ⇒ previsión en `not_configured` → `no_data`.
  **Datos reales de previsión: BLOCKED** por instrucción externa, no por código.
- `VACUOUS` honesto: **F3** (ningún registro de parte referencia un id `osm_derived`) se evalúa sobre
  `snow-reports.json` **vacío** ⇒ no demuestra nada sobre el caso poblado.

## F. Tests — **PASS**, con reserva de autocontención

Comando **canónico** (`06 §12`), reproducido por mí. **El loader va en el mismo bloque que el comando a
propósito**: sin él se obtiene `ERR_MODULE_NOT_FOUND` y se concluye razonablemente que la cifra es
inventada — ya pasó entre QA y yo hoy.

```
# ── BACKEND · 8 suites · REQUIERE el loader del repo ────────────────────────────
$ node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
      --test --test-isolation=none <8 ficheros de web-ssr/src/snow/tests>
# tests 56 · pass 56 · fail 0 · exit 0            (5/5 ejecuciones consecutivas)
# SIN --import ./scripts/snow/ts-loader.mjs  →  ERR_MODULE_NOT_FOUND (48 especificadores)

# ── FRONTEND · 7 suites · NO requiere loader (son .mjs puros) ───────────────────
$ node --test --test-isolation=none <7 ficheros de scripts/snow/tests>
# tests 70 · pass 70 · fail 0 · exit 0
```

Verificado por mí, con el detalle que importa:

```
$ node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
      --test --test-isolation=none --test-reporter=tap web-ssr/src/snow/tests/admin-auth.test.ts
ok 3 - C26c: POST anónimo => 401 Y el recuento de partes NO cambia
ok 5 - C26e: SNOW_ADMIN_TOKEN sin definir => admin DESHABILITADO (401), nunca abierto
# pass 5 · # fail 0

$ node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
      --test --test-isolation=none --test-reporter=tap web-ssr/src/snow/tests/editorial.test.ts
ok 1 - C24a: round-trip editorial — CREA y LEE de vuelta con atribución
ok 5 - C24d: author vacío => 400
ok 7 - C24f: los rechazos NO persistieron nada
# pass 7 · # fail 0
```

- **Determinista:** 5/5 y 8/8 ejecuciones con el mismo resultado.
- **Cobertura desagregada, no agregada:** `PASS=29 VACUOUS=1 FAIL=0 UNVERIFIED=5` del arnés
  (ids: `E2,F1,C5,N1,L1`). **`VACUOUS` no cuenta como cobertura**, `UNVERIFIED` tampoco.
- Los dos casos que sostienen las frases de producto **los verifiqué yo**, no los cité: `C26c` prueba que
  el POST anónimo devuelve 401 **y** que el recuento en disco no cambia (B2 cerrado de verdad, no solo
  declarado); `C24a` prueba que un parte escrito se persiste y se lee de vuelta con su atribución (F1).
- `L1` (tests del propio arnés) se ejecuta a mano; los demás `UNVERIFIED` son límites del arnés, no
  defectos del código: `E2` (no existe markup de imagen que inspeccionar), `F1` (requiere subproceso;
  verificado a mano 8/8), `C5`/`N1` (router table-driven).
- **E2E: BLOCKED.** Causa: denegación de tuberías del sandbox (C1c) — el runner no puede lanzar un
  servidor ni un navegador. No se simula.
- **Nota de instrumentación:** durante la revisión el arnés marcó `J1` y `A2b` en rojo por dos
  **falsos positivos propios** (escaneaba el test de a11y que *prohíbe* `maximum-scale`, y una fila de
  UI donde `observedAt: undefined` significa "sin parte"). Corregidos acotando el alcance a markup de
  producción y a la frontera editorial. Queda dicho porque un revisor que no reconoce sus propios
  falsos positivos no es un revisor.

## G. SEO / Performance — **BLOCKED** (y esto **no** se suaviza)

```
$ Test-Path dist        → False
$ Test-Path dist\web-ssr → False
$ npx nx build web-ssr  → denegado (tuberías, C1c)
```

**No existe bundle, no existe HTML servido, no existe navegador.** Por tanto, sin matices:

- **Core Web Vitals: BLOCKED. No se declara ninguna cifra.** No hay LCP, ni CLS, ni INP medidos.
  Los objetivos de aceptación del brief quedan **sin verificar** en este entorno — ni "cumplidos", ni
  "probablemente cumplidos". **Ninguna persona ha visto una página renderizada.**
- Canonical / JSON-LD / hreflang en el HTML inicial: los genera el SSR; sin build **no observados** ⇒
  UNVERIFIED. No se infieren de que el código los emita.
- Lo que sí es verificable sin build, y está en PASS: `J1` (sin bloqueo de zoom en markup de producción),
  `J2` (sin `<meta keywords>`), `K1` (ruta `**` presente), `J3`/`J4` (sobre las **15 plantillas inline**,
  0 `.html`).

## H. Integración — **PARTIAL**

```
$ Select-String app.routes.ts -Pattern 'path: "nieve"|path: "estaciones"|path: "\*\*"'
10: path: "estaciones"        ← legado, INTACTO (U4 respetada)
325: path: "nieve"             ← subárbol nuevo
335:         path: "estaciones" ← hijo del subárbol nieve
376: path: "**"                ← comodín, sigue último
$ Select-String server.ts -Pattern 'api/snow'
22: app.use('/api/snow', createSnowRouter());
```

- **Rutas:** `nieve` montado (325) con hijos (`""`, `estaciones`, `estaciones/:slug`, `comparar`,
  webcams, mapa); legado `/estaciones` **sin tocar** (10); `**` último (376) → `K1` PASS.
- **Router:** `server.ts:22` monta `createSnowRouter()`; el router **es importable con el loader**
  (§C) y expone **13 rutas**; ejercitado en proceso por **56 tests**.
- **`C27a` (end-to-end sobre el `server.ts` construido): BLOCKED.** Causa exacta: `server.ts:16`
  construye `AngularNodeAppEngine` en ámbito de módulo y **necesita un build manifest que solo produce
  `nx build`**, denegado por tuberías (C1c). Cableado presente; **arranque no verificable aquí**.
- **Deuda declarada, no absorbida:** **9 servicios** de `web-ssr/src/app/pages/**` siguen con
  `USE_MOCK_DATA = true`. Las páginas heredadas (`stations-list`, `station-detail`, `weather`) **no
  consumen** el módulo nieve ni están detrás de un flag. La integración del producto nuevo es
  **aditiva**; la sustitución de los mocks **no está hecha**.

## I. Production readiness — **PARTIAL**

Lo que un responsable de entrega debe saber, sin adornos:

1. **Riesgo de herramienta, no de runtime:** el código está escrito para el bundler (imports sin
   extensión, directorio → `index.ts`). En producción esbuild resuelve en build-time y **el artefacto
   servido no es frágil**; bajo Node plano hace falta el loader del repo. **Pero** un consumidor que
   ejecute `snow/server` bajo Node **sin** el loader no arranca, y esa dependencia debe estar en el
   README de operación, no solo en `06 §12`.
2. **Historial de escritura no autenticada (B2):** existió y **está cerrada** — el router aplica
   `adminApiMiddleware` en cada ruta `/admin/**` (verificado: `admin-auth.ts` fail-closed, 401 sin token).
3. **`SNOW_ADMIN_TOKEN` sin definir ⇒ admin deshabilitado** (401 en todo `/admin/**`). Correcto por
   seguridad, pero significa que **el alta editorial — única vía lícita para estado y espesores — está
   apagada hasta que alguien configure el secreto**.
4. **Nadie ha visto una página renderizada.** Cero observación visual, cero E2E, cero CWV.
5. Pantalla **E** no implementada y **mapa Leaflet real** no montado: declarados, no absorbidos.

---

## 1.9 Las tres frases para el responsable de producto

Sin jerga; cada una corresponde a un hecho verificado arriba.

1. **Cualquiera en internet podía escribir el parte de nieve** — que es la única fuente lícita del estado
   de las pistas. **Cerrado**, y probado de verdad, no declarado: el POST anónimo devuelve **401 y el
   recuento de partes en disco NO cambia** (`C26c`), y sin token configurado el admin **se niega** en vez
   de abrirse (`C26e`).
2. **Las cifras reportadas por el operador ahora llegan a la UI** con su procedencia: `sourceUrl`,
   `author`, `capturedAt` y `confidence` viajan en el DTO. Probado con un ciclo real: parte escrito →
   persistido → leído con `liftsOpen === 12` y su atribución (`C24a`), y `author` vacío se rechaza con
   400 (`C24d`).
3. **El arranque del servidor no se ha podido verificar de extremo a extremo.** El montaje está en el
   código y el router funciona en proceso, pero `server.ts` construye el motor Angular al importarse y
   necesita un build manifest que exige `nx build`, denegado aquí (`C27a` BLOCKED).

---

## 2. Veredicto global de la revisión independiente

**PARTIAL.**

Lo construido está verificado donde es verificable: tipos (`tsc` 0), esquema (8/8), backend (**56/56**),
frontend (**70/70**), contrato legal (arnés **29 PASS** con 1 VACUOUS y 5 UNVERIFIED explícitos). Lo que
falta no es cosmético: **no hay prueba de que el producto funcione en un navegador**, la vía lícita de
datos (editorial) está **apagada** sin secreto, y la previsión real está **BLOCKED** sin credenciales.

No es `PASS` porque `PASS` exige que la aceptación esté cubierta y que **alguien haya observado el
producto funcionando** — y aquí no ha ocurrido.
No es `FAIL` porque no he encontrado ninguna contradicción sin resolver: el único `FAIL` que creí
encontrar (el loader) era un defecto de **mi método**, no del código, y está documentado en §0.2.

**No se sube nada por esfuerzo del equipo.** Que el milestone haya sido difícil no es evidencia de que
esté bien; lo que hay son los comandos de arriba y sus salidas, y lo que dicen es PARTIAL.

### Lo que impide subir a PASS, en orden

1. **Un humano viendo las pantallas A–D, F, G** renderizadas, con build real. *(es el bloqueo mayor)*
2. **`SNOW_ADMIN_TOKEN` configurado** y un parte editorial dado de alta de principio a fin.
3. Documentar la dependencia del loader en el README de operación (no solo en `06 §12`).
4. Credenciales A1/A2 (fuera del equipo) para previsión real.
5. Pantalla **E** y el montaje real de Leaflet para F.
