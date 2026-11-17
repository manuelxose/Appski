import type { ProviderId } from '../../contracts/provider-contracts';
import type { ForecastCacheEntry } from '../repository';
import type { ForecastCacheRepositoryV2 } from '../repository-v2';
import { COLLECTIONS } from './file-io';
import { TypedCollection, requireNullableNumber, requireProviderId, requireString, type EntityObject } from './typed-collection';

function shapeEntry(e: EntityObject, collection: string, id: string): ForecastCacheEntry {
  return {
    stationSlug: requireString(e, 'stationSlug', collection, id),
    source: requireProviderId(e, 'source', collection, id) as ProviderId,
    // Tolerante a entradas previas a SNOW-03 (sin coordenadas): ausente ⇒ null,
    // nunca 0 (0,0 es un punto real en el Atlántico y no un "sin dato").
    lat: requireNullableNumber(e, 'lat', collection, id),
    lng: requireNullableNumber(e, 'lng', collection, id),
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
    lat: e.lat,
    lng: e.lng,
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

  /**
   * Entrada VIGENTE para la identidad completa (estación, fuente, punto).
   * Si la entrada guardada corresponde a OTRAS coordenadas, se considera
   * ausente: no se sirve el pronóstico de otro punto.
   */
  async getForPoint(
    stationSlug: string,
    source: ProviderId,
    lat: number,
    lng: number,
  ): Promise<ForecastCacheEntry | null> {
    const hit = await this.get(stationSlug, source);
    if (hit === null) return null;
    if (hit.lat === null || hit.lng === null) return null;
    return Math.abs(hit.lat - lat) < 1e-4 && Math.abs(hit.lng - lng) < 1e-4 ? hit : null;
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
