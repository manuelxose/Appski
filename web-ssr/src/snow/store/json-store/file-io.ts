import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import {
  STORE_SCHEMA_VERSION,
  type MigrationOutcome,
  type StoreFileV2,
  type StoreRecord,
  type StoreSchemaVersion,
} from './store-model';
import { convertV1ToV2, detectSchemaVersion, isRecordObject, normalizeStoreFile } from './convert';

export type { MigrationOutcome } from './store-model';

/**
 * E/S durable del almacén JSON v2 (SNOW-02 §3.2). Directorio SERVIDOR, nunca
 * `assets/` (que se sirve estático y filtraría los datos). Ruta por
 * `SNOW_DATA_DIR` (por defecto `data/snow`).
 *
 * Atomicidad: se escribe `<fichero>.tmp` con `writeFileSync`, se hace `fsync`
 * del descriptor (para que un corte de energía no deje un `.tmp` vacío
 * renombrado) y se `renameSync` sobre el destino: el lector ve el fichero
 * anterior COMPLETO o el nuevo COMPLETO, nunca una mezcla.
 *
 * Día 1 (compatibilidad con pruebas existentes): mientras una colección no se
 * haya migrado, su fichero histórico (`stations.json`, `snow-reports.json`,
 * `osm-derived.json`, `forecast-cache.json`) sigue siendo el fichero de
 * lectura Y de escritura, y el documento escrito se normaliza a v2 EN ESE
 * MISMO NOMBRE. La migración explícita escribe `<coleccion>.v2.json`; desde
 * entonces el v2 manda en la lectura y el v1 queda como backup congelado. Una
 * lectura de runtime nunca escribe en disco (no "migra por sorpresa").
 */

export interface CollectionSpec {
  /** Nombre lógico de la colección (`snow-reports`). */
  readonly name: string;
  /**
   * Ficheros de la colección, por PRIORIDAD de lectura: el formato NUEVO (v2)
   * primero, luego el histórico (v1). Así una colección migrada se sigue leyendo
   * desde su destino v2 y nunca "revierte" al v1 que quedó como backup.
   */
  readonly files: readonly string[];
  /** Fichero de ESCRITURA de runtime (formato v1, el que consumen los tests base). */
  readonly target: string;
  /** Campos que forman la clave lógica (para índices y `get`). */
  readonly keyFields: readonly string[];
}

export function collectionSpec(name: string, keyFields: readonly string[] = []): CollectionSpec {
  const target = `${name}.json`;
  return { name, files: [`${name}.v2.json`, target], target, keyFields };
}

/**
 * Colecciones de disco del contrato §3.1 + las ADOSADAS por SNOW-02.
 * `keyFields` = clave lógica: la identidad LEGIBLE (slug, id de proveedor, tupla).
 * Los repositorios indexan por ella; el `id` interno del envoltorio es otra cosa.
 */
export const COLLECTIONS = {
  stations: collectionSpec('stations', ['slug']),
  snowReports: collectionSpec('snow-reports', ['id']),
  osmDerived: collectionSpec('osm-derived', ['osmType', 'osmId']),
  forecastCache: collectionSpec('forecast-cache', ['stationSlug', 'source']),
  observations: collectionSpec('observations', ['stationSlug', 'source', 'observedAt']),
  webcams: collectionSpec('webcams', ['stationSlug', 'linkUrl']),
  alerts: collectionSpec('alerts', ['id']),
  providers: collectionSpec('providers', ['providerId']),
  provenance: collectionSpec('provenance', ['stationSlug', 'dataType', 'source']),
} as const;

export function defaultDataDir(): string {
  return process.env['SNOW_DATA_DIR'] ?? resolve(process.cwd(), 'data', 'snow');
}

export function storePath(dir: string, fileName: string): string {
  return resolve(dir, fileName);
}

/** Ruta existente para la colección (destino v2 primero), o el destino de escritura. */
export function resolveCollectionPath(dir: string, spec: CollectionSpec): { path: string; exists: boolean } {
  for (const f of spec.files) {
    const p = storePath(dir, f);
    if (existsSync(p)) return { path: p, exists: true };
  }
  return { path: storePath(dir, spec.target), exists: false };
}

export interface ReadResult {
  readonly schemaVersion: StoreSchemaVersion;
  /** `false` si el fichero no existe (almacén vacío, no error). */
  readonly exists: boolean;
  readonly path: string;
  readonly store: StoreFileV2;
}

/**
 * Lee y NORMALIZA (v1 → v2 en memoria, sin escribir). Un fichero corrupto lanza:
 * un fallo de datos debe verse, no degradar a "sin datos".
 */
