import { existsSync } from 'node:fs';
import { isRecordObject } from './convert';
import {
  readCollection,
  resolveCollectionPath,
  storePath,
  writeCollectionAtomic,
  type CollectionSpec,
} from './file-io';
import type { StoreRecord } from './store-model';

/**
 * Acceso TIPADO a una colección del almacén v2.
 *
 * El almacén no reinterpreta la entidad (la guarda tal cual), pero el
 * repositorio comprueba la FORMA mínima que promete su interfaz (`ShapeCheck`).
 * Una entidad que no la cumple es fichero corrupto y lanza: nunca se "arregla"
 * inventando campos ni sustituyendo `null` por `0`.
 */
export interface Identified<T> {
  readonly id: string;
  readonly value: T;
}

export type EntityObject = Readonly<Record<string, unknown>>;

export type ShapeCheck<T> = (entity: EntityObject, collection: string, id: string) => T;

export function requireString(e: EntityObject, key: string, collection: string, id: string): string {
  const v = e[key];
  if (typeof v !== 'string') throw new Error(`${collection}#${id}: campo '${key}' debe ser string`);
  return v;
}

export function requireNullableString(e: EntityObject, key: string, collection: string, id: string): string | null {
  const v = e[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'string') throw new Error(`${collection}#${id}: campo '${key}' debe ser string|null`);
  return v;
}

export function requireNumber(e: EntityObject, key: string, collection: string, id: string): number {
  const v = e[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${collection}#${id}: campo '${key}' debe ser número finito`);
  return v;
}

export function requireNullableNumber(e: EntityObject, key: string, collection: string, id: string): number | null {
  const v = e[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`${collection}#${id}: campo '${key}' debe ser número finito o null`);
  }
  return v;
}

export function requireBoolean(e: EntityObject, key: string, collection: string, id: string): boolean {
  const v = e[key];
  if (typeof v !== 'boolean') throw new Error(`${collection}#${id}: campo '${key}' debe ser boolean`);
  return v;
}

/** Clave lógica (campos del `CollectionSpec`, unidos con NUL para no colisionar). */
export function keyOf(entity: EntityObject, keyFields: readonly string[]): string {
  return keyFields.map((f) => String(entity[f])).join('\u0000');
}

/** Fuentes válidas (`ProviderId` de `provider-contracts.ts`). Sin `as` al leer. */
export const PROVIDER_IDS: readonly string[] = [
  'aemet',
  'aemet-bpa',
  'meteofrance',
  'copernicus-c3s',
  'copernicus-clms',
  'ign-es',
  'ign-fr',
  'osm',
  'protomaps',
  'editorial-stations',
  'editorial-report',
  'infonieve',
  'ipma',
  'meteoandorra',
  'maptiler',
  'stadia',
  'mapbox',
  'opentopomap',
  'aramon',
  'baqueira',
  'grandvalira',
  'fgc',
  'feratel',
  'osm-tiles',
  'meteofrance-bpa-html',
];

export type ProviderIdString =
  | 'aemet'
  | 'aemet-bpa'
  | 'meteofrance'
  | 'copernicus-c3s'
  | 'copernicus-clms'
  | 'ign-es'
  | 'ign-fr'
  | 'osm'
  | 'protomaps'
  | 'editorial-stations'
  | 'editorial-report'
  | 'infonieve'
  | 'ipma'
  | 'meteoandorra'
  | 'maptiler'
  | 'stadia'
  | 'mapbox'
  | 'opentopomap'
  | 'aramon'
  | 'baqueira'
  | 'grandvalira'
  | 'fgc'
  | 'feratel'
  | 'osm-tiles'
  | 'meteofrance-bpa-html';

export function requireProviderId(e: EntityObject, key: string, collection: string, id: string): ProviderIdString {
  const v = requireString(e, key, collection, id);
  const known = PROVIDER_IDS.find((p) => p === v);
  if (known === undefined) throw new Error(`${collection}#${id}: fuente desconocida '${v}'`);
  return known as ProviderIdString;
}

/** Licencias válidas (`LicenseStatus`). Sin `as` al leer. */
export const LICENSE_STATUSES = [
  'allowed',
  'allowed-with-attribution',
  'restricted',
  'blocked',
  'unverified',
] as const;

export type LicenseStatusString = (typeof LICENSE_STATUSES)[number];

