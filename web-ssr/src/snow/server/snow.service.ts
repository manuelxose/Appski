import { randomUUID } from 'node:crypto';
import type {
  AvalancheBulletin,
  ForecastBundle,
  ImageGrant,
  OperationalStatus,
  SnowDepthReport,
  WeatherAlertBundle,
  WeatherAlertItem,
} from '../contracts/data-type-map';
import type {
  NoDataReason,
  ProviderAdapter,
  ProviderId,
  ProviderInput,
  ProviderResult,
  StationRef,
  SnowDataType,
} from '../contracts/provider-contracts';
import type {
  AlertsDto,
  ConfigDto,
  EditorialSourceDto,
  ProvenanceDto,
  ReportPayload,
  SnowReportDto,
  SourceEffect,
  SourceStatusDto,
  StationDetailDto,
  StationListDto,
  PaginationDto,
} from '../models/dto';
import type { SnowReport } from '../models/snow-report';
import type { Station, StationSummary } from '../models/station';
import {
  parseNewReportInput,
  parseStationUpsert,
  type EditorialValidationError,
  type SnowReportRepository,
  type StationRepository,
} from '../store/repository';
import { SnowDataService } from '../chain/chain';
import { FALLBACK_CHAINS } from '../chain/fallback-chains';
import { requireEnv } from '../config/env';
import { RATE_LIMITS } from '../cache/rate-limit';
import { buildCoverageReport, type ProviderRuntimeState } from '../cache/coverage-metrics';
import { authorizationFor, attributionFor, METEOALARM_DISCLAIMER, METEOALARM_SOURCE_URL } from '../providers/authorizations';
import { BLOCKED_PROVIDER_IDS, isBlockedProvider } from '../providers/blocked-providers';
import { makeProvenance } from '../providers/provenance';
import { toProvenanceDto } from './http-mapping';
import { systemClock, type Clock } from './clock';
import {
  applyStationQuery,
  defaultStationQuery,
  editorialFreshness,
  seasonState,
  snowObservations,
  type SnowObservation,
  type StationQuery,
} from './station-query';

/**
 * Proveedores automáticos que dependen de credencial/config. Son los que
 * `GET /v1/config` informa con `configured`/`missingEnv`. Los editoriales no
 * figuran aquí porque no necesitan credencial: su estado siempre es "sirve".
 */
const ENV_GATED: ReadonlyArray<{ id: ProviderId; env: readonly string[] }> = [
  { id: 'aemet', env: ['AEMET_API_KEY'] },
  { id: 'aemet-bpa', env: ['AEMET_API_KEY'] },
  { id: 'meteofrance', env: ['METEOFRANCE_API_KEY'] },
  { id: 'copernicus-c3s', env: ['C3S_API_KEY'] },
  { id: 'copernicus-clms', env: ['CLMS_API_KEY'] },
  { id: 'protomaps', env: ['PROTOMAPS_BASE_URL'] },
];

/** Tipos de dato cuyo único proveedor es externo: sin credencial degradan. */
const LIMITATIONS: ReadonlyArray<{ dataType: SnowDataType; reason: NoDataReason; detail: string }> = [
  {
    dataType: 'forecast',
    reason: 'not-covered',
    detail: 'sin AEMET_API_KEY/METEOFRANCE_API_KEY/C3S_API_KEY y sin integración cableada: /forecast responde not_configured→no_data',
  },
  {
    dataType: 'avalanche',
    reason: 'not-covered',
    detail: 'sin AEMET_API_KEY para aemet-bpa: /avalanche responde not_configured→no_data',
  },
  {
    dataType: 'weather-alert',
    reason: 'not-covered',
    detail: 'sin proveedor A1/A2 autorizado y sin integración cableada: /alerts responde not_configured→no_data con alerts=[]',
  },
  {
    dataType: 'image',
    reason: 'license-prohibits',
    detail: 'la cadena image es [] por licencia (05b §7.4): /webcams responde blocked con grants=[]',
  },
];

