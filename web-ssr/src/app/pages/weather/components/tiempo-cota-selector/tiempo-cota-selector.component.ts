import { Component, output, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Cota } from "../../models/meteo.models";

@Component({
  selector: "app-tiempo-cota-selector",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cota-selector">
      <div class="selector-container">
        <button
          type="button"
          class="cota-button"
          [class.active]="selected() === 'base'"
          (click)="onSelect('base')"
          aria-label="Ver datos de cota base"
        >
          <span class="cota-icon">🏔️</span>
          <span class="cota-label-group">
            <span class="cota-label">Base</span>
            @if (baseAltitude()) {
            <span class="cota-altitude">{{ baseAltitude() }}m</span>
            }
          </span>
        </button>

        <button
          type="button"
          class="cota-button"
          [class.active]="selected() === 'mid'"
          (click)="onSelect('mid')"
          aria-label="Ver datos de cota media"
        >
          <span class="cota-icon">⛰️</span>
          <span class="cota-label-group">
            <span class="cota-label">Media</span>
            @if (midAltitude()) {
            <span class="cota-altitude">{{ midAltitude() }}m</span>
            }
          </span>
        </button>

        <button
          type="button"
          class="cota-button"
          [class.active]="selected() === 'top'"
          (click)="onSelect('top')"
          aria-label="Ver datos de cota cima"
        >
          <span class="cota-icon">🗻</span>
          <span class="cota-label-group">
            <span class="cota-label">Cima</span>
            @if (topAltitude()) {
            <span class="cota-altitude">{{ topAltitude() }}m</span>
            }
          </span>
        </button>
      </div>

      @if (showLegend()) {
      <div class="cota-legend">
        <p class="legend-text">
          Selecciona una cota para ver las condiciones específicas
        </p>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .cota-selector {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .selector-container {
        display: inline-flex;
        background: var(--neutral-100);
        border-radius: 12px;
        padding: 4px;
        gap: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .cota-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: none;
        background: transparent;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--neutral-700);
      }

      .cota-button:hover {
        background: var(--neutral-200);
        transform: translateY(-1px);
      }

      .cota-button:focus-visible {
        outline: 2px solid var(--primary-500);
        outline-offset: 2px;
      }

      .cota-button.active {
        background: var(--primary-500);
        color: white;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transform: translateY(-2px);
      }

      .cota-icon {
        font-size: 1.25rem;
      }

      .cota-label-group {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.125rem;
      }

      .cota-label {
        font-size: 0.9375rem;
      }

      .cota-altitude {
        font-size: 0.75rem;
        font-weight: 500;
        opacity: 0.85;
      }

      .cota-button.active .cota-altitude {
        opacity: 1;
      }

      .cota-legend {
        padding: 0.5rem 1rem;
        background: var(--neutral-50);
        border-radius: 8px;
        border-left: 4px solid var(--primary-500);
      }

      .legend-text {
        margin: 0;
        font-size: 0.875rem;
        color: var(--neutral-600);
      }

      @media (max-width: 640px) {
        .cota-button {
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
        }

        .cota-icon {
          font-size: 1.125rem;
        }

        .cota-label {
          display: none;
        }
      }
    `,
  ],
})
export class TiempoCotaSelectorComponent {
  selected = input<Cota>("mid");
  showLegend = input<boolean>(false);
  baseAltitude = input<number | null>(null);
  midAltitude = input<number | null>(null);
  topAltitude = input<number | null>(null);
  cotaChange = output<Cota>();

  onSelect(cota: Cota): void {
    this.cotaChange.emit(cota);
  }
}
