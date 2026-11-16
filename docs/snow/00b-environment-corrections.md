# Correcciones verificadas a FASE 0 (00-environment-audit.md)

Fecha: 2026-11-16. Autor: capitán (Lead). Método: cada afirmación re-ejecutada por el capitán, no
aceptada del informe de un miembro. Este documento es la **fuente de verdad** cuando contradiga
`00-environment-audit.md`, que se deja sin editar para conservar la traza de la corrección.

---

## C1. VERIFICACIÓN: Nx NO es operativo en este sandbox (corrige 00 §7, §10.1)

**Afirmación original (00 §10.1):** "Puertos loopback bloqueados → verificar `nx serve`".
**Resultado:** la premisa era **falsa** y la conclusión la salvó por accidente.

Pruebas del capitán:

| Prueba | Comando | Resultado |
|---|---|---|
| Loopback TCP | servidor + cliente Node en `127.0.0.1:47999` | `CLIENT_OK 200 PONG` → **la red local funciona** |
| Nx versión | `npx nx --version` | `v21.5.3` (local) → el CLI arranca |
| Nx build | `nx build web-ssr --configuration=development` con `NX_DAEMON=false` | **FALLA**: 3× "The plugin worker is exiting as it was not connected to within 5 seconds" → "NX Failed to start plugin worker" |
| tsc | `tsc -p web-ssr/tsconfig.app.json --noEmit` | **exit 0** (≈0 s) |

**Conclusión operativa:** el fallo es del **plugin worker de Nx**, no de la red. Lo que falló
originalmente en FASE 0 fue el bind de Chrome CDP (`--remote-debugging-port`), un caso distinto que
se malatribuyó a la red.

**Consecuencias vinculantes para el equipo:**
1. **`nx build` / `nx serve` / `nx run-many` NO son un gate de verificación válido** aquí. Nadie debe
   declarar un cambio "verificado" con Nx.
2. El gate ejecutable es **`node_modules/.bin/tsc -p <tsconfig> --noEmit`** (exit 0 requerido).
3. `nx` sigue sirviendo para inspección del grafo (`nx show projects`) — solo el worker de plugins falla.
4. Cualquier tarea que requiera un bundle real (medición de Core Web Vitals, E2E en navegador real)
   queda **BLOCKED** hasta que se arregle el entorno, y debe declararse BLOCKED, no simularse.

## C1d. MEDICIÓN DE EXIT CODES: la causa exacta (obligatorio para todos los gates)

Dos miembros detectaron que una medición de `exit 0` podía no ser fiable (re-researcher) y que la
causa no era exactamente "el pipe lo enmascara" (data-providers). El capitán midió cuatro patrones:

| Patrón | Resultado real |
|---|---|
| `node -e "process.exit(3)"` y leer al momento | **3** |
| `node … \| Select-Object -First 5` (pipe a cmdlet, pwsh 7) | **3 — el pipe NO lo enmascara** |
| `$o = node …; $rc = $LASTEXITCODE` y leer `$rc` | **3 — la captura en variable lo conserva** |
| `node …exit 3; node …exit 0` → leer `$LASTEXITCODE` | **0 — EL CÓDIGO SE PIERDE** |

**Causa exacta:** `$LASTEXITCODE` es una variable global del proceso de PowerShell; **cualquier
comando nativo posterior la sobrescribe**. No es el pipeline.

**Regla obligatoria:** todo gate se reporta como **el comando exacto y su código medido
inmediatamente** (`tsc … ; $rc = $LASTEXITCODE`), y nunca se cita un `exit 0` deducido de una
ejecución anterior ni de una salida consolidada. Un `exit 0` sin comando y código medido se trata
como **NO VERIFICADO**.

Matiz de honestidad: la regla anterior ("el pipe enmascara el código") era una **sobredescripción**;
en pwsh 7 el pipe y la captura lo conservan. Se conserva la práctica estricta porque es la que
sobrevive a la reordenación de comandos, pero la causa se documenta tal cual para que nadie crea que
está a salvo (o en riesgo) por usar o no un pipe.

Detectado por data-providers (t12) como "el bloqueo es el spawn, no los puertos". El capitán
refinó la causa exacta con cuatro medidas:

| Medida | Código | Resultado |
|---|---|---|
| spawnSync con `stdio:'pipe'` | `spawnSync(node, […], {stdio:'pipe'})` | `error.code = EPERM`, `status = null`, stdout/stderr `undefined` |
| spawnSync con `stdio:'inherit'` | ídem | **status 0** (sin captura) |
| spawnSync con `stdio:'ignore'` | ídem | **status 0** |
| spawnSync con stdout a **fichero** | `stdio:['ignore', fdFichero, fdFichero]` | **status 0** y se lee la salida del hijo (`42`) |

**Causa raíz:** el sandbox deniega la creación de **tuberías (pipes) anónimas**. Lanzar procesos
está permitido; lo que falla es conectarlos con `stdio: 'pipe'`.

**Consecuencias (esto es lo importante para planificar):**
1. `node --test` (por defecto) aísla cada fichero en un hijo con stdio pipeado ⇒ **EPERM**. Por eso
   falla, y no por `node:test` en sí.
2. Nx ("plugin worker … not connected within 5 seconds") usa exactamente ese patrón de tubería ⇒
   **misma causa**, no un defecto del proyecto ni de la red.