export function readCollection(dir: string, spec: CollectionSpec): ReadResult {
  const { path, exists } = resolveCollectionPath(dir, spec);
  if (!exists) {
    return {
      schemaVersion: STORE_SCHEMA_VERSION,
      exists: false,
      path,
      store: { schemaVersion: STORE_SCHEMA_VERSION, store: 'snow', collection: spec.name, updatedAt: '', seq: 0, records: [] },
    };
  }
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const schemaVersion = detectSchemaVersion(raw);
  const store =
    schemaVersion === 1
      ? convertV1ToV2(raw, spec.name)
      : normalizeStoreFile(raw, spec.name);
  return { schemaVersion, exists: true, path, store };
}

/**
 * Lectura laxa (compatibilidad con el contrato v1 de `readStore`): devuelve las
 * entidades v1 ya convertidas en memoria. No escribe nada en disco.
 */
export function readStore<T>(dir: string, fileName: string): { schemaVersion: StoreSchemaVersion; updatedAt: string; records: T[] } {
  const r = readCollection(dir, collectionSpec(fileName.replace(/\.json$/, '')));
  return { schemaVersion: r.schemaVersion, updatedAt: r.store.updatedAt, records: r.store.records.map((x) => x.record as T) };
}

/**
 * Escritura atómica (tmp + fsync + rename) a `fileName` (por defecto el destino
 * de runtime de la colección). Gana la atomicidad del documento completo.
 */
export function writeCollectionAtomic(
  dir: string,
  spec: CollectionSpec,
  store: { seq: number; records: readonly StoreRecord[] },
  fileName: string = spec.target,
): void {
  mkdirSync(dir, { recursive: true });
  const path = storePath(dir, fileName);
  const doc: StoreFileV2 = {
    schemaVersion: STORE_SCHEMA_VERSION,
    store: 'snow',
    collection: spec.name,
    updatedAt: new Date().toISOString(),
    seq: store.seq,
    records: store.records,
  };
  const tmp = `${path}.tmp`;
  const fd = openSync(tmp, 'w');
  try {
    writeFileSync(fd, JSON.stringify(doc, null, 2) + '\n', 'utf8');
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    renameSync(tmp, path);
  } catch (err) {
    // Windows: si otro proceso tiene el destino abierto el rename falla; el
    // `.tmp` ya es válido, así que se reintenta brevemente.
    if (!retryRename(tmp, path)) throw err;
  }
}

function retryRename(from: string, to: string): boolean {
  for (let i = 0; i < 3; i++) {
    try {
      renameSync(from, to);
      return true;
    } catch {
      // reintento inmediato: la ventana es de milisegundos
    }
  }
  rmSync(from, { force: true });
  return false;
}

/**
 * Escritura laxa (compatibilidad v1). Reasigna ids POSICIONALES como en v1: sólo
 * para datos que se reescriben completos; los repositorios usan `ids` estables.
 */
export function writeStore<T>(dir: string, fileName: string, store: { schemaVersion: StoreSchemaVersion; updatedAt: string; records: T[] }): void {
  const spec = collectionSpec(fileName.replace(/\.json$/, ''));
  const records: StoreRecord[] = store.records.map((r, i) => ({
    id: String(i + 1),
    record: isRecordObject(r) ? r : {},
  }));
  writeCollectionAtomic(dir, spec, {
    seq: records.filter((r) => /^\d+$/.test(r.id)).reduce((m, r) => Math.max(m, Number(r.id)), 0),
    records,
  });
}

/**
 * Migración EN DISCO, versionada y no destructiva. Por colección:
 * - si no hay ningún fichero: no hace nada (`migrated:false`, sin inventar);
 * - si ya hay un v2 (es la fuente de lectura): no reescribe;
 * - si sólo hay v1: escribe `<coleccion>.v2.json` atómico con las MISMAS
 *   entidades (ids internos asignados) y deja el v1 intacto como backup. A partir
 *   de ahí la colección se lee del v2 (`CollectionSpec.files` lo pone primero).
 *
 * Un fallo de validación (registros perdidos o inventados) NO escribe nada.
 */
export function migrateStoreDir(dir: string, specs: readonly CollectionSpec[] = Object.values(COLLECTIONS)): readonly MigrationOutcome[] {
  const out: MigrationOutcome[] = [];
  for (const spec of specs) {
    const { path, exists } = resolveCollectionPath(dir, spec);
    if (!exists) {
      out.push({ collection: spec.name, path, from: STORE_SCHEMA_VERSION, to: STORE_SCHEMA_VERSION, migrated: false, recordsIn: 0, recordsOut: 0 });
      continue;
    }
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const from = detectSchemaVersion(raw);
    const store = from === 1 ? convertV1ToV2(raw, spec.name) : normalizeStoreFile(raw, spec.name);
    const recordsIn = isRecordObject(raw) && Array.isArray(raw['records']) ? raw['records'].length : store.records.length;
    if (recordsIn !== store.records.length) {
      throw new Error(`${spec.name}: la migración perdería o inventaría registros (${recordsIn} → ${store.records.length}); no se escribe nada`);
    }
    if (from === STORE_SCHEMA_VERSION) {
      out.push({ collection: spec.name, path, from, to: STORE_SCHEMA_VERSION, migrated: false, recordsIn, recordsOut: store.records.length });
      continue;
    }
  writeCollectionAtomic(dir, spec, store, `${spec.name}.v2.json`);
    out.push({ collection: spec.name, path, from, to: STORE_SCHEMA_VERSION, migrated: true, recordsIn, recordsOut: store.records.length });
  }
  return out;
}

