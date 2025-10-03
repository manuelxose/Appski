import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { Booking } from "../../models/account.models";

@Component({
  selector: "app-booking-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-300 border border-gray-100"
    >
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <!-- Booking Info -->
        <div class="flex-1">
          <div class="flex items-start gap-3">
            <span class="text-3xl">{{ getTypeIcon() }}</span>
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-slate-900 mb-1">
                {{ booking().station }}
              </h3>
              <p class="text-sm text-slate-600 mb-2">
                📅 {{ formatDate(booking().date) }} @if (booking().endDate) { -
                {{ formatDate(booking().endDate!) }} } • ID: {{ booking().id }}
              </p>
              <span [class]="getStatusClasses()">
                {{ getStatusText() }}
              </span>
            </div>
          </div>

          <!-- Details -->
          @if (booking().details) {
          <div class="mt-4 pl-11 text-sm text-slate-600">
            @if (booking().details?.lodging; as lodging) {
            <p>🏨 {{ lodging.name }}</p>
            <p>{{ lodging.roomType }} • {{ lodging.nights }} noches</p>
            } @if (booking().details?.rental; as rental) {
            <p>⛷️ Alquiler de equipo</p>
            <p>{{ rental.equipment.join(", ") }}</p>
            } @if (booking().details?.lessons; as lessons) {
            <p>🎓 Clases de esquí - Nivel {{ lessons.level }}</p>
            <p>
              Instructor: {{ lessons.instructor }} • {{ lessons.duration }}h
            </p>
            } @if (booking().details?.pass; as pass) {
            <p>🎫 {{ pass.passType }}</p>
            @if (pass.daysRemaining) {
            <p>{{ pass.daysRemaining }} días restantes</p>
            } }
          </div>
          }
        </div>

        <!-- Price & Actions -->
        <div class="text-right flex flex-col items-end gap-3">
          <div>
            <div class="text-2xl font-bold text-slate-900">
              {{ booking().currency === "EUR" ? "€" : "$"
              }}{{ booking().total.toFixed(2) }}
            </div>
            @if ((booking().guests ?? 0) > 1) {
            <p class="text-xs text-slate-500 mt-1">
              {{ booking().guests }} personas
            </p>
            }
          </div>

          @if (booking().status === 'upcoming') {
          <div class="flex gap-2">
            <button
              (click)="viewDetails.emit()"
              class="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Ver detalles →
            </button>
            <button
              (click)="cancelBooking.emit()"
              class="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Cancelar
            </button>
          </div>
          } @if (booking().status === 'completed') {
          <button
            (click)="viewDetails.emit()"
            class="text-sm text-slate-600 hover:text-slate-700 font-medium transition-colors"
          >
            Ver recibo →
          </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class BookingCardComponent {
  readonly booking = input.required<Booking>();

  readonly viewDetails = output<void>();
  readonly cancelBooking = output<void>();

  getTypeIcon(): string {
    switch (this.booking().type) {
      case "lodging":
        return "🏠";
      case "rental":
        return "⛷️";
      case "lessons":
        return "🎓";
      case "pass":
        return "🎫";
      default:
        return "📋";
    }
  }

  getStatusClasses(): string {
    const baseClasses =
      "text-xs px-3 py-1 rounded-full inline-block font-medium";
    switch (this.booking().status) {
      case "upcoming":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case "completed":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "cancelled":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  getStatusText(): string {
    switch (this.booking().status) {
      case "upcoming":
        return "Próxima";
      case "completed":
        return "Completada";
      case "cancelled":
        return "Cancelada";
      case "pending":
        return "Pendiente";
      default:
        return this.booking().status;
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
}
