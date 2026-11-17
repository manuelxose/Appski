# SNOW-03b · t1 — AEMET OpenData: notas de integración y estado de verificación

Fecha: 2026-11-17 · Autor: `aemet-engineer` (t1) · Rama: `feat/snow-03-real-providers`

## 1. Qué se ha integrado

`web-ssr/src/snow/providers/aemet.adapter.ts` — `ProviderAdapter<ForecastBundle>` real
contra AEMET OpenData, pronóstico horario **municipal**.

| Pieza | Fichero |
|---|---|
| Adapter de dos pasos | `providers/aemet.adapter.ts` |
| Mapa estación → municipio (consulta) | `providers/aemet-municipios.ts` |
| Mapa generado desde el INE | `providers/aemet-municipios.generated.json` |
| Generador verificable | `scripts/snow03/build-aemet-municipios.mjs` |
| Fixtures sintéticas + procedencia | `providers/fixtures/aemet/` |
| Generador de fixtures | `scripts/snow03/capture-aemet-fixtures.mjs` |
| Tests | `tests/aemet-adapter.test.ts` (19) |
| Driver de verificación REAL | `scripts/snow03/verify-aemet.mjs` |

## 2. Trampas del servicio y cómo se tratan

| Trampa medida | Tratamiento en el código |
|---|---|
| **API de dos pasos**: el sobre `{estado, datos}` no trae el dato | Se sigue `datos` con un segundo GET, con **timeout propio** (20 s frente a 10 s del sobre) porque el servicio genera el fichero al vuelo. Sólo se sigue por **HTTPS**. |
| **ISO-8859-15 con BOM** | Se leen **bytes** (`http-client`) y se decodifica con el charset declarado. El BOM se retira **en bytes, antes** de decodificar. |
| **429 con cuerpo HTML** (cuota por minuto) | Se clasifica **por el status**, nunca por el cuerpo: `429 ⇒ rate_limited` en los dos pasos. Se respeta `Retry-After`; si no viene, 60 s (lo que pide el propio servicio: «el próximo minuto»). Tras un 429 la instancia queda **bloqueada localmente** hasta que expire la ventana y no vuelve a llamar. |
| **Sin clave: 200 con cuerpo VACÍO** (no 401) | El cuerpo vacío, el JSON roto y el JSON con otra forma son **`no_data`** con motivo, nunca `ok` ni `error`. La decisión nunca depende del status. |
| **`-99` como «no dato»** | `normalizeNoData` lo convierte a `null` en todas las magnitudes. Un `0` real (p. ej. precipitación 0 mm) **no** se confunde con ausencia. |
| **Cuota estricta** | Espaciado propio de **20 s entre llamadas** (3/min) frente a la tabla conservadora de 30/min, y espaciado también **entre los dos pasos** del mismo fetch. |

## 3. Contrato: qué se mapea y qué NO

`ForecastPoint` se ha extendido de forma **aditiva y compatible** (campos opcionales):

```ts
readonly gustKmh?: number | null;      // racha máxima del tramo
readonly probSnowPct?: number | null;  // probabilidad de nieve (0-100)
```

| Campo AEMET | Destino | Nota |
|---|---|---|
| `temperatura` | `tempC` | |
| `vientoAndRachaMax.velocidad` | `windKmh` | |
| `vientoAndRachaMax.racha` | `gustKmh` | Array **plano**: dos pares por periodo; se toma el valor (`last: true`). |
| `precipitacion` | `precipMm` | |
| `estadoCielo[].descripcion` | `condition` | El primer tramo del día suele traer `""` ⇒ `null`. No se hereda ni se inventa. |
| `probNieve` | `probSnowPct` | |
| — | `snowLineM` | **SIEMPRE `null`.** AEMET no publica cota de nieve en este producto. |
| `nieve` | **no se mapea** | Es **ESPESOR de nieve acumulado en el suelo (cm)**, no la precipitación del tramo. Mapearlo a `precipMm` sería un error de unidades. |

`observedAt` y `updatedAt` = `[0].elaborado`, la hora **real de emisión** de AEMET,
convertida desde hora de Madrid (CET/CEST con `Intl`, sin dependencias). Si `elaborado`
no es parseable se deja la procedencia con el instante de la petición y `updatedAt: null`:
nunca se fabrica una hora de emisión.

