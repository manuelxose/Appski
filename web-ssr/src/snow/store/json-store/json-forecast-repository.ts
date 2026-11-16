import type { ProviderId } from '../../contracts/provider-contracts';
import type { ForecastCacheEntry } from '../repository';
import type { ForecastCacheRepositoryV2 } from '../repository-v2';
import { COLLECTIONS } from './file-io';
import { TypedCollection, requireProviderId, requireString, type EntityObject } from './typed-collection';

function shapeEntry(e: EntityObject, collection: string, id: string): ForecastCacheEntry {
  return {
    stationSlug: requireString(e, 'stationSlug', collection, id),
    source: requireProviderId(e, 'source', collection, id) as ProviderId,
    observedAt: requireString(e, 'observedAt', collection, id),
    updatedAt: requireString(e, 'updatedAt', collection, id),
    expiresAt: requireString(e, 'expiresAt', collection, id),
    payloadJson: requireString(e, 'payloadJson', collection, id),
  };
}

function toRecord(e: ForecastCacheEntry): EntityObject {
  return {
    stationSlug: e.stationSlug,
    source: e.source,
    observedAt: e.observedAt,
    updatedAt: e.updatedAt,
    expiresAt: e.expiresAt,
    payloadJson: e.payloadJson,
  };
}

/**
 * Caché de pronósticos en el almacén v2 (`forecast-cache.json`).
 *
 * La ENTIDAD es la tupla (`stationSlug`, `source`): no tiene un `id` de dominio,
 * así que el id interno del almacén es lo que la identifica. `expiresAt` es una
 * fecha comparecida con el reloj del llamador: una entrada pasada NUNCA es
 * "fresca" y su `payloadJson` no debe servirse como dato vivo.
 */
export class JsonForecastCacheRepository implements ForecastCacheRepositoryV2 {
  private readonly cache: TypedCollection<ForecastCacheEntry>;

  constructor(private readonly dir: string) {
    this.cache = new TypedCollection<ForecastCacheEntry>(dir, COLLECTIONS.forecastCache, shapeEntry);
  }

  async get(stationSlug: string, source: ProviderId): Promise<ForecastCacheEntry | null> {
    const hit = this.cache.findByKey(`${stationSlug}\u0000${source}`);
    return hit ? hit.value : null;
  }

  isFresh(e: ForecastCacheEntry, at: Date): boolean {
    const exp = Date.parse(e.expiresAt);
    return Number.isFinite(exp) && at.getTime() < exp;
  }

  async listFresh(stationSlug: string, at: Date): Promise<readonly ForecastCacheEntry[]> {
    return this.cache
      .find((e) => e['stationSlug'] === stationSlug)
      .map((x) => x.value)
      .filter((e) => this.isFresh(e, at));
  }

  async put(e: ForecastCacheEntry): Promise<void> {
    this.cache.upsertByKey(toRecord(e));
  }
}
