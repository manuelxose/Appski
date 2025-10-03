import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-tiempo-skeleton",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="skeleton-container"
      role="status"
      aria-label="Cargando datos meteorológicos"
    >
      <!-- Header skeleton -->
      <div class="skeleton-header">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-subtitle"></div>
      </div>

      <!-- Cards skeleton -->
      <div class="skeleton-cards">
        @for (card of [1, 2, 3, 4]; track card) {
        <div class="skeleton-card">
          <div class="skeleton skeleton-card-icon"></div>
          <div class="skeleton skeleton-card-value"></div>
          <div class="skeleton skeleton-card-label"></div>
        </div>
        }
      </div>

      <!-- Chart skeleton -->
      <div class="skeleton-chart">
        <div class="skeleton skeleton-chart-header"></div>
        <div class="skeleton-chart-body">
          @for (bar of [1, 2, 3, 4, 5, 6, 7, 8]; track bar) {
          <div
            class="skeleton skeleton-bar"
            [style.height.%]="50 + bar * 5"
          ></div>
          }
        </div>
      </div>

      <!-- Grid skeleton -->
      <div class="skeleton-grid">
        @for (item of [1, 2, 3, 4, 5, 6]; track item) {
        <div class="skeleton skeleton-grid-item"></div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .skeleton-container {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .skeleton {
        background: linear-gradient(
          90deg,
          var(--neutral-200) 25%,
          var(--neutral-300) 50%,
          var(--neutral-200) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 8px;
      }

      @keyframes shimmer {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }

      .skeleton-header {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .skeleton-title {
        width: 300px;
        height: 2rem;
        max-width: 100%;
      }

      .skeleton-subtitle {
        width: 200px;
        height: 1rem;
        max-width: 100%;
      }

      .skeleton-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .skeleton-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .skeleton-card-icon {
        width: 60px;
        height: 60px;
        border-radius: 50%;
      }

      .skeleton-card-value {
        width: 80px;
        height: 2rem;
      }

      .skeleton-card-label {
        width: 120px;
        height: 1rem;
      }

      .skeleton-chart {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .skeleton-chart-header {
        width: 200px;
        height: 1.5rem;
        margin-bottom: 1.5rem;
      }

      .skeleton-chart-body {
        display: flex;
        align-items: flex-end;
        gap: 0.5rem;
        height: 200px;
      }

      .skeleton-bar {
        flex: 1;
        min-height: 40px;
      }

      .skeleton-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
      }

      .skeleton-grid-item {
        height: 180px;
        border-radius: 12px;
      }

      @media (max-width: 768px) {
        .skeleton-container {
          padding: 1rem;
          gap: 1.5rem;
        }

        .skeleton-cards {
          grid-template-columns: repeat(2, 1fr);
        }

        .skeleton-chart-body {
          height: 150px;
        }
      }
    `,
  ],
})
export class TiempoSkeletonComponent {}
