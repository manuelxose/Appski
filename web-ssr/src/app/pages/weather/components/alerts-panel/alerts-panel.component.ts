import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AlertsService } from "../../services/alerts.service";

@Component({
  selector: "app-alerts-panel",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alerts-panel">
      @if (alertsService.activeAlerts().length > 0) {
      <div class="alerts-container">
        @for (alert of alertsService.activeAlerts(); track alert.id) {
        <div
          class="alert"
          [class.alert-info]="alert.type === 'info'"
          [class.alert-warning]="alert.type === 'warning'"
          [class.alert-danger]="alert.type === 'danger'"
        >
          <div class="alert-content">
            @if (alert.icon) {
            <div class="alert-icon">{{ alert.icon }}</div>
            }
            <div class="alert-body">
              <h4 class="alert-title">{{ alert.title }}</h4>
              <p class="alert-message">{{ alert.message }}</p>
              @if (alert.actionLabel && alert.actionUrl) {
              <a [href]="alert.actionUrl" class="alert-action">
                {{ alert.actionLabel }} →
              </a>
              }
            </div>
          </div>
          @if (alert.dismissible) {
          <button
            class="alert-dismiss"
            (click)="dismissAlert(alert.id)"
            aria-label="Cerrar alerta"
          >
            ✕
          </button>
          }
        </div>
        }
      </div>
      } @else {
      <div class="no-alerts">
        <span class="no-alerts-icon">✨</span>
        <p class="no-alerts-text">No hay alertas activas</p>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .alerts-panel {
        width: 100%;
      }

      .alerts-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .alert {
        position: relative;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        border-radius: 12px;
        border: 2px solid;
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        animation: slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .alert-info {
        border-color: var(--primary-300);
        background: linear-gradient(135deg, var(--primary-50), white);
      }

      .alert-warning {
        border-color: #fbbf24;
        background: linear-gradient(135deg, #fef3c7, white);
      }

      .alert-danger {
        border-color: #f87171;
        background: linear-gradient(135deg, #fee2e2, white);
      }

      .alert-content {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        flex: 1;
      }

      .alert-icon {
        font-size: 1.75rem;
        line-height: 1;
        flex-shrink: 0;
      }

      .alert-body {
        flex: 1;
        min-width: 0;
      }

      .alert-title {
        margin: 0 0 0.5rem 0;
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--neutral-900);
      }

      .alert-message {
        margin: 0 0 0.75rem 0;
        font-size: 0.9375rem;
        line-height: 1.6;
        color: var(--neutral-700);
      }

      .alert-action {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--primary-600);
        text-decoration: none;
        transition: all 0.2s ease;
      }

      .alert-action:hover {
        color: var(--primary-700);
        gap: 0.5rem;
      }

      .alert-dismiss {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--neutral-100);
        border: none;
        border-radius: 6px;
        color: var(--neutral-600);
        font-size: 1.125rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .alert-dismiss:hover {
        background: var(--neutral-200);
        color: var(--neutral-900);
        transform: scale(1.1);
      }

      .no-alerts {
        text-align: center;
        padding: 3rem 2rem;
        background: var(--neutral-50);
        border-radius: 12px;
        border: 2px dashed var(--neutral-200);
      }

      .no-alerts-icon {
        display: block;
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .no-alerts-text {
        margin: 0;
        font-size: 1rem;
        color: var(--neutral-500);
        font-weight: 500;
      }

      @media (max-width: 768px) {
        .alert {
          padding: 1rem;
          gap: 0.75rem;
        }

        .alert-content {
          gap: 0.75rem;
        }

        .alert-icon {
          font-size: 1.5rem;
        }

        .alert-title {
          font-size: 1rem;
        }

        .alert-message {
          font-size: 0.875rem;
        }

        .alert-dismiss {
          width: 24px;
          height: 24px;
          font-size: 1rem;
        }
      }
    `,
  ],
})
export class AlertsPanelComponent {
  readonly alertsService = inject(AlertsService);

  dismissAlert(alertId: string): void {
    this.alertsService.dismissAlert(alertId);
  }
}
