# FASE 8 — Checklist de auditoría para t10 (claims falsificables)

Rol: **revisor independiente**. Este documento no implementa nada: convierte las afirmaciones de
`02`, `05`, `05b`, `06`, `07` en **comprobaciones ejecutables** y define cómo se emite el veredicto.

Autor: `re-researcher` · Fecha: **2026-11-16**.
Herramientas:
[`scripts/snow/audit.mjs`](../../scripts/snow/audit.mjs) (el arnés),
[`typecheck-gate.mjs`](../../scripts/snow/typecheck-gate.mjs) (build gate in-process),
[`negative-control.mjs`](../../scripts/snow/negative-control.mjs) (¿pueden fallar los detectores?),
[`gate-control.mjs`](../../scripts/snow/gate-control.mjs) (¿puede haber verde con build rojo?).

---

## 0. Qué es este arnés y qué **no** es (límite estructural, dicho primero)

**Es un control de FORMA, no de comportamiento.** Ningún check ejecuta el módulo: todos inspeccionan
texto del código o el contenido de ficheros JSON. `PASS` significa *"el código fuente contiene/no
contiene esta forma"*, **nunca** *"el módulo hace esto en ejecución"*.

**Consecuencia directa (válida para el veredicto de t10):** las siguientes implementaciones
plausibles-pero-erróneas **no las puede detectar este arnés**, y cada una necesita un **test de
comportamiento en t9**:

| Fallo plausible | Por qué el arnés no lo ve | Quién lo cubre |
|---|---|---|
| 401 que salta por la razón equivocada, o siempre | el arnés solo ve si existe un símbolo de auth | t9 (comportamiento) |
| 401 presente pero el POST anónimo **igual escribe** | no hay ejecución, no hay escritura observable | t9 |
| 404 con procedencia añadida y sin `status:'not_found'` | el cuerpo no se genera nunca en el arnés | t9 |
| `provenance.updatedAt` obsoleto o siempre igual a `observedAt` | los valores no se comparan en ejecución | t9 |
| `not_configured` bien declarado en un router **nunca montado** | el montaje es de `server.ts`, no del router | t9 + revisión |
| `image: []` en fuente con `push('feratel')` en runtime | mutación en ejecución invisible al `grep` | t9 |
| `FALLBACK_CHAINS` correcto en fuente pero mutado al importar | módulo no se importa | t9 |

**Lo único que el arnés sí observa ejecutando de verdad es el build:** `G1` invoca la **API del
compilador de TypeScript en el mismo proceso** (`ts.createProgram` + `getPreEmitDiagnostics`), sin
subproceso, y por eso no depende del bloqueo de tuberías (C1c). Ese es un gate real, no una forma.

---

## 0.1 Cómo se emite el veredicto (leer antes de cualquier tabla)

1. **Un resumen de un miembro no es evidencia.** Se re-ejecuta el comando y se pega su salida.
2. **Cuatro estados, ninguno se disfraza de otro:**
   - `PASS` — el check se ejecutó **aquí**, **encontró sujeto**, y la afirmación se sostiene.
   - `FAIL` — se ejecutó y la afirmación **es falsa**.
   - `VACUOUS` — se ejecutó pero **no había nada que examinar** (colección vacía, fichero sin
     registros). Prueba que el **detector** existe, **no** que los datos cumplan. **No se suma a
     `PASS`**: se imprime aparte y la línea de resumen es
     `PASS=n VACUOUS=n FAIL=n UNVERIFIED=n`.
   - `UNVERIFIED` — **no se pudo ejecutar** (código ausente, sandbox, herramienta no disponible).
     **Nunca se reporta como PASS.** Lleva el comando exacto que lo probaría.
3. **"exit 0" sin comando y sin salida no cuenta.** Un suite que ejecuta **0 tests** es FAIL, no PASS
   (`node --test` sin ficheros explícitos ejecuta 0 y sale 0: trampa conocida, 00b C1b).
4. **Límites del entorno (declarados, no negociables):** Nx roto (`nx build/serve/lint` no son gates);
   E2E y Core Web Vitals **imposibles** de medir; `child_process` **EPERM** desde dentro de un script
   Node. **Por eso el build gate `G1` se evalúa in-process con la API de TypeScript**, no por
   subproceso: es el único gate que el arnés observa ejecutando de verdad. El único runner de tests es
   `node --test --test-isolation=none <ficheros explícitos>`.
