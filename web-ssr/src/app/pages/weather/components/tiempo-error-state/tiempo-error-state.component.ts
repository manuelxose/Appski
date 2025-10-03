import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-tiempo-error-state",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-container" role="alert">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <h3 class="error-title">{{ title() }}</h3>
        <p class="error-message">{{ message() }}</p>

        @if (showRetry()) {
        <button type="button" class="retry-button" (click)="onRetry()">
          <svg
            class="retry-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Reintentar</span>
        </button>
        } @if (showGoBack()) {
        <button type="button" class="back-button" (click)="onGoBack()">
          Volver atrás
        </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .error-container {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 400px;
        padding: 2rem;
      }

      .error-content {
        text-align: center;
        max-width: 500px;
      }

      .error-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        animation: pulse 2s ease-in-out infinite;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.6;
        }
      }

      .error-title {
        margin: 0 0 0.75rem 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .error-message {
        margin: 0 0 2rem 0;
        font-size: 1rem;
        color: var(--neutral-600);
        line-height: 1.6;
      }

      .retry-button,
      .back-button {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        font-size: 0.9375rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .retry-button {
        background: var(--primary-500);
        color: white;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        margin-right: 0.75rem;
      }

      .retry-button:hover {
        background: var(--primary-600);
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
      }

      .retry-button:focus-visible {
        outline: 2px solid var(--primary-500);
        outline-offset: 2px;
      }

      .retry-icon {
        width: 1.25rem;
        height: 1.25rem;
      }

      .back-button {
        background: var(--neutral-200);
        color: var(--neutral-700);
      }

      .back-button:hover {
        background: var(--neutral-300);
        transform: translateY(-2px);
      }

      .back-button:focus-visible {
        outline: 2px solid var(--neutral-500);
        outline-offset: 2px;
      }

      @media (max-width: 640px) {
        .error-container {
          min-height: 300px;
          padding: 1.5rem;
        }

        .error-icon {
          font-size: 3rem;
        }

        .error-title {
          font-size: 1.25rem;
        }

        .error-message {
          font-size: 0.9375rem;
        }

        .retry-button,
        .back-button {
          width: 100%;
          margin: 0.375rem 0;
          justify-content: center;
        }
      }
    `,
  ],
})
export class TiempoErrorStateComponent {
  title = input<string>("Error al cargar datos");
  message = input<string>(
    "No se pudieron cargar los datos meteorológicos. Por favor, inténtalo de nuevo."
  );
  showRetry = input<boolean>(true);
  showGoBack = input<boolean>(false);

  retry = output<void>();
  goBack = output<void>();

  onRetry(): void {
    this.retry.emit();
  }

  onGoBack(): void {
    this.goBack.emit();
  }
}
