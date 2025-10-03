import { Component, input, output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

export interface FilterOption {
  label: string;
  value: string | number | boolean;
}

export interface FilterField {
  key: string;
  label: string;
  type:
    | "text"
    | "select"
    | "multiselect"
    | "date"
    | "daterange"
    | "number"
    | "boolean";
  options?: FilterOption[];
  placeholder?: string;
}

export type FilterValues = Record<string, unknown>;

/**
 * AdminFiltersComponent
 *
 * Barra de filtros dinámica con múltiples tipos de campos
 *
 * @example
 * <app-admin-filters
 *   [fields]="filterFields"
 *   [values]="filterValues()"
 *   (valuesChange)="onFiltersChange($event)"
 *   (reset)="onFiltersReset()"
 * />
 */
@Component({
  selector: "app-admin-filters",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-filters">
      <div class="filters-header">
        <h3 class="filters-title">
          <span class="icon">🔍</span>
          Filtros
        </h3>

        <button class="toggle-btn" (click)="toggleExpanded()" type="button">
          {{ isExpanded() ? "Ocultar" : "Mostrar" }}
          <span class="chevron">{{ isExpanded() ? "▼" : "▶" }}</span>
        </button>
      </div>

      @if (isExpanded()) {
      <div class="filters-content">
        <div class="filters-grid">
          @for (field of fields(); track field.key) {
          <div class="filter-field">
            <label class="filter-label" [for]="'filter-' + field.key">{{
              field.label
            }}</label>

            @switch (field.type) { @case ('text') {
            <input
              type="text"
              class="filter-input"
              [id]="'filter-' + field.key"
              [placeholder]="field.placeholder || 'Buscar...'"
              [value]="getFieldValue(field.key)"
              (input)="updateField(field.key, $any($event.target).value)"
            />
            } @case ('select') {
            <select
              class="filter-select"
              [value]="getFieldValue(field.key)"
              (change)="updateField(field.key, $any($event.target).value)"
            >
              <option value="">Todos</option>
              @for (option of field.options; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
              }
            </select>
            } @case ('date') {
            <input
              type="date"
              class="filter-input"
              [value]="getFieldValue(field.key)"
              (change)="updateField(field.key, $any($event.target).value)"
            />
            } @case ('number') {
            <input
              type="number"
              class="filter-input"
              [placeholder]="field.placeholder || '0'"
              [value]="getFieldValue(field.key)"
              (input)="updateField(field.key, $any($event.target).value)"
            />
            } @case ('boolean') {
            <label class="checkbox-label">
              <input
                type="checkbox"
                [checked]="getFieldValue(field.key) === true"
                (change)="updateField(field.key, $any($event.target).checked)"
              />
              <span>Activado</span>
            </label>
            } }
          </div>
          }
        </div>

        <div class="filters-actions">
          <button class="btn btn-secondary" (click)="onReset()" type="button">
            Limpiar Filtros
          </button>

          <button
            class="btn btn-primary"
            (click)="applyFilters()"
            type="button"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .admin-filters {
        background: var(--neutral-0);
        border: 1px solid var(--neutral-200);
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 1.5rem;
      }

      .filters-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: var(--neutral-50);
        border-bottom: 1px solid var(--neutral-200);
      }

      .filters-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        color: var(--neutral-900);
        margin: 0;
      }

      .filters-title .icon {
        font-size: 1.25rem;
      }

      .toggle-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: white;
        border: 1px solid var(--neutral-300);
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--neutral-700);
        cursor: pointer;
        transition: all 0.2s;
      }

      .toggle-btn:hover {
        background: var(--neutral-100);
        border-color: var(--neutral-400);
      }

      .chevron {
        font-size: 0.75rem;
        transition: transform 0.3s;
      }

      .filters-content {
        padding: 1.5rem;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.25rem;
        margin-bottom: 1.5rem;
      }

      .filter-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .filter-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--neutral-700);
      }

      .filter-input,
      .filter-select {
        padding: 0.625rem 0.875rem;
        border: 1px solid var(--neutral-300);
        border-radius: 8px;
        font-size: 0.875rem;
        color: var(--neutral-900);
        background: white;
        transition: all 0.2s;
      }

      .filter-input:focus,
      .filter-select:focus {
        outline: none;
        border-color: var(--primary-500);
        box-shadow: 0 0 0 3px rgba(var(--primary-500-rgb), 0.1);
      }

      .filter-input::placeholder {
        color: var(--neutral-500);
      }

      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: var(--neutral-700);
        cursor: pointer;
        user-select: none;
      }

      .checkbox-label input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .filters-actions {
        display: flex;
        justify-content: flex-end;
        gap: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--neutral-200);
      }

      .btn {
        padding: 0.625rem 1.25rem;
        border: none;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-primary {
        background: var(--primary-500);
        color: white;
      }

      .btn-primary:hover {
        background: var(--primary-600);
      }

      .btn-secondary {
        background: var(--neutral-200);
        color: var(--neutral-900);
      }

      .btn-secondary:hover {
        background: var(--neutral-300);
      }

      @media (max-width: 768px) {
        .filters-grid {
          grid-template-columns: 1fr;
        }

        .filters-actions {
          flex-direction: column;
        }

        .btn {
          width: 100%;
        }
      }
    `,
  ],
})
export class AdminFiltersComponent {
  // Inputs
  readonly fields = input.required<FilterField[]>();
  readonly values = input<FilterValues>({});

  // Outputs
  readonly valuesChange = output<FilterValues>();
  readonly filterReset = output<void>();

  // State
  readonly isExpanded = signal(true);
  private readonly localValues = signal<FilterValues>({});

  // Methods
  toggleExpanded(): void {
    this.isExpanded.update((val) => !val);
  }

  getFieldValue(key: string): unknown {
    return this.localValues()[key] ?? this.values()[key] ?? "";
  }

  updateField(key: string, value: unknown): void {
    this.localValues.update((vals) => ({ ...vals, [key]: value }));
  }

  applyFilters(): void {
    const cleanedValues: FilterValues = {};

    // Remove empty values
    Object.entries(this.localValues()).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        cleanedValues[key] = value;
      }
    });

    this.valuesChange.emit(cleanedValues);
  }

  onReset(): void {
    this.localValues.set({});
    this.valuesChange.emit({});
    this.filterReset.emit();
  }
}