5. **Veredicto por estado de cierre**, uno de `PASS` / `PARTIAL` / `BLOCKED` / `FAIL`, cada uno con la
   salida que lo sostiene. `BLOCKED` = falta evidencia o entorno; `FAIL` = contradicción determinada.
   Un cierre sostenido **solo** por un `PASS` del arnés se reporta **PASS-and-VACUOUS** (control de
   forma), nunca `PASS` a secas.

---

## 0.1bis Por qué los cuatro estados importan (no es vocabulario, es corrección)

| Estado | Qué prueba | Lo que **no** prueba |
|---|---|---|
| `PASS` | el detector corrió sobre sujetos reales y no encontró violación | que el módulo **se comporte** así en ejecución |
| `VACUOUS` | el detector está vivo | nada sobre los datos (no había datos) |
| `FAIL` | contradicción demostrada | nada más allá de esa afirmación |
| `UNVERIFIED` | — | **nunca** "probablemente bien" |
| `BLOCKED` | — | que esté hecho |

**Regla de lectura:** `PASS + VACUOUS + UNVERIFIED` **no** es "verde". Cada fila `VACUOUS` y cada
`UNVERIFIED` se reportan con su causa y, cuando aplica, el test de comportamiento de t9 que la cubriría.

## 0.2 El arnés debe poder fallar (control negativo)

Un check que nunca falla es decoración. [`scripts/snow/negative-control.mjs`](../../scripts/snow/negative-control.mjs)
inyecta cinco violaciones reales en una copia del árbol y exige que cada check pase a `FAIL`:

```
node scripts/snow/negative-control.mjs
OK   F3 (snow-report referencing an osm_derived id)
OK   M2 (credential literal in a seed file)
OK   M1 (doc claiming exit 0 for a command nobody ran)
OK   A1 (?? 0 in a snow measurement path)
OK   H1 (image fallback chain made non-empty)
NEGATIVE CONTROL: all injected violations detected     ← exit 0
```

**Este control encontró un fallo real del propio arnés:** la máquina de estados que ignora checklist
pendientes (`- [ ]`) se quedaba "pendiente" y **se tragaba texto añadido al final del documento**, de
modo que M1 daba PASS ante una afirmación falsa. Corregido: el salto es por línea + continuación
indentada, no por documento. Sin el control negativo, M1 habría sido un check inerte siempre-verde.

### 0.2bis Qué prueba y qué NO prueba un control negativo

**Prueba capacidad de detección**, no cobertura actual. Cada caso **inyecta** primero la violación:

- «el detector F3 funciona» → demostrado aquí.
- «los datos de hoy cumplen F3» → **NO** lo demuestra esto; lo dice el `PASS`/`VACUOUS` del arnés.

Son dos afirmaciones distintas y no se pueden intercambiar. Por eso el arnés separa `VACUOUS`
(F3 sobre cero registros) del `PASS` real, y por eso el mensaje del script lo dice.

**Los checks que han encontrado defectos reales** (esto convence más que un recuento de checks):

| Check | Defecto real que encontró | Resolución |
|---|---|---|
| `A2b` | una fila sin parte usaba `null`/`undefined` como valor obligatorio | el autor pasó a **omitir** los campos |
| `E3` | un comentario citaba el endpoint de teselas OSM prohibido | eliminado |
| `A2` | `explorer-logic.ts` devolvía `-1` como centinela de orden en un comparador | reescrito con `Math.sign` (el propio autor citó 05b §3.2) |
| `J4` | badge de estado delegado: verificó que el componente hijo lleva **palabra + glifo** | PASS tras resolver la composición |

## 0.2ter Determinismo del gate (medido, no asumido)

El capitán midió **2 de 8** ejecuciones en rojo. Investigación:

- El arnés en proceso es determinista (probado 12×: mismo resultado).
- La causa real fue **un fichero editándose entre ejecuciones**: `snow-explorer.component.ts` se capturó
  a medio escribir (`TS1005 ';' expected`, `nfunction`, `urlParams` sin definir) y luego con
  `statusForKey` aún sin exportar. Mientras un implementador guarda un fichero, cualquier gate sobre ese
  fichero es no determinista: no es un fallo del arnés, es el árbol moviéndose.
- Tras estabilizarse el árbol: **12/12 ejecuciones en verde, un único resumen**.

