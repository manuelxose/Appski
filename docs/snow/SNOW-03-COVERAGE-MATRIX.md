# SNOW-03 — Matriz de cobertura real (medición del capitán)

**Estado:** cifras verificadas. Revisión independiente: **PASS** (t9, 2026-11-17) — el blocker legal
L1 (disclaimer/enlace MeteoAlarm) quedó **cerrado y verificado** en t8; ver §6.
**Última medición:** 2026-11-16T23:42Z (avisos) · **Worktree:** `.snow03-worktree` (`feat/snow-03-real-providers`)

> **Cómo leer esta matriz.** Cada cifra es una **medición propia del capitán** sobre el worktree, no
> una cita del informe de un miembro. Donde no hay medición, la celda dice **NO MEDIDO** — no 0,
> no una estimación.

---

## 1. Estaciones: investigadas / incorporadas / con datos actuales

Esto es la separación que el hito exige y que **no debe colapsarse en un solo número**.

| Métrica | Valor | Fuente de la medición |
|---|---|---|
| Candidatas **investigadas** (OSM/Overpass + Wikidata) | **10 858** | `station-catalog.json → counts.candidatesInvestigated` |
| **Incorporadas** al catálogo maestro | **587** | `records.length` (verificado: ids 587/587 únicos) |
| Descartadas, con motivo registrado | **7 589** | `counts.rejectionReasons` |
| **Servidas por la API** `/v1/stations` | **588** | E2E F2b: `{"served":588,"catalog":587,"overlap":587,"missing":0}` |
| **Con datos meteorológicos actuales** | **0** | `counts.withCurrentDataAvailable` — OSM/Wikidata no aportan estado actual |
| **Con datos operativos** (remontes/pistas/espesores) | **0** | Sin autorización de redistribución para ningún operador |

### Motivos de descarte (7 587)

| Motivo | N |
|---|---|
| `sin_nombre` | 7 153 |
| `país_fuera_de_alcance` | 18 |
| `no_es_estacion` (pistas, áreas, remontes) | 117 |
| `duplicado` | 115 |
| `otro` | 186 |

### Desglose del catálogo por país

| País | Estaciones | |
|---|---|---|
| ES | 119 | |
| AD | 4 | grandvalira, ordino-arcalis, pal-arinsal, station-de-ski-pas-de-la-casa |
| FR | 462 | |
| PT | 2 | |

---

## 2. Cobertura por tipo de dato y proveedor

| Tipo de dato | Proveedor | Estado real | Evidencia |
|---|---|---|---|
| **Avisos** | **Meteoalarm** | **OPERATIVO** — 4/4 países | `verify-meteoalarm` exit 0 @ 23:42Z: ES 75 / FR 138 / PT 25 / AD `no_data` (feed vacío) |
| **Pronóstico** | **AEMET** | **OPERATIVO** — 48 estaciones mapeadas de 57 | `verify-aemet` exit 0 · **23/23**: 48 tramos horarios reales, temp 47/48, viento 47/48, rachas 47/48, `elaborado` real |
| Pronóstico | Open-Meteo | **BLOQUEADO (licencia)** | *free* sólo no comercial (`/en/terms`); sin `OPEN_METEO_API_KEY` |
| Pronóstico | Météo-France | **BLOQUEADO (credencial)** | 401 `Missing Credentials` |
| Pronóstico | Copernicus C3S | **RETIRADO de la cadena** | ERA5 histórico: servía **atribución falsa** en `/forecast`. Eliminado + guarda `NOT_A_FORECAST_PROVIDER` |
| Aludes | AEMET BPA | **DESCONOCIDO** | Canal PDF sin documentación de redistribución |
| Aludes | Météo-France BPA/HTML | **NO DISPONIBLE** | Art. 2 prohíbe uso en entorno en red |
| Estado operativo / espesores | Cualquier operador | **NO DISPONIBLE** | Sin autorización; la vía editorial no puede blanquear datos restringidos |
| Webcams / imágenes | — | **BLOQUEADO** | Sin permiso de embed; sólo enlace saliente |

### Cobertura efectiva por país (avisos)

| País | Avisos servidos (medido) | Cobertura |
|---|---|---|
| ES | 75 | ✅ sí |
| FR | 138 | ✅ sí |
| PT | 25 | ✅ sí |
| AD | 0 → `no_data` | ❌ feed oficial vacío (no es fallo nuestro) |

