# FASE 5b — Contratos de proveedor y matriz de fallback

Complemento de [`05-provider-registry.md`](./05-provider-registry.md). Este documento es el
**contrato ejecutable** que consume `backend-impl` (t5/t7) y `frontend-impl` (t8).
Fecha: **2026-11-16**. Tarea: `t3`. Autor: `data-providers`.

Todo veredicto de licencia citado aquí proviene del registro (§2 del documento 05) con su cláusula.
Este documento **no** reabre la investigación legal: la traduce a tipos, constantes y cadenas.

**Validación del contrato (2026-11-16).** Los bloques TypeScript de §1–§6 se extrajeron, se
concatenaron en un módulo único y se comprobaron con
`tsc --noEmit --strict --target es2022 --module esnext --moduleResolution bundler --skipLibCheck`
usando el TypeScript del repo (5.9.2, el binario `node_modules/.bin/tsc`).

**Corrección de una afirmación previa errónea (verificada de forma independiente por el capitán).**
La validación se reportó como `exit 0` "importando `SnowQuality`", pero **el `import` no estaba en
ningún bloque**: el módulo concatenado tal cual falla con `TS2304: Cannot find name 'SnowQuality'`
en §2 (`SnowDepth.quality`). El `import` de `SnowQuality` desde el modelo real
`web-ssr/src/app/pages/weather/models/meteo.models.ts` ya está añadido en §2; con él, el módulo
concatenado compila con **exit 0** bajo `--strict`. Conclusión correcta: el contrato es compilable y
encaja con los tipos de dominio existentes, **pero no es autocontenido** — depende de ese `import`.
Los bloques de §1 (pseudocódigo de la cadena de fallback) y el stub de §6 se excluyen de la
comprobación por ser pseudocódigo deliberado.

**Reproducción exacta (re-verificada el 2026-11-16 sobre el fichero tal como está en disco).**
Se extraen los 12 bloques ` ```ts ` del documento y se descartan **tres** por ser artefactos
didácticos, no código del contrato:

- (a) el bucle `for` de §3.1 — pseudocódigo de la cadena de fallback;
- (b) el stub `export function requireEnv(...): ConfigStatus;` de §6 — declaración ilustrativa;
- (c) la aserción `assert(!(p.licenseStatus …))` de §1.1 — ejemplo de invariante para t9.

Los **10 bloques restantes** se concatenan en un módulo `contract.ts` con el `import` de
`SnowQuality` de §2 en la primera línea, y se compila con el binario del repo:

```
node node_modules/typescript/bin/tsc --noEmit --strict --target es2022 \
  --module esnext --moduleResolution bundler --skipLibCheck contract.ts
```

Resultado real sobre el fichero en disco: **exit 0**. Sin el `import`, el mismo módulo da
`TS2304: Cannot find name 'SnowQuality'` y **exit 2**. Reproducible por cualquiera con esas tres
exclusiones explícitas.

---

## 0. Decisiones que este contrato cierra

| # | Decisión | Consecuencia en código |
|---|---|---|
| D1 | `ProviderAdapter` es una interfaz TS sin dependencias nuevas | Solo `rxjs`/`fetch` nativos; nada de axios, zod ni librerías de scraping |
| D2 | La procedencia es **obligatoria** en toda carga útil | `Provenance` no es opcional en el genérico de `ProviderResult` |
| D3 | La ausencia de dato es un **valor de dominio**, no un sentinel | `NO_DATA` explícito; `number \| null` nunca `-1` / `-99` / `NaN` |
| D4 | Estado operativo y espesores **no tienen** proveedor automático | Cadena termina en adaptador editorial, nunca en `null` silencioso |
| D5 | Caché/retention son **constantes tipadas** derivadas de cada licencia | `CACHE_POLICY` en un único módulo |
| D6 | Cuotas no verificadas ⇒ valor conservador **marcado** `unverified` | `RateLimit.verified: false` y el consumidor debe poder verlo |
| D7 | ODbL obliga a **separar** la base derivada de la editorial | Prefijo `osm_derived_*`, regla verificable (§5) |
| D8 | Sin credencial ⇒ degradar a "Sin datos disponibles", nunca error | `status: 'not_configured'` |

---

## 1. Tipos base

Ubicación propuesta: `snow/providers/contracts.ts` (o la lib que decida t5). Sin `enum`
(TS `erasableSyntaxOnly`-friendly), sin decoradores, sin dependencias.

```ts
/** Estados de licencia. Fuente única de verdad: 05-provider-registry.md §0. */
export type LicenseStatus =
  | 'allowed'
  | 'allowed-with-attribution'
  | 'restricted'
  | 'blocked'
  | 'unverified';

