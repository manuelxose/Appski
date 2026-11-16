/**
 * Procedencia mostrable: de `ProvenanceDto` a una etiqueta con enlace (§5.4).
 *
 * Regla de oro (05b §3.2/§7.3 y encargo del Lead): un dato editorial **no se
 * rotula nunca** con la licencia del proveedor que no lo dio, y el texto del
 * operador no se copia: `sourceUrl` es un enlace, `author` una etiqueta.
 *
 * `sourceUrl` sólo se enlaza si es una URL http(s) válida. Un `javascript:` o
 * un campo basura no se convierte en un enlace: se degrada a etiqueta sin URL.
 */
import type { NoDataReason, ProvenanceDto } from "../../models/dto";
import type { EditorialReportFields } from "../../models/dto";

export type ProvenanceRole = "editorial" | "official" | "absent";

/** El texto de atribución de las fuentes oficiales lo pre-interpola el backend. */
export function provenanceRole(p: ProvenanceDto): ProvenanceRole {
  if (p.licenseStatus === "blocked") return "absent";
  if (p.source.startsWith("editorial-")) return "editorial";
  return "official";
}

export interface ProvenanceLabel {
  readonly role: ProvenanceRole;
  /** Texto visible (ya en español de interfaz, no copiado de la fuente). */
  readonly text: string;
  /** Enlace saliente autorizado, o `null`. */
  readonly href: string | null;
  /** Atribución literal del proveedor, cuando la licencia la exige. */
  readonly attribution: string | null;
  /** Frescura en segundos, para «hace X». */
  readonly freshnessSeconds: number;
}

const SAFE_URL = /^https?:\/\/[^\s<>"]+$/i;

/** ¿Se puede poner esta URL en un `href`? Sólo http(s) absolutas. */
export function isSafeHref(url: string | null | undefined): url is string {
  return typeof url === "string" && SAFE_URL.test(url.trim());
}

/**
 * @param p procedencia del borde
 * @param editorial campos F1 (`sourceUrl`, `author`, `capturedAt`)
 * @param reason motivo de ausencia, si lo hay
 */
export function provenanceLabel(
  p: ProvenanceDto,
  editorial: EditorialReportFields = {},
  reason: NoDataReason | null = null
): ProvenanceLabel {
  const role = provenanceRole(p);
  const href = isSafeHref(editorial.sourceUrl) ? editorial.sourceUrl : null;

  if (role === "absent") {
    return {
      role,
      text: reason ? REASON_TEXT[reason] : "Sin datos disponibles",
      href: null,
      attribution: null,
      freshnessSeconds: p.freshness,
    };
  }

  if (role === "editorial") {
    const operator = editorial.author?.trim() || "operador";
    // Texto NUESTRO: «Parte de estación · fuente: <etiqueta>». No se cita al
    // operador, sólo se le etiqueta y se enlaza su página de origen.
    return {
      role,
      text: `Parte de estación · fuente: ${operator}`,
      href,
      attribution: null,
      freshnessSeconds: p.freshness,
    };
  }

  return {
    role,
    // `attribution` viene pre-interpolado por el backend (05b §1.1); si falta,
    // se usa el identificador de la fuente, nunca una frase inventada.
    text: p.attribution ?? p.source,
    href: null,
    attribution: p.attribution,
    freshnessSeconds: p.freshness,
  };
}

/** Las cinco frases canónicas de 05b §3.2 (§8.1 de `07-ux-ui.md`). */
export const REASON_TEXT: Readonly<Record<NoDataReason, string>> = {
  "outside-season": "Temporada cerrada — sin parte publicado",
  "source-silent": "La estación no ha publicado parte hoy",
  "not-yet-published": "Pendiente de publicación por la fuente",
  "not-covered": "Sin cobertura de datos para esta estación",
  "license-prohibits": "No disponible por condiciones de uso de la fuente",
};
