import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

export interface RentalShop {
  id: string;
  name: string;
  image: string;
  location: string;
  distanceToSlopes: number; // km
  priceFrom: number; // per day
  rating: number;
  reviewsCount: number;
  equipmentAvailable: string[]; // equipment type values
  hasOnlineBooking: boolean;
  hasDiscount: boolean;
  discountPercentage?: number;
  hasDelivery: boolean;
  available: boolean;
}

@Component({
  selector: "app-rental-shop-card",
  templateUrl: "./rental-shop-card.component.html",
  styleUrls: ["./rental-shop-card.component.css"],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class RentalShopCardComponent {
  shop = input.required<RentalShop>();

  getEquipmentIcon(type: string): string {
    const icons: Record<string, string> = {
      skis: "⛷️",
      snowboard: "🏂",
      boots: "👢",
      poles: "🎿",
      helmet: "⛑️",
      goggles: "🥽",
      snowshoes: "🥾",
      clothing: "🧥",
    };
    return icons[type] || "✓";
  }

  getStars(): Array<"full" | "half" | "empty"> {
    const rating = this.shop().rating;
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
