import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/**
 * Almacén JSON versionado (R2). Directorio SERVIDOR, nunca `assets/` (que se
 * sirve estático y filtraría los datos). Ruta por `SNOW_DATA_DIR`.
 */

export interface JsonStoreFile<T> {
  readonly schemaVersion: 1;
  readonly updatedAt: string;
  readonly records: T[];
}

export function defaultDataDir(): string {
  return process.env['SNOW_DATA_DIR'] ?? resolve(process.cwd(), 'data', 'snow');
}

export function readStore<T>(dir: string, fileName: string): { schemaVersion: 1; updatedAt: string; records: T[] } {
  const path = resolve(dir, fileName);
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return { schemaVersion: 1, updatedAt: '', records: [] };
  }
  const parsed = JSON.parse(raw) as Partial<JsonStoreFile<T>>;
  return {
    schemaVersion: 1,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
    records: Array.isArray(parsed.records) ? (parsed.records as T[]) : [],
  };
}

export function writeStore<T>(dir: string, fileName: string, store: { schemaVersion: 1; updatedAt: string; records: T[] }): void {
  mkdirSync(dir, { recursive: true });
  const path = resolve(dir, fileName);
  const tmp = `${path}.tmp`;
  const body = JSON.stringify({ ...store, updatedAt: new Date().toISOString() }, null, 2);
  writeFileSync(tmp, body, 'utf8');
  renameSync(tmp, path);
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
  return SEED_DEFAULTS[fileName as keyof typeof SEED_DEFAULTS];
}

export function bootstrapStore(dir: string): BootstrapResult {
  const created: string[] = [];
  const skipped: string[] = [];
  for (const fileName of SEED_FILES) {
    const target = resolve(dir, fileName);
    if (existsSync(target)) {
      skipped.push(fileName);
      continue;
    }
    // El seed es dato curado: si no es JSON válido, el arranque falla en vez de
    // dejar un almacén vacío que parecería "sin datos" por otra causa.
    const body = seedContent(fileName);
    JSON.parse(body);
    mkdirSync(dir, { recursive: true });
    writeFileSync(target, body, 'utf8');
    created.push(fileName);
  }
  return { created, skipped };
}
