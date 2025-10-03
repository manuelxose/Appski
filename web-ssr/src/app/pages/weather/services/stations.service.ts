import { Injectable } from "@angular/core";
import { SkiStation } from "../models/meteo.models";

/**
 * Servicio para gestionar información de estaciones de esquí
 * En producción, esto consumiría una API real
 */
@Injectable({
  providedIn: "root",
})
export class StationsService {
  // Base de datos de estaciones (en producción vendría del backend)
  private readonly stations: SkiStation[] = [
    {
      slug: "baqueira-beret",
      name: "Baqueira Beret",
      region: "Valle de Arán",
      country: "España",
      altitudes: {
        base: 1500,
        mid: 2000,
        top: 2510,
      },
      location: {
        lat: 42.7953,
        lng: 0.9317,
      },
      website: "https://www.baqueira.es",
      status: "open",
    },
    {
      slug: "formigal",
      name: "Formigal",
      region: "Huesca",
      country: "España",
      altitudes: {
        base: 1500,
        mid: 1950,
        top: 2250,
      },
      location: {
        lat: 42.7747,
        lng: -0.3747,
      },
      website: "https://www.formigal.com",
      status: "open",
    },
    {
      slug: "cerler",
      name: "Cerler",
      region: "Huesca",
      country: "España",
      altitudes: {
        base: 1500,
        mid: 1900,
        top: 2630,
      },
      location: {
        lat: 42.5747,
        lng: 0.5319,
      },
      website: "https://www.cerler.com",
      status: "open",
    },
    {
      slug: "sierra-nevada",
      name: "Sierra Nevada",
      region: "Granada",
      country: "España",
      altitudes: {
        base: 2100,
        mid: 2700,
        top: 3300,
      },
      location: {
        lat: 37.0959,
        lng: -3.3986,
      },
      website: "https://www.sierranevada.es",
      status: "open",
    },
    {
      slug: "grandvalira",
      name: "Grandvalira",
      region: "Andorra",
      country: "Andorra",
      altitudes: {
        base: 1710,
        mid: 2200,
        top: 2640,
      },
      location: {
        lat: 42.5397,
        lng: 1.6558,
      },
      website: "https://www.grandvalira.com",
      status: "open",
    },
    {
      slug: "vallnord",
      name: "Vallnord",
      region: "Andorra",
      country: "Andorra",
      altitudes: {
        base: 1550,
        mid: 2100,
        top: 2625,
      },
      location: {
        lat: 42.5667,
        lng: 1.5167,
      },
      website: "https://www.vallnord.com",
      status: "open",
    },
    {
      slug: "cotos",
      name: "Puerto de Cotos",
      region: "Madrid",
      country: "España",
      altitudes: {
        base: 1800,
        mid: 1950,
        top: 2100,
      },
      location: {
        lat: 40.8167,
        lng: -3.9667,
      },
      status: "seasonal",
    },
  ];

  /**
   * Obtiene información de una estación por su slug
   */
  getStationBySlug(slug: string): SkiStation | null {
    return this.stations.find((s) => s.slug === slug) || null;
  }

  /**
   * Obtiene todas las estaciones disponibles
   */
  getAllStations(): SkiStation[] {
    return [...this.stations];
  }

  /**
   * Obtiene estaciones de una región específica
   */
  getStationsByRegion(region: string): SkiStation[] {
    return this.stations.filter((s) => s.region === region);
  }

  /**
   * Obtiene estaciones por país
   */
  getStationsByCountry(country: string): SkiStation[] {
    return this.stations.filter((s) => s.country === country);
  }

  /**
   * Obtiene la altitud para una cota específica
   */
  getAltitudeForCota(
    slug: string,
    cota: "base" | "mid" | "top"
  ): number | null {
    const station = this.getStationBySlug(slug);
    return station ? station.altitudes[cota] : null;
  }

  /**
   * Formatea el nombre completo de la estación con región
   */
  getFullStationName(slug: string): string {
    const station = this.getStationBySlug(slug);
    if (!station) return "Estación desconocida";
    return `${station.name}, ${station.region}`;
  }
}
