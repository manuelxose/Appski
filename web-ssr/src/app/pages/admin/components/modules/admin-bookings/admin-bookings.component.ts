import { Component, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { FinancialService } from "../../../services/financial.service";
import {
  AdminTableComponent,
  TableColumn,
  TableAction,
} from "../../shared/admin-table/admin-table.component";
import { AdminPaginationComponent } from "../../shared/admin-pagination/admin-pagination.component";
import {
  AdminFiltersComponent,
  FilterField,
} from "../../shared/admin-filters/admin-filters.component";
import { AdminSearchBarComponent } from "../../shared/admin-search-bar/admin-search-bar.component";
import { AdminStatCardComponent } from "../../shared/admin-stat-card/admin-stat-card.component";
import { AdminBadgeComponent } from "../../shared/admin-badge/admin-badge.component";
import {
  AdminBreadcrumbsComponent,
  BreadcrumbItem,
} from "../../shared/admin-breadcrumbs/admin-breadcrumbs.component";
import { AdminModalComponent } from "../../shared/admin-modal/admin-modal.component";
import { AdminConfirmDialogComponent } from "../../shared/admin-confirm-dialog/admin-confirm-dialog.component";
import { AdminLoaderComponent } from "../../shared/admin-loader/admin-loader.component";
import { AdminEmptyStateComponent } from "../../shared/admin-empty-state/admin-empty-state.component";
import {
  AdminDateRangePickerComponent,
  DateRange,
} from "../../shared/admin-date-range-picker/admin-date-range-picker.component";
import { Booking, BookingFormData } from "./admin-bookings.models";

/**
 * AdminBookingsComponent
 *
 * Gestión completa de reservas del sistema
 * - CRUD de reservas
 * - Filtros por fecha, estado, estación
 * - Búsqueda de clientes
 * - Gestión de estados (confirmar, cancelar)
 * - Estadísticas de ingresos
 * - Exportación de datos
 */
@Component({
  selector: "app-admin-bookings",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminTableComponent,
    AdminPaginationComponent,
    AdminFiltersComponent,
    AdminSearchBarComponent,
    AdminStatCardComponent,
    AdminBadgeComponent,
    AdminBreadcrumbsComponent,
    AdminModalComponent,
    AdminConfirmDialogComponent,
    AdminLoaderComponent,
    AdminEmptyStateComponent,
    AdminDateRangePickerComponent,
  ],
  templateUrl: "./admin-bookings.component.html",
  styleUrl: "./admin-bookings.component.css",
})
export class AdminBookingsComponent {
  private readonly financialService = inject(FinancialService);

  // State
  readonly isLoading = signal(true);
  readonly bookings = signal<Booking[]>([]);
  readonly selectedBookings = signal<string[]>([]);

  // Modals
  readonly showCreateModal = signal(false);
  readonly showEditModal = signal(false);
  readonly showDetailsModal = signal(false);
  readonly showConfirmBookingDialog = signal(false);
  readonly showCancelBookingDialog = signal(false);

  // Form
  readonly bookingForm = signal<BookingFormData>({
    userId: "",
    stationSlug: "",
    serviceType: "skipass",
    startDate: "",
    endDate: "",
    participants: 1,
    totalAmount: 0,
    status: "pending",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  });
  readonly editingBookingId = signal<string | null>(null);
  readonly selectedBookingDetails = signal<Booking | null>(null);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalBookings = computed(() => this.filteredBookings().length);
  readonly totalPages = computed(() =>
    Math.ceil(this.totalBookings() / this.pageSize())
  );

  // Search & Filters
  readonly searchQuery = signal("");
  readonly activeFilters = signal<Record<string, unknown>>({});
  readonly dateRange = signal<DateRange>({ startDate: null, endDate: null });

