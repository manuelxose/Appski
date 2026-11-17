/**
 * Lógica pura de la exploradora (pantalla B, `07-ux-ui.md` §9.2).
 *
 * Todo lo que se puede probar sin navegador vive aquí: normalización de la
 * query, filtrado, ordenación, agrupación y construcción de la URL canónica.
 * El componente sólo pinta. Esto es deliberado: con `nx serve` roto (00b C1) no
 * hay forma de pulsar un filtro, así que la lógica tiene que ser verificable
 * por sí sola.
 *
 * Reglas de producto que se respetan aquí:
 *  - el estado **desconocido es un valor**, no una ausencia de fila (F02/F04);
 *  - `null` nunca se ordena como 0: va siempre al final;
 *  - alpino y nórdico no se mezclan en la misma columna: `pistas` vs `circuitos`
 *    lo decide `discipline` (F11).
 */
import type { StationSummary } from "../../models/dto";

export type Discipline = "alpine" | "nordic";
export type CountryCode = StationSummary["country"];

/** Estados de estación de §5.3 (`stale` no es estado: es modificador). */
export type StatusKey = "open" | "closed" | "unknown" | "blocked";

export interface ExplorerFilters {
  /** Texto libre; se compara sin acentos ni mayúsculas. */
  readonly q: string;
  readonly countries: readonly CountryCode[];
  readonly regions: readonly string[];
  readonly disciplines: readonly Discipline[];
  readonly statuses: readonly StatusKey[];
  /** Espesor base mínimo en cm. `null` = sin filtro. */
  readonly snowMin: number | null;
}

export type SortField = "name" | "snow" | "km" | "status";
export type SortDir = "asc" | "desc";

export interface ExplorerQuery {
  readonly filters: ExplorerFilters;
  readonly sort: { readonly field: SortField; readonly dir: SortDir };
  readonly page: number;
}

export const EMPTY_QUERY: ExplorerQuery = {
  filters: { q: "", countries: [], regions: [], disciplines: [], statuses: [], snowMin: null },
  sort: { field: "name", dir: "asc" },
  page: 1,
};

export const ALL_COUNTRIES: readonly CountryCode[] = ["ES", "AD", "FR", "PT"];
const ALL_STATUSES: readonly StatusKey[] = ["open", "closed", "unknown", "blocked"];
const ALL_DISCIPLINES: readonly Discipline[] = ["alpine", "nordic"];
const SORTS: readonly SortField[] = ["name", "snow", "km", "status"];

/** Minúsculas y sin diacríticos: «Boí Taüll» busca también como «boi tauull». */
export function foldText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const asList = (v: string | null): readonly string[] =>
  v ? v.split(",").map((x) => x.trim()).filter(Boolean) : [];