**Regla operativa:** un rojo que desaparece al re-ejecutar sin cambios de código, con errores de
*sintaxis* (`TS1005`) en el mensaje, es señal de escritura en curso, no de regresión. Un rojo con errores
**semánticos** estables (`TS2345`, `TS4111`) es un defecto real.

## 0.3 Gate machinery: imposible verde con build rojo o sin evaluar

[`scripts/snow/gate-control.mjs`](../../scripts/snow/gate-control.mjs) prueba los tres escenarios:

```
OK   red build → non-zero exit — exit=1
OK   red build → RED banner
OK   red build → G1 is FAIL (not UNVERIFIED)
OK   unrunnable gate → G1 is FAIL (closed), not UNVERIFIED
OK   forced UNVERIFIED gate → exit 2 without flag
OK   forced UNVERIFIED gate + --allow-unverified-gates → exit 0
GATE CONTROL: a green summary with a red or unevaluated build gate is impossible
```

Reglas de salida del arnés:

| Situación | Exit | Mensaje |
|---|---|---|
| algún `FAIL` | **1** | `GATE STATUS: RED — a build gate FAILED` |
| gate no evaluado (`UNVERIFIED`), sin flag | **2** | `GATE NOT EVALUATED — the following gates were NOT run` |
| gate no evaluado **con** `--allow-unverified-gates` | 0 si no hay FAIL | el aviso se imprime igual |
| todo evaluado y en PASS | 0 | `GATE STATUS: all build gates evaluated and PASSED` |

## 0.4 Límites del entorno (concedidos por el captain; no se re-litigan)

| Elemento | Estado | Causa |
|---|---|---|
| `nx build` / `serve` / `lint` | **BLOCKED** | denegación de tuberías del sandbox (C1c) |
| E2E en navegador | **BLOCKED** | misma causa |
| Core Web Vitals | **BLOCKED** | sin bundle servido ni medición reproducible |
| Estados poblados de la referencia | **no observados** | captura en pretemporada (C6) |
| Datos reales de proveedor | **BLOCKED** | no existe credencial (A1/A2) |

---

## 1. Estado medido el 2026-11-16 (línea base de la auditoría)

Ejecutado con `node scripts/snow/audit.mjs` sobre el módulo ya implementado:

```
snow module files found: 35
SUMMARY: PASS=26 FAIL=0 UNVERIFIED=6      ← exit 0
```

**K1 (la ruta `**` ausente) está corregida y verificada:** `app.routes.ts:324` contiene
`path: "**"` y el check K1 da PASS. Fue el único FAIL real de la primera pasada.

> **Aviso de volatilidad:** el módulo crecía 17 → 22 → 27 → 30 → 33 → 35 ficheros durante la
> preparación. Este documento es el **método**; el veredicto de t10 se re-ejecuta **al cerrar**.


Gates de subproceso ejecutados a mano, fuera del arnés (por EPERM):

| Gate | Comando | Resultado real |
|---|---|---|
| Type-check con `snow/*` incluido | `node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit` | **exit 0** |
| Invariantes de esquema SQL | `node scripts/snow/check-schema.mjs` | **exit 0**, `RESULT: all invariants hold`, 8 `PASS` |

> **Aviso de volatilidad:** el módulo crece entre pasadas (17 → 22 → 27 → 30 ficheros durante esta
> preparación). Este documento es el **método**; el veredicto de t10 debe re-ejecutarse **al cerrar**,
> no reutilizar esta línea base.

### 1.1 Hallazgos ya abiertos (reales, no ruido de arnés)

| ID | Hallazgo | Evidencia | Impacto |
|---|---|---|---|
| **K1** | **No existe ruta comodín `**`** en `web-ssr/src/app/app.routes.ts`; el array termina en `admin.settings`. Un slug inexistente no renderiza página de error → **se reproduce el defecto de la referencia (E23)** que la matriz (F21) dice corregir | `Get-Content app.routes.ts \| Select-Object -Last 12` | **Alto** — F21 y 07 §10.4 lo exigen; contradice 02 F21 y 06 §11.3 |
| **J2-b** | El **editor SEO del admin** expone un campo `name="keywords"` (`admin-blog.component.html:382`). No se renderiza `<meta name="keywords">` (por eso J2 = PASS), pero el modelo sigue creyendo en una señal SEO muerta | `audit.mjs` J2 evidence | **Bajo** — mejora, no bloqueo; dejarlo o eliminarlo es decisión de producto |

