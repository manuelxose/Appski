import type { SnowReport } from '../../models/snow-report';
import type { SnowReportRepository } from '../repository';
import { readStore, writeStore } from './file-io';

const FILE = 'snow-reports.json';

export class JsonSnowReportRepository implements SnowReportRepository {
  constructor(private readonly dir: string) {}

  private all(): SnowReport[] {
    return readStore<SnowReport>(this.dir, FILE).records;
  }

  async listAll(): Promise<readonly SnowReport[]> {
    return this.all();
  }

  async listPublished(at: Date): Promise<readonly SnowReport[]> {
    return this.all().filter((r) => r.mood === 'published');
  }

  async latestPublishedForStation(stationSlug: string, at: Date): Promise<SnowReport | null> {
    const match = this.all()
      .filter((r) => r.stationSlug === stationSlug && r.mood === 'published')
      .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
    return match[0] ?? null;
  }

  async insert(r: SnowReport): Promise<void> {
    const store = readStore<SnowReport>(this.dir, FILE);
    store.records.push(r);
    writeStore(this.dir, FILE, store);
  }
}
