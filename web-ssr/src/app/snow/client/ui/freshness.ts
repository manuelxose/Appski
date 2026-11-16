/**
 * Frescura legible: segundos → «hace 12 min» / «hace 3 h» / «hace 2 días».
 *
 * Sin `Intl.RelativeTimeFormat` a propósito: su salida cambia entre versiones de
 * ICU y entre Node y el navegador, y aquí el texto se compara en tests. Un
 * formateador propio y determinista es más aburrido y más verificable.
 *
 * Las cadenas son literales en español (decisión del capitán para este intento);
 * `screen-copy.test.mjs` las contrasta con `snow.common.*` de `es.json`.
 */
export function freshnessText(seconds: number | null | undefined): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) return "";
  const s = Math.floor(seconds);
  if (s < 60) return "hace un momento";
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

/**
 * Fecha absoluta con zona horaria explícita (07-ux-ui.md §5.4, regla 2): nunca
 * se muestra «05:45» a secas. `Intl.DateTimeFormat` con `timeZone` fijo evita
 * que el SSR y el navegador pinten horas distintas.
 */
export function absoluteDateText(
  iso: string | null | undefined,
  timeZone = "Europe/Madrid"
): string {
  if (typeof iso !== "string" || iso.trim() === "") return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const fmt = new Intl.DateTimeFormat("es-ES", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // `hour12:false` puede devolver «24:00» en algunos ICU; se normaliza a 00.
  return `${fmt.format(d).replace("24:", "00:")} (${timeZone})`;
}
