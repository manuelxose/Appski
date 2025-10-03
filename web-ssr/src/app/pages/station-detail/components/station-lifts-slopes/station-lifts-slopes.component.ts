import { NgClass } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import {
  Lift,
  Slope,
  LiftsSlopesData,
} from "../../models/station-detail.models";

// Re-export for backward compatibility
export type { Lift, Slope, LiftsSlopesData };

@Component({
  selector: "app-station-lifts-slopes",
  standalone: true,
  imports: [NgClass],
  templateUrl: "./station-lifts-slopes.component.html",
  styleUrls: ["./station-lifts-slopes.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationLiftsSlopesComponent {
  data = input.required<LiftsSlopesData>();

  getLiftIcon(type: string): string {
    const icons = {
      chairlift: "🚡",
      gondola: "🚠",
      "t-bar": "⛷️",
      "magic-carpet": "🎢",
    };
    return icons[type as keyof typeof icons] || "🚡";
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      open: "bg-green-50 text-green-700 border-green-200",
      closed: "bg-red-50 text-red-700 border-red-200",
      maintenance: "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
    return (
      classes[status as keyof typeof classes] ||
      "bg-gray-50 text-gray-700 border-gray-200"
    );
  }

  getDifficultyColor(difficulty: string): string {
    const colors = {
      green: "bg-green-500",
      blue: "bg-blue-500",
      red: "bg-red-500",
      black: "bg-slate-900",
    };
    return colors[difficulty as keyof typeof colors] || "bg-gray-500";
  }

  getPercentage(open: number, total: number): number {
    return Math.round((open / total) * 100);
  }
}
