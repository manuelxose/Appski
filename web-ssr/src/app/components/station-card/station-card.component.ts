import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

export interface Station {
  id: string;
  name: string;
  location: string;
  image: string;
  isOpen: boolean;
  snowBase: number; // cm
  snowTop: number; // cm
  snowFresh: number; // cm en últimas 24h
  liftsOpen: number;
  liftsTotal: number;
  slopesOpen: number;
  slopesTotal: number;
  weather?: string; // ☀️, ⛅, ☁️, 🌨️
  temperature?: number; // °C
}

@Component({
  selector: "app-station-card",
  templateUrl: "./station-card.component.html",
  styleUrls: ["./station-card.component.css"],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class StationCardComponent {
  station = input.required<Station>();

  getStatusBadge(): { text: string; class: string } {
    const isOpen = this.station().isOpen;
    return {
      text: isOpen ? "ABIERTA" : "CERRADA",
      class: isOpen ? "bg-green-500 text-white" : "bg-gray-400 text-white",
    };
  }

  getSnowQuality(): { label: string; color: string } {
    const fresh = this.station().snowFresh;
    const base = this.station().snowBase;

    if (fresh >= 20) {
      return { label: "Nieve polvo", color: "text-blue-600" };
    } else if (fresh >= 10) {
      return { label: "Nieve fresca", color: "text-green-600" };
    } else if (base >= 100) {
      return { label: "Buenas condiciones", color: "text-cyan-600" };
    } else {
      return { label: "Condiciones aceptables", color: "text-slate-600" };
    }
  }
}
