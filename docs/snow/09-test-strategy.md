# FASE 09 — Estrategia de pruebas (runner, contratos, E2E, accesibilidad)

Módulo de nieve (`snow/*`). Entregable de investigación QA previo a `t7` (backend), `t8` (frontend),
`t9` (QA) y `t10` (auditoría).
Fecha: **2026-11-16**. Autor: `data-providers`.

> **Este documento no instala nada y no edita `package.json` ni ningún `project.json`.**
> `backend-impl` es el propietario de esos ficheros. Aquí se entrega la recomendación, la
> justificación medida y los cambios exactos a aplicar.

---

## 0. Reconocimiento del entorno (capacidades, no resultados de test)

> **Aviso de exactitud.** Esta sección **no es evidencia de tests del módulo**. Ningún test de
> `snow/*` existe todavía, de modo que ningún test del módulo ha sido ejecutado ni pasa. Lo que
> sigue es **reconocimiento del entorno**: sondeos throwaway hechos antes de escribir el plan,
> para elegir un runner que sea ejecutable aquí y en CI. Los sondeos se hicieron sobre scripts
> temporales en `$TEMP`, ya borrados; **no son parte del entregable y no deben citarse como
> cobertura**. Cuando `t9` implemente los tests, esos sí contarán como evidencia.

Los sondeos (R1–R11, "reconnaissance", no "test") establecieron estas capacidades del host:

| # | Pregunta de entorno | Medio del sondeo | Respuesta observada |
|---|---|---|---|
| R1 | ¿Hay runner de tests instalado? | comprobación de existencia en `node_modules` | **No**: `jest`, `vitest`, `@nx/jest`, `@nx/vite`, `@playwright/test`, `karma`, `axe-core` → todos ausentes |
| R2 | ¿Los 8 `.spec.ts` existentes son ejecutables? | lectura de `home.spec.ts` | **No**: usan `TestBed` + `expect` de Jasmine/Jest; sin runner no se ejecutan |
| R3 | ¿`tsc` funciona directo, sin Nx? | `tsc -p web-ssr/tsconfig.app.json --noEmit` | **Sí**, exit 0 |
| R4 | ¿`nx build web-ssr` funciona? | `node node_modules/nx/bin/nx.js build web-ssr` | **NO**: project graph no computable + `Failed to start plugin worker` |
| R5 | ¿Es un defecto del proyecto o del entorno? | `nx show projects --verbose` (repro mínimo) | **Entorno**: falla también sin compilar nada del proyecto |
| R6 | ¿Se puede abrir un puerto loopback? | servidor `node:http` en `127.0.0.1:4200` + `fetch` | **Sí**: bind correcto y `fetch` respondió `200` |
| R7 | ¿`nx serve` sirve en :4200? | `nx serve web-ssr --port=4200`, sondeo 250 s | **NO**: el puerto nunca escucha (muere antes, por R4/R5) |
| R8 | ¿`node --test <archivo>` funciona? | `node --test` sobre un fichero trivial | **NO**: `EPERM ... syscall: 'spawn'` |
| R9 | ¿`node:test` **en proceso** funciona? | `node -e "require('./t.cjs')"` | **Sí**: el runner arranca y reporta |
| R10 | ¿Node 24 ejecuta TypeScript nativo? | módulo `.ts` con tipos, cargado por `require` | **Sí**: type-stripping sin dependencias ni flags |
| R11 | ¿La lógica pura es testeable sin navegador? | verificación de que el enfoque R9+R10 es aplicable | **Sí**, es lógica pura sin DOM |
| R12 | ¿Existe un runner oficial que funcione aquí? | `node --test --test-isolation=none` con 1 fichero, varios y TS | **Sí**: exit 0; dos ficheros comparten el **mismo PID** (in-process real) |

**Conclusión estructural del reconocimiento:** el sandbox bloquea **lanzar procesos hijo**
(`spawn` → `EPERM`). Eso explica a la vez R4/R5 (los plugin workers de Nx son procesos hijos) y R8
(`node:test` en modo fichero lanza hijos). Los puertos loopback **sí** funcionan (R6), al contrario
de lo que se asumía.

**Corrección al supuesto heredado:** el encargo de esta tarea dice que el sandbox *"refused local
listening ports (verified 127.0.0.1:9333 and :9334)"*. El sondeo R6 muestra que **un puerto de
escucha sí se puede abrir**; la denegación de `127.0.0.1:9333/9334` corresponde a **conexiones a
puertos CDP de un navegador externo** que no estaba escuchando, no a la imposibilidad de abrir
puertos. La distinción importa: R6 hace viable el test de integración HTTP in-process (§3.4),
mientras que lo realmente bloqueado (R4/R5/R7/R8) es **`spawn`**.

---

## 1. Recomendación de runner

### 1.1 Decisión: **`node:test` en modo in-process, sin dependencias nuevas**

Justificación medida, no de catálogo:

1. **Cero instalaciones.** R9/R10 prueban que `node:test` + el *type-stripping* nativo de Node 24 ya
   ejecutan tests de TypeScript en este repo. No añade `jest`, `vitest`, `ts-jest`, `babel` ni
   `karma` a un monorepo que hoy no los tiene.
2. **Esquiva el bloqueo del sandbox.** Al ejecutarse **en proceso** (R9) no necesita `spawn`, que es
   justo lo prohibido (R8).
3. **Es compatible con el CI (Node 20).** Ver §1.4: en CI se usa `tsx`/`ts-node` **solo allí**, o
   mejor, se compila con `tsc` y se ejecuta el JS. El contrato de tests no cambia.
4. **Encaja con el alcance real.** Los contratos de t3 son **lógica pura** (uniones, TTLs, cadenas,
   breaker). No requieren DOM, ni Angular `TestBed`, ni navegador.

**Descartado y por qué:**

| Opción | Por qué no |
|---|---|
| `Jest` + `@nx/jest` | Añade ~1 generador, `jest-preset-angular`, `jsdom`; y **Nx no arranca en este entorno** (R4/R5), así que el target no se podría ejecutar aquí |
| `Vitest` | Más ligero que Jest pero sigue siendo dependencia nueva + configuración Vite en un repo con `@angular/build`; no aporta nada sobre `node:test` para lógica pura |
| `Karma`+Jasmine | Requiere **navegador** y lanzar procesos (bloqueado, R8); es el runner que Angular abandonó |
| `Playwright` | Sólo tiene sentido para E2E, y el E2E está bloqueado (§3). Se documenta como opción futura, no se instala |

### 1.2 Cambios exactos a aplicar por `backend-impl`

**`package.json` — script nuevo (no tocar dependencias):**

```json
{
  "scripts": {
    "test:snow": "node scripts/snow/run-tests.mjs",
    "test:contracts": "node scripts/snow/run-tests.mjs --only=providers"
  }
}
```

**`scripts/snow/run-tests.mjs`** (nuevo, ~30 líneas, sin dependencias): recorre las rutas de test y
las `require()` **en el mismo proceso**, acumulando resultados con `node:test`'s `run()`. No usa
`node --test` (R8) ni `spawn`.

> **Mejora descubierta después (R12): existe un camino oficial y más simple.**
> `node --test --test-isolation=none <ficheros>` **funciona en este sandbox** (exit 0 con un fichero,
> con varios ficheros y con TypeScript nativo). La razón es coherente con C1c: `--test-isolation=none`
> ejecuta los ficheros **en el mismo proceso**, sin el hijo con *pipes* que causaba el `EPERM` del
> `node --test` por defecto. Comprobado además por PID: dos ficheros reportan **el mismo `process.pid`**.
>
> **Consecuencia:** el runner pasa a ser el oficial, y el script casero queda como respaldo:
>
> ```
> node --test --test-isolation=none snow/**/*.test.ts
> ```
>
> La forma exacta y reproducible que se reportará en `t9` es la enumeración explícita de ficheros
> (no glob, para que la lista quede en el registro):
>
> ```
> node --test --test-isolation=none web-ssr/src/snow/contracts/x.test.ts ... (todos)
> ```
>
> Esto **no cambia** ninguna regla de C1c: sigue sin poder usarse un hijo con `stdio:'pipe'`, y sigue
> requiriendo el guardián anti-fuga de §2ter.3, porque el proceso es compartido.

> **Restricción C1c (hallazgo del capitán, más preciso que el mío).** El sandbox no bloquea el
> lanzamiento de procesos: deniega la **creación de *pipes* anónimos**. Medido: `stdio:'pipe'` →
> `EPERM`; `stdio:'inherit'`/`'ignore'` → exit 0; y `stdout` redirigido a **fichero** → exit 0 con
> salida legible. Consecuencias para este runner y para `t9`:
> 1. **Ningún test puede depender de un hijo con `stdio:'pipe'`**; si un test necesita un hijo, debe
>    redirigir su salida a **fichero**, nunca a pipe.
> 2. El runner importa los ficheros de test **en proceso**: si un fichero de test usara
>    `child_process` con pipe, el `EPERM` aparecería al ejecutar el test, no al cargarlo.
> 3. Explica también Nx ("plugin worker … not connected within 5 seconds" es la misma topología de
>    pipe). Nx sigue **BLOCKED** y no debe reintentarse.
>
> De ahí la regla de diseño: **los tests de `snow/*` son lógica pura y E/S de fichero/socket; cero
> hijos con pipe.**

```js
// scripts/snow/run-tests.mjs  — ejecuta tests EN PROCESO (sin spawn, sin pipe).
import { run } from 'node:test';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOTS = ['snow', 'web-ssr/src/app/snow'].map((p) => resolve(p));
const only = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (e.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

const files = ROOTS.flatMap((r) => (only ? walk(r).filter((f) => f.includes(only)) : walk(r)));

for (const f of files) {
  await import(pathToFileURL(f).href); // Node >=22.6 hace type-stripping nativo
}

let failed = 0;
const stream = run({ concurrency: 1, timeout: 30000 });
for await (const ev of stream) {
  if (ev.type === 'test:pass' && ev.data.nesting === 0) console.log('✔', ev.data.name);
  if (ev.type === 'test:fail' && ev.data.nesting === 0) { console.log('✖', ev.data.name); failed++; }
}
process.exit(failed === 0 ? 0 : 1);
```

