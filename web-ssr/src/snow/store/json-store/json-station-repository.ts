import type { Station } from '../../models/station';
import type { StationPage, StationQuery, StationRepositoryV2 } from '../repository-v2';
import { COLLECTIONS } from './file-io';
import {
  TypedCollection,
  requireBoolean,
  requireNullableNumber,
  requireNullableString,
  requireNumber,
  requireString,
  type EntityObject,
} from './typed-collection';

const MAX_PAGE_SIZE = 100;
const COUNTRIES = ['ES', 'AD', 'FR', 'PT'] as const;
const DISCIPLINES = ['alpine', 'nordic'] as const;

type Country = (typeof COUNTRIES)[number];
type Discipline = (typeof DISCIPLINES)[number];

/**
 * Normaliza para búsqueda: minúsculas y sin diacríticos. Se usa para `q` y para
 * ordenar; NO se persiste (el dato guardado conserva su grafía).
 */
export function normalizeSearchText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isCountry(v: string): v is Country {
  return (COUNTRIES as readonly string[]).includes(v);
}

function isDiscipline(v: string): v is Discipline {
  return (DISCIPLINES as readonly string[]).includes(v);
}

/**
 * Comprueba la FORMA persistida y proyecta al dominio, preservando `null`.
 *
 * Tolerancia de MIGRACIÓN (v1 → v2): los ficheros v1 reales no siempre traen
 * todos los campos opcionales (p. ej. `editorial.test.ts` escribe estaciones sin
 * `discipline`, y un `stations.json` antiguo puede no tener temporada). Un campo
 * OPCIONAL ausente se resuelve con el valor por defecto del contrato y NUNCA
 * convierte una ausencia en 0:
 *   - `altitudeBaseM/altitudeTopM/website/seasonOpen/seasonClose` ausentes ⇒ `null`
 *   - `seasonConfirmed` ausente ⇒ `false`
 *   - `discipline` ausente ⇒ `'alpine'` (valor por defecto del contrato: la
 *     estación alpina es el caso base; no se infiere de la altitud).
 * Un campo OBLIGATORIO (slug/name/country/region/lat/lng) ausente o de tipo
 * erróneo SÍ lanza: el fichero está corrupto y no se "repara" inventando.
 */
function shapeStation(e: EntityObject, collection: string, id: string): Station {
  const country = requireString(e, 'country', collection, id);
  if (!isCountry(country)) throw new Error(`${collection}#${id}: country inválido '${country}'`);
  const disciplineRaw = e['discipline'];
  let discipline: Discipline = 'alpine';
  if (disciplineRaw !== undefined) {
    const value = requireString(e, 'discipline', collection, id);
    if (!isDiscipline(value)) throw new Error(`${collection}#${id}: discipline inválida '${value}'`);
    discipline = value;
  }
  return {
    slug: requireString(e, 'slug', collection, id),
    name: requireString(e, 'name', collection, id),
    country,
    region: requireString(e, 'region', collection, id),
    lat: requireNumber(e, 'lat', collection, id),
    lng: requireNumber(e, 'lng', collection, id),
    // Ausencia de altitud/website/temporada = null, jamás 0.
    altitudeBaseM: requireNullableNumber(e, 'altitudeBaseM', collection, id),
    altitudeTopM: requireNullableNumber(e, 'altitudeTopM', collection, id),
    website: requireNullableString(e, 'website', collection, id),
    discipline,
    seasonOpen: requireNullableString(e, 'seasonOpen', collection, id),
    seasonClose: requireNullableString(e, 'seasonClose', collection, id),
    seasonConfirmed: e['seasonConfirmed'] === undefined ? false : requireBoolean(e, 'seasonConfirmed', collection, id),
  };
}

function toRecord(s: Station): EntityObject {
  return {
    slug: s.slug,
    name: s.name,
    country: s.country,
    discipline: s.discipline,
    region: s.region,
    lat: s.lat,
    lng: s.lng,
    altitudeBaseM: s.altitudeBaseM,
    altitudeTopM: s.altitudeTopM,
    website: s.website,
    seasonOpen: s.seasonOpen,
    seasonClose: s.seasonClose,
    seasonConfirmed: s.seasonConfirmed,
  };
}

/**
 * Maestro editorial en el almacén v2 (`stations.json`).
 *
 * Compatibilidad v1 intacta: si el fichero es v1 (`records` = `Station[]`) se
 * migra EN MEMORIA en la lectura; la primera escritura lo pasa a v2 con los ids
 * internos asignados. `Station` no gana campos: el id interno vive en el
 * envoltorio del almacén (se consulta con `findIdBySlug`).
 */
export class JsonStationRepository implements StationRepositoryV2 {
  private readonly stations: TypedCollection<Station>;

  constructor(private readonly dir: string) {
    this.stations = new TypedCollection<Station>(dir, COLLECTIONS.stations, shapeStation);
  }

  async list(): Promise<readonly Station[]> {
    return this.stations.all().map((x) => x.value);
  }

  async findBySlug(slug: string): Promise<Station | null> {
    const hit = this.bySlug(slug);
    return hit ? hit.value : null;
  }

  async findIdBySlug(slug: string): Promise<string | null> {
    const hit = this.bySlug(slug);
    return hit ? hit.id : null;
  }

  private bySlug(slug: string): { id: string; value: Station } | null {
    return this.stations.find((e) => e['slug'] === slug)[0] ?? null;
  }

  async listRegions(): Promise<readonly string[]> {
    const regions = new Set<string>();
    for (const s of await this.list()) regions.add(s.region);
    return [...regions].sort((a, b) => normalizeSearchText(a).localeCompare(normalizeSearchText(b)));
  }

  async search(query: StationQuery): Promise<StationPage> {
    const pageSize = Math.min(Math.max(1, Math.trunc(query.pageSize ?? 50)), MAX_PAGE_SIZE);
    const page = Math.max(1, Math.trunc(query.page ?? 1));
    const q = query.q === undefined ? null : normalizeSearchText(query.q.trim());
    const region = query.region === undefined ? null : normalizeSearchText(query.region.trim());

    const filtered = (await this.list()).filter((s) => {
      if (query.country !== undefined && s.country !== query.country) return false;
      if (query.discipline !== undefined && s.discipline !== query.discipline) return false;
      if (region !== null && normalizeSearchText(s.region) !== region) return false;
      if (q !== null && q.length > 0) {
        const hay = [s.name, s.slug, s.region].map(normalizeSearchText).join(' ');
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const key = query.sort ?? 'name';
    const dir = query.sortDir === 'desc' ? -1 : 1;
    const value = (s: Station): string | number | null => {
      if (key === 'altitudeBaseM') return s.altitudeBaseM;
      if (key === 'altitudeTopM') return s.altitudeTopM;
      if (key === 'region') return normalizeSearchText(s.region);
      if (key === 'slug') return s.slug;
      return normalizeSearchText(s.name);
    };
    // `null` ordena SIEMPRE al final, asc o desc: el null no es un valor bajo.
    const sorted = [...filtered].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });

    const start = (page - 1) * pageSize;
    return { items: sorted.slice(start, start + pageSize), total: sorted.length, page, pageSize };
  }

  async upsert(s: Station): Promise<void> {
    this.stations.upsertByKey(toRecord(s));
  }
}