export function requireLicenseStatus(e: EntityObject, key: string, collection: string, id: string): LicenseStatusString {
  const v = requireString(e, key, collection, id);
  const known: LicenseStatusString | undefined = LICENSE_STATUSES.find((l) => l === v);
  if (known === undefined) throw new Error(`${collection}#${id}: licenseStatus inválido '${v}'`);
  return known;
}

export class TypedCollection<T> {
  constructor(
    private readonly dir: string,
    private readonly spec: CollectionSpec,
    private readonly shape: ShapeCheck<T>,
  ) {}

  get specName(): string {
    return this.spec.name;
  }

  private load(): { seq: number; records: readonly StoreRecord[] } {
    const r = readCollection(this.dir, this.spec);
    return { seq: r.store.seq, records: r.store.records };
  }

  /** Todas las entidades en orden de almacén (v1 migrado o v2 tal cual). */
  all(): Identified<T>[] {
    return this.load().records.map((r) => ({ id: r.id, value: this.shape(r.record, this.spec.name, r.id) }));
  }

  raw(): readonly StoreRecord[] {
    return this.load().records;
  }

  get(id: string): Identified<T> | null {
    const hit = this.load().records.find((r) => r.id === id);
    return hit ? { id: hit.id, value: this.shape(hit.record, this.spec.name, hit.id) } : null;
  }

  findByKey(entityKey: string): Identified<T> | null {
    for (const r of this.load().records) {
      if (keyOf(r.record, this.spec.keyFields) === entityKey) {
        return { id: r.id, value: this.shape(r.record, this.spec.name, r.id) };
      }
    }
    return null;
  }

  find(predicate: (entity: EntityObject) => boolean): Identified<T>[] {
    return this.load()
      .records.filter((r) => predicate(r.record))
      .map((r) => ({ id: r.id, value: this.shape(r.record, this.spec.name, r.id) }));
  }

  /** Inserta conservando TODAS las entradas existentes (ids intactos). */
  insert(entity: EntityObject): Identified<T> {
    const { seq, records } = this.load();
    const id = String(seq + 1);
    this.write(seq + 1, [...records, { id, record: entity }]);
    return { id, value: this.shape(entity, this.spec.name, id) };
  }

  /** Upsert por clave lógica: reemplaza la entidad y CONSERVA su id interno. */
  upsertByKey(entity: EntityObject): Identified<T> {
    const { seq, records } = this.load();
    const target = keyOf(entity, this.spec.keyFields);
    const hit = records.find((r) => keyOf(r.record, this.spec.keyFields) === target);
    if (!hit) return this.insert(entity);
    const next = records.map((r) => (r.id === hit.id ? { id: r.id, record: entity } : r));
    this.write(seq, next);
    return { id: hit.id, value: this.shape(entity, this.spec.name, hit.id) };
  }

  /** Upsert por id interno explícito. `seq` nunca retrocede. */
  upsertById(id: string, entity: EntityObject): Identified<T> {
    const { seq, records } = this.load();
    const numeric = /^\d+$/.test(id);
    const nextSeq = numeric ? Math.max(seq, Number(id)) : seq;
    const exists = records.some((r) => r.id === id);
    const next = exists
      ? records.map((r) => (r.id === id ? { id, record: entity } : r))
      : [...records, { id, record: entity }];
    this.write(nextSeq, next);
    return { id, value: this.shape(entity, this.spec.name, id) };
  }

  /** `true` si ya hay un fichero de la colección (v1 o v2). */
  exists(): boolean {
    return existsSync(resolveCollectionPath(this.dir, this.spec).path);
  }

  /**
   * Escritura de RUNTIME: al destino del formato en que está la colección.
   * - v2 existente (migrada o creada en v2) ⇒ escribe en `*.v2.json`;
   * - sólo v1 ⇒ escribe en v1 con los mismos NOMBRES de fichero (compatibilidad
   *   con los tests base, que leen `stations.json`/`snow-reports.json`);
   * - colección nueva (sin fichero) ⇒ DIRECTO en v2: nunca se crea un v1 para
   *   datos nuevos.
   */
  private write(seq: number, records: readonly StoreRecord[]): void {
    const v2Name = `${this.spec.name}.v2.json`;
    const target = existsSync(storePath(this.dir, v2Name))
      ? v2Name
      : this.exists()
        ? this.spec.target
        : v2Name;
    writeCollectionAtomic(this.dir, this.spec, { seq, records }, target);
  }
}

export { isRecordObject };

