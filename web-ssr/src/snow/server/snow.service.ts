import { randomUUID } from 'node:crypto';
import type {
  AvalancheBulletin,
  ForecastBundle,
  ImageGrant,
  OperationalStatus,
  SnowDepthReport,
} from '../contracts/data-type-map';
import type {
  NoDataReason,
  ProviderId,
  ProviderInput,
  ProviderResult,
  StationRef,
  SnowDataType,
} from '../contracts/provider-contracts';
import type { EditorialSourceDto, ProvenanceDto, ReportPayload, SnowReportDto } from '../models/dto';
import type { SnowReport } from '../models/snow-report';
import type { StationSummary } from '../models/station';
import {
  parseNewReportInput,
  type EditorialValidationError,
  type SnowReportRepository,
  type StationRepository,
} from '../store/repository';
import { SnowDataService } from '../chain/chain';
import { requireEnv } from '../config/env';
import { RATE_LIMITS } from '../cache/rate-limit';
import { authorizationFor } from '../providers/authorizations';
import { makeProvenance } from '../providers/provenance';
import { toProvenanceDto } from './http-mapping';
import { systemClock, type Clock } from './clock';

const ENV_GATED: ReadonlyArray<{ id: ProviderId; env: readonly string[] }> = [
  { id: 'aemet', env: ['AEMET_API_KEY'] },
  { id: 'aemet-bpa', env: ['AEMET_API_KEY'] },
  { id: 'meteofrance', env: ['METEOFRANCE_API_KEY'] },
  { id: 'copernicus-c3s', env: ['C3S_API_KEY'] },
  { id: 'copernicus-clms', env: ['CLMS_API_KEY'] },
  { id: 'protomaps', env: ['PROTOMAPS_BASE_URL'] },
];