/** Tipos de dato del dominio nieve. Uno por columna de la matriz §3. */
export type SnowDataType =
  | 'station-master'      // maestro de estaciones
  | 'operational-status'  // pistas/remontes/km abiertos
  | 'snow-depth'          // espesores medidos
  | 'forecast'            // previsión meteorológica
  | 'weather-alert'       // avisos meteorológicos
  | 'avalanche'           // boletín de peligro de aludes
  | 'basemap'             // teselas de mapa
  | 'image';              // webcams / imágenes

/** Calidad de la fuente para ESTE dato. Ordena la cadena de fallback. */
export type DataQuality =
  | 'official'    // organismo público (AEMET, Météo-France, IGN)
  | 'editorial'   // operador humano del admin, con sourceUrl+capturedAt
  | 'derived'     // calculado por nosotros a partir de fuentes autorizadas

/**
 * Resultado de una lectura. Discriminado por `status`: el consumidor NO puede
 * leer `data` sin estrechar en 'ok'.
 */
export type ProviderResult<T> =
  | { readonly status: 'ok'; readonly data: T; readonly provenance: Provenance }
  | { readonly status: 'no_data'; readonly provenance: Provenance; readonly reason: NoDataReason }
  | { readonly status: 'not_configured'; readonly provenance: Provenance; readonly missingEnv: readonly string[] }
  | { readonly status: 'blocked'; readonly provenance: Provenance; readonly reason: string }
  | { readonly status: 'rate_limited'; readonly provenance: Provenance; readonly retryAfterMs: number }
  | { readonly status: 'stale'; readonly data: T; readonly provenance: Provenance }
  | { readonly status: 'error'; readonly provenance: Provenance; readonly message: string; readonly retryable: boolean };

/**
 * Por qué no hay dato. Es un valor de dominio, se muestra al usuario como
 * "Sin datos disponibles" con el matiz indicado. NUNCA se convierte en 0.
 */
export type NoDataReason =
  | 'outside-season'        // fuera de temporada, fuente no publica
  | 'source-silent'         // la fuente existe pero no publica este registro
  | 'not-yet-published'     // se espera pero llega más tarde
  | 'not-covered'           // la fuente no cubre esta estación
  | 'license-prohibits';    // el tipo de dato está blocked por licencia
```

### 1.1 El tuple de procedencia (obligatorio, D2)

El encargo exige `source`, `observedAt`, `updatedAt`, `status`, `licenseStatus`, `freshness` **y**
`authorization`. Se materializan así:

```ts
export interface Provenance {
  /** Identificador estable del proveedor. Coincide con la clave de PROVIDERS. */
  readonly source: ProviderId;
  /** Cuándo observó la fuente el dato (o cuándo lo capturó el humano). */
  readonly observedAt: string;      // ISO 8601 UTC
  /** Fecha de "última actualización" declarada por la fuente. Obligatoria por
   *  AEMET (cond. 3) y Licence Ouverte 2.0. `null` SOLO si la fuente no la declara. */
  readonly updatedAt: string | null;
  /** Estado de salud de la lectura en el instante de servir. */
  readonly status: 'live' | 'cached' | 'stale' | 'degraded';
  /** Veredicto de licencia APLICADO A ESTE DATO (no al proveedor entero). */
  readonly licenseStatus: LicenseStatus;
  /** Antigüedad calculada en segundos respecto de `observedAt`. */
  readonly freshness: number;
  /** Veredicto del registro que autoriza esta lectura. */
  readonly authorization: Authorization;
  /** Atribución ya interpolada, lista para pintar. Obligatoria si
   *  licenseStatus === 'allowed-with-attribution'. */
  readonly attribution: string | null;
}

export interface Authorization {
  /** Referencia al registro: "05#aemet" etc. Trazabilidad documento↔código. */
  readonly registryRef: string;
  readonly licenseId: string;            // 'CC-BY-4.0', 'ODbL-1.0', 'etalab-2.0', ...
  /** true si permite uso comercial. */
  readonly commercialUse: boolean;
  /** true si el dato puede almacenarse más allá de la petición. */
  readonly storageAllowed: boolean;
  /** true si obliga a mostrar `attribution`. */
  readonly attributionRequired: boolean;
}
```

**Invariante comprobable (debe ir en un test, t9):**

```ts
// Ninguna lectura con atribución requerida puede servirse sin texto.
assert(!(p.licenseStatus === 'allowed-with-attribution' && !p.attribution));
```

---

## 2. La interfaz `ProviderAdapter`

```ts
export interface ProviderInput {
  /** Referencia canónica de estación (ver §4.1). */
  readonly stationRef: StationRef;
  /** Instante de la petición, inyectado para determinismo en tests. */
  readonly requestedAt: Date;
  /** Tipo de dato solicitado. Permite un adapter por concern. */
  readonly dataType: SnowDataType;
}

