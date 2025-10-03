import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Lodging } from "../../models/lodging-marketplace.models";

@Component({
  selector: "app-lodging-map-view",
  templateUrl: "./lodging-map-view.component.html",
  styleUrls: ["./lodging-map-view.component.css"],
  standalone: true,
  imports: [CommonModule],
})
export class LodgingMapViewComponent {
  lodgings = input.required<Lodging[]>();
  selectedLodging = output<string>(); // lodging ID

  hoveredLodging: string | null = null;

  onMarkerClick(lodgingId: string): void {
    this.selectedLodging.emit(lodgingId);
  }

  onMarkerHover(lodgingId: string | null): void {
    this.hoveredLodging = lodgingId;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      hotel: "🏨",
      apartment: "🏢",
      hostel: "🛏️",
      rural: "🏡",
    };
    return icons[type] || "📍";
  }
}
