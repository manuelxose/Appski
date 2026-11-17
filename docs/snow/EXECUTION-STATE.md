# EXECUTION-STATE — SNOW-03 (proveedores reales, condiciones de esquí y licencias)

**Última actualización:** 2026-11-17 · **Rama:** `feat/snow-03-real-providers`
**Worktree:** `.snow03-worktree` · **Base:** `master` = `7908914c23ded34dd1740127aa5ffb9a7ce1b5f3`
**Estado global:** **PARTIAL** — con revisión independiente **PASS** (t9). Ver §7.

> **Nota de honestidad.** El estado no es PASS porque el hito pide datos meteorológicos reales y
> **el pronóstico está bloqueado por licencia y credenciales**, no por falta de trabajo. Lo que sí
> está operativo y verificado: avisos oficiales de Meteoalarm, catálogo propio servido por la API y
> pipeline resistente a fallos. Ninguna cobertura está estimada.
>
> *Estado previo (SNOW-02), conservado para trazabilidad:* backend operativo verificado y mergeado a
> `master` el 2026-11-16 por decisión del usuario, con excepción declarada respecto al gate de entrega.

---

## 1. Identidad del árbol

| Dato | Valor |
|---|---|
| Commit base | `7908914c23ded34dd1740127aa5ffb9a7ce1b5f3` (`master`) |
| Rama | `feat/snow-03-real-providers` |
| Worktree registrado ENGINE-03 | `snow03-main` → `.snow03-worktree` (un escritor, verificado) |
| `node_modules` | junction a la raíz del repo |

---

## 2. Funciones DEMOSTRADAS (re-ejecutadas por el capitán y por el revisor independiente)

| Función | Evidencia | Estado |
|---|---|---|
| Type-check | `tsc -p web-ssr/tsconfig.app.json --noEmit` → exit 0 | DEMOSTRADO |
| Esquema SQL (SNOW-02 intacto) | `check-schema.mjs` → «all invariants hold», exit 0 | DEMOSTRADO |
| Suite de nieve | `qa-unit.mjs` → exit 0, 27 ficheros | DEMOSTRADO |
| E2E completo | `verify-e2e.mjs` → **56/56**, exit 0 | DEMOSTRADO |
| Avisos reales de 4 países | `verify-meteoalarm.mjs` → **4/4**: ES 75 / FR 138 / PT 25 / AD `no_data` | DEMOSTRADO |
| Cumplimiento legal Meteoalarm | disclaimer literal + `sourceUrl` + `link` por aviso + TTL 600 000 ms | DEMOSTRADO |
| Degradación sin red | `verify-network-degradation.mjs` → **12/12** (ECONNREFUSED, DNS, timeout real) | DEMOSTRADO |
| Recuperación tras fallo transitorio | proxy local 503→200, pipeline `hits=2` | DEMOSTRADO |
| Persistencia tras SIGKILL | `liftsOpen=17` sobrevive, atribución editorial intacta | DEMOSTRADO |
| Idempotencia del catálogo | run1 inserta 587, run2 `noop=true` | DEMOSTRADO |
| Catálogo corrupto no tumba el borde | sandbox: `http=200`, sirve seed, warning registrado | DEMOSTRADO |
| Antigüedad medida (no ≡0) | `observedAt` = emisión real (`cap:sent`), ±120 s | DEMOSTRADO |

---

## 3. Funciones BLOQUEADAS / NO DEMOSTRADAS (declaradas, no maquilladas)

| Pendiente | Motivo real | Estado |
|---|---|---|
| **Pronóstico meteorológico** | Ninguna fuente comercialmente autorizada activa: AEMET y Météo-France requieren clave inexistente; Open-Meteo *free* prohíbe uso comercial | **BLOQUEADO POR LICENCIA Y CREDENCIALES** |
| Condiciones operativas (remontes/pistas/espesores) | Ningún operador autoriza redistribución | **NO DISPONIBLE (legal)** |
| Webcams | Sin permiso de embed | BLOQUEADO |
| Copernicus C3S (ERA5) | API por bloques NetCDF; no sirve tiempo presente | NO APTO |
| `coverage.byCountry` en `/v1/config` | `config()` es síncrono y el maestro se lee async | **NO MEDIDO** (0/0 declarado, no inventado) |
| `region` = `"SIN_REGION"` en 585 filas | El contrato exige `string`; debería traducirse a `null` en el DTO público | Deuda declarada |
| 101 registros `sizeUnverified` | Overpass `out bounds` falló 3/3 (saturación del entorno) | Declarado |
| Frontera ES/FR | Se resuelve a favor de ES fuera de enclaves verificados; sin daño medido (FR=462) | Aproximación declarada |
| Aislamiento de seguridad (lectura/red) | No es sandbox de lectura/red | **SECURITY PARTIAL** |

