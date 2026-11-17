/**
 * Formateo de medidas del dominio nieve — la ÚNICA puerta permitida entre un
 * número nullable y un texto en pantalla (07-ux-ui.md §10.3, regla P1).
 *
 * Reglas:
 *  - `null` / `undefined` / `NaN` / `±Infinity` ⇒ ausencia, NUNCA 0.
 *  - Los sentinelos heredados `-1` y `-99` (05b §3.2: AEMET e IPMA los usan
 *    como «sin dato») también son ausencia. Un valor negativo legítimo se
 *    formatea como tal porque `-1`/`-99` exactos no existen en el dominio
 *    (ni nieve ni km son negativos).
 *  - El resultado es un tipo discriminado: leer `.text` sin estrechar en
 *    `'value'` es un error de compilación (ver negative-control en los tests).
 */
export type Measurement =
  | { readonly kind: "value"; readonly text: string }
  | { readonly kind: "nodata" };

export type MeasurementUnit = "cm" | "km" | "m" | "%";

const SENTINELS: ReadonlySet<number> = new Set([-1, -99]);

/**
 * @param value medida tal cual llega del DTO (`number | null`)
 * @param unit sufijo; `%` no lleva espacio
 * @param locale locale de formato, por defecto es-ES (coma decimal)
 */
export function formatMeasurement(
  value: number | null | undefined,
  unit: MeasurementUnit,
  locale: "es-ES" = "es-ES"
): Measurement {
  if (value === null || value === undefined) return { kind: "nodata" };
  if (typeof value !== "number" || !Number.isFinite(value)) return { kind: "nodata" };
  if (SENTINELS.has(value)) return { kind: "nodata" };
  // `useGrouping: "always"` es deliberado: con `auto`/`min2` es-ES sólo agrupa a
  // partir de 5 dígitos, y una altitud de 2100 salía como «2100 m» mientras
  // 12 000 saldría «12.000 m» — inconsistente en la misma columna (§5.6).
  // El repo compila con `lib: es2020`, cuyos tipos sólo admiten boolean
  // (`useGrouping` acepta "always"/"min2" desde ES2023). Se construye el
  // formateador con la opción tipada localmente, sin `any`.
  const options = {
    maximumFractionDigits: 1,
    useGrouping: "always",
  } as unknown as Intl.NumberFormatOptions;
  const formatter = new Intl.NumberFormat(locale, options);
  const spacer = unit === "%" ? "" : " ";
  return { kind: "value", text: `${formatter.format(value)}${spacer}${unit}` };
}

/** ¿El valor es una medida válida? Útil para decidir «sin dato» sin formatear. */
export function hasMeasurement(value: number | null | undefined): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    !SENTINELS.has(value)
  );
}