Los dos **FAIL falsos** que el arnés produjo y que se corrigieron (quedan documentados para que nadie
los vuelva a reportar):

- **E1 falso:** `fetch(` en `blocked-providers.ts` es la **firma del método** del adapter
  (`async fetch(input)`), no una llamada de red. La comprobación ahora busca **egress real**
  (`globalThis.fetch(`, `window.fetch(`, `https.request(`, `new URL('http…`) y da PASS.
- **I2 falso:** `ipma` en el union `ProviderId` cumple 05b §4.1 (debe existir para que la guarda lo
  rechace). La comprobación ahora exige presencia en `BLOCKED_PROVIDER_IDS` (está: línea 11) y da PASS.

**Lección aplicada (de la que sirve):** un `grep` sobre un identificador puede confundir *declarar un
proveedor bloqueado* con *usarlo*. Toda comprobación por texto debe excluir declaraciones de tipo y
mirar el uso real.

---

## 1.2 Checks hostiles añadidos a petición del captain (2026-11-16)

Diseñados para que **no se puedan satisfacer cosméticamente**:

| ID | Afirmación | Por qué es hostil | Comando |
|---|---|---|---|
| **F3** | Ningún registro de `snow-reports` referencia un identificador `osm_derived` (`node/123`, `way/…`, campos `osm_type`/`osm_id`/`geometry`…), recorriendo los registros **recursivamente** | no basta con que "los ficheros sean distintos": mira el **contenido** registro a registro y también los campos prohibidos en `stations` | `audit.mjs F3` |
| **F4** | `snow-reports` y `osm-derived` viven en **ficheros separados** | impide fusionar la base derivada ODbL con la editorial | `audit.mjs F4` |
| **C5** | **Toda ruta registrada** honra el contrato: ninguna emite 500 para `no_data`/`not_configured`/`blocked`/`rate_limited` | enumera las rutas **desde el código del router** (`router.get/post/…`), no desde una lista escrita a mano: una ruta nueva que olvide el contrato falla | `audit.mjs C5` |
| **M1** | Ningún documento afirma `exit 0`/`PASS` de un comando que el arnés no ejecutó | el fallo real de 05b (validación reportada como verde sin comando). Ignora checklist pendientes (`- [ ]`) y líneas que describen fallos | `audit.mjs M1` |
| **M2** | Ningún seed ni config contiene una cadena con forma de credencial (`AIza…`, `sk-…`, `Bearer …`, `key="<valor>"`, bloque de clave privada) | detecta la fuga de secretos antes del commit; excluye helpers de redacción y nombres de variable de entorno | `audit.mjs M2` |

**Prueba de que no son inertes:** las cinco (`F3`, `M2`, `M1`, `A1`, `H1`) están cubiertas por el
control negativo de §0.2 y **fallan** cuando se inyecta la violación correspondiente.

---

## 1.3 Estado de los 6 `UNVERIFIED` (ninguno es cobertura)

| ID | Por qué no se puede verificar | Qué falta |
|---|---|---|
| **G1** | el arnés no puede lanzar `tsc` (EPERM) | ejecutar a mano `node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit` (**hecho, exit 0**, ver §1) |
| **F1** | el arnés no puede lanzar `check-schema.mjs` (EPERM) | ejecutar a mano `node scripts/snow/check-schema.mjs` (**hecho, exit 0**, ver §1) |
| **E2** | no existen plantillas `.html` de pantallas snow todavía | t8 |
| **J3** | ídem (sin plantillas que inspeccionar) | t8 |
| **J4** | ídem (sin plantillas donde verificar glifo+texto) | t8 |
| **L1** | no existen `*.test.ts` bajo `snow/*` | t9 |

G1 y F1 son **verificables a mano y verdes**; su `UNVERIFIED` es una limitación del arnés, no del
código — se declara así para no confundir "no probado" con "no hecho".

---

## 2. Checklist de afirmaciones falsificables

Columnas: **ID** · **afirmación tal como la hacen los documentos** · **fuente** · **comando que la
prueba o la refuta** · **estado hoy**.