/**
 * Bootstrap determinista del seed editorial (R2): copia cada fichero del seed a
 * `dir` **solo si el destino no existe**, y solo la primera vez. Nunca
 * sobrescribe datos de runtime ni inventa registros.
 *
 * Por qué los valores por defecto están embebidos: el build deja `dist/` sin el
 * directorio `seed/` (no se emite), así que en producción el fichero de disco no
 * existe. Se prefiere el fichero del seed si está accesible (fuente única) y, si
 * no, el contenido embebido — byte a byte el mismo. Hay un test que verifica esa
 * equivalencia para que no puedan divergir en silencio.
 *
 * Un seed corrupto se lanza al arrancar en vez de servir un almacén vacío en
 * silencio: el fallo debe verse, no degradar los datos.
 */
const SEED_FILES = ['stations.json', 'snow-reports.json', 'osm-derived.json'] as const;

/** Mismo contenido que `seed/<fichero>`; la ruta del seed relativa al bundle. */
const SEED_DEFAULTS: Readonly<Record<(typeof SEED_FILES)[number], string>> = {
  'stations.json': JSON.stringify(
    {
      schemaVersion: 1,
      updatedAt: '',
      records: [
        {
          slug: 'baqueira-beret',
          name: 'Baqueira Beret',
          country: 'ES',
          region: 'Pirineo Catalán',
          discipline: 'alpine',
          lat: 42.6999,
          lng: 0.9367,
          altitudeBaseM: 1500,
          altitudeTopM: 2610,
          website: 'https://www.baqueira.es/',
          seasonOpen: null,
          seasonClose: null,
          seasonConfirmed: false,
        },
        {
          slug: 'formigal-panticosa',
          name: 'Formigal-Panticosa',
          country: 'ES',
          region: 'Pirineo Aragonés',
          discipline: 'alpine',
          lat: 42.7625,
          lng: -0.3927,
          altitudeBaseM: 1510,
          altitudeTopM: 2250,
          website: 'https://www.formigal-panticosa.com/',
          seasonOpen: null,
          seasonClose: null,
          seasonConfirmed: false,
        },
        {
          slug: 'grandvalira',
          name: 'Grandvalira',
          country: 'AD',
          region: 'Pirineo Andorrano',
          discipline: 'alpine',
          lat: 42.5449,
          lng: 1.6007,
          altitudeBaseM: 1710,
          altitudeTopM: 2640,
          website: 'https://www.grandvalira.com/',
          seasonOpen: null,
          seasonClose: null,
          seasonConfirmed: false,
        },
      ],
    },
    null,
    2,
  ) + '\n',
  'snow-reports.json': JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }, null, 2) + '\n',
  'osm-derived.json': JSON.stringify({ schemaVersion: 1, updatedAt: '', records: [] }, null, 2) + '\n',
};

export interface BootstrapResult {
  /** Ficheros efectivamente copiados a `dir` (destino inexistente). */
  readonly created: readonly string[];
  /** Ficheros ya presentes en `dir`, respetados sin tocar. */
  readonly skipped: readonly string[];
}

function seedDirOnDisk(): string {
  return resolve(fileURLToPath(new URL('.', import.meta.url)), 'seed');
}

function seedContent(fileName: string): string {
  const onDisk = resolve(seedDirOnDisk(), fileName);
  if (existsSync(onDisk)) return readFileSync(onDisk, 'utf8');
  const embedded = SEED_DEFAULTS[fileName as (typeof SEED_FILES)[number]];
  if (embedded === undefined) throw new Error(`seed sin contenido embebido: ${fileName}`);
  return embedded;
}

export function bootstrapStore(dir: string): BootstrapResult {
  const created: string[] = [];
  const skipped: string[] = [];
  for (const fileName of SEED_FILES) {
    const spec = collectionSpec(fileName.replace(/\.json$/, ''));
    const present = spec.files.some((f) => existsSync(resolve(dir, f)));
    if (present) {
      skipped.push(fileName);
      continue;
    }
    // El seed es dato curado: si no es JSON válido, el arranque falla en vez de
    // dejar un almacén vacío que parecería "sin datos" por otra causa.
    const body = seedContent(fileName);
    JSON.parse(body);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, fileName), body, 'utf8');
    created.push(fileName);
  }
  return { created, skipped };
}
