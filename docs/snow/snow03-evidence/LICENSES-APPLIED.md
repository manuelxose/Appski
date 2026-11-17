# SNOW-03 — Veredictos de licencia aplicados en código

Documento de trazabilidad: **qué texto se leyó**, **de dónde**, y **qué decisión tomó el
código** a partir de él. Regla del carril: no se declara `AUTORIZADO` nada cuyo texto no
se haya leído literalmente.

Fecha de lectura: 2026-11-16 (Europe/Madrid).

---

## 1. MeteoAlarm (EUMETNET) — `weather-alert` — **AUTORIZADO con atribución**

### Texto LITERAL leído

Elemento `<rights>` del propio feed Atom servido por `feeds.meteoalarm.org`:

> Copyright © 2026 MeteoAlarm.Org. Licensed under terms equivalent to CC BY 4.0, with
> additional requirements for redistributing outlined in our Terms and Conditions.

Extraído de los cuatro feeds (ES/FR/PT/AD) y guardado en
`web-ssr/src/snow/providers/fixtures/METEOALARM-PROVENANCE.json` (campo `rights` de cada
registro) junto con el `sha256` del cuerpo capturado.

### Ruta REAL verificada

```
https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-{spain|france|portugal|andorra}
```

Medido (2026-11-16): HTTP 200 en los cuatro países; 68 / 233 / 14 / 0 entradas.

> La ruta `feeds.meteoalarm.org/api/v1/warnings/feeds-XX` responde **404** y **no se usa**.
> El informe de Fase A la daba como buena; el capitán la corrigió y se re-verificó aquí.

### Hallazgo adicional: la negociación de contenido

MeteoAlarm devuelve **406** si se le restringe `Accept` (`application/json` y
`application/atom+xml,application/xml` fallan); sólo responde 200 si se acepta cualquier
tipo. El cliente HTTP por defecto enviaba `application/json`, lo que rompía el feed. Ahora
`HttpRequest.accept` es configurable y el adapter pide wildcard. **Este fallo se detectó en
la verificación E2E real, no en los tests con fixtures.**

### Decisión aplicada en código

| Requisito de la cláusula | Implementación | Fichero |
|---|---|---|
| Atribución obligatoria | `attributionRequired: true`; `EUMETNET – MeteoAlarm` multi-país, NMHS si un país | `providers/authorizations.ts` |
| No modificar el contenido | Se sirven los avisos tal cual llegan; sin transformar el texto | `providers/meteoalarm.adapter.ts` |
| Hora de emisión | Se conserva `cap:sent`/`cap:onset` en `validFrom` | `providers/meteoalarm.adapter.ts` |
| Latencia ≤10 min | `CACHE_POLICY.meteoalarm.ttlMs = 10 * 60_000` (**obligatorio**, no optimización) | `cache/cache-policy.ts` |
| Enlace/fuente | `id` = `cap:identifier` CAP; atribución expuesta en la procedencia | adapter + `provenance` |

### Honestidad de datos

- **Feed de Andorra vacío** (985 B, 0 `<entry>`): produce `no_data` / `source-silent`.
  No es un error ni un aviso inventado.

#### Dónde está el NIVEL (corrección de t6)

`cap:severity` vale siempre `Moderate` y **no** distingue gravedad. El color del nivel lo
publica el feed en el **`<title>`** de cada `<entry>`:

| País | entries | color en `<title>` | color en `cap:event` |
|---|---:|---:|---:|
| ES | 68 | 68/68 | 0/68 |
| FR | 233 | 233/233 | 0/233 |
| PT | 14 | 14/14 | 14/14 |
| AD | 0 | — | — |

Ejemplos reales: «Yellow Avalanches Warning issued for France - Haute-Savoie» (title),
frente a `cap:event` = «Moderate avalanches warning».

> **Defecto corregido (t6).** La primera versión leía
> `tagText(entry,'cap:event') ?? tagText(entry,'title')`: como `cap:event` existe en ES/FR,
> el `??` hacía que `<title>` **nunca** se leyera, `warningLevel()` devolvía `null` y se
> descartaban **68/68 avisos de ES y 233/233 de FR**. No era una limitación de la fuente:
> era un bug que perdía cobertura autorizada. Ahora el nivel se deriva del `<title>`
> primero, `cap:event` es respaldo, y `cap:event` se conserva como `phenomenon` (texto
> oficial del NMHS).
>
> Si **ni** title **ni** event traen un color reconocible, el aviso se **sigue descartando**
> (nunca se inventa un nivel); cubierto por test.

#### Medición real tras la corrección (2026-11-16, `verify-meteoalarm.mjs`)

| País | entries | usables | **VIGENTES servidos** | estado |
|---|---:|---:|---:|---|
| ES | 68 | 68 | **52** | ok |
| FR | 233 | 233 | **156** | ok |
| PT | 14 | 14 | **5** | ok |
| AD | 0 | 0 | 0 | no_data |

La diferencia entre «usables» y «vigentes servidos» son avisos que el feed aún publica pero
cuya ventana `cap:expires` ya había pasado en el instante de la llamada.

---

## 2. Open-Meteo — `forecast` — **NO CABLEADO (restringido para uso comercial)**

### Motivo

- La página `/en/licence` dice CC BY 4.0, pero `/en/terms` (sección *Non-Commercial Use*)
  dice: «You may only use the free API services for non-commercial purposes.»
- Este producto es **comercial** ⇒ el free tier no es base legal de producción.
- No hay clave comercial disponible: `customer-api.open-meteo.com` responde 401
  «API key required».

### Estado en el repositorio

| Elemento | Estado |
|---|---|
| `providers/open-meteo.adapter.ts` | **Existe y está probado** con fixtures reales |
| `authorizations.ts` | **Sin entrada** ⇒ `authorizationFor('open-meteo')` cae en `blocked` |
| `FALLBACK_CHAINS` | **No aparece** |
| `registry.ts` | **No registrado** (comentario explicativo incluido) |
| Comportamiento del adapter | **Falla cerrado**: sin licencia verificada devuelve `blocked` **sin tocar la red** |

Requiere `OPEN_METEO_API_KEY` (plan comercial) **y** una nueva verificación de la cláusula
del plan de pago antes de cablearlo.

---

## 3. `meteofrance-bpa-html` — **NUNCA en cadena**

Prohibido por los *droits de reproduction* de meteofrance.com (Art. 2: prohíbe «toute
utilisation de l'un des éléments des sites Internet dans un environnement informatique en
réseau»). Verificado por test: no aparece en ninguna cadena de `FALLBACK_CHAINS`.

---

## 4. Cómo reproducir esta verificación

```bash
# 1. Cláusulas y feeds (grabación con sha256 y texto de <rights>)
node scripts/snow03/capture-meteoalarm-fixtures.mjs

# 2. Verificación E2E REAL contra los feeds (4 países) → docs/snow/snow03-evidence/real/
node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
     scripts/snow03/verify-meteoalarm.mjs

# 3. Fixtures de Open-Meteo (mecanismo probado; NO implica licencia de uso)
node scripts/snow03/capture-open-meteo-fixtures.mjs
```