export interface ProviderAdapter<T> {
  /** Clave estable; también es el `source` de Provenance. */
  readonly id: ProviderId;
  /** Tipos de dato que este adapter puede servir. */
  readonly provides: readonly SnowDataType[];
  /** Veredicto por tipo, copiado del registro. BLOQUEA en runtime si no coincide. */
  readonly licenseByType: Readonly<Partial<Record<SnowDataType, LicenseStatus>>>;
  /** true si es el último eslabón (editorial) y no puede devolver 'not_configured'. */
  readonly isTerminal: boolean;

  /** ¿Puede este adapter atender esta combinación AHORA? Sin red. */
  canServe(input: ProviderInput): boolean;

  /** Lectura. Nunca lanza para errores de red/licencia: los modela como Result. */
  fetch(input: ProviderInput): Promise<ProviderResult<T>>;

  /** Atribución exigida, o null. */
  attribution(): string | null;
}

export type StationRef = {
  readonly slug: string;              // "baqueira-beret"
  readonly country: 'ES' | 'AD' | 'FR' | 'PT';
  /** Coordenadas para adapters meteorológicos (AEMET/MF piden municipio/zona). */
  readonly lat: number;
  readonly lng: number;
  /** Identificadores de la fuente cuando se conocen (municipio AEMET, zone MF). */
  readonly sourceIds?: Readonly<Partial<Record<ProviderId, string>>>;
};
```

### 2.1 Reglas de implementación (no negociables)

1. **`fetch` no lanza** por causas esperables (429, 404, licencia, servidor caído). Solo puede
   lanzar por *bug* propio. El consumidor nunca envuelve `fetch` en `try/catch` para decidir negocio.
2. **`licenseByType` se contrasta en runtime.** Si un adapter intenta servir un tipo marcado
   `blocked`, debe devolver `{ status: 'blocked' }` **sin tocar la red**. Esto convierte el registro
   legal en una guarda ejecutable, no en un comentario.
3. **`canServe` es puro y sin E/S** (apto para planificar la cadena en SSR).
4. **`requestedAt` se inyecta**, nunca `Date.now()` dentro del adapter: así el fallback y la caché
   son deterministas en tests.
5. **Sin `any`**. El genérico `T` va atado a `DataTypeMap` (§2.2) para que `providers.forecast()`
   devuelva `ProviderResult<ForecastBundle>` y no `unknown`.
6. **Ningún adapter loguea la URL con API key.** La key se inyecta por header/query en un helper
   que redacta al loguear (`redactUrl`).
7. **El adaptador editorial es `isTerminal: true`** y no puede devolver `not_configured`.

### 2.2 Mapa de tipos por dominio

```ts
export interface DataTypeMap {
  'station-master': StationMaster;
  'operational-status': OperationalStatus;
  'snow-depth': SnowDepthReport;
  forecast: ForecastBundle;
  'weather-alert': WeatherAlertBundle;
  avalanche: AvalancheBulletin;
  basemap: BasemapConfig;
  image: ImageGrant;          // deliberadamente sin datos: solo enlaces
}
```

Formas mínimas de las cargas (alineadas con `pages/weather/models/meteo.models.ts` existente,
sin sustituirlo):

```ts
export interface StationMaster {
  readonly slug: string;
  readonly name: string;
  readonly country: 'ES' | 'AD' | 'FR' | 'PT';
  readonly region: string;
  readonly lat: number;
  readonly lng: number;
  readonly altitudeBaseM: number | null;
  readonly altitudeTopM: number | null;
  readonly website: string | null;   // sitio del operador, para deep-link
}

export interface OperationalStatus {
  readonly liftsOpen: number | null;
  readonly liftsTotal: number | null;
  readonly pistesOpen: number | null;
  readonly pistesTotal: number | null;
  readonly kmOpen: number | null;
  readonly kmTotal: number | null;
  readonly isOpen: boolean | null;
  /** Desglose por dificultad cuando el operador lo publica. */
  readonly byLevel: Readonly<Record<'green' | 'blue' | 'red' | 'black', { open: number; total: number }>> | null;
}

export interface SnowDepthReport {
  /** Espesores por cota. `null` = no publicado; NO usar 0 como "sin dato". */
  readonly baseCm: number | null;
  readonly midCm: number | null;
  readonly topCm: number | null;
  readonly newSnow24hCm: number | null;
  readonly quality: SnowQuality | null;   // reutiliza el tipo existente
}
// PRERREQUISITO de compilación: este contrato NO es autocontenido en cuanto a
// SnowQuality, que ya existe en el repo. Debe importarse en la cabecera del
// módulo (ajustar la ruta relativa a la ubicación real de snow/providers/):
//
//   import type { SnowQuality } from '../../web-ssr/src/app/pages/weather/models/meteo.models';
//
// Sin esta línea, el módulo falla con TS2304 (ver §Validación en la cabecera).

