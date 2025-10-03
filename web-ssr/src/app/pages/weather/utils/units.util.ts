/**
 * Utilidades de conversión de unidades meteorológicas
 */

export class UnitsUtil {
  /**
   * Celsius a Fahrenheit
   */
  static celsiusToFahrenheit(celsius: number): number {
    return (celsius * 9) / 5 + 32;
  }

  /**
   * Fahrenheit a Celsius
   */
  static fahrenheitToCelsius(fahrenheit: number): number {
    return ((fahrenheit - 32) * 5) / 9;
  }

  /**
   * km/h a m/s
   */
  static kmhToMs(kmh: number): number {
    return kmh / 3.6;
  }

  /**
   * m/s a km/h
   */
  static msToKmh(ms: number): number {
    return ms * 3.6;
  }

  /**
   * km/h a mph
   */
  static kmhToMph(kmh: number): number {
    return kmh * 0.621371;
  }

  /**
   * mm lluvia a cm nieve (ratio aproximado 1:10)
   */
  static mmRainToCmSnow(mm: number, ratio = 10): number {
    return mm / ratio;
  }

  /**
   * cm nieve a mm agua equivalente
   */
  static cmSnowToMmWater(cm: number, ratio = 10): number {
    return cm * ratio;
  }

  /**
   * Metros a pies
   */
  static metersToFeet(meters: number): number {
    return meters * 3.28084;
  }

  /**
   * Pies a metros
   */
  static feetToMeters(feet: number): number {
    return feet / 3.28084;
  }

  /**
   * Formato de temperatura con unidad
   */
  static formatTemp(tempC: number, unit: "C" | "F" = "C"): string {
    if (unit === "F") {
      return `${Math.round(this.celsiusToFahrenheit(tempC))}°F`;
    }
    return `${Math.round(tempC)}°C`;
  }

  /**
   * Formato de velocidad de viento con unidad
   */
  static formatWind(kmh: number, unit: "kmh" | "ms" | "mph" = "kmh"): string {
    switch (unit) {
      case "ms":
        return `${Math.round(this.kmhToMs(kmh))} m/s`;
      case "mph":
        return `${Math.round(this.kmhToMph(kmh))} mph`;
      default:
        return `${Math.round(kmh)} km/h`;
    }
  }

  /**
   * Formato de distancia/altura con unidad
   */
  static formatDistance(meters: number, unit: "m" | "ft" = "m"): string {
    if (unit === "ft") {
      return `${Math.round(this.metersToFeet(meters))} ft`;
    }
    return `${Math.round(meters)} m`;
  }

  /**
   * Formato de acumulación de nieve
   */
  static formatSnow(cm: number, unit: "cm" | "in" = "cm"): string {
    if (unit === "in") {
      const inches = cm / 2.54;
      return `${inches.toFixed(1)} in`;
    }
    return `${cm} cm`;
  }

  /**
   * Calcula el wind chill (sensación térmica por viento)
   */
  static windChill(tempC: number, windKmh: number): number {
    if (tempC > 10 || windKmh < 4.8) {
      return tempC;
    }
    const windKph = Math.pow(windKmh, 0.16);
    return 13.12 + 0.6215 * tempC - 11.37 * windKph + 0.3965 * tempC * windKph;
  }

  /**
   * Categoría de viento según escala Beaufort
   */
  static windCategory(kmh: number): {
    beaufort: number;
    description: string;
  } {
    if (kmh < 1) return { beaufort: 0, description: "Calma" };
    if (kmh < 6) return { beaufort: 1, description: "Ventolina" };
    if (kmh < 12) return { beaufort: 2, description: "Brisa muy débil" };
    if (kmh < 20) return { beaufort: 3, description: "Brisa débil" };
    if (kmh < 29) return { beaufort: 4, description: "Brisa moderada" };
    if (kmh < 39) return { beaufort: 5, description: "Brisa fresca" };
    if (kmh < 50) return { beaufort: 6, description: "Brisa fuerte" };
    if (kmh < 62) return { beaufort: 7, description: "Viento fuerte" };
    if (kmh < 75) return { beaufort: 8, description: "Temporal" };
    if (kmh < 89) return { beaufort: 9, description: "Temporal fuerte" };
    if (kmh < 103) return { beaufort: 10, description: "Temporal muy fuerte" };
    if (kmh < 118) return { beaufort: 11, description: "Borrasca" };
    return { beaufort: 12, description: "Huracán" };
  }

  /**
   * Nivel de riesgo por visibilidad
   */
  static visibilityRisk(meters: number | null): {
    level: "low" | "medium" | "high" | "extreme";
    description: string;
  } {
    if (meters === null) {
      return { level: "low", description: "Buena visibilidad" };
    }
    if (meters < 500) return { level: "extreme", description: "Peligrosa" };
    if (meters < 1000) return { level: "high", description: "Muy reducida" };
    if (meters < 2000) return { level: "medium", description: "Reducida" };
    return { level: "low", description: "Buena" };
  }
}
