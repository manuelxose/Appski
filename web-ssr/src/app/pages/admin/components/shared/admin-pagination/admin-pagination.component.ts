import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

/**
 * AdminPaginationComponent
 *
 * Componente de paginación standalone reutilizable
 *
 * @example
 * <app-admin-pagination
 *   [total]="totalItems"
 *   [page]="currentPage"
 *   [pageSize]="20"
 *   (pageChange)="onPageChange($event)"
 *   (pageSizeChange)="onPageSizeChange($event)"
 * />
 */
@Component({
  selector: "app-admin-pagination",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-pagination">
      <div class="pagination-info">
        <span>
          {{ startIndex() }}-{{ endIndex() }} de {{ total() }} resultados
        </span>

        @if (showPageSizeSelector()) {
        <select
          class="page-size-selector"
          [value]="pageSize()"
          (change)="onPageSizeChange($event)"
        >
          @for (size of pageSizeOptions(); track size) {
          <option [value]="size">{{ size }} por página</option>
          }
        </select>
        }
      </div>

      <div class="pagination-controls">
        <button
          class="nav-btn"
          [disabled]="page() === 1"
          (click)="goToFirstPage()"
          title="Primera página"
        >
          ⏮️
        </button>

        <button
          class="nav-btn"
          [disabled]="page() === 1"
          (click)="goToPrevPage()"
          title="Página anterior"
        >
          ◀️
        </button>

        <div class="page-numbers">
          @for (pageNum of visiblePages(); track pageNum) { @if (pageNum === -1)
          {
          <span class="ellipsis">...</span>
          } @else {
          <button
            class="page-btn"
            [class.active]="pageNum === page()"
            (click)="goToPage(pageNum)"
          >
            {{ pageNum }}
          </button>
          } }
        </div>

        <button
          class="nav-btn"
          [disabled]="page() === totalPages()"
          (click)="goToNextPage()"
          title="Página siguiente"
        >
          ▶️
        </button>

        <button
          class="nav-btn"
          [disabled]="page() === totalPages()"
          (click)="goToLastPage()"
          title="Última página"
        >
          ⏭️
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-pagination {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: var(--neutral-50);
        border-top: 1px solid var(--neutral-200);
        border-radius: 0 0 8px 8px;
      }

      .pagination-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        font-size: 0.875rem;
        color: var(--neutral-700);
      }

      .page-size-selector {
        padding: 0.375rem 0.75rem;
        border: 1px solid var(--neutral-300);
        border-radius: 6px;
        background: white;
        font-size: 0.875rem;
        color: var(--neutral-900);
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .page-size-selector:hover {
        border-color: var(--neutral-400);
      }

      .page-size-selector:focus {
        outline: none;
        border-color: var(--primary-500);
        box-shadow: 0 0 0 3px rgba(var(--primary-500-rgb), 0.1);
      }

      .pagination-controls {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .nav-btn,
      .page-btn {
        padding: 0.5rem 0.75rem;
        border: 1px solid var(--neutral-300);
        background: white;
        border-radius: 6px;
        font-size: 0.875rem;
        color: var(--neutral-900);
        cursor: pointer;
        transition: all 0.2s;
        min-width: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nav-btn:hover:not(:disabled),
      .page-btn:hover {
        background: var(--neutral-100);
        border-color: var(--neutral-400);
      }

      .nav-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .page-numbers {
        display: flex;
        gap: 0.25rem;
        align-items: center;
      }

      .page-btn.active {
        background: var(--primary-500);
        color: white;
        border-color: var(--primary-500);
        font-weight: 600;
      }

      .page-btn.active:hover {
        background: var(--primary-600);
        border-color: var(--primary-600);
      }

      .ellipsis {
        padding: 0 0.5rem;
        color: var(--neutral-500);
        user-select: none;
      }

      @media (max-width: 640px) {
        .admin-pagination {
          flex-direction: column;
          gap: 1rem;
        }

        .pagination-info {
          flex-direction: column;
          gap: 0.5rem;
        }

        .nav-btn,
        .page-btn {
          padding: 0.375rem 0.5rem;
          min-width: 36px;
          font-size: 0.75rem;
        }
      }
    `,
  ],
})
export class AdminPaginationComponent {
  // Inputs
  readonly total = input.required<number>();
  readonly page = input.required<number>();
  readonly pageSize = input(20);
  readonly showPageSizeSelector = input(true);
  readonly pageSizeOptions = input([10, 20, 50, 100]);

  // Outputs
  readonly pageChange = output<number>();
  readonly pageSizeChange = output<number>();

  // Computed
  readonly totalPages = computed(() =>
    Math.ceil(this.total() / this.pageSize())
  );

  readonly startIndex = computed(() => {
    const start = (this.page() - 1) * this.pageSize() + 1;
    return Math.min(start, this.total());
  });

  readonly endIndex = computed(() =>
    Math.min(this.page() * this.pageSize(), this.total())
  );

  readonly visiblePages = computed(() => {
    const current = this.page();
    const total = this.totalPages();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Complex pagination: 1 ... 4 5 6 ... 10
      if (current <= 4) {
        pages.push(1, 2, 3, 4, 5, -1, total);
      } else if (current >= total - 3) {
        pages.push(1, -1, total - 4, total - 3, total - 2, total - 1, total);
      } else {
        pages.push(1, -1, current - 1, current, current + 1, -1, total);
      }
    }

    return pages;
  });

  // Methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) {
      this.pageChange.emit(page);
    }
  }

  goToFirstPage(): void {
    this.goToPage(1);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages());
  }

  goToPrevPage(): void {
    this.goToPage(this.page() - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.page() + 1);
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newSize = parseInt(select.value, 10);
    this.pageSizeChange.emit(newSize);

    // Reset to page 1 when page size changes
    this.goToPage(1);
  }
}