---

## 4. Hallazgos y defectos corregidos durante el hito

| ID | Defecto | Impacto | Estado |
|---|---|---|---|
| H1 | Nivel de Meteoalarm leído de `cap:event` (sin color) en vez de `<title>` | **ES 0/68 y FR 0/233 avisos servidos** | CORREGIDO |
| H2 | `freshness` ≡ 0 (se usaba el instante de la petición como `observedAt`) | La antigüedad no se medía; check pasaba vacío | CORREGIDO |
| H3 | Check `N6` de red con `true` hardcodeado | Habría pasado siempre | CORREGIDO por su autor |
| H4 | Atribución ODbL perdida en silencio (287 filas como `allowed`) | Incumplimiento de licencia | CORREGIDO |
| H5 | Catálogo no integrado (`served=3` vs `589`) | Fase B no llegaba al producto | CORREGIDO (t7) |
| H6 | 61% del catálogo eran pistas sueltas + 2 estaciones en Kazajistán | Cobertura ficticia | CORREGIDO |
| **L1** | **Meteoalarm redistribuido sin disclaimer literal ni enlace** | **Incumplimiento legal de la única integración operativa** | **CORREGIDO (t8)** |
| L2 | Atribución NMHS nunca usada (siempre multi-país) | Incumplimiento menor | CORREGIDO |
| D1 | Cifras erróneas en documentos del capitán (115/101, marcadores t7) | Informe inconsistente | CORREGIDO por el capitán |

---

## 5. Evidencias verificables

| Evidencia | Ubicación |
|---|---|
| Informe de entrega | `docs/snow/SNOW-03-PROVIDERS-REPORT.md` |
| Matriz de cobertura | `docs/snow/SNOW-03-COVERAGE-MATRIX.md` |
| Veredictos de licencia | `docs/snow/SNOW-03-LICENSE-VERDICTS.md` |
| Evidencia real (URL redactada + sha256) | `docs/snow/snow03-evidence/real/` |
| Capturas OSM/Wikidata con sha256 | `docs/snow/snow03-evidence/raw/` |
| Sondas de licencia (53 HTTP) | `docs/snow/snow03-t1-verification-cache.json` |
| Drivers reproducibles | `scripts/snow03/{verify-e2e,verify-meteoalarm,verify-network-degradation,build-station-catalog}.mjs` |

**Distinción sintético / real:** fixtures en `providers/fixtures/` marcadas como sintéticas; la
evidencia de producción está en `real/` con URL (redactada) y sha256.

---

## 6. Revisión independiente

| Ronda | Veredicto | Hallazgos |
|---|---|---|
| t5 | **NEEDS_REVISION** | L1 (blocker legal), L2, T1/T2, D1 — ninguno ocultado |
| t9 | **PASS** | L1 y L2 cerrados y verificados; T1/T2 endurecidos; sin aserciones debilitadas ni tests skip |

El revisor **no es el implementador** y re-ejecutó todos los gates por su cuenta en ambas rondas.

---

## 7. Estado y pendiente de autorización

**MILESTONE: PARTIAL** (revisión independiente PASS).

- **No hay merge ni despliegue.** La rama está en un worktree, con commit local.
- Un `PASS` de revisión **no autoriza** el merge (ENGINE-01 §4, ENGINE-02 §6).

### Para pasar de PARTIAL a PASS hacen falta

1. Que el responsable autorice al menos una credencial de pronóstico:
   `AEMET_API_KEY`, `METEOFRANCE_API_KEY` u `OPEN_METEO_API_KEY` (§6 del informe).
2. Acuerdo escrito con operadores para condiciones operativas (única vía legal).
3. Follow-ups no bloqueantes: `SIN_REGION` en DTO público, `coverage.byCountry`, 101
   `sizeUnverified`, contorno municipal ES/FR.

### Gate determinista ENGINE-04

`qa/qa-manifest.json` sigue describiendo las etapas de SNOW-02. Las etapas nuevas de SNOW-03 se
verifican con los drivers de `scripts/snow03/`; **no se ha emitido un `verify`/`gate` ENGINE-04
sobre esta rama**, por lo que el gate determinista queda **NO EJECUTADO** (no "PASS").
