# SNOW-03 — Proveedores reales, condiciones de esquí y licencias

**Rama:** `feat/snow-03-real-providers` · **Worktree:** `.snow03-worktree`
**Base:** `master` = `7908914c23ded34dd1740127aa5ffb9a7ce1b5f3`
**Estado global:** **PARTIAL** — ver §7. Revisión independiente (t5): **NEEDS_REVISION** por el
blocker legal L1 (disclaimer y enlace obligatorios de MeteoAlarm), en reparación en t8.

> **Regla de honestidad de este informe.** Cada cifra procede de una medición del capitán o de un
> comando re-ejecutado. Donde no hay medición se dice **NO MEDIDO**. Ninguna cobertura se estima.
> Las afirmaciones de los miembros que no pude reproducir no se incluyen.

---

## 1. Resumen ejecutivo

SNOWHUB tiene hoy **una integración externa real, sostenible y legalmente utilizable**: los avisos
oficiales de **Meteoalarm** (EUMETNET), servidos por la API interna con atribución y antigüedad medidas.

**Lo que NO se ha conseguido, y por qué:**

| Objetivo | Estado | Causa real |
|---|---|---|
| Pronóstico meteorológico | **BLOQUEADO** | Ninguna fuente comercialmente autorizada activa: AEMET y Météo-France requieren clave que no existe; Open-Meteo *free* prohíbe el uso comercial |
| Condiciones operativas (remontes/pistas/espesores) | **NO DISPONIBLE** | Ningún operador autoriza redistribución. Bloqueo legal, no técnico |
| Webcams | **BLOQUEADO** | Sin permiso de embed; sólo enlace saliente |
| Catálogo propio | **INTEGRADO** | 587 registros en disco; la API sirve **588** |

Este informe **no** afirma haber conectado AEMET, Météo-France ni Open-Meteo. No se fabricaron
credenciales: se verificó que **0 de 66** variables de entorno contienen una clave de proveedor.

---

## 2. Fase A — Registro de licencias

Detalle completo en [SNOW-03-LICENSE-VERDICTS.md](SNOW-03-LICENSE-VERDICTS.md). Resumen por
combinación proveedor/dato:

| Proveedor | Dato | Veredicto |
|---|---|---|
| AEMET | previsión, avisos CAP | **AUTORIZADO** con atribución (Nota Legal nov-2016) |
| AEMET | BPA aludes | **DESCONOCIDO** (canal PDF sin documentar) |
| Météo-France | previsión, vigilancia | **RESTRINGIDO** hoy (401; LO 2.0 con cuenta) |
| Météo-France | BPA/HTML | **NO DISPONIBLE** (Art. 2) |
| Meteo Andorra | previsión, BPA | **RESTRINGIDO** (IP fija, sin licencia comercial) |
| IPMA | observación | **NO DISPONIBLE comercial** |
| Open-Meteo free | previsión | **NO DISPONIBLE comercial** (`/en/terms`) |
| Open-Meteo pago | previsión | **AUTORIZADO** (suscripción, sin clave) |
| Copernicus C3S | ERA5 | **AUTORIZADO** (CC BY), pero no sirve tiempo presente |
| **Meteoalarm** | avisos oficiales | **AUTORIZADO** (equivalente CC BY 4.0) — **EN USO** |
| Operadores | estado operativo | **NO DISPONIBLE** |

### Hallazgo que corrigió la Fase A

El informe inicial citaba los feeds en `feeds.meteoalarm.org/api/v1/warnings/feeds-XX`.
**Verificado: 404 en los cuatro países.** La ruta real es
`feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-{spain|france|portugal|andorra}`.

### Contradicción documentada (Open-Meteo)

`/en/licence` publica CC BY 4.0 sin restricción comercial; `/en/terms` limita el *free tier* a uso
**no comercial**. Prevalece la condición de uso del servicio. Por eso el adaptador existe, está
probado, y **no se cablea**.

---

## 3. Fase B — Catálogo maestro

| Métrica | Valor medido |
|---|---|
| Candidatas investigadas | **10 858** |
| Incorporadas | **587** (ids y slugs únicos 587/587) |
| Descartadas con motivo | **7 589** (sin nombre 7 153, país fuera 18, no es estación 117, duplicado 115, otro 186) |
| Por país | ES 119 / AD 4 / FR 462 / PT 2 |
| Con elevación fiable | **65** (0 estimadas; el resto `null` con motivo) |
| Con datos actuales | **0** — OSM/Wikidata no aportan estado actual |
| **Servidas por la API** | **588** — integrado (t7); E2E: `served=588, catalog=587, overlap=587, missing=0` |

