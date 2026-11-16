import type { OperationalStatus, SnowDepthReport } from '../../contracts/data-type-map';
import type { SnowReport } from '../../models/snow-report';
import type { SnowReportRepositoryV2 } from '../repository-v2';
import { COLLECTIONS } from './file-io';
import {
  TypedCollection,
  isRecordObject,
  requireBoolean,
  requireNullableNumber,
  requireNumber,
  requireString,
  type EntityObject,
} from './typed-collection';

const MOODS = ['draft', 'pending', 'published', 'rejected'] as const;

function optionalObject(e: EntityObject, key: string): Readonly<Record<string, unknown>> | null {
  const v = e[key];
  return isRecordObject(v) ? v : null;
}

function shapeSnowReport(e: EntityObject, collection: string, id: string): SnowReport {
  const mood = requireString(e, 'mood', collection, id);
  const moodTyped = (MOODS as readonly string[]).includes(mood) ? (mood as SnowReport['mood']) : null;
  if (moodTyped === null) throw new Error(`${collection}#${id}: mood inválido '${mood}'`);
  const operationalRaw = optionalObject(e, 'operational');
  const snowRaw = optionalObject(e, 'snow');
  // La ausencia de carga NO se materializa como cifras 0: es null.
  const operational: OperationalStatus | null = operationalRaw === null ? null : (operationalRaw as unknown as OperationalStatus);
  const snow: SnowDepthReport | null = snowRaw === null ? null : (snowRaw as unknown as SnowDepthReport);
  return {
    // `SnowReport.id` (UUID del parte) sigue siendo la identidad de dominio; el
    // id interno del almacén no se mezcla con él.
    id: e['id'] === undefined ? id : requireString(e, 'id', collection, id),
    stationSlug: requireString(e, 'stationSlug', collection, id),
    observedAt: requireString(e, 'observedAt', collection, id),
    capturedAt: requireString(e, 'capturedAt', collection, id),
    sourceUrl: requireString(e, 'sourceUrl', collection, id),
    author: requireString(e, 'author', collection, id),
    confidence: requireNumber(e, 'confidence', collection, id),
    operational,
    snow,
    avalancheLevel: requireNullableNumber(e, 'avalancheLevel', collection, id),
    mood: moodTyped,
  };
}

function toRecord(r: SnowReport): EntityObject {
  return {
    id: r.id,
    stationSlug: r.stationSlug,
    observedAt: r.observedAt,
    capturedAt: r.capturedAt,
    sourceUrl: r.sourceUrl,
    author: r.author,
    confidence: r.confidence,
    operational: r.operational,
    snow: r.snow,
    avalancheLevel: r.avalancheLevel,
    mood: r.mood,
  };
}

/**
 * Partes editoriales en el almacén v2 (`snow-reports.json`).
 *
 * REGLA (R3, reparación): la VISIBILIDAD de un parte la decide su MOTIVO DE
 * PUBLICACIÓN (`mood === 'published'`), NUNCA el reloj. Antes se descartaban los
 * partes con `observedAt` posterior al reloj del servidor, y un operador con la
 * hora adelantada (o un servidor con la hora atrasada) dejaba invisible todo
 * parte recién transcrito: `/report` servía el viejo, y `/rankings/nieve` y
 * `/stations` caían a `no_data` aunque el parte existiera.
 *
 * La frescura la decide ÚNICAMENTE `editorialFreshness(observedAt, capturedAt,
 * now)` (`server/station-query.ts`): age = now − max(observedAt, capturedAt),
 * `live` ≤ 30 min, y un instante futuro cuenta como `stale`. Es INFORMATIVA
 * (`status`), no filtra: un parte `stale` sigue publicándose y rotulándose.
 *
 * El parámetro `at` se conserva por compatibilidad de la interfaz v1 (reloj del
 * llamador). El `id` interno del almacén y el UUID del parte son ambos
 * buscables por `findById`.
 */
export class JsonSnowReportRepository implements SnowReportRepositoryV2 {
  private readonly reports: TypedCollection<SnowReport>;

  constructor(private readonly dir: string) {
    this.reports = new TypedCollection<SnowReport>(dir, COLLECTIONS.snowReports, shapeSnowReport);
  }

  async listAll(): Promise<readonly SnowReport[]> {
    return this.reports.all().map((x) => x.value);
  }

  /**
   * Publicados = `mood:'published'`, sin mirar el reloj. `at` se acepta y se
   * ignora a propósito (ver la regla de la clase).
   */
  async listPublished(at: Date): Promise<readonly SnowReport[]> {
    void at;
    return (await this.listAll()).filter((r) => r.mood === 'published');
  }

  /** El publicado más reciente por `observedAt` (mismo criterio: motivo, no reloj). */
  async latestPublishedForStation(stationSlug: string, at: Date): Promise<SnowReport | null> {
    const match = (await this.listPublished(at))
      .filter((r) => r.stationSlug === stationSlug)
      .sort((a, b) => Date.parse(b.observedAt) - Date.parse(a.observedAt));
    return match[0] ?? null;
  }

  async findById(id: string): Promise<SnowReport | null> {
    const internal = this.reports.get(id);
    if (internal) return internal.value;
    const byDomainId = this.reports.findByKey(id);
    return byDomainId ? byDomainId.value : null;
  }

  async insert(r: SnowReport): Promise<void> {
    // Un parte se identifica por su id de dominio (UUID) = clave lógica: un
    // reintento del mismo parte no crea un duplicado.
    this.reports.upsertByKey(toRecord(r));
  }
}
