import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

export interface LodgingCarouselItem {
  id: string;
  name: string;
  type: "hotel" | "apartment" | "hostel" | "rural";
  image: string;
  location: string;
  nearStation: string;
  distanceToSlopes: number;
  capacity: number;
  pricePerNight: number;
  rating: number;
  reviewsCount: number;
  hasOffer?: boolean;
  offerPercentage?: number;
  freeCancellation?: boolean;
  topServices?: string[]; // Top 3 servicios para mostrar
}

@Component({
  selector: "app-lodging-carousel-card",
  templateUrl: "./lodging-carousel-card.component.html",
  styleUrls: ["./lodging-carousel-card.component.css"],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class LodgingCarouselCardComponent {
  lodging = input.required<LodgingCarouselItem>();

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      hotel: "🏨",
      apartment: "🏢",
      hostel: "🛏️",
      rural: "🏡",
    };
    return icons[type] || "🏠";
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      hotel: "Hotel",
      apartment: "Apartamento",
      hostel: "Hostal",
      rural: "Casa Rural",
    };
    return labels[type] || type;
  }

  getStars(): Array<"full" | "empty"> {
    const rating = this.lodging().rating;
    const stars: Array<"full" | "empty"> = [];

    for (let i = 1; i <= 5; i++) {
      stars.push(rating >= i ? "full" : "empty");
    }

    return stars;
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
}