export interface AvalancheBulletin {
  /** Escala europea 1..5; `null` si el boletín no asigna nivel. */
  readonly level: 1 | 2 | 3 | 4 | 5 | null;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly zones: readonly string[];
  /** Texto del boletín, ya en el idioma de la fuente. */
  readonly summary: string;
  /** Enlace al documento original (obligatorio para PDF). */
  readonly documentUrl: string;
}

export interface ForecastBundle {
  readonly points: readonly ForecastPoint[];
  readonly horizonHours: number;
}

export interface ForecastPoint {
  readonly validAt: string;
  readonly tempC: number | null;
  readonly windKmh: number | null;
  readonly precipMm: number | null;
  readonly snowLineM: number | null;
  readonly condition: string | null;
}

export interface WeatherAlertBundle {
  readonly alerts: readonly WeatherAlertItem[];
}
export interface WeatherAlertItem {
  readonly id: string;
  readonly level: 'yellow' | 'orange' | 'red' | 'green';
  readonly phenomenon: string;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly area: string;
}

export interface BasemapConfig {
  readonly styleUrlOrTemplate: string;
  readonly kind: 'vector-pmtiles' | 'raster-xyz' | 'wmts';
  /** Debe ser true salvo que el proveedor permita caché offline. */
  readonly requiresAttributionOnMap: boolean;
}

/** Webcams: NO hay datos, solo permiso de enlace saliente. */
export interface ImageGrant {
  readonly operatorName: string;
  readonly linkUrl: string;      // deep-link al operador
  readonly embedAllowed: false;  // false por contrato: nunca iframe/proxy
}
```

---

## 3. Matriz de fallback por tipo de dato

Leyenda: `[A]` automático, `[E]` editorial (humano), `[X]` prohibido/inexistente.
La cadena se recorre en orden; se detiene en el primer `ok` **o** en el primer `stale` con dato.

| Tipo de dato | 1.º | 2.º | 3.º | Fin de cadena | ¿Bloqueado a nivel proveedor? |
|---|---|---|---|---|---|
| `station-master` | `[A]` `editorial-stations` (curado por nosotros) | `[A]` `osm` (ODbL, `osm_derived_*`) | `[X]` infonieve/operadores | `no_data` + `not-covered` | No. Pero OSM solo aporta geometría/nombres |
| `operational-status` | `[E]` `editorial-report` | — | — | `no_data` + `outside-season` / `source-silent` | **SÍ**: ningún proveedor automático autorizado |
| `snow-depth` | `[E]` `editorial-report` | — | — | `no_data` + `outside-season` | **SÍ**: ídem |
| `forecast` | `[A]` `aemet` (ES) | `[A]` `meteofrance` (FR) | `[A]` `copernicus-c3s` (AD/PT) | `no_data` | No (según país) |
| `weather-alert` | `[A]` `aemet` (ES) | `[A]` `meteofrance` (FR) | — | `no_data` | IPMA `blocked` |
| `avalanche` | `[A]` `aemet-bpa` (ES, PDF) | `[E]` `editorial-report` (AD/FR) | — | `no_data` + `not-yet-published` | Météo-France BPA HTML `restricted`; Andorra `restricted` |
| `basemap` | `[A]` `protomaps` (autohospedado) | `[A]` `ign-es` / `ign-fr` (capas) | `[A]` `copernicus-clms` | `no_data` + `not-covered` | `tile.openstreetmap.org` **bloqueado**; MapTiler/Stadia Free **bloqueados** |
| `image` (webcams) | `[X]` nada | — | — | `blocked` + `license-prohibits` | **SÍ, siempre**. Solo `ImageGrant` con `linkUrl` |

### 3.1 Cadenas concretas

```ts
export const FALLBACK_CHAINS: Readonly<Record<SnowDataType, readonly ProviderId[]>> = {
  'station-master': ['editorial-stations', 'osm'],
  'operational-status': ['editorial-report'],
  'snow-depth': ['editorial-report'],
  forecast: ['aemet', 'meteofrance', 'copernicus-c3s'],
  'weather-alert': ['aemet', 'meteofrance'],
  avalanche: ['aemet-bpa', 'editorial-report'],
  basemap: ['protomaps', 'ign-es', 'ign-fr', 'copernicus-clms'],
  image: [], // vacío a propósito: no hay cadena legal
} as const;
```

**Regla de ejecución (pseudocódigo vinculante):**

```
for (id of FALLBACK_CHAINS[dataType]) {
  const r = await adapters[id].fetch(input);
  if (r.status === 'ok')    return r;
  if (r.status === 'stale') return r;          // sirve lo cacheado, marcado
  if (r.status === 'not_configured') continue; // sin credencial: siguiente
  if (r.status === 'blocked') continue;        // violación de licencia: no reintentar
  if (r.status === 'rate_limited') { breaker.open(id, r.retryAfterMs); continue; }
  if (r.status === 'error' && !r.retryable) continue;
}
// Agotada la cadena:
return { status: 'no_data', provenance: lastProvenance, reason: classifyNoData(dataType) };
```

Nunca se devuelve `null` ni `undefined` al consumidor: siempre un `ProviderResult`.

### 3.2 Datos `blocked` a nivel proveedor — obligación para la UI

El frontend debe poder etiquetar. Para cada tipo `blocked` a nivel proveedor
(`operational-status`, `snow-depth`, `image`) el resultado incluye:

- `provenance.licenseStatus`: el del espejo editorial (`allowed` propio) cuando viene de `[E]`,
  o `blocked` cuando no hay dato — **nunca** se rotula el dato editorial con la licencia del
  proveedor bloqueado.
- Texto de UI canónico (i18n) por `reason`:

| reason | Texto propuesto (es) |
|---|---|
| `outside-season` | "Temporada cerrada — sin parte publicado" |
| `source-silent` | "La estación no ha publicado parte hoy" |
| `not-yet-published` | "Pendiente de publicación por la fuente" |
| `not-covered` | "Sin cobertura de datos para esta estación" |
| `license-prohibits` | "No disponible por condiciones de uso de la fuente" |

**Regla anti-sentinel (D3), verificable en test:** ningún campo numérico del dominio puede valer
`-1`, `-99`, `NaN` o `Infinity`. La ausencia es `null` + `reason`. AEMET/IPMA usan `-99.0` como
"nódato": el adapter **debe mapear `-99.0` → `null`** explícitamente.

---

## 4. Constantes por proveedor

### 4.1 Identificadores

```ts
export type ProviderId =
  | 'aemet' | 'aemet-bpa'
  | 'meteofrance'
  | 'copernicus-c3s' | 'copernicus-clms'
  | 'ign-es' | 'ign-fr'
  | 'osm' | 'protomaps'
  | 'editorial-stations' | 'editorial-report'
  // Declarados pero SIEMPRE bloqueados (existen para que la guarda los rechace):
  | 'infonieve' | 'ipma' | 'meteoandorra' | 'maptiler' | 'stadia' | 'mapbox'
  | 'opentopomap' | 'aramon' | 'baqueira' | 'grandvalira' | 'fgc' | 'feratel'
  | 'osm-tiles' | 'meteofrance-bpa-html';