export class SnowService {
  constructor(
    private readonly data: SnowDataService,
    private readonly stations: StationRepository,
    private readonly reports: SnowReportRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  // ---- stations (F04/F05/F06) ----

  async listStations(): Promise<{ status: 'ok'; provenance: ProvenanceDto; stations: readonly StationSummary[] }> {
    const all = await this.stations.list();
    return { status: 'ok', provenance: this.editorialProvenance(), stations: all.map(toSummary) };
  }

  async getStation(slug: string): Promise<{ status: 'ok'; provenance: ProvenanceDto; station: StationSummary } | 'not-found'> {
    const s = await this.stations.findBySlug(slug);
    if (!s) return 'not-found';
    return { status: 'ok', provenance: this.editorialProvenance(), station: toSummary(s) };
  }

  async searchStations(q: string): Promise<{ status: 'ok'; provenance: ProvenanceDto; stations: readonly StationSummary[] }> {
    const needle = q.trim().toLowerCase();
    const all = await this.stations.list();
    const stations = all
      .filter(
        (s) =>
          needle.length === 0 ||
          s.name.toLowerCase().includes(needle) ||
          s.region.toLowerCase().includes(needle) ||
          s.slug.toLowerCase().includes(needle),
      )
      .map(toSummary);
    return { status: 'ok', provenance: this.editorialProvenance(), stations };
  }

  // ---- report (F02/F03) ----

  async getReport(slug: string): Promise<SnowReportDto | 'not-found'> {
    const s = await this.stations.findBySlug(slug);
    if (!s) return 'not-found';
    const ref: StationRef = { slug: s.slug, country: s.country, lat: s.lat, lng: s.lng };
    const now = this.clock();
    const op = await this.data.fetch('operational-status', inputFor(ref, 'operational-status', now));
    const sd = await this.data.fetch('snow-depth', inputFor(ref, 'snow-depth', now));
    const editorial = await this.editorialSourceFor(slug, op, sd);
    return assembleReport(toSummary(s), op, sd, editorial);
  }

  private async editorialSourceFor(
    slug: string,
    op: ProviderResult<OperationalStatus>,
    sd: ProviderResult<SnowDepthReport>,
  ): Promise<EditorialSourceDto | undefined> {
    const cameFromEditorial =
      (op.status === 'ok' || op.status === 'stale' || op.status === 'no_data') && op.provenance.source === 'editorial-report' ||
      (sd.status === 'ok' || sd.status === 'stale' || sd.status === 'no_data') && sd.provenance.source === 'editorial-report';
    if (!cameFromEditorial) return undefined;
    const report = await this.reports.latestPublishedForStation(slug, this.clock());
    if (!report) return undefined;
    return { sourceUrl: report.sourceUrl, author: report.author, capturedAt: report.capturedAt, confidence: report.confidence };
  }

  // ---- forecast / avalanche (degradan a not_configured sin credencial) ----

  async getForecast(slug: string): Promise<ProviderResult<ForecastBundle> | 'not-found'> {
    const ref = await this.stationRef(slug);
    if (!ref) return 'not-found';
    return this.data.fetch('forecast', inputFor(ref, 'forecast', this.clock()));
  }

  async getAvalanche(): Promise<ProviderResult<AvalancheBulletin>> {
    const ref: StationRef = { slug: 'es', country: 'ES', lat: 42.5, lng: 0.0 };
    return this.data.fetch('avalanche', inputFor(ref, 'avalanche', this.clock()));
  }

  // ---- webcams (F09): image está bloqueado; solo enlaces editoriales ----

  async getWebcams(slug: string): Promise<{ status: 'blocked'; reason: NoDataReason; provenance: ProvenanceDto; grants: readonly ImageGrant[] }> {
    void slug;
    const now = this.clock();
    const prov = makeProvenance(
      'editorial-report',
      'blocked',
      now.toISOString(),
      null,
      now,
      authorizationFor('editorial-report'),
      null,
      'degraded',
    );
    return { status: 'blocked', reason: 'license-prohibits', provenance: toProvenanceDto(prov), grants: [] };
  }

  // ---- rankings (F12/F13) ----

  async rankingNieve(): Promise<{ status: 'ok' | 'no_data'; reason?: NoDataReason; provenance: ProvenanceDto; ranking: readonly { stationSlug: string; baseCm: number }[] }> {
    const reports = await this.reports.listPublished(this.clock());
    const ranking = reports
      .filter((r) => r.snow?.baseCm !== null && r.snow?.baseCm !== undefined)
      .map((r) => ({ stationSlug: r.stationSlug, baseCm: r.snow!.baseCm as number }))
      .sort((a, b) => b.baseCm - a.baseCm);
    return ranking.length === 0
      ? { status: 'no_data', reason: 'outside-season', provenance: this.editorialProvenance(), ranking: [] }
      : { status: 'ok', provenance: this.editorialProvenance(), ranking };
  }

  async rankingKm(): Promise<{ status: 'ok' | 'no_data'; reason?: NoDataReason; provenance: ProvenanceDto; ranking: readonly { stationSlug: string; kmOpen: number }[] }> {
    const reports = await this.reports.listPublished(this.clock());
    const ranking = reports
      .filter((r) => r.operational?.kmOpen !== null && r.operational?.kmOpen !== undefined)
      .map((r) => ({ stationSlug: r.stationSlug, kmOpen: r.operational!.kmOpen as number }))
      .sort((a, b) => b.kmOpen - a.kmOpen);
    return ranking.length === 0
      ? { status: 'no_data', reason: 'outside-season', provenance: this.editorialProvenance(), ranking: [] }
      : { status: 'ok', provenance: this.editorialProvenance(), ranking };
  }

  // ---- season dates (F14) ----

  async seasonDates(): Promise<{ status: 'ok'; provenance: ProvenanceDto; dates: readonly { slug: string; name: string; seasonOpen: string | null; seasonClose: string | null; confirmed: boolean }[] }> {
    const all = await this.stations.list();
    return {
      status: 'ok',
      provenance: this.editorialProvenance(),
      dates: all.map((s) => ({
        slug: s.slug,
        name: s.name,
        seasonOpen: s.seasonOpen,
        seasonClose: s.seasonClose,
        confirmed: s.seasonConfirmed,
      })),
    };
  }

  // ---- admin (F23) ----

  async createReport(body: unknown): Promise<{ ok: true; report: SnowReport } | { ok: false; errors: readonly EditorialValidationError[] }> {
    const parsed = parseNewReportInput(body);
    if (!parsed.ok) return { ok: false, errors: parsed.errors };
    const input = parsed.input;
    const report: SnowReport = {
      id: randomUUID(),
      stationSlug: input.stationSlug,
      observedAt: input.observedAt,
      capturedAt: this.clock().toISOString(),
      sourceUrl: input.sourceUrl,
      author: input.author,
      confidence: input.confidence,
      operational: input.operational ?? null,
      snow: input.snow ?? null,
      avalancheLevel: input.avalancheLevel ?? null,
      mood: input.mood ?? 'published',
    };
    await this.reports.insert(report);
    return { ok: true, report };
  }

  async listReports(): Promise<readonly SnowReport[]> {
    return this.reports.listAll();
  }

  // ---- config / telemetry (admin) ----

  config(): {
    providers: ReadonlyArray<{ id: ProviderId; configured: boolean; missingEnv: readonly string[] }>;
    breaker: ReadonlyArray<{ id: ProviderId; open: boolean; failures: number }>;
    rateLimits: Readonly<Record<string, { requestsPerMinute: number; verified: boolean }>>;
  } {
    const providers = ENV_GATED.map(({ id, env }) => requireEnv(id, env));
    const rateLimits: Record<string, { requestsPerMinute: number; verified: boolean }> = {};
    for (const [id, rl] of Object.entries(RATE_LIMITS)) {
      if (rl) rateLimits[id] = { requestsPerMinute: rl.requestsPerMinute, verified: rl.verified };
    }
    return { providers, breaker: this.data.breakerSnapshot(), rateLimits };
  }

  /** 404 con cuerpo en forma de procedencia (C23 / 02 §3.2). */
  notFound(): { status: 'not_found'; provenance: ProvenanceDto } {
    return { status: 'not_found', provenance: this.editorialProvenance() };
  }

  private editorialProvenance(): ProvenanceDto {
    const now = this.clock();
    return toProvenanceDto(
      makeProvenance(
        'editorial-stations',
        'allowed',
        now.toISOString(),
        now.toISOString(),
        now,
        authorizationFor('editorial-stations'),
        null,
      ),
    );
  }

  private async stationRef(slug: string): Promise<StationRef | null> {
    const s = await this.stations.findBySlug(slug);
    if (!s) return null;
    return { slug: s.slug, country: s.country, lat: s.lat, lng: s.lng };
  }
}

function inputFor(ref: StationRef, dataType: SnowDataType, requestedAt: Date): ProviderInput {
  return { stationRef: ref, dataType, requestedAt };
}

function toSummary(s: {
  slug: string;
  name: string;
  country: 'ES' | 'AD' | 'FR' | 'PT';
  region: string;
  lat: number;
  lng: number;
  altitudeBaseM: number | null;
  altitudeTopM: number | null;
  website: string | null;
  discipline: 'alpine' | 'nordic';
}): StationSummary {
  return {
    slug: s.slug,
    name: s.name,
    country: s.country,
    region: s.region,
    lat: s.lat,
    lng: s.lng,
    altitudeBaseM: s.altitudeBaseM,
    altitudeTopM: s.altitudeTopM,
    website: s.website,
    discipline: s.discipline,
  };
}

export function assembleReport(
  station: StationSummary,
  op: ProviderResult<OperationalStatus>,
  sd: ProviderResult<SnowDepthReport>,
  editorial?: EditorialSourceDto,
): SnowReportDto {
  const operational = op.status === 'ok' || op.status === 'stale' ? op.data : null;
  const snow = sd.status === 'ok' || sd.status === 'stale' ? sd.data : null;
  const noDataFields: (keyof ReportPayload)[] = [];
  if (operational === null) noDataFields.push('operational');
  if (snow === null) noDataFields.push('snow');
  const { status, reason } = deriveReportStatus(op, sd);
  const prov = op.status === 'ok' || op.status === 'stale' ? op.provenance : sd.provenance;
  const base: SnowReportDto = {
    station,
    report: { operational, snow, noDataFields },
    provenance: toProvenanceDto(prov),
    status,
    ...(reason ? { reason } : {}),
  };
  if (!editorial) return base;
  return {
    ...base,
    sourceUrl: editorial.sourceUrl,
    author: editorial.author,
    capturedAt: editorial.capturedAt,
    confidence: editorial.confidence,
  };
}

function deriveReportStatus(
  op: ProviderResult<OperationalStatus>,
  sd: ProviderResult<SnowDepthReport>,
): { status: SnowReportDto['status']; reason?: NoDataReason } {
  const has = (r: ProviderResult<unknown>): boolean => r.status === 'ok' || r.status === 'stale';
  const anyStale = op.status === 'stale' || sd.status === 'stale';
  if (has(op) || has(sd)) return { status: anyStale ? 'stale' : 'ok' };
  if (op.status === 'not_configured' || sd.status === 'not_configured') return { status: 'not_configured', reason: 'not-covered' };
  if (op.status === 'blocked' || sd.status === 'blocked') return { status: 'blocked', reason: 'license-prohibits' };
  const reason: NoDataReason | undefined =
    op.status === 'no_data' && op.reason ? op.reason : sd.status === 'no_data' && sd.reason ? sd.reason : undefined;
  return { status: 'no_data', reason };
}
