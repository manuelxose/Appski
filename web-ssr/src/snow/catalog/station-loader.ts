/**
 * SNOW-03 · Fase B→producto — Proyección del catálogo maestro al almacén de estaciones.
 *
 * El catálogo (`catalog/station-catalog.json`, t2) es un artefacto de DATOS con su
 * procedencia. El almacén (`store/json-store`, colección `stations`) es lo que el borde
 * sirve en `/v1/stations`. Este módulo es el puente, y es el único punto de escritura:
 * `applyCatalogToStore()`.
 *
 * Reglas que este loader hace cumplir (todas con test):
 *
 * 1. EDITORIAL MANDA. Las estaciones del seed editorial son dato curado: si un slug
 *    existe con `origin: 'editorial'` (o sin `origin`, que es como las escribe el seed y
 *    el endpoint admin), el catálogo NO la toca. Tampoco se pisan coordenadas,
 *    temporada ni webs. Se conserva además su id interno.
 *
 * 2. IDEMPOTENCIA. La clave lógica es `slug`. Un registro del catálogo se actualiza
 *    en su sitio (mismo id interno, `seq` no retrocede) si y solo si su contenido
 *    cambió; si no cambió no se escribe nada. Dos arranques ⇒ mismo conteo y mismo
 *    fichero (se puede comprobar con el hash).
 *
 * 3. PROCEDENCIA VISIBLE. Lo que viene del catálogo se marca con `origin: 'catalog'` y
 *    `catalogRef` (id estable del catálogo, ref canónica y sha256 de la fuente), y su
 *    atribución queda en la colección `provenance` con `licenseStatus`
 *    `allowed-with-attribution` para ODbL (OSM exige atribución) y `allowed` para CC0
 *    (Wikidata). No se inventa `seasonOpen`/`seasonClose` ni `seasonConfirmed`.
 *
 * 4. ELEVACIÓN: el catálogo publica COMO MÁXIMO un valor fiable (`elevation.elevationM`)
 *    y nunca una cota base y una superior verificadas. Por eso `altitudeBaseM` y
 *    `altitudeTopM` quedan AMBOS en `null` para las estaciones del catálogo: duplicar el
 *    único valor en los dos campos sería inventar una cota superior, y ponerlo sólo en
 *    `base` afirmaría una cota de valle que la fuente no dice. La cota publicada se
 *    conserva ÍNTEGRA en `catalogRef.elevationM` con su `method` y su `sourceRef`.
 *
 * 5. `region`: el contrato del almacén exige `string` (no admite null). Si el catálogo
 *    no aporta región verificable NO se rellena con el país ni con una cordillera
 *    supuesta: se usa el literal honesto `SIN_REGION` y el detalle real (null) queda en
 *    `catalogRef.region` = null. Así el filtro `region=` no fabrica agrupaciones falsas.
 *
 * 6. `discipline`: el catálogo no lo declara. El valor por defecto del contrato es
 *    `'alpine'` (mismo criterio que la migración v1→v2). Se deja documentado en
 *    `catalogRef.discipline = 'contract-default'`, no se inventa por altitud.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ProviderId } from '../contracts/provider-contracts';
import { JsonProvenanceRepository } from '../store/json-store/json-provenance-repository';
import { JsonStationRepository } from '../store/json-store/json-station-repository';
import { TypedCollection } from '../store/json-store/typed-collection';
import { COLLECTIONS, readCollection, writeCollectionAtomic } from '../store/json-store/file-io';
import type { ProvinceOrigin } from '../store/station-origin';

/** Literal honesto para `region` cuando el catálogo no aporta una región verificable. */
export const SIN_REGION = 'SIN_REGION';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Ruta del catálogo versionado (dato de Fase B). */
export function defaultCatalogPath(): string {
  return resolve(HERE, '..', 'catalog', 'station-catalog.json');
}

/** Etiquetas de licencia tal como las publica el catálogo (`ODbL-1.0`, `CC0-1.0`). */
type CatalogLicenseId = 'ODbL-1.0' | 'CC0-1.0';

