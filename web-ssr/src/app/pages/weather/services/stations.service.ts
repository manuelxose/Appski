import { Injectable, inject } from "@angular/core";
import { SnowApi } from "../../../snow/client/snow-api.service";
import type { StationDetailDto } from "../../../snow/models/dto";
import type { SkiStation } from "../models/meteo.models";

/**
 * Catálogo de estaciones desde el BORDE REAL (`/api/snow/v1/stations`).
 *
 * Antes: 7 estaciones hardcodeadas con slugs que NO existen en el maestro
 * (`formigal`, `cerler`, `sierra-nevada`, `vallnord`, `cotos`) — pedir su
 * "tiempo" daba 404 en el borde o inventaba una estación inexistente.
 *
 * Ahora el catálogo se carga del maestro y se cachea en memoria (una petición
 * por proceso SSR). Si la carga falla no se inventa catálogo: queda vacío y
 * `getStationBySlug` devuelve `null`, que la UI ya trata como "sin datos".
 */
@Injectable({ providedIn: "root" })
export class StationsService {
  private readonly api = inject(SnowApi);
  private cache: readonly SkiStation[] = [];
  private loaded = false;

  /** Carga (una vez) el maestro del borde. Idempotente. */
  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const res = await this.api.stations({ pageSize: 100, sort: "name" });
    this.cache = res.ok && res.body.status === "ok" ? res.body.stations.map(toSkiStation) : [];
  }

  getStationBySlug(slug: string): SkiStation | null {
    return this.cache.find((s) => s.slug === slug) ?? null;
  }

  getAllStations(): SkiStation[] {
    return [...this.cache];
  }

  getStationsByRegion(region: string): SkiStation[] {
    return this.cache.filter((s) => s.region === region);
  }

  getStationsByCountry(country: string): SkiStation[] {
    return this.cache.filter((s) => s.country === country);
  }

  /**
   * Altitud de una cota, o `null` si el maestro no la publica. La UI usa `null`
   * para mostrar "—", nunca 0 m.
   */
  getAltitudeForCota(slug: string, cota: "base" | "mid" | "top"): number | null {
    const station = this.getStationBySlug(slug);
    if (!station) return null;
    return station.altitudes[cota];
  }

  getFullStationName(slug: string): string {
    const station = this.getStationBySlug(slug);
    if (!station) return "Estación desconocida";
    return `${station.name}, ${station.region}`;
  }
}

/**
 * `StationDetailDto` → `SkiStation`. La cota media NO se publica en el maestro:
 * queda `null` en vez de estimarse como media de base y cima.
 */
function toSkiStation(d: StationDetailDto): SkiStation {
  return {
    slug: d.slug,
    name: d.name,
    region: d.region,
    country: d.country,
    altitudes: { base: d.altitudeBaseM, mid: null, top: d.altitudeTopM },
    location: { lat: d.lat, lng: d.lng },
    ...(d.website !== null ? { website: d.website } : {}),
    status: d.season === "open" ? "open" : d.season === "closed" ? "closed" : "seasonal",
  };
}
