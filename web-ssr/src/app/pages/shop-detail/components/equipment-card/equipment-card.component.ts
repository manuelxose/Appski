import { Component, input, output, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import type {
  EquipmentItem,
  OfferTypeFilter,
} from "../../models/shop-detail.models";

@Component({
  selector: "app-equipment-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./equipment-card.component.html",
  styleUrl: "./equipment-card.component.css",
})
export class EquipmentCardComponent {
  // Inputs
  item = input.required<EquipmentItem>();
  offerType = input.required<OfferTypeFilter>();

  // Outputs
  rentalClick = output<EquipmentItem>();
  purchaseClick = output<EquipmentItem>();

  // Computed properties
  readonly displayPrice = computed(() => {
    const item = this.item();
    const type = this.offerType();

    if (type === "rental") {
      return item.pricePerDay ? `${item.pricePerDay}€/día` : "Consultar";
    } else {
      return item.salePrice ? `${item.salePrice}€` : "Consultar";
    }
  });

  readonly priceLabel = computed(() => {
    return this.offerType() === "rental" ? "Precio alquiler" : "Precio venta";
  });

  readonly hasRentalOption = computed(() => {
    const offerType = this.item().offerType;
    return offerType === "rental" || offerType === "both";
  });

  readonly hasSaleOption = computed(() => {
    const offerType = this.item().offerType;
    return offerType === "sale" || offerType === "both";
  });

  readonly actionButtonLabel = computed(() => {
    return this.offerType() === "rental" ? "Alquilar ahora" : "Comprar ahora";
  });

  readonly actionButtonIcon = computed(() => {
    return this.offerType() === "rental" ? "event_available" : "shopping_cart";
  });

  onActionClick(): void {
    const item = this.item();
    if (this.offerType() === "rental") {
      this.rentalClick.emit(item);
    } else {
      this.purchaseClick.emit(item);
    }
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      Esquís: "downhill_skiing",
      Snowboard: "snowboarding",
      Cascos: "sports_motorsports",
      Ropa: "checkroom",
      Accesorios: "shopping_bag",
    };
    return icons[category] || "inventory_2";
  }
}
