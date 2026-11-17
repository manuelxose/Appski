# SNOW-03 — Veredictos de licencia verificados (Fase A)

**Fecha de verificación:** 2026-11-16 · **Verificado por:** especialista (t1) + capitán (re-auditoría)
**Método:** sonda HTTP real + extracto literal de la cláusula. **Evidencia cruda:**
`docs/snow/snow03-t1-verification-cache.json` (53 sondas, 45×200, 23 grupos de extractos).

> **Regla de este documento.** Una fila sólo es `AUTORIZADO` si existe un extracto LITERAL de la
> licencia vigente que lo sostiene. Acceder a una API (HTTP 200) **no** es derecho a mostrar sus
> datos. Todo lo no verificado es `DESCONOCIDO`, nunca un sí por omisión.

---

## 1. Veredicto por proveedor y tipo de dato

| Proveedor | Dato | Veredicto | Base legal (literal) | Atribución exigida |
|---|---|---|---|---|
| **AEMET** | previsión, avisos CAP | **AUTORIZADO** | Nota Legal nov-2016: «permiten la reutilización de los documentos sometidos a ellas para fines comerciales y no comerciales» + cesión no exclusiva con «reproducción, distribución, comunicación pública o transformación» | «© AEMET» / «Fuente: AEMET» + fecha de última actualización |
| **AEMET** | BPA aludes (PDF) | **DESCONOCIDO** | La Nota Legal cubre aemet.es; el canal PDF no está documentado como API | pendiente |
| **Météo-France** public-api | previsión, vigilancia | **RESTRINGIDO hoy** | 401 `{"code":"900902","message":"Missing Credentials"}`; con cuenta+token aplica Licence Ouverte 2.0 | «Météo-France» |
| **Météo-France** BPA / HTML meteofrance.com | aludes | **NO DISPONIBLE** | Art. 2: prohíbe «toute utilisation de l'un des éléments des sites Internet dans un environnement informatique en réseau» | — |
| **Meteo Andorra** | previsión, BPA | **RESTRINGIDO** | Formulario exige IP fija; sin licencia comercial publicada; Avís Legal sin cesión | — |
| **IPMA** | observación, avisos | **NO DISPONIBLE (comercial)** | «desde que dessa utilização não decorram finalidades lucrativas ou ofensivas» | — |
| **Open-Meteo** free | previsión | **NO DISPONIBLE (comercial)** | `/en/terms`, sección *Non-Commercial Use*: «You may only use the free API services for non-commercial purposes» | — |
| **Open-Meteo** pago | previsión | **AUTORIZADO** (pendiente de compra) | Suscripción comercial; `customer-api.open-meteo.com` + `&apikey=` (hoy 401) | «Weather data by Open-Meteo.com» |
| **Copernicus C3S** ERA5 | clima histórico | **AUTORIZADO** | «Licence CC-BY», DOI 10.24381/cds.adbb2d47 | atribución + DOI |
| **Meteoalarm** | avisos oficiales | **AUTORIZADO** | T&C (15/03/2024) §5: «may be used and redistributed under terms equivalent to the Creative Commons Attribution 4.0 International License (CC BY 4.0)» | «EUMETNET – MeteoAlarm» (multi-país) o NMHS (uno) + hora de emisión + enlace |
| **Operadores de estación** | estado operativo, espesores | **NO DISPONIBLE** | Sin autorización de redistribución; la vía editorial no puede blanquear datos restringidos | — |

## 2. Corrección de la ruta de feeds de Meteoalarm (hallazgo del capitán)

El informe de t1 citó `feeds.meteoalarm.org/api/v1/warnings/feeds-XX`. **Verificado: 404 en los 4 países.**
Ruta real (HTTP 200, `application/atom+xml`):

| País | URL real | Bytes | Entries |
|---|---|---|---|
| ES | `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-spain` | 106 555 | 68 |
| FR | `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-france` | 352 833 | 233 (26 menciones avalanche) |
| PT | `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-portugal` | 22 131 | 14 |
| AD | `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-andorra` | 985 | **0 (vacío real)** |

