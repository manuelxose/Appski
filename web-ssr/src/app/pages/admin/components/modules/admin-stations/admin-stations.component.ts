import { Component, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ContentService } from "../../../services/content.service";
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
import { AdminFileUploadComponent } from "../../shared/admin-file-upload/admin-file-upload.component";
import { SkiStation, StationFormData } from "./admin-stations.models";

/**
 * AdminStationsComponent
 *
 * Gestión completa de estaciones de esquí
 * - CRUD de estaciones
 * - Gestión de estado de apertura
 * - Control de pistas abiertas/cerradas
 * - Información de contacto
 * - Subida de mapas de pistas
 */
@Component({
  selector: "app-admin-stations",
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
    AdminFileUploadComponent,
  ],
  templateUrl: "./admin-stations.component.html",
  styleUrl: "./admin-stations.component.css",
})
export class AdminStationsComponent {
  private readonly contentService = inject(ContentService);

  // State
  readonly isLoading = signal(true);
  readonly stations = signal<SkiStation[]>([]);
  readonly selectedStations = signal<string[]>([]);

  // Modals
  readonly showCreateModal = signal(false);
  readonly showEditModal = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly showMapUploadModal = signal(false);

  // Form
  readonly stationForm = signal<StationFormData>({
    name: "",
    slug: "",
    status: "seasonal",
    altitudeBase: 1500,
    altitudeMid: 2000,
    altitudeTop: 2500,
    totalPistes: 0,
    openPistes: 0,
    description: "",
    phoneContact: "",
    emailContact: "",
  });
  readonly editingStationId = signal<string | null>(null);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalStations = computed(() => this.filteredStations().length);
  readonly totalPages = computed(() =>
    Math.ceil(this.totalStations() / this.pageSize())
  );

  // Search & Filters
  readonly searchQuery = signal("");
  readonly activeFilters = signal<Record<string, unknown>>({});

