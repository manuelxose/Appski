import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

// ========================================
// INTERFACES
// ========================================

export interface Review {
  id: string;
  stationId: string;
  stationName: string;
  customerId: string;
  customerName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  photos?: string[];
  visitDate: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected" | "flagged";
  moderatedBy?: string;
  moderatedAt?: string;
  sentiment?: "positive" | "neutral" | "negative";
  sentimentScore?: number; // 0-1
  helpful: number;
  notHelpful: number;
  response?: ReviewResponse;
  tags?: string[];
}

export interface ReviewResponse {
  id: string;
  reviewId: string;
  authorName: string;
  authorRole: "admin" | "owner";
  message: string;
  createdAt: string;
}

export interface ReviewStats {
  totalReviews: number;
  pendingReviews: number;
  approvedReviews: number;
  rejectedReviews: number;
  avgRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface StationReputation {
  stationId: string;
  stationName: string;
  totalReviews: number;
  avgRating: number;
  trend: "up" | "down" | "stable"; // Tendencia últimos 30 días
  categories: {
    snow: number;
    facilities: number;
    service: number;
    valueForMoney: number;
  };
}

// ========================================
// COMPONENT
// ========================================

@Component({
  selector: "app-admin-reviews",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-reviews.component.html",
  styleUrl: "./admin-reviews.component.css",
})
export class AdminReviewsComponent implements OnInit {
  // Data Signals
  reviews = signal<Review[]>([]);
  reputations = signal<StationReputation[]>([]);
  stats = signal<ReviewStats>({
    totalReviews: 0,
    pendingReviews: 0,
    approvedReviews: 0,
    rejectedReviews: 0,
    avgRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
  });
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Filter Signals
  selectedStatus = signal<
    "all" | "pending" | "approved" | "rejected" | "flagged"
  >("all");
  selectedRating = signal<number | "all">("all");
  selectedSentiment = signal<"all" | "positive" | "neutral" | "negative">(
    "all"
  );
  selectedStation = signal<string>("all");
  searchTerm = signal("");

  // Computed Values
  filteredReviews = computed(() => {
    let filtered = this.reviews();

    if (this.selectedStatus() !== "all") {
      filtered = filtered.filter((r) => r.status === this.selectedStatus());
    }

    if (this.selectedRating() !== "all") {
      filtered = filtered.filter((r) => r.rating === this.selectedRating());
    }

    if (this.selectedSentiment() !== "all") {
      filtered = filtered.filter(
        (r) => r.sentiment === this.selectedSentiment()
      );
    }

    if (this.selectedStation() !== "all") {
      filtered = filtered.filter((r) => r.stationId === this.selectedStation());
    }

    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(search) ||
          r.comment.toLowerCase().includes(search) ||
          r.customerName.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  pendingReviews = computed(
    () => this.reviews().filter((r) => r.status === "pending").length
  );
  flaggedReviews = computed(
    () => this.reviews().filter((r) => r.status === "flagged").length
  );
  avgRating = computed(() => this.stats().avgRating);

  positiveReviews = computed(
    () => this.reviews().filter((r) => r.sentiment === "positive").length
  );
  negativeReviews = computed(
    () => this.reviews().filter((r) => r.sentiment === "negative").length
  );

  topRatedStations = computed(() =>
    [...this.reputations()]
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5)
  );

  // ========================================
  // LIFECYCLE
  // ========================================

  ngOnInit(): void {
    this.loadReviewsData();
  }

  async loadReviewsData(): Promise<void> {
    try {
      this.isLoading.set(true);

      // Parallel fetch
      const [reviewsData, reputationsData] = await Promise.all([
        fetch("/assets/mocks/admin/reviews.json").then((r) => r.json()),
        fetch("/assets/mocks/admin/station-reputations.json").then((r) =>
          r.json()
        ),
      ]);

      this.reviews.set(reviewsData.reviews || []);
      this.reputations.set(reputationsData.stations || []);
      this.stats.set(reviewsData.stats || this.stats());
    } catch (err) {
      this.error.set("Error cargando reseñas: " + (err as Error).message);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ========================================
  // ACTIONS - Reviews
  // ========================================

  viewReview(id: string): void {
    console.log("Ver reseña", id);
  }

  approveReview(id: string): void {
    console.log("Aprobar reseña", id);
  }

  rejectReview(id: string): void {
    console.log("Rechazar reseña", id);
  }

  flagReview(id: string): void {
    console.log("Marcar reseña", id);
  }

  respondToReview(id: string): void {
    console.log("Responder a reseña", id);
  }

  deleteReview(id: string): void {
    console.log("Eliminar reseña", id);
  }

  // ========================================
  // ACTIONS - Bulk
  // ========================================

  approveSelected(): void {
    console.log("Aprobar seleccionadas");
  }

  rejectSelected(): void {
    console.log("Rechazar seleccionadas");
  }

  // ========================================
  // ACTIONS - Reports
  // ========================================

  exportReviews(): void {
    console.log("Exportar reseñas");
  }

  exportReputationReport(): void {
    console.log("Exportar informe de reputación");
  }

  viewStationDetails(stationId: string): void {
    console.log("Ver detalles estación", stationId);
  }

  // ========================================
  // HELPERS
  // ========================================

  getStatusLabel(status: Review["status"]): string {
    const labels: Record<Review["status"], string> = {
      pending: "Pendiente",
      approved: "Aprobada",
      rejected: "Rechazada",
      flagged: "Marcada",
    };
    return labels[status];
  }

  getStatusClass(status: Review["status"]): string {
    return `status-${status}`;
  }

  getSentimentLabel(sentiment?: Review["sentiment"]): string {
    if (!sentiment) return "Sin análisis";
    const labels: Record<"positive" | "neutral" | "negative", string> = {
      positive: "Positiva",
      neutral: "Neutral",
      negative: "Negativa",
    };
    return labels[sentiment];
  }

  getSentimentClass(sentiment?: Review["sentiment"]): string {
    return sentiment ? `sentiment-${sentiment}` : "sentiment-none";
  }

  getSentimentIcon(sentiment?: Review["sentiment"]): string {
    if (!sentiment) return "❓";
    const icons: Record<"positive" | "neutral" | "negative", string> = {
      positive: "😊",
      neutral: "😐",
      negative: "😞",
    };
    return icons[sentiment];
  }

  getRatingStars(rating: number): string {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  }

  getRatingClass(rating: number): string {
    if (rating >= 4) return "rating-excellent";
    if (rating >= 3) return "rating-good";
    if (rating >= 2) return "rating-fair";
    return "rating-poor";
  }

  getTrendIcon(trend: StationReputation["trend"]): string {
    const icons: Record<StationReputation["trend"], string> = {
      up: "📈",
      down: "📉",
      stable: "➡️",
    };
    return icons[trend];
  }

  getTrendClass(trend: StationReputation["trend"]): string {
    return `trend-${trend}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  formatDateFull(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  getHelpfulPercentage(review: Review): number {
    const total = review.helpful + review.notHelpful;
    return total > 0 ? (review.helpful / total) * 100 : 0;
  }

  getCategoryLabel(category: keyof StationReputation["categories"]): string {
    const labels: Record<keyof StationReputation["categories"], string> = {
      snow: "Nieve",
      facilities: "Instalaciones",
      service: "Servicio",
      valueForMoney: "Relación calidad-precio",
    };
    return labels[category];
  }
}