Fuentes: OSM/Overpass (ODbL, con atribución) y Wikidata (CC0). **Infonieve no se usó**, ni operadores.

### Corrección aplicada tras auditoría del capitán

La primera entrega tenía **953 registros, de los que 582 (61%) eran pistas sueltas** («Cami del Mig»,
«Bony Vaques») y **2 entidades en Kazajistán etiquetadas como Andorra**. Se rechazó y se exigió
criterio de aceptación verificable. Tras la corrección: **0 pistas publicadas, 0 entradas fuera de
territorio**. Residuos menores de 2 registros `AD` en Francia: **cerrados en t7** (contorno real de
Andorra + point-in-polygon; ahora `AD`=4, todas andorranas).

---

## 4. Fase C/E — Meteorología y pipeline

### Integración operativa: Meteoalarm (avisos)

| País | Avisos servidos (medido 2026-11-16T23:42Z) | Nota |
|---|---|---|
| ES | 75 | |
| FR | 138 | |
| PT | 25 | |
| AD | 0 → `no_data` | El feed oficial andorrano está vacío (985 B, 0 entries) |

**La cifra depende de la hora**: se filtran avisos cuya ventana de validez ha expirado. Mediciones
sucesivas del mismo driver: ES 52→45→75, FR 156→0→138. Correcto, pero **no se puede publicar un
número de avisos sin fecha y hora**.

### Cumplimiento legal de la integración (cerrado en t8)

La revisión independiente (t5) detectó un **blocker legal real**: la única integración operativa
redistribuía avisos de MeteoAlarm **sin el enlace ni el disclaimer literal** que sus T&C exigen. El
texto legal existía en el código como paráfrasis, pero no llegaba a ningún consumidor.

Estado tras el arreglo (verificado por el capitán contra los T&C vivos):

| Obligación T&C | Estado |
|---|---|
| Enlace a `www.meteoalarm.org` | ✅ `sourceUrl` + `link` por aviso en la respuesta |
| Disclaimer **literal** | ✅ idéntico carácter a carácter (test `strictEqual` + longitud) |
| Latencia ≤10 min | ✅ TTL = 600 000 ms exactos |
| Atribución NMHS / EUMETNET | ✅ «AEMET vía EUMETNET – MeteoAlarm» (un país) / «EUMETNET – MeteoAlarm» (multi) |

> **Trampa documentada:** el CMS de MeteoAlarm entrega el disclaimer con **Markdown dentro de las
> comillas** (`[www.meteoalarm.org](https://...)`). Copiar el HTML publicaría corchetes y paréntesis
> visibles. El texto servido es el Markdown resuelto y hay tests que prohíben `](` en la salida.

### Defecto real encontrado y corregido

El parser obtenía el nivel de `cap:event`, que **nunca lleva color**; el color está en `<title>`.
Resultado antes del arreglo: **ES 0 avisos y FR 0 avisos** servidos, de 68 y 233 existentes.
Medición del capitán: 68/68 ES, 233/233 FR, 14/14 PT tienen color en `<title>`.
Tras el arreglo: ES 52, FR 156, PT 5. **213 avisos autorizados que se descartaban.**

### Pipeline (Fase E)

Verificado en el worktree:

- Reintentos acotados con backoff exponencial y respeto de `Retry-After`.
- **Circuit breaker con half-open real** — el anterior abría y **nunca se recuperaba**.
- Caché con TTL conforme a licencia, caducidad → `stale`, idempotencia por (estación, fuente, punto).
- Métricas por proveedor (intentos, éxitos, fallos, cortes, latencia).
- Una fuente caída **no impide** usar las demás.

### Degradación — probada, no declarada

`verify-network-degradation.mjs`: **12/12**, con fallos reales (no mocks):

| Escenario | Resultado |
|---|---|
| Conexión rechazada (127.0.0.1:9) | `error` retryable, sin datos, procedencia `degraded` |
| DNS inexistente | `error` retryable |
| Timeout real (socket que acepta y no responde) | `error` con mensaje de timeout |
| Pipeline | 3 intentos reales, `attempts=3 failures=3` |

Failure-injection HTTP con proxy local (503 → 200): primer intento `error` retryable, segundo `ok`
con avisos reales, pipeline `hits=2`. Endpoint: **nunca 500, nunca ceros**.

---

## 5. Fase F — Verificación real

`verify-e2e.mjs`: **56/56** (todas las fases integradas, incluidos los checks legales de t8).