```

Los proveedores de la segunda lista **no tienen adapter funcional**; existen en el union para que
`PROVIDERS[id].licenseByType` devuelva `blocked` y la guarda del §2.1(2) corte cualquier intento.

### 4.2 Caché y retención (D5) — valores exactos

```ts
export const CACHE_POLICY = {
  aemet: {
    forecastTtlMs: 30 * 60_000,      // 30 min caliente
    maxRevalidateMs: 3 * 3_600_000,  // refresco al menos cada 3 h
    persistHistory: true,            // permitido, SIN límite
    mustStoreUpdatedAt: true,        // nota legal AEMET cond. 3
    attributionId: 'aemet',
  },
  'aemet-bpa': {
    ttlMs: 6 * 3_600_000,            // revalidar cada 6 h (boletín diario)
    persistHistory: true,            // con fecha del boletín
    mustStoreUpdatedAt: true,
    attributionId: 'aemet',
  },
  meteofrance: {
    ttlMs: 60 * 60_000,
    persistHistory: true,            // Licence Ouverte: sin límite
    mustStoreUpdatedAt: true,        // LO 2.0 exige fecha de última actualización
    noImpliedEndorsement: true,      // art.: no sugerir aval público
    attributionId: 'meteofrance',
  },
  'meteofrance-bpa-html': {
    ttlMs: 0,                        // NO CACHE. 0 cache, deep-link only
    persistHistory: false,
    deepLinkOnly: true,              // droits-de-reproduction Art. 2
  },
  meteoandorra: {
    ttlMs: 0,                        // 0 hasta autorización escrita
    persistHistory: false,
    blockedUntilWrittenAuth: true,
  },
  ipma: {
    ttlMs: 0,
    persistHistory: false,
    commercialUseProhibited: true,   // bloqueo TOTAL
  },
  osm: {
    // Datos, no teselas: extracto por temporada.
    extractTtlMs: 90 * 86_400_000,   // 90 días
    persistHistory: true,            // bajo ODbL
    shareAlike: true,
  },
  protomaps: {
    immutableByVersion: true,        // digest en el nombre
    cacheControl: 'public, max-age=31536000, immutable',
    shareAlike: true,                // base OSM
  },
  'ign-es':   { immutableByVersion: true, persistHistory: true },
  'ign-fr':   { immutableByVersion: true, persistHistory: true },
  'copernicus-clms': { immutableByVersion: true, persistHistory: true },
  'osm-tiles': { ttlMs: 0, allowed: false },   // bloqueado comercialmente
  'editorial-report': { persistHistory: true, mustStoreSourceUrl: true },
  'editorial-stations': { persistHistory: true },
} as const;
```

**Justificación por licencia (una línea cada una; cláusulas en 05 §4):**

- `aemet` / `aemet-bpa`: nota legal AEMET cond. 1 (no desnaturalizar) y cond. 3 (mencionar fecha de
  última actualización) ⇒ se guarda `updatedAt` y el histórico es libre.
- `meteofrance`: Licence Ouverte 2.0 exige "source" + "date de la dernière mise à jour" ⇒ histórico
  libre **con** `updatedAt`; prohibido sugerir aval público.
- `meteofrance-bpa-html`: `droits-de-reproduction` Art. 2 prohíbe "toute utilisation … dans un
  environnement informatique en réseau" ⇒ **TTL 0**, solo deep-link.
- `meteoandorra`: Avís Legal sin cesión de derechos ⇒ **TTL 0** hasta autorización escrita.
- `ipma`: "não decorram finalidades lucrativas" ⇒ **bloqueo total**, no se ingiere nada.
- `osm` / `protomaps`: ODbL exige atribución + share-alike ⇒ histórico permitido bajo ODbL (§5).
- `ign-es` (CC-BY 4.0), `ign-fr` (Licence Ouverte por dataset), `copernicus` (free/full/open) ⇒
  versionado inmutable por digest.

### 4.3 Rate-limit y circuit breaker (D6)

**Ninguna cuota está publicada en las páginas que se pudieron leer.** Por eso todas las cifras de
`requestsPerMinute` son **valores conservadores por defecto**, no hechos del proveedor.

```ts
export interface RateLimit {
  /** Peticiones por minuto que NOS imponemos. */
  readonly requestsPerMinute: number;
  /** Concurrencia máxima. */
  readonly maxConcurrent: number;
  /** ¿La cuota real está publicada y verificada? */
  readonly verified: boolean;
  /** Texto exacto a mostrar en admin/telemetría cuando verified=false. */
  readonly note?: string;
}

