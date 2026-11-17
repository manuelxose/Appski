# FASE 5 — Registro de proveedores, licencias y derechos de uso

Módulo de nieve (`snow/*`). Fuentes de datos reales y veredicto de autorización por tipo de dato.
Fecha de inspección: **2026-11-16** (Europe/Madrid). Tarea: `t11` (research sin dependencias).
Autor: `data-providers`.

---

## 0. Regla de lectura de este documento

Cada proveedor lleva **un veredicto por tipo de dato**, nunca uno global. Los valores de
`licenseStatus` son exclusivamente:

| Estado | Significado operativo |
|---|---|
| `allowed` | Uso comercial y redistribución permitidos por la licencia, sin condición de atribución. |
| `allowed-with-attribution` | Permitido, con condición de atribución (y, si aplica, share-alike) explícita. |
| `restricted` | Permitido solo bajo condiciones parciales (p. ej. no comercial, o solo con contrato/API key previa). **No** se usa en producción sin cerrar la condición. |
| `blocked` | Prohibido, técnicamente imposible, o sin base legal de reutilización. No se ingiere ni se cachea. |
| `unverified` | No se pudo leer una cláusula aplicable. Se trata como `blocked` a efectos de producción. |

Reglas duras aplicadas en todo el documento (encargo del capitán, confirmadas en cada fuente):

1. **Accesibilidad ≠ derecho de reutilización.** Que una URL responda 200 y un humano vea el dato
   no autoriza su ingestión.
2. **Una webcam visible ≠ permiso para proxy/reemitir.** La atribución (`© roundshot.com`) no es
   licencia.
3. **Un ToS que prohíbe el scraping o el acceso automatizado ⇒ `blocked`**, aunque el dato sea
   "público". No existe la categoría "lo cacheamos y ya".
4. **Los precios y cuotas solo se citan si están publicados en la página del proveedor.** Lo que no
   se pudo verificar figura como `unverified` y **no** se inventa.
5. **Cero secretos.** Toda credencial se referencia por el **nombre de la variable de entorno**
   (`AEMET_API_KEY`, `MAPTILER_API_KEY`, …). Nunca su valor.
6. Los tipos "nieve" (espesores de nieve medida en pista, estado operativo de pistas/remontes) **no
   tienen fuente oficial reutilizable** en ES/AD/FR/PT. La conclusión de esta fase —y es la
   conclusión más importante del documento— es que esos tipos se cubren con
   **entrada editorial manual vía nuestro admin** (ver §7), no con scraping.

---

## 1. Resumen ejecutivo de veredictos