3. **Un gate que capture la salida de un proceso hijo es la única forma bloqueada.** Un proceso cuyo
   stdout se redirige a **fichero** funciona. Por tanto *podría* existir una vía para `nx build`
   redirigiendo la salida, pero Nx crea la tubería internamente (no es configurable desde nuestro
   lado) ⇒ **sigue BLOCKED**, y esta vez con la causa correcta.
4. Mientras el sandbox use `stdio:'pipe'`, cualquier herramienta que dependa de capturar stdout de un
   hijo está fuera: `node --test` por defecto, Playwright, `nx build`. No se debe intentar "arreglarlo"
   con reintentos.

**Gate de tests vigente:** `node --test --test-isolation=none <fichero1> <fichero2> …` (C1b).
Alternativa validada si se necesita aislar por proceso: un runner propio que lance cada fichero con
`stdio` a fichero y lea el resultado del fichero, en vez de una tubería.

Detectado por backend-impl en t5 y re-verificado por el capitán con dos ficheros de prueba reales:

| Invocación | Resultado |
|---|---|
| `node --test <fichero>` (por defecto) | **FALLA**: `Error: spawn EPERM` (errno -4048). El runner aísla cada fichero en un proceso hijo con stdio pipeado; el sandbox de Windows deniega la creación de pipes. |
| `node --test <directorio>` | FALLA aunque se acepte el fichero: `ERR_UNSUPPORTED_DIR_IMPORT` |
| `node --test --test-isolation=none <f1> <f2>` | **exit 0**: `tests 2 · pass 2 · fail 0` |

**Gate de tests canónico (obligatorio):**
`node --test --test-isolation=none <ruta/f1.test.mjs> <ruta/f2.test.mjs> ...`

Reglas derivadas:
1. `--test-isolation=none` es **obligatorio**; sin él no se ejecuta ni un test y el fallo es de
   *ejecución*, no del código. Un "tests en verde" sin el flag es una falsedad.
2. Hay que pasar **ficheros explícitos**: un directorio no vale. El script `test` del repo debe
   enumerar los ficheros (por ejemplo con un glob expandido por Node y pasados como argv, o un
   fichero de entrada que importe el resto).
3. Con aislamiento desactivado, todos los ficheros comparten un proceso: **no debe haber estado
   global compartido entre suites** (puertos, ficheros temporales, singletons, `process.env`). Los
   tests deben usar rutas temporales únicas y restaurar el entorno.

## C2. Los 8 `.spec.ts` son placeholders sin valor de cobertura (corrige 00 §7)

La afirmación "1 byte cada uno" es **FALSA**: miden entre 514 y 613 bytes y contienen specs Jasmine
reales. Lo cierto (y lo que importa) sigue siendo: **no hay target `test`**, ninguno se ejecuta y
CI lo declara "(No test target configured yet)". No hay evidencia de que alguno haya pasado nunca.

## C3. Precisión: ningún servicio tiene contrato HTTP ejercitado (corrige 00 §3)

Varios servicios **declaran** rutas `/api/v1/...`, pero todos resuelven por mocks
(`USE_MOCK_DATA: true` en stations-list/station-detail; mocks `assets/mocks/*` en meteo). Lo correcto
no es "sólo 3 servicios tienen contrato HTTP real" sino: **cada servicio declara un contrato que
nadie ejercita**, y no existe backend que lo sirva.

## C4. `pages/admin/shared/` SÍ existe (corrige la corrección de t2)

`web-ssr/src/app/pages/admin/components/shared/` existe con **14** subdirectorios
(`admin-table`, `admin-filters`, `admin-empty-state`, `admin-badge`, `admin-modal`…). El informe de
t2 probó la ruta `pages/admin/shared/`, que es distinta. Existe y es reutilizable.

## C5. El 404 de la referencia no tiene estado de error (evidencia nueva, no corrección)

`/estacion-esqui/esto-no-no-existe/parte-de-nieve/` **redirige a `/estaciones-esqui/`** y sirve esa
página sin mensaje (Evidencia `ev_08d6149b`). Requisito propio: nuestra app debe tener un 404 real.
Nota: la ruta de prueba del informe contiene el slug exacto; el comportamiento observado (redirect
silencioso) es lo que se cita.

## C6. La captura es de pretemporada: los estados poblados NO están observados

El 16/11/2026 todas las estaciones leen "Cerrada" y **ambos rankings devuelven su estado vacío**.
Por tanto: el estado *poblado* (parte con nieve, km abiertos, rankings con datos) es
**NO OBSERVADO**. Ningún diseño ni test debe asumir su formato como hecho; los implementadores deben
tratarlo como desconocido y tolerar tanto vacío como poblado.

## C7. Trampa de artefactos heredados

Los `*.network.json` generados por el script de extracción temprano están **vacíos** (`[]`, 2 B) y los
`*.network-api.txt` están **vacíos** (0 B): no prueban nada. La conclusión "no hay API" se apoya solo
en la captura N1 con eventos reales. Corregido en `04-network-and-data-analysis.md` §4.

---

## Resumen de estados afectados

| Estado de cierre | Efecto de las correcciones |
|---|---|
| REVERSE ENGINEERING | Sin cambio: PASS parcializado por pretemporada (C6) |
| BACKEND | Gate = `tsc --noEmit`, no `nx build` (C1) |
| FRONTEND | Sin bundle verificable → SSR/instanciación no demostrable (C1) |
| SEO/PERFORMANCE | **BLOCKED**: sin build no hay medición de CWV reproducible (C1) |
| TESTS | Runner a añadir; los 8 `.spec.ts` no aportan (C2) |
| INTEGRACIÓN | Sin `nx build` no hay gate de integración; usar tsc + suite (C1) |