## 4. Municipio de cada estación (sin inventar)

AEMET pronostica **por municipio**, no por estación de esquí. El mapa es **explícito** y se
genera desde la relación oficial de municipios del INE:

```
node scripts/snow03/build-aemet-municipios.mjs           # regenera
node scripts/snow03/build-aemet-municipios.mjs --check   # verifica el JSON commiteado
```

- **48 estaciones** mapeadas · **9 declaradas sin cobertura** (`notCovered`).
- Una estación sin entrada devuelve **`no_data/not-covered` sin tocar la red**: no se busca
  el municipio más cercano «razonable».
- Correcciones relevantes frente a un mapeo por proximidad:
  - `baqueira-beret` → **25025 Naut Aran**.
  - `estacion-de-esqui-de-aramon-cerler` → **22054 Benasque** (Cerler es pedanía de
    Benasque, **no** de Panticosa).
  - `tavascan` → **25017 Alins** (Tavascán es entidad menor de Alins).
  - `estacio-desqui-dels-angles` → **17192 Setcases** (Vallter 2000 está en Setcases).
  - `estacio-desqui-de-font-romeu` → **17069 Fontanals de Cerdanya** (la parte española;
    Font-Romeu es francesa y AEMET no la cubre).

## 5. Cuota y caché

- TTL de caché: **30 min** (`cache-policy.ts`, ya existente).
- Espaciado propio del adapter: **20 s**. Bloqueo tras 429: `Retry-After` o 60 s.
- El pipeline de ingesta (`ingest/pipeline.ts`) ya **no** reintenta un `rate_limited` antes
  de la ventana y abre el breaker con ese `retryAfterMs`: no se necesita lógica nueva.
- El driver real usa **2 municipios** como máximo y espera en vez de insistir.

## 6. Estado de la verificación REAL

**La clave `AEMET_API_KEY` NO está disponible en la sesión del ingeniero que escribió esto.**
La verificación con el servicio vivo **la ejecuta el capitán** (decisión suya: el secreto no
pasa a este contexto).

| Requisito | Estado |
|---|---|
| tsc 0 · check-schema 0 · qa-unit 28/28 · verify-e2e 56/56 · verify-meteoalarm 4/4 | ✅ ejecutado |
| 27 tests del adapter | ✅ ejecutado |
| 1ª llamada REAL (capitán) | ❌ `no_data`, cero puntos — bug de `fecha` (§7.2) |
| 2ª llamada REAL (capitán) | ❌ **17/22** — 4 defectos (§7.3), corregidos |
| **3ª llamada REAL tras estas correcciones** | ⏳ **pendiente** |
| Fixtures **capturadas** de AEMET | ❌ no existen: las del repo son **sintéticas** |

### Lo que las llamadas REALES ya demostraron

- El **sobre** (paso 1) se lee bien y el **paso 2** responde `200` (~29 915 bytes,
  `text/plain;charset=ISO-8859-15`).
- `observedAt` = `elaborado` REAL (`2026-11-16T20:05:09Z`), no el instante de petición.
- **48 tramos** con conversión de hora correcta (confirmado CET por el capitán).
- `source: aemet`, atribución «Datos: AEMET», `snowLineM` null, sin centinelas, sin fuga de clave.

El valor de esa 2ª ejecución fue precisamente encontrar los 4 defectos de §7.3: los tests
locales estaban en verde y el dato real no era correcto.

### Qué son las fixtures y qué NO son

`providers/fixtures/aemet/PROVENANCE.json` declara `synthetic: true`. Reproducen el formato
y las trampas documentadas del servicio (BOM, ISO-8859-15, 429 HTML, `-99`, pares
`{value, periodo}`, `racha` como array plano), pero **no son respuestas capturadas** y sus
valores **no son un pronóstico real**. Sirven como contrato de formato; **no** deben usarse
como dato operativo.

### Cómo cerrar la verificación

```bash
# con la clave exportada en el entorno que ejecute el driver
node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
     scripts/snow03/verify-aemet.mjs
```

- `exit 0` ⇒ todo verde; evidencia en `docs/snow/snow03-evidence/real/aemet-<fecha>.json`
  y respuestas auténticas en `…/real/aemet-raw/`.
