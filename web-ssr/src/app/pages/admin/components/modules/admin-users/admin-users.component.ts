import { Component, signal, computed, inject } from "@angular/core";
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
import { User, UserFormData } from "./admin-users.models";

/**
 * AdminUsersComponent
 *
 * Gestión completa de usuarios del sistema
 * - CRUD de usuarios
 * - Filtros avanzados
 * - Búsqueda en tiempo real
 * - Acciones masivas
 * - Gestión de roles y permisos
 */
@Component({
  selector: "app-admin-users",
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
  templateUrl: "./admin-users.component.html",
  styleUrl: "./admin-users.component.css",
})
export class AdminUsersComponent {
  private readonly operationsService = inject(OperationsService);

  // State
  readonly isLoading = signal(true);
  readonly users = signal<User[]>([]);
  readonly selectedUsers = signal<string[]>([]);

  // Modals
  readonly showCreateModal = signal(false);
  readonly showEditModal = signal(false);
  readonly showDeleteConfirm = signal(false);
  readonly showBulkDeleteConfirm = signal(false);

  // Form
  readonly userForm = signal<UserFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "user",
    status: "active",
  });
  readonly editingUserId = signal<string | null>(null);

  // Pagination
  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalUsers = computed(() => this.filteredUsers().length);
  readonly totalPages = computed(() =>
    Math.ceil(this.totalUsers() / this.pageSize())
  );

  // Search & Filters
  readonly searchQuery = signal("");
  readonly activeFilters = signal<Record<string, unknown>>({});

  // Breadcrumbs
  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: "Admin", url: "/admin" },
    { label: "Usuarios", url: "/admin/users" },
  ];

  // Stats
  readonly stats = computed(() => {
    const userList = this.users();
    const totalUsers = userList.length;
    const activeUsers = userList.filter((u) => u.status === "active").length;
    const newThisMonth = userList.filter((u) => {
      const createdDate = new Date(u.createdAt);
      const now = new Date();
      return (
        createdDate.getMonth() === now.getMonth() &&
        createdDate.getFullYear() === now.getFullYear()
      );
    }).length;

    return {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
      newThisMonth,
    };
  });

  // Filtered & Paginated Users
  readonly filteredUsers = computed(() => {
    let result = this.users();

    // Apply search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(
        (user) =>
          user.firstName.toLowerCase().includes(query) ||
          user.lastName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Apply filters
    const filters = this.activeFilters();
    if (filters["role"]) {
      result = result.filter((u) => u.role === filters["role"]);
    }
    if (filters["status"]) {
      result = result.filter((u) => u.status === filters["status"]);
    }

    return result;
  });

  readonly paginatedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredUsers().slice(start, end);
  });

  // Table Configuration
  readonly tableColumns: TableColumn<User>[] = [
    {
      key: "firstName",
      label: "Nombre",
      sortable: true,
      formatter: (user) => `${user.firstName} ${user.lastName}`,
    },
    { key: "email", label: "Email", sortable: true },
    { key: "phone", label: "Teléfono", sortable: false },
    {
      key: "role",
      label: "Rol",
      sortable: true,
      formatter: (user) => this.formatRole(user.role),
    },
    {
      key: "status",
      label: "Estado",
      sortable: true,
      type: "badge",
      formatter: (user) => user.status,
    },
    {
      key: "createdAt",
      label: "Fecha registro",
      sortable: true,
      formatter: (user) => new Date(user.createdAt).toLocaleDateString("es-ES"),
    },
  ];

  readonly tableActions: TableAction<User>[] = [
    {
      label: "Editar",
      icon: "✏️",
      handler: (user) => this.openEditModal(user),
    },
    {
      label: "Eliminar",
      icon: "🗑️",
      variant: "danger",
      handler: (user) => this.confirmDelete(user),
    },
  ];

  readonly filterFields: FilterField[] = [
    {
      key: "role",
      label: "Rol",
      type: "select",
      options: [
        { value: "admin", label: "Administrador" },
        { value: "manager", label: "Manager" },
        { value: "user", label: "Usuario" },
      ],
    },
    {
      key: "status",
      label: "Estado",
      type: "select",
      options: [
        { value: "active", label: "Activo" },
        { value: "inactive", label: "Inactivo" },
        { value: "suspended", label: "Suspendido" },
      ],
    },
  ];

  constructor() {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.operationsService.loadUsers();
      this.users.set(this.operationsService.users());
    } catch (error) {
      console.error("Error loading users:", error);
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
  onSelectionChange(userIds: string[]): void {
    this.selectedUsers.set(userIds);
  }

  // Create
  openCreateModal(): void {
    this.userForm.set({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      role: "user",
      status: "active",
    });
    this.showCreateModal.set(true);
  }

  async createUser(): Promise<void> {
    const formData = this.userForm();

    try {
      await this.operationsService.createUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        status: formData.status,
      });

      this.showCreateModal.set(false);
      await this.loadUsers();
    } catch (error) {
      console.error("Error creating user:", error);
    }
  }

  // Edit
  openEditModal(user: User): void {
    this.editingUserId.set(user.id);
    this.userForm.set({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    });
    this.showEditModal.set(true);
  }

  async updateUser(): Promise<void> {
    const formData = this.userForm();
    const userId = this.editingUserId();

    if (!userId) return;

    try {
      await this.operationsService.updateUser(userId, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        status: formData.status,
      });

      this.showEditModal.set(false);
      this.editingUserId.set(null);
      await this.loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
    }
  }

  // Delete
  confirmDelete(user: User): void {
    this.editingUserId.set(user.id);
    this.showDeleteConfirm.set(true);
  }

  async deleteUser(): Promise<void> {
    const userId = this.editingUserId();
    if (!userId) return;

    try {
      await this.operationsService.deleteUser(userId);
      this.showDeleteConfirm.set(false);
      this.editingUserId.set(null);
      await this.loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  }

  // Bulk Actions
  confirmBulkDelete(): void {
    if (this.selectedUsers().length === 0) return;
    this.showBulkDeleteConfirm.set(true);
  }

  async bulkDeleteUsers(): Promise<void> {
    const userIds = this.selectedUsers();

    try {
      await Promise.all(
        userIds.map((id) => this.operationsService.deleteUser(id))
      );

      this.showBulkDeleteConfirm.set(false);
      this.selectedUsers.set([]);
      await this.loadUsers();
    } catch (error) {
      console.error("Error deleting users:", error);
    }
  }

  // Helpers
  private formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      admin: "Administrador",
      manager: "Manager",
      user: "Usuario",
    };
    return roleMap[role] || role;
  }

  getBadgeVariant(status: string): "success" | "danger" | "warning" {
    switch (status) {
      case "active":
        return "success";
      case "suspended":
        return "danger";
      case "inactive":
        return "warning";
      default:
        return "warning";
    }
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      active: "Activo",
      inactive: "Inactivo",
      suspended: "Suspendido",
    };
    return statusMap[status] || status;
  }
}
