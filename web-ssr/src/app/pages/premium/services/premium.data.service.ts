/**
 * Premium Data Service
 * Handles loading premium page data from mock JSON (SSR-safe)
 */

import { Injectable } from "@angular/core";
import { signal } from "@angular/core";
import type { PremiumPageData } from "../models/premium.models";

@Injectable({
  providedIn: "root",
})
export class PremiumDataService {
  // Signal-based state
  private readonly premiumDataSignal = signal<PremiumPageData | null>(null);
  private readonly loadingSignal = signal<boolean>(false);
  private readonly errorSignal = signal<string | null>(null);

  // Public read-only signals
  readonly premiumData = this.premiumDataSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Load premium page data from mock JSON
   * SSR-safe: Works on both server and browser
   */
  async loadPremiumData(): Promise<PremiumPageData | null> {
    // If already loaded, return cached data
    if (this.premiumDataSignal()) {
      return this.premiumDataSignal();
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await fetch("/assets/mocks/premium-page.mock.json");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PremiumPageData = await response.json();
      this.premiumDataSignal.set(data);
      this.loadingSignal.set(false);

      return data;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unknown error loading premium data";
      console.error("Error loading premium data:", errorMessage);
      this.errorSignal.set(errorMessage);
      this.loadingSignal.set(false);
      return null;
    }
  }

  /**
   * Get plans data
   */
  getPlans() {
    return this.premiumDataSignal()?.plans || [];
  }

  /**
   * Get FAQs data
   */
  getFAQs() {
    return this.premiumDataSignal()?.faqs || [];
  }

  /**
   * Get benefits data
   */
  getBenefits() {
    return this.premiumDataSignal()?.benefits || [];
  }

  /**
   * Get testimonials data
   */
  getTestimonials() {
    return this.premiumDataSignal()?.testimonials || [];
  }

  /**
   * Reset data (useful for testing)
   */
  reset(): void {
    this.premiumDataSignal.set(null);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }
}