- `exit 2` ⇒ falta `AEMET_API_KEY` (fallo honesto: sin clave no hay verificación real).
- `exit 1` ⇒ alguna comprobación falló; el detalle está en la evidencia.

El driver comprueba, además de los datos: que `/v1/stations/:slug/forecast` sirve el dato
**con origen `aemet` y atribución**, que `observedAt` es la hora de emisión real de AEMET, que
`snowLineM` es `null`, y que **la clave no aparece en ningún fichero guardado**.

## 7. Hallazgos de producto corregidos (bugs reales, sólo visibles en vivo)

### 7.1 BOM UTF-8 en un cuerpo declarado ISO-8859-15

`decodeBody` decodificaba un cuerpo declarado `ISO-8859-15` cuyo BOM era **UTF-8**
(`EF BB BF`) con `TextDecoder('iso-8859-15')`: el BOM se colaba como `ï»¿` y `JSON.parse`
fallaba. Ahora el BOM se retira **en bytes** antes de decodificar, sea cual sea el charset
declarado, y se mantiene la lectura por bytes (no `res.text()`) para no corromper acentos.

### 7.2 `fecha` de AEMET es fecha-hora LOCAL SIN sufijo de zona — BLOQUEANTE detectado en vivo

Este es el bug que **sólo apareció al llamar a la API real**, y es el motivo de que este
documento exista: todo el test local estaba en verde y el adapter **no devolvía ni un punto**
contra el servicio vivo.

**Síntoma**: `status: no_data`, `reason: source-silent`, con el sobre y el JSON correctos.

**Causa raíz**: `localSpainToUtcIso` exigía `fecha` con la forma `YYYY-MM-DD`, pero AEMET la
envía como **fecha-hora local sin sufijo**:

```
"fecha": "2026-11-16T00:00:00"     ← forma REAL medida con clave
```

Como el `continue` de la conversión descartaba cada tramo, `points.length === 0` y el adapter
degradaba a `no_data` — sin error, sin log, con toda la pinta de «el proveedor no tiene datos».

**Por qué no se vio en local**: las fixtures se generaron con la forma `YYYY-MM-DD`, que es la
que **yo** esperaba, no la que el servicio envía. Una fixture que refleja la suposición del
autor en vez de la realidad del servicio no prueba nada. **Las fixtures ya se han regenerado con
la forma real** y un test comprueba que la fixture usa esa forma (`AE12b`), de modo que si alguien
la «arregla» de vuelta a la forma cómoda, el test falla.

**Arreglo**:
- `parseAemetFecha` acepta `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm[:ss]` (local, sin zona) y, si
  apareciera, la forma con `Z`/`±hh:mm`; en ese último caso **respeta la zona declarada**.
- Una cadena **sin zona nunca se interpreta como UTC**: se toma como hora de pared de
  Europe/Madrid y se le resta el desfase **real** de ese día (CET +1 / CEST +2) vía `Intl`.
- **Periodos especiales** de AEMET (`1901`, `0001`, `0000`, `2400` = «todo el día») se descartan
  **con motivo explícito** en `skipped[]`; no se convierten en una hora inventada. Servir un
  valor diario como si fuera de una hora concreta sería afirmar una precisión que no existe.
- Si tras el parseo no queda ningún tramo, el `detail` del fallo **agrega el motivo**
  (`periodo-de-dia-completo`, `fecha-no-parseable`, …) en vez de un genérico «sin tramos».

**Regresión cubierta**: `AE12` (formas reales de `fecha`, CET y zona explícita), `AE12b`
(la fixture usa la forma real y produce 48 tramos), `AE12c` (periodos «todo el día» se descartan
con motivo y el valor diario no aparece como tramo horario).

### 7.3 Los cuatro defectos de la 2ª verificación real (17/22)

Los tests locales estaban **todos en verde** y la ejecución real dio 17/22. Estos cuatro
defectos son la razón por la que la verificación real no es negociable.

#### D1 (GRAVE) — `/forecast` atribuía el pronóstico a Copernicus C3S

**Síntoma**: `/v1/stations/formigal-panticosa/forecast` devolvía
`source: 'copernicus-c3s'`, `attribution: 'Datos: Copernicus Climate Data Store'` y **0 puntos**.

