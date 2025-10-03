import { NgClass } from "@angular/common";
import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import {
  SnowReport,
  SnowQuality,
  Visibility,
} from "../../models/station-detail.models";

// Re-export for backward compatibility
export type { SnowReport, SnowQuality, Visibility };

@Component({
  selector: "app-station-snow-report",
  standalone: true,
  imports: [NgClass],
  templateUrl: "./station-snow-report.component.html",
  styleUrls: ["./station-snow-report.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationSnowReportComponent {
  snowReport = input.required<SnowReport>();

  getQualityLabel(quality: string): string {
    const labels = {
      powder: "Polvo",
      "packed-powder": "Compacta",
      spring: "Primavera",
      hard: "Dura",
      icy: "Hielo",
    };
    return labels[quality as keyof typeof labels] || quality;
  }

  getQualityColor(quality: string): string {
    const colors = {
      powder: "text-blue-600 bg-blue-50",
      "packed-powder": "text-green-600 bg-green-50",
      spring: "text-yellow-600 bg-yellow-50",
      hard: "text-orange-600 bg-orange-50",
      icy: "text-gray-600 bg-gray-50",
    };
    return colors[quality as keyof typeof colors] || "text-gray-600 bg-gray-50";
  }

  getVisibilityLabel(visibility: string): string {
    const labels = {
      excellent: "Excelente",
      good: "Buena",
      moderate: "Regular",
      poor: "Mala",
    };
    return labels[visibility as keyof typeof labels] || visibility;
  }
}