| Bloque | Checks | Estado |
|---|---|---|
| F1 `/v1/config` — meteoalarm, licencia, cobertura 8×4, sin nombres de env | 7 | ✅ |
| F2 `/alerts` — avisos reales, atribución, antigüedad ±120 s, disclaimer literal + enlace | 17 | ✅ |
| F3 `/forecast` — degrada a `no_data`, sin Open-Meteo, sin bundle inventado | 4 | ✅ |
| F4 persistencia — SIGKILL real, `liftsOpen=17` sobrevive | 7 | ✅ |
| F5/F5a degradación y recuperación (proxy 503→200) | 9 | ✅ |
| **F2b catálogo integrado** — paginación completa, `missing=0` | 9 | ✅ |

### Antigüedad: defecto de métrica corregido

`freshness` era **estructuralmente 0** (se usaba el instante de la petición como `observedAt`), y el
check pasaba vacío. Corregido: `observedAt` = emisión real (`cap:sent`), verificado a ±120 s y dentro
de la ventana de validez.

---

## 6. Licencias: qué debe autorizar el responsable

| Variable | Trámite | Efecto |
|---|---|---|
| `AEMET_API_KEY` | formulario en `opendata.aemet.es` (email + Turnstile) | pronóstico y avisos CAP en ES |
| `METEOFRANCE_API_KEY` | cuenta + aplicación en `portail-api.meteofrance.fr` | previsión en FR |
| `OPEN_METEO_API_KEY` | suscripción Stripe → `customer-api.open-meteo.com` | pronóstico comercial |
| `CDS_PERSONAL_ACCESS_TOKEN` | `cds.climate.copernicus.eu/how-to-api` | ERA5 histórico |
| meteo.ad / IPMA | autorización escrita (+ IP fija) | sin secreto, trámite manual |

**Ninguna credencial fue fabricada ni usada.**

---

## 7. Veredicto

**PARTIAL** — con bloqueo real, no de proceso.

**Cumplido:**
- Registro de licencias verificable con cláusulas literales ✅
- Catálogo propio con procedencia: **587 registros, 588 servidos por la API** ✅
- Adaptador real implementado y probado ✅
- **Una integración externa operativa** (Meteoalarm, 4/4 países) ✅
- API interna devolviendo datos auténticos con atribución ✅
- Ingesta resistente a fallos (degradación probada + catálogo corrupto no tumba el borde) ✅
- Sin datos falsos ni cobertura inventada ✅
- Bloqueos legales aislados por proveedor y campo ✅

**No cumplido:**
- **Pronóstico meteorológico**: BLOQUEADO por licencia y credenciales. Sin `AEMET_API_KEY` /
  `METEOFRANCE_API_KEY` / `OPEN_METEO_API_KEY` no hay fuente comercialmente utilizable.

**Riesgos residuales declarados** (no bloqueantes, con follow-up):
- 101 registros con `sizeUnverified` (Overpass `out bounds` falló 3/3 por saturación).
- `Formigal` sin semilla OSM (sólo Wikidata «Aramón Formigal»).
- `region` se sirve como literal `"SIN_REGION"` en 585 filas (el contrato exige `string`); debería
  traducirse a `null`/omitirse en el DTO público. Follow-up, no bloqueante.
- Frontera ES/FR resuelta a favor de ES fuera de los enclaves verificados (sin daño medido: FR=462).

**Porcentaje de cobertura real:** de los cuatro tipos de dato con fuente identificada, **1 está
operativo** (avisos) en **3 de 4 países** (AD no tiene feed). Pronóstico: **0 de 3** fuentes
autorizadas condicionadas activas. Estado operativo: **0** de todas.

**Catálogo:** 588 estaciones servidas de 10 858 candidatas investigadas (5,4%), todas con
procedencia sha256 verificable.

---

## 8. Evidencias

| Evidencia | Ubicación |
|---|---|
| Veredictos de licencia | `docs/snow/SNOW-03-LICENSE-VERDICTS.md` |
| Matriz de cobertura | `docs/snow/SNOW-03-COVERAGE-MATRIX.md` |
| Evidencia real E2E (sha256, URL) | `docs/snow/snow03-evidence/real/` |
| Capturas OSM/Wikidata con sha256 | `docs/snow/snow03-evidence/raw/` |
| Robustez de red | `docs/snow/snow03-evidence/network-degradation.json` |
| Distinción real / sintético | Fixtures en `providers/fixtures/` marcados; evidencia de producción en `real/` |
