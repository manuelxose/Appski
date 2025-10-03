import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RentalShop } from "../../models/rental-marketplace.models";

@Component({
  selector: "app-rental-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./rental-card.component.html",
  styleUrls: ["./rental-card.component.css"],
})
export class RentalCardComponent {
  // Input - shop data from parent
  shop = input.required<RentalShop>();

  // Output - emit when user wants to view shop detail
  viewDetail = output<string>();

  /**
   * Get color for availability badge
   */
  getAvailabilityColor(availability: string): string {
    switch (availability) {
      case "high":
        return "var(--success-500)";
      case "medium":
        return "var(--warning-500)";
      case "low":
        return "var(--error-500)";
      default:
        return "var(--neutral-500)";
    }
  }

  /**
   * Get text for availability badge
   */
  getAvailabilityText(availability: string): string {
    switch (availability) {
      case "high":
        return "Alta disponibilidad";
      case "medium":
        return "Disponibilidad media";
      case "low":
        return "Poca disponibilidad";
      default:
        return "No disponible";
    }
  }

  /**
   * Get icon for specialty badge
   */
  getSpecialtyIcon(specialty: string): string {
    switch (specialty) {
      case "Expertos":
        return "workspace_premium";
      case "Niños":
        return "child_care";
      case "Principiantes":
        return "school";
      case "Intermedio":
        return "trending_up";
      case "Freestyle":
        return "sports_gymnastics";
      case "Touring":
        return "hiking";
      default:
        return "check_circle";
    }
  }

  /**
   * Emit view detail event
   */
  onViewDetail(): void {
    const slug = this.shop().slug;
    console.log("RentalCard - onViewDetail called with slug:", slug);
    this.viewDetail.emit(slug);
  }
}