| Proveedor | Estación (maestro) | Estado operativo | Espesores nieve | Previsión meteo | Avisos/aludes | Mapas base | Webcams/imágenes |
|---|---|---|---|---|---|---|---|
| AEMET OpenData (ES) | `blocked` (no es su ámbito) | `blocked` | `blocked` | `allowed-with-attribution` | `allowed-with-attribution` (HTML/PDF, no API) | `blocked` | `blocked` |
| Météo-France Open Data (FR) | `blocked` | `blocked` | `blocked` | `allowed-with-attribution` | `restricted` (sitio institucional, no el portal API) | `blocked` | `blocked` |
| Meteo Andorra / SMN (AD) | `blocked` | `blocked` | `blocked` | `restricted` (petición previa, IP fija) | `restricted` | `blocked` | `blocked` |
| IPMA (PT) | `blocked` | `blocked` | `blocked` | `blocked` (**no comercial**) | `blocked` | `blocked` | `blocked` |
| IGN/CNIG (ES) | `allowed-with-attribution` (toponimia/límites) | n/a | n/a | n/a | n/a | `allowed-with-attribution` (CC-BY 4.0) | `blocked` |
| IGN Géoplateforme (FR) | `allowed-with-attribution` (por dataset) | n/a | n/a | n/a | n/a | `allowed-with-attribution` (Licence Ouverte 2.0 por dataset) | `blocked` |
| Copernicus (CLMS/EMS) | `allowed-with-attribution` | n/a | n/a | `allowed-with-attribution` (C3S/CAMS) | `allowed-with-attribution` (EMS) | `allowed-with-attribution` | `allowed-with-attribution` |
| OpenStreetMap (datos) | `allowed-with-attribution` (ODbL, share-alike) | `blocked` (no contiene) | `blocked` | `blocked` | `blocked` | `allowed-with-attribution` (ODbL) | `blocked` |
| OSM `tile.openstreetmap.org` | — | — | — | — | — | `blocked` (política comercial) | — |
| Protomaps (autohospedado) | — | — | — | — | — | `allowed-with-attribution` (ODbL + PMTiles) | — |
| MapTiler | — | — | — | — | — | `restricted` (Free no comercial; Flex de pago) | — |
| Stadia Maps | — | — | — | — | — | `restricted` (Free "Commercial use not allowed") | — |
| Mapbox | — | — | — | — | — | `unverified` | — |
| OpenTopoMap | — | — | — | — | — | `unverified` | — |
| Aramón | `restricted` (edición manual) | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` |
| Baqueira Beret | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` |
| Grandvalira | `restricted` (edición manual) | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` |
| FGC Turisme | `unverified` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` |
| feratel (webcams operador) | — | — | — | — | — | — | `blocked` |
| roundshot.com (webcams) | — | — | — | — | — | — | `blocked` |
| **infonieve.es** | `restricted` (solo referencia/reconstrucción) | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` | `blocked` |

**Conclusión:** solo **4 clases** de fuente son utilizables en producción con datos reales y
sostenibles: previsión meteo **AEMET** (ES) y **Météo-France** (FR), **mapas base IGN/Copernicus/
Protomaps**, y **maestro de estaciones** derivado de IGN + OSM + entrada editorial. Todo lo demás
(pistas abiertas, km esquiables, espesores, webcams) es **`blocked`** como ingestión automática.

---

## 2. Proveedor por proveedor

### 2.1 infonieve.es — la referencia, **no una fuente**

| Campo | Valor |
|---|---|
| URL oficial | <https://www.infonieve.es/> · <https://www.infonieve.es/recursos/> · <https://www.infonieve.es/recursos/api/> |
| Documentación | La página `recursos/api/` describe los campos del servicio |
| Política de acceso | **API de pago, previa solicitud comercial.** No hay endpoint público documentado ni clave de prueba |
| Autenticación | Se solicita por email/teléfono formulario. No publicada |
| Condiciones de redistribución | Prohibida sin autorización expresa (aviso legal §3) |
| Uso comercial | Prohibido por defecto (aviso legal §5) |
| Datos disponibles | *(según su propia página)* nombre/id de estación, tipo alpino/fondo, fechas de temporada, fecha de aplicación del parte, estado de apertura, pistas abiertas/totales, km abiertos/totales, remontes abiertos/totales, calidad y espesor mínimo/máximo, desglose pistas por nivel, estado por sectores/actividades, **nivel de riesgo de aludes**, observaciones, previsión de apertura a varios días. **No** ofrece previsiones meteorológicas |
| Cobertura | España + Andorra + Pirineo francés + Portugal (alpino y nórdico) |
| Frecuencia | "actualizada" sin compromiso formal; parte de nieve diario en temporada |
| Cuotas y costes | "contacta con nosotros para conocer las tarifas" → **`unverified`** (no publicado) |
| Formato | JSON ("aunque disponemos de otros formatos según las necesidades") |
| Fiabilidad | Fuente agregadora de un titular individual; sin SLA publicado |
| Caché/almacenamiento | No permitido sin contrato; el aviso legal prohíbe reproducir/transformar contenidos |
| Atribución requerida | No publicada; dependería del contrato |

**Evidencia (cláusulas citadas literalmente):**

- <https://www.infonieve.es/aviso-legal/> §3:
  > "reproducir o copiar, distribuir, permitir el acceso del público a través de cualquier modalidad
  > de comunicación pública, transformar o modificar los Contenidos, **a menos que se cuente con la
  > autorización del titular** de los correspondientes derechos o ello resulte legalmente permitido."
- <https://www.infonieve.es/aviso-legal/> §3:
  > "La utilización de esta información en otros sitios de Internet **requerirá autorización
  > expresa**."
- <https://www.infonieve.es/aviso-legal/> §5:
  > "El Titular **no concede ningún tipo de licencia o autorización de uso** personal al Usuario
  > sobre sus derechos de propiedad intelectual e industrial […]. El Usuario, única y exclusivamente,
  > puede utilizar el material […] **para su uso personal y privado, quedando prohibido su uso con
  > fines comerciales**."
- <https://www.infonieve.es/aviso-legal/> §5:
  > "la reproducción, distribución, comercialización, transformación, y en general, cualquier otra
  > forma de explotación […] constituye una infracción" .
- <https://www.infonieve.es/recursos/api/>:
  > "Si desea recibir más información o conocer **las tarifas** del servicio de la API, contacta con
  > nosotros".

**Veredictos**

| Tipo de dato | licenseStatus | Motivo |
|---|---|---|
| Maestro de estaciones | `restricted` | Solo como **referencia de campos/flujo** para reconstruir la capacidad. Los valores de catálogo se construyen desde IGN/OSM/editorial, no se copian |
| Estado operativo | `blocked` | Aviso legal §3/§5: autorización expresa necesaria; la API es de pago |
| Espesores nieve | `blocked` | Ídem |
| Previsiones | `blocked` | Ídem (y su API no las ofrece) |
| Avisos/aludes | `blocked` | Ídem |
| Mapas base | `blocked` | Ídem |
| Webcams/imágenes | `blocked` | Aviso legal §5 (fotografías propiedad del titular) **y** atribución a terceros (`roundshot.com`, `viewsurf.com`, `dgt.es`, `fecc.cat`, `turismefgc.cat`, `alberguesyrefugiosdearagon.com`) que no otorgan licencia alguna |

> **Esto corrige la hipótesis previa del capitán.** infonieve **sí** tiene un webservice anunciado
> (no es "widget-only"), pero es un **producto comercial cerrado y no documentado**. Sigue siendo
> inutilizable como fuente de ingestión; el estado `blocked` es correcto **por otro motivo** (licencia
> prohibitiva + tarifa no publicada), no porque sea solo un widget de iframe.
>
> **Acción recomendada:** si el cliente quiere datos de operador cubiertos de forma completa y
> legal, la vía es **contratar la API de infonieve** (`info@infonieve.es`) y sustituir el adaptador
> `infonieve` (ver `05b-provider-contracts.md`) sin tocar el resto del sistema. Hasta entonces, el
> adaptador existe pero arranca en estado deshabilitado.

### 2.2 AEMET OpenData (España)

| Campo | Valor |
|---|---|
| URL oficial | <https://opendata.aemet.es/> · <https://www.aemet.es/es/datos_abiertos/AEMET_OpenData> |
| Documentación | Acceso general (web) y `AEMET OpenData API` (REST), descritos en la página oficial |
| Política de acceso | REST gratuita, previa **obtención de API key** ("Obtención de API Key → Solicitar") |
| Autenticación | API key en la URL (`?api_key=…`). En nuestro código: `AEMET_API_KEY` |
| Condiciones de redistribución | **Permitidas** (nota legal, "Autorización de reutilización y cesión no exclusiva") |
| Uso comercial | **Permitido explícitamente** |
| Datos disponibles | Predicción municipal, predicción de montaña, avisos (METEOALERTA), observación, clima, **boletines de peligro de aludes (BPA) en PDF** |
| Cobertura | España (Pirineo navarro/aragonés y catalán para BPA; macizos adicionales con periodicidad semanal en temporada) |
| Frecuencia | Predicción municipal: varias veces al día. BPA: diario en temporada de esquí ("desde primeros de diciembre hasta primeros de mayo"); Guadarrama/Picos de Europa/Cordel-Peña Labra **semanal** |
| Cuotas y costes | Gratuito. No se encontró una tabla pública de límites de peticiones → límite **`unverified`**; se aplica throttling defensivo propio (ver §6) |
| Formato | JSON (API). **BPA: PDF** (`/documentos/es/eltiempo/prediccion/montana/boletin_peligro_aludes/BPA_*.pdf`) |
| Fiabilidad | Servicio oficial del Estado; sin SLA público |
| Caché/almacenamiento | No se impone límite explícito; se debe citar fuente y **fecha de última actualización** y no desnaturalizar el sentido |
| Atribución requerida | **Sí**: `© AEMET` o "Información elaborada por la Agencia Estatal de Meteorología"; para servicios de valor añadido: "Fuente: AEMET" o "Información elaborada utilizando, entre otras, la obtenida de la Agencia Estatal de Meteorología". Mantener el logotipo si el producto lo integra |

**Evidencia:**

- <https://www.aemet.es/es/nota_legal> (Nota Legal, noviembre de 2016), *Autorización de
  reutilización*:
  > "Las condiciones generales recogidas en la presente nota legal permiten la reutilización de los
  > documentos sometidos a ellas **para fines comerciales y no comerciales**."
- Ídem, *Condiciones generales para la reutilización* 1–5:
  > "1. Está prohibido desnaturalizar el sentido de la información. 2. Se debe citar a AEMET como
  > fuente […] 3. Debe mencionarse **la fecha de la última actualización** […] 4. No se puede
  > indicar, insinuar o sugerir que AEMET […] participa, patrocina, o apoya la reutilización […]
  > 5. Debe conservarse la integridad de los metadatos sobre la fecha de actualización".
- <https://www.aemet.es/es/eltiempo/prediccion/montana/boletin_peligro_aludes>:
  > "Durante la temporada de esquí, por lo general desde primeros de diciembre hasta primeros de
  > mayo, la AEMET elabora **diariamente** un BPA para el Pirineo navarro y aragonés y otro para el
  > Pirineo catalán. Además, con periodicidad **semanal** […] se emiten boletines […] para el Parque
  > Nacional de la Sierra de Guadarrama, el Parque Nacional de los Picos de Europa, y las Sierras del
  > Cordel y Peña Labra."

**Veredictos:** previsión `allowed-with-attribution`; aludes `allowed-with-attribution`
(**el único canal es PDF ⇒ requiere parser**); maestro de estaciones, estado operativo, espesores,
mapas base y webcams `blocked` (no existe ese dato en AEMET).

### 2.3 Météo-France — portail des données publiques / API

| Campo | Valor |
|---|---|
| URL oficial | <https://portail-api.meteofrance.fr/web/fr/> · <https://donneespubliques.meteofrance.fr/> |
| Documentación | Portal de APIs (SPA: sin contenido estático legible por `web_fetch`); guía PDF `GuidePortailDonneesPubliquesMeteoFrance.pdf` |
| Política de acceso | **Cuenta obligatoria** ("Une création de compte est nécessaire pour utiliser ce service") + aplicación/clave de API |
| Autenticación | Compte + API key. Variable propuesta: `METEOFRANCE_API_KEY` |
| Condiciones de redistribución | Los datos libres de acceso se publican bajo **Licence Ouverte d'Etalab** (LO 2.0) |
| Uso comercial | **Permitido** por la Licence Ouverte |
| Datos disponibles | Observación, predicción, vigilancia; **BPA (bulletin d'estimation du risque d'avalanche) en el sitio `meteofrance.com`, no en el portal de datos** |
| Cobertura | Francia (incluye Pirineo francés) |
| Frecuencia | Depende del dataset; el portal no publica una tabla estática → `unverified` por endpoint |
| Cuotas y costes | API pública gratuita con cuenta; **cuota concreta no verificable** (portal SPA) → `unverified`. Aplicar throttling propio |
| Formato | JSON (API) |
| Fiabilidad | Servicio oficial del Estado francés |
| Caché/almacenamiento | Licence Ouverte: sin límite, pero **conservar la fecha de última actualización** y no sugerir aval público |
| Atribución requerida | **Sí**: "source : Météo-France" + fecha de última actualización |

**Evidencia:**

- <https://donneespubliques.meteofrance.fr/?fond=dossier&id_dossier=1> ("Textes officiels et
  conditions d'accès"), sección *Télécharger les licences au format PDF*:
  > "La **licence Ouverte d'Etalab** […] (pour les données libres d'accès)".
- <https://raw.githubusercontent.com/etalab/licence-ouverte/master/LO.md> (Licence Ouverte 2.0),
  *Réutilisation*:
  > "Le « Concédant » concède au « Réutilisateur » un droit non exclusif et gratuit de libre
  > « Réutilisation » de l'« Information » […] **à des fins commerciales ou non**, dans le monde
  > entier et pour une durée illimitée" […] "de la diffuser, la redistribuer, la publier et la
  > transmettre, de l'exploiter à titre commercial, par exemple en la combinant avec d'autres
  > informations, ou en l'incluant dans votre propre produit ou application."
  > Obligación: "mentionner la paternité de l'« Information » : sa source (a minima le nom du
  > « Concédant ») et **la date de la dernière mise à jour**".
- <https://cat.opidor.fr/index.php?title=Météo-France_:_Portail_des_API>:
  > "Conditions d'usage : **Une création de compte est nécessaire** pour utiliser ce service".
- <https://meteofrance.fr/droits-de-reproduction> — **importante**: esta página regula los *sites
  Internet* institutional (meteofrance.com/.fr, Vigilance, etc.) y su Art. 1 concede solo
  > "un droit d'usage privé, individuel et personnel ou à caractère pédagogique, informatif et/ou
  > éducatif"
  con Art. 2 prohibiendo "toute utilisation de l'un des éléments des sites Internet **dans un
  environnement informatique en réseau**". Su ámbito incluye "Le portail des API de l'Établissement"
  **como sitio web**, pero las *données* de ese portal se rigen por la Licence Ouverte citada arriba.
  **Consecuencia operativa:** el JSON de la API se usa y redistribuye bajo Licence Ouverte; las
  **páginas HTML y los BPA renderizados en `meteofrance.com` NO** se scrappean ni se cachean.

**Veredictos:** previsión (portal API) `allowed-with-attribution`; aludes (BPA en
`meteofrance.com`, solo HTML) `restricted` — no hay feed ni licencia de datos aplicable a esa
página, solo enlazado/deep-link con "source : Météo-France"; resto de tipos `blocked`.

### 2.4 Meteo Andorra — Servei Meteorològic Nacional (Andorra)

| Campo | Valor |
|---|---|
| URL oficial | <https://www.meteo.ad/> · JSON: <https://www.meteo.ad/json> · aludes: <https://www.meteo.ad/estatneu> |
| Documentación | El portal declara intención de "obrir les dades públiques" y ofrece previsión "codificada amb el mètode JSon" |
| Política de acceso | **Formulario de solicitud previa** (web donde se mostrará, persona, email, teléfono, **IP fija** desde la que se consultará, motivo) |
| Autenticación | Control por **IP fija** declarada, no por API key |
| Condiciones de redistribución | No publicadas |
| Uso comercial | No publicado |
| Datos disponibles | Previsión meteorológica numérica; avisos; BPA (zonas norte/centro/sur) y datos de estaciones (temperatura, precipitación, **gruix de neu**) en web |
| Cobertura | Principado de Andorra (Grandvalira, Ordino Arcalís, Pal Arinsal) |
| Frecuencia | BPA: actualización diaria en temporada; en fuera de temporada se indica "propera actualització 01/12/2026 a les 16:00" |
| Cuotas y costes | No publicados → `unverified`; se presume gratuito |
| Formato | JSON (previo request) y **HTML** (web y BPA) |
| Fiabilidad | Servicio oficial del Govern d'Andorra |
| Caché/almacenamiento | Sin cláusula → `unverified`. No cachear hasta tener respuesta escrita |
| Atribución requerida | No definida. Aplicar buenas prácticas: enlace a `meteo.ad` |

**Evidencia:**

- <https://www.meteo.ad/json>:
  > "Si desitgeu tenir accés a la previsió meteorològica en format numèric, si us plau, empleneu el
  > següent formulari." (campos: *"IP (fixa) des de la qual es consultarà la informació en format
  > JSon"*).
- <https://www.meteo.ad/legal> (Avís Legal): recorre titularidad del sitio y privacidad
  (Llei 29/2021) — **no contiene ninguna licencia de reutilización ni cesión de derechos**.
- <https://www.meteo.ad/estatneu>:
  > "La publicació regular de butlletins d'allaus amb mapa del perill d'allaus es reprendrà a
  > principis de desembre, segons la situació de neu."

**Veredictos:** previsión `restricted` (**requiere solicitud, IP fija y autorización escrita**;
ver §8 acción A2); aludes `restricted` (mismo trámite); todo lo demás `blocked`.

### 2.5 IPMA — Portugal

| Campo | Valor |
|---|---|
| URL oficial | <https://api.ipma.pt/> |
| Documentación | Pública y detallada en la propia portada (endpoints, campos, ejemplos) |
| Política de acceso | API abierta **sin clave**; el IPMA pide avisar por email de la utilización |
| Autenticación | Ninguna |
| Condiciones de redistribución | **Solo uso personal o público sin ánimo de lucro** |
| Uso comercial | **PROHIBIDO** |
| Datos disponibles | Previsión diaria por localidad, avisos meteorológicos (incluye `awarenessTypeName: "Neve"`), observación, sismicidad, riesgo de incendio, UV, estado del mar |
| Cobertura | Portugal continental + Açores + Madeira (incluye **Serra da Estrela**) |
| Frecuencia | Previsión: 2×/día (corridas 00UTC ≈10:00 y 12UTC ≈20:00). Observación: horaria |
| Cuotas y costes | Sin cuota publicada; gratuito pero **no comercial** |
| Formato | JSON, GeoJSON, CSV |
| Fiabilidad | Instituto público; buena documentación |
| Caché/almacenamiento | Sin cláusula; irrelevante por la prohibición comercial |
| Atribución requerida | "O Utilizador deve **referir, sempre, a fonte de informação**" + logotipo del sitio en hiperdocumentos |

**Evidencia:**

- <https://api.ipma.pt/> → *Declaração sobre proteção dos direitos de autor*:
  > "O Utilizador pode copiar, importar ou utilizar gratuitamente informações ou símbolos nacionais
  > existentes neste site para uso **pessoal ou público desde que dessa utilização não decorram
  > finalidades lucrativas ou ofensivas**."
- Ídem:
  > "O **logo-símbolo** do sítio de internet do IPMA deve ser utilizado sempre que um Utilizador
  > pretenda incluir informação disponibilizada pelo sítio de internet em páginas de
  > hiper-documentos, devendo referenciar a hiper-ligação ao site do IPMA."

**Veredictos:** **todos `blocked`**, incluida la previsión y los avisos. Es el caso paradigmático
de "abierto ≠ reutilizable comercialmente". Portugal queda cubierto por **meteo genérica** (C3S /
Copernicus) + **editorial**, no por IPMA. Si se quiere Serra da Estrela con dato oficial, hay que
pedir autorización escrita al IPMA (§8 acción A3).

### 2.6 IGN / CNIG (España) — mapas y maestro geográfico

| Campo | Valor |
|---|---|
| URL oficial | <https://www.ign.es/> · <https://www.ign.es/web/ign/portal/politica-datos> |
| Documentación | Orden FOM/2807/2015 + "Condiciones_licenciaUso_IGN.pdf" |
| Política de acceso | Descarga y servicios WMS/WMTS/WFS públicos |
| Autenticación | No para servicios de datos abiertos |
| Condiciones de redistribución | Permitida, **compatible con CC-BY 4.0** |
| Uso comercial | Permitido |
| Datos disponibles | MTN25/50, PNOA, BCN, toponimia (NGBE), límites administrativos, senderos |
| Cobertura | España |
| Frecuencia | Por producto (IME/IR) |
| Cuotas y costes | Gratuito; sin tabla pública de límites por servicio → `unverified` |
| Formato | WMS/WMTS/WFS, GeoTIFF, shapefile |
| Fiabilidad | Alta (organismo oficial) |
| Caché/almacenamiento | Permitido con atribución; sin límite explícito |
| Atribución requerida | **Sí** (CC-BY 4.0): "© Instituto Geográfico Nacional de España" o equivalente + licencia |

**Evidencia:**

- <https://www.ign.es/web/ign/portal/politica-datos>:
  > "el **uso de la información** de los productos y servicios de datos geográficos […] así como sus
  > derivados, conlleva la **aceptación** implícita […] concretada en la siguiente **licencia de
  > uso**, **compatible con [CC-BY 4.0]**."

**Veredictos:** mapas base `allowed-with-attribution`; maestro de estaciones (coordenadas,
términos municipales, toponimia de los complejos) `allowed-with-attribution`; imágenes de satélite
decorativas `blocked` (no es necesario usarlas).

### 2.7 IGN — Géoplateforme / cartes.gouv.fr (Francia)

| Campo | Valor |
|---|---|
| URL oficial | <https://cartes.gouv.fr/> · CGU: <https://cartes.gouv.fr/cgu/> |
| Documentación | CGU v. 15/10/2024 + metadatos de cada API/dataset |
| Política de acceso | Abierta; algunas APIs exigen cuenta |
| Autenticación | Variable por API (cuenta / FranceConnect / AgentConnect-ProConnect) |
| Condiciones de redistribución | **Definidas por el Fournisseur de données en los metadatos de cada dataset**; el contenido del sitio es Licence Ouverte 2.0 |
| Uso comercial | Permitido **si la licencia del dataset lo permite** (verificar metadatos por capa) |
| Datos disponibles | Ortofotos, BD TOPO, capas de relieve y administrativas |
| Cobertura | Francia |
| Frecuencia | Por producto |
| Cuotas y costes | Gratuito; límites por API en su documentación → `unverified` |
| Formato | WMS/WMTS/WFS, GeoJSON, PMTiles |
| Fiabilidad | Alta |
| Caché/almacenamiento | Según licencia del dataset |
| Atribución requerida | Según dataset (habitualmente Licence Ouverte: fuente + fecha de actualización) |

**Evidencia:**

- <https://cartes.gouv.fr/cgu/> §2 *Utilisation conforme des API*:
  > "Les données contenues dans les API sont soumises à la **licence choisie et renseignée par le
  > Fournisseur de données**, accessible depuis les métadonnées de données de l'API. Vous vous
  > engagez à respecter les termes de la licence attachée à ces données."
- <https://cartes.gouv.fr/cgu/>, pie:
  > "Sauf mention explicite de propriété intellectuelle détenue par des tiers, les contenus de ce
  > site sont proposés sous **licence etalab-2.0**".

**Veredictos:** mapas base `allowed-with-attribution` (**verificando la licencia del dataset
concreto en sus metadatos antes de cada capa**); resto `blocked`.

### 2.8 Copernicus (CLMS / EMS / C3S)

| Campo | Valor |
|---|---|
| URL oficial | <https://www.copernicus.eu/en/access-data> · <https://land.copernicus.eu/> · <https://emergency.copernicus.eu/mapping> |
| Documentación | Portal de datos, catálogo de servicios |
| Política de acceso | "free, full, and open basis" para la inmensa mayoría de datos |
| Autenticación | Cuenta CDSE en algunos servicios; descarga abierta en otros |
| Condiciones de redistribución | Permitida |
| Uso comercial | Permitido |
| Datos disponibles | Land cover, DEM/relieve, imágenes Sentinel, mapas de emergencia (EMS), clima (C3S), atmósfera (CAMS) |
| Cobertura | Global / Europa |
| Frecuencia | Por producto (algunos diarios) |
| Cuotas y costes | Gratuito; cuotas por servicio → `unverified` |
| Formato | GeoTIFF, NetCDF, WMS, GeoJSON |
| Fiabilidad | Alta (programa UE) |
| Caché/almacenamiento | Permitido |
| Atribución requerida | Créditos: "European Union, Copernicus …". El **uso del logotipo/marca Copernicus** tiene licencia aparte (registro requerido) |

**Evidencia:**

- <https://www.copernicus.eu/en/access-data>:
  > "The vast **majority of data/information delivered by Copernicus is made available and
  > accessible to any citizen**, and any organisation around the world **on a free, full, and open
  > basis**."
- <https://www.copernicus.eu/en/access-data/copyright-and-licences> Art. 3.1 (integridad de la
  marca): prohibido usar la marca de forma que "expresses or implies EU's affiliation,
  endorsement, certification, or approval".

**Veredictos:** mapas base / relieve `allowed-with-attribution`; imágenes de satélite
`allowed-with-attribution` (**sin usar el logo Copernicus como aval**); datos de nieve/estado
operativo: **no existen** en Copernicus → `blocked`.

### 2.9 OpenStreetMap — datos (ODbL)

| Campo | Valor |
|---|---|
| URL oficial | <https://www.openstreetmap.org/copyright> · <https://www.openstreetmap.org/copyright> · licencia: <https://opendatacommons.org/licenses/odbl/1-0/> |
| Documentación | Wiki OSM + directrices de atribución |
| Política de acceso | Datos vía PBF/Overpass; **servidores comunitarios con política propia** |
| Autenticación | No |
| Condiciones de redistribución | Permitida con **atribución + share-alike** sobre la base derivada |
| Uso comercial | Permitido |
| Datos disponibles | Geometrías de complejos de esquí, remontes (`aerialway`), pistas (`piste:type`), POIs, toponimia |
| Cobertura | Global; calidad variable por zona |
| Frecuencia | Continua (ediciones comunitarias) |
| Cuotas y costes | Gratuito. **Overpass/Nominatim tienen políticas de uso**, no se usan en runtime |
| Formato | PBF, JSON (Overpass), GeoJSON |
| Fiabilidad | Comunitaria; requiere validación → **no usarse como fuente de "verdad" de espesores/estado** |
| Caché/almacenamiento | Permitido; la base derivada queda bajo ODbL |
| Atribución requerida | **Sí**: "© OpenStreetMap contributors" + indicar ODbL |

**Evidencia:**

- <https://www.openstreetmap.org/copyright>:
  > "You are free to copy, distribute, transmit and adapt our data, **as long as you credit
  > OpenStreetMap and its contributors**. **If you alter or build upon our data, you may distribute
  > the result only under the same license.**"
- <https://osmfoundation.org/wiki/Licence/Community_Guidelines/Substantial_-_Guideline>:
  > "The OpenStreetMap community regards the following as being not Substantial […] **Less than 100
  > Features** […] **Note also that we regard repeated small extractions as one big extraction!**"
  → Nuestro extracto de estaciones/remontes/pistas de ES/AD/FR/PT **es sustancial** ⇒ ODbL completo.

**Veredictos:** maestro de estaciones `allowed-with-attribution` (**con obligación share-alike sobre
la base derivada**); mapas base vectoriales `allowed-with-attribution`; estado operativo, espesores,
previsión y aludes `blocked` (OSM no contiene esos datos).

**Implicación de producto (importante para backend):** mantener una **base OSM derivada separada**
(p. ej. tabla `osm_derived_*` con su propia exportación ODbL) de las tablas editoriales
(`station`, `snow_report`). Si se fusionan, la ODbL "contagia" la base derivada; separarlas permite
publicar solo el extracto OSM y mantener nuestra editorial bajo nuestro propio régimen.

### 2.10 OSM `tile.openstreetmap.org` — **no usar en producción comercial**

| Campo | Valor |
|---|---|
| URL oficial | <https://operations.osmfoundation.org/policies/tiles/> |
| Política de acceso | "Our tile servers are not [free]" — donativos, capacidad limitada |
| Restricciones | Prohibido el *bulk download*/"pre-seeding"/fabricación de archivos de teselas; **offline no permitido** |
| Comercial | "**Commercial services** […] should be especially aware that **access may be withdrawn at any point**: you may no longer be able to serve your paying customers" |
| Requisitos si se usara | User-Agent identificativo, Referer, caché ≥ 7 días, atribución visible, sin `no-cache` |

**Veredicto:** mapas base `blocked` para un producto que se monetice. Usar Protomaps autohospedado
o un proveedor comercial con clave.

### 2.11 Protomaps (PMTiles autohospedado) — **recomendado para el mapa**

| Campo | Valor |
|---|---|
| URL oficial | <https://protomaps.com/> · docs <https://docs.protomaps.com/> |
| Documentación | PMTiles spec + CLI de extracción + plugin MapLibre |
| Política de acceso | **Autohospedado** en almacenamiento estático propio (S3/R2) con `HTTP range requests` |
| Autenticación | Ninguna (tu propio bucket) |
| Condiciones de redistribución | Datos de OSM ⇒ **ODbL (atribución + share-alike)** sobre el extracto/derivados |
| Uso comercial | Permitido (es tu propia infraestructura) |
| Datos disponibles | Basemap vectorial mundial generado desde OSM |
| Cobertura | Global, extraíble por área |
| Frecuencia | Actualizable a demanda (regenerar el `.pmtiles` por temporada) |
| Cuotas y costes | **Coste = almacenamiento + egress del bucket propio.** Las tarifas de la *Hosted API* de Protomaps no se usan (solo si se recurre a ella; no se cotiza aquí) |
| Formato | PMTiles (protobuf vectorial) |
| Fiabilidad | Alta; al ser estático no depende de un tercero |
| Caché/almacenamiento | Sin límite (es nuestro archivo). Control de versiones por digest |
| Atribución requerida | "© OpenStreetMap contributors" + ODbL, visible en el mapa |

**Evidencia:** <https://protomaps.com/> —
> "Protomaps is a free, customizable map of the world, **deployable as a single static file on cloud
> storage**" […] "Protomaps maintains a basemap tileset built from OpenStreetMap and other open data
> sources."

(Nota: su *Hosted API* indica "Noncommercial use is free; for commercial use, become a GitHub
Sponsor". **No se usa la Hosted API en este diseño**; por eso no hay coste de terceros.)

**Veredicto:** mapas base `allowed-with-attribution` (ODbL).

### 2.12 MapTiler

| Campo | Valor |
|---|---|
| URL oficial | <https://www.maptiler.com/cloud/pricing/> |
| Política de acceso | API key por cuenta |
| Comercial (plan Free) | **No** |
| Comercial (plan Flex) | Sí — **$30/mes (USD)**, tráfico extra facturado |
| Atribución | Logo MapTiler en el mapa con el plan Free |

**Evidencia:** <https://www.maptiler.com/cloud/pricing/> —
> Plan **Free**, $0: "Suitable for testing, PoC, prototyping, personal, or **non-commercial use**"
> con "**MapTiler logo on the map**". Plan **Flex**, "$30/month (USD)", "Extra traffic billed monthly".

**Veredicto:** mapas base `restricted` — solo utilizable en producción contratando **Flex**.
Variable: `MAPTILER_API_KEY`.

### 2.13 Stadia Maps

| Campo | Valor |
|---|---|
| URL oficial | <https://stadiamaps.com/pricing/> |
| Plan Free | 200 000 créditos/mes, "**Commercial use not allowed**" |
| Plan Starter | **$20/mes**, "**Commercial use allowed**" |
| Caché | "Cacheable Static Maps": derecho a cachear mientras dure la suscripción de pago |

**Evidencia:** <https://stadiamaps.com/pricing/> — tabla de planes, literalmente: Free → "Commercial
use not allowed"; Starter ($20/month) → "Commercial use allowed".

**Veredicto:** mapas base `restricted` (requiere Starter). Variable: `STADIA_API_KEY`.

### 2.14 Mapbox y OpenTopoMap — `unverified`

No se pudo leer una cláusula de licencia de producción en esta ronda (los portales de precios
requieren sesión/JS y OpenTopoMap no declara condiciones de uso comercial en una página estática
legible). **No se inventan precios.** Se mantienen fuera del diseño.

| Proveedor | licenseStatus |
|---|---|
| Mapbox | `unverified` |
| OpenTopoMap | `unverified` |

**Acción A4** en §8: leer y citar sus términos antes de considerarlos.

### 2.15 Operadores de estación (Aramón, Baqueira, Grandvalira, FGC)

| Operador | URL | Observación técnica (2026-11-16) | Veredicto |
|---|---|---|---|
| Aramón (Cerler, Formigal-Panticosa, Javalambre, Valdelinares) | <https://www.aramon.com/formigal-panticosa/partes/parteNieve> | Página HTML **renderizada en servidor** con los valores (remontes, km, pistas). Webcams servidas por **feratel** (`wtvhspt.feratel.com/hotspot/35/15021/0.jpeg`). No se encontró API/feed documentado ni JSON público | `blocked` para ingestión automática; `restricted` solo como **fuente de consulta para entrada editorial** por una persona |
| Baqueira Beret | <https://www.baqueira.es/> | **HTTP 403 Forbidden** también en `/aviso-legal` ⇒ acceso automatizado bloqueado por el WAF. No se puede ni leer el ToS | `blocked` (sin excepción) |
| Grandvalira | <https://www.grandvalira.com/es/estacion/estado-pistas> | Drupal renderizado en servidor; publica "Última actualización", pistas 0/142, instalaciones 0/73, km 0/215, espesores 0-0, estado por sectores. Sin API pública | `blocked` para ingestión; `restricted` para consulta editorial |
| FGC Turisme (La Molina, Vall de Núria, etc.) | <https://www.fgc.cat/> | Páginas de aviso legal servidas con contenido truncado en `web_fetch`; **no se pudo citar la cláusula de reutilización** | `unverified` (maestro) / `blocked` (resto) |
| feratel (webcams) / roundshot.com | <https://www.roundshot.com/> | Sin licencia de reutilización publicada en página estática; `/terms-of-use` → 404. La atribución `©` **no** es licencia | `blocked` para webcams/imágenes |

**Justificación de `blocked`:** ninguno de estos operadores publica (a) una API documentada, (b) un
feed CMS con licencia, ni (c) una cláusula que autorice la reutilización de su parte de nieve. La
mera accesibilidad del HTML **no** es derecho de reutilización (regla 1 del §0). El veredicto no
depende de un "no se encontró": depende de que **no existe autorización**, y el aviso legal por
defecto del derecho español/francés reserva la explotación al titular.

**Fallback legal (§7):** entrada manual editorial por nuestro admin, con `sourceUrl` y `capturedAt`
registrados para trazabilidad y corrección.

---

## 3. Matriz tipo-de-dato × proveedor autorizado (producción)

| Tipo de dato | Fuente **autorizada** | Estado | Notas |
|---|---|---|---|
| **Maestro de estaciones** | IGN/CNIG + OSM + **editorial** | `allowed-with-attribution` | Separar base OSM (ODbL) de tablas editoriales |
| **Estado operativo** (pistas/remontes/km) | **Ninguna API** | `blocked` | **Solo admin editorial**. Contrato: `snow_report` con `source: "editorial"` |
| **Espesores de nieve** | **Ninguna API** (AEMET/MF han cedido sus redes de nieve a otros) | `blocked` | Solo admin editorial + observación AEMET como contexto separado |
| **Previsión meteorológica** | AEMET (ES) + Météo-France (FR) | `allowed-with-attribution` | Copernicus C3S como relleno PT/AD |
| **Avisos meteo** | AEMET METEOALERTA + Météo-France (portal API) | `allowed-with-attribution` | IPMA `blocked` |
| **Aludes** | AEMET BPA (PDF, ES) | `allowed-with-attribution` | Parser PDF requerido. Andorra `restricted`, FR `restricted` |
| **Mapas base** | **Protomaps (self-host) + IGN/CNIG + Copernicus\_CLMS** | `allowed-with-attribution` | ODbL / CC-BY 4.0 / Copernicus |
| **Webcams / imágenes** | **Ninguna** | `blocked` | **Solo enlace saliente** al operador (deep-link), nunca proxy ni caché |

---

## 4. Caché y retención que las licencias permiten

| Proveedor | TTL de caché | Retención de histórico | Base |
|---|---|---|---|
| AEMET (predicción) | 30 min en caliente; refresco ≥ 3 h (fuente pública, cuotas `unverified`) | **Sin límite**, pero **conservar `updated_at`** y no desnaturalizar | Nota legal cond. 1 y 3 |
| AEMET (BPA) | Revalidar cada 6 h; los PDF pesan ~179 KB | Guardar histórico con fecha del boletín | Nota legal cond. 3 ("fecha de la última actualización") |
| Météo-France (API) | 30–60 min | **Sin límite**; conservar fecha de actualización | Licence Ouverte 2.0 |
| Météo-France (BPA HTML) | **No cachear**; solo deep-link | **0** | droits-de-reproduction Art. 2 (red) |
| Meteo Andorra | **No cachear** hasta autorización escrita | **0** | Avís Legal sin cesión |
| IPMA | **No ingerir** | **0** | Uso no lucrativo |
| OSM (datos) | Extracto por temporada; actualización trimestral | Ilimitada **bajo ODbL** | ODbL §4.4 + Substantial Guideline |
| Protomaps (PMTiles) | Immutable por versión (digest); CDN `Cache-Control: public, max-age=31536000, immutable` | Ilimitada bajo ODbL | ODbL |
| IGN/CNIG, IGN FR, Copernicus | Immutable por versión | Ilimitada | CC-BY 4.0 / LO 2.0 / Copernicus |
| Operadores / infonieve / webcams | **Ninguno** | **0** | `blocked` |

**Regla transversal:** todo registro cacheado guarda `sourceUrl`, `fetchedAt`, `sourceUpdatedAt` y
`licenseId`, para poder cumplir la condición de "fecha de última actualización" y para responder a
una eventual retirada de acceso.

---

## 5. Atribución obligatoria (texto exacto a mostrar)

| Fuente | Texto / elemento |
|---|---|
| AEMET | `© AEMET` o "Información elaborada por la Agencia Estatal de Meteorología"; en valores derivados: "Información elaborada utilizando, entre otras, la obtenida de la Agencia Estatal de Meteorología" |
| Météo-France | "source : Météo-France" + fecha de última actualización |
| IGN/CNIG | "© Instituto Geográfico Nacional de España" (CC-BY 4.0) |
| IGN France | Fuente indicada en los metadatos del dataset + Licence Ouverte |
| Copernicus | "European Union, Copernicus <Service>" (sin explotar el logo como aval) |
| OpenStreetMap | "© OpenStreetMap contributors" + enlace a ODbL |
| Protomaps | "© OpenStreetMap contributors" (la base es OSM) |
| IPMA / infonieve / operadores | **No aplica: no se usan** |

---

## 6. Política de acceso que hay que implementar (no solo documentar)

1. **User-Agent identificativo propio** en todo *outbound*: `appski-snow/1.0 (+https://<dominio-visible>; contact: <email del proyecto>)`.
   Requisito explícito de la política OSM; buena práctica en AEMET/MF.
2. **Throttling defensivo** con presupuesto por proveedor (p. ej. ≤ 1 req/s y ≤ 60 req/min para
   AEMET/MF) aunque la cuota real sea `unverified`.
3. **Bajo una sola "identidad de aplicación"**, no una por usuario; nada de proxies genéricos tipo
   `nginx` que oculten la identidad (prohibido por OSM y penalizado por los operadores).
4. **No convertir la API en pasarela abierta** (evitar que un tercero use nuestro backend como proxy
   para AEMET).
5. **Revalidación con `If-None-Match`/`If-Modified-Since`** en datasets versionados (IGN, Copernicus).
6. **Respeto de `robots.txt`**, no necesario donde no accedemos, y **cero peticiones** a Baqueira,
   infonieve y operadores desde el servidor.

---

## 7. Fallback legal: entrada editorial vía admin (lo que sustituye al scraping)

Para los tipos `blocked` con dato deseable (estado operativo, espesores, estado por sector):

- El **admin de operaciones** (`snow/admin`) permite a un operador humano introducir el parte de
  nieve por estación y fecha.
- Cada parte registra **obligatoriamente**: `sourceUrl` de donde lo consultó, `capturedAt` (fecha/hora
  humana), autor, y `confidence`.
- El rendimiento público etiqueta el dato como **"Parte de estación (fuente: operador)"**, nunca
  como dato oficial ni como dato propio de terceros.
- Si en el futuro se contrata la API de infonieve u otra fuente licenciada, **solo cambia el
  adaptador** (ver `05b-provider-contracts.md`); el resto del sistema no se toca.

Esto es más trabajo operativo, pero es la única forma **legal** de tener partes reales de Aramón,
Grandvalira o Baqueira dentro del producto.

---

## 8. Acciones humanas pendientes (no bloquean la implementación)

| ID | Acción | Destinatario | Bloquea a |
|---|---|---|---|
| A1 | Solicitar **API key de AEMET OpenData** (formulario "Obtención de API Key") | AEMET | t7 (datos reales ES) |
| A2 | Solicitar **credenciales Météo-France** (compte + API key) | portail-api.meteofrance.fr | t7 (datos reales FR) |
| A3 | Enviar **formulario JSON / solicitud escrita de reutilización** a Meteo Andorra e **IPMA** (uso comercial) | meteo.ad, webmaster@ipma.pt | cobertura AD/PT |
| A4 | Leer y citar las licencias de **Mapbox** y **OpenTopoMap**; decidir si entran en el diseño | equipo | ninguna (alternativa ya elegida) |
| A5 | Pedir **presupuesto escrito** de la API de infonieve (tarifas) si se quiere dato de operador completo | info@infonieve.es | ninguna (fallback editorial listo) |
| A6 | Consultar el **aviso legal de FGC** (contenido truncado en la captura) | FGC | ninguna |

Las variables de entorno que consume el código son, exclusivamente:
`AEMET_API_KEY`, `METEOFRANCE_API_KEY`, `METEOANDORRA_ACCESS_IP` (marcador de configuración, no secreto),
`MAPTILER_API_KEY`, `STADIA_API_KEY`, `PROTOMAPS_BASE_URL`. Ninguna lleva valor en el repositorio.

---

## 9. Estado del registro

| Aspecto | Estado |
|---|---|
| Proveedores con veredicto explícito por tipo | 20 (incl. infonieve) |
| Proveedores utilizables en producción | 5 clases (AEMET meteo/aludes, Météo-France meteo, Protomaps, IGN ES/FR, Copernicus) |
| Proveedores `blocked` | infonieve, IPMA, tile.openstreetmap.org, Aramón, Baqueira, Grandvalira, feratel/roundshot |
| Proveedores `unverified` (excluidos hasta verificar) | Mapbox, OpenTopoMap, FGC |
| Secretos expuestos | **0** |
| Contratos de adaptador y matriz de fallback | ver `docs/snow/05b-provider-contracts.md` (tarea `t3`) |
