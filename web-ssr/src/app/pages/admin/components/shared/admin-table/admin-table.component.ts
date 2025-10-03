import { Component, input, output, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

export type SortDirection = "asc" | "desc" | null;

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  format?: "text" | "number" | "currency" | "date" | "badge" | "actions";
}

export interface TableAction<T = unknown> {
  label: string;
  icon?: string;
  variant?: "primary" | "secondary" | "danger";
  handler: (row: T) => void;
}

/**
 * AdminTableComponent
 *
 * Tabla reutilizable enterprise con:
 * - Sorting por columna
 * - Paginación integrada
 * - Selección múltiple (checkboxes)
 * - Acciones por fila
 * - Responsive
 * - Estados: loading, empty, error
 *
 * @example
 * <app-admin-table
 *   [data]="users()"
 *   [columns]="columns"
 *   [loading]="isLoading()"
 *   [pageSize]="20"
 *   [selectable]="true"
 *   (rowClick)="onRowClick($event)"
 *   (selectionChange)="onSelectionChange($event)"
 * />
 */
@Component({
  selector: "app-admin-table",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-table.component.html",
  styleUrls: ["./admin-table.component.css"],
})
export class AdminTableComponent<T = Record<string, unknown>> {
  // Inputs
  readonly data = input.required<T[]>();
  readonly columns = input.required<TableColumn[]>();
  readonly loading = input(false);
  readonly pageSize = input(20);
  readonly selectable = input(false);
  readonly actions = input<TableAction<T>[]>();
  readonly emptyMessage = input<string>();
  readonly trackByKey = input("id");

  // Outputs
  readonly rowClick = output<T>();
  readonly selectionChange = output<T[]>();
  readonly pageChange = output<number>();

  // State
  readonly page = signal(1);
  readonly sortKey = signal<string | null>(null);
  readonly sortDirection = signal<SortDirection>(null);
  private readonly selectedRows = signal<Set<string | number>>(new Set());

  // Computed
  readonly total = computed(() => this.data().length);

  readonly sortedData = computed(() => {
    const data = [...this.data()];
    const key = this.sortKey();
    const dir = this.sortDirection();

    if (!key || !dir) return data;

    return data.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[key];
      const bVal = (b as Record<string, unknown>)[key];

      if (aVal === bVal) return 0;

      // Type-safe comparison
      const aValComp = aVal as string | number | Date;
      const bValComp = bVal as string | number | Date;
      const comparison = aValComp < bValComp ? -1 : 1;
      return dir === "asc" ? comparison : -comparison;
    });
  });

  readonly paginatedData = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.sortedData().slice(start, end);
  });

  readonly totalPages = computed(() =>
    Math.ceil(this.total() / this.pageSize())
  );

  readonly startIndex = computed(() => (this.page() - 1) * this.pageSize());

  readonly endIndex = computed(() =>
    Math.min(this.startIndex() + this.pageSize(), this.total())
  );

  readonly visiblePages = computed(() => {
    const current = this.page();
    const total = this.totalPages();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
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

  readonly allSelected = computed(
    () =>
      this.data().length > 0 && this.selectedRows().size === this.data().length
  );

  readonly someSelected = computed(
    () =>
      this.selectedRows().size > 0 &&
      this.selectedRows().size < this.data().length
  );

  // Methods
  trackBy(row: T): string | number {
    const key = this.trackByKey();
    const value = (row as Record<string, unknown>)[key];
    return typeof value === "string" || typeof value === "number"
      ? value
      : String(value);
  }

  onSort(key: string): void {
    if (this.sortKey() === key) {
      // Toggle direction
      const current = this.sortDirection();
      this.sortDirection.set(
        current === "asc" ? "desc" : current === "desc" ? null : "asc"
      );
      if (this.sortDirection() === null) {
        this.sortKey.set(null);
      }
    } else {
      this.sortKey.set(key);
      this.sortDirection.set("asc");
    }
  }

  formatCell(value: unknown, format?: TableColumn["format"]): string {
    if (value == null) return "-";

    switch (format) {
      case "currency":
        return new Intl.NumberFormat("es-ES", {
          style: "currency",
          currency: "EUR",
        }).format(value as number);

      case "number":
        return new Intl.NumberFormat("es-ES").format(value as number);

      case "date":
        return new Date(value as string).toLocaleDateString("es-ES");

      default:
        return String(value);
    }
  }

  isRowSelected(row: T): boolean {
    return this.selectedRows().has(this.trackBy(row));
  }

  toggleRowSelection(row: T): void {
    const selected = new Set(this.selectedRows());
    const key = this.trackBy(row);

    if (selected.has(key)) {
      selected.delete(key);
    } else {
      selected.add(key);
    }

    this.selectedRows.set(selected);
    this.emitSelection();
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selectedRows.set(new Set());
    } else {
      const allKeys = new Set(this.data().map((row) => this.trackBy(row)));
      this.selectedRows.set(allKeys);
    }
    this.emitSelection();
  }

  private emitSelection(): void {
    const selectedData = this.data().filter((row) =>
      this.selectedRows().has(this.trackBy(row))
    );
    this.selectionChange.emit(selectedData);
  }

  onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.page.set(page);
      this.pageChange.emit(page);
    }
  }
}
