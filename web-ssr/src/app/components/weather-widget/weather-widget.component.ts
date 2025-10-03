import {
  ChangeDetectionStrategy,
  Component,
  signal,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  snowfall24h: number;
  snowDepth: number;
  visibility: string;
  icon: string;
}

@Component({
  selector: "app-weather-widget",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./weather-widget.component.html",
  styleUrls: ["./weather-widget.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherWidgetComponent {
  // Demo data - en producción vendría de un servicio
  currentWeather = signal<WeatherData>({
    location: "Sierra Nevada",
    temperature: -3,
    condition: "Nevando",
    humidity: 85,
    windSpeed: 25,
    snowfall24h: 15,
    snowDepth: 120,
    visibility: "Buena",
    icon: "❄️",
  });

  // Computed para determinar la calidad de las condiciones
  weatherQuality = computed(() => {
    const weather = this.currentWeather();
    const score =
      (weather.snowDepth > 100 ? 30 : weather.snowDepth * 0.3) +
      (weather.snowfall24h > 10 ? 30 : weather.snowfall24h * 3) +
      (weather.windSpeed < 30 ? 40 : 40 - weather.windSpeed);

    if (score > 80) return { label: "Excelente", color: "success" };
    if (score > 60) return { label: "Bueno", color: "primary" };
    if (score > 40) return { label: "Aceptable", color: "warning" };
    return { label: "Regular", color: "error" };
  });
}