El feed **RSS** está deprecado por el propio servicio: «This RSS feed has been deprecated. Please use
the Atom feed instead».

## 2b. Obligaciones de redistribución de Meteoalarm (BLOCKER L1 de la revisión t5)

Los T&C (Last Updated 15/03/2024, §5) imponen estas condiciones **a quien redistribuye**, no sólo a
quien accede:

| Obligación | Texto literal | Implementado |
|---|---|---|
| Enlace | «Any Information being redistributed through internet applications must include a link to the following URL: www.meteoalarm.org» | ✅ `sourceUrl` + `link` por aviso (t8) |
| Disclaimer | «All redistributors must publish the following disclaimer: "Time delays between this website and the www.meteoalarm.org website are possible. For the most up-to-date awareness information as published by the participating National Meteorological and Hydrological Services, please refer to www.meteoalarm.org."» | ✅ literal en `AlertsDto`, con test de igualdad (t8) |
| Latencia | «on average less than five minutes and never longer than ten minutes» | ✅ TTL = 10 min exactos (t8) |
| No modificar | Si se modifica, debe redistribuirse junto al original sin cambio material | ✅ (no se modifica el contenido) |
| Fuente | «EUMETNET – MeteoAlarm» (multi-país) / NMHS (un país) | ✅ NMHS por país (t8) |

**Verificado por el capitán contra los T&C vivos (2026-11-17):** el disclaimer servido por la API es
idéntico al literal tras resolver el Markdown del CMS. El crudo del CMS **sí** contiene Markdown
(`RAW_HAS_MARKDOWN true`); la evidencia de Fase A ya lo tenía resuelto. Ambas cosas son ciertas y la
defensa implementada (tests que prohíben `](`, corchetes y URLs dentro del texto) evita la regresión.

> **Trampa documentada (capitán):** el CMS entrega el disclaimer con **marcado Markdown dentro de las
> comillas** — `[www.meteoalarm.org](https://meteoalarm.org/en/live/)`. Copiar carácter a carácter del
> HTML publicaría los corchetes y paréntesis como texto visible. El texto publicado debe ser el
> Markdown resuelto a texto plano, con la URL en un campo estructurado (`sourceUrl`).


## 3. Contradicción documentada: licencia frente a condiciones de servicio

`open-meteo.com/en/licence` publica **CC BY 4.0** sin mención comercial, mientras que
`open-meteo.com/en/terms` restringe el *free tier* a uso **no comercial**. Prevalece la condición
de uso del servicio que se consume. Consecuencia: se implementa el adaptador (probado con fixtures),
pero **no se cablea** como fuente de producción mientras no exista `OPEN_METEO_API_KEY`.

## 4. Credenciales que el responsable debe autorizar

| Variable de entorno | Trámite | Estado |
|---|---|---|
| `AEMET_API_KEY` | Formulario en `opendata.aemet.es/centrodedescargas/obtencionAPIKey` (email + Turnstile) | **NO EXISTE** |
| `METEOFRANCE_API_KEY` | Cuenta + aplicación en `portail-api.meteofrance.fr` | **NO EXISTE** |
| `OPEN_METEO_API_KEY` | Suscripción de pago (Stripe) → `customer-api.open-meteo.com` | **NO EXISTE** |
| `CDS_PERSONAL_ACCESS_TOKEN` | `cds.climate.copernicus.eu/how-to-api` | **NO EXISTE** |
| — (meteo.ad) | Autorización escrita + IP fija | **NO SOLICITADA** |
| — (IPMA) | Autorización escrita (Serra da Estrela) | **NO SOLICITADA** |

**Ninguna credencial fue fabricada ni usada.** Verificado: 66 variables de entorno, 0 con patrón de clave.

## 5. Trampa de implementación (AEMET)

Sin `api_key`, los endpoints de AEMET devuelven **HTTP 200 con cuerpo VACÍO**, no 401. Un cliente que
sólo mire el status code marcaría la fuente como disponible y serviría una respuesta vacía como si
fuera dato. La validación debe exigir JSON parseable y forma esperada.
