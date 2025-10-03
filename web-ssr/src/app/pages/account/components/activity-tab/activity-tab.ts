import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { MonthlyActivity } from "../../models/account.models";
import { AccountService } from "../../services/account.service";

@Component({
  selector: "app-activity-tab",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./activity-tab.html",
  styleUrls: ["./activity-tab.css"],
})
export class ActivityTabComponent {
  private readonly accountService = inject(AccountService);

  // State from service
  readonly activityData = this.accountService.activityStats;
  readonly isLoading = this.accountService.isLoadingActivity;

  // Helper methods
  formatNumber(value: number): string {
    return value.toLocaleString("es-ES");
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  formatMonth(monthString: string): string {
    // monthString format: "2024-12"
    const [year, month] = monthString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("es-ES", { month: "short" }).toUpperCase();
  }

  formatMonthFull(monthString: string): string {
    const [year, month] = monthString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  getSkillLevelLabel(level: string): string {
    const labels: Record<string, string> = {
      beginner: "Principiante",
      intermediate: "Intermedio",
      advanced: "Avanzado",
      expert: "Experto",
    };
    return labels[level] || level;
  }

  getBarHeight(value: number, maxValue: number): number {
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  }

  getMaxValue(
    data: MonthlyActivity[],
    field: "days" | "kilometers" | "runs"
  ): number {
    if (data.length === 0) return 1;
    return Math.max(...data.map((item) => item[field]));
  }
}