**Causa**: `copernicus-c3s` estaba al final de `FALLBACK_CHAINS.forecast`. C3S es reanálisis
climático **histórico** (ERA5), no un pronóstico. Cuando AEMET no servía, el bucle seguía
hasta C3S y la respuesta se atribuía a Copernicus. **Un dato falso con apariencia legítima.**

**Arreglo en dos capas** (la primera sola sería frágil):
1. `copernicus-c3s` **fuera** de `FALLBACK_CHAINS.forecast`.
2. **Guarda en el orquestador** (`NOT_A_FORECAST_PROVIDER` + `nonForecastProviderReason`): un
   proveedor que no puede producir pronóstico **nunca entra en la cadena**, aunque alguien la
   inyecte. Además, un `ok` con **cero puntos** ya no se sirve como pronóstico: se trata como
   sin dato. Un test inyecta C3S a mano y demuestra que su nombre no aparece en la procedencia.

#### D2 — viento y rachas siempre `null`

**Causa**: la forma REAL de `vientoAndRachaMax` no es un par `{value}` sino un **array plano y
polimórfico**:

```json
"vientoAndRachaMax": [
  { "direccion": ["SO"], "velocidad": ["8"], "periodo": "20" },
  { "value": "27", "periodo": "20" }
]
```

La **velocidad** va dentro de `velocidad[]` y la **racha** en el `value` de la entrada
**hermana** con el mismo `periodo`. Mi `pairMap` sólo leía `pair.value`, así que descartaba los
pares con `velocidad[]` y el viento quedaba en `null`.

**Arreglo**: `parseVientoAndRachaMax` lee `velocidad[0]` y el `value` hermano. Si una hora sólo
trae racha, la velocidad queda `null`: **no se copia la racha a la velocidad**.

#### D3 — `/v1/config` devolvía `effect`/`configured` como `null`

**Causa: era un defecto del DRIVER, no del producto.** `/v1/config` es ruta **admin**: sin
`Authorization: Bearer <token>` responde **401**, el driver hacía `await res.json()` sobre
`{error:'unauthorized'}` y leía `undefined`. Verificado: con token, AEMET sale
`effect: 'serves'`, `configured: true` con clave y `'not-configured'` sin ella.

**Arreglo**: el driver manda el token admin y **afirma el status HTTP** (`B1`) antes de leer el
cuerpo, de modo que un 401 no pueda volver a pasar por «null».

#### D4 — `probNieve` no se servía nunca

**Causa**: AEMET publica `probNieve` **por DÍA** (`periodo: "1901"`), no por hora. El adapter
descartaba ese periodo —correctamente, no es una hora— así que `probSnowPct` quedaba siempre
`null` **en silencio**.

**Decisión** (documentada en el contrato): el valor **no** se reparte entre las horas (sería
inventar precisión horaria) y tampoco se pierde. Se expone como agregado diario en el nuevo
campo aditivo `ForecastBundle.daily[] = { day, snowProbabilityPct }`, y el periodo descartado
queda declarado en `parsed.skipped[]` con su motivo.

#### Sobre `observedAt` (riesgo que yo mismo advertí)

Comprobado por el capitán: `fecha` del día es `2026-11-16` local y `elaborado` `21:05:09`
local → `observedAt` `2026-11-16T20:05:09Z` = 21:05 CET. **Consistente con Madrid; riesgo
descartado.**

## 8. Atribución

La licencia de AEMET exige atribución. El adapter fija `attributionRequired: true`,
`licenseStatus: 'allowed-with-attribution'` y publica `Datos: AEMET` (`attributionFor('aemet')`).
Un test comprueba que la atribución está presente en el resultado `ok`.

## 9. Sobre `observedAt` cuando el estado es `no_data` (nota del revisor)

Cuando el resultado **no** es `ok`, la procedencia es la de **degradación** y su `observedAt`
refleja el instante de la petición con `updatedAt: null`: no hay dato emitido, así que no hay
hora de emisión que mostrar. Es deliberado y no contradice la regla 2 del contrato, que aplica al
camino `ok`. En el camino `ok`, `observedAt === updatedAt === elaborado` convertido a UTC; se
verifica con `A3` en el driver y con `AE2` en los tests.
