import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * Configuración de una columna en la tabla por cotas
 */
export interface CotaTableColumn {
  key: string; // Clave para acceder al dato
  label: string; // Label a mostrar
  unit?: string; // Unidad (ej: "cm", "°C", "km/h")
  formatter?: (value: unknown) => string; // Función custom de formato
  icon?: string; // Emoji opcional
}

/**
 * Datos por cota con valores dinámicos
 */
export interface CotaTableData {
  base: Record<string, unknown>;
  mid: Record<string, unknown>;
  top: Record<string, unknown>;
}

/**
 * Metadata de las cotas
 */
export interface CotaInfo {
  name: string;
  altitudeM: number;
  icon: string;
  color: string; // Color del borde/header
}

@Component({
  selector: "app-cota-table",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cota-table-wrapper">
      @if (title()) {
      <h3 class="table-title">{{ title() }}</h3>
      }

      <div class="table-container">
        <table class="cota-table">
          <thead>
            <tr>
              <th class="header-cell metric-header">{{ metricsLabel() }}</th>
              @for (cota of cotasInfo; track cota.name) {
              <th
                class="header-cell cota-header"
                [style.border-bottom-color]="cota.color"
              >
                <span class="cota-icon">{{ cota.icon }}</span>
                <div class="cota-info">
                  <span class="cota-name">{{ cota.name }}</span>
                  <span class="cota-altitude">{{ cota.altitudeM }}m</span>
                </div>
              </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (column of columns(); track column.key) {
            <tr class="data-row">
              <td class="metric-cell">
                @if (column.icon) {
                <span class="metric-icon">{{ column.icon }}</span>
                }
                <span class="metric-label">{{ column.label }}</span>
              </td>
              <td class="data-cell">
                {{ formatValue(data().base[column.key], column) }}
              </td>
              <td class="data-cell">
                {{ formatValue(data().mid[column.key], column) }}
              </td>
              <td class="data-cell">
                {{ formatValue(data().top[column.key], column) }}
              </td>
            </tr>
            }
          </tbody>
        </table>
      </div>

      @if (showLegend()) {
      <div class="table-legend">
        @for (cota of cotasInfo; track cota.name) {
        <div class="legend-item">
          <span class="legend-color" [style.background]="cota.color"></span>
          <span>{{ cota.name }} ({{ cota.altitudeM }}m)</span>
        </div>
        }
      </div>
      }
    </div>
  `,
  styles: [
    `
      .cota-table-wrapper {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .table-title {
        margin: 0 0 1rem 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .table-container {
        overflow-x: auto;
        border-radius: 8px;
        border: 1px solid var(--neutral-200);
      }

      .cota-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.875rem;
      }

      .header-cell {
        background: var(--neutral-100);
        padding: 1rem 0.75rem;
        text-align: center;
        font-weight: 600;
        color: var(--neutral-700);
        border: 1px solid var(--neutral-200);
      }

      .metric-header {
        text-align: left;
        background: var(--neutral-50);
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.75rem;
      }

      .cota-header {
        background: var(--primary-50);
        border-bottom: 3px solid;
        min-width: 120px;
      }

      .cota-icon {
        font-size: 1.5rem;
        display: block;
        margin-bottom: 0.25rem;
      }

      .cota-info {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
      }

      .cota-name {
        font-weight: 700;
        color: var(--neutral-900);
      }

      .cota-altitude {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--neutral-600);
      }

      .data-row:nth-child(even) {
        background: var(--neutral-25);
      }

      .data-row:hover {
        background: var(--primary-25);
      }

      .metric-cell {
        padding: 0.75rem;
        text-align: left;
        font-weight: 600;
        color: var(--neutral-700);
        background: var(--neutral-50);
        border: 1px solid var(--neutral-200);
        white-space: nowrap;
      }

      .metric-icon {
        margin-right: 0.5rem;
      }

      .metric-label {
        font-weight: 600;
      }

      .data-cell {
        padding: 0.75rem;
        text-align: center;
        border: 1px solid var(--neutral-200);
        color: var(--neutral-900);
        font-weight: 600;
      }

      .table-legend {
        display: flex;
        gap: 1.5rem;
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--neutral-200);
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--neutral-700);
      }

      .legend-color {
        width: 16px;
        height: 16px;
        border-radius: 4px;
        display: inline-block;
      }

      @media (max-width: 768px) {
        .cota-table-wrapper {
          padding: 1rem;
        }

        .cota-table {
          font-size: 0.75rem;
        }

        .header-cell,
        .data-cell,
        .metric-cell {
          padding: 0.5rem;
        }

        .cota-header {
          min-width: 90px;
        }

        .cota-icon {
          font-size: 1.25rem;
        }

        .table-legend {
          flex-direction: column;
          gap: 0.5rem;
        }
      }
    `,
  ],
})
export class CotaTableComponent {
  // Inputs
  title = input<string>("");
  metricsLabel = input<string>("Métrica");
  columns = input.required<CotaTableColumn[]>();
  data = input.required<CotaTableData>();
  showLegend = input<boolean>(false);

  // Metadata de las cotas (hardcoded pero personalizable)
  cotasInfo: CotaInfo[] = [
    { name: "Base", altitudeM: 1500, icon: "🏔️", color: "#8b5cf6" },
    { name: "Media", altitudeM: 1800, icon: "⛰️", color: "#3b82f6" },
    { name: "Cima", altitudeM: 2510, icon: "🏔️", color: "#06b6d4" },
  ];

  /**
   * Formatea un valor según la configuración de la columna
   */
  formatValue(value: unknown, column: CotaTableColumn): string {
    // Si hay formatter custom, usarlo
    if (column.formatter) {
      return column.formatter(value);
    }

    // Si es null/undefined
    if (value === null || value === undefined) {
      return "-";
    }

    // Si hay unidad, añadirla
    if (column.unit) {
      return `${value}${column.unit}`;
    }

    // Por defecto, convertir a string
    return String(value);
  }
}
