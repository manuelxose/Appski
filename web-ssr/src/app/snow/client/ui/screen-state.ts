/**
 * Mapeo de estados de borde a los siete estados visuales, con su texto en
 * español. Amplía `view-state.ts` (que sólo traducía el estado) con lo que las
 * pantallas necesitan pintar:
 *
 *   loading | ready | stale | nodata | blocked | error | not_configured
 *
 * `not_configured` es DISTINGUIBLE de `nodata` para la pantalla (el operador
 * necesita saberlo) pero ambos se pintan con la misma frase pública, porque el
 * usuario no puede actuar sobre una clave que falta (§7.6).
 */
import type { NoDataReason, SnowReportDto } from "../../models/dto";

export type ScreenState =
  | "loading"
  | "ready"
  | "stale"
  | "nodata"
  | "blocked"
  | "error"
  | "not_configured";

export type BorderStatus = SnowReportDto["status"] | "error";

export function toScreenState(status: BorderStatus): ScreenState {
  switch (status) {
    case "ok":
      return "ready";
    case "stale":
      return "stale";
    case "no_data":
      return "nodata";
    case "not_configured":
      return "not_configured";
    case "blocked":
      return "blocked";
    case "error":
      return "error";
    default: {
      const never: never = status;
      return never;
    }
  }
}

/** Las cinco frases canónicas (05b §3.2). Literales; verificadas contra es.json. */
export const REASON_TEXT: Readonly<Record<NoDataReason, string>> = {
  "outside-season": "Temporada cerrada — sin parte publicado",
  "source-silent": "La estación no ha publicado parte hoy",
  "not-yet-published": "Pendiente de publicación por la fuente",
  "not-covered": "Sin cobertura de datos para esta estación",
  "license-prohibits": "No disponible por condiciones de uso de la fuente",
};

/**
 * Texto público a pintar para un estado que no tiene valores.
 * `not_configured` se presenta como `not-covered`: mismo texto, sin nombrar
 * variables de entorno ni claves.
 */
export function publicReason(state: ScreenState, reason: NoDataReason | null): NoDataReason {
  if (state === "blocked") return "license-prohibits";
  if (state === "not_configured") return "not-covered";
  return reason ?? "not-covered";
}

/** ¿Este estado permite pintar valores? */
export function hasValues(state: ScreenState): boolean {
  return state === "ready" || state === "stale";
}