export class SnowService {
  constructor(
    private readonly data: SnowDataService,
    private readonly stations: StationRepository,
    private readonly reports: SnowReportRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  // ---- stations (F04/F05/F06) ----

  /** Directorio con filtros/orden/paginación validados por `parseStationQuery`. */
  async listStations(q: StationQuery = defaultStationQuery()): Promise<StationListDto> {
    const now = this.clock();
    const all = await this.stations.list();
    const published = await this.reports.listPublished(now);
    const snow = snowObservations(published, now, 'editorial-report');
    const r = applyStationQuery(all, q, snow, now);
    const pagination: PaginationDto = {
      page: r.page,
      pageSize: r.pageSize,
      total: r.total,
      totalPages: r.totalPages,
      hasNext: r.hasNext,
      hasPrev: r.hasPrev,
    };
    const filters = {
      country: q.country,
      region: q.region,
      discipline: q.discipline,
      status: q.status,
      snowMin: q.snowMin,
      sort: q.sort,
      sortDir: q.sortDir,
    };
    // Directorio vacío tras filtrar: es `no_data` con motivo, no un 200 mudo ni
    // un 0. La procedencia es la del maestro editorial y no cambia por filtrar.
    if (r.total === 0) {
      return { status: 'no_data', reason: 'not-covered', provenance: this.editorialProvenance(), stations: [], pagination, filters };
    }
    return {
      status: 'ok',
      provenance: this.editorialProvenance(),
      stations: r.pageItems.map((s) => toDetail(s, snow[s.slug] ?? null, now)),
      pagination,
      filters,
    };
  }

  async getStation(
    slug: string,
  ): Promise<{ status: 'ok'; provenance: ProvenanceDto; station: StationDetailDto } | 'not-found'> {
    const s = await this.stations.findBySlug(slug);
    if (!s) return 'not-found';
    const now = this.clock();
    const published = await this.reports.listPublished(now);
    const snow = snowObservations(published, now, 'editorial-report');
    return { status: 'ok', provenance: this.editorialProvenance(), station: toDetail(s, snow[s.slug] ?? null, now) };
  }

  async searchStations(
    q: string,
  ): Promise<{ status: 'ok' | 'no_data'; reason?: NoDataReason; provenance: ProvenanceDto; stations: readonly StationDetailDto[] }> {
    const now = this.clock();
    const needle = q.trim().toLowerCase();
    const all = await this.stations.list();
    const published = await this.reports.listPublished(now);
    const snow = snowObservations(published, now, 'editorial-report');
    const stations = all
      .filter(
        (s) =>
          needle.length === 0 ||
          s.name.toLowerCase().includes(needle) ||
          s.region.toLowerCase().includes(needle) ||
          s.slug.toLowerCase().includes(needle),
      )
      .map((s) => toDetail(s, snow[s.slug] ?? null, now));
    // Sin coincidencias no es un error HTTP ni un array vacío sin explicación: es
    // `no_data` con motivo (la procedencia ya dice que el maestro respondió).
    if (stations.length === 0) {
      return { status: 'no_data', reason: 'not-covered', provenance: this.editorialProvenance(), stations: [] };
    }
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
    return assembleReport(toSummary(s), op, sd, editorial, now);
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

  /**
   * Alertas meteorológicas de una estación (GAP cerrado en SNOW-02 §4.1 fila 5).
   *
   * Sin proveedor A1/A2 (AEMET/Météo-France) el borde NO tiene avisos que
   * ofrecer: devuelve `not_configured` (con `reason: not-covered`) o `no_data`,
   * y SIEMPRE `alerts: []`. Nunca se fabrican avisos. Un aviso con la ventana de
   * validez terminada se marca `expired: true` — no se sirve como vigente.
   */
  async getAlerts(slug: string): Promise<AlertsDto | 'not-found'> {
    const ref = await this.stationRef(slug);
    if (!ref) return 'not-found';
    const now = this.clock();
    const r = await this.data.fetch('weather-alert', inputFor(ref, 'weather-alert', now));
    switch (r.status) {
      case 'ok':
      case 'stale': {
        const items = r.data.alerts.map((a) => toAlertItem(a, r.provenance, now));
        // Obligaciones LITERALES de los T&C de MeteoAlarm: si lo servido viene de
        // ese proveedor la respuesta DEBE llevar disclaimer y enlace, para que un
        // cliente pueda cumplirlos sólo con la API. Se toman del bundle que
        // resuelve el adapter; aquí sólo se aplica un respaldo por si faltara.
        const legal =
          r.provenance.source === 'meteoalarm'
            ? {
                disclaimer: r.data.disclaimer ?? METEOALARM_DISCLAIMER,
                sourceUrl: r.data.sourceUrl ?? METEOALARM_SOURCE_URL,
              }
            : {};
        // Si TODOS los avisos han caducado no hay alerta vigente: `no_data` con
        // `source-silent`, nunca un `ok` que sugiera avisos activos.
        if (items.length === 0 || items.every((a) => a.expired)) {
          return {
            status: 'no_data',
            reason: 'source-silent',
            provenance: toProvenanceDto(r.provenance),
            alerts: items,
            ...legal,
          };
        }
        return { status: r.status, provenance: toProvenanceDto(r.provenance), alerts: items, ...legal };
      }
      case 'no_data':
        return { status: 'no_data', reason: r.reason, provenance: toProvenanceDto(r.provenance), alerts: [] };
      case 'not_configured':
        return { status: 'not_configured', reason: 'not-covered', provenance: toProvenanceDto(r.provenance), alerts: [] };
      case 'blocked':
        return { status: 'blocked', reason: 'license-prohibits', provenance: toProvenanceDto(r.provenance), alerts: [] };
      case 'rate_limited':
        return { status: 'no_data', reason: 'source-silent', provenance: toProvenanceDto(r.provenance), alerts: [] };
      case 'error':
        // El adapter declaró `error` (p. ej. credencial presente pero integración
        // no cableada). NO se disfraza de `ok` con avisos vacíos, y tampoco se
        // responde 500 (el contrato §4.3 prohíbe 500 por falta de integración):
        // es un `no_data` con motivo `source-silent` y procedencia del proveedor.
        // La causa exacta queda en el log del servidor.
        console.error(`snow alerts: provider error (${r.message})`);
        return {
          status: 'no_data',
          reason: 'source-silent',
          provenance: toProvenanceDto(r.provenance),
          alerts: [],
        };
    }
  }

  // ---- webcams (F09): image está bloqueado; solo enlaces editoriales ----

  async getWebcams(
    slug: string,
  ): Promise<{ status: 'blocked'; reason: NoDataReason; provenance: ProvenanceDto; grants: readonly ImageGrant[] } | 'not-found'> {
    // Un slug desconocido es 404 como en /report (coherencia SNOW-02 §4.1 fila 6).
    if (!(await this.stations.findBySlug(slug))) return 'not-found';
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

  async rankingNieve(): Promise<{
    status: 'ok' | 'no_data';
    reason?: NoDataReason;
    provenance: ProvenanceDto;
    ranking: readonly { stationSlug: string; baseCm: number; observedAt: string; updatedAt: string | null; status: 'live' | 'stale' }[];
  }> {
    const now = this.clock();
    const reports = await this.reports.listPublished(now);
    const ranking = latestByStation(reports)
      .filter((r) => r.snow?.baseCm !== null && r.snow?.baseCm !== undefined)
      .map((r) => ({
        stationSlug: r.stationSlug,
        baseCm: r.snow!.baseCm as number,
        observedAt: r.observedAt,
        updatedAt: r.capturedAt,
        status: freshnessStatus(r, now),
      }))
      .sort((a, b) => b.baseCm - a.baseCm);
    return ranking.length === 0
      ? { status: 'no_data', reason: 'outside-season', provenance: this.editorialProvenance(), ranking: [] }
      : { status: 'ok', provenance: this.editorialProvenance(), ranking };
  }

  async rankingKm(): Promise<{
    status: 'ok' | 'no_data';
    reason?: NoDataReason;
    provenance: ProvenanceDto;
    ranking: readonly { stationSlug: string; kmOpen: number; observedAt: string; updatedAt: string | null; status: 'live' | 'stale' }[];
  }> {
    const now = this.clock();
    const reports = await this.reports.listPublished(now);
    const ranking = latestByStation(reports)
      .filter((r) => r.operational?.kmOpen !== null && r.operational?.kmOpen !== undefined)
      .map((r) => ({
        stationSlug: r.stationSlug,
        kmOpen: r.operational!.kmOpen as number,
        observedAt: r.observedAt,
        updatedAt: r.capturedAt,
        status: freshnessStatus(r, now),
      }))
      .sort((a, b) => b.kmOpen - a.kmOpen);
    return ranking.length === 0
      ? { status: 'no_data', reason: 'outside-season', provenance: this.editorialProvenance(), ranking: [] }
      : { status: 'ok', provenance: this.editorialProvenance(), ranking };
  }

  // ---- season dates (F14) ----

  async seasonDates(): Promise<{
    status: 'ok';
    provenance: ProvenanceDto;
    dates: readonly { slug: string; name: string; seasonOpen: string | null; seasonClose: string | null; confirmed: boolean; state: 'open' | 'closed' | 'unknown' }[];
  }> {
    const now = this.clock();
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
        state: seasonState(s, now),
      })),
    };
  }

  // ---- admin (F23) ----

  async createReport(body: unknown): Promise<{ ok: true; report: SnowReport } | { ok: false; errors: readonly EditorialValidationError[] }> {
    const parsed = parseNewReportInput(body);
    if (!parsed.ok) return { ok: false, errors: parsed.errors };
    const input = parsed.input;
    // Un parte de una estación inexistente no se persiste: quedaría huérfano y
    // jamás aparecería en el borde (los rankings/directorio parten del maestro).
    if (!(await this.stations.findBySlug(input.stationSlug))) {
      return { ok: false, errors: [{ field: 'stationSlug', message: 'unknown station (not in the editorial master)' }] };
    }
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

  /**
   * Upsert del maestro editorial (SNOW-02 §4.2 fila 15). El cuerpo se valida
   * ENTERO antes de tocar el store: un rechazo no deja escritura parcial.
   * `201` si se crea, `200` si se actualiza (decisión del capitán: 200 `{ station, provenance }`).
   */
  async upsertStation(
    slug: string,
    body: unknown,
  ): Promise<
    | { ok: true; station: StationSummary; provenance: ProvenanceDto; created: boolean }
    | { ok: false; errors: readonly EditorialValidationError[] }
  > {
    const parsed = parseStationUpsert(body);
    if (!parsed.ok) return { ok: false, errors: parsed.errors };
    if (parsed.station.slug !== slug) {
      return { ok: false, errors: [{ field: 'slug', message: `must equal the path slug '${slug}'` }] };
    }
    const existed = (await this.stations.findBySlug(slug)) !== null;
    await this.stations.upsert(parsed.station);
    // La procedencia se lee DESPUÉS de escribir: describe el maestro ya guardado.
    const saved = (await this.stations.findBySlug(slug)) ?? parsed.station;
    return { ok: true, station: toSummary(saved), provenance: this.editorialProvenance(), created: !existed };
  }

  // ---- config / estado de fuentes (admin) ----

  /**
   * Estado de fuentes. `providers` enumera lo que el registro PUEDE servir hoy
   * (con credencial o sin ella), su cuota, su licencia y el efecto real sobre el
   * borde. `breaker` es el estado runtime del circuit breaker (solo proveedores
   * ya tocados). `limitations` declara las degradaciones conocidas de v1; son
   * datos, no errores.
   */
  config(): ConfigDto {
    const now = this.clock();
    const breaker = this.data.breakerSnapshot();
    const breakerByParty = new Map(breaker.map((b) => [b.id, b]));

    const rateLimits: Record<string, { requestsPerMinute: number; verified: boolean }> = {};
    for (const [id, rl] of Object.entries(RATE_LIMITS)) {
      if (rl) rateLimits[id] = { requestsPerMinute: rl.requestsPerMinute, verified: rl.verified };
    }

    const providers: SourceStatusDto[] = [
      ...ENV_GATED.map(({ id, env }) => {
        const cfg = requireEnv(id, env);
        const rl = RATE_LIMITS[id] ?? null;
        return this.sourceStatus({
          id,
          configured: cfg.configured,
          missingEnv: cfg.missingEnv,
          requiredEnv: env,
          provides: providesFor(id),
          effect: cfg.configured ? 'not-wired-in-v1' : 'not-configured',
          rateLimit: rl,
          breaker: breakerByParty.get(id),
        });
      }),
      this.sourceStatus({
        id: 'editorial-stations',
        configured: true,
        missingEnv: [],
        requiredEnv: [],
        provides: ['station-master'],
        effect: 'serves',
        rateLimit: null,
        breaker: breakerByParty.get('editorial-stations'),
      }),
      this.sourceStatus({
        id: 'editorial-report',
        configured: true,
        missingEnv: [],
        requiredEnv: [],
        provides: ['operational-status', 'snow-depth'],
        effect: 'terminal-no-data',
        rateLimit: null,
        breaker: breakerByParty.get('editorial-report'),
      }),
      // MeteoAlarm (SNOW-03): feed Atom público, SIN credencial, licencia
      // verificada en el propio feed (equivalente CC BY 4.0) ⇒ `serves`.
      this.sourceStatus({
        id: 'meteoalarm',
        configured: true,
        missingEnv: [],
        requiredEnv: [],
        provides: ['weather-alert'],
        effect: 'serves',
        rateLimit: RATE_LIMITS['meteoalarm'] ?? null,
        breaker: breakerByParty.get('meteoalarm'),
      }),
      ...BLOCKED_PROVIDER_IDS.map((id) =>
        this.sourceStatus({
          id,
          configured: false,
          missingEnv: [],
          requiredEnv: [],
          provides: [],
          effect: 'always-blocked',
          rateLimit: null,
          breaker: breakerByParty.get(id),
        }),
      ),
    ];

    return {
      status: 'ok',
      provenance: toProvenanceDto(
        makeProvenance(
          'editorial-stations',
          'allowed',
          now.toISOString(),
          now.toISOString(),
          now,
          authorizationFor('editorial-stations'),
          null,
        ),
      ),
      providers,
      breaker: breaker.map((b) => ({
        id: b.id,
        open: b.open,
        failures: b.failures,
        phase: b.phase,
        openUntil: b.openUntilMs === null ? null : new Date(b.openUntilMs).toISOString(),
      })),
      rateLimits,
      limitations: LIMITATIONS.map((l) => ({ ...l })),
      coverage: this.coverageReport(now, providers, breaker),
    };
  }

  /**
   * Cobertura MEDIDA (SNOW-03). Deriva del estado real de los proveedores; un
   * tipo de dato sólo es 'available' si algún eslabón podría servir hoy. No
   * promete cobertura ni expone nombres de variables de entorno.
   *
   * `byCountry` va a 0/0 porque `config()` es SÍNCRONO y el maestro de
   * estaciones se lee de forma asíncrona: inventar un conteo aquí sería
   * exactamente la cobertura ficticia que este hito prohíbe. El conteo real por
   * país se expone en `/v1/config` sólo cuando haya una fuente síncrona.
   */
  private coverageReport(
    now: Date,
    providers: readonly SourceStatusDto[],
    breaker: ReadonlyArray<{ id: ProviderId; phase: string; openUntilMs: number | null }>,
  ): ConfigDto['coverage'] {
    const breakerById = new Map(breaker.map((b) => [b.id, b]));
    const runtime: ProviderRuntimeState[] = providers.map((p) => {
      const b = breakerById.get(p.id as ProviderId);
      return {
        id: p.id as ProviderId,
        configured: p.configured,
        missingEnvCount: p.missingEnv.length,
        licenseStatus: p.licenseStatus as ProviderRuntimeState['licenseStatus'],
        breakerPhase: (b?.phase ?? 'closed') as ProviderRuntimeState['breakerPhase'],
        breakerOpenUntil: b?.openUntilMs == null ? null : new Date(b.openUntilMs).toISOString(),
        lastSuccessAt: null,
        lastLatencyMs: null,
        attempts: 0,
        failures: p.breaker.failures,
        stalenessSeconds: null,
      };
    });
    return buildCoverageReport({
      generatedAt: now.toISOString(),
      providers: runtime,
      stationsByCountry: {
        ES: { total: 0, withSnowData: 0 },
        AD: { total: 0, withSnowData: 0 },
        FR: { total: 0, withSnowData: 0 },
        PT: { total: 0, withSnowData: 0 },
      },
    });
  }

  private sourceStatus(input: {
    id: ProviderId;
    configured: boolean;
    missingEnv: readonly string[];
    requiredEnv: readonly string[];
    provides: readonly string[];
    effect: SourceEffect;
    rateLimit: { requestsPerMinute: number; maxConcurrent: number; verified: boolean } | null;
    breaker:
      | { id: ProviderId; open: boolean; failures: number; phase?: string; openUntilMs?: number | null }
      | undefined;
  }): SourceStatusDto {
    const auth = authorizationFor(input.id);
    const licenseStatus = isBlockedProvider(input.id)
      ? 'blocked'
      : auth.attributionRequired
        ? 'allowed-with-attribution'
        : auth.licenseId === 'blocked'
          ? 'unverified'
          : 'allowed';
    return {
      id: input.id,
      declaredInRegistry: !isBlockedProvider(input.id),
      configured: input.configured,
      missingEnv: input.missingEnv,
      requiredEnv: input.requiredEnv,
      provides: input.provides,
      dataTypes: dataTypesFor(input.id),
      breaker: {
        state: input.breaker?.open ? 'open' : 'closed',
        failures: input.breaker?.failures ?? 0,
        openUntil: null,
      },
      rateLimit: input.rateLimit
        ? {
            requestsPerMinute: input.rateLimit.requestsPerMinute,
            maxConcurrent: input.rateLimit.maxConcurrent,
            verified: input.rateLimit.verified,
          }
        : null,
      licenseStatus,
      effect: input.effect,
    };
  }

  /** 404 con cuerpo en forma de procedencia (C23 / 02 §3.2). */
  notFound(): { status: 'not_found'; provenance: ProvenanceDto } {
    return { status: 'not_found', provenance: this.editorialProvenance() };
  }

  /** Procedencia editorial del maestro: sirve para cuerpos 400 (que también la exponen). */
  editorialProvenance(): ProvenanceDto {
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

function providesFor(id: ProviderId): readonly string[] {
  const out: string[] = [];
  for (const [dt, chain] of Object.entries(FALLBACK_CHAINS)) {
    if ((chain as readonly ProviderId[]).includes(id)) out.push(dt);
  }
  return out;
}

function dataTypesFor(id: ProviderId): readonly string[] {
  return providesFor(id);
}

/**
 * R3: los rankings usan la MISMA regla de frescura editorial que el directorio
 * y /report (`editorialFreshness`). Antes había aquí una copia local que solo
 * miraba `observedAt` y teñía de `stale` un parte recién capturado.
 */
function freshnessStatus(r: SnowReport, now: Date): 'live' | 'stale' {
  return editorialFreshness(r.observedAt, r.capturedAt, now);
}

/** Último parte publicado por estación (por `observedAt`), para rankings. */
function latestByStation(reports: readonly SnowReport[]): SnowReport[] {
  const latest = new Map<string, SnowReport>();
  for (const r of reports) {
    const prev = latest.get(r.stationSlug);
    if (!prev || r.observedAt > prev.observedAt) latest.set(r.stationSlug, r);
  }
  return [...latest.values()];
}

function toAlertItem(
  a: WeatherAlertItem,
  prov: Parameters<typeof toProvenanceDto>[0],
  now: Date,
): WeatherAlertItem & { provenance: ProvenanceDto; expired: boolean } {
  const until = Date.parse(a.validUntil);
  // Un `validUntil` ilegible no se puede considerar vigente.
  const expired = !Number.isFinite(until) || until <= now.getTime();
  return { ...a, provenance: toProvenanceDto(prov), expired };
}

function inputFor(ref: StationRef, dataType: SnowDataType, requestedAt: Date): ProviderInput {
  return { stationRef: ref, dataType, requestedAt };
}

function toSummary(s: Station): StationSummary {
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

/** Proyección de directorio: maestro + estado de temporada + nieve observada (o null). */
function toDetail(s: Station, snow: SnowObservation | null, now: Date): StationDetailDto {
  return {
    ...toSummary(s),
    season: seasonState(s, now),
    snow: snow === null ? null : { ...snow },
  };
}

export function assembleReport(
  station: StationSummary,
  op: ProviderResult<OperationalStatus>,
  sd: ProviderResult<SnowDepthReport>,
  editorial?: EditorialSourceDto,
  at: Date = new Date(),
): SnowReportDto {
  const operational = op.status === 'ok' || op.status === 'stale' ? op.data : null;
  const snow = sd.status === 'ok' || sd.status === 'stale' ? sd.data : null;
  const noDataFields: (keyof ReportPayload)[] = [];
  if (operational === null) noDataFields.push('operational');
  if (snow === null) noDataFields.push('snow');
  // R3: la frescura del parte editorial la decide `editorialFreshness` sobre
  // `observedAt`/`capturedAt` (misma regla que directorio y rankings). Un parte
  // recién capturado es `live`; uno antiguo es `stale` y NUNCA se presenta `ok`.
  // Solo cuando hay parte editorial se puede evaluar la edad del dato; el estado
  // de degradación (no_data/not_configured/blocked) se conserva intacto.
  const derived = deriveReportStatus(op, sd);
  const status: SnowReportDto['status'] =
    editorial !== undefined && (derived.status === 'ok' || derived.status === 'stale')
      ? editorialFreshness(editorial.capturedAt, editorial.capturedAt, at) === 'live'
        ? 'ok'
        : 'stale'
      : derived.status;
  const reason = derived.reason;
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

/** Importado para que `WeatherAlertBundle` participe del contrato de tipos. */
export type WeatherAlertContract = WeatherAlertBundle;

/** Dispositivo tipado de que `ProviderAdapter` es la interfaz consumida. */
export type AdapterContract = ProviderAdapter;
