import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { RouterLink } from "@angular/router";
import { StationHeroData } from "../../models/station-detail.models";

// Re-export for backward compatibility
export type { StationHeroData };

@Component({
  selector: "app-station-hero",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./station-hero.component.html",
  styleUrls: ["./station-hero.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationHeroComponent {
  station = input.required<StationHeroData>();

  getStars(rating: number): string[] {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const stars: string[] = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push("full");
    }
    if (hasHalfStar) {
      stars.push("half");
    }
    while (stars.length < 5) {
      stars.push("empty");
    }
    return stars;
  }
}
