# SNOW-03 — Proveedores reales, condiciones de esquí y licencias

PR para revisión. **No mergear sin autorización.**

## Estado: PARTIAL (revisión independiente PASS)

El hito pedía conectar SNOWHUB a datos meteorológicos reales. Lo conseguido y lo bloqueado, sin adornos:

| Objetivo | Estado | Causa |
|---|---|---|
| **Avisos oficiales** | ✅ **OPERATIVO 4/4** | Meteoalarm (EUMETNET), autorizado |
| Catálogo propio | ✅ 587 registros, 588 servidos | OSM (ODbL) + Wikidata (CC0) |
| Pipeline resistente a fallos | ✅ degradación probada con fallos reales | — |
| **Pronóstico** | ❌ **BLOQUEADO** | Sin fuente comercialmente autorizada activa |
| Condiciones operativas | ❌ **NO DISPONIBLE** | Ningún operador autoriza redistribución |
| Webcams | ❌ BLOQUEADO | Sin permiso de embed |

## Verificado (re-ejecutado por el capitán y por el revisor independiente)

```
tsc -p web-ssr/tsconfig.app.json --noEmit   → 0
check-schema.mjs                            → 0  «all invariants hold»
qa-unit.mjs                                 → 0  (27 ficheros)
verify-e2e.mjs                              → 0  SUMMARY 56/56
verify-meteoalarm.mjs                       → 0  4/4  (ES 75 / FR 138 / PT 25 / AD no_data)
verify-network-degradation.mjs              → 0  12/12
```

## Integración externa real: Meteoalarm

Cumple las condiciones de sus T&C (verificadas contra los términos vivos):

- Disclaimer **literal** en la API (248 caracteres, test `strictEqual`)
- `sourceUrl` + `link` por aviso (obligación «must include a link»)
- TTL = 600 000 ms exactos (latencia ≤10 min)
- Atribución por NMHS: «AEMET vía EUMETNET – MeteoAlarm» / «EUMETNET – MeteoAlarm»

## Lo que NO se hizo, deliberadamente

- **Open-Meteo no se cablea**: su `/en/terms` limita el *free tier* a uso **no comercial** y este producto es comercial. El adaptador existe, está probado con fixtures y **falla cerrado** sin licencia.
- **No se fabricaron credenciales.** Se verificó que 0 de 66 variables de entorno contienen una clave de proveedor.
- **No se derivan** espesores, remontes ni estados operativos de una predicción meteorológica.
- **Infonieve no se usó** como fuente del catálogo.

## Revisión independiente

| Ronda | Veredicto | Resultado |
|---|---|---|
| t5 | **NEEDS_REVISION** | Encontró un **blocker legal real**: la única integración operativa redistribuía datos sin el disclaimer ni el enlace exigidos por su licencia |
| t9 | **PASS** | L1 cerrado y verificado carácter a carácter; sin aserciones debilitadas ni tests skip |

## Defectos reales encontrados y corregidos

| Defecto | Impacto |
|---|---|
| Nivel leído de `cap:event` en vez de `<title>` | ES 0/68 y FR 0/233 avisos servidos → 213 recuperados |
| `freshness` ≡ 0 | La antigüedad no se medía; el check pasaba vacío |
| Catálogo no integrado | La API servía 3 de 589 |
| 61% del catálogo eran pistas sueltas + 2 estaciones en Kazajistán | Cobertura ficticia → 587 verificadas |
| Atribución ODbL perdida en silencio (287 filas) | Incumplimiento de licencia |
| Meteoalarm sin disclaimer ni enlace | **Incumplimiento legal** |

## Para pasar de PARTIAL a PASS

1. Autorizar `AEMET_API_KEY`, `METEOFRANCE_API_KEY` u `OPEN_METEO_API_KEY`.
2. Acuerdo escrito con operadores para datos operativos.

## Documentación

- `docs/snow/SNOW-03-PROVIDERS-REPORT.md`
- `docs/snow/SNOW-03-COVERAGE-MATRIX.md`
- `docs/snow/SNOW-03-LICENSE-VERDICTS.md`
- `docs/snow/EXECUTION-STATE.md`

## Riesgos residuales declarados (no bloqueantes)

`region` = `"SIN_REGION"` en 585 filas (debería ser `null` en el DTO público) · `coverage.byCountry` 0/0 no medido · 101 registros `sizeUnverified` (Overpass saturado) · frontera ES/FR resuelta a favor de ES fuera de enclaves verificados · **gate determinista ENGINE-04 NO EJECUTADO** sobre esta rama.