export const RATE_LIMITS: Readonly<Record<string, RateLimit>> = {
  aemet:              { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified: AEMET no publica tabla de cuotas; valor conservador propio' },
  'aemet-bpa':        { requestsPerMinute: 6,  maxConcurrent: 1, verified: false, note: 'unverified: boletín diario; PDF ~179 KB' },
  meteofrance:        { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified: portal SPA, cuota no legible' },
  'copernicus-c3s':   { requestsPerMinute: 20, maxConcurrent: 2, verified: false, note: 'unverified' },
  'copernicus-clms':  { requestsPerMinute: 20, maxConcurrent: 2, verified: false, note: 'unverified' },
  'ign-es':           { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified' },
  'ign-fr':           { requestsPerMinute: 30, maxConcurrent: 2, verified: false, note: 'unverified' },
  osm:                { requestsPerMinute: 10, maxConcurrent: 1, verified: false, note: 'unverified: Overpass/Nominatim tienen política propia; NO se usan en runtime' },
  protomaps:          { requestsPerMinute: 600, maxConcurrent: 8, verified: true,  note: 'autohospedado: el límite es el del bucket propio, no de un tercero' },
} as const;
```

Circuit breaker (por `ProviderId`, estado en memoria + persistible):

```ts
export interface BreakerConfig {
  readonly failureThreshold: number;   // fallos consecutivos para abrir
  readonly openMs: number;             // tiempo abierto por defecto
  readonly halfOpenProbes: number;     // peticiones de tanteo al medio-abrir
}

export const BREAKER: BreakerConfig = {
  failureThreshold: 5,
  openMs: 5 * 60_000,   // 5 min
  halfOpenProbes: 1,
};
```

Convenciones:

- **429 / `Retry-After`** ⇒ `status: 'rate_limited'` con `retryAfterMs` = header si existe, si no
  `openMs`. Cuenta como fallo.
- **5xx / timeout** ⇒ `error` con `retryable: true`. Cuenta como fallo.
- **4xx (salvo 429)** ⇒ `error` con `retryable: false`; **no** abre el breaker (es un fallo
  semántico, no de salud).
- **`blocked` / `not_configured`** ⇒ no cuentan como fallo del breaker.
- Timeout de socket: **8 s** por petición (no publicado por los proveedores; valor propio).
- User-Agent obligatorio, igual en todos los adapters:
  `appski-snow/1.0 (+<SITE_URL>; contact: <CONTACT_EMAIL>)` — exigido explícitamente por la
  política de OSM y buena práctica en AEMET/Météo-France.

---

## 5. Regla de separación ODbL (D7)

**El riesgo concreto:** si las filas derivadas de OSM conviven en las mismas tablas que el catálogo
editorial, la "base derivada" resultante queda sujeta a ODbL y habría que publicarla entera.

**Regla de modelo de datos (vinculante):**

```
osm_derived_station(_id, osm_type, osm_id, name, lat, lng, tags_json, snapshot_id, extracted_at)
osm_derived_piste  (_id, osm_type, osm_id, station_osm_id, piste_type, difficulty, geometry, snapshot_id)
osm_derived_lift   (_id, osm_type, osm_id, station_osm_id, aerialway, geometry, snapshot_id)

station      (_id, slug, name, country, region, lat, lng, alt_base_m, alt_top_m, website, ...)   <- editorial
snow_report  (_id, station_id, observed_at, source_url, captured_at, author, confidence, ...)     <- editorial
```

Reglas verificables:

1. **Ninguna FK de `station` apunta a `osm_derived_*`.** El vínculo, si hace falta, se guarda como
   `osm_ref` **opaco** (`'node/12345'`) en una tabla puente `station_osm_link` que **no** contiene
   geometría ni atributos derivados.
2. `osm_derived_*` **solo** contiene campos derivados de OSM. Cero campos editoriales.
3. El extracto publicable se genera **solo** desde `osm_derived_*`, con atribución
   "© OpenStreetMap contributors" + enlace ODbL.
4. Un test de t9 debe fallar si aparece una columna editorial en `osm_derived_*` o un campo OSM en
   `station`/`snow_report` salvo `osm_ref`.

Esto satisface la directriz OSMF de extracto sustancial (05 §2.9) sin "contagiar" nuestro catálogo.

---

## 6. Superficie de configuración (D8)

Solo **nombres** de variables. Ningún valor en el repositorio.

| Variable | Proveedor que desbloquea | Efecto si falta |
|---|---|---|
| `AEMET_API_KEY` | `aemet`, `aemet-bpa` (ES) | `not_configured` ⇒ previsión/aludes ES sin datos |
| `METEOFRANCE_API_KEY` | `meteofrance` (FR) | `not_configured` ⇒ previsión FR sin datos |
| `PROTOMAPS_BASE_URL` | `protomaps` (mapa) | `not_configured` ⇒ **mapa deshabilitado con aviso**, no error |
| `MAPTILER_API_KEY` | `maptiler` (**bloqueado** hasta contrato Flex) | Sin efecto: el proveedor está bloqueado por licencia |
| `STADIA_API_KEY` | `stadia` (**bloqueado** hasta contrato Starter) | Sin efecto: ídem |
| `METEOANDORRA_ACCESS_IP` | `meteoandorra` (`restricted`) | `blocked` hasta autorización escrita (no es secreto: es un marcador de configuración) |
| `SITE_URL` | User-Agent + atribuciones | Sin UA válido ⇒ los adapters de OSM no se usan |
| `CONTACT_EMAIL` | User-Agent | Degrada el UA; se registra advertencia |

```ts
export interface ConfigStatus {
  readonly id: ProviderId;
  readonly configured: boolean;
  readonly missingEnv: readonly string[];
}

/** Ningún adapter lanza por falta de config: devuelve not_configured. */
export function requireEnv(id: ProviderId, names: readonly string[]): ConfigStatus;
```

**Contrato de degradación:** falta de credencial ⇒ `ProviderResult.status = 'not_configured'` ⇒ la
cadena de fallback continúa ⇒ si se agota, `no_data` ⇒ UI "Sin datos disponibles". **Nunca** un
`500` ni una página de error. `MAPTILER_API_KEY`/`STADIA_API_KEY` presentes **no** habilitan el
proveedor: la guarda de licencia manda.

---

## 7. Notas de integración por adapter

### 7.1 AEMET
- Previsión municipal: requiere **municipio** de AEMET; el `StationRef.sourceIds.aemet` debe estar
  curado. Sin él ⇒ `no_data` + `not-covered` (no inventar municipio por geocoding aproximado).
- Respuesta típica de AEMET son dos pasos (`datos` → URL de datos). El adapter hace las dos
  peticiones y **respeta `REQUEST_TIMEOUT_MS`** en cada una.
- BPA es **PDF**: no hay dependencia de PDF en el repo (verificado en `package.json`). Opciones para
  t7: (a) usar la página HTML de índice para extraer `documentUrl` y servir el **enlace** +
  metadatos, sin parsear el PDF; (b) añadir un parser. **Recomendación para t7: (a) primero**, porque
  05 ya documenta que el canal es PDF y el valioso es el nivel 1–5, que también aparece en el índice.
  No añadir dependencias sin aprobación del capitán.

### 7.2 Météo-France
- Un endpoint por tipo; el portal es SPA, así que la ruta exacta por API se confirma con la cuenta
  de A2, no por scraping del portal.
- BPA de `meteofrance.com`: **solo deep-link**, `ttlMs: 0`. Prohibido cachear el HTML.

### 7.3 Editorial (`editorial-report`, `editorial-stations`)
- `isTerminal: true`.
- Validación de entrada obligatoria: `sourceUrl` (URL http/https válida), `capturedAt` (ISO),
  `author` (no vacío), `confidence` ∈ [0,1]. Si falla ⇒ rechazo en el borde del admin, **no** se
  escribe registro.
- El registro público debe mostrar "Parte de estación (fuente: operador)" y enlazar `sourceUrl`.
- Nunca se copia texto verbatim del operador: se transcriben **valores** (números/booleanos).

### 7.4 `image` / webcams
- `FALLBACK_CHAINS.image = []`. Cualquier petición devuelve
  `{ status: 'blocked', reason: 'license-prohibits' }`.
- La UI solo puede mostrar `ImageGrant.linkUrl` como enlace saliente (`target=_blank rel=noopener`).
- **Prohibido** por contrato: `img src=`, iframe, proxy, caché, thumbnail propio.

### 7.5 Basemaps
- Preferente `protomaps` PMTiles autohospedado; `PROTOMAPS_BASE_URL` debe apuntar a nuestro bucket.
- Atribución en el mapa "© OpenStreetMap contributors" + ODbL (obligatoria en todos los planes).
- Si `PROTOMAPS_BASE_URL` falta ⇒ mapa deshabilitado con aviso, resto de la página operativo.

---

## 8. Checklist de aceptación para t7 (backend-impl)

- [ ] `ProviderResult` discriminado implementado; imposible leer `data` sin `status === 'ok'`.
- [ ] `Provenance` con los 8 campos (incl. `authorization` y `attribution`).
- [ ] Test: ningún `licenseStatus: 'allowed-with-attribution'` sale sin `attribution`.
- [ ] Test: adapter bloqueado devuelve `blocked` **sin** hacer fetch (espía sin llamadas).
- [ ] Test: ausencia de dato ⇒ `null`/`no_data`; ningún `-1`/`-99`/`NaN` en el dominio.
- [ ] Test: `-99.0` de IPMA/AEMET se mapea a `null`.
- [ ] `CACHE_POLICY` aplicada; `meteofrance-bpa-html` y `meteoandorra` con TTL 0.
- [ ] Rate limit + breaker con `verified:false` visible en admin.
- [ ] Sin credencial ⇒ `not_configured` → `no_data` → "Sin datos disponibles" (sin 500).
- [ ] `osm_derived_*` separado; sin FK de `station` a ellos.
- [ ] Webcams: solo `linkUrl`; cero `img`/proxy/caché.
- [ ] User-Agent identificativo en todas las peticiones salientes.

---

## 9. Estado de bloqueo que condiciona t7

| Elemento | Estado | Consecuencia |
|---|---|---|
| Previsión/aludes ES | `allowed-with-attribution` **pero** sin `AEMET_API_KEY` | Datos reales ES requieren acción **A1** |
| Previsión FR | `allowed-with-attribution` **pero** sin `METEOFRANCE_API_KEY` | Datos reales FR requieren **A2** |
| Estado operativo / espesores | **`blocked` en todo proveedor** | Solo editorial; nunca dato "automático" |
| Webcams / imágenes | **`blocked`** | Solo enlace saliente |
| IPMA (PT) | `blocked` (no comercial) | PT solo vía C3S + editorial |
| Andorra previsión/aludes | `restricted` | Requiere autorización escrita (**A3**) |
| Météo-France BPA HTML | `restricted` | TTL 0, deep-link |
| Cuotas de todos los proveedores | `unverified` | Valores conservadores propios, marcados |
| MapTiler / Stadia | `restricted` (planes de pago) | Mapas: Protomaps primero |
| Baqueira Beret | `blocked` (403) | Nada, ni editorial desde su web: puede consultarse offline por una persona |
| infonieve | `blocked` | Solo si se contrata su API (**A5**) |
| Mapa base | `allowed-with-attribution` | Bloqueado solo si falta `PROTOMAPS_BASE_URL` |

**Ninguno de estos bloqueos impide que t7 implemente el contrato**: el código se escribe contra los
tipos del §1–§6 y arranca en `not_configured`/`blocked`; al llegar A1/A2 el sistema pasa a mostrar
datos reales sin cambios de código.
