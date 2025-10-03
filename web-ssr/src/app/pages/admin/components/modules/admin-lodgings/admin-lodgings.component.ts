import { Component, signal, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { OperationsService } from "../../../services/operations.service";
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
  Lodging,
  LodgingOwner,
  LodgingStats,
  Room,
  LodgingFormData,
} from "./admin-lodgings.models";

@Component({
  selector: "app-admin-lodgings",
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
  ],
  templateUrl: "./admin-lodgings.component.html",
  styleUrl: "./admin-lodgings.component.css",
})
export class AdminLodgingsComponent implements OnInit {
  private readonly operationsService = inject(OperationsService);

  // State signals
  readonly lodgings = signal<Lodging[]>([]);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly searchQuery = signal("");
  readonly currentPage = signal(1);
  readonly itemsPerPage = signal(25);

  // Filter signals
  readonly selectedType = signal<string>("all");
  readonly selectedStation = signal<string>("all");
  readonly selectedStatus = signal<string>("all");

  // Modal signals
  readonly showModal = signal(false);
  readonly showDeleteDialog = signal(false);
  readonly selectedLodging = signal<Lodging | null>(null);
  readonly isEditMode = signal(false);

  // Form data
  readonly formData = signal<LodgingFormData>({
    name: "",
    type: "hotel",
    station: "",
    address: "",
    city: "",
    zipCode: "",
    phone: "",
    email: "",
    totalRooms: 0,
    priceFrom: 0,
    amenities: [],
    featured: false,
    status: "active",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    commissionRate: 15,
  });

  // Available amenities
  readonly availableAmenities = [
    "wifi",
    "parking",
    "pool",
    "spa",
    "gym",
    "restaurant",
    "bar",
    "room_service",
    "breakfast",
    "pets_allowed",
    "ski_storage",
    "ski_pass_sales",
  ];

