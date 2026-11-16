/**
 * Filtro de Angular para pintar medidas nullable SIN abrir la puerta al «0»
 * fabricado (07-ux-ui.md §10.3).
 *
 * El template sólo puede escribir:
 *
 *     {{ station.report.report.snow?.baseCm | snowMeasure: "cm" }}
 *
 * y el pipe devuelve o `"112,5 cm"` o el texto de ausencia del i18n. Nunca un
 * número suelto, nunca `0` por un `null`.
 *
 * `nullText` se inyecta desde la plantilla con el texto traducido
 * (por defecto «Sin datos disponibles» del namespace `snow`), para no meter
 * una librería de i18n asíncrona dentro del pipe y poder probarlo sin DI de Angular.
 */
import { Pipe, PipeTransform } from "@angular/core";
import { formatMeasurement, type MeasurementUnit } from "./format-measurement";

@Pipe({ name: "snowMeasure", standalone: true, pure: true })
export class SnowMeasurePipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    unit: MeasurementUnit,
    nullText = "Sin datos disponibles"
  ): string {
    const m = formatMeasurement(value, unit);
    return m.kind === "value" ? m.text : nullText;
  }
}