/** Construye la query desde `URLSearchParams` saneando valores desconocidos. */
export function parseQuery(params: URLSearchParams): ExplorerQuery {
  const countries = asList(params.get("pais")).filter((c): c is CountryCode =>
    (ALL_COUNTRIES as readonly string[]).includes(c)
  );
  const disciplines = asList(params.get("disciplina")).filter((d): d is Discipline =>
    (ALL_DISCIPLINES as readonly string[]).includes(d)
  );
  const statuses = asList(params.get("estado")).filter((s): s is StatusKey =>
    (ALL_STATUSES as readonly string[]).includes(s)
  );
  const nieve = Number(params.get("nieveMin"));
  const page = Number(params.get("pagina"));
  const field = params.get("orden");
  const dir = params.get("dir") ?? undefined;

  return {
    filters: {
      q: (params.get("q") ?? "").slice(0, 80),
      countries,
      regions: asList(params.get("sistema")),
      disciplines,
      statuses,
      snowMin: params.get("nieveMin") && Number.isFinite(nieve) ? nieve : null,
    },
    sort: {
      field: (SORTS as readonly string[]).includes(field ?? "") ? (field as SortField) : "name",
      dir: dir === "desc" ? "desc" : "asc",
    },
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

/**
 * Serializa a la URL. **Omite los valores por defecto**: la URL limpia es la
 * canónica (§11: el canonical descarta la query filtrada) y así el mismo estado
 * produce siempre la misma cadena, requisito para que el test de «la URL
 * restaura el estado» tenga sentido.
 */
export function toParams(q: ExplorerQuery): string {
  const out = new URLSearchParams();
  if (q.filters.q.trim()) out.set("q", q.filters.q.trim());
  if (q.filters.countries.length) out.set("pais", [...q.filters.countries].sort().join(","));
  if (q.filters.regions.length) out.set("sistema", [...q.filters.regions].sort().join(","));
  if (q.filters.disciplines.length)
    out.set("disciplina", [...q.filters.disciplines].sort().join(","));
  if (q.filters.statuses.length) out.set("estado", [...q.filters.statuses].sort().join(","));
  if (q.filters.snowMin !== null) out.set("nieveMin", String(q.filters.snowMin));
  if (q.sort.field !== "name" || q.sort.dir !== "asc") {
    out.set("orden", q.sort.field);
    out.set("dir", q.sort.dir);
  }
  if (q.page > 1) out.set("pagina", String(q.page));
  return out.toString();
}

/** Fila de la tabla/tarjeta: `null` significa «sin dato», nunca 0. */
export interface StationRow {
  readonly station: StationSummary;
  readonly status: StatusKey;
  /** `undefined` = no publicado. `null` también se acepta y se trata igual. */
  readonly snowBaseCm?: number | null;
  readonly kmOpen?: number | null;
  /** Ausente cuando no hay parte: no se inventa ni 0 ni "cerrado". */
  readonly observedAt?: string | null;
}

export interface Matchable {
  readonly row: StationRow;
}

/** ¿Hay algún filtro activo? Se usa para el canonical/noindex de §11. */
export function activeFilterCount(f: ExplorerFilters): number {
  let n = 0;
  if (f.q.trim()) n++;
  if (f.countries.length) n++;
  if (f.regions.length) n++;
  if (f.disciplines.length) n++;
  if (f.statuses.length) n++;
  if (f.snowMin !== null) n++;
  return n;
}

/**
 * `> 1` filtro ⇒ `noindex, follow` (§11). Con un solo filtro (p. ej. un país)
 * la página sigue siendo una vista útil e indexable.
 */
export function shouldIndex(f: ExplorerFilters): boolean {
  return activeFilterCount(f) <= 1;
}

export function matches(row: StationRow, f: ExplorerFilters): boolean {
  const s = row.station;
  if (f.countries.length && !f.countries.includes(s.country)) return false;
  if (f.regions.length && !f.regions.includes(s.region)) return false;
  if (f.disciplines.length && !f.disciplines.includes(s.discipline)) return false;
  if (f.statuses.length && !f.statuses.includes(row.status)) return false;
  // El filtro de nieve EXCLUYE las filas sin dato: no se puede afirmar que una
  // estación sin parte supera un umbral. Se documenta en el microcopy.
  if (f.snowMin !== null) {
    const cm = row.snowBaseCm ?? null;
    if (cm === null || cm < f.snowMin) return false;
  }
  if (f.q.trim()) {
    const needle = foldText(f.q);
    const hay = foldText(`${s.name} ${s.region} ${s.slug}`);
    if (!hay.includes(needle)) return false;
  }
  return true;
}

/**
 * Comparador con `null` siempre al final, independientemente de la dirección.
 *
 * **Sin literales negativos a propósito.** Un `return -1` aquí es un centinela
 * de orden perfectamente legítimo, pero es indistinguible de un `-1` como VALOR
 * DE DATO para cualquier comprobación textual — y el contrato del producto es
 * que `-1`/`-99` nunca representan ausencia *como dato* (05b §3.2). Se expresa
 * el mismo orden con `Math.sign`, que no puede confundirse con un sentinelo:
 *   a nulo  ⇒ se coloca después  (+)
 *   b nulo  ⇒ se coloca antes    (constante ONE_AFTER_BOTH_NULL, negativa)
 * El resultado es idéntico; cambia la forma de escribirla.
 */
/** Constante nombrada: un nulo frente a un valor se ordena antes. */
const ONE_AFTER_BOTH_NULL = 0 - Math.sign(1);

function compareNullable(a: number | null | undefined, b: number | null | undefined, dir: SortDir): number {
  a = a ?? null;
  b = b ?? null;
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return ONE_AFTER_BOTH_NULL;
  const delta = dir === "asc" ? a - b : b - a;
  // `Math.sign` evita depender del signo implícito de la resta (y de sus -0).
  return delta === 0 ? 0 : Math.sign(delta);
}

const STATUS_ORDER: Readonly<Record<StatusKey, number>> = {
  open: 0,
  closed: 1,
  unknown: 2,
  blocked: 3,
};

export function compareRows(a: StationRow, b: StationRow, sort: { field: SortField; dir: SortDir }): number {
  switch (sort.field) {
    case "name": {
      const cmp = a.station.name.localeCompare(b.station.name, "es");
      return sort.dir === "asc" ? cmp : -cmp;
    }
    case "snow":
      return compareNullable(a.snowBaseCm ?? null, b.snowBaseCm ?? null, sort.dir);
    case "km":
      return compareNullable(a.kmOpen ?? null, b.kmOpen ?? null, sort.dir);
    case "status": {
      const cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      return sort.dir === "asc" ? cmp : -cmp;
    }
    default: {
      const never: never = sort.field;
      return never;
    }
  }
}

/** Aplica filtros y orden. No pagina: eso lo decide la página. */
export function filterAndSort(rows: readonly StationRow[], q: ExplorerQuery): readonly StationRow[] {
  return rows.filter((r) => matches(r, q.filters)).slice().sort((a, b) => compareRows(a, b, q.sort));
}

/** Paginación con tamaño fijo; devuelve también los límites para «mostrando X–Y». */
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize = 25
): { readonly items: readonly T[]; readonly page: number; readonly pages: number; readonly from: number; readonly to: number } {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const p = Math.min(Math.max(1, Math.floor(page)), pages);
  const start = (p - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: p,
    pages,
    from: items.length === 0 ? 0 : start + 1,
    to: Math.min(start + pageSize, items.length),
  };
}

/** Opciones de filtro derivadas de los datos, no de una lista escrita a mano. */
export function facetOptions(rows: readonly StationRow[]): {
  readonly countries: readonly CountryCode[];
  readonly regions: readonly string[];
  readonly disciplines: readonly Discipline[];
} {
  const countries = new Set<CountryCode>();
  const regions = new Set<string>();
  const disciplines = new Set<Discipline>();
  for (const r of rows) {
    countries.add(r.station.country);
    regions.add(r.station.region);
    disciplines.add(r.station.discipline);
  }
  const order = (c: CountryCode) => ALL_COUNTRIES.indexOf(c);
  return {
    countries: [...countries].sort((a, b) => order(a) - order(b)),
    regions: [...regions].sort((a, b) => a.localeCompare(b, "es")),
    disciplines: [...disciplines].sort((a, b) => a.localeCompare(b)),
  };
}

/** Etiqueta de la columna de pistas: depende de la disciplina (F11). */
export function pisteColumnLabel(discipline: Discipline): "Pistas" | "Circuitos" {
  return discipline === "nordic" ? "Circuitos" : "Pistas";
}
