import { Component, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { ShopDetailService } from "./services/shop-detail.service";
import { ShopHeaderComponent } from "./components/shop-header/shop-header.component";
import { EquipmentFiltersComponent } from "./components/equipment-filters/equipment-filters.component";
import { EquipmentCardComponent } from "./components/equipment-card/equipment-card.component";
import type {
  EquipmentItem,
  EquipmentCategory,
  OfferTypeFilter,
} from "./models/shop-detail.models";

@Component({
  selector: "app-shop-detail",
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    SiteFooterComponent,
    ShopHeaderComponent,
    EquipmentFiltersComponent,
    EquipmentCardComponent,
  ],
  templateUrl: "./shop-detail.component.html",
  styleUrls: ["./shop-detail.component.css"],
})
export class ShopDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly shopService = inject(ShopDetailService);

  async ngOnInit() {
    console.log("ShopDetail - ngOnInit called");
    const slug = this.route.snapshot.paramMap.get("slug");
    console.log("ShopDetail - Route slug:", slug);

    if (slug) {
      const success = await this.shopService.loadShop(slug);
      console.log("ShopDetail - Shop loaded:", success);
      if (!success) {
        console.warn("ShopDetail - Shop not found, redirecting...");
        this.router.navigate(["/alquiler-material"]);
      }
    } else {
      console.error("ShopDetail - No slug in route params!");
      this.router.navigate(["/alquiler-material"]);
    }
  }

  onCategoryChange(category: EquipmentCategory): void {
    this.shopService.setCategory(category);
  }

  onOfferTypeChange(type: OfferTypeFilter): void {
    this.shopService.setOfferType(type);
  }

  onAvailabilityToggle(): void {
    this.shopService.toggleAvailability();
  }

  onContactShop(): void {
    const shop = this.shopService.currentShop();
    if (shop) window.location.href = `mailto:${shop.email}`;
  }

  onCallShop(): void {
    const shop = this.shopService.currentShop();
    if (shop) window.location.href = `tel:${shop.phone}`;
  }

  onRentalClick(item: EquipmentItem): void {
    alert(`Alquiler: ${item.name} - ${item.pricePerDay} euros/dia`);
  }

  onPurchaseClick(item: EquipmentItem): void {
    alert(`Compra: ${item.name} - ${item.salePrice} euros`);
  }

  getCategoryCount = (category: string): number => {
    return this.shopService.getCountByCategory(category);
  };
}
