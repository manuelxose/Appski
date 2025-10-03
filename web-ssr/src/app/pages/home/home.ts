import {
  ChangeDetectionStrategy,
  Component,
  AfterViewInit,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
// Imported standalone layout and section components
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { HomeHeroComponent } from "./components/home-hero/home-hero.component";
import { StationsFeaturedComponent } from "../../components/stations-featured/stations-featured.component";
import { LodgingCarouselComponent } from "../../components/lodging-carousel/lodging-carousel.component";
import { PlannerBannerComponent } from "../../components/planner-banner/planner-banner.component";
// New enhanced components
import { WeatherWidgetComponent } from "../../components/weather-widget/weather-widget.component";
import { StatsOverviewComponent } from "../../components/stats-overview/stats-overview.component";
import { FeaturesGridComponent } from "../../components/features-grid/features-grid.component";
import { TestimonialsCarouselComponent } from "../../components/testimonials-carousel/testimonials-carousel.component";

@Component({
  selector: "app-home",
  imports: [
    SiteHeaderComponent,
    SiteFooterComponent,
    HomeHeroComponent,
    StationsFeaturedComponent,
    LodgingCarouselComponent,
    PlannerBannerComponent,
    WeatherWidgetComponent,
    StatsOverviewComponent,
    FeaturesGridComponent,
    TestimonialsCarouselComponent,
  ],
  templateUrl: "./home.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;
  private skeletonTimeout?: number;
  private platformId = inject(PLATFORM_ID);

  // Weather modal state
  showWeatherModal = signal(false);

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.setupScrollObserver();
      this.setupSkeletonLoading();
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.skeletonTimeout) {
      clearTimeout(this.skeletonTimeout);
    }
  }

  toggleWeatherModal(): void {
    this.showWeatherModal.update((v) => !v);
  }

  // Mobile menu now managed inside SiteHeaderComponent

  private setupScrollObserver(): void {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-fade-in");
        }
      });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll("section").forEach((section) => {
      if (this.observer) {
        this.observer.observe(section);
      }
    });
  }

  private setupSkeletonLoading(): void {
    // Simulated skeleton loading
    this.skeletonTimeout = window.setTimeout(() => {
      document.querySelectorAll(".skeleton").forEach((el) => {
        el.classList.remove("skeleton");
        el.classList.add("animate-fade-in");
      });
    }, 2000);
  }
}