interface CatalogSource {
  readonly dataset?: string;
  readonly endpoint?: string | null;
  readonly url?: string | null;
  readonly sha256?: string | null;
  readonly status?: number;
  readonly capturedAt?: string | null;
  readonly license?: { readonly id?: string; readonly attribution?: string | null };
  readonly refs?: readonly string[];
}

interface CatalogRecord {
  readonly id?: string;
  readonly slug?: string;
  readonly name?: string;
  readonly country?: string;
  readonly region?: string | null;
  readonly lat?: number;
  readonly lng?: number;
  readonly coordinateSource?: string;
  readonly website?: string | null;
  readonly elevation?: {
    readonly elevationM?: number | null;
    readonly method?: string | null;
    readonly sourceRef?: string | null;
  };
  readonly sources?: readonly CatalogSource[];
  readonly licenses?: readonly string[];
  readonly attribution?: readonly string[];
}

export interface CatalogFile {
  readonly schemaVersion?: number;
  readonly generatedAt?: string;
  readonly records?: readonly CatalogRecord[];
}

export interface CatalogLoadResult {
  /** Registros legibles del catálogo (con slug/coordenadas válidas). */
  readonly records: number;
  /** Registros descartados por forma inválida (no se inventan). */
  readonly malformed: number;
  readonly generatedAt: string | null;
}

export interface ApplyCatalogOptions {
  /** Ruta explícita al catálogo; por defecto el versionado. */
  readonly catalogPath?: string;
  /** Si es `false`, no se escribe nada en `provenance` (tests de sólo estaciones). */
  readonly writeProvenance?: boolean;
}

export interface ApplyCatalogResult {
  readonly catalogRecords: number;
  readonly malformed: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  /** Slugs cuya fila editorial manda y el catálogo NO tocó. */
  readonly editorialPreserved: number;
  readonly provenanceWritten: number;
  /** `true` cuando esta pasada no escribió ninguna estación (2º arranque idéntico). */
  readonly noop: boolean;
}

const COUNTRIES = ['ES', 'AD', 'FR', 'PT'] as const;
type CountryCode = (typeof COUNTRIES)[number];

function isCountry(v: unknown): v is CountryCode {
  return typeof v === 'string' && (COUNTRIES as readonly string[]).includes(v);
}

/**
 * Licencia del registro → `ProviderId` + `licenseStatus` + atribución.
 *
 * Acepta DOS formas, y esto es deliberado: el registro CRUDO del catálogo
 * (`sources[].license.id`, `licenses[]`) y la fila YA PROYECTADA
 * (`catalogRef.licenseIds` / `catalogRef.sources[].licenseId`). El loader trabaja con
 * filas proyectadas, así que sin la segunda forma la atribución ODbL se perdía
 * silenciosamente y todo salía `allowed` (defecto real detectado en t7: 287 registros
 * ODbL quedaban sin declarar atribución).
 */
export function catalogLicensing(rec: CatalogRecord | Record<string, unknown>): {
  source: ProviderId;
  licenseStatus: 'allowed' | 'allowed-with-attribution';
  attribution: string | null;
  licenseIds: readonly CatalogLicenseId[];
} {
  const asRecord = rec as CatalogRecord;
  const ref = (rec as Record<string, unknown>)['catalogRef'] as
    | { licenseIds?: unknown; sources?: Array<{ licenseId?: unknown }> }
    | undefined;
  const ids = new Set<string>();
  // Forma cruda (registro del catálogo).
  for (const s of asRecord.sources ?? []) {
    const id = s.license?.id;
    if (id === 'ODbL-1.0' || id === 'CC0-1.0') ids.add(id);
  }
  for (const l of asRecord.licenses ?? []) {
    const head = l.split(':')[0];
    if (head === 'ODbL-1.0' || head === 'CC0-1.0') ids.add(head);
  }
  // Forma proyectada (fila del almacén).
  if (Array.isArray(ref?.licenseIds)) {
    for (const id of ref.licenseIds) {
      if (id === 'ODbL-1.0' || id === 'CC0-1.0') ids.add(id);
    }
  }
  for (const s of ref?.sources ?? []) {
    const id = s.licenseId;
    if (id === 'ODbL-1.0' || id === 'CC0-1.0') ids.add(id);
  }
  const licenseIds = [...ids].sort() as CatalogLicenseId[];

  const attributions = new Set<string>();
  for (const a of asRecord.attribution ?? []) {
    if (typeof a === 'string' && a.trim().length > 0) attributions.add(a.trim());
  }
  // La atribución concreta también vive en cada fuente citada.
  for (const s of asRecord.sources ?? []) {
    const a = s.license?.attribution;
    if (typeof a === 'string' && a.trim().length > 0) attributions.add(a.trim());
  }
  const attributionList = [...attributions].sort();

  if (licenseIds.includes('ODbL-1.0')) {
    return {
      // OSM es la fuente del catálogo con obligación de atribución (ODbL).
      source: 'osm' as ProviderId,
      licenseStatus: 'allowed-with-attribution',
      attribution: attributionList.length > 0 ? attributionList.join(' · ') : '© OpenStreetMap contributors',
      licenseIds,
    };
  }
  return {
    source: 'osm' as ProviderId,
    licenseStatus: 'allowed',
    attribution: attributionList.length > 0 ? attributionList.join(' · ') : null,
    licenseIds,
  };
}

