import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

// Shared Components
import { AdminBreadcrumbsComponent } from "../../shared/admin-breadcrumbs/admin-breadcrumbs.component";
import { AdminStatCardComponent } from "../../shared/admin-stat-card/admin-stat-card.component";
import { AdminSearchBarComponent } from "../../shared/admin-search-bar/admin-search-bar.component";
import { AdminFiltersComponent } from "../../shared/admin-filters/admin-filters.component";
import { AdminTableComponent } from "../../shared/admin-table/admin-table.component";
import { AdminPaginationComponent } from "../../shared/admin-pagination/admin-pagination.component";
import { AdminModalComponent } from "../../shared/admin-modal/admin-modal.component";
import { AdminConfirmDialogComponent } from "../../shared/admin-confirm-dialog/admin-confirm-dialog.component";
import { AdminBadgeComponent } from "../../shared/admin-badge/admin-badge.component";
import { AdminLoaderComponent } from "../../shared/admin-loader/admin-loader.component";
import {
  ArticleStatus,
  ArticleVisibility,
  ArticleFormat,
  BlogArticle,
  BlogCategory,
  BlogTag,
  BlogAuthor,
  BlogSEO,
  BlogStats,
  BlogFormData,
  BlogOverviewStats,
} from "./admin-blog.models";