  // Breadcrumbs
  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: "Admin", path: "/admin" },
    { label: "Reservas", path: "/admin/bookings" },
  ];

  // Stats
  readonly stats = computed(() => {
    const bookingList = this.bookings();
    const totalBookings = bookingList.length;
    const confirmedBookings = bookingList.filter(
      (b) => b.status === "confirmed"
    ).length;
    const pendingBookings = bookingList.filter(
      (b) => b.status === "pending"
    ).length;
    const totalRevenue = bookingList
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const thisMonth = new Date();
    const monthlyRevenue = bookingList
      .filter((b) => {
        const bookingDate = new Date(b.createdAt);
        return (
          bookingDate.getMonth() === thisMonth.getMonth() &&
          bookingDate.getFullYear() === thisMonth.getFullYear() &&
          (b.status === "confirmed" || b.status === "completed")
        );
      })
      .reduce((sum, b) => sum + b.totalAmount, 0);

    return {
      total: totalBookings,
      confirmed: confirmedBookings,
      pending: pendingBookings,
      totalRevenue,
      monthlyRevenue,
    };
  });

  // Filtered & Paginated Bookings
  readonly filteredBookings = computed(() => {
    let result = this.bookings();

    // Apply search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(
        (booking) =>
          booking.customerName?.toLowerCase().includes(query) ||
          booking.customerEmail?.toLowerCase().includes(query) ||
          booking.id.toLowerCase().includes(query)
      );
    }

    // Apply filters
    const filters = this.activeFilters();
    if (filters["status"]) {
      result = result.filter((b) => b.status === filters["status"]);
    }
    if (filters["stationSlug"]) {
      result = result.filter((b) => b.stationSlug === filters["stationSlug"]);
    }
    if (filters["serviceType"]) {
      result = result.filter((b) => b.serviceType === filters["serviceType"]);
    }

    // Apply date range
    const range = this.dateRange();
    if (range.startDate && range.endDate) {
      const startDate = range.startDate;
      const endDate = range.endDate;
      result = result.filter((b) => {
        const bookingDate = new Date(b.startDate);
        return bookingDate >= startDate && bookingDate <= endDate;
      });
    }

    return result;
  });

  readonly paginatedBookings = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredBookings().slice(start, end);
  });

  // Table Configuration
  readonly tableColumns: TableColumn[] = [
    {
      key: "id",
      label: "Referencia",
      sortable: true,
    },
    {
      key: "customerName",
      label: "Cliente",
      sortable: true,
    },
    {
      key: "stationSlug",
      label: "Estación",
      sortable: true,
    },
    {
      key: "serviceType",
      label: "Servicio",
      sortable: true,
    },
    {
      key: "startDate",
      label: "Fecha",
      sortable: true,
      format: "date",
    },
    {
      key: "participants",
      label: "Personas",
      sortable: true,
    },
    {
      key: "totalAmount",
      label: "Importe",
      sortable: true,
      format: "currency",
    },
    {
      key: "status",
      label: "Estado",
      sortable: true,
      format: "badge",
    },
  ];

  readonly tableActions: TableAction<Booking>[] = [
    {
      label: "Ver Detalles",
      icon: "👁️",
      handler: (booking) => this.openDetailsModal(booking),
    },
    {
      label: "Confirmar",
      icon: "✅",
      handler: (booking) => this.confirmBooking(booking),
      // TODO: condition not supported in TableAction interface
    },
    {
      label: "Cancelar",
      icon: "❌",
      variant: "danger",
      handler: (booking) => this.openCancelDialog(booking),
      // TODO: condition not supported in TableAction interface
    },
    {
      label: "Editar",
      icon: "✏️",
      handler: (booking) => this.openEditModal(booking),
      // TODO: condition not supported in TableAction interface
    },
  ];

  readonly filterFields: FilterField[] = [
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "pending", label: "Pendiente" },
        { value: "confirmed", label: "Confirmada" },
        { value: "cancelled", label: "Cancelada" },
        { value: "completed", label: "Completada" },
      ],
    },
    {
      key: "stationSlug",
      label: "Estación",
      type: "select",
      options: [
        { value: "sierra-nevada", label: "Sierra Nevada" },
        { value: "baqueira-beret", label: "Baqueira Beret" },
        { value: "formigal", label: "Formigal" },
      ],
    },
    {
      key: "serviceType",
      label: "Tipo de Servicio",
      type: "select",
      options: [
        { value: "skipass", label: "Forfait" },
        { value: "class", label: "Clases" },
        { value: "equipment", label: "Alquiler" },
        { value: "package", label: "Paquete" },
      ],
    },
  ];

  constructor() {
    this.loadBookings();
  }

  async loadBookings(): Promise<void> {
    this.isLoading.set(true);
    try {
      // TODO: Replace with actual API call
      const mockBookings: Booking[] = [
        {
          id: "bk-001",
          userId: "user-001",
          stationSlug: "sierra-nevada",
          serviceType: "skipass",
          startDate: "2025-01-15",
          endDate: "2025-01-17",
          participants: 2,
          totalAmount: 240.0,
          status: "confirmed",
          customerName: "Juan García",
          customerEmail: "juan@example.com",
          customerPhone: "+34 600 000 001",
          createdAt: "2025-01-03T10:00:00Z",
          updatedAt: "2025-01-03T10:30:00Z",
        },
        {
          id: "bk-002",
          userId: "user-002",
          stationSlug: "baqueira-beret",
          serviceType: "package",
          startDate: "2025-02-01",
          endDate: "2025-02-05",
          participants: 4,
          totalAmount: 1200.0,
          status: "pending",
          customerName: "María López",
          customerEmail: "maria@example.com",
          customerPhone: "+34 600 000 002",
          createdAt: "2025-01-03T11:00:00Z",
          updatedAt: "2025-01-03T11:00:00Z",
        },
      ];
      this.bookings.set(mockBookings);
    } catch (error) {
      console.error("Error loading bookings:", error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Search & Filters
  onSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  onFilterChange(filters: Record<string, unknown>): void {
    this.activeFilters.set(filters);
    this.currentPage.set(1);
  }

  onFilterReset(): void {
    this.activeFilters.set({});
    this.dateRange.set({ startDate: null, endDate: null });
    this.currentPage.set(1);
  }

  onDateRangeChange(range: DateRange): void {
    this.dateRange.set(range);
    this.currentPage.set(1);
  }

  // Pagination
  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  // Selection
  onSelectionChange(bookings: Booking[]): void {
    const bookingIds = bookings.map((b) => b.id);
    this.selectedBookings.set(bookingIds);
  }

  // Create
  openCreateModal(): void {
    this.bookingForm.set({
      userId: "",
      stationSlug: "",
      serviceType: "skipass",
      startDate: "",
      endDate: "",
      participants: 1,
      totalAmount: 0,
      status: "pending",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
    });
    this.showCreateModal.set(true);
  }

  async createBooking(): Promise<void> {
    const formData = this.bookingForm();

    try {
      // TODO: Replace with actual API call
      console.log("Creating booking:", formData);

      this.showCreateModal.set(false);
      await this.loadBookings();
    } catch (error) {
      console.error("Error creating booking:", error);
    }
  }

  // Edit
  openEditModal(booking: Booking): void {
    this.editingBookingId.set(booking.id);
    this.bookingForm.set({
      id: booking.id,
      userId: booking.userId,
      stationSlug: booking.stationSlug,
      serviceType: booking.serviceType,
      startDate: booking.startDate,
      endDate: booking.endDate,
      participants: booking.participants,
      totalAmount: booking.totalAmount,
      status: booking.status,
      customerName: booking.customerName || "",
      customerEmail: booking.customerEmail || "",
      customerPhone: booking.customerPhone || "",
      specialRequests: booking.specialRequests,
    });
    this.showEditModal.set(true);
  }

  async updateBooking(): Promise<void> {
    const formData = this.bookingForm();
    const bookingId = this.editingBookingId();

    if (!bookingId) return;

    try {
      // TODO: Replace with actual API call
      console.log("Updating booking:", formData);

      this.showEditModal.set(false);
      this.editingBookingId.set(null);
      await this.loadBookings();
    } catch (error) {
      console.error("Error updating booking:", error);
    }
  }

  // Details
  openDetailsModal(booking: Booking): void {
    this.selectedBookingDetails.set(booking);
    this.showDetailsModal.set(true);
  }

  // Confirm/Cancel
  confirmBooking(booking: Booking): void {
    this.editingBookingId.set(booking.id);
    this.showConfirmBookingDialog.set(true);
  }

  async executeConfirmBooking(): Promise<void> {
    const bookingId = this.editingBookingId();
    if (!bookingId) return;

    try {
      // TODO: Replace with actual API call
      console.log("Confirming booking:", bookingId);

      this.showConfirmBookingDialog.set(false);
      this.editingBookingId.set(null);
      await this.loadBookings();
    } catch (error) {
      console.error("Error confirming booking:", error);
    }
  }

  openCancelDialog(booking: Booking): void {
    this.editingBookingId.set(booking.id);
    this.showCancelBookingDialog.set(true);
  }

  async executeCancelBooking(): Promise<void> {
    const bookingId = this.editingBookingId();
    if (!bookingId) return;

    try {
      // TODO: Replace with actual API call
      console.log("Cancelling booking:", bookingId);

      this.showCancelBookingDialog.set(false);
      this.editingBookingId.set(null);
      await this.loadBookings();
    } catch (error) {
      console.error("Error cancelling booking:", error);
    }
  }

  // Helpers
  private formatStationName(slug: string): string {
    const stationMap: Record<string, string> = {
      "sierra-nevada": "Sierra Nevada",
      "baqueira-beret": "Baqueira Beret",
      formigal: "Formigal",
    };
    return stationMap[slug] || slug;
  }

  private formatServiceType(type: string): string {
    const typeMap: Record<string, string> = {
      skipass: "Forfait",
      class: "Clases",
      equipment: "Alquiler",
      package: "Paquete",
    };
    return typeMap[type] || type;
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "Pendiente",
      confirmed: "Confirmada",
      cancelled: "Cancelada",
      completed: "Completada",
    };
    return statusMap[status] || status;
  }

  getBadgeVariant(status: string): "success" | "danger" | "warning" | "info" {
    switch (status) {
      case "confirmed":
        return "success";
      case "completed":
        return "info";
      case "cancelled":
        return "danger";
      case "pending":
        return "warning";
      default:
        return "warning";
    }
  }

  calculateTotal(): void {
    // TODO: Calculate based on service type, dates, participants
    const participants = this.bookingForm().participants;
    const days = this.calculateDays();

    let pricePerDay = 0;
    switch (this.bookingForm().serviceType) {
      case "skipass":
        pricePerDay = 45;
        break;
      case "class":
        pricePerDay = 80;
        break;
      case "equipment":
        pricePerDay = 30;
        break;
      case "package":
        pricePerDay = 120;
        break;
    }

    const total = participants * days * pricePerDay;
    this.bookingForm.update((form) => ({ ...form, totalAmount: total }));
  }

  private calculateDays(): number {
    const start = new Date(this.bookingForm().startDate);
    const end = new Date(this.bookingForm().endDate);

    if (!start || !end || start > end) return 1;

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("es-ES");
  }
}
