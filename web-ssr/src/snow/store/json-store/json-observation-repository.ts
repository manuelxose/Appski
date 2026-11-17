import type { NoDataReason } from '../../contracts/provider-contracts';
import type { ObservationRecord } from '../../models/persistence';
import type { ObservationRepository } from '../repository-v2';
import { COLLECTIONS } from './file-io';
import {
  TypedCollection,
  requireNullableNumber,
  requireNullableString,
  requireProviderId,
  requireString,
  type EntityObject,
} from './typed-collection';

const REASONS: readonly string[] = [
  'outside-season',
  'source-silent',
  'not-yet-published',
  'not-covered',
  'license-prohibits',
];

function optionalReason(e: EntityObject, collection: string, id: string): NoDataReason | null {
  const v = requireNullableString(e, 'reason', collection, id);
  if (v === null) return null;
  const known = REASONS.find((r) => r === v);
  if (known === undefined) throw new Error(`${collection}#${id}: reason inválido '${v}'`);
  return known as NoDataReason;
}

function shapeObservation(e: EntityObject, collection: string, id: string): ObservationRecord {
  return {
    stationSlug: requireString(e, 'stationSlug', collection, id),
    source: requireProviderId(e, 'source', collection, id),
    observedAt: requireString(e, 'observedAt', collection, id),
    updatedAt: requireString(e, 'updatedAt', collection, id),
    // Toda magnitud ausente es null: NUNCA 0 como "sin dato".
    tempC: requireNullableNumber(e, 'tempC', collection, id),
    windKmh: requireNullableNumber(e, 'windKmh', collection, id),
    humidityPct: requireNullableNumber(e, 'humidityPct', collection, id),
    snowLineM: requireNullableNumber(e, 'snowLineM', collection, id),
    snowHeightCm: requireNullableNumber(e, 'snowHeightCm', collection, id),
    condition: requireNullableString(e, 'condition', collection, id),
    quality: null,
    payloadJson: requireNullableString(e, 'payloadJson', collection, id),
    reason: optionalReason(e, collection, id),
  };
}

function observationRecord(o: ObservationRecord): EntityObject {
  return {
    stationSlug: o.stationSlug,
    source: o.source,
    observedAt: o.observedAt,
    updatedAt: o.updatedAt,
    tempC: o.tempC,
    windKmh: o.windKmh,
    humidityPct: o.humidityPct,
    snowLineM: o.snowLineM,
    snowHeightCm: o.snowHeightCm,
    condition: o.condition,
    payloadJson: o.payloadJson,
    reason: o.reason,
  };
}

/**
 * Observaciones meteorológicas (`observations.json`). Colección ADOSADA por
 * SNOW-02: el contrato §3.1 la declaraba "NO IMPLEMENTADO". Sin proveedor vivo
 * queda vacía y el borde degrada a `no_data` (nunca cifras fabricadas).
 */
export class JsonObservationRepository implements ObservationRepository {
  private readonly observations: TypedCollection<ObservationRecord>;

  constructor(private readonly dir: string) {
    this.observations = new TypedCollection<ObservationRecord>(dir, COLLECTIONS.observations, shapeObservation);
  }

  async latest(stationSlug: string): Promise<ObservationRecord | null> {
    const list = await this.list(stationSlug);
    return list[0] ?? null;
  }

  async list(stationSlug: string, limit?: number): Promise<readonly ObservationRecord[]> {
    const sorted = this.observations
      .find((e) => e['stationSlug'] === stationSlug)
      .map((x) => x.value)
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    return limit === undefined ? sorted : sorted.slice(0, Math.max(0, limit));
  }

  async put(o: ObservationRecord): Promise<void> {
    this.observations.upsertByKey(observationRecord(o));
  }
}
