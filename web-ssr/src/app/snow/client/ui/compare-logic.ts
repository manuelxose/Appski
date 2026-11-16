/**
 * Lógica pura del comparador (pantalla G, capacidad **F25**, decisión U2).
 *
 * Dos cosas se demuestran aquí:
 *  1. el comparador acepta 2–3 estaciones y lo dice con un estado explícito, no
 *     con una tabla vacía o una excepción;
 *  2. una fila sin dato **no se oculta**: se compara también la ausencia, que es
 *     información (una estación sin parte frente a otra con 80 cm).
 */
import { formatMeasurement, type MeasurementUnit } from "./format-measurement";
import type { StationStatus } from "./station-status";
import type { StatusKey } from "./explorer-logic";

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 3;

export type CompareGuard =
  | { readonly ok: true; readonly slugs: readonly string[] }
  | { readonly ok: false; readonly reason: "too-few" | "too-many" | "duplicate"; readonly count: number };

/** Valida la selección; deduplica conservando el orden de llegada. */
export function guardSelection(slugs: readonly string[]): CompareGuard {
  const unique = [...new Set(slugs.filter((s) => s.trim().length > 0))];
  if (unique.length !== slugs.filter((s) => s.trim().length > 0).length) {
    return { ok: false, reason: "duplicate", count: unique.length };
  }
  if (unique.length < MIN_COMPARE) return { ok: false, reason: "too-few", count: unique.length };
  if (unique.length > MAX_COMPARE) return { ok: false, reason: "too-many", count: unique.length };
  return { ok: true, slugs: unique };
}

/** Columna del comparador: una estación con sus datos y su estado. */
export interface CompareColumn {
  readonly slug: string;
  readonly name: string;
  readonly region: string;
  readonly status: StationStatus;
  readonly isOpen: boolean | null;
  readonly baseCm: number | null;
  readonly topCm: number | null;
  readonly newSnow24hCm: number | null;
  readonly kmOpen: number | null;
  readonly liftsOpen: number | null;
  readonly liftsTotal: number | null;
  readonly observedAt: string | null;
  /** Texto de procedencia ya resuelto para esta columna. */
  readonly provenanceText: string;
  /** ¿Esta columna tiene al menos un dato con valor? */
  readonly hasAnyValue: boolean;
}

export type CompareValue =
  | { readonly kind: "value"; readonly text: string }
  | { readonly kind: "nodata"; readonly text: string }
  | { readonly kind: "bool"; readonly text: string; readonly yes: boolean };

export interface CompareRow {
  readonly key: string;
  readonly label: string;
  /** Una celda por columna, en el mismo orden que `columns`. */
  readonly cells: readonly CompareValue[];
}

const NODATA = "Sin datos";

/**
 * Texto de estado en español. Debe coincidir con
 * `snow.status.<key>.label` de `public/assets/i18n/snow/es.json` (lo comprueba
 * `compare-logic.test.mjs`). El glifo viaja SIEMPRE con la palabra.
 */
export const STATUS_TEXT: Readonly<Record<StatusKey, string>> = {
  open: "Abierta",
  closed: "Cerrada",
  unknown: "Sin datos",
  blocked: "No disponible",
};

function measure(v: number | null, unit: MeasurementUnit): CompareValue {
  const m = formatMeasurement(v, unit);
  return m.kind === "value" ? { kind: "value", text: m.text } : { kind: "nodata", text: NODATA };
}

/** Filas del comparador. El orden es el mismo que el de §9.7. */
export function compareRows(columns: readonly CompareColumn[]): readonly CompareRow[] {
  const each = (fn: (c: CompareColumn) => CompareValue): readonly CompareValue[] => columns.map(fn);

  const rows: CompareRow[] = [
    {
      key: "status",
      label: "Estado",
      // Se pinta la etiqueta del estado, nunca un color: SC 1.4.1.
      cells: each((c) => ({
        kind: "value" as const,
        text: `${c.status.glyph} ${STATUS_TEXT[c.status.key]}`,
      })),
    },
    { key: "base", label: "Espesor base", cells: each((c) => measure(c.baseCm, "cm")) },
    { key: "top", label: "Espesor cima", cells: each((c) => measure(c.topCm, "cm")) },
    { key: "new24h", label: "Nieve 24 h", cells: each((c) => measure(c.newSnow24hCm, "cm")) },
    { key: "km", label: "Km abiertos", cells: each((c) => measure(c.kmOpen, "km")) },
    {
      key: "lifts",
      label: "Remontes",
      cells: each((c) =>
        c.liftsOpen === null || c.liftsTotal === null
          ? { kind: "nodata", text: NODATA }
          : { kind: "value", text: `${c.liftsOpen} / ${c.liftsTotal}` }
      ),
    },
    {
      key: "isOpen",
      label: "Apertura publicada",
      cells: each((c) =>
        c.isOpen === null
          ? { kind: "nodata", text: NODATA }
          : { kind: "bool", text: c.isOpen ? "Sí" : "No", yes: c.isOpen }
      ),
    },
    {
      key: "observedAt",
      label: "Último parte",
      cells: each((c) =>
        c.observedAt === null ? { kind: "nodata", text: NODATA } : { kind: "value", text: c.observedAt }
      ),
    },
    {
      key: "provenance",
      label: "Procedencia",
      cells: each((c) => ({ kind: "value", text: c.provenanceText })),
    },
  ];
  return rows;
}

/**
 * ¿La comparación está dominada por ausencias? Se usa para avisar al usuario de
 * que comparar dos «Sin datos» no dice nada, en vez de mostrar una tabla de
 * guiones que parece un error.
 */
export function comparisonIsEmpty(columns: readonly CompareColumn[]): boolean {
  return columns.every((c) => !c.hasAnyValue);
}

/** ¿Hay alguna fila donde TODAS las columnas tengan valor? */
export function comparableRowCount(rows: readonly CompareRow[]): number {
  return rows.filter((r) => r.cells.every((c) => c.kind !== "nodata")).length;
}

/** Elige la columna con peor estado, para el resumen de §9.7. */
export function worstStatus(columns: readonly CompareColumn[]): StatusKey {
  const order: StatusKey[] = ["unknown", "blocked", "closed", "open"];
  let worst: StatusKey = "open";
  for (const c of columns) {
    const key = c.status.key;
    if (order.indexOf(key) < order.indexOf(worst)) worst = key;
  }
  return worst;
}
