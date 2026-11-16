# Almacén JSON v2 del módulo de nieve (SNOW-02)

Persistencia de runtime del backend SNOW-02: un fichero JSON por colección, con
**escritura atómica** y **migración versionada** desde el formato histórico (v1).
Nada de aquí se sirve estático (nunca bajo `assets/`): es un directorio de SERVIDOR.

Directorio: `SNOW_DATA_DIR` o, por defecto, `data/snow`.

## 1. Formato en disco

```json
{
  "schemaVersion": 2,
  "store": "snow",
  "collection": "stations",
  "updatedAt": "2026-11-16T18:20:37.449Z",
  "seq": 1,
  "records": [{ "id": "1", "record": { "slug": "baqueira-beret", "...": "..." } }]
}
```

| Campo | Significado |
|---|---|
| `schemaVersion` | Versión del formato. `1` = histórico, `2` = actual. **No** se sustituye por `seq`. |
| `seq` | Último id INTERNO entregado. Nunca retrocede; no reutiliza números. |
| `records[].id` | Id interno estable (`"1"`, `"2"`, …) o id heredado opaco (UUID de un parte). |
| `records[].record` | La entidad de dominio **tal cual**: el almacén no la reinterpreta. |

El v1 histórico es `{ schemaVersion: 1, updatedAt, records: [entidad, …] }`, sin ids.

## 2. Migración v1 → v2

- **Sin pérdida y sin invención**: la entidad v1 viaja íntegra dentro de `record`;
  el número de registros de salida es exactamente el de entrada (`migrateStoreDir`
  lo comprueba y no escribe nada si no coincide).
- **Ids internos estables**: un `id` ya presente se conserva; el resto recibe
  `1..n` en orden. Una migración posterior no renumera.
- **`null` sigue siendo `null`**: la regla `null ≠ 0` se respeta en la conversión
  y en todos los mapeos (`requireNullable*` devuelven `null` o lanzan).
- **No destructiva**: la migración escribe `<coleccion>.v2.json` de forma atómica
  y deja el fichero v1 intacto como backup congelado.
- **Explícita**: leer no migra. `migrateStoreDir(dir)` es la única escritura de
  migración; una lectura normaliza en memoria.
- **Fichero corrupto ⇒ error**: un `records` que no es array, o una entidad sin
  campo obligatorio, lanza en vez de degradar a "sin datos".

## 3. Qué fichero manda

`CollectionSpec.files` = `[<coleccion>.v2.json, <coleccion>.json]`: primero el v2.

- Colección **sin migrar** → se lee y escribe el nombre histórico (`stations.json`),
  normalizando el documento a v2 *en ese mismo fichero* (compatibilidad con los
  consumidores y pruebas existentes).
- Colección **migrada** → se lee y escribe `*.v2.json`; el v1 es sólo backup.
- Colección **nueva** → nace directamente en `*.v2.json` (no se fabrica un v1).

## 4. Colecciones

| Colección | Fichero | Clave lógica | Repositorio |
|---|---|---|---|
| estaciones | `stations` | `slug` | `JsonStationRepository` |
| partes / informes editoriales | `snow-reports` | `id` (UUID del parte) | `JsonSnowReportRepository` |
| extracto OSM (ODbL) | `osm-derived` | `osmType`+`osmId` | — (sólo bootstrap) |
| pronósticos (caché) | `forecast-cache` | `stationSlug`+`source` | `JsonForecastCacheRepository` |
| observaciones | `observations` | `stationSlug`+`source`+`observedAt` | `JsonObservationRepository` |
| alertas | `alerts` | `id` de proveedor | `JsonAlertRepository` |
| webcams autorizadas | `webcams` | `stationSlug`+`linkUrl` | `JsonWebcamRepository` |
| proveedores | `providers` | `providerId` | `JsonProviderRepository` |
| procedencia/historial | `provenance` | `stationSlug`+`dataType`+`source` | `JsonProvenanceRepository` |

Las regiones y la ubicación no tienen tabla propia: viven en `stations` (`region`,
`lat`, `lng`) tal como fija el contrato §3.1. Pistas/remontes viven dentro del
parte (`operational`). Favoritos/preferencias **no** se persisten (R4: cliente).

## 5. Uso

```ts
import { createJsonStore, migrateStoreDir } from './store.ts';

migrateStoreDir(dataDir);          // opcional, explícito y no destructivo
const store = createJsonStore(dataDir);

await store.stations.findBySlug('baqueira-beret');   // Station | null
await store.stations.findIdBySlug('baqueira-beret'); // '1' | null
await store.stations.search({ q: 'pirineo', sort: 'name', page: 1, pageSize: 20 });
await store.reports.latestPublishedForStation('baqueira-beret', new Date());
await store.alerts.listActive('baqueira-beret', new Date());
```

Los repositorios implementan las interfaces de `../repository.ts` (v1, sin
cambios: `StationRepository`, `SnowReportRepository`, `ForecastCacheRepository`) y
las ADITIVAS de `../repository-v2.ts`. Así el borde v1 (`snow.service.ts`) sigue
funcionando sin tocar y el borde v2 (t4) tiene filtros, ids y caducidad.

## 6. Decisiones documentadas

- **`discipline` ausente ⇒ `'alpine'`** (sólo al migrar un v1 antiguo): es el
  valor base del enum del contrato `'alpine' | 'nordic'`, no se infiere de la
  altitud ni del nombre, está escrito en el JSDoc de `shapeStation` y lo cubre el
  test `V2g`. Un valor presente siempre se respeta. Un campo OBLIGATORIO ausente
  (slug/name/country/region/lat/lng) lanza: ahí no hay default legítimo.
- **`embedAllowed` es siempre `false`**: una webcam con imagen embebida está
  prohibida por licencia; una entrada con `true` en disco es error de datos.
- **Riesgo declarado**: el almacén no es transaccional multi-proceso. Un proceso
  Express + escritura atómica por fichero (tmp + fsync + rename).