@Component({
  selector: "app-admin-blog",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AdminBreadcrumbsComponent,
    AdminStatCardComponent,
    AdminSearchBarComponent,
    AdminFiltersComponent,
    AdminTableComponent,
    AdminPaginationComponent,
    AdminModalComponent,
    AdminConfirmDialogComponent,
    AdminBadgeComponent,
    AdminLoaderComponent,
  ],
  templateUrl: "./admin-blog.component.html",
  styleUrls: ["./admin-blog.component.css"],
})
export class AdminBlogComponent implements OnInit {
  // State signals
  articles = signal<BlogArticle[]>([]);
  categories = signal<BlogCategory[]>([]);
  tags = signal<BlogTag[]>([]);
  authors = signal<BlogAuthor[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Filter & Search
  searchQuery = signal("");
  selectedStatus = signal<ArticleStatus | "all">("all");
  selectedCategory = signal<string | "all">("all");
  selectedAuthor = signal<string | "all">("all");

  // Pagination
  currentPage = signal(1);
  itemsPerPage = signal(20);

  // Modal state
  showModal = signal(false);
  showDeleteDialog = signal(false);
  isEditMode = signal(false);
  selectedArticle = signal<BlogArticle | null>(null);

  // Editor state
  currentLanguage = signal<"es" | "en" | "fr">("es");
  activeTab = signal<"content" | "seo" | "settings">("content");

  // Form data
  formData = signal<BlogFormData>({
    slug: "",
    status: "draft",
    visibility: "public",
    format: "standard",
    title: { es: "", en: "", fr: "" },
    excerpt: { es: "", en: "", fr: "" },
    content: { es: "", en: "", fr: "" },
    featuredImage: { url: "", alt: "" },
    authorId: "",
    categoryIds: [],
    tags: [],
    seo: {
      metaTitle: { es: "", en: "", fr: "" },
      metaDescription: { es: "", en: "", fr: "" },
      keywords: [],
      noindex: false,
      nofollow: false,
    },
    allowComments: true,
    featured: false,
    sticky: false,
  });

  // Breadcrumbs
  breadcrumbs = [
    { label: "Dashboard", url: "/admin/dashboard" },
    { label: "Blog", url: "/admin/blog" },
  ];

  // Computed values
  stats = computed<BlogOverviewStats>(() => {
    const arts = this.articles();
    return {
      totalArticles: arts.length,
      published: arts.filter((a) => a.status === "published").length,
      drafts: arts.filter((a) => a.status === "draft").length,
      totalViews: arts.reduce((sum, a) => sum + a.stats.views, 0),
      totalLikes: arts.reduce((sum, a) => sum + a.stats.likes, 0),
      totalComments: arts.reduce((sum, a) => sum + a.stats.comments, 0),
      avgReadingTime: arts.length
        ? Math.round(
            arts.reduce((sum, a) => sum + a.stats.readingTime, 0) / arts.length
          )
        : 0,
    };
  });

  filteredArticles = computed(() => {
    let result = this.articles();

    // Search
    const query = this.searchQuery().toLowerCase();
    if (query) {
      result = result.filter(
        (a) =>
          a.title.es.toLowerCase().includes(query) ||
          a.title.en.toLowerCase().includes(query) ||
          a.title.fr.toLowerCase().includes(query) ||
          a.slug.toLowerCase().includes(query) ||
          a.author.name.toLowerCase().includes(query)
      );
    }

    // Status filter
    const status = this.selectedStatus();
    if (status !== "all") {
      result = result.filter((a) => a.status === status);
    }

    // Category filter
    const category = this.selectedCategory();
    if (category !== "all") {
      result = result.filter((a) =>
        a.categories.some((c) => c.id === category)
      );
    }

    // Author filter
    const author = this.selectedAuthor();
    if (author !== "all") {
      result = result.filter((a) => a.author.id === author);
    }

    return result;
  });

  paginatedArticles = computed(() => {
    const filtered = this.filteredArticles();
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return filtered.slice(start, end);
  });

  // Table configuration
  tableColumns = [
    { key: "title", label: "Título", sortable: true },
    { key: "author", label: "Autor", sortable: true },
    { key: "categories", label: "Categorías", sortable: false },
    { key: "status", label: "Estado", sortable: true },
    { key: "views", label: "Vistas", sortable: true },
    { key: "publishedAt", label: "Publicado", sortable: true },
  ];

  tableActions = [
    {
      id: "edit",
      label: "Editar",
      icon: "✏️",
      handler: (row: BlogArticle) => this.openEditModal(row),
    },
    {
      id: "duplicate",
      label: "Duplicar",
      icon: "📋",
      handler: (row: BlogArticle) => this.duplicateArticle(row),
    },
    {
      id: "preview",
      label: "Vista previa",
      icon: "👁️",
      handler: (row: BlogArticle) => this.previewArticle(row),
    },
    {
      id: "delete",
      label: "Eliminar",
      icon: "🗑️",
      variant: "danger" as const,
      handler: (row: BlogArticle) => this.openDeleteDialog(row),
    },
  ];

  // Filter fields
  filterFields = [
    {
      key: "status",
      id: "status",
      label: "Estado",
      type: "select" as const,
      options: [
        { value: "all", label: "Todos" },
        { value: "published", label: "Publicados" },
        { value: "draft", label: "Borradores" },
        { value: "scheduled", label: "Programados" },
        { value: "archived", label: "Archivados" },
      ],
      value: "all",
    },
    {
      key: "category",
      id: "category",
      label: "Categoría",
      type: "select" as const,
      options: [{ value: "all", label: "Todas" }],
      value: "all",
    },
    {
      key: "author",
      id: "author",
      label: "Autor",
      type: "select" as const,
      options: [{ value: "all", label: "Todos" }],
      value: "all",
    },
  ];

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const [articlesRes, categoriesRes, authorsRes] = await Promise.all([
        fetch("/assets/mocks/blog-articles.json"),
        fetch("/assets/mocks/blog-categories.json"),
        fetch("/assets/mocks/blog-authors.json"),
      ]);

      const articlesData = await articlesRes.json();
      const categoriesData = await categoriesRes.json();
      const authorsData = await authorsRes.json();

      this.articles.set(articlesData);
      this.categories.set(categoriesData);
      this.authors.set(authorsData);

      // Update filter options
      this.updateFilterOptions();

      // Extract unique tags
      const uniqueTags = new Set<string>();
      articlesData.forEach((article: BlogArticle) => {
        article.tags.forEach((tag) => uniqueTags.add(tag.name));
      });
    } catch (err) {
      this.error.set("Error al cargar los datos del blog");
      console.error("Error loading blog data:", err);
    } finally {
      this.isLoading.set(false);
    }
  }

  updateFilterOptions(): void {
    // Update category options
    const categoryField = this.filterFields.find((f) => f.id === "category");
    if (categoryField && categoryField.type === "select") {
      categoryField.options = [
        { value: "all", label: "Todas" },
        ...this.categories().map((cat) => ({
          value: cat.id,
          label: cat.name.es,
        })),
      ];
    }

    // Update author options
    const authorField = this.filterFields.find((f) => f.id === "author");
    if (authorField && authorField.type === "select") {
      authorField.options = [
        { value: "all", label: "Todos" },
        ...this.authors().map((author) => ({
          value: author.id,
          label: author.name,
        })),
      ];
    }
  }

  handleSearch(query: string): void {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  handleFilterChange(filterId: string, value: string): void {
    switch (filterId) {
      case "status":
        this.selectedStatus.set(value as ArticleStatus | "all");
        break;
      case "category":
        this.selectedCategory.set(value);
        break;
      case "author":
        this.selectedAuthor.set(value);
        break;
    }
    this.currentPage.set(1);
  }

  handlePageChange(page: number): void {
    this.currentPage.set(page);
  }

  handleRowClick(article: BlogArticle): void {
    this.openEditModal(article);
  }

  handleActionClick(event: { row: BlogArticle; action: string }): void {
    const { row, action } = event;

    switch (action) {
      case "edit":
        this.openEditModal(row);
        break;
      case "duplicate":
        this.duplicateArticle(row);
        break;
      case "preview":
        this.previewArticle(row);
        break;
      case "delete":
        this.openDeleteDialog(row);
        break;
    }
  }

  openCreateModal(): void {
    this.isEditMode.set(false);
    this.selectedArticle.set(null);
    this.resetForm();
    this.showModal.set(true);
  }

  openEditModal(article: BlogArticle): void {
    this.isEditMode.set(true);
    this.selectedArticle.set(article);
    this.populateForm(article);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.resetForm();
  }

  openDeleteDialog(article: BlogArticle): void {
    this.selectedArticle.set(article);
    this.showDeleteDialog.set(true);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
    this.selectedArticle.set(null);
  }

  resetForm(): void {
    this.formData.set({
      slug: "",
      status: "draft",
      visibility: "public",
      format: "standard",
      title: { es: "", en: "", fr: "" },
      excerpt: { es: "", en: "", fr: "" },
      content: { es: "", en: "", fr: "" },
      featuredImage: { url: "", alt: "" },
      authorId: "",
      categoryIds: [],
      tags: [],
      seo: {
        metaTitle: { es: "", en: "", fr: "" },
        metaDescription: { es: "", en: "", fr: "" },
        keywords: [],
        noindex: false,
        nofollow: false,
      },
      allowComments: true,
      featured: false,
      sticky: false,
    });
    this.currentLanguage.set("es");
    this.activeTab.set("content");
  }

  populateForm(article: BlogArticle): void {
    this.formData.set({
      id: article.id,
      slug: article.slug,
      status: article.status,
      visibility: article.visibility,
      format: article.format,
      title: { ...article.title },
      excerpt: { ...article.excerpt },
      content: { ...article.content },
      featuredImage: { ...article.featuredImage },
      authorId: article.author.id,
      categoryIds: article.categories.map((c) => c.id),
      tags: article.tags.map((t) => t.name),
      seo: { ...article.seo },
      scheduledAt: article.scheduledAt,
      allowComments: article.allowComments,
      featured: article.featured,
      sticky: article.sticky,
    });
  }

  handleSave(): void {
    const data = this.formData();

    // Validation
    if (!data.title.es.trim()) {
      alert("El título en español es obligatorio");
      return;
    }

    if (!data.slug.trim()) {
      alert("El slug es obligatorio");
      return;
    }

    if (!data.authorId) {
      alert("Debe seleccionar un autor");
      return;
    }

    if (this.isEditMode()) {
      console.log("Updating article:", data);
      // Update logic here
    } else {
      console.log("Creating article:", data);
      // Create logic here
    }

    this.closeModal();
  }

  handleDelete(): void {
    const article = this.selectedArticle();
    if (article) {
      console.log("Deleting article:", article.id);
      // Delete logic here
      const updated = this.articles().filter((a) => a.id !== article.id);
      this.articles.set(updated);
    }
    this.closeDeleteDialog();
  }

  duplicateArticle(article: BlogArticle): void {
    console.log("Duplicating article:", article.id);
    // Duplicate logic here
  }

  previewArticle(article: BlogArticle): void {
    console.log("Previewing article:", article.slug);
    // Open preview in new tab
    window.open(`/blog/${article.slug}`, "_blank");
  }

  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  autoGenerateSlug(): void {
    const title = this.formData().title.es;
    if (title) {
      const slug = this.generateSlug(title);
      this.formData.update((data) => ({ ...data, slug }));
    }
  }

  getStatusBadgeVariant(
    status: ArticleStatus
  ): "success" | "warning" | "info" | "neutral" {
    switch (status) {
      case "published":
        return "success";
      case "draft":
        return "warning";
      case "scheduled":
        return "info";
      case "archived":
        return "neutral";
      default:
        return "neutral";
    }
  }

  getStatusLabel(status: ArticleStatus): string {
    const labels: Record<ArticleStatus, string> = {
      published: "Publicado",
      draft: "Borrador",
      scheduled: "Programado",
      archived: "Archivado",
    };
    return labels[status];
  }

  formatDate(date: string | undefined): string {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat("es-ES").format(num);
  }

  handleKeywordsChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const keywords = input.value
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);
    this.formData.update((data) => ({
      ...data,
      seo: {
        ...data.seo,
        keywords,
      },
    }));
  }

  handleTagsChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const tags = input.value
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);
    this.formData.update((data) => ({
      ...data,
      tags,
    }));
  }

  getDeleteMessage(): string {
    const article = this.selectedArticle();
    if (!article) return "";
    return `¿Estás seguro de que quieres eliminar "${article.title.es}"? Esta acción no se puede deshacer.`;
  }
}
