import { Component, input, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { Booking } from "../../models/account.models";
import { BookingCardComponent } from "../booking-card/booking-card";
import { AccountService } from "../../services/account.service";

@Component({
  selector: "app-bookings-tab",
  standalone: true,
  imports: [CommonModule, BookingCardComponent],
  templateUrl: "./bookings-tab.html",
  styleUrls: ["./bookings-tab.css"],
})
export class BookingsTabComponent {
  private readonly accountService = inject(AccountService);

  // Inputs
  readonly bookings = input<Booking[]>();

  // Local state
  readonly filter = signal<"all" | "upcoming" | "completed" | "cancelled">(
    "all"
  );
  readonly isCancelling = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  // Computed
  readonly filteredBookings = (): Booking[] => {
    const allBookings = this.bookings() ?? [];
    const currentFilter = this.filter();

    if (currentFilter === "all") return allBookings;
    return allBookings.filter((b) => b.status === currentFilter);
  };

  readonly stats = () => {
    const allBookings = this.bookings() ?? [];
    return {
      total: allBookings.length,
      upcoming: allBookings.filter((b) => b.status === "upcoming").length,
      completed: allBookings.filter((b) => b.status === "completed").length,
      cancelled: allBookings.filter((b) => b.status === "cancelled").length,
    };
  };

  setFilter(filter: "all" | "upcoming" | "completed" | "cancelled"): void {
    this.filter.set(filter);
  }

  async handleCancelBooking(bookingId: string): Promise<void> {
    const confirmed = confirm(
      "¿Estás seguro de que deseas cancelar esta reserva?"
    );
    if (!confirmed) return;

    this.isCancelling.set(bookingId);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const response = await this.accountService.cancelBooking(bookingId);

      if (response.success) {
        this.successMessage.set(
          response.message || "Reserva cancelada correctamente"
        );
        setTimeout(() => this.successMessage.set(null), 3000);
      } else {
        this.errorMessage.set(
          response.message || "Error al cancelar la reserva"
        );
      }
    } catch (error) {
      this.errorMessage.set("Error inesperado al cancelar la reserva");
      console.error("Error cancelling booking:", error);
    } finally {
      this.isCancelling.set(null);
    }
  }

  handleViewDetails(booking: Booking): void {
    console.log("View booking details:", booking);
    // En producción: navegar a la página de detalles
    // this.router.navigate(['/account/bookings', booking.id]);
  }
}
