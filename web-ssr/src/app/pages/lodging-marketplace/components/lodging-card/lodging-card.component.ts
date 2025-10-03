import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Lodging } from "../../models/lodging-marketplace.models";

@Component({
  selector: "app-lodging-card",
  templateUrl: "./lodging-card.component.html",
  styleUrls: ["./lodging-card.component.css"],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class LodgingCardComponent {
  lodging = input.required<Lodging>();
  viewMode = input<"grid" | "list">("grid");

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      hotel: "🏨 Hotel",
      apartment: "🏢 Apartamento",
      hostel: "🛏️ Hostal",
      rural: "🏡 Casa Rural",
    };
    return labels[type] || type;
  }

  getServiceIcon(service: string): string {
    const icons: Record<string, string> = {
      wifi: "📶",
      parking: "🅿️",
      spa: "💆",
      pool: "🏊",
      restaurant: "🍽️",
      gym: "💪",
      "ski-storage": "⛷️",
      pets: "🐕",
    };
    return icons[service] || "✓";
  }

  getStars(): Array<"full" | "half" | "empty"> {
    const rating = this.lodging().rating;
    const stars: Array<"full" | "half" | "empty"> = [];

    for (let i = 1; i <= 5; i++) {
      if (rating >= i) {
        stars.push("full");
      } else if (rating >= i - 0.5) {
        stars.push("half");
      } else {
        stars.push("empty");
      }
    }

    return stars;
  }
}
