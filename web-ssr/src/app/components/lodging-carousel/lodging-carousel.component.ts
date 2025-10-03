import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  LodgingCarouselCardComponent,
  type LodgingCarouselItem,
} from "../lodging-carousel-card/lodging-carousel-card.component";

@Component({
  selector: "app-lodging-carousel",
  standalone: true,
  imports: [LodgingCarouselCardComponent, RouterLink],
  templateUrl: "./lodging-carousel.component.html",
  styleUrls: ["./lodging-carousel.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LodgingCarouselComponent {
  lodgings = signal<LodgingCarouselItem[]>([
    {
      id: "casa-refugio-montana",
      name: "Casa Rural El Refugio de Montaña",
      type: "rural",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect fill='%23F3F4F6' width='800' height='600'/%3E%3Ctext fill='%23334155' font-family='Arial' font-size='20' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ECasa Rural Montaña%3C/text%3E%3C/svg%3E",
      location: "Valle de Arán, Lleida",
      nearStation: "Baqueira",
      distanceToSlopes: 4.5,
      capacity: 8,
      pricePerNight: 185,
      rating: 4.8,
      reviewsCount: 124,
      hasOffer: true,
      offerPercentage: 15,
      freeCancellation: true,
      topServices: ["wifi", "parking", "ski-storage"],
    },
    {
      id: "apartamento-vista-pistas",
      name: "Apartamento Vista Pistas Premium",
      type: "apartment",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect fill='%23DBEAFE' width='800' height='600'/%3E%3Ctext fill='%23334155' font-family='Arial' font-size='20' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EApartamento Alpino%3C/text%3E%3C/svg%3E",
      location: "Formigal, Huesca",
      nearStation: "Formigal",
      distanceToSlopes: 0.5,
      capacity: 4,
      pricePerNight: 220,
      rating: 4.9,
      reviewsCount: 89,
      freeCancellation: true,
      topServices: ["wifi", "parking", "pool"],
    },
    {
      id: "hotel-boutique-sierra",
      name: "Hotel Boutique Sierra Nevada",
      type: "hotel",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect fill='%23FEF3C7' width='800' height='600'/%3E%3Ctext fill='%23334155' font-family='Arial' font-size='20' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EHotel Boutique%3C/text%3E%3C/svg%3E",
      location: "Pradollano, Granada",
      nearStation: "Sierra Nevada",
      distanceToSlopes: 0.2,
      capacity: 2,
      pricePerNight: 165,
      rating: 4.7,
      reviewsCount: 203,
      hasOffer: true,
      offerPercentage: 20,
      freeCancellation: true,
      topServices: ["spa", "restaurant", "ski-storage"],
    },
    {
      id: "casa-valle-tena",
      name: "Casa Tradicional Valle de Tena",
      type: "rural",
      image:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 600'%3E%3Crect fill='%23FEE2E2' width='800' height='600'/%3E%3Ctext fill='%23334155' font-family='Arial' font-size='20' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ECasa Valle%3C/text%3E%3C/svg%3E",
      location: "Sallent de Gállego, Huesca",
      nearStation: "Formigal",
      distanceToSlopes: 6.0,
      capacity: 10,
      pricePerNight: 240,
      rating: 4.9,
      reviewsCount: 67,
      topServices: ["wifi", "parking", "pets"],
    },
  ]);
}