/** Ref canónica del catálogo que acompaña a cada fila proyectada. */
function catalogRefOf(rec: CatalogRecord, lic: ReturnType<typeof catalogLicensing>): Record<string, unknown> {
  const sources = (rec.sources ?? []).map((s) => ({
    dataset: s.dataset ?? null,
    url: s.url ?? null,
    sha256: s.sha256 ?? null,
    status: s.status ?? null,
    capturedAt: s.capturedAt ?? null,
    licenseId: s.license?.id ?? null,
  }));
  return {
    catalogId: rec.id ?? null,
    coordinateSource: rec.coordinateSource ?? null,
    // La cota publicada por el catálogo, con su método y su fuente. NUNCA se duplica
    // en altitudeBaseM/altitudeTopM (ver cabecera, regla 4).
    elevationM: rec.elevation?.elevationM ?? null,
    elevationMethod: rec.elevation?.method ?? null,
    elevationSourceRef: rec.elevation?.sourceRef ?? null,
    region: rec.region ?? null,
    discipline: 'contract-default',
    licenseIds: lic.licenseIds,
    sources,
  };
}

/**
 * Proyecta un registro del catálogo a la fila que guarda el almacén. Devuelve `null` si
 * el registro no se puede proyectar sin inventar (slug/nombre/país/coordenadas).
 */
export function projectCatalogRecord(rec: CatalogRecord): Record<string, unknown> | null {
  const slug = typeof rec.slug === 'string' ? rec.slug.trim() : '';
  const name = typeof rec.name === 'string' ? rec.name.trim() : '';
  const country = rec.country;
  const lat = rec.lat;
  const lng = rec.lng;
  if (!slug || !name || !isCountry(country)) return null;
  if (typeof lat !== 'number' || !Number.isFinite(lat)) return null;
  if (typeof lng !== 'number' || !Number.isFinite(lng)) return null;
  const lic = catalogLicensing(rec);
  return {
    slug,
    name,
    country,
    region: typeof rec.region === 'string' && rec.region.trim().length > 0 ? rec.region.trim() : SIN_REGION,
    discipline: 'alpine',
    lat,
    lng,
    // Nunca se inventa una cota base ni superior (regla 4).
    altitudeBaseM: null,
    altitudeTopM: null,
    website: typeof rec.website === 'string' && rec.website.length > 0 ? rec.website : null,
    // Sin temporada: el catálogo no la publica y no se deriva de la latitud.
    seasonOpen: null,
    seasonClose: null,
    seasonConfirmed: false,
    origin: 'catalog' satisfies ProvinceOrigin,
    catalogRef: catalogRefOf(rec, lic),
  };
}

/** ¿La fila existente es editorial (dato curado que manda sobre el catálogo)? */
export function isEditorialRow(row: Record<string, unknown>): boolean {
  const origin = row['origin'];
  // Ausencia de `origin` = fila del seed editorial / endpoint admin (compatibilidad v1).
  return origin === undefined || origin === null || origin === 'editorial';
}