**`project.json` — target `test` en el proyecto de la lógica de proveedores:**

```json
{
  "targets": {
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "node scripts/snow/run-tests.mjs",
        "cwd": "{workspaceRoot}"
      }
    }
  }
}
```

> Aviso honesto: con Nx bloqueado (R4/R5) ese target **no se podrá ejecutar en este host**. El
> comando `node scripts/snow/run-tests.mjs` sí funciona directamente (R9/R10/R11). El target existe
> para CI y para entornos donde Nx arranque.

### 1.3 Estructura de ficheros de test

```
snow/providers/contracts.ts          (código de t3)
snow/providers/contracts.test.ts     (tests unitarios)
snow/providers/fallback.test.ts
snow/providers/cache.test.ts
snow/providers/breaker.test.ts
snow/providers/adapters/*.test.ts
snow/data/osm-separation.test.ts     (guarda ODbL)
```

Los `.spec.ts` existentes **se dejan intactos** (no son nuestros, y sin runner Jasmine no se
ejecutan). No se renombran ni se borran.

### 1.4 Tipos obligatorios y compatibilidad de CI

`node:test` ejecutado así **borra tipos sin comprobarlos**: un error de tipos no se detectaría
(R10 ejecuta aunque hubiera un tipo mal puesto). Por eso la estrategia exige **además** un paso de
tipos, que **sí funciona en este host** (R3):

```json
{ "scripts": {
  "typecheck:snow": "tsc -p snow/tsconfig.lib.json --noEmit",
  "verify:snow": "npm run typecheck:snow && npm run test:snow"
} }
```

Regla: **un PR de `snow/*` no está verde si `typecheck:snow` no da exit 0.** Es la única defensa
real de tipos en este entorno.

**Posición de CI (decidida por el capitán, registrada aquí tal cual):**

- Se mantiene **`node:test` in-process** como runner y **`typecheck:snow` como gate obligatorio**.
- **No se reescribe el workflow de CI ahora.** CI corre Node 20 y **no puede verificarse desde este
  host**.
- Por tanto: nuestros gates están **probados en Node 24 local**; la **compatibilidad con CI Node 20
  queda UNVERIFIED**.
- Se documenta un camino de respaldo con precompilación `tsc` para Node 20, **marcado como no
  probado**, para que el hito pueda cerrarse declarando esto en vez de cambiar el pipeline a
  escondidas.

```json
{ "scripts": {
  "test:snow:ci": "tsc -p snow/tsconfig.test.json && node scripts/snow/run-tests.mjs --built"
} }
```

| Entorno | Estado de los gates | Honestidad |
|---|---|---|
| Local, Node 24 | `typecheck:snow` + `test:snow` | Es el entorno donde se desarrolla y donde `t9` medirá |
| CI, Node 20 | `test:snow:ci` (precompilado) | **UNVERIFIED**: no ejecutable ni comprobable desde este sandbox |

El *type-stripping* nativo requiere Node ≥ 22.6; de ahí la bifurcación. El contrato de tests es
idéntico en ambos caminos.

---

## 2. Contratos de t3 → tests concretos

Cada fila es un test exigible a `t9`. Columna "evidencia" = qué demuestra si pasa.

| ID | Contrato (05b §) | Test | Qué demuestra |
|---|---|---|---|
| C1 | §1 `ProviderResult` | **Exhaustividad de la unión**: `switch (r.status)` con el caso `default` tipado `never` compila; y test que recorre los 7 estados y falla si aparece uno sin manejar | El consumidor no puede olvidar un estado |
| C2 | §1 `data` inaccesible sin `ok` | Test de **tipos** en `snow/providers/contracts.type-test.ts` (compilado por `typecheck:snow`): `// @ts-expect-error` sobre `r.data` cuando `status==='no_data'` | La unión discrimina de verdad, no por convención |
| C3 | §1 `NoDataReason` | Un test por **cada uno de los 5 valores** (`outside-season`, `source-silent`, `not-yet-published`, `not-covered`, `license-prohibits`) construyendo el resultado y comprobando que produce texto de UI no vacío | Cobertura total de razones; ninguna cae al "sin datos" genérico |
| C4 | §3.2 anti-sentinel | `toCm(-99) → null`, `toCm('-99.0') → null`, `toCm(0) → 0`, `toCm(NaN) → null`, `toCm(Infinity) → null` | El reconocimiento R11 **indica que el enfoque es aplicable**, no que este test exista ni pase; además fija que `0 cm` no se confunda con "sin dato" |
| C5 | §3 `FALLBACK_CHAINS` | Para **cada una de las 8 claves**: el test recorre la cadena con adapters espía que devuelven `error` y comprueba que **siempre** se sale con `no_data` + `reason` (nunca `undefined`, nunca excepción) | Ningún tipo termina en null silencioso |
| C6 | §3 `image` chain | `FALLBACK_CHAINS.image` es `[]` y `getImage()` devuelve `status:'blocked'`, `reason:'license-prohibits'` | Las webcams no pueden colarse |
| C7 | §2.1 regla 2 | Adapter con `licenseByType[x]='blocked'` ⇒ devuelve `blocked` **sin llamar a `fetch` global** (espía con contador = 0) | La licencia es una guarda ejecutable |
| C8 | §2.1 regla 1 | `fetch` no lanza: se simula `ECONNRESET`, `ETIMEDOUT`, 500, 404 y el resultado es un `ProviderResult` de error/no_data | El borde del sistema no propaga excepciones |
| C9 | §1.1 invariante atribución | Recorrido de todos los resultados; **falla** si `licenseStatus==='allowed-with-attribution'` y `attribution` es `null`/vacío | Cumple AEMET cond. 2 y LO 2.0 |
| C10 | §4.2 `CACHE_POLICY` | `meteofrance-bpa-html.ttlMs === 0` y `meteoandorra.ttlMs === 0`; `aemet.forecastTtlMs === 1800000`; `aemet.maxRevalidateMs === 10800000`; tras TTL+1 ms el resultado es `stale`/refetch | Las TTL legales son constantes comprobadas, no comentarios |
| C11 | §4.2 ODbL | `osm.shareAlike === true` y `protomaps.shareAlike === true`; `ign-es.shareAlike` ausente/false | No se olvida el share-alike |
| C12 | §4.3 breaker | 5 fallos consecutivos → abierto; con `openMs` vencido y 1 sonda OK → cerrado; sonda fallida → reabre | Estados 5/5 min/1 sonda |
| C13 | §4.3 429 | Respuesta 429 con `Retry-After: 120` ⇒ `status:'rate_limited'`, `retryAfterMs===120000` | Respeta la cabecera |
| C14 | §4.3 4xx | 404/400 ⇒ `error`, `retryable:false`, **y el breaker sigue cerrado** | Un 404 semántico no tumbe el servicio |
| C15 | §4.3 no-fallo | `blocked` y `not_configured` **no** incrementan el contador de fallos | Configurar mal no abre el breaker |
| C16 | §6 degradación | Sin `AEMET_API_KEY`: `not_configured` → cadena continúa → `no_data` → la API responde **200** con "Sin datos disponibles"; **nunca 500** | A1/A2 pendientes no rompen la web |
| C17 | §6 guarda pese a config | Con `MAPTILER_API_KEY` definida, `maptiler` sigue devolviendo `blocked` | La licencia gana a la config |
| C18 | §5 ODbL dirección A | `osm_derived_*` **no** contiene ninguna columna editorial (`author`, `confidence`, `source_url`, `captured_at`) | Sin contagio hacia la base derivada |
| C19 | §5 ODbL dirección B | `station` / `snow_report` **no** contienen columnas OSM salvo `osm_ref` | Sin contagio hacia la editorial |
| C20 | §2.1 regla 4 | `requestedAt` inyectado: dos ejecuciones con el mismo `requestedAt` dan resultado idéntico | Determinismo en tests |
| C21 | §2.1 regla 6 | `redactUrl()` elimina `api_key=` de la cadena que se loguea | La clave no llega a los logs |
| C22 | §6 degradación **enumerada** | Ver §2.1: recorre **todas** las rutas de `/api/snow/v1/**` desde una tabla explícita y, con las tres variables sin definir, exige **200** + tupla de procedencia + `status ∈ {'not_configured','blocked'}` y **ninguna** respuesta **500** | La promesa central del encargo; una ruta nueva que olvide el contrato **hace fallar el test** |

### 2.1 C22 — el test de degradación que el capitán retiene como promesa central

El test **no** lista rutas a mano en cada caso: lee la tabla de rutas del propio router, de modo que
una ruta añadida después quede automáticamente cubierta y, si incumple, falle.

```ts
// snow/api/degradation.test.ts  (node:test, in-process)
import test from 'node:test';
import assert from 'node:assert';
import { createSnowApp, SNOW_ROUTES } from '../app.js';

const ENV_PINS = ['AEMET_API_KEY', 'METEOFRANCE_API_KEY', 'PROTOMAPS_BASE_URL'];

test('C22: sin credenciales toda ruta /api/snow/v1/** responde 200 con procedencia', async (t) => {
  for (const key of ENV_PINS) delete process.env[key];           // entorno limpio
  const server = createSnowApp().listen(0, '127.0.0.1');
  const { port } = server.address();
  t.after(() => server.close());

  for (const route of SNOW_ROUTES) {                            // enumeración desde el router
    const path = route.path.replace(':slug', 'formigal-panticelo');
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    assert.notStrictEqual(res.status, 500, `${path} devolvió 500`);   // NUNCA 500
    assert.strictEqual(res.status, 200, `${path} debería degradar a 200`);
    const body = await res.json();
    assert.ok(body.provenance, `${path} sin tupla de procedencia`);
    for (const f of ['source', 'observedAt', 'updatedAt', 'status', 'licenseStatus', 'freshness', 'authorization', 'attribution']) {
      assert.ok(f in body.provenance, `${path} procedencia sin '${f}'`);
    }
    assert.ok(['not_configured', 'blocked'].includes(body.status), `${path} status=${body.status}`);
    assert.strictEqual(body.provenance.freshness, 0);            // sin reloj real (ver §3.6)
  }
});
```