  // Breadcrumbs
  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: "Admin", url: "/admin" },
    { label: "Estaciones", url: "/admin/stations" },
  ];

  // Stats
  readonly stats = computed(() => {
    const stationList = this.stations();
    const totalStations = stationList.length;
    const openStations = stationList.filter((s) => s.status === "open").length;
    const closedStations = stationList.filter(
      (s) => s.status === "closed"
    ).length;
    const totalPistes = stationList.reduce(
      (sum, s) => sum + (s.totalPistes || 0),
      0
    );
    const openPistes = stationList.reduce(
      (sum, s) => sum + (s.openPistes || 0),
      0
    );

    return {
      total: totalStations,
      open: openStations,
      closed: closedStations,
      totalPistes,
      openPistes,
      pistesPercentage:
        totalPistes > 0 ? Math.round((openPistes / totalPistes) * 100) : 0,
    };
  });

  // Filtered & Paginated Stations
  readonly filteredStations = computed(() => {
    let result = this.stations();

    // Apply search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(
        (station) =>
          station.name.toLowerCase().includes(query) ||
          station.slug.toLowerCase().includes(query)
      );
    }

    // Apply filters
    const filters = this.activeFilters();
    if (filters["status"]) {
      result = result.filter((s) => s.status === filters["status"]);
    }

    return result;
  });

  readonly paginatedStations = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredStations().slice(start, end);
  });

  // Table Configuration
  readonly tableColumns: TableColumn<SkiStation>[] = [
    { key: "name", label: "Nombre", sortable: true },
    { key: "slug", label: "Slug", sortable: true },
    {
      key: "status",
      label: "Estado",
      sortable: true,
      type: "badge",
      formatter: (station) => this.getStatusLabel(station.status || "seasonal"),
    },
    {
      key: "altitudes",
      label: "Altitudes",
      sortable: false,
      formatter: (station) =>
        `${station.altitudes.base}m - ${station.altitudes.top}m`,
    },
    {
      key: "pistes",
      label: "Pistas",
      sortable: false,
      formatter: (station) =>
        `${station.openPistes || 0} / ${station.totalPistes || 0}`,
    },
    {
      key: "openPistes",
      label: "% Apertura",
      sortable: true,
      formatter: (station) => {
        const total = station.totalPistes || 0;
        const open = station.openPistes || 0;
        const percentage = total > 0 ? Math.round((open / total) * 100) : 0;
        return `${percentage}%`;
      },
    },
  ];

  readonly tableActions: TableAction<SkiStation>[] = [
    {
      label: "Editar",
      icon: "✏️",
      handler: (station) => this.openEditModal(station),
    },
    {
      label: "Subir Mapa",
      icon: "🗺️",
      handler: (station) => this.openMapUploadModal(station),
    },
    {
      label: "Eliminar",
      icon: "🗑️",
      variant: "danger",
      handler: (station) => this.confirmDelete(station),
    },
  ];

  readonly filterFields: FilterField[] = [
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "open", label: "Abierta" },
        { value: "closed", label: "Cerrada" },
        { value: "seasonal", label: "Temporada" },
        { value: "maintenance", label: "Mantenimiento" },
      ],
    },
  ];

  constructor() {
    this.loadStations();
  }

  async loadStations(): Promise<void> {
    this.isLoading.set(true);
    try {
      // TODO: Replace with actual API call
      const mockStations: SkiStation[] = [
        {
          slug: "sierra-nevada",
          name: "Sierra Nevada",
          status: "open",
          altitudes: { base: 2100, mid: 2500, top: 3300 },
          totalPistes: 120,
          openPistes: 95,
          description: "Estación de esquí más al sur de Europa",
          phoneContact: "+34 958 24 91 11",
          emailContact: "info@sierranevada.es",
        },
        {
          slug: "baqueira-beret",
          name: "Baqueira Beret",
          status: "open",
          altitudes: { base: 1500, mid: 2000, top: 2510 },
          totalPistes: 165,
          openPistes: 140,
          description: "La estación más grande de España",
          phoneContact: "+34 973 63 90 00",
          emailContact: "info@baqueira.es",
        },
      ];
      this.stations.set(mockStations);
    } catch (error) {
      console.error("Error loading stations:", error);
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
  onSelectionChange(stationIds: string[]): void {
    this.selectedStations.set(stationIds);
  }

  // Create
  openCreateModal(): void {
    this.stationForm.set({
      name: "",
      slug: "",
      status: "seasonal",
      altitudeBase: 1500,
      altitudeMid: 2000,
      altitudeTop: 2500,
      totalPistes: 0,
      openPistes: 0,
      description: "",
      phoneContact: "",
      emailContact: "",
    });
    this.showCreateModal.set(true);
  }

  async createStation(): Promise<void> {
    const formData = this.stationForm();

    try {
      // TODO: Replace with actual API call
      console.log("Creating station:", formData);

      this.showCreateModal.set(false);
      await this.loadStations();
    } catch (error) {
      console.error("Error creating station:", error);
    }
  }

  // Edit
  openEditModal(station: SkiStation): void {
    this.editingStationId.set(station.slug);
    this.stationForm.set({
      id: station.slug,
      name: station.name,
      slug: station.slug,
      status: station.status || "seasonal",
      altitudeBase: station.altitudes.base,
      altitudeMid: station.altitudes.mid,
      altitudeTop: station.altitudes.top,
      totalPistes: station.totalPistes || 0,
      openPistes: station.openPistes || 0,
      description: station.description || "",
      phoneContact: station.phoneContact || "",
      emailContact: station.emailContact || "",
    });
    this.showEditModal.set(true);
  }

  async updateStation(): Promise<void> {
    const formData = this.stationForm();
    const stationId = this.editingStationId();

    if (!stationId) return;

    try {
      // TODO: Replace with actual API call
      console.log("Updating station:", formData);

      this.showEditModal.set(false);
      this.editingStationId.set(null);
      await this.loadStations();
    } catch (error) {
      console.error("Error updating station:", error);
    }
  }

  // Delete
  confirmDelete(station: SkiStation): void {
    this.editingStationId.set(station.slug);
    this.showDeleteConfirm.set(true);
  }

  async deleteStation(): Promise<void> {
    const stationId = this.editingStationId();
    if (!stationId) return;

    try {
      // TODO: Replace with actual API call
      console.log("Deleting station:", stationId);

      this.showDeleteConfirm.set(false);
      this.editingStationId.set(null);
      await this.loadStations();
    } catch (error) {
      console.error("Error deleting station:", error);
    }
  }

  // Map Upload
  openMapUploadModal(station: SkiStation): void {
    this.editingStationId.set(station.slug);
    this.showMapUploadModal.set(true);
  }

  onMapFilesSelected(files: File[]): void {
    console.log("Map files selected:", files);
  }

  onMapUploadComplete(): void {
    this.showMapUploadModal.set(false);
    this.editingStationId.set(null);
  }

  // Helpers
  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      open: "Abierta",
      closed: "Cerrada",
      seasonal: "Temporada",
      maintenance: "Mantenimiento",
    };
    return statusMap[status] || status;
  }

  getBadgeVariant(status: string): "success" | "danger" | "warning" | "info" {
    switch (status) {
      case "open":
        return "success";
      case "closed":
        return "danger";
      case "maintenance":
        return "warning";
      case "seasonal":
        return "info";
      default:
        return "info";
    }
  }

  generateSlug(): void {
    const name = this.stationForm().name;
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    this.stationForm.update((form) => ({ ...form, slug }));
  }
}
