import {
  STORE_SCHEMA_VERSION,
  type StoreFileV1,
  type StoreFileV2,
  type StoreMigrationResult,
  type StoreRecord,
  type StoreSchemaVersion,
} from './store-model';

/**
 * Conversión pura v1 → v2 (sin E/S: testeable y reutilizable por `file-io`).
 *
 * Garantías:
 * - **Sin pérdida**: la entidad v1 viaja íntegra dentro de `record` (mismas
 *   claves y valores; los `null` siguen siendo `null`, nunca se coercionan).
 * - **Sin invención**: no se crea ni se descarta ningún registro; el número de
 *   registros de salida es exactamente el de entrada.
 * - **Ids internos estables**: si una entidad v1 ya trae `id` string (UUID de
 *   `SnowReport`) se CONSERVA; si no, se asigna el siguiente entero disponible.
 *   `seq` nunca retrocede.
 * - Un v1 cuyo `records` no es un array es un fichero corrupto: lanza en vez de
 *   devolver un almacén vacío que parecería "sin datos".
 */
const NUMERIC_ID = /^\d+$/;

export function isRecordObject(v: unknown): v is Readonly<Record<string, unknown>> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function nonNegativeInteger(v: unknown): number | null {
  return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : null;
}

function stringId(v: unknown): string | null {
  if (typeof v === 'string' && v.length > 0) return v;
  if (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0) return String(v);
  return null;
}

export function detectSchemaVersion(raw: unknown): StoreSchemaVersion {
  return isRecordObject(raw) && raw['schemaVersion'] === 1 ? 1 : STORE_SCHEMA_VERSION;
}

function entryEntity(entry: unknown): Readonly<Record<string, unknown>> {
  // Un escalar suelto no es una entidad: se envuelve sin reinterpretarlo.
  return isRecordObject(entry) ? entry : { value: entry };
}

export function convertV1ToV2(raw: unknown, collection: string): StoreFileV2 {
  if (!isRecordObject(raw)) {
    throw new Error(`${collection}: el fichero no es un objeto JSON (fichero corrupto)`);
  }
  const src = raw as Partial<StoreFileV1>;
  if (!Array.isArray(src.records)) {
    throw new Error(`${collection}: schemaVersion 1 sin array \`records\` (fichero corrupto)`);
  }
  const used = new Set<string>();
  let seq = 0;
  const records: StoreRecord[] = [];
  const pending: unknown[] = [];
  // Primera pasada: conservar los ids heredados y fijar `seq` a partir de ellos.
  for (const entry of src.records) {
    const inherited = isRecordObject(entry) ? stringId(entry['id']) : null;
    if (inherited !== null && !used.has(inherited)) {
      used.add(inherited);
      if (NUMERIC_ID.test(inherited)) seq = Math.max(seq, Number(inherited));
      records.push({ id: inherited, record: entryEntity(entry) });
    } else {
      pending.push(entry);
    }
  }
  // Segunda pasada: enteros a quien no tenía id (sin reutilizar ninguno).
  for (const entry of pending) {
    let next = seq + 1;
    while (used.has(String(next))) next++;
    seq = next;
    used.add(String(next));
    records.push({ id: String(next), record: entryEntity(entry) });
  }
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    store: 'snow',
    collection,
    updatedAt: typeof src.updatedAt === 'string' ? src.updatedAt : '',
    seq,
    records,
  };
}

/**
 * Normaliza CUALQUIER forma (v1, v2, objeto sin versión) a v2. En v2 recomputa
 * `seq` si falta o si es menor que el mayor id numérico ya presente, para que un
 * fichero editado a mano no haga colisionar ids.
 */
export function normalizeStoreFile(raw: unknown, collection: string): StoreFileV2 {
  if (!isRecordObject(raw)) {
    throw new Error(`${collection}: el fichero no es un objeto JSON (fichero corrupto)`);
  }
  if (raw['schemaVersion'] === 1) return convertV1ToV2(raw, collection);
  if (raw['schemaVersion'] === STORE_SCHEMA_VERSION && Array.isArray(raw['records'])) {
    let seq = nonNegativeInteger(raw['seq']) ?? 0;
    const records: StoreRecord[] = [];
    let index = 0;
    for (const e of raw['records']) {
      index++;
      if (!isRecordObject(e)) continue;
      const id = stringId(e['id']) ?? String(index);
      if (NUMERIC_ID.test(id)) seq = Math.max(seq, Number(id));
      records.push({ id, record: isRecordObject(e['record']) ? e['record'] : {} });
    }
    return {
      schemaVersion: STORE_SCHEMA_VERSION,
      store: 'snow',
      collection,
      updatedAt: typeof raw['updatedAt'] === 'string' ? raw['updatedAt'] : '',
      seq,
      records,
    };
  }
  // Objeto sin versión reconocible pero con `records`: se trata como v1.
  return convertV1ToV2(raw, collection);
}

export function migrationResult(from: StoreSchemaVersion, store: StoreFileV2): StoreMigrationResult {
  return {
    from,
    to: STORE_SCHEMA_VERSION,
    migrated: from !== STORE_SCHEMA_VERSION,
    recordsIn: store.records.length,
    recordsOut: store.records.length,
  };
}