  // Breadcrumbs
  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: "Admin", path: "/admin" },
    { label: "Alojamientos", icon: "🏨" },
  ];

  // Computed signals
  readonly filteredLodgings = computed(() => {
    let filtered = this.lodgings();

    // Search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (lodging) =>
          lodging.name.toLowerCase().includes(query) ||
          lodging.stationName.toLowerCase().includes(query) ||
          lodging.city.toLowerCase().includes(query) ||
          lodging.owner.name.toLowerCase().includes(query)
      );
    }

    // Type filter
    const type = this.selectedType();
    if (type !== "all") {
      filtered = filtered.filter((lodging) => lodging.type === type);
    }

    // Station filter
    const station = this.selectedStation();
    if (station !== "all") {
      filtered = filtered.filter((lodging) => lodging.station === station);
    }

    // Status filter
    const status = this.selectedStatus();
    if (status !== "all") {
      filtered = filtered.filter((lodging) => lodging.status === status);
    }

    return filtered;
  });

  readonly paginatedLodgings = computed(() => {
    const filtered = this.filteredLodgings();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return filtered.slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredLodgings().length / this.itemsPerPage());
  });

  readonly stats = computed(() => {
    const all = this.lodgings();
    const totalRevenue = all.reduce((sum, l) => sum + l.stats.revenue, 0);
    const totalBookings = all.reduce(
      (sum, l) => sum + l.stats.totalBookings,
      0
    );
    const avgOccupancy =
      all.reduce((sum, l) => sum + l.stats.occupancyRate, 0) / all.length || 0;

    return {
      total: all.length,
      active: all.filter((l) => l.status === "active").length,
      revenue: totalRevenue,
      bookings: totalBookings,
      avgOccupancy: avgOccupancy.toFixed(1),
    };
  });

  // Table configuration
  readonly tableColumns: TableColumn[] = [
    { key: "name", label: "Nombre", sortable: true },
    { key: "type", label: "Tipo", sortable: true },
    { key: "stationName", label: "Estación", sortable: true },
    { key: "city", label: "Ciudad", sortable: false },
    { key: "totalRooms", label: "Habitaciones", sortable: true },
    { key: "availableRooms", label: "Disponibles", sortable: true },
    { key: "priceFrom", label: "Desde", sortable: true },
    { key: "rating", label: "Rating", sortable: true },
    { key: "occupancyRate", label: "Ocupación", sortable: true },
    { key: "status", label: "Estado", sortable: true },
  ];

  readonly tableActions: TableAction[] = [
    { id: "edit", label: "Editar", icon: "edit", variant: "primary" },
    { id: "rooms", label: "Habitaciones", icon: "bed", variant: "secondary" },
    {
      id: "calendar",
      label: "Calendario",
      icon: "calendar",
      variant: "secondary",
    },
    { id: "delete", label: "Eliminar", icon: "delete", variant: "danger" },
  ];

  // Filter fields
  readonly filterFields: FilterField[] = [
    {
      id: "type",
      label: "Tipo",
      type: "select",
      options: [
        { value: "all", label: "Todos" },
        { value: "hotel", label: "Hotel" },
        { value: "apartment", label: "Apartamento" },
        { value: "hostel", label: "Hostel" },
        { value: "rural", label: "Casa Rural" },
      ],
    },
    {
      id: "station",
      label: "Estación",
      type: "select",
      options: [
        { value: "all", label: "Todas" },
        { value: "sierra-nevada", label: "Sierra Nevada" },
        { value: "baqueira-beret", label: "Baqueira Beret" },
        { value: "formigal", label: "Formigal" },
      ],
    },
    {
      id: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "all", label: "Todos" },
        { value: "active", label: "Activo" },
        { value: "inactive", label: "Inactivo" },
        { value: "maintenance", label: "Mantenimiento" },
      ],
    },
  ];

  ngOnInit(): void {
    this.loadLodgings();
  }

  async loadLodgings(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Simular carga de datos
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Cargar desde /assets/mocks/admin/lodgings.json
      const mockData: Lodging[] = [
        {
          id: "LDG001",
          name: "Hotel Montaña Nevada",
          type: "hotel",
          station: "sierra-nevada",
          stationName: "Sierra Nevada",
          address: "Calle Virgen de las Nieves, 10",
          city: "Monachil",
          zipCode: "18196",
          phone: "+34 958 480 001",
          email: "info@hotelmontananevada.es",
          rating: 4.5,
          totalReviews: 234,
          totalRooms: 45,
          availableRooms: 12,
          priceFrom: 85,
          amenities: [
            "wifi",
            "parking",
            "pool",
            "spa",
            "restaurant",
            "ski_storage",
          ],
          images: ["/assets/images/lodging-1.jpg"],
          featured: true,
          status: "active",
          owner: {
            id: "OWN001",
            name: "García Hoteles S.L.",
            email: "garcia@hotels.es",
            phone: "+34 958 480 002",
            commissionRate: 15,
          },
          stats: {
            totalBookings: 156,
            revenue: 24580,
            occupancyRate: 73.3,
            avgResponseTime: 2.5,
            lastBooking: "2025-10-02T14:30:00Z",
          },
          createdAt: "2024-01-15T10:00:00Z",
          updatedAt: "2025-10-02T14:30:00Z",
        },
        {
          id: "LDG002",
          name: "Apartamentos Val d'Aran",
          type: "apartment",
          station: "baqueira-beret",
          stationName: "Baqueira Beret",
          address: "Carretera Baqueira, Km 5",
          city: "Naut Aran",
          zipCode: "25598",
          phone: "+34 973 645 001",
          email: "info@valdaran-apts.com",
          rating: 4.2,
          totalReviews: 89,
          totalRooms: 24,
          availableRooms: 6,
          priceFrom: 120,
          amenities: ["wifi", "parking", "ski_storage", "ski_pass_sales"],
          images: ["/assets/images/lodging-2.jpg"],
          featured: false,
          status: "active",
          owner: {
            id: "OWN002",
            name: "Val d'Aran Properties",
            email: "properties@valdaran.com",
            phone: "+34 973 645 002",
            commissionRate: 15,
          },
          stats: {
            totalBookings: 78,
            revenue: 18960,
            occupancyRate: 65.0,
            avgResponseTime: 3.2,
            lastBooking: "2025-10-01T09:15:00Z",
          },
          createdAt: "2024-03-20T10:00:00Z",
          updatedAt: "2025-10-01T09:15:00Z",
        },
      ];

      this.lodgings.set(mockData);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : "Error al cargar alojamientos"
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  handleSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  handleFilterChange(filterId: string, value: string): void {
    switch (filterId) {
      case "type":
        this.selectedType.set(value);
        break;
      case "station":
        this.selectedStation.set(value);
        break;
      case "status":
        this.selectedStatus.set(value);
        break;
    }
    this.currentPage.set(1);
  }

  handlePageChange(page: number): void {
    this.currentPage.set(page);
  }

  handleRowClick(lodging: Lodging): void {
    this.selectedLodging.set(lodging);
    this.isEditMode.set(false);
    // Abrir modal de detalle (implementar vista de detalle)
  }

  handleActionClick(event: { row: Lodging; action: string }): void {
    const { row, action } = event;

    switch (action) {
      case "edit":
        this.openEditModal(row);
        break;
      case "rooms":
        this.openRoomsManagement(row);
        break;
      case "calendar":
        this.openCalendar(row);
        break;
      case "delete":
        this.openDeleteDialog(row);
        break;
    }
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedLodging.set(null);
    this.resetForm();
    this.showModal.set(true);
  }

  openEditModal(lodging: Lodging): void {
    this.isEditMode.set(true);
    this.selectedLodging.set(lodging);
    this.formData.set({
      id: lodging.id,
      name: lodging.name,
      type: lodging.type,
      station: lodging.station,
      address: lodging.address,
      city: lodging.city,
      zipCode: lodging.zipCode,
      phone: lodging.phone,
      email: lodging.email,
      totalRooms: lodging.totalRooms,
      priceFrom: lodging.priceFrom,
      amenities: lodging.amenities,
      featured: lodging.featured,
      status: lodging.status,
      ownerName: lodging.owner.name,
      ownerEmail: lodging.owner.email,
      ownerPhone: lodging.owner.phone,
      commissionRate: lodging.owner.commissionRate,
    });
    this.showModal.set(true);
  }

  openRoomsManagement(lodging: Lodging): void {
    // TODO: Implementar gestión de habitaciones
    console.log("Gestionar habitaciones de:", lodging.name);
  }

  openCalendar(lodging: Lodging): void {
    // TODO: Implementar calendario de disponibilidad
    console.log("Abrir calendario de:", lodging.name);
  }

  openDeleteDialog(lodging: Lodging): void {
    this.selectedLodging.set(lodging);
    this.showDeleteDialog.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedLodging.set(null);
  }

  resetForm(): void {
    this.formData.set({
      name: "",
      type: "hotel",
      station: "",
      address: "",
      city: "",
      zipCode: "",
      phone: "",
      email: "",
      totalRooms: 0,
      priceFrom: 0,
      amenities: [],
      featured: false,
      status: "active",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      commissionRate: 15,
    });
  }

  async handleSave(): Promise<void> {
    const data = this.formData();

    try {
      if (this.isEditMode()) {
        // Update existing lodging
        const lodging = this.selectedLodging();
        if (!lodging) return;

        const updated: Lodging = {
          ...lodging,
          ...data,
          stationName: this.getStationName(data.station),
          owner: {
            ...lodging.owner,
            name: data.ownerName,
            email: data.ownerEmail,
            phone: data.ownerPhone,
            commissionRate: data.commissionRate,
          },
          updatedAt: new Date().toISOString(),
        };

        this.lodgings.update((lodgings) =>
          lodgings.map((l) => (l.id === updated.id ? updated : l))
        );
      } else {
        // Create new lodging
        const newLodging: Lodging = {
          id: `LDG${String(this.lodgings().length + 1).padStart(3, "0")}`,
          ...data,
          stationName: this.getStationName(data.station),
          rating: 0,
          totalReviews: 0,
          availableRooms: data.totalRooms,
          images: [],
          owner: {
            id: `OWN${String(this.lodgings().length + 1).padStart(3, "0")}`,
            name: data.ownerName,
            email: data.ownerEmail,
            phone: data.ownerPhone,
            commissionRate: data.commissionRate,
          },
          stats: {
            totalBookings: 0,
            revenue: 0,
            occupancyRate: 0,
            avgResponseTime: 0,
            lastBooking: "",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.lodgings.update((lodgings) => [...lodgings, newLodging]);
      }

      this.closeModal();
    } catch (error) {
      console.error("Error al guardar alojamiento:", error);
    }
  }

  async handleDelete(): Promise<void> {
    const lodging = this.selectedLodging();
    if (!lodging) return;

    try {
      this.lodgings.update((lodgings) =>
        lodgings.filter((l) => l.id !== lodging.id)
      );
      this.closeDeleteDialog();
    } catch (error) {
      console.error("Error al eliminar alojamiento:", error);
    }
  }

  toggleAmenity(amenity: string): void {
    const current = this.formData().amenities;
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity];
    this.formData.update((form) => ({ ...form, amenities: updated }));
  }

  private getStationName(stationId: string): string {
    const stations: Record<string, string> = {
      "sierra-nevada": "Sierra Nevada",
      "baqueira-beret": "Baqueira Beret",
      formigal: "Formigal",
    };
    return stations[stationId] || stationId;
  }

  getLodgingTypeLabel(type: string): string {
    const types: Record<string, string> = {
      hotel: "Hotel",
      apartment: "Apartamento",
      hostel: "Hostel",
      rural: "Casa Rural",
    };
    return types[type] || type;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: "success",
      inactive: "danger",
      maintenance: "warning",
    };
    return colors[status] || "neutral";
  }
}
