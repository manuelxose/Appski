import type { Station } from '../../models/station';
import type { StationRepository } from '../repository';
import { readStore, writeStore } from './file-io';

const FILE = 'stations.json';

export class JsonStationRepository implements StationRepository {
  constructor(private readonly dir: string) {}

  async list(): Promise<readonly Station[]> {
    return readStore<Station>(this.dir, FILE).records;
  }

  async findBySlug(slug: string): Promise<Station | null> {
    const records = await this.list();
    return records.find((s) => s.slug === slug) ?? null;
  }

  async upsert(s: Station): Promise<void> {
    const store = readStore<Station>(this.dir, FILE);
    const idx = store.records.findIndex((x) => x.slug === s.slug);
    if (idx >= 0) store.records[idx] = s;
    else store.records.push(s);
    writeStore(this.dir, FILE, store);
  }
}
