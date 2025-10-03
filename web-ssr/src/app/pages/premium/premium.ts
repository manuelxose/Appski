import { Component, signal, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { PricingCardComponent } from "../../components/pricing-card/pricing-card.component";
import { BenefitCardComponent } from "./components/benefit-card.component";
import { TestimonialCardComponent } from "./components/testimonial-card.component";
import { FaqItemComponent } from "./components/faq-item.component";
import { PremiumDataService } from "./services/premium.data.service";
import type { PremiumPageData } from "./models/premium.models";

@Component({
  selector: "app-premium",
  templateUrl: "./premium.html",
  styleUrl: "./premium.css",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SiteHeaderComponent,
    SiteFooterComponent,
    PricingCardComponent,
    BenefitCardComponent,
    TestimonialCardComponent,
    FaqItemComponent,
  ],
})
export class PremiumComponent implements OnInit {
  private readonly premiumDataService = inject(PremiumDataService);

  // Signal-based state
  readonly loading = this.premiumDataService.loading;
  readonly error = this.premiumDataService.error;

  // Data signals
  readonly pageData = signal<PremiumPageData | null>(null);
  readonly plans = computed(() => this.pageData()?.plans || []);
  readonly faqs = computed(() => this.pageData()?.faqs || []);
  readonly benefits = computed(() => this.pageData()?.benefits || []);
  readonly testimonials = computed(() => this.pageData()?.testimonials || []);
  readonly trustBadges = computed(() => this.pageData()?.trustBadges || []);
  readonly hero = computed(() => this.pageData()?.hero);
  readonly finalCta = computed(() => this.pageData()?.finalCta);

  async ngOnInit(): Promise<void> {
    const data = await this.premiumDataService.loadPremiumData();
    if (data) {
      this.pageData.set(data);
    }
  }

  // Toggle FAQ open/closed state
  toggleFAQ(index: number): void {
    const currentData = this.pageData();
    if (!currentData) return;

    const updatedFaqs = [...currentData.faqs];
    updatedFaqs[index] = {
      ...updatedFaqs[index],
      open: !updatedFaqs[index].open,
    };

    this.pageData.set({
      ...currentData,
      faqs: updatedFaqs,
    });
  }
}