/** Cuenta y valida los registros del catálogo sin tocar el almacén. */
export function readCatalog(catalogPath: string = defaultCatalogPath()): CatalogLoadResult & {
  readonly file: CatalogFile | null;
  readonly projected: readonly Record<string, unknown>[];
} {
  if (!existsSync(catalogPath)) {
    return { records: 0, malformed: 0, generatedAt: null, file: null, projected: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(catalogPath, 'utf8'));
  } catch {
    // Un catálogo corrupto no degrada a "sin estaciones": se propaga como 0 válidos y
    // `file: null`, que el llamante decide cómo tratar (nunca inventando filas).
    return { records: 0, malformed: 1, generatedAt: null, file: null, projected: [] };
  }
  const file = (parsed ?? {}) as CatalogFile;
  const raw = Array.isArray(file.records) ? file.records : [];
  const projected: Record<string, unknown>[] = [];
  let malformed = 0;
  const seen = new Set<string>();
  for (const rec of raw) {
    const row = projectCatalogRecord(rec);
    if (row === null) {
      malformed += 1;
      continue;
    }
    const slug = String(row['slug']);
    // El catálogo garantiza slugs únicos por id; si apareciera un duplicado, no se
    // duplica la estación: gana el primero y el resto cuenta como malformado.
    if (seen.has(slug)) {
      malformed += 1;
      continue;
    }
    seen.add(slug);
    projected.push(row);
  }
  return { records: projected.length, malformed, generatedAt: file.generatedAt ?? null, file, projected };
}

/**
 * Aplica el catálogo al almacén de `dataDir`. IDEMPOTENTE y no destructivo.
 *
 * @returns conteos exactos de la pasada (para evidencia y tests).
 */
