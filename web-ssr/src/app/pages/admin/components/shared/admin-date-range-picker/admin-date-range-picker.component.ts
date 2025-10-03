import { Component, input, output, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

export type DateRangePreset =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom";

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  preset?: DateRangePreset;
}

/**
 * AdminDateRangePickerComponent
 *
 * Selector de rango de fechas con presets comunes
 *
 * @example
 * <app-admin-date-range-picker
 *   [value]="dateRange()"
 *   [showPresets]="true"
 *   (rangeChange)="onDateRangeChange($event)"
 * />
 */
@Component({
  selector: "app-admin-date-range-picker",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./admin-date-range-picker.component.html",
  styleUrl: "./admin-date-range-picker.component.css",
})
export class AdminDateRangePickerComponent {
  readonly value = input<DateRange>({ startDate: null, endDate: null });
  readonly showPresets = input(true);
  readonly minDate = input<Date>();
  readonly maxDate = input<Date>();

  readonly rangeChange = output<DateRange>();

  readonly isOpen = signal(false);
  readonly startDate = signal<string>("");
  readonly endDate = signal<string>("");

  readonly presets: { key: DateRangePreset; label: string }[] = [
    { key: "today", label: "Hoy" },
    { key: "yesterday", label: "Ayer" },
    { key: "last7days", label: "Últimos 7 días" },
    { key: "last30days", label: "Últimos 30 días" },
    { key: "thisMonth", label: "Este mes" },
    { key: "lastMonth", label: "Mes pasado" },
    { key: "thisYear", label: "Este año" },
    { key: "custom", label: "Personalizado" },
  ];

  readonly selectedPreset = signal<DateRangePreset | null>(null);

  readonly displayLabel = computed(() => {
    const val = this.value();
    if (!val.startDate || !val.endDate) {
      return "Seleccionar rango";
    }

    const start = this.formatDate(val.startDate);
    const end = this.formatDate(val.endDate);

    if (val.preset && val.preset !== "custom") {
      const preset = this.presets.find((p) => p.key === val.preset);
      return preset?.label || `${start} - ${end}`;
    }

    return `${start} - ${end}`;
  });

  togglePicker(): void {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) {
      const val = this.value();
      if (val.startDate) {
        this.startDate.set(this.toInputValue(val.startDate));
      }
      if (val.endDate) {
        this.endDate.set(this.toInputValue(val.endDate));
      }
      this.selectedPreset.set(val.preset || null);
    }
  }

  selectPreset(preset: DateRangePreset): void {
    this.selectedPreset.set(preset);

    if (preset === "custom") {
      return;
    }

    const range = this.getPresetRange(preset);
    if (range.startDate && range.endDate) {
      this.startDate.set(this.toInputValue(range.startDate));
      this.endDate.set(this.toInputValue(range.endDate));
    }
    this.applyRange();
  }

  applyRange(): void {
    const start = this.startDate() ? new Date(this.startDate()) : null;
    const end = this.endDate() ? new Date(this.endDate()) : null;

    if (start && end && start > end) {
      return;
    }

    this.rangeChange.emit({
      startDate: start,
      endDate: end,
      preset: this.selectedPreset() || undefined,
    });

    this.isOpen.set(false);
  }

  private getPresetRange(preset: DateRangePreset): DateRange {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (preset) {
      case "today":
        return { startDate: today, endDate: today };

      case "yesterday": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: yesterday, endDate: yesterday };
      }

      case "last7days": {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        return { startDate: start, endDate: today };
      }

      case "last30days": {
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        return { startDate: start, endDate: today };
      }

      case "thisMonth": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { startDate: start, endDate: today };
      }

      case "lastMonth": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { startDate: start, endDate: end };
      }

      case "thisYear": {
        const start = new Date(now.getFullYear(), 0, 1);
        return { startDate: start, endDate: today };
      }

      default:
        return { startDate: null, endDate: null };
    }
  }

  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  toInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
