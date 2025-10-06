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
import { Shop, ShopFormData } from "./admin-shops.models";

@Component({
  selector: "app-admin-shops",
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
  templateUrl: "./admin-shops.component.html",
  styleUrl: "./admin-shops.component.css",
})
export class AdminShopsComponent implements OnInit {
  private readonly operationsService = inject(OperationsService);

  // State signals
  readonly shops = signal<Shop[]>([]);
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
  readonly selectedShop = signal<Shop | null>(null);
  readonly isEditMode = signal(false);

  // Form data
  readonly formData = signal<ShopFormData>({
    name: "",
    station: "",
    type: "rental",
    address: "",
    city: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
    featured: false,
    status: "active",
    ownerName: "",
    ownerEmail: "",
    ownerPhone: "",
    commissionRate: 12,
    services: [],
  });

  // Available services
  readonly availableServices = [
    "ski_rental",
    "snowboard_rental",
    "boot_fitting",
    "equipment_sale",
    "repair_service",
    "waxing",
    "edge_sharpening",
    "storage",
    "delivery",
    "lessons_booking",
    "lift_pass_sales",
    "avalanche_gear",
  ];

  // Breadcrumbs
  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: "Admin", path: "/admin" },
    { label: "Tiendas", icon: "🎿" },
  ];

  // Computed signals
  readonly filteredShops = computed(() => {
    let filtered = this.shops();

    // Search filter
    const query = this.searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter(
        (shop) =>
          shop.name.toLowerCase().includes(query) ||
          shop.stationName.toLowerCase().includes(query) ||
          shop.city.toLowerCase().includes(query) ||
          shop.owner.name.toLowerCase().includes(query)
      );
    }

    // Type filter
    const type = this.selectedType();
    if (type !== "all") {
      filtered = filtered.filter((shop) => shop.type === type);
    }

    // Station filter
    const station = this.selectedStation();
    if (station !== "all") {
      filtered = filtered.filter((shop) => shop.station === station);
    }

    // Status filter
    const status = this.selectedStatus();
    if (status !== "all") {
      filtered = filtered.filter((shop) => shop.status === status);
    }

    return filtered;
  });

  readonly paginatedShops = computed(() => {
    const filtered = this.filteredShops();
    const page = this.currentPage();
    const perPage = this.itemsPerPage();
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return filtered.slice(start, end);
  });

  readonly totalPages = computed(() => {
    return Math.ceil(this.filteredShops().length / this.itemsPerPage());
  });

  readonly stats = computed(() => {
    const all = this.shops();
    const totalRevenue = all.reduce((sum, s) => sum + s.stats.revenue, 0);
    const totalRentals = all.reduce((sum, s) => sum + s.stats.totalRentals, 0);
    const totalInventoryValue = all.reduce(
      (sum, s) => sum + s.stats.inventoryValue,
      0
    );

    return {
      total: all.length,
      active: all.filter((s) => s.status === "active").length,
      revenue: totalRevenue,
      rentals: totalRentals,
      inventoryValue: totalInventoryValue,
    };
  });

  // Table configuration
  readonly tableColumns: TableColumn[] = [
    { key: "name", label: "Nombre", sortable: true },
    { key: "type", label: "Tipo", sortable: true },
    { key: "stationName", label: "Estación", sortable: true },
    { key: "city", label: "Ciudad", sortable: false },
    { key: "totalRentals", label: "Alquileres", sortable: true },
    { key: "revenue", label: "Ingresos", sortable: true },
    { key: "inventoryValue", label: "Inventario", sortable: true },
    { key: "rating", label: "Rating", sortable: true },
    { key: "status", label: "Estado", sortable: true },
  ];

  readonly tableActions: TableAction[] = [
    {
      label: "Editar",
      icon: "edit",
      variant: "primary",
      handler: () => {
        /* Handled by handleActionClick */
      },
    },
    {
      label: "Inventario",
      icon: "inventory",
      variant: "secondary",
      handler: () => {
        /* Handled by handleActionClick */
      },
    },
    {
      label: "Alquileres",
      icon: "calendar",
      variant: "secondary",
      handler: () => {
        /* Handled by handleActionClick */
      },
    },
    {
      label: "Eliminar",
      icon: "delete",
      variant: "danger",
      handler: () => {
        /* Handled by handleActionClick */
      },
    },
  ];

  // Filter fields
  readonly filterFields: FilterField[] = [
    {
      key: "type",
      label: "Tipo",
      type: "select",
      options: [
        { value: "all", label: "Todos" },
        { value: "rental", label: "Solo Alquiler" },
        { value: "retail", label: "Solo Venta" },
        { value: "rental_retail", label: "Alquiler + Venta" },
      ],
    },
    {
      key: "station",
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
      key: "status",
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
    this.loadShops();
  }

  async loadShops(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Simular carga de datos
      await new Promise((resolve) => setTimeout(resolve, 500));

      // TODO: Cargar desde /assets/mocks/admin/shops.json
      const mockData: Shop[] = [
        {
          id: "SHP001",
          name: "SkiPro Sierra Nevada",
          station: "sierra-nevada",
          stationName: "Sierra Nevada",
          type: "rental_retail",
          address: "Plaza Pradollano, 1",
          city: "Monachil",
          zipCode: "18196",
          phone: "+34 958 480 100",
          email: "info@skipro-sn.com",
          website: "https://www.skipro-sn.com",
          rating: 4.6,
          totalReviews: 342,
          featured: true,
          status: "active",
          owner: {
            id: "OWN001",
            name: "SkiPro España S.L.",
            email: "skipro@spain.com",
            phone: "+34 958 480 101",
            commissionRate: 12,
          },
          stats: {
            totalRentals: 1245,
            revenue: 89560,
            avgRating: 4.6,
            inventoryValue: 245000,
            lastRental: "2025-10-02T18:30:00Z",
          },
          openingHours: {
            monday: { open: "08:00", close: "20:00" },
            tuesday: { open: "08:00", close: "20:00" },
            wednesday: { open: "08:00", close: "20:00" },
            thursday: { open: "08:00", close: "20:00" },
            friday: { open: "08:00", close: "20:00" },
            saturday: { open: "08:00", close: "21:00" },
            sunday: { open: "08:00", close: "21:00" },
          },
          services: [
            "ski_rental",
            "snowboard_rental",
            "boot_fitting",
            "equipment_sale",
            "repair_service",
            "waxing",
            "lift_pass_sales",
          ],
          createdAt: "2024-01-10T10:00:00Z",
          updatedAt: "2025-10-02T18:30:00Z",
        },
      ];

      this.shops.set(mockData);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : "Error al cargar tiendas"
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

  handleRowClick(shop: Shop): void {
    this.selectedShop.set(shop);
    this.isEditMode.set(false);
    // Abrir modal de detalle
  }

  handleActionClick(event: { row: Shop; action: string }): void {
    const { row, action } = event;

    switch (action) {
      case "edit":
        this.openEditModal(row);
        break;
      case "inventory":
        this.openInventoryManagement(row);
        break;
      case "rentals":
        this.openRentalsManagement(row);
        break;
      case "delete":
        this.openDeleteDialog(row);
        break;
    }
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedShop.set(null);
    this.resetForm();
    this.showModal.set(true);
  }

  openEditModal(shop: Shop): void {
    this.isEditMode.set(true);
    this.selectedShop.set(shop);
    this.formData.set({
      id: shop.id,
      name: shop.name,
      station: shop.station,
      type: shop.type,
      address: shop.address,
      city: shop.city,
      zipCode: shop.zipCode,
      phone: shop.phone,
      email: shop.email,
      website: shop.website || "",
      featured: shop.featured,
      status: shop.status,
      ownerName: shop.owner.name,
      ownerEmail: shop.owner.email,
      ownerPhone: shop.owner.phone,
      commissionRate: shop.owner.commissionRate,
      services: shop.services,
    });
    this.showModal.set(true);
  }

  openInventoryManagement(shop: Shop): void {
    // TODO: Implementar gestión de inventario
    console.log("Gestionar inventario de:", shop.name);
  }

  openRentalsManagement(shop: Shop): void {
    // TODO: Implementar gestión de alquileres
    console.log("Gestionar alquileres de:", shop.name);
  }

  openDeleteDialog(shop: Shop): void {
    this.selectedShop.set(shop);
    this.showDeleteDialog.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedShop.set(null);
  }

  resetForm(): void {
    this.formData.set({
      name: "",
      station: "",
      type: "rental",
      address: "",
      city: "",
      zipCode: "",
      phone: "",
      email: "",
      website: "",
      featured: false,
      status: "active",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      commissionRate: 12,
      services: [],
    });
  }

  async handleSave(): Promise<void> {
    const data = this.formData();

    try {
      if (this.isEditMode()) {
        // Update existing shop
        const shop = this.selectedShop();
        if (!shop) return;

        const updated: Shop = {
          ...shop,
          ...data,
          stationName: this.getStationName(data.station),
          owner: {
            ...shop.owner,
            name: data.ownerName,
            email: data.ownerEmail,
            phone: data.ownerPhone,
            commissionRate: data.commissionRate,
          },
          updatedAt: new Date().toISOString(),
        };

        this.shops.update((shops) =>
          shops.map((s) => (s.id === updated.id ? updated : s))
        );
      } else {
        // Create new shop
        const newShop: Shop = {
          id: `SHP${String(this.shops().length + 1).padStart(3, "0")}`,
          ...data,
          stationName: this.getStationName(data.station),
          rating: 0,
          totalReviews: 0,
          owner: {
            id: `OWN${String(this.shops().length + 1).padStart(3, "0")}`,
            name: data.ownerName,
            email: data.ownerEmail,
            phone: data.ownerPhone,
            commissionRate: data.commissionRate,
          },
          stats: {
            totalRentals: 0,
            revenue: 0,
            avgRating: 0,
            inventoryValue: 0,
            lastRental: "",
          },
          openingHours: {
            monday: { open: "09:00", close: "19:00" },
            tuesday: { open: "09:00", close: "19:00" },
            wednesday: { open: "09:00", close: "19:00" },
            thursday: { open: "09:00", close: "19:00" },
            friday: { open: "09:00", close: "19:00" },
            saturday: { open: "09:00", close: "20:00" },
            sunday: { open: "09:00", close: "20:00" },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        this.shops.update((shops) => [...shops, newShop]);
      }

      this.closeModal();
    } catch (error) {
      console.error("Error al guardar tienda:", error);
    }
  }

  async handleDelete(): Promise<void> {
    const shop = this.selectedShop();
    if (!shop) return;

    try {
      this.shops.update((shops) => shops.filter((s) => s.id !== shop.id));
      this.closeDeleteDialog();
    } catch (error) {
      console.error("Error al eliminar tienda:", error);
    }
  }

  toggleService(service: string): void {
    const current = this.formData().services;
    const updated = current.includes(service)
      ? current.filter((s: string) => s !== service)
      : [...current, service];
    this.formData.update((form) => ({ ...form, services: updated }));
  }

  private getStationName(stationId: string): string {
    const stations: Record<string, string> = {
      "sierra-nevada": "Sierra Nevada",
      "baqueira-beret": "Baqueira Beret",
      formigal: "Formigal",
      candanchu: "Candanchú",
      astun: "Astún",
    };
    return stations[stationId] || stationId;
  }

  getShopTypeLabel(type: string): string {
    const types: Record<string, string> = {
      rental: "Solo Alquiler",
      retail: "Solo Venta",
      rental_retail: "Alquiler + Venta",
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
