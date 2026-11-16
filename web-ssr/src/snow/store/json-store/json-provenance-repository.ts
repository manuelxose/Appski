import type { ProviderId } from '../../contracts/provider-contracts';
import type { ProvenanceRecord, ProvenanceRepository } from '../repository-v2';
import { COLLECTIONS } from './file-io';
import {
  TypedCollection,
  requireLicenseStatus,
  requireNullableString,
  requireProviderId,
  requireString,
  type EntityObject,
} from './typed-collection';

const STATUSES = ['live', 'cached', 'stale', 'degraded'] as const;

function shapeStatus(e: EntityObject, collection: string, id: string): (typeof STATUSES)[number] {
  const v = requireString(e, 'status', collection, id);
  const known: (typeof STATUSES)[number] | undefined = STATUSES.find((s) => s === v);
  if (known === undefined) throw new Error(`${collection}#${id}: status inválido '${v}'`);
  return known;
}

function shapeProvenance(e: EntityObject, collection: string, id: string): ProvenanceRecord {
  return {
    stationSlug: requireString(e, 'stationSlug', collection, id),
    dataType: requireString(e, 'dataType', collection, id),
    source: requireProviderId(e, 'source', collection, id),
    observedAt: requireString(e, 'observedAt', collection, id),
    // `updatedAt` null = sin actualización de operador. NUNCA observedAt de relleno.
    updatedAt: requireNullableString(e, 'updatedAt', collection, id),
    status: shapeStatus(e, collection, id),
    licenseStatus: requireLicenseStatus(e, 'licenseStatus', collection, id),
    attribution: requireNullableString(e, 'attribution', collection, id),
  };
}

/**
 * Historial y procedencia por dataset (`provenance.json`). Clave lógica:
 * (estación, tipo de dato, fuente) → el registro MÁS RECIENTE de esa tupla.
 *
 * `history()` se deriva de esa misma colección (no hay fichero paralelo): una
 * procedencia por dataset es todo lo que el contrato §3.1 pide. `history`
 * devuelve 1 elemento por dataset de la estación; cuando la fuente sólo da un
 * instante por dataset eso es exactamente el historial disponible.
 */
export class JsonProvenanceRepository implements ProvenanceRepository {
  private readonly records: TypedCollection<ProvenanceRecord>;

  constructor(private readonly dir: string) {
    this.records = new TypedCollection<ProvenanceRecord>(dir, COLLECTIONS.provenance, shapeProvenance);
  }

  async get(stationSlug: string, dataType: string, source: ProviderId): Promise<ProvenanceRecord | null> {
    const entity = this.records.find(
      (e) => e['stationSlug'] === stationSlug && e['dataType'] === dataType && e['source'] === source,
    )[0];
    return entity ? entity.value : null;
  }

  async record(p: ProvenanceRecord): Promise<void> {
    this.records.upsertByKey({
      stationSlug: p.stationSlug,
      dataType: p.dataType,
      source: p.source,
      observedAt: p.observedAt,
      updatedAt: p.updatedAt,
      status: p.status,
      licenseStatus: p.licenseStatus,
      attribution: p.attribution,
    });
  }

  async history(stationSlug: string, limit?: number): Promise<readonly ProvenanceRecord[]> {
    const sorted = this.records
      .find((e) => e['stationSlug'] === stationSlug)
      .map((x) => x.value)
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    return limit === undefined ? sorted : sorted.slice(0, Math.max(0, limit));
  }
}