export async function applyCatalogToStore(
  dataDir: string,
  options: ApplyCatalogOptions = {},
): Promise<ApplyCatalogResult> {
  const { catalogPath = defaultCatalogPath(), writeProvenance = true } = options;
  const { projected, malformed, generatedAt: catalogGeneratedAt } = readCatalog(catalogPath);

  const stations = new JsonStationRepository(dataDir);
  const existing = await stations.list();
  const bySlug = new Map<string, Record<string, unknown>>();
  for (const s of existing) bySlug.set(s.slug, s as unknown as Record<string, unknown>);

  // Un único espejo en memoria de las filas crudas: `stations.list()` relee y valida el
  // fichero entero en cada llamada, así que consultarlo por candidata hace la carga
  // O(n²) (medido: 29 s para 587 filas). Se carga UNA vez y se mantiene al día.
  const rawStations = new TypedCollection<Record<string, unknown>>(
    dataDir,
    COLLECTIONS.stations,
    (e) => ({ ...e }),
  );
  const rawBySlug = new Map<string, Record<string, unknown>>();
  for (const r of rawStations.all()) {
    const slug = r.value['slug'];
    if (typeof slug === 'string') rawBySlug.set(slug, r.value);
  }

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let editorialPreserved = 0;

  // Se acumulan los cambios en memoria y se hace UNA sola escritura atómica al final:
  // `upsert()` reescribe el documento completo con fsync en cada llamada, así que
  // insertar las 587 filas una a una cuesta O(n²) en disco (medido: 11,6 s). Una
  // escritura única deja la carga en decenas de ms y sigue siendo atómica.
  const nextRecords: Array<{ readonly id: string; readonly record: Record<string, unknown> }> = [];
  for (const r of rawStations.all()) {
    const slug = r.value['slug'];
    if (typeof slug === 'string') rawBySlug.set(slug, r.value);
    nextRecords.push({ id: r.id, record: r.value });
  }
  const raw = readCollection(dataDir, COLLECTIONS.stations);
  let seq = raw.store.seq;
  let mutated = false;

  for (const row of projected) {
    const slug = String(row['slug']);
    const current = rawBySlug.get(slug);
    if (current !== undefined && isEditorialRow(current)) {
      // EDITORIAL MANDA: ni se actualiza ni se toca su id interno.
      editorialPreserved += 1;
      continue;
    }
    if (current === undefined) {
      seq += 1;
      nextRecords.push({ id: String(seq), record: row });
      inserted += 1;
      mutated = true;
      rawBySlug.set(slug, row);
      continue;
    }
    // Ya es del catálogo: sólo se reescribe si el contenido cambió de verdad, para que
    // un segundo arranque no toque el fichero (idempotencia observable por hash).
    if (sameRow(current, row)) {
      unchanged += 1;
      continue;
    }
    const idx = nextRecords.findIndex((x) => x.record['slug'] === slug);
    if (idx >= 0) nextRecords[idx] = { id: nextRecords[idx]!.id, record: row };
    updated += 1;
    mutated = true;
    rawBySlug.set(slug, row);
  }

  if (mutated) {
    writeCollectionAtomic(dataDir, COLLECTIONS.stations, { seq, records: nextRecords });
  }

  let provenanceWritten = 0;
  if (writeProvenance) {
    // Igual que con las estaciones: se compone en memoria y se escribe UNA vez.
    const provRaw = new TypedCollection<Record<string, unknown>>(
      dataDir,
      COLLECTIONS.provenance,
      (e) => ({ ...e }),
    );
    const provByKey = new Map<string, { id: string; record: Record<string, unknown> }>();
    for (const r of provRaw.all()) {
      const k = `${r.value['stationSlug']}\u0000${r.value['dataType']}\u0000${r.value['source']}`;
      provByKey.set(k, { id: r.id, record: r.value });
    }
    const provRead = readCollection(dataDir, COLLECTIONS.provenance);
    let provSeq = provRead.store.seq;
    let provMutated = false;
    const provRecords: Array<{ readonly id: string; readonly record: Record<string, unknown> }> = [
      ...provRead.store.records,
    ];
    // `observedAt` = instante en que se GENERÓ el catálogo (`generatedAt`), no el del
    // arranque: es cuando se observaron los datos maestros, y además hace la carga
    // reproducible (dos arranques ⇒ bytes idénticos). Sin `generatedAt`, el arranque.
    const observedAt = catalogGeneratedAt ?? new Date().toISOString();
    for (const row of projected) {
      const slug = String(row['slug']);
      const editorial = rawBySlug.get(slug);
      // La procedencia la escribe el CATÁLOGO sólo para filas que no son editoriales.
      if (editorial !== undefined && isEditorialRow(editorial)) continue;
      const lic = catalogLicensing(row as unknown as CatalogRecord);
      const entity: Record<string, unknown> = {
        stationSlug: slug,
        dataType: 'station-master',
        source: lic.source,
        // Instante declarado: la carga al almacén. No es la captura de la fuente, que
        // viaja en `catalogRef.sources[].capturedAt`.
        observedAt,
        updatedAt: null,
        status: 'cached',
        licenseStatus: lic.licenseStatus,
        attribution: lic.attribution,
      };
      const key = `${slug}\u0000station-master\u0000${lic.source}`;
      const hit = provByKey.get(key);
      if (hit === undefined) {
        provSeq += 1;
        provRecords.push({ id: String(provSeq), record: entity });
        provMutated = true;
      } else if (sameRow(hit.record, entity)) {
        // Ya estaba exactamente igual: no se reescribe (idempotencia real).
        continue;
      } else {
        const idx = provRecords.findIndex((x) => x.id === hit.id);
        if (idx >= 0) provRecords[idx] = { id: hit!.id, record: entity };
        provMutated = true;
      }
      provenanceWritten += 1;
    }
    if (provMutated) {
      writeCollectionAtomic(dataDir, COLLECTIONS.provenance, { seq: provSeq, records: provRecords });
    }
  }

  return {
    catalogRecords: projected.length,
    malformed,
    inserted,
    updated,
    unchanged,
    editorialPreserved,
    provenanceWritten,
    noop: inserted === 0 && updated === 0 && provenanceWritten === 0,
  };
}

/** Comparación por contenido (orden de claves estable) para la idempotencia. */
function sameRow(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === 'object') {
      const o: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        o[k] = walk((v as Record<string, unknown>)[k]);
      }
      return o;
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

/** Ruta de la colección `stations` en el directorio dado (para tests de hash). */
export function stationsCollectionPath(dataDir: string): string {
  const v2 = join(dataDir, 'stations.v2.json');
  if (existsSync(v2)) return v2;
  return join(dataDir, 'stations.json');
}
