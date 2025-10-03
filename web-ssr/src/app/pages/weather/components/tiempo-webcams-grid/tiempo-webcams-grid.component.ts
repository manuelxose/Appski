import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WebcamItem } from "../../models/meteo.models";

@Component({
  selector: "app-tiempo-webcams-grid",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="webcams-grid">
      <h2 class="grid-title">Webcams en Directo</h2>

      <div class="webcams-container">
        @for (webcam of webcams(); track webcam.id) {
        <div
          class="webcam-card"
          (click)="onWebcamClick(webcam)"
          (keydown.enter)="onWebcamClick(webcam)"
          tabindex="0"
          role="button"
          [attr.aria-label]="'Ver webcam ' + webcam.name"
        >
          <div class="webcam-image">
            <img
              [src]="webcam.snapshotUrl"
              [alt]="webcam.name"
              loading="lazy"
            />
            @if (!webcam.active) {
            <div class="inactive-overlay">
              <span>Inactiva</span>
            </div>
            }
          </div>

          <div class="webcam-info">
            <h3 class="webcam-name">{{ webcam.name }}</h3>
            @if (webcam.cota) {
            <span class="cota-badge">{{ getCotaLabel(webcam.cota) }}</span>
            }
            <div class="webcam-meta">
              <span
                class="freshness"
                [class]="getFreshnessClass(webcam.freshnessS)"
              >
                {{ formatFreshness(webcam.freshnessS) }}
              </span>
            </div>
          </div>
        </div>
        }
      </div>

      @if (webcams().length === 0) {
      <div class="empty-state">
        <span class="empty-icon">📷</span>
        <p>No hay webcams disponibles</p>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .webcams-grid {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      }

      .grid-title {
        margin: 0 0 1.5rem 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .webcams-container {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
      }

      .webcam-card {
        background: var(--neutral-50);
        border-radius: 12px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        border: 2px solid transparent;
      }

      .webcam-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        border-color: var(--primary-300);
      }

      .webcam-card:focus-visible {
        outline: 2px solid var(--primary-500);
        outline-offset: 2px;
      }

      .webcam-image {
        position: relative;
        width: 100%;
        aspect-ratio: 4 / 3;
        overflow: hidden;
        background: var(--neutral-200);
      }

      .webcam-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      .webcam-card:hover .webcam-image img {
        transform: scale(1.05);
      }

      .inactive-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 1.125rem;
      }

      .webcam-info {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .webcam-name {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .cota-badge {
        display: inline-block;
        padding: 0.25rem 0.5rem;
        background: var(--primary-100);
        color: var(--primary-700);
        border-radius: 6px;
        font-size: 0.75rem;
        font-weight: 600;
        width: fit-content;
      }

      .webcam-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.75rem;
      }

      .freshness {
        padding: 0.25rem 0.5rem;
        border-radius: 6px;
        font-weight: 600;
      }

      .freshness.fresh {
        background: var(--success-100);
        color: var(--success-700);
      }

      .freshness.moderate {
        background: var(--warning-100);
        color: var(--warning-700);
      }

      .freshness.stale {
        background: var(--error-100);
        color: var(--error-700);
      }

      .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        color: var(--neutral-500);
      }

      .empty-icon {
        font-size: 4rem;
        display: block;
        margin-bottom: 1rem;
      }

      @media (max-width: 768px) {
        .webcams-grid {
          padding: 1.5rem;
        }

        .webcams-container {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class TiempoWebcamsGridComponent {
  webcams = input.required<WebcamItem[]>();
  webcamClick = output<WebcamItem>();

  onWebcamClick(webcam: WebcamItem): void {
    if (webcam.active) {
      this.webcamClick.emit(webcam);
    }
  }

  getCotaLabel(cota: string): string {
    const labels: Record<string, string> = {
      base: "Base",
      mid: "Media",
      top: "Cima",
    };
    return labels[cota] || cota;
  }

  getFreshnessClass(seconds: number): string {
    if (seconds < 300) return "fresh"; // < 5 min
    if (seconds < 900) return "moderate"; // < 15 min
    return "stale";
  }

  formatFreshness(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 1) return "Hace instantes";
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `Hace ${hours}h`;
  }
}
