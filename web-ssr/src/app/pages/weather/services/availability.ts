/**
 * Estado de DISPONIBILIDAD de un dato del borde (SNOW-02 §4.3 / §5).
 *
 * Existe para que los servicios de la página de tiempo puedan decir la verdad:
 * "no hay proveedor autorizado", "la fuente está callada" o "la licencia lo
 * prohíbe" son DATOS, no errores, y la UI los rotula en vez de pintar cifras.
 *
 * `not_covered` cubre tanto `not_configured` como `no_data` con motivo
 * `not-covered`: para el usuario son lo mismo ("no hay dato para esto").
 */
export type AvailabilityState =
  | "ok"
  | "stale"
  | "no_data"
  | "not_covered"
  | "blocked"
  | "unavailable";

export interface Available<T> {
  readonly state: "ok" | "stale";
  readonly value: T;
}

export interface Unavailable {
  readonly state: Exclude<AvailabilityState, "ok" | "stale">;
  /** Motivo legible para la UI (texto fijo, nunca un nombre de variable de entorno). */
  readonly detail: string;
  /** true si el motivo es "no existe endpoint/proveedor en v1". */
  readonly notImplementedInV1?: boolean;
}

export type Availability<T> = Available<T> | Unavailable;

export function isAvailable<T>(a: Availability<T>): a is Available<T> {
  return a.state === "ok" || a.state === "stale";
}

/** Indisponibilidad por falta de endpoint en v1 (no es un fallo). */
export function notInV1<T>(what: string): Availability<T> {
  return { state: "unavailable", detail: what, notImplementedInV1: true };
}
