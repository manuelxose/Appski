import { NgClass } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  input,
  inject,
} from "@angular/core";
import { Router } from "@angular/router";
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
  private readonly router = inject(Router);
  snowReport = input.required<SnowReport>();
  goToWeather = input<() => void>();
  stationSlug = input<string>();

  // Navega al parte completo usando el slug si está disponible
  goToWeatherHandler(): void {
    const goToWeatherFn = this.goToWeather();
    if (goToWeatherFn) {
      goToWeatherFn();
    } else if (this.stationSlug()) {
      // Usa router si está disponible
      if (this.router) {
        this.router.navigate(["/estacion", this.stationSlug(), "tiempo"]);
      } else {
        window.location.href = `/estacion/${this.stationSlug()}/tiempo`;
      }
    } else {
      window.location.href = "/meteorologia";
    }
  }

  /** `null` = el parte no publica calidad: se muestra "—", no se presume calidad. */
  getQualityLabel(quality: string | null): string {
    if (quality === null) return "—";
    const labels = {
      powder: "Polvo",
      "packed-powder": "Compacta",
      spring: "Primavera",
      hard: "Dura",
      icy: "Hielo",
    };
    return labels[quality as keyof typeof labels] || quality;
  }

  getQualityColor(quality: string | null): string {
    if (quality === null) return "text-slate-500 bg-slate-50";
    const colors = {
      powder: "text-blue-600 bg-blue-50",
      "packed-powder": "text-green-600 bg-green-50",
      spring: "text-yellow-600 bg-yellow-50",
      hard: "text-orange-600 bg-orange-50",
      icy: "text-gray-600 bg-gray-50",
    };
    return colors[quality as keyof typeof colors] || "text-gray-600 bg-gray-50";
  }

  /** Sin estación meteorológica autorizada no hay visibilidad: "Sin datos". */
  getVisibilityLabel(visibility: string | null): string {
    if (visibility === null || visibility === "unknown") return "Sin datos";
    const labels = {
      excellent: "Excelente",
      good: "Buena",
      moderate: "Regular",
      poor: "Mala",
    };
    return labels[visibility as keyof typeof labels] || visibility;
  }
}
