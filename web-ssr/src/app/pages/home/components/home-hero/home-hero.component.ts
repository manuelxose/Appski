import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

export interface SearchSuggestion {
  name: string;
  type: "station" | "region" | "resort";
  location: string;
  openStatus?: boolean;
}

@Component({
  selector: "app-home-hero",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./home-hero.component.html",
  styleUrls: ["./home-hero.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeHeroComponent {
  searchQuery = signal("");
  showSuggestions = signal(false);
  activeFilter = signal<string | null>(null);

  // Sugerencias de estaciones
  allSuggestions: SearchSuggestion[] = [
    {
      name: "Sierra Nevada",
      type: "station",
      location: "Granada",
      openStatus: true,
    },
    {
      name: "Baqueira Beret",
      type: "station",
      location: "Val d'Aran",
      openStatus: true,
    },
    { name: "Formigal", type: "station", location: "Huesca", openStatus: true },
    {
      name: "Candanchú",
      type: "station",
      location: "Huesca",
      openStatus: false,
    },
    { name: "Cerler", type: "station", location: "Huesca", openStatus: true },
    {
      name: "La Molina",
      type: "station",
      location: "Girona",
      openStatus: true,
    },
    { name: "Pirineos", type: "region", location: "España", openStatus: true },
    { name: "Sistema Central", type: "region", location: "España" },
  ];

  filteredSuggestions = signal<SearchSuggestion[]>([]);

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);

    if (query.length > 0) {
      const filtered = this.allSuggestions.filter(
        (s) =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.location.toLowerCase().includes(query.toLowerCase())
      );
      this.filteredSuggestions.set(filtered);
      this.showSuggestions.set(true);
    } else {
      this.showSuggestions.set(false);
    }
  }

  selectSuggestion(suggestion: SearchSuggestion): void {
    this.searchQuery.set(suggestion.name);
    this.showSuggestions.set(false);
  }

  toggleFilter(filter: string): void {
    this.activeFilter.set(this.activeFilter() === filter ? null : filter);
  }

  search(): void {
    console.log("Searching:", {
      query: this.searchQuery(),
      filter: this.activeFilter(),
    });
    // En producción, navegar a /estaciones con parámetros de búsqueda y filtros
  }
}
