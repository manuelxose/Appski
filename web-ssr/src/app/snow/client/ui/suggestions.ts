/**
 * Sugerencias para la página de error, **derivadas del estado real**.
 *
 * Por qué existe esto (encargo del capitán): la primera versión de la página 404
 * afirmaba en duro «no tenemos partes publicados todavía». Esa frase deja de ser
 * cierta en cuanto el primer parte editorial se publique, y entonces la promesa
 * de honestidad se convierte en mentira. Aquí la frase sale del estado:
 *   - si hay estaciones con dato → se ofrecen, con su estado;
 *   - si no las hay             → se dice POR QUÉ, con el `NoDataReason` real
 *                                  que devuelve el borde;
 *   - si falló la consulta      → se admite que no lo sabemos.
 * Puro y determinista: sin red, sin reloj, sin Angular.
 */
import type { NoDataReason, StationSummary } from "../../models/dto";

/** Clave i18n del motivo o el motivo especial de fallo de consulta. */
export type SuggestionReason = NoDataReason | "reporting-failed";

export type Suggestion =
  | {
      readonly kind: "list";
      readonly stations: readonly StationSummary[];
    }
  | { readonly kind: "none"; readonly reason: SuggestionReason };

export type ReportingOutcome<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false };

/**
 * @param reportingOk `false` si la consulta al borde falló (red, 5xx).
 * @param withData estaciones que **hoy** tienen parte publicado.
 * @param reason motivo de ausencia reportado por el borde; `null` si no lo hay.
 */
export function suggestStations(
  reportingOk: boolean,
  withData: readonly StationSummary[],
  reason: NoDataReason | null,
  max = 3
): Suggestion {
  if (!reportingOk) return { kind: "none", reason: "reporting-failed" };
  if (withData.length > 0) {
    return { kind: "list", stations: withData.slice(0, max) };
  }
  return { kind: "none", reason: reason ?? "not-covered" };
}

/** Clave i18n del texto que explica por qué no hay sugerencias. */
export function noSuggestionsKey(reason: SuggestionReason): string {
  return `snow.notFound.noSuggestions.${reason}`;
}