### 2.1 Entorno y gates

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| G1 | `tsc -p web-ssr/tsconfig.app.json --noEmit` sale 0 con `snow/*` incluido | 06 §2 | `node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit; echo $?` | **PASS** (manual) |
| G2 | `node --test` sin `--test-isolation=none` falla con `spawn EPERM` | 00b C1b / 06 §12 | `node --test web-ssr/src/snow/**/*.test.ts` → no debe salir 0 | UNVERIFIED (sin tests aún) |
| G3 | Con `--test-isolation=none` los tests corren y sale 0 | 00b C1b | `node --test --test-isolation=none <ficheros>` | UNVERIFIED (sin tests aún) |
| G4 | El suite ejecuta **> 0** tests | Regla §0.3 | misma salida: `# pass` debe ser ≥ 1 | UNVERIFIED |
| G5 | `nx build`/`serve` no son gates (fallan) | 00b C1 | `npx nx build web-ssr` → falla por plugin worker | CONCEDIDO por el captain; no se reintenta |

### 2.2 Anti-sentinel (D3 / 05b §3.2 / 07 P1)

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| A1 | Ningún `?? 0`, `\|\| 0` en cálculo/pintado de medidas | 07 P1 | `audit.mjs A1` | **PASS** (0 ocurrencias en 22→30 ficheros) |
| A2 | `-1`/`-99` solo aparecen en el sitio de normalización | 05b §3.2 | `audit.mjs A2` | **PASS** |
| A3 | `formatMeasurement(null)` **no compila** al leer `.text` | 07 §10.3 | copiar la función + `tsc --strict` sobre un uso inválido → `TS2339` | UNVERIFIED (comprobar cuando exista) |
| A4 | Ningún campo numérico del dominio vale `NaN`/`Infinity` en datos sembrados | 05b §8 | `node -e` sobre `snow/store/json-store/seed/*.json` buscando `null` vs sentinel | UNVERIFIED |

### 2.3 Procedencia (05b §1.1)

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| B1 | `Provenance` tiene los 8 campos + `authorization` + `attribution` | 05b §1.1 | `audit.mjs B1` | **PASS** |
| B2 | Ningún `allowed-with-attribution` sale sin `attribution` | 05b §8 | `audit.mjs B2` + test dedicado | PASS parcial (guarda presente; **falta test**) |

### 2.4 Borde HTTP (02 §3.2 / 06 §8.2)

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| C1 | Falta de credencial ⇒ **200** `not_configured`, **nunca 500** | 02 §3.2 | `audit.mjs C1` | UNVERIFIED (sin capa HTTP) |
| C2 | `no_data`/`not_configured`/`blocked` ⇒ 200 | 02 §3.2 | `audit.mjs C2` | UNVERIFIED |
| C3 | Estación inexistente ⇒ 404 `station-not-found`, **sin redirigir** | 02 §3.2 / E23 | `audit.mjs C3` (`grep res.redirect`) | UNVERIFIED |
| C4 | `data` no se puede leer sin estrechar en `status==='ok'` | 05b §2 | `tsc` sobre `dto.data` sin narrowing → debe fallar | UNVERIFIED |

### 2.5 Editorial (05b §7.3 / 06 §9.3)

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| D1 | Alta rechazada si falta `sourceUrl`/`capturedAt`/`author`/`confidence` | 05b §7.3 | `audit.mjs D1` | **PASS** |
| D2 | `confidence ∈ [0,1]` validado | 05b §7.3 | `audit.mjs D2` | **PASS** |
| D3 | Ningún `-99.0`/sentinel AEMET llega al dominio | 05b §3.2 | test del adapter AEMET con payload `-99.0` | UNVERIFIED |

### 2.6 Proveedores bloqueados y licencias (05 §2 / 05b §2.1(2), §4.2, §7.4)

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| E1 | Adapter bloqueado devuelve `blocked` **sin red** | 05b §2.1(2) | `audit.mjs E1` (egress real) | **PASS** (`BLOCKED_PROVIDER_IDS` ×14, sin `globalThis.fetch`) |
| E2 | Webcams: **cero** `<img>`/`<iframe>`/`background-image` externos | 07 P2 / 05b §7.4 | `audit.mjs E2` | UNVERIFIED (sin plantillas) |
| E3 | Sin `tile.openstreetmap.org` / MapTiler / Stadia (excluye el union) | 07 P3 | `audit.mjs E3` | **PASS** |
| I1 | `meteofrance-bpa-html` y `meteoandorra` con `ttlMs: 0` | 05b §4.2 | `audit.mjs I1` | UNVERIFIED (sin `CACHE_POLICY`) |
| I2 | `ipma` bloqueado por completo | 05b §4.2 | `audit.mjs I2` | **PASS** |
| I3 | Toda cuota marcada `verified:false` salvo self-hosted | 05b §4.3 | `audit.mjs I3` | UNVERIFIED |

