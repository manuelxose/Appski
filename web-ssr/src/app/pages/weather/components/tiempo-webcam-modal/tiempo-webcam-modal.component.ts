import { Component, input, output, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { WebcamItem } from "../../models/meteo.models";

@Component({
  selector: "app-tiempo-webcam-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (webcam()) {
    <div
      class="modal-overlay"
      (click)="onClose()"
      (keydown.escape)="onClose()"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div
        class="modal-content"
        (click)="$event.stopPropagation()"
        (keydown)="$event.stopPropagation()"
        tabindex="0"
      >
        <button
          type="button"
          class="close-button"
          (click)="onClose()"
          aria-label="Cerrar modal"
        >
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div class="modal-header">
          <div class="header-content">
            <h2 class="modal-title">
              <span class="title-icon">📷</span>
              {{ webcam()!.name }}
            </h2>
            @if (webcam()!.cota) {
            <span class="cota-badge">
              <span class="badge-icon">🏔️</span>
              {{ getCotaLabel(webcam()!.cota!) }}
            </span>
            }
          </div>
          @if (webcam()!.active) {
          <div class="status-badge active">
            <span class="status-dot"></span>
            En vivo
          </div>
          } @else {
          <div class="status-badge inactive">
            <span class="status-dot"></span>
            Fuera de línea
          </div>
          }
        </div>

        <div class="modal-image">
          <img [src]="webcam()!.snapshotUrl" [alt]="webcam()!.name" />
          <div class="image-overlay">
            <div
              class="freshness-indicator"
              [class.fresh]="isFresh(webcam()!.freshnessS)"
              [class.stale]="!isFresh(webcam()!.freshnessS)"
            >
              <span class="indicator-icon">⏱️</span>
              <span class="indicator-text">{{
                getFreshnessLabel(webcam()!.freshnessS)
              }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="footer-info">
            <div class="meta-item">
              <span class="meta-icon">🕐</span>
              <div class="meta-content">
                <span class="meta-label">Última actualización</span>
                <span class="meta-value">{{
                  formatTime(webcam()!.lastUpdated)
                }}</span>
              </div>
            </div>
            <div class="meta-item">
              <span class="meta-icon">📍</span>
              <div class="meta-content">
                <span class="meta-label">Ubicación</span>
                <span class="meta-value">{{
                  getCotaLabel(webcam()!.cota || "mid")
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    }
  `,
  styles: [
    `
      /* Modal Overlay */
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 1rem;
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      /* Modal Content */
      .modal-content {
        background: white;
        border-radius: 20px;
        max-width: 1000px;
        width: 100%;
        max-height: 95vh;
        overflow: hidden;
        position: relative;
        animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
      }

      @keyframes slideUp {
        from {
          transform: translateY(40px) scale(0.95);
          opacity: 0;
        }
        to {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      /* Close Button */
      .close-button {
        position: fixed;
        top: 1.25rem;
        right: 1.25rem;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.2);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        transition: all 0.3s ease;
      }

      .close-button:hover {
        background: rgba(220, 38, 38, 0.9);
        border-color: rgba(255, 255, 255, 0.4);
        transform: rotate(90deg) scale(1.1);
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
      }

      .close-button svg {
        width: 24px;
        height: 24px;
      }

      /* Modal Header */
      .modal-header {
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, var(--neutral-50) 0%, white 100%);
        border-bottom: 1px solid var(--neutral-200);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        box-sizing: border-box;
        flex-shrink: 0;
      }

      .header-content {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .modal-title {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
        display: flex;
        align-items: center;
        gap: 0.75rem;
        word-break: break-word;
        min-width: 0;
      }

      .title-icon {
        font-size: 1.5rem;
      }

      .cota-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: linear-gradient(
          135deg,
          var(--primary-100),
          var(--primary-50)
        );
        color: var(--primary-700);
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 700;
        border: 2px solid var(--primary-200);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
      }

      .badge-icon {
        font-size: 1.25rem;
      }

      /* Status Badge */
      .status-badge {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 700;
        border: 2px solid;
      }

      .status-badge.active {
        background: linear-gradient(
          135deg,
          var(--success-100),
          var(--success-50)
        );
        color: var(--success-700);
        border-color: var(--success-300);
      }

      .status-badge.inactive {
        background: linear-gradient(
          135deg,
          var(--neutral-200),
          var(--neutral-100)
        );
        color: var(--neutral-600);
        border-color: var(--neutral-300);
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        animation: pulse 2s ease-in-out infinite;
      }

      .status-badge.active .status-dot {
        background: var(--success-600);
        box-shadow: 0 0 8px var(--success-400);
      }

      .status-badge.inactive .status-dot {
        background: var(--neutral-500);
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
          transform: scale(1);
        }
        50% {
          opacity: 0.6;
          transform: scale(1.2);
        }
      }

      /* Modal Image */
      .modal-image {
        position: relative;
        width: 100%;
        aspect-ratio: 21 / 9;
        box-sizing: border-box;
        flex-shrink: 0;
        background: var(--neutral-900);
        overflow: hidden;
      }

      .modal-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .image-overlay {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 1rem;
        background: linear-gradient(
          to top,
          rgba(0, 0, 0, 0.8) 0%,
          transparent 100%
        );
        pointer-events: none;
      }

      .freshness-indicator {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1rem;
        border-radius: 10px;
        font-size: 0.875rem;
        font-weight: 700;
        backdrop-filter: blur(10px);
        border: 2px solid;
      }

      .freshness-indicator.fresh {
        background: rgba(16, 185, 129, 0.2);
        border-color: rgba(16, 185, 129, 0.4);
        color: #10b981;
      }

      .freshness-indicator.stale {
        background: rgba(251, 191, 36, 0.2);
        border-color: rgba(251, 191, 36, 0.4);
        color: #fbbf24;
      }

      .indicator-icon {
        font-size: 1.25rem;
      }

      /* Modal Footer */
      .modal-footer {
        padding: 1.25rem 1.5rem;
        background: linear-gradient(135deg, white 0%, var(--neutral-50) 100%);
        border-top: 1px solid var(--neutral-200);
        display: flex;
        flex-direction: column;
        gap: 1rem;
        box-sizing: border-box;
        flex-shrink: 0;
      }

      .footer-info {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .meta-item {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem;
        background: white;
        border-radius: 12px;
        border: 2px solid var(--neutral-200);
        transition: all 0.2s ease;
      }

      .meta-item:hover {
        border-color: var(--primary-300);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        transform: translateY(-2px);
      }

      .meta-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .meta-content {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .meta-label {
        color: var(--neutral-600);
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .meta-value {
        color: var(--neutral-900);
        font-size: 0.9375rem;
        font-weight: 700;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .modal-content {
          max-height: 95vh;
          border-radius: 16px;
        }

        .modal-header {
          padding: 1.5rem;
          flex-direction: column;
          align-items: flex-start;
        }

        .modal-title {
          font-size: 1.5rem;
        }

        .title-icon {
          font-size: 1.75rem;
        }

        .modal-footer {
          padding: 1.5rem;
        }

        .footer-info {
          grid-template-columns: 1fr;
          gap: 1rem;
        }

        .history-button {
          padding: 0.875rem 1.5rem;
          font-size: 0.9375rem;
        }

        .close-button {
          width: 40px;
          height: 40px;
          top: 1rem;
          right: 1rem;
        }
      }
    `,
  ],
})
export class TiempoWebcamModalComponent {
  webcam = input.required<WebcamItem | null>();
  closeModal = output<void>();

  @HostListener("document:keydown.escape")
  onEscapeKey(): void {
    this.onClose();
  }

  onClose(): void {
    this.closeModal.emit();
  }

  isFresh(freshnessS: number): boolean {
    // Considera fresco si es menor a 5 minutos (300 segundos)
    return freshnessS < 300;
  }

  getFreshnessLabel(freshnessS: number): string {
    if (freshnessS < 60) {
      return "Hace menos de 1 min";
    } else if (freshnessS < 300) {
      return `Hace ${Math.floor(freshnessS / 60)} min`;
    } else if (freshnessS < 3600) {
      return `Hace ${Math.floor(freshnessS / 60)} min`;
    } else {
      return `Hace ${Math.floor(freshnessS / 3600)} h`;
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

  formatTime(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
