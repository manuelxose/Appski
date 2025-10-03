import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { FormsModule } from "@angular/forms";
import {
  LodgingDetail,
  LodgingDetailPageData,
} from "./models/lodging-detail.models";
import { LodgingDetailDataService } from "./services/lodging-detail.data.service";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";

@Component({
  selector: "app-lodging-detail",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    SiteHeaderComponent,
    SiteFooterComponent,
  ],
  templateUrl: "./lodging-detail.html",
  styleUrls: ["./lodging-detail.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LodgingDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dataService = inject(LodgingDetailDataService);

  // Page data from service
  pageData = signal<LodgingDetailPageData | null>(null);
  lodging = signal<LodgingDetail | null>(null);

  // UI state
  selectedImage = signal(0);
  checkInDate = signal("");
  checkOutDate = signal("");
  guests = signal(2);

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get("id");
    if (slug) {
      await this.loadLodgingDetail(slug);
    }
  }

  private async loadLodgingDetail(slug: string): Promise<void> {
    try {
      const data = await this.dataService.loadLodgingDetailBySlug(slug);
      this.pageData.set(data);
      this.lodging.set(data.lodging);
    } catch (error) {
      console.error("Error loading lodging detail:", error);
      this.pageData.set(null);
      this.lodging.set(null);
    }
  }

  selectImage(index: number): void {
    this.selectedImage.set(index);
  }

  nextImage(): void {
    const current = this.selectedImage();
    const total = this.lodging()?.images.length || 0;
    this.selectedImage.set((current + 1) % total);
  }

  prevImage(): void {
    const current = this.selectedImage();
    const total = this.lodging()?.images.length || 0;
    this.selectedImage.set((current - 1 + total) % total);
  }

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
    const amenity = this.pageData()?.amenities.find((a) => a.value === service);
    return amenity?.icon || "✓";
  }

  getServiceName(service: string): string {
    const amenity = this.pageData()?.amenities.find((a) => a.value === service);
    return amenity?.label || service;
  }

  reserve(): void {
    console.log("Reserva:", {
      lodging: this.lodging()?.id,
      checkIn: this.checkInDate(),
      checkOut: this.checkOutDate(),
      guests: this.guests(),
    });
    // En producción: navegar a página de reserva o abrir modal
  }

  calculateTotalNights(): number {
    const pricePerNight = this.lodging()?.pricePerNight || 0;
    const pricing = this.dataService.calculateBookingPrice(
      pricePerNight,
      this.checkInDate(),
      this.checkOutDate()
    );
    return pricing.nights;
  }

  calculateTotalPrice(): number {
    const pricePerNight = this.lodging()?.pricePerNight || 0;
    const pricing = this.dataService.calculateBookingPrice(
      pricePerNight,
      this.checkInDate(),
      this.checkOutDate()
    );
    return pricing.total;
  }
}