**Requisito de contrato para `t7`:** exportar `SNOW_ROUTES` (lista de `{ method, path }`) junto al
router. Sin esa enumeración el test no puede garantizar que una ruta nueva cumpla; exigirlo es parte
del contrato, no un extra.

**Excepción declarada:** las rutas de administración (`/api/snow/admin/**`) quedan **fuera** de C22
porque requieren sesión; se prueban en su propia suite con 401/403, no con "200 degradado".

C18/C19 se implementan como test de esquema (introspección de DDL o `PRAGMA table_info` si hay
SQLite) **más** un grep de guarda sobre los ficheros de migración, de modo que el test falle aunque
nadie ejecute la migración:

```
test debe fallar si: /osm_derived_/.test(ddl) && /source_url|captured_at|author|confidence/.test(ddlDeEsaTabla)
```

---

## 2bis. Tiempo determinista (reloj fijo, doble zona horaria)

**Problema:** todos los contratos de 05b dependen de tiempo (`observedAt`, `updatedAt`, `freshness`,
`requestedAt`, TTLs, `validFrom`/`validUntil` de avisos y aludes, `capturedAt` editorial). Un test que
use el reloj real es **intermitente por construcción**: `freshness` cambia entre la escritura del
test y su ejecución, y un TTL de 30 min puede caducar a mitad de una suite lenta.

### 2bis.1 Reglas obligatorias

1. **Ningún test llama a `Date.now()` ni `new Date()` sin argumento.** El reloj entra **inyectado**
   (`requestedAt`, y un `Clock` inyectable donde haga falta). Esto ya es 05b §2.1 regla 4.
2. **Instante congelado canónico** para toda la suite:

   ```ts
   export const FIXED_NOW = new Date('2026-11-16T12:00:00.000Z');   // = 13:00 en Europe/Madrid (CET)
   ```

   16-nov-2026 es **invierno**, así que Europe/Madrid está en **CET (UTC+1)**; ese detalle se fija
   explícitamente porque un test escrito en verano (CEST, UTC+2) cambiaría el resultado esperado.
3. **Dos zonas declaradas por test**, porque el producto cruza fronteras (ES/AD/FR/PT todas en CET,
   pero PT comparte zona con ES y el usuario puede estar en otra):

   | Zona | Uso en test | Por qué |
   |---|---|---|
   | `UTC` | Valores almacenados y comparados (`observedAt`, `updatedAt`, TTL) | Los contratos dicen "ISO 8601 UTC"; el almacenamiento no debe depender de la zona del host |
   | `Europe/Madrid` | Formateo de UI, "actualizado hace X", bordes de día | Es la zona del producto y donde aparecen los bugs de cambio de día |

4. **El TZ del proceso se fija en el runner**, no en cada test, para que no haya fuga entre ficheros:

   ```js
   // scripts/snow/run-tests.mjs (cabecera)
   process.env.TZ = 'UTC';            // base determinista
   Date.now = () => FIXED_NOW_MS;     // reloj congelado (solo en el runner de test)
   ```

   Y los tests que validen formateo en hora local crean un `Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid' })`
   **explícito**, sin depender del TZ del proceso. Así los dos escenarios conviven sin mutar estado
   global compartido.

### 2bis.2 Tests obligatorios de tiempo

| ID | Test | Qué fija |
|---|---|---|
| T1 | `freshness` de una lectura con `observedAt = FIXED_NOW - 90 s` es **exactamente** `90` | Determinismo de `freshness` |
| T2 | El mismo cálculo se repite en `TZ=UTC` y con `Intl` en `Europe/Madrid` y da **el mismo número** | La zona no altera el dato almacenado |
| T3 | Un `snow_report` editorial con `capturedAt='2026-11-16T23:30:00Z'` se etiqueta con el **día 17-nov** en Europe/Madrid | Detecta el bug clásico de "parte del día equivocado" por zona |
| T4 | TTL: con `requestedAt = FIXED_NOW` y caché escrita en `FIXED_NOW - 29 min` ⇒ `live`/`cached`; con `-31 min` ⇒ `stale` | Bordes de `CACHE_POLICY` sin depender de esperas reales |
| T5 | El cambio de horario (**DST**) se prueba con dos instantes fijos: `2026-03-29T00:30:00Z` y `2026-10-25T00:30:00Z` | Madrid cambia de hora; el formateo no debe romperse |
| T6 | Un aviso con `validUntil < FIXED_NOW` no se muestra como vigente | Avisos y aludes caducados |
| T7 | Ningún fichero de `snow/**/*.test.ts` contiene `Date.now()` ni `new Date()` sin argumento (grep de guarda) | Impide que un test futuro reintroduzca el no-determinismo |

**T7 es un meta-test** y se implementa leyendo los ficheros de test como texto (E/S de fichero, sin
`spawn`, cumple C1c). Es la garantía de que la regla se mantiene en el tiempo y no solo hoy.

**Nota de honestidad:** congelar `Date.now` **solo dentro del runner de test** evita tocar código de
producción. Si `backend-impl` prefiere un `Clock` inyectable (preferible en diseño), T1–T6 se
escriben contra ese `Clock` y el congelado global desaparece; **la estrategia de T1–T7 no cambia**.

---

## 2ter. Tres requisitos adicionales del capitán

### 2ter.1 C23 — Not-found con cuerpo con forma de procedencia

`GET /api/snow/v1/stations/<slug-inexistente>` debe devolver **404 con cuerpo JSON que lleve la tupla
de procedencia**, **nunca** 200 con array vacío y **nunca** 500.

Motivo de producto: la referencia **redirige silenciosamente** a la lista de estaciones cuando no
encuentra una (ver captura `404-estacion-inexistente-desktop-1440`). No se replica ese patrón en la
capa API: un cliente que pide una estación concreta debe distinguir "no existe" de "existe y no hay
datos".

```ts
// snow/api/not-found.test.ts
test('C23: slug desconocido => 404 con procedencia', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/api/snow/v1/stations/no-existe-xyz`);
  assert.strictEqual(res.status, 404);                        // ni 200 ni 500
  assert.match(res.headers.get('content-type') ?? '', /application\/json/);
  const body = await res.json();
  assert.ok(body.provenance, 'el 404 debe llevar procedencia');
  assert.strictEqual(body.status, 'not_found');               // estado propio, no 'no_data'
  assert.ok(!Array.isArray(body.data), 'no debe devolver colección vacía');
});

