import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { RentalShop } from "../../models/shop-detail.models";

@Component({
  selector: "app-shop-header",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./shop-header.component.html",
  styleUrl: "./shop-header.component.css",
})
export class ShopHeaderComponent {
  shop = input.required<RentalShop>();
  contactClick = output<void>();
  callClick = output<void>();

  onContactClick(): void {
    this.contactClick.emit();
  }

  onCallClick(): void {
    this.callClick.emit();
  }

  get availabilityClass(): string {
    const availability = this.shop().availability;
    const map: Record<string, string> = {
      high: "availability-high",
      medium: "availability-medium",
      low: "availability-low",
    };
    return map[availability] || "availability-medium";
  }

  get availabilityLabel(): string {
    const availability = this.shop().availability;
    const map: Record<string, string> = {
      high: "Alta disponibilidad",
      medium: "Disponibilidad media",
      low: "Baja disponibilidad",
    };
    return map[availability] || "Disponibilidad media";
  }
}
