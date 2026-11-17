import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

export interface Station {
  id: string;
  name: string;
  location: string;
  image: string;
  isOpen: boolean;
  // Cifras del BORDE. `null` = sin dato publicado (NUNCA 0 cm ni estimación).
  snowBase: number | null; // cm
  snowTop: number | null; // cm
  snowFresh: number | null; // cm en últimas 24h
  liftsOpen: number | null;
  liftsTotal: number | null;
  slopesOpen: number | null;
  slopesTotal: number | null;
  weather?: string; // ☀️, ⛅, ☁️, 🌨️
  temperature?: number | null; // °C
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

  /**
   * Calidad declarada a partir de datos PUBLICADOS. Sin dato (`null`) NO se
   * presume calidad: se devuelve "sin datos", nunca "condiciones aceptables",
   * que sería afirmar algo que la fuente no ha dicho.
   */
  getSnowQuality(): { label: string; color: string } {
    const fresh = this.station().snowFresh;
    const base = this.station().snowBase;

    if (fresh !== null && fresh >= 20) {
      return { label: "Nieve polvo", color: "text-blue-600" };
    }
    if (fresh !== null && fresh >= 10) {
      return { label: "Nieve fresca", color: "text-green-600" };
    }
    if (base !== null && base >= 100) {
      return { label: "Buenas condiciones", color: "text-cyan-600" };
    }
    if (base === null && fresh === null) {
      return { label: "Sin datos", color: "text-slate-500" };
    }
    return { label: "Condiciones aceptables", color: "text-slate-600" };
  }
}
