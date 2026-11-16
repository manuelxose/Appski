/**
 * Traducción de estado de borde a estado visual y de `NoDataReason` a texto.
 *
 * Es la matriz §7.7 de `07-ux-ui.md` en código: puro, sin Angular, sin red y
 * sin reloj propio (el instante se inyecta) para que sea determinista en tests.
 */
import type { NoDataReason, SnowReportDto } from "../../models/dto";

/** Los siete estados visuales de §7. */
export type ViewState =
  | "loading"
  | "ready"
  | "stale"
  | "nodata"
  | "blocked"
  | "error";

/** Estado de borde + el caso `error` que el DTO no modela (red caída, 5xx). */
export type BorderStatus = SnowReportDto["status"] | "error";

/**
 * Puro y total: cualquier estado de borde cae en un estado visual.
 * `not_configured` se colapsa en `nodata` (decisión §7.6: el usuario no puede
 * actuar sobre una API key ausente y no debe leer nombres de variables).
 */
export function toViewState(status: BorderStatus): ViewState {
  switch (status) {
    case "ok":
      return "ready";
    case "stale":
      return "stale";
    case "no_data":
    case "not_configured":
      return "nodata";
    case "blocked":
      return "blocked";
    case "error":
      return "error";
    default: {
      // Exhaustividad: si el DTO gana un estado nuevo, esto no compila.
      const never: never = status;
      return never;
    }
  }
}

export const NO_DATA_REASONS: readonly NoDataReason[] = [
  "outside-season",
  "source-silent",
  "not-yet-published",
  "not-covered",
  "license-prohibits",
] as const;

/**
 * Motivo efectivo a pintar. `not_configured` llega del borde con
 * `reason: 'not-covered'` (http-mapping.ts lo fija así), pero se acepta también
 * sin motivo y se asume `not-covered`.
 */
export function effectiveReason(dto: SnowReportDto): NoDataReason {
  return dto.reason ?? "not-covered";
}

/** Clave i18n del motivo (namespace `snow`, fichero `assets/i18n/snow/es.json`). */
export function reasonKey(reason: NoDataReason): string {
  return `snow.reason.${reason}`;
}

/** ¿Hay algo que pintar como valor? Sólo si el estado es utilizable y hay carga. */
export function hasValues(dto: SnowReportDto): boolean {
  const state = toViewState(dto.status);
  if (state !== "ready" && state !== "stale") return false;
  return dto.report.operational !== null || dto.report.snow !== null;
}
