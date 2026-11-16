import type { ProviderId } from '../../contracts/provider-contracts';
import type { ForecastCacheEntry, ForecastCacheRepository } from '../repository';
import { readStore, writeStore } from './file-io';

const FILE = 'forecast-cache.json';

export class JsonForecastCacheRepository implements ForecastCacheRepository {
  constructor(private readonly dir: string) {}

  async get(stationSlug: string, source: ProviderId): Promise<ForecastCacheEntry | null> {
    const e = readStore<ForecastCacheEntry>(this.dir, FILE).records.find(
      (x) => x.stationSlug === stationSlug && x.source === source
    );
    return e ?? null;
  }

  async put(e: ForecastCacheEntry): Promise<void> {
    const store = readStore<ForecastCacheEntry>(this.dir, FILE);
    const idx = store.records.findIndex((x) => x.stationSlug === e.stationSlug && x.source === e.source);
    if (idx >= 0) store.records[idx] = e;
    else store.records.push(e);
    writeStore(this.dir, FILE, store);
  }
}
