/**
 * Admin Service - Nieve Platform
 * Servicio para gestionar datos del panel de administración
 */

import { Injectable, signal, computed } from "@angular/core";
import type {
  AdminMetrics,
  RecentActivity,
  TopStation,
  AdminUser,
  AdminBooking,
  AdminStation,
  AdminBlogPost,
  AdminSettings,
  ChartData,
} from "../models/admin.models";

@Injectable({
  providedIn: "root",
})
export class AdminService {
  // ========== SIGNALS ==========
  private readonly _metrics = signal<AdminMetrics | null>(null);
  private readonly _recentActivity = signal<RecentActivity[]>([]);
  private readonly _topStations = signal<TopStation[]>([]);
  private readonly _users = signal<AdminUser[]>([]);
  private readonly _bookings = signal<AdminBooking[]>([]);
  private readonly _stations = signal<AdminStation[]>([]);
  private readonly _blogPosts = signal<AdminBlogPost[]>([]);
  private readonly _settings = signal<AdminSettings | null>(null);
  private readonly _revenueChart = signal<ChartData | null>(null);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // ========== COMPUTED ==========
  readonly metrics = computed(() => this._metrics());
  readonly recentActivity = computed(() => this._recentActivity());
  readonly topStations = computed(() => this._topStations());
  readonly users = computed(() => this._users());
  readonly bookings = computed(() => this._bookings());
  readonly stations = computed(() => this._stations());
  readonly blogPosts = computed(() => this._blogPosts());
  readonly settings = computed(() => this._settings());
  readonly revenueChart = computed(() => this._revenueChart());
  readonly isLoading = computed(() => this._isLoading());
  readonly error = computed(() => this._error());

  // Computed stats
  readonly totalUsers = computed(() => this._users().length);
  readonly activeUsers = computed(
    () => this._users().filter((u) => u.status === "active").length
  );
  readonly totalBookings = computed(() => this._bookings().length);
  readonly totalRevenue = computed(() =>
    this._bookings().reduce((sum, b) => sum + b.totalAmount, 0)
  );

  // ========== DASHBOARD METHODS ==========

  async loadDashboardData(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await Promise.all([
        this.loadMetrics(),
        this.loadRecentActivity(),
        this.loadTopStations(),
        this.loadRevenueChart(),
      ]);
    } catch (error) {
      this._error.set("Error al cargar datos del dashboard");
      console.error("Error loading dashboard:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  async loadMetrics(): Promise<void> {
    const response = await fetch("/assets/mocks/admin/metrics.json");
    const data: AdminMetrics = await response.json();
    this._metrics.set(data);
  }

  async loadRecentActivity(): Promise<void> {
    const response = await fetch("/assets/mocks/admin/activity.json");
    const data: RecentActivity[] = await response.json();
    this._recentActivity.set(data);
  }

  async loadTopStations(): Promise<void> {
    const response = await fetch("/assets/mocks/admin/top-stations.json");
    const data: TopStation[] = await response.json();
    this._topStations.set(data);
  }

  async loadRevenueChart(): Promise<void> {
    const response = await fetch("/assets/mocks/admin/revenue-chart.json");
    const data: ChartData = await response.json();
    this._revenueChart.set(data);
  }

  // ========== USERS METHODS ==========

  async loadUsers(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/users.json");
      const data: AdminUser[] = await response.json();
      this._users.set(data);
    } catch (error) {
      this._error.set("Error al cargar usuarios");
      console.error("Error loading users:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateUser(userId: number, updates: Partial<AdminUser>): Promise<void> {
    // TODO: En producción, llamar a la API
    const users = this._users();
    const index = users.findIndex((u) => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      this._users.set([...users]);
    }
  }

  async deleteUser(userId: number): Promise<void> {
    // TODO: En producción, llamar a la API
    const users = this._users().filter((u) => u.id !== userId);
    this._users.set(users);
  }

  // ========== BOOKINGS METHODS ==========

  async loadBookings(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/bookings.json");
      const data: AdminBooking[] = await response.json();
      this._bookings.set(data);
    } catch (error) {
      this._error.set("Error al cargar reservas");
      console.error("Error loading bookings:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateBooking(
    bookingId: number,
    updates: Partial<AdminBooking>
  ): Promise<void> {
    // TODO: En producción, llamar a la API
    const bookings = this._bookings();
    const index = bookings.findIndex((b) => b.id === bookingId);
    if (index !== -1) {
      bookings[index] = { ...bookings[index], ...updates };
      this._bookings.set([...bookings]);
    }
  }

  // ========== STATIONS METHODS ==========

  async loadStations(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/stations.json");
      const data: AdminStation[] = await response.json();
      this._stations.set(data);
    } catch (error) {
      this._error.set("Error al cargar estaciones");
      console.error("Error loading stations:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateStation(
    stationId: number,
    updates: Partial<AdminStation>
  ): Promise<void> {
    // TODO: En producción, llamar a la API
    const stations = this._stations();
    const index = stations.findIndex((s) => s.id === stationId);
    if (index !== -1) {
      stations[index] = { ...stations[index], ...updates };
      this._stations.set([...stations]);
    }
  }

  // ========== BLOG METHODS ==========

  async loadBlogPosts(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/blog-posts.json");
      const data: AdminBlogPost[] = await response.json();
      this._blogPosts.set(data);
    } catch (error) {
      this._error.set("Error al cargar artículos");
      console.error("Error loading blog posts:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateBlogPost(
    postId: number,
    updates: Partial<AdminBlogPost>
  ): Promise<void> {
    // TODO: En producción, llamar a la API
    const posts = this._blogPosts();
    const index = posts.findIndex((p) => p.id === postId);
    if (index !== -1) {
      posts[index] = { ...posts[index], ...updates };
      this._blogPosts.set([...posts]);
    }
  }

  async deleteBlogPost(postId: number): Promise<void> {
    // TODO: En producción, llamar a la API
    const posts = this._blogPosts().filter((p) => p.id !== postId);
    this._blogPosts.set(posts);
  }

  // ========== SETTINGS METHODS ==========

  async loadSettings(): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await fetch("/assets/mocks/admin/settings.json");
      const data: AdminSettings = await response.json();
      this._settings.set(data);
    } catch (error) {
      this._error.set("Error al cargar configuración");
      console.error("Error loading settings:", error);
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateSettings(updates: Partial<AdminSettings>): Promise<void> {
    // TODO: En producción, llamar a la API
    const current = this._settings();
    if (current) {
      this._settings.set({ ...current, ...updates });
    }
  }
}
