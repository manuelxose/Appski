import {
  Component,
  input,
  output,
  signal,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

/**
 * AdminSearchBarComponent
 *
 * Barra de búsqueda standalone con debounce y filtros rápidos
 *
 * @example
 * <app-admin-search-bar
 *   [placeholder]="'Buscar usuarios...'"
 *   [debounceMs]="300"
 *   (search)="onSearch($event)"
 *   (clear)="onClearSearch()"
 * />
 */
@Component({
  selector: "app-admin-search-bar",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-search-bar">
      <div class="search-input-wrapper">
        <span class="search-icon">🔍</span>

        <input
          #searchInput
          type="text"
          class="search-input"
          [placeholder]="placeholder()"
          [(ngModel)]="query"
          (ngModelChange)="onQueryChange($event)"
          (keyup.enter)="onEnter()"
        />

        @if (query()) {
        <button
          class="clear-btn"
          (click)="onClear()"
          type="button"
          title="Limpiar búsqueda"
        >
          ✕
        </button>
        }
      </div>

      @if (showQuickFilters() && quickFilters().length > 0) {
      <div class="quick-filters">
        <span class="quick-filters-label">Filtros rápidos:</span>
        @for (filter of quickFilters(); track filter.value) {
        <button
          class="quick-filter-btn"
          [class.active]="activeFilter() === filter.value"
          (click)="onQuickFilterClick(filter.value)"
          type="button"
        >
          {{ filter.label }}
        </button>
        }
      </div>
      } @if (showResults() && results().length > 0 && query()) {
      <div class="search-results">
        <div class="results-header">
          <span class="results-count">{{ results().length }} resultados</span>
          <button
            class="close-results-btn"
            (click)="closeResults()"
            type="button"
          >
            ✕
          </button>
        </div>

        <ul class="results-list">
          @for (result of results(); track result.id) {
          <li
            class="result-item"
            tabindex="0"
            role="button"
            (click)="onResultClick(result)"
            (keyup.enter)="onResultClick(result)"
            (keyup.space)="onResultClick(result)"
          >
            @if (result.icon) {
            <span class="result-icon">{{ result.icon }}</span>
            }
            <div class="result-content">
              <div class="result-title">{{ result.title }}</div>
              @if (result.subtitle) {
              <div class="result-subtitle">{{ result.subtitle }}</div>
              }
            </div>
          </li>
          }
        </ul>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .admin-search-bar {
        position: relative;
        width: 100%;
      }

      .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-icon {
        position: absolute;
        left: 1rem;
        font-size: 1.25rem;
        color: var(--neutral-500);
        pointer-events: none;
      }

      .search-input {
        width: 100%;
        padding: 0.875rem 3rem 0.875rem 3rem;
        border: 2px solid var(--neutral-300);
        border-radius: 12px;
        font-size: 0.9375rem;
        color: var(--neutral-900);
        background: white;
        transition: all 0.2s;
      }

      .search-input:focus {
        outline: none;
        border-color: var(--primary-500);
        box-shadow: 0 0 0 4px rgba(var(--primary-500-rgb), 0.1);
      }

      .search-input::placeholder {
        color: var(--neutral-500);
      }

      .clear-btn {
        position: absolute;
        right: 1rem;
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: var(--neutral-300);
        border-radius: 50%;
        font-size: 0.75rem;
        color: var(--neutral-700);
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .clear-btn:hover {
        background: var(--neutral-400);
        color: var(--neutral-900);
      }

      .quick-filters {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 0.75rem;
        flex-wrap: wrap;
      }

      .quick-filters-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--neutral-700);
      }

      .quick-filter-btn {
        padding: 0.375rem 0.875rem;
        border: 1px solid var(--neutral-300);
        background: white;
        border-radius: 20px;
        font-size: 0.8125rem;
        font-weight: 500;
        color: var(--neutral-700);
        cursor: pointer;
        transition: all 0.2s;
      }

      .quick-filter-btn:hover {
        background: var(--neutral-100);
        border-color: var(--neutral-400);
      }

      .quick-filter-btn.active {
        background: var(--primary-500);
        color: white;
        border-color: var(--primary-500);
      }

      .search-results {
        position: absolute;
        top: calc(100% + 0.5rem);
        left: 0;
        right: 0;
        background: white;
        border: 1px solid var(--neutral-200);
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        max-height: 400px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: var(--neutral-50);
        border-bottom: 1px solid var(--neutral-200);
      }

      .results-count {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--neutral-700);
      }

      .close-results-btn {
        width: 24px;
        height: 24px;
        padding: 0;
        border: none;
        background: transparent;
        font-size: 1rem;
        color: var(--neutral-600);
        cursor: pointer;
        transition: color 0.2s;
      }

      .close-results-btn:hover {
        color: var(--neutral-900);
      }

      .results-list {
        list-style: none;
        margin: 0;
        padding: 0;
        overflow-y: auto;
      }

      .result-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        border-bottom: 1px solid var(--neutral-100);
        cursor: pointer;
        transition: background 0.15s;
      }

      .result-item:hover {
        background: var(--neutral-50);
      }

      .result-item:last-child {
        border-bottom: none;
      }

      .result-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .result-content {
        flex: 1;
        min-width: 0;
      }

      .result-title {
        font-size: 0.9375rem;
        font-weight: 500;
        color: var(--neutral-900);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .result-subtitle {
        font-size: 0.8125rem;
        color: var(--neutral-600);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-top: 0.125rem;
      }

      @media (max-width: 640px) {
        .search-input {
          padding: 0.75rem 2.5rem 0.75rem 2.5rem;
          font-size: 0.875rem;
        }

        .search-icon,
        .clear-btn {
          left: 0.75rem;
        }

        .clear-btn {
          right: 0.75rem;
        }
      }
    `,
  ],
})
export class AdminSearchBarComponent {
  @ViewChild("searchInput") searchInputRef!: ElementRef<HTMLInputElement>;

  // Inputs
  readonly placeholder = input("Buscar...");
  readonly debounceMs = input(300);
  readonly showQuickFilters = input(false);
  readonly quickFilters = input<{ label: string; value: string }[]>([]);
  readonly showResults = input(false);
  readonly results = input<
    { id: string; title: string; subtitle?: string; icon?: string }[]
  >([]);

  // Outputs
  readonly searchChange = output<string>();
  readonly clear = output<void>();
  readonly quickFilterChange = output<string>();
  readonly resultClick = output<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
  }>();

  // State
  readonly query = signal("");
  readonly activeFilter = signal<string | null>(null);

  private debounceTimeout?: number;

  // Methods
  onQueryChange(value: string): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = window.setTimeout(() => {
      this.searchChange.emit(value);
    }, this.debounceMs());
  }

  onEnter(): void {
    this.searchChange.emit(this.query());
  }

  onClear(): void {
    this.query.set("");
    this.searchChange.emit("");
    this.clear.emit();
    this.searchInputRef?.nativeElement.focus();
  }

  onQuickFilterClick(value: string): void {
    if (this.activeFilter() === value) {
      this.activeFilter.set(null);
      this.quickFilterChange.emit("");
    } else {
      this.activeFilter.set(value);
      this.quickFilterChange.emit(value);
    }
  }

  onResultClick(result: {
    id: string;
    title: string;
    subtitle?: string;
    icon?: string;
  }): void {
    this.resultClick.emit(result);
    this.closeResults();
  }

  closeResults(): void {
    // Let parent component handle this via results input
  }

  focus(): void {
    this.searchInputRef?.nativeElement.focus();
  }
}
