import { ChangeDetectionStrategy, Component, AfterViewInit, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;
  private skeletonTimeout?: number;
  private platformId = inject(PLATFORM_ID);

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

  toggleMobileMenu(): void {
    if (isPlatformBrowser(this.platformId)) {
      const menu = document.getElementById('mobileMenu');
      if (menu) {
        menu.classList.toggle('hidden');
      }
    }
  }

  private setupScrollObserver(): void {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in');
        }
      });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
      if (this.observer) {
        this.observer.observe(section);
      }
    });
  }

  private setupSkeletonLoading(): void {
    // Simulated skeleton loading
    this.skeletonTimeout = window.setTimeout(() => {
      document.querySelectorAll('.skeleton').forEach(el => {
        el.classList.remove('skeleton');
        el.classList.add('animate-fade-in');
      });
    }, 2000);
  }
}
