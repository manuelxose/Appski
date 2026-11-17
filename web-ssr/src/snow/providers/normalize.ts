/**
 * Regla anti-sentinel (05b §3.2): AEMET/IPMA usan `-99.0` como "no dato"; el
 * adapter debe mapearlo a `null`. La ausencia NUNCA es `-1`/`-99`/`NaN`/`∞`.
 */
export function normalizeNoData(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (Number.isNaN(v) || v === Infinity || v === -Infinity) return null;
  if (v === -99) return null; // centinela exacto de AEMET/IPMA (-99.0 === -99)
  return v;
}