test('C23b: slug válido sin parte => 200 con no_data (contraste)', async () => {
  const res = await fetch(`http://127.0.0.1:${port}/api/snow/v1/stations/formigal-panticosa`);
  assert.strictEqual(res.status, 200);
  assert.notStrictEqual((await res.json()).status, 'not_found');
});
```

**Contrato para `t7`:** distinguir tres estados en HTTP — `not_found` (404), `no_data` (200 con
`reason`) y error de proveedor (200 degradado). C23 y C23b existen precisamente para que el 404 no se
"arregle" devolviendo 200.

### 2ter.2 C24 — Probar que el camino editorial NO es un stub

> **Nota de ruta (corregida tras inspeccionar t7).** Los ejemplos de esta sección usan
> `/api/snow/admin/v1/reports`. El router implementado expone `/v1/admin/reports` bajo el prefijo de
> montaje. El **prefijo real de montaje es el contrato**, no este documento: `t9` debe leer el prefijo
> de la propia app y fallar si no coincide con lo que el router monta. No se ajusta el test a la ruta
> implementada si el montaje no existe (B4).

Una suite de degradación que nunca ejercita una **escritura editorial con éxito** deja pasar una
implementación vacía. Por eso:

```ts
// snow/api/editorial.test.ts
test('C24a: round-trip editorial completo con atribución', async () => {
  const payload = {
    stationSlug: 'formigal-panticosa',
    capturedAt: '2026-11-16T08:30:00.000Z',       // reloj fijo (ver 2bis)
    sourceUrl: 'https://www.aramon.com/formigal-panticosa/partes/parteNieve',
    author: 'operador-1',
    confidence: 0.9,
    liftsOpen: 12, liftsTotal: 21, kmOpen: 40, kmTotal: 143,
  };
  const post = await fetch(url('/api/snow/admin/v1/reports'), { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
  assert.strictEqual(post.status, 201);

  const get = await fetch(`http://127.0.0.1:${port}/api/snow/v1/stations/formigal-panticosa/report`);
  const body = await get.json();
  assert.strictEqual(get.status, 200);
  assert.strictEqual(body.data.liftsOpen, 12);                       // el dato SALE, no es stub
  assert.match(body.provenance.attribution, /fuente:\s*operador/i);  // atribución presente
  assert.strictEqual(body.provenance.source, 'editorial-report');
  assert.strictEqual(body.provenance.observedAt, payload.capturedAt);
});

test('C24b: falta sourceUrl => 400 en el borde', async () => {
  const bad = { stationSlug: 'formigal-panticosa', capturedAt: '2026-11-16T08:30:00.000Z',
                author: 'operador-1', confidence: 0.9 };
  const res = await fetch(url('/api/snow/admin/v1/reports'), { method: 'POST', headers: authHeaders(), body: JSON.stringify(bad) });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.errors.some((e: string) => /sourceUrl/i.test(e)));
});

test('C24c: confidence fuera de [0,1] => 400', async () => { /* ... */ });
test('C24d: author vacío => 400', async () => { /* ... */ });
test('C24e: capturedAt no ISO => 400', async () => { /* ... */ });
```

C24a–C24e cubren exactamente los cuatro campos que 05b §7.3 declara obligatorios
(`sourceUrl`, `capturedAt`, `author`, `confidence`): un campo por rechazo 400 y un camino feliz que
demuestra persistencia real + atribución en la salida.

### 2ter.2bis C26 — Autenticación de administración, probada adversarialmente

**Motivo (hallazgo B2 de t7).** En el árbol inspeccionado `GET`/`POST /v1/admin/reports` no tienen
middleware, ni token, ni 401/403. Un `POST` anónimo puede escribir el parte editorial, que es **la
única fuente lícita de estado operativo** del producto. No es un defecto de estilo: es una **ruta de
escritura sin autenticar al único dato de estado que la ley nos permite tener**.

**Regla de verificación (no negociable).** B2 **no** pasa por que exista un middleware en el código.
Se ejerce **por HTTP in-process**. Un `Authorization` en el código de licencias **no** es
autenticación de petición: el símbolo debe significar lo que se comprueba, no parecerse.

```ts
// snow/api/admin-auth.test.ts
const ADMIN = '/api/snow/admin/v1/reports';   // prefijo real de montaje, leído de la app

test('C26a: sin cabecera => 401', async () => {
  const res = await fetch(url(ADMIN));                       // GET, sin Authorization
  assert.strictEqual(res.status, 401);
});

test('C26b: token incorrecto => 401', async () => {
  const res = await fetch(url(ADMIN), { headers: { authorization: 'Bearer token-incorrecto' } });
  assert.strictEqual(res.status, 401);
});

test('C26c: POST anónimo NO escribe', async () => {
  const before = await countReports();
  const res = await fetch(url(ADMIN), { method: 'POST', body: JSON.stringify(validPayload()) });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(await countReports(), before, 'un POST anónimo no debe persistir nada');
});

test('C26d: token correcto => 201 POST y 200 GET', async () => {
  const post = await fetch(url(ADMIN), { method: 'POST', headers: authHeaders(), body: JSON.stringify(validPayload()) });
  assert.strictEqual(post.status, 201);
  const get = await fetch(url(ADMIN), { headers: authHeaders() });
  assert.strictEqual(get.status, 200);
});

test('C26e: SNOW_ADMIN_TOKEN sin definir => admin DESHABILITADO (401), no abierto', async () => {
  // se levanta una app con process.env.SNOW_ADMIN_TOKEN borrada
  const res = await fetch(urlOf(appSinToken, ADMIN), { headers: { authorization: 'Bearer cualquier-cosa' } });
  assert.strictEqual(res.status, 401, 'sin token configurado el admin debe rechazar, nunca abrirse');
});
```

| Caso | Esperado | Qué demuestra |
|---|---|---|
| C26a sin cabecera | 401 | No hay lectura anónima |
| C26b token erróneo | 401 | El token se compara, no se ignora |
| C26c POST anónimo | 401 **y** recuento sin cambios | No hay ruta de escritura anónima (el fallo de B2) |
| C26d token correcto | 201 / 200 | El camino legítimo sigue funcionando |
| C26e variable sin definir | 401 (deshabilitado) | Postura segura por defecto: falla cerrado |

**Fallar cerrado es el requisito:** si `SNOW_ADMIN_TOKEN` no está definida, el admin debe quedar
**deshabilitado**, nunca abierto. C26e es el test que impide que un despliegue sin token deje la
escritura editorial expuesta.

### 2ter.4 C27 — Montaje real vs montaje de test (B4)

**Problema (hallazgo B4).** `web-ssr/src/server.ts` no monta `/api/snow`: sólo tiene
`express.static`, el handler de Angular y `app.listen`. Un test que fabrique su propia app de test
demuestra **el módulo**, no el **cableado enviado**.

**Regla:** se prueban y se reportan por separado, sin sustituir uno por otro.

| Caso | Qué prueba | Veredicto si falta |
|---|---|---|
| C27a: la app **de producción** (`server.ts` exportado/utilizado) responde en `/api/snow/...` | El cableado real | **B4 BLOCKED** — se declara explícitamente que el módulo está probado y el montaje no |
| C27b: `snowRouter(service)` montado a mano en un puerto efímero | El router y la cadena de contratos | Prueba del módulo únicamente |

Si B4 sigue abierto en `t9`, el informe dirá: *"módulo probado in-process; **cableado NO verificado**"*.
No se presentará C27b como si cubriera C27a.



### 2ter.3 C25 — Guarda anti-fuga del runner in-process

Con ejecución in-process **todo comparte un proceso**: una suite que muta `process.env`, deja un
fichero temporal o deja un listener abierto envenena a las siguientes y el primer fallo intermitente
parecerá un bug del producto.

**Diseño verificado viable:** un fichero guardián que toma una instantánea **al cargarse** y compara
en el hook `exit` del proceso. Funciona **independientemente del orden de ficheros** (comprobado:
el orden de ejecución no es el orden de la CLI, así que "ejecutar la guarda al final" NO es fiable –
el guardián debe basarse en el ciclo de vida del proceso, no en la posición del fichero).

```ts
// snow/tests/00-leak-guard.test.ts
import test from 'node:test';
import { readdirSync } from 'node:fs';

const ENV0 = Object.keys(process.env).sort().join(',');
const TMP0 = new Set(readdirSync(process.env.TMPDIR ?? '/tmp'));

process.on('exit', () => {
  const problems: string[] = [];
  if (Object.keys(process.env).sort().join(',') !== ENV0) problems.push('process.env mutado');
  for (const f of readdirSync(process.env.TMPDIR ?? '/tmp')) {
    if (!TMP0.has(f)) problems.push(`fichero temporal residual: ${f}`);
  }
  if (problems.length) {
    console.error('LEAK_GUARD_FAIL ' + problems.join('; '));
    process.exitCode = 1;
  } else {
    console.error('LEAK_GUARD_OK');
  }
});

test('C25: el proceso arranca limpio', () => { /* la verificación ocurre al salir */ });
```

**Comportamiento esperado y verificado en reconocimiento:** con una suite que muta `process.env` el
guardián imprime `LEAK_GUARD_FAIL` y fuerza exit 1; con una suite limpia imprime `LEAK_GUARD_OK` y
exit 0.

**Límite declarado:** un listener abierto **no** se detecta de forma fiable tras `exit` con APIs
estándar sin dependencias; C25 cubre `process.env` y ficheros temporales (los dos contaminantes que
realmente producen fallos intermitentes entre suites), y el cierre de listeners se exige por
contrato en cada test (`t.after(() => server.close())`, ya usado en C22/C23/C24). Se declara como
cobertura **parcial**, no total.

---


## 3. E2E: estado real, sin promesas

### 3.1 Lo que está MEDIDO

| Hecho | Medición |
|---|---|
| Un servidor HTTP en `127.0.0.1:4200` **sí arranca y responde** | R6: `BIND_OK`, `fetch`→`200`, `body=OK` |
| `nx serve web-ssr` **no** llega a escuchar en :4200 | R7: sondeo 250 s, `listening=False` |
| La causa **no** es el puerto | R4/R5: Nx no puede construir el project graph; `Failed to start plugin worker` |
| `nx show projects` (repro mínimo) falla igual | R5 |
| Lanzar procesos hijo está bloqueado | R8: `EPERM ... syscall: 'spawn'` |

### 3.2 Corrección al supuesto del capitán

El informe previo atribuía el bloqueo a **puertos loopback**. La medición dice otra cosa:
**los puertos loopback funcionan (R6)**; lo que falla es **el arranque de procesos hijo**, que es lo
que necesitan el daemon/plugin-workers de Nx y `node --test`. La diferencia importa porque cambia la
solución: no hace falta "otro medio de servir la app", hace falta un entorno donde Nx pueda lanzar
hijos.

### 3.3 Clasificación honesta

| Capacidad E2E | Estado | Motivo |
|---|---|---|
| E2E contra `nx serve` local | **BLOCKED** | Nx no arranca (R4/R5/R7). No es un defecto del código del módulo |
| E2E con navegador real (Playwright) en este host | **BLOCKED** | Requiere instalar `@playwright/test` (no instalado, R1) + lanzar navegador (proceso hijo, R8) |
| **Test de integración in-process de la capa HTTP** | **FEASIBLE Y RECOMENDADO** | R6 demuestra que `node:http` + `fetch` funcionan. Se puede montar el Express del módulo en un puerto efímero dentro del mismo proceso y ejercer `/api/snow/**` con `fetch` |
| Verificación SSR/render de Angular | **BLOCKED** | Requiere build de Angular vía Nx (R4) |
| Accesibilidad automatizada en navegador | **BLOCKED** | Depende de lo anterior |

### 3.4 El camino E2E que sí podemos demostrar

**Sustituto de E2E para el backend** (cubre la mayor parte del riesgo real del módulo):

```ts
// snow/api/snow-api.integration.test.ts  (node:test, in-process)
import test from 'node:test';
import assert from 'node:assert';
import { createSnowApp } from '../app.js';

test('GET /api/snow/stations responde 200 y respeta la forma', async () => {
  const server = createSnowApp().listen(0, '127.0.0.1');       // puerto efímero
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/snow/stations`);
  assert.strictEqual(res.status, 200);
  ...
  server.close();
});
```

Y el caso que el capitán exigió explícitamente (`C16`): sin credenciales, `/api/snow/forecast/...`
devuelve **200** con "Sin datos disponibles", **no 500**.

**Lo que esto NO demuestra** (declararlo, no esconderlo):
- No demuestra que Angular renderice la pantalla.
- No demuestra hidratación, ni SSR, ni CSS.
- No demuestra accesibilidad en navegador real.

### 3.5 Qué haría falta para un E2E de navegador de verdad

1. Un entorno donde `spawn` **no** esté bloqueado (host normal o runner CI) — es el requisito
   principal, y el único que no está en nuestras manos.
2. `@playwright/test` + `npx playwright install chromium`.
3. Un servidor estable: `nx serve` (si Nx arranca) **o** `node dist/web-ssr/server/server.mjs` tras
   `nx build`.
4. Como el módulo SSR usa `RenderMode.Server`, el E2E debe esperar a red inactiva, no sólo a
   `load`.

**Recomendación al capitán:** aceptar §3.4 como cobertura de integración de `t9` y declarar el E2E
de navegador **BLOCKED con causa medida**, no como "pendiente". Si el objetivo institucional exige
E2E de navegador demostrado, hay que ejecutar la tarea en un host sin bloqueo de `spawn`, y eso es
una decisión de entorno, no de código.

---

## 4. Accesibilidad — WCAG 2.2 AA

### 4.1 La trampa de la referencia (no copiar)

infonieve declara `user-scalable=no` (prohibido por **1.4.4 Resize Text** al impedir el zoom).
Nuestro módulo **no** debe reproducir ese patrón. Regla de lint propuesta (puede añadirse al
`eslint.config.mjs` del proyecto sin dependencias nuevas, como regla `no-restricted-syntax` sobre
el HTML/metadata): buscar `user-scalable=no` y `maximum-scale=1` y fallar.

### 4.2 Regresiones automáticas obligatorias (ejecutables sin navegador)

Estas tres son **obligatorias** en `t9` y **no** dependen de navegador: son E/S de fichero y aritmética
de color, por tanto viables bajo C1c.

#### A1 — Zoom mínimo (1.4.4 Resize Text)

Fichero: `snow/a11y/viewport.test.ts`. Lee el HTML fuente y **falla** si aparece cualquiera de los
patrones que impiden el zoom:

```ts
// snow/a11y/viewport.test.ts  (node:test, E/S de fichero; sin navegador)
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const SOURCES = ['web-ssr/src/index.html'];

const FORBIDDEN = [
  /user-scalable\s*=\s*(no|0)/i,     // bloquea el zoom del usuario
  /maximum-scale\s*=\s*(?!1?\.[1-9]|[2-9])/i, // maximum-scale < 1.1 aprox. limita el zoom
];

test('A1: ninguna página impide el zoom (WCAG 1.4.4)', () => {
  for (const f of SOURCES) {
    const html = readFileSync(f, 'utf8');
    for (const re of FORBIDDEN) {
      assert.ok(!re.test(html), `${f} contiene un patrón que limita el zoom: ${re}`);
    }
  }
});
```

Y, si hay metadatos por ruta, el mismo patrón se aplica a `web-ssr/src/app/snow/**/*.html`.

#### A2 — Contraste de estados abierto/cerrado (1.4.3 Contrast)

Fichero: `snow/a11y/contrast.test.ts`. El punto de fallo es justo el que se esperaba: pills
**verde=abierto / rojo=cerrado** sobre fondo de nieve/blanco. El test calcula el ratio WCAG a partir
de los **tokens reales** de `styles.css`, sin navegador:

```ts
// snow/a11y/contrast.test.ts
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';

const lum = (hex: string): number => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

// Pares exigidos: texto del estado sobre su fondo, leídos de styles.css
const PAIRS: ReadonlyArray<[string, string, string]> = [
  ['status-open-fg',   'status-open-bg',   'estado abierto'],
  ['status-closed-fg', 'status-closed-bg', 'estado cerrado'],
  ['status-partial-fg','status-partial-bg','estado parcial'],
];

test('A2: los estados de estación cumplen 4.5:1 (1.4.3)', () => {
  const css = readFileSync('web-ssr/src/styles.css', 'utf8');
  for (const [fgVar, bgVar, label] of PAIRS) {
    const fg = readVar(css, fgVar), bg = readVar(css, bgVar);
    const r = ratio(fg, bg);
    assert.ok(r >= 4.5, `${label}: ${r.toFixed(2)}:1 < 4.5:1 (${fg} sobre ${bg})`);
  }
});
```

**Importante — el color no puede ser el único indicador (1.4.1 Use of Color)**: además del
contraste, el estado debe llevar **texto** ("Abierto"/"Cerrado"/"Parcial"), no solo color. Se añade
una aserción de que el componente pinta la etiqueta textual, porque un pill verde/rojo a secas es
una violación de 1.4.1 aunque el contraste sea perfecto.

#### A3 — Operación por teclado de filtros y mapa (2.1.1 Keyboard)

El mapa (Leaflet 1.9.4, ya instalado) es el riesgo real: por defecto es *mouse-first*. Contrato para
`t8`:

| Requisito | Criterio | Cómo se verifica sin navegador |
|---|---|---|
| Los filtros son `<button>`/`<input>` reales, no `div` con `onclick` | 2.1.1, 4.1.2 | Test de plantilla: ningún `(click)` sobre `div`/`span` en `snow/**` |
| Orden de tabulación lógico y sin `tabindex` positivo | 2.4.3 | Grep de guarda: `tabindex="[1-9]` ⇒ fallo |
| Foco visible en filtros y mapa | 2.4.7 | La hoja declara `:focus-visible` para `.snow-filter` y `.snow-map` (aserción sobre `styles.css`) |
| El mapa tiene alternativa no visual: lista de estaciones operable por teclado | 1.1.1 + 2.1.1 | Contrato de componente: existe la vista lista junto al mapa y es navegable |
| Atajos: marcar/desmarcar estación con teclado | 2.1.1 | Test de componente que dispara `keydown` sobre la lista |

**Honestidad:** A3 se verifica **estructuralmente** (elementos nativos, atributos, presencia de
`:focus-visible`). **No** prueba comportamiento real de foco en un navegador; eso queda BLOCKED con
§3.3 y debe declararse así en `08-audit.md`.

### 4.3 Estrategia por nivel de coste

| Nivel | Qué | Estado aquí |
|---|---|---|
| **Estático (obligatorio)** | Revisión de plantillas contra checklist 2.2 AA; `lang`, `alt`, foco visible, `aria-*`, sin `tabindex` positivo | Feasible: revisión de código y tokens (`styles.css`) |
| **Automático sin navegador (obligatorio)** | A1 viewport, A2 contraste, A3 estructura de teclado | **Feasible** con `node:test` + E/S de fichero |
| **Semántico (recomendado)** | DOM renderizado a cadenas (`@angular/platform-server` `renderApplication`) para landmarks, encabezados, orden, texto "Sin datos" | **Condicionado**: requiere compilar Angular vía Nx (R4 bloqueado). Si no compila, se declara BLOCKED |
| **`axe-core` en navegador (deseable)** | `axe-core` + Playwright | **BLOCKED** junto con §3.3 (instalación + pipe/navegador) |

### 4.4 Checklist manual mínima (para t9) — criterios 2.2 AA con riesgo real en este producto

- **1.4.4 Resize text**: sin `user-scalable=no`. Verificar zoom 200 % sin pérdida (cubierto en A1).
- **1.4.3 Contrast**: tokens de estado ≥4.5:1 (cubierto en A2).
- **1.4.1 Use of color**: el estado lleva texto, no solo color (cubierto en A2).
- **1.3.1 Info and relationships**: la tabla de partes de nieve debe usar `<table>` con `<th>`/
  `scope`, no `div`s.
- **2.4.7 Focus visible**: foco en filtros, mapa y modal de webcam (A3 estructural).
- **2.5.8 Target size (mínimo 24×24)**: botones del mapa y pills de filtros.
- **1.1.1 Non-text content**: las webcams son **enlaces** (05b §7.4); su enlace necesita texto
  accesible que nombre la estación y el operador.
- **3.2.6 Consistent help / 3.2.3 Consistent navigation**: cabecera y pie ya existen.
- **4.1.2 Name, role, value**: selectores de fecha y el comparador.
- **1.4.10 Reflow**: vista 320 CSS px sin scroll horizontal (crítico en tablas de partes).
- **2.1.1 Keyboard**: filtros y mapa operables sin ratón (A3 estructural).

**Indicador de datos "sin datos"**: el texto "Sin datos disponibles" (05b §3.2) debe ser **texto
real en el DOM**, no un icono con `title`, para que lectores de pantalla y `axe` lo vean. Es a la vez
un requisito legal (no sugerir dato inexistente) y un requisito a11y.

---

## 5. Lo que este documento deja al descubierto (para el capitán)

1. **Nx no es ejecutable en este sandbox.** No es un defecto del repo. Toda verificación basada en
   Nx (`build`, `serve`, `lint` vía Nx, targets Nx) es **BLOCKED aquí**. `tsc` directo y `node`
   directo **sí** funcionan.
2. **Causa raíz corregida y afinada (C1c).** Mi primera lectura fue "el sandbox bloquea lanzar
   procesos". El capitán la afinó con cuatro mediciones: `stdio:'pipe'` → `EPERM`; `'inherit'` y
   `'ignore'` → exit 0; `stdout` a **fichero** → exit 0 con salida legible. Lo que se deniega es la
   **creación de *pipes* anónimos**, no el lanzamiento de procesos. Eso explica a la vez `node --test`
   (hijo por fichero con stdio piped), R8, y Nx ("plugin worker … not connected within 5 seconds" es
   la misma topología de pipe). **Nx sigue BLOCKED y no debe reintentarse.**
3. **La hipótesis "puertos loopback bloqueados" es incorrecta**; los puertos funcionan (R6). La
   denegación de `127.0.0.1:9333/9334` era una **conexión** a un CDP que no escuchaba, no una
   imposibilidad de abrir puertos. Esto es lo que hace viable la integración HTTP in-process (§3.4),
   que el capitán verificó de extremo a extremo: 200 con "Sin datos disponibles" sin credenciales.
4. **`t9` no podrá demostrar E2E de navegador** en este host. Puede y debe demostrar la integración
   HTTP in-process (§3.4). Esa prueba **no** demuestra render de Angular, hidratación, CSS ni
   accesibilidad de navegador, y así debe declararse.
5. **CI Node 20: decidido por el capitán → UNVERIFIED.** Se mantiene `node:test` in-process y
   `typecheck:snow` como gate; **no** se reescribe el workflow. Los gates están probados en Node 24
   local; la compatibilidad con CI Node 20 no es comprobable desde aquí y el camino `tsc`
   precompilado queda documentado como respaldo **no probado**. El hito cierra declarándolo.

---

## 6. Checklist de entrega para t9

Todos los ítems son **trabajo pendiente**. Ningún test de `snow/*` existe todavía; esta lista es el
criterio de aceptación de `t9`, no un registro de resultados.

- [ ] `scripts/snow/run-tests.mjs` creado, sin dependencias, ejecuta en proceso (**sin pipe**, C1c).
- [ ] `npm run typecheck:snow` exit 0 (obligatorio: es la única garantía de tipos real).
- [ ] C1–C27 implementados al menos una vez cada uno.
- [ ] **C22** (degradación enumerada): toda ruta `/api/snow/v1/**` responde **200** con procedencia,
      y **ninguna 500**, con las tres variables sin definir. Requiere `SNOW_ROUTES` exportado por t7.
- [ ] **C23/C23b** (not-found): slug desconocido ⇒ **404 JSON con procedencia**, ni 200 ni 500.
- [ ] **C24a–C24e** (editorial no-stub): round-trip con atribución + 400 por cada campo obligatorio.
- [ ] **C25** (anti-fuga): guardián del ciclo de vida del proceso, verde en el run global.
- [ ] **C26a–C26e** (auth admin adversarial): 401 sin cabecera, 401 token erróneo, POST anónimo no
      escribe, token correcto 201/200, y **admin deshabilitado si `SNOW_ADMIN_TOKEN` no está**.
- [ ] **C27a/C27b** (cableado vs módulo): reportar por separado; sin C27a ⇒ **B4 BLOCKED**, nunca
      presentar el montaje de test como si cubriera el enviado.
- [ ] C4 (`-99.0 → null`) y C6 (`image` vacío): R11 indica que el enfoque es viable; **el test debe
      ejecutarse y reportarse con salida real**.
- [ ] C13/C14/C15 del breaker y C16/C17 de degradación y guarda de licencia.
- [ ] C18/C19 ODbL en ambas direcciones.
- [ ] T1–T7 de tiempo determinista (reloj fijo + doble zona UTC/Europe/Madrid + DST).
- [ ] A1 viewport, A2 contraste de estados, A3 estructura de teclado.
- [ ] Integración HTTP in-process (§3.4): 200 sin credenciales, nunca 500.
- [ ] E2E de navegador **declarado BLOCKED con la causa medida** en `08-audit.md`, no omitido.
- [ ] Reporte final con **salida real de comandos** (exit codes incluidos) y, si algo necesitó un
      pipe, la salvedad `EPERM` correspondiente.

### 6.1 Orden obligatorio del informe de `t9`

El capitán ha fijado el orden para que un muro de verdes no diluya el hallazgo grave. **Se respeta
literalmente:**

1. **B2 primero, en las palabras del producto** (la frase de §7.1), antes de cualquier tabla de
   verdes. C26a–e como evidencia inmediata.
2. **B1, B3, B4, B5** con estado y causa medida.
3. **Veredicto global**: BLOCKED si B1–B4 siguen, con los cuatro nombrados.
4. **Cifra de cobertura desglosada**: `N ejecutados / 1 PASS-and-VACUOUS (C18/C19 contenido) /
   1 condicionalmente vacío (C24a) / N−2 significativos` (§7.5).
5. Tablas verdes **después**, nunca antes.
6. Todo comando con su **código medido** (§7.2); PASS, PASS-and-VACUOUS y UNVERIFIED **distintos**.

---

## 7. Estado de verificación de esta estrategia

| Elemento | Estado | Nota |
|---|---|---|
| Runner elegido (`node:test` in-process) | Decidido | Aprobado por el capitán |
| `typecheck:snow` como gate | Decidido | Aprobado por el capitán; único gate real de tipos |
| Gates en local Node 24 | Probados | Es el entorno de `t9` |
| **CI Node 20** | **UNVERIFIED** | No ejecutable ni comprobable desde este sandbox; camino `tsc` precompilado documentado y **no probado** |
| E2E de navegador | **BLOCKED** | Causa: denegación de *pipes* anónimos (C1c) + Nx bloqueado |
| a11y en navegador (`axe`) | **BLOCKED** | Depende de lo anterior |
| a11y A1/A2/A3 | **Feasible** | E/S de fichero y aritmética; pendiente de implementar en `t9` |
| Tests del módulo ejecutados | **Ninguno** | No existe código de `snow/*` todavía |

### 7.1 Línea base de t7 antes de la ejecución (inspección estática, 2026-11-16)

Registrado **antes** de correr `t9`, para poder demostrar qué cambió. Todo lo siguiente es **lectura
de fuente y grep**, no ejecución: no hay ninguna afirmación sobre comportamiento en runtime.

| ID | Hallazgo | Evidencia estática | Estado |
|---|---|---|---|
| B1 | `SNOW_ROUTES` no existe | 0 coincidencias en `snow/**` | **BLOCKED** (C22 no enumerable) |
| B2 | `GET`/`POST /v1/admin/reports` sin autenticación | `snow.routes.ts` L60/L64: sin middleware, sin 401/403 | **BLOCKED** — ruta de escritura anónima al único dato de estado lícito |
| B3 | Los 404 no llevan procedencia | L24, L30, L72: `{ error: 'station-not-found' }` | **BLOCKED** (C23) |
| B4 | El router no está montado | `web-ssr/src/server.ts` sin `snow` ni `/api/snow` (sólo el ejemplo comentado en L23) | **BLOCKED** (C27a) |
| B5 | **Gate de tipos en ROJO** | `tsc -p web-ssr/tsconfig.app.json --noEmit` ⇒ **exit 2, 11 errores**, todos en `snow/server/snow.routes.ts` (TS4111 index-signature ×6, TS7030 rutas sin retorno ×4, TS2345 `Record<string,unknown>` vs `NewSnowReportInput`) | **BLOQUEA t8**; t7 no está terminado mientras esto siga rojo |

**Medición de B5 (comando + código, según §7.2):**

```
node node_modules/typescript/bin/tsc -p web-ssr/tsconfig.app.json --noEmit
exit=2
```

**Nota metodológica (near-miss del capitán).** Un grep de `401\|403\|authoriz` devolvió 46
coincidencias que parecían cobertura de autorización; **todas eran el tipo de licencia
`Authorization`**, no autenticación de petición. Y un grep de `snow\|/api/` devolvió 1 coincidencia
que era **un ejemplo comentado**. Lección aplicada a `t9`: **un recuento no es evidencia; el símbolo
debe significar lo que se comprueba.** Por eso C26 se ejerce por HTTP y C27 distingue montaje real de
montaje de test.

**Declaración de severidad de B2 para producto (una línea).** *Cualquiera en internet puede escribir
el parte de nieve editorial sin autenticarse, y ese parte es la única fuente lícita de estado
operativo del producto; hasta que exista autenticación con fallo cerrado, el módulo no puede
considerarse apto para producción.*

### 7.2 Regla de medición de códigos de salida (adoptada de equipo)

**Regla:** en PowerShell, `$LASTEXITCODE` refleja **solo el último comando nativo ejecutado**. Un
`exit 0` reportado sin el comando y su código medido **no está verificado**.

**Verificado empíricamente en este host (2026-11-16).** Cuatro sondeos:

| Sondeo | Comando | `$LASTEXITCODE` observado |
|---|---|---|
| Nativo falla, sin pipeline | `node -e "process.exit(3)"` | **3** (correcto) |
| Nativo falla, con pipeline a cmdlet | `node … \| Select-Object -First 5` | **3** (en pwsh 7 **no** se enmascara) |
| Nativo falla, capturado con `$out = …` | `$out = node …` | **3** (correcto) |
| **Nativo falla, luego OTRO nativo con éxito** | `node …exit 3; node …exit 0` | **0** ← **aquí se pierde** |

**Conclusión precisa (más limitada que la regla general):** en **pwsh 7** un pipeline **no**
enmascara el código nativo; lo que lo destruye es **ejecutar otro comando nativo después**. Por
tanto, la práctica obligatoria para `t9` es **capturar inmediatamente por comando**:

```powershell
node --test --test-isolation=none <ficheros>
$rc = $LASTEXITCODE            # capturar ANTES de cualquier otro comando nativo
"exit=$rc"                     # y reportar comando + $rc juntos
```

Capturado así, el valor **sobrevive** a comandos posteriores (verificado: se conserva `7` tras
ejecutar otro nativo). Todo informe de `t9` dará **comando + código medido**, nunca un "verde" suelto.

### 7.3 Vaciedad: qué significa un PASS y cuándo no prueba nada

Una suite puede leer verde por **no haber datos** en vez de por cumplir. Antes de correr `t9` he
comprobado el estado de los datos semilla:

| Fichero | Estado medido | Consecuencia |
|---|---|---|
| `seed/stations.json` | **3 registros** | C22/C23 tienen estaciones reales: **no vacuo** |
| `seed/snow-reports.json` | `records: []`, `updatedAt: ""` | **Cualquier comprobación sobre partes editoriales es VACUA** hasta que exista un parte |
| `seed/osm-derived.json` | `records: []` | Las comprobaciones de separación ODbL solo prueban *forma de esquema*, no contenido |

**Reglas para `t9`:**
1. `C24a` **debe crear** el parte (POST con token) y **leerlo de vuelta**; no puede limitarse a
   comprobar que el fichero existe. Así el test deja de depender de datos previos.
2. Toda aserción sobre una colección que está vacía se reporta como **PASS-and-VACUOUS**, no PASS.
3. `C18/C19` (ODbL) se ejecutan sobre el DDL y sobre los ficheros de migración, que sí tienen
   contenido, y se declara explícitamente que `osm-derived.json` vacío **no** demuestra nada sobre
   los datos reales.
4. Si una aserción solo puede pasar con la colección vacía, se considera **defecto del test**, no
   del producto.

**Control negativo del auditor.** `re-researcher` dispone de un arnés con control negativo que prueba
que detecta violaciones inyectadas (ODbL, 500 por ruta, falso `exit 0`, fuga de credenciales). Antes
de declarar un gate verde, `t9` comprobará que la comprobación correspondiente es
**PASS-y-significativa**, no **PASS-y-vacua**: se lee su evidencia, no su color.

### 7.4 Auditoría del propio control negativo (aplicar la vaciedad a nuestro instrumental)

El capitán pidió aplicar la pregunta de vaciedad **al control negativo**: que detecte sus 5
violaciones demuestra que detecta **esas cinco formas**, no una que no se parezca a ninguna. He
leído `scripts/snow/audit.mjs` y `scripts/snow/negative-control.mjs`. Conclusión, con evidencia:

**Los 34 gates del auditor son textuales (regex sobre fuente o JSON), ninguno observa comportamiento.**

| Gate | Cómo decide | Limitación demostrada |
|---|---|---|
| `A1` | `grep /(\?\?\s*0\b\|\|\|\s*0\b)/` sobre `snow/**` | Un `?? 0` construido como `(x || 0)` dinámico, o un 0 por `Number(x)` en otra forma, no coincide con el patrón |
| `A2` | grep de literales `-1`/`-99` con lista de excepciones | Un sentinel escrito como `- 99` (con espacio), `0xFFFFFFFF`, o `SENTINEL` con otro nombre, pasa |
| `M1` | detecta frases de "exit 0" cuya orden no está en una lista de comandos permitidos | Un `exit 0` de un comando **que sí está** en la lista pero **nunca se ejecutó** pasa; y un PASS narrado sin la frase "exit 0" pasa |
| `M2` | patrones de credencial (token largo, Bearer, `AIza…`, `sk-…`, PEM) | Una credencial con forma no catalogada (p. ej. hex de 24, JWT corto) pasa |
| `F3` | busca ids `node/…`/`way/…` en `snow-reports.json` | Con `records: []` **el resultado es PASS por vaciedad** (ver §7.3); solo detecta la forma `osmId` con valor tipo OSM |
| `H1` | regex `image…: []` en el blob de `chain/**` | Un `image: []` declarado pero **sobrescrito en runtime** (p. ej. `chains.image.push('feratel')`) pasa |
| `H2` | regex de las cadenas editorial-only | Igual: verifica *declaración*, no el valor efectivo tras mutación |

**Consecuencia práctica para `t9`: el auditor es un control de *forma*, no de *comportamiento*.**
Por tanto, un gate del auditor en PASS **no sustituye** a un test de `t9`, y a la inversa: un test de
`t9` en verde no debe añadir un gate textual redundante. Son capas distintas.

**Formas "plausibles pero incorrectas" y qué las detecta** (las que el control negativo **no** cubre
porque se parecen a ninguna de sus cinco inyecciones):

| Implementación plausible-pero-mala | ¿La detecta el auditor? | ¿Qué la detecta? |
|---|---|---|
| `401` que se dispara por el motivo equivocado (p. ej. siempre, incluso con token válido) | **No** — ningún gate mira respuestas HTTP | **C26d** (token correcto ⇒ 201/200) |
| `401` con token válido por comparación invertida | **No** | **C26d** |
| `POST` anónimo devuelve 401 pero **sí escribe** | **No** | **C26c** (recuento sin cambios) |
| 404 con `provenance` añadido a mano pero **sin** `status: 'not_found'` | **No** | **C23** (exige `status === 'not_found'`) |
| `provenance` presente pero `updatedAt` obsoleto o igual a `observedAt` siempre | **No** | **T1/T4** (bordes de TTL y `freshness` exacta) |
| `not_configured` correcto pero `/api/snow` sin montar | **No** | **C27a** (cableado real) |
| `image: []` en fuente y `push()` en runtime | **No** (H1 es textual) | **C6** (comportamiento: `getImage()` ⇒ `blocked`) |
| `FALLBACK_CHAINS` correcto en fuente, mutado al importar | **No** (H2 es textual) | **C5** (recorrido efectivo de la cadena) |

**Regla adoptada:** para cada fila de esa tabla, `t9` debe tener un test **de comportamiento**. Si el
auditor da PASS y `t9` no tiene ese test, el resultado se reporta **PASS-and-VACUOUS** para ese
aspecto, no PASS.

**Dos carencias del arnés que conviene registrar:**
1. El vocabulario de estados del auditor es solo `PASS`/`FAIL`/`UNVERIFIED`: **no existe `VACUOUS`**.
   Es decir, hoy *no puede expresar* la distinción que el capitán adoptó como política. `F3` con
   `records: []` devuelve `PASS`, no `VACUOUS`. Recomendación: añadir el estado (trabajo de
   `re-researcher`), mientras `t9` lo compensa declarándolo en su informe.
2. `F3` es hoy **vacuo** por el estado de los datos (`records: []`), y el control negativo lo
   detecta solo porque **inyecta** un registro antes de correr — es decir, el control negativo prueba
   que el gate funciona *con datos*, no que el gate esté midiendo datos reales ahora mismo.

Este análisis es lectura de fuente; no afirma nada sobre comportamiento en runtime.

### 7.5 Libro de vaciedad por test (cifra determinista, no estimación)

El capitán pide el **recuento exacto** de tests que serían **PASS-and-VACUOUS por semilla vacía**, para
que la entrega pueda declarar cobertura honesta. La cifra se deriva de dos hechos **medidos**:

**Estado de semillas (medido 2026-11-16):**

| Fichero | `records` |
|---|---|
| `stations.json` | **3** |
| `snow-reports.json` | **0** |
| `osm-derived.json` | **0** |

**Regla de clasificación aplicada a cada contrato:**

- **NO VACUO** si el test **crea sus propios datos** (POST + read-back) o si solo necesita las 3
  estaciones existentes.
- **VACUOUS** si su aserción pasa con la colección vacía, es decir, si no puede distinguir "cumple"
  de "no hay nada que comprobar".

| Contrato | Depende de | Clasificación con semillas actuales | Motivo |
|---|---|---|---|
| C22 (degradación enumerada) | `stations.json` (3) | **NO VACUO** | Recorre rutas reales contra 3 estaciones reales |
| C23 (404 slug desconocido) | ninguna | **NO VACUO** | Un slug inexistente es inexistente con cualquier semilla |
| C23b (slug válido ⇒ `no_data`) | `stations.json` (3) | **NO VACUO** | Necesita una estación existente; hay 3 |
| C24a (round-trip editorial) | **crea** su propio parte | **NO VACUO** *si* crea (regla 1 de §7.3) | Si se implementara como "el fichero existe", sería VACUOUS |
| C24b–e (400 por campo) | ninguna | **NO VACUO** | El rechazo no depende de datos previos |
| C26a–e (auth admin) | — | **NO VACUO** | 401/201 no dependen de contenido; C26c cuenta antes/después |
| C18/C19 (ODbL) | DDL + migraciones; `osm-derived.json` (0) | **NO VACUO sobre DDL**, **VACUOUS sobre contenido OSM** | El DDL sí tiene contenido; el contenido real de OSM está vacío |
| C5/C6 (cadenas) | fuente | **NO VACUO** | Comportamiento sobre constantes, no sobre datos |
| T1–T7 (tiempo) | reloj fijo | **NO VACUO** | Puro cálculo |
| A1–A3 (a11y) | `styles.css`, HTML | **NO VACUO** | Tokens y plantillas existen |

**Cifra determinista del libro:**

| Categoría | Nº de contratos | Detalle |
|---|---|---|
| **PASS-and-VACUOUS por semilla vacía, tal como están hoy las semillas** | **1** | `C18/C19` en su faceta de *contenido* OSM (`osm-derived.json` = 0 registros) |
| **Condicionalmente vacío** (solo si se implementa mal) | **1** | `C24a`, si alguien lo reduce a comprobar existencia del fichero en vez de crear+leer |
| **NO VACUO** | **resto** | 3 estaciones reales bastan para C22/C23b; el resto no depende de datos |

**Nota sobre F3 (auditor, no `t9`).** `F3` también es vacuo hoy (`snow-reports.json` = 0), pero es un
gate **del auditor**, no un test de `t9`, y su vaciedad ya se declara en §7.4. No se suma a la cifra
de cobertura de `t9` para no contar dos veces el mismo hueco.

**Consecuencia para la entrega:** la cobertura de `t9` se declara como
**"N tests ejecutados, de los cuales 1 PASS-and-VACUOUS (`C18/C19` contenido OSM) y 1 condicionalmente
vacío (`C24a`), con N−2 significativos"** — no como un único número agregado. El valor real de N solo
se conoce tras la ejecución y **no se anticipa aquí**.

**Camino a la vaciedad cero:** sembrar `osm-derived.json` con ≥1 registro derivado real (y
`snow-reports.json` con ≥1 parte) convertiría ese 1 en 0. Es una decisión de datos de `backend-impl`,
no de este documento; se registra como recomendación.

### 7.6 Dos defectos de este arnés, y por qué estaban mal (el motivo instruye más que la forma final)

**A) Aserción de C22 inicialmente equivocada.** Mi primera versión afirmaba *"con cero credenciales,
ninguna ruta puede devolver `ok`"*. Era **falsa por una razón real**: los datos **editoriales** son
nuestros y no requieren credencial de proveedor externo, de modo que `/v1/stations`,
`/v1/search`, `/v1/season-dates` y `/v1/stations/:slug` devuelven legítimamente `ok` con
`source: 'editorial-stations'`. El invariante correcto es:
**si `status === 'ok'`, la `source` debe ser editorial y nunca un proveedor externo sin configurar.**

La lección no es "ajustar hasta que pase": es que un test que exige de más produce un falso rojo que,
si se "arregla" relajándolo, puede acabar aceptando un proveedor sin configurar. Se fija la
**invariante**, no el color.

**B) Aserción de atribución editorial inicialmente equivocada.** Exigí `attribution` no nulo en el
parte público. También era falsa: `editorial-own` es una licencia **propia** con
`attributionRequired: false`; la obligación de atribuir (C9) aplica a licencias de terceros
(`allowed-with-attribution`, AEMET, Licence Ouverte). El invariante correcto es condicional:
**si `licenseStatus === 'allowed-with-attribution'` o `attributionRequired`, entonces `attribution`
no puede faltar.** Al corregirlo afloró el hallazgo **F1** de verdad (los campos no llegan a la UI),
que un test mal planteado **ocultaba**.

**C) Contaminación entre suites (raíz medida, y es exactamente lo que C25 vigila).** Con
`--test-isolation=none`, **los hooks `before` de TODOS los ficheros se ejecutan antes que los cuerpos
de test** (verificado con dos ficheros sonda). Consecuencia: `degradation`/`not-found` borraban
`SNOW_ADMIN_TOKEN` en su `before` **después** de que `editorial` lo fijara en el suyo → `POST`
editorial devolvía **401** sólo en la ejecución conjunta, no en solitario. Es exactamente la clase de
fuga que C25 existe para detectar. **Corrección aplicada:** el token se fija **por test**
(`withAdminApp`), no en un `before` compartido. Tras el arreglo, la suite conjunta pasa de 7 fallos a
**1**, y ese 1 es F1.

**D) Dos límites del runtime de Node, resueltos sin tocar el código de `snow/`:**
1. El módulo usa **imports de valor sin extensión** (correcto para el bundler, rechazado por el
   resolver ESM de Node) ⇒ se usa el **loader del repo**, `scripts/snow/ts-loader.mjs`. La copia
   local que hubo en `tests/support/` **se eliminó** para que exista una sola implementación (ver §7.7).
2. El **type-stripping** de Node rechaza *parameter properties* de TypeScript
   (`constructor(private readonly x: T)`) ⇒ la ejecución requiere `--experimental-transform-types`.
   Sin ese flag: `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]`.

**Ambos son del arnés, no del producto.** No se modificó ni una línea de `snow/*` para hacer pasar
un test.

**E) DEFECTO DE DOCUMENTACIÓN — el que causó el episodio «vuestras cifras son inventadas».**
No es un fallo del arnés: es que `09` **no decía en ninguna parte** que la suite necesita el loader.
Un lector que reproduzca los números con `node --test …` a secas obtiene `ERR_MODULE_NOT_FOUND` y
concluye razonablemente que los números están inventados. Es la **misma clase** que el incidente del
`import` que no estaba en el fichero: *una afirmación verificada en condiciones que el lector no
puede reproducir es indistinguible de una afirmación falsa.* Corrección permanente: la línea de
comando canónica (§7.7) incluye el loader y la explicación de por qué es obligatorio.

**F) REGLA GENERAL — un recuento no es una medición; un fallo reproducido sí.** (No es una nota
sobre imports; es la lección que esta fase dio **tres veces en un día**.)

| Episodio | El recuento (engañoso) | La medición (reproducida) |
|---|---|---|
| Autenticación de admin | **46** coincidencias de `401\|403\|authoriz` ⇒ parecía cobertura | **0** middleware reales; el símbolo era el tipo de *licencia* `Authorization` |
| Puertos loopback | «el sandbox rechaza puertos locales» ⇒ parecía imposible servir | Un listener en `127.0.0.1:4200` **abre y responde**; lo denegado era la **conexión** a un CDP que no escuchaba |
| Imports sin extensión | **83 / 37 / 49 / 34 / 96** según la regex de cada uno | **16 de 34 módulos fallan al importar**; con el loader, **0** |

**Regla, para aplicar en `t10` y en cualquier gate futuro:**
1. **Nunca** reportar un recuento como evidencia. Un `grep -c` mide *cuántas veces aparece una
   cadena*, no *cuántos casos cumplen una condición*.
2. Reportar **el fallo**: el comando, su código de salida, y el número de elementos que fallan al
   ejecutarse.
3. Si dos personas obtienen cifras distintas para la misma pregunta, **la pregunta está mal
   planteada**; hay que reformularla como una ejecución, no como un patrón.
4. Un recuento solo vale como **a lo sumo** una pista para diseñar la medición — nunca como el
   resultado.

### 7.7 Dependencia de reproducción de la suite (leer antes de re-ejecutar)

**No se cita un recuento de imports. Se cita un fallo reproducido.** Contar "cuántos imports sin
extensión hay" no tiene una respuesta única: depende de la regex que cada uno escriba. Cuatro
personas obtuvieron **83, 37, 49, 34 y 96** para la misma pregunta. Ninguna de esas cifras es la
medición.

**La medición que sí reproduce** — un bucle que importa cada módulo y cuenta:

| Condición | Módulos | Importan | Fallan |
|---|---|---|---|
| **Sin loader** (`node --experimental-transform-types`) | 34 | 18 | **16** |
| **Con `scripts/snow/ts-loader.mjs`** | 34 | **34** | **0** |

Desglose de los 16 fallos sin loader: **15 `ERR_MODULE_NOT_FOUND`** (import sin extensión) +
**1 `ERR_UNSUPPORTED_DIR_IMPORT`** (`from './snow/server'`).

**Frase para la entrega:** *«16 de 34 módulos bajo `snow/**` no se importan bajo Node ESM plano; el
loader del repo los resuelve; el bundle de producción no está afectado porque esbuild resuelve en
build-time.»*

Verlo por uno mismo (una sola vez, sin dependencias):

```bash
node -e "const{readdirSync,statSync}=require('node:fs');const{join}=require('node:path');const{pathToFileURL}=require('node:url');
const w=(d,o=[])=>{for(const e of readdirSync(d)){const f=join(d,e);if(statSync(f).isDirectory())w(f,o);else if(e.endsWith('.ts')&&!/\.test\.ts$/.test(e))o.push(f);}return o;};
let ok=0,fail=0;for(const f of w('web-ssr/src/snow')){try{require(pathToFileURL(join(process.cwd(),f)).href);ok++}catch{fail++}}
console.log('import_ok',ok,'import_fail',fail)" --experimental-transform-types

**La suite NO es autocontenida.** Para reproducir los números de `t9` hacen falta **dos** cosas.
**Comando canónico (usar el loader del REPO, no una copia local):**

```bash
node --experimental-transform-types \
     --import ./scripts/snow/ts-loader.mjs \
     --test --test-isolation=none <ficheros…>
```

Ejemplo completo (8 suites, 56 tests) verificado **exit=0**:

```bash
node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
  --test --test-isolation=none \
  web-ssr/src/snow/tests/leak-guard.test.ts \
  web-ssr/src/snow/tests/admin-auth.test.ts \
  web-ssr/src/snow/tests/degradation.test.ts \
  web-ssr/src/snow/tests/not-found.test.ts \
  web-ssr/src/snow/tests/editorial.test.ts \
  web-ssr/src/snow/tests/chains-and-time.test.ts \
  web-ssr/src/snow/tests/a11y.test.ts \
  web-ssr/src/snow/tests/execution.test.ts
```

| Requisito | Por qué | Si falta |
|---|---|---|
| `--import ./scripts/snow/ts-loader.mjs` | Resuelve los imports de valor sin extensión y los `import` de **directorio** (`'./snow/server'`) | `ERR_MODULE_NOT_FOUND` / `ERR_UNSUPPORTED_DIR_IMPORT` |
| `--experimental-transform-types` | Node en modo *strip-only* rechaza las *parameter properties* de TS | `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]` |

**Por qué importa declararlo.** Un revisor que ejecute sólo
`node --test --test-isolation=none …` obtendrá `ERR_MODULE_NOT_FOUND` y podrá concluir que los
números son inventados. Casi ocurrió entre `data-providers` y `re-researcher`, y es la misma clase de
riesgo que el incidente del `import` que no estaba en el fichero: **una afirmación verificada en
condiciones que el lector no puede reproducir es indistinguible de una afirmación falsa.**

**Decisión resuelta (opción B del capitán, adoptada por `backend-impl`).** El loader es ahora un
**artefacto del repo** (`scripts/snow/ts-loader.mjs` + `ts-resolver.mjs`). Justificación correcta y
registrada aquí: los imports sin extensión son una propiedad de **resolución del tooling**, no un
defecto del runtime — en producción el bundler de Angular/esbuild los resuelve en build-time, de modo
que el artefacto servido **no** es frágil. Bajo Node plano se usa el loader del repo; el camino de
producción nunca lo toca.

**Una sola implementación.** La copia local que había en `tests/support/` (`resolve-hook.mjs` +
`resolver.mjs`) **se eliminó**. Dos implementaciones del mismo hook divergen, los números dejan de
reproducirse entre equipos y se repite el episodio de «cifras inventadas». Verificado tras el
borrado: **56/56, exit 0, `LEAK_GUARD_OK`**, y `tsc` exit 0.

---

## 8. P1 — comprobación que EJECUTA el módulo (no lee su texto)

Añadida a petición del capitán, y es la respuesta directa a la clase de error que dominó esta fase:
**una aserción textual no distingue «el código hace X» de «el código contiene el texto X»**. Los tres
falsos positivos de `t9` y la fragilidad de los imports son todos de esa familia.

Fichero: `web-ssr/src/snow/tests/execution.test.ts`. **No inspecciona fuente**: importa el grafo real
de módulos y llama a las funciones. Si el grafo no resolviera, el fichero **no cargaría** — el fallo
es la evidencia.

| Test | Qué ejecuta |
|---|---|
| P1: grafo resoluble | Importa `createSnowRouter`, `SNOW_ROUTES`, `makeProvenance`, `toProvenanceDto`, `authorizationFor` y comprueba que son invocables |
| P1: `createSnowRouter` ejecuta | La **llama** y verifica que devuelve un handler Express montable (`typeof router.handle === 'function'`) |
| P1: procedencia real | Ejecuta `makeProvenance` → `toProvenanceDto` y verifica los 8 campos y `freshness === 0` |
| P1: cadenas como dato | Evalúa `FALLBACK_CHAINS.image` (un grep encontraría `image: []` en un comentario; esto evalúa el valor) |
| P1: importabilidad total | Importa **todos** los `.ts` de `snow/**` y falla listando los no importables |

**P1 se justificó en su primera ejecución:** falló con
`SyntaxError: The requested module '../providers/provenance.ts' does not provide an export named
'toProvenanceDto'` — `toProvenanceDto` está en `server/http-mapping.ts`, no en `providers/provenance.ts`.
Un grep habría encontrado el nombre en el fichero y dado verde; **ejecutar lo detectó**.

Resultado: **5/5, exit 0**. Total de la suite con P1: **56/56**.