### 2.7 Cadenas de fallback (05b §3 / D4)

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| H1 | `FALLBACK_CHAINS.image === []` | 05b §3.1 | `audit.mjs H1` | **PASS** |
| H2 | `operational-status` y `snow-depth` solo `['editorial-report']` | 05b §3 / D4 | `audit.mjs H2` | **PASS** |
| H3 | Toda cadena termina en `NoDataReason`, nunca `null` | 05b §3.1 | `audit.mjs H3` + `grep "return null;"` | **PASS** |

### 2.8 ODbL y almacén (05b §5 / R2)

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| F1 | Separación `osm_derived_*`: `station` sin geometría/tags; `osm_derived_*` sin campos editoriales | 05b §5 | `node scripts/snow/check-schema.mjs` | **PASS** (manual, exit 0) |
| F2 | El store JSON no mezcla atributos OSM en `station`/`snow_report` | 05b §5 | `audit.mjs F2` + inspección de `seed/*.json` | **PASS** |
| F3 | `snow/store/schema.sql` coincide con el bloque de 02 §3.3 | 02 §3.3 | diff semántico de nombres de tabla/columna | UNVERIFIED |

### 2.9 SEO y accesibilidad (07 P4–P10, D1–D12)

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| J1 | Ningún viewport con `user-scalable=no`/`maximum-scale` en `web-ssr/src` | 07 P4 / D1 | `audit.mjs J1` | **PASS** |
| J2 | Ningún `<meta name="keywords">` | 07 P9 / D3 | `audit.mjs J2` | **PASS** (nota: el editor admin aún modela `keywords`) |
| J3 | Sin `style="background-color:#…"` en plantillas snow | 07 P5 / D14 | `audit.mjs J3` | UNVERIFIED |
| J4 | Estado de estación no se comunica solo por color | 07 §5.3 / WCAG 1.4.1 | `audit.mjs J4` | UNVERIFIED |
| J5 | Canonical + JSON-LD presentes en A–G (SSR) | 07 §11 / D4–D5 | `curl` al HTML SSR (imposible sin build) → **BLOCKED** | BLOCKED (entorno) |
| J6 | Contraste medido ≥ 4.5:1 | 07 §6.4 | script de contraste sobre tokens | UNVERIFIED |

### 2.10 Rutas y errores

| ID | Afirmación | Fuente | Comando | Hoy |
|---|---|---|---|---|
| K1 | Existe ruta `**` que renderiza error | 02 F21 / 07 §10.4 | `audit.mjs K1` | **FAIL** — no existe; reproduce E23 |

---

## 3. Cómo se emite el veredicto de t10

1. Ejecutar `node scripts/snow/audit.mjs` y guardar la salida.
2. Ejecutar a mano los gates de subproceso y pegar salida: `tsc -p web-ssr/tsconfig.app.json --noEmit`,
   `node scripts/snow/check-schema.mjs`, `node --test --test-isolation=none <ficheros>`.
3. Clasificar:
   - **FAIL** si algún check de §2 da `FAIL` (contradicción demostrada).
   - **BLOCKED** si falta evidencia por entorno (J5/E2E/CWV) o por código no escrito (C1–C4, I1–I3, J3–J4).
   - **PARTIAL** si hay PASS y BLOCKED mezclados y **ningún** FAIL.
   - **PASS** solo si todo lo exigible por el contrato de la entrega está en PASS **o** explícitamente
     fuera de alcance con motivo.
4. **No** se acepta como PASS: un resumen sin comando; un `exit 0` de un suite con 0 tests; un
   `UNVERIFIED` presentado como verde; una afirmación de CWV/E2E sin medición.

---

## 4. Lo que este arnés **no** puede probar (y hay que decirlo así)

- Comportamiento en navegador real (SSR hidratado, foco, lectores de pantalla): sin build/dev-server.
- Core Web Vitals: sin medición reproducible.
- Cuotas reales de proveedor (`RATE_LIMITS.verified`): ninguna se declara verificada; el arnés solo
  comprueba que están marcadas `verified:false`.
- Corrección legal de las licencias: eso es 05/05b + revisión humana, no un `grep`.
- Que un `PASS` de texto signifique *calidad*: solo prueba que la afirmación no es falsa en la forma
  comprobada. Los criterios de diseño se validan por revisión, no por script.