> **El número varía con la hora**: los avisos se filtran por ventana de validez. Mediciones sucesivas:
> ES 52→45→75, FR 156→0→138. Esto es correcto, pero implica que **no se puede publicar una cifra de
> avisos sin fecha y hora**. Las cifras de arriba son de 2026-11-16T23:42Z.

---

## 3. Calidad y límites declarados

| Aspecto | Estado |
|---|---|
| Elevación con fuente inequívoca | **65/587** (0 estimadas; el resto `null` con motivo) |
| Elevación ambigua rechazada (ej. Tignes 1440\|2100\|2384\|3747) | Correcto: no elige |
| `sizeUnverified` (polígono sin verificar) | **101** — Overpass `out bounds` falló 3/3 (saturación; límite de entorno) |
| Duplicados en el mismo punto | **0** — Le Revard fusionada; Linga/Super-Châtel colapsadas (t7) |
| Registros `AD` fuera de Andorra | **0** — Porté-Puymorens reasignadas a FR con contorno real de Andorra |
| `coverage.byCountry` en `/v1/config` | **0/0 NO MEDIDO** — `config()` es síncrono y el maestro se lee async |
| Antigüedad de avisos | **MEDIDA** contra emisión real (`cap:sent`), ±120 s |
| Degradación sin red | **PROBADA** con 6 escenarios reales (ECONNREFUSED, DNS, timeout, pipeline) |
| Inyección de fallo HTTP en `/v1/*` | **NO PROBADO** en ese nivel (sí en adapter/pipeline) |
| Aislamiento de seguridad (lectura/red) | **SECURITY PARTIAL** — no medido, no es sandbox de lectura |

---

## 4. Veredicto de cobertura

- **Datos meteorológicos de avisos:** ✅ AUTÉNTICOS y servidos con atribución (Meteoalarm, CC BY 4.0 equivalente).
- **Pronóstico:** ✅ **OPERATIVO con AEMET** (48 estaciones mapeadas) — con clave autorizada. Sin clave degrada a `not_configured` honesto.
- **Condiciones operativas (pistas/remontes/espesores):** ❌ **NO DISPONIBLE** por ausencia de autorización.
- **Catálogo propio:** ✅ generado e **integrado**: 587 registros, **588 servidos** por la API.

**Cobertura real del producto hoy:** **avisos oficiales** operativos en ES/FR/PT (AD vacío por su
propio feed) y **pronóstico AEMET** en las 48 estaciones mapeadas. El estado operativo sigue sin
fuente autorizada, y el pronóstico de FR/PT/AD no está cubierto.

---

## 5. Qué debe autorizar el responsable para cambiar este cuadro

| Acción | Efecto sobre cobertura |
|---|---|
| ~~Autorizar `AEMET_API_KEY`~~ | ✅ **HECHO (2026-11-17)** — pronóstico real en 48 estaciones ES |
| Autorizar `METEOFRANCE_API_KEY` | Habilitaría previsión/vigilancia de Météo-France en FR |
| Suscribir Open-Meteo (`OPEN_METEO_API_KEY`) | Pronóstico comercial en toda la zona |
| Acuerdo escrito con operadores | Única vía para remontes/pistas/espesores |

Con `AEMET_API_KEY` autorizada, el pronóstico está operativo en ES. Sin `METEOFRANCE_API_KEY` ni
Open-Meteo, **FR/PT/AD siguen sin pronóstico**, y el estado operativo sigue sin fuente autorizada.

> **La clave AEMET vive sólo en el entorno** (`AEMET_API_KEY`), nunca en el repo. Verificado por
> escaneo: 0 apariciones en 1136 ficheros. Caducidad de la clave: **2027-02-25**.

---

## 6. Cumplimiento legal de lo publicado (verificado en t9)

| Obligación T&C de Meteoalarm | Estado |
|---|---|
| Enlace a `www.meteoalarm.org` en toda redistribución por internet | ✅ `sourceUrl` + `link` por aviso |
| Disclaimer **literal** publicado | ✅ idéntico carácter a carácter (248 chars, verificado independientemente) |
| Latencia media <5 min, nunca >10 min | ✅ TTL = 600 000 ms exactos |
| Atribución NMHS (un país) / «EUMETNET – MeteoAlarm» (multi) | ✅ |
| Sin ruta alternativa que redistribuya sin la obligación | ✅ verificado por el revisor |

El resto de fuentes **no se publican**, por lo que no generan obligaciones pendientes: Open-Meteo
(no cableado), AEMET y Météo-France (sin credencial), operadores (sin autorización), Infonieve
(bloqueado por política).
