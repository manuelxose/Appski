/**
 * Puerta ÚNICA para decidir el estado de una estación y su texto (§5.3, §7.2,
 * decisión U3 del capitán).
 *
 * Cubre el hueco que el DTO deja abierto por diseño: `isOpen: true` con
 * `snow: null` es **abierta con espesor desconocido**, nunca `0 cm`.
 */
import type { SnowDepthReport, SnowReportDto } from "../../models/dto";
import { hasMeasurement } from "./format-measurement";

export type StationStatusKey =
  | "open"
  | "closed"
  | "unknown"
  | "blocked";

export interface StationStatus {
  /** Clave de estado (§5.3). `stale` NO es un estado: es un modificador aparte. */
  readonly key: StationStatusKey;
  /** Clave i18n de la etiqueta (`snow.status.<key>.label`). */
  readonly labelKey: string;
  /** Glifo visible + `aria-hidden`; el color nunca va solo (SC 1.4.1). */
  readonly glyph: string;
  /** true cuando hay apertura publicada pero ningún espesor medido (U3). */
  readonly depthUnknown: boolean;
  /** Texto de apoyo obligatorio para `depthUnknown`; `null` en el resto. */
  readonly supportKey: string | null;
}

const GLYPHS: Readonly<Record<StationStatusKey, string>> = {
  open: "▲",
  closed: "▼",
  unknown: "?",
  blocked: "⊘",
};

/** ¿Alguna medida de espesor es válida? (null, -1, -99 y no-finitos no cuentan). */
export function hasAnyDepth(snow: SnowDepthReport | null): boolean {
  if (snow === null) return false;
  return (
    hasMeasurement(snow.baseCm) ||
    hasMeasurement(snow.topCm) ||
    hasMeasurement(snow.midCm)
  );
}

/**
 * @param dto reporte del borde, o `null` mientras carga
 * @param resolution `'stale'` cuando el DTO vino `stale`; se pinta como
 *        modificador superpuesto, no sustituye al estado
 */
export function stationStatus(
  dto: Pick<SnowReportDto, "status" | "reason" | "report"> | null
): StationStatus {
  const blocked: StationStatus = {
    key: "blocked",
    labelKey: "snow.status.blocked.label",
    glyph: GLYPHS.blocked,
    depthUnknown: false,
    supportKey: null,
  };
  if (dto === null) return unknown();

  switch (dto.status) {
    case "blocked":
      return blocked;
    case "not_configured":
    case "no_data":
      return unknown();
    case "ok":
    case "stale": {
      const isOpen = dto.report.operational?.isOpen ?? null;
      if (isOpen === null) return unknown();
      if (isOpen === false) {
        return {
          key: "closed",
          labelKey: "snow.status.closed.label",
          glyph: GLYPHS.closed,
          depthUnknown: false,
          supportKey: null,
        };
      }
      const depthUnknown = !hasAnyDepth(dto.report.snow);
      return {
        key: "open",
        labelKey: "snow.status.open.label",
        glyph: GLYPHS.open,
        depthUnknown,
        supportKey: depthUnknown ? "snow.status.openDepthUnknown" : null,
      };
    }
    default: {
      const never: never = dto.status;
      return never;
    }
  }
}

function unknown(): StationStatus {
  return {
    key: "unknown",
    labelKey: "snow.status.unknown.label",
    glyph: GLYPHS.unknown,
    depthUnknown: false,
    supportKey: null,
  };
}

/**
 * Estado a partir de una clave ya resuelta (filas de la exploradora, que no
 * traen un `SnowReportDto` completo). Una sola tabla de glifos y etiquetas: no
 * hay segunda fuente de verdad para el glifo ni para la palabra.
 */
export function statusForKey(key: StationStatusKey): StationStatus {
  if (key === "unknown") return unknown();
  return {
    key,
    labelKey: `snow.status.${key}.label`,
    glyph: GLYPHS[key],
    depthUnknown: false,
    supportKey: null,
  };
}
