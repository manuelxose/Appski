import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

// ========================================
// INTERFACES
// ========================================

export interface Campaign {
  id: string;
  name: string;
  type: "seasonal" | "promotional" | "package" | "loyalty" | "flash";
  status: "draft" | "scheduled" | "active" | "paused" | "ended";
  startDate: string;
  endDate: string;
  description: string;
  discountCodes?: string[];
  packagesIds?: string[];
  targetSegment?: string;
  budget?: number;
  spent?: number;
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    roi: number; // %
  };
}

export interface DiscountCode {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "bogo" | "free_shipping";
  value: number; // % o € según type
  campaignId?: string;
  campaignName?: string;
  validFrom: string;
  validTo: string;
  usageLimit?: number;
  usedCount: number;
  minimumPurchase?: number;
  applicableProducts?: string[]; // 'all', 'forfaits', 'lodging', 'rental'
  status: "active" | "expired" | "disabled";
  stackable: boolean; // Se puede combinar con otros códigos
}

export interface Package {
  id: string;
  name: string;
  description: string;
  type: "family" | "couple" | "group" | "beginner" | "advanced";
  includes: string[];
  price: number;
  originalPrice: number;
  discount: number; // %
  availableFrom: string;
  availableTo: string;
  maxBookings?: number;
  currentBookings: number;
  status: "active" | "full" | "expired";
}

export interface LoyaltyProgram {
  id: string;
  name: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  minPoints: number;
  maxPoints?: number;
  benefits: string[];
  discountPercentage: number;
  currentMembers: number;
  rewardsGiven: number;
  isActive: boolean;
}

export interface CampaignsStats {
  totalActiveCampaigns: number;
  totalRevenue: number;
  avgROI: number;
  activeDiscountCodes: number;
  totalRedemptions: number;
  loyaltyMembers: number;
  avgSpendingPerMember: number;
}

// ========================================
// COMPONENT
// ========================================

@Component({
  selector: "app-admin-campaigns",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-campaigns.component.html",
  styleUrl: "./admin-campaigns.component.css",
})
export class AdminCampaignsComponent implements OnInit {
  // Data Signals
  campaigns = signal<Campaign[]>([]);
  discountCodes = signal<DiscountCode[]>([]);
  packages = signal<Package[]>([]);
  loyaltyPrograms = signal<LoyaltyProgram[]>([]);
  stats = signal<CampaignsStats>({
    totalActiveCampaigns: 0,
    totalRevenue: 0,
    avgROI: 0,
    activeDiscountCodes: 0,
    totalRedemptions: 0,
    loyaltyMembers: 0,
    avgSpendingPerMember: 0,
  });
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Filter Signals
  selectedCampaignStatus = signal<
    "all" | "draft" | "scheduled" | "active" | "paused" | "ended"
  >("all");
  selectedCampaignType = signal<
    "all" | "seasonal" | "promotional" | "package" | "loyalty" | "flash"
  >("all");
  selectedCodeStatus = signal<"all" | "active" | "expired" | "disabled">("all");
  searchTerm = signal("");

  // Computed Values
  filteredCampaigns = computed(() => {
    let filtered = this.campaigns();

    if (this.selectedCampaignStatus() !== "all") {
      filtered = filtered.filter(
        (c) => c.status === this.selectedCampaignStatus()
      );
    }

    if (this.selectedCampaignType() !== "all") {
      filtered = filtered.filter((c) => c.type === this.selectedCampaignType());
    }

    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.description.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  filteredDiscountCodes = computed(() => {
    let filtered = this.discountCodes();

    if (this.selectedCodeStatus() !== "all") {
      filtered = filtered.filter((c) => c.status === this.selectedCodeStatus());
    }

    return filtered;
  });

  activePackages = computed(() =>
    this.packages().filter((p) => p.status === "active")
  );

  activeLoyaltyTiers = computed(() =>
    this.loyaltyPrograms().filter((l) => l.isActive)
  );

  totalCampaigns = computed(() => this.campaigns().length);
  activeCampaigns = computed(
    () => this.campaigns().filter((c) => c.status === "active").length
  );
  scheduledCampaigns = computed(
    () => this.campaigns().filter((c) => c.status === "scheduled").length
  );

  totalDiscountCodes = computed(() => this.discountCodes().length);
  activeDiscountCodes = computed(
    () => this.discountCodes().filter((c) => c.status === "active").length
  );

  totalPackages = computed(() => this.packages().length);
  availablePackages = computed(
    () => this.packages().filter((p) => p.status === "active").length
  );

  totalLoyaltyMembers = computed(() =>
    this.loyaltyPrograms().reduce((sum, tier) => sum + tier.currentMembers, 0)
  );

  // ========================================
  // LIFECYCLE
  // ========================================

  ngOnInit(): void {
    this.loadCampaignsData();
  }

  async loadCampaignsData(): Promise<void> {
    try {
      this.isLoading.set(true);

      // Parallel fetch
      const [campaignsData, discountCodesData, packagesData, loyaltyData] =
        await Promise.all([
          fetch("/assets/mocks/admin/campaigns.json").then((r) => r.json()),
          fetch("/assets/mocks/admin/discount-codes.json").then((r) =>
            r.json()
          ),
          fetch("/assets/mocks/admin/packages.json").then((r) => r.json()),
          fetch("/assets/mocks/admin/loyalty-programs.json").then((r) =>
            r.json()
          ),
        ]);

      this.campaigns.set(campaignsData.campaigns || []);
      this.discountCodes.set(discountCodesData.codes || []);
      this.packages.set(packagesData.packages || []);
      this.loyaltyPrograms.set(loyaltyData.programs || []);
      this.stats.set(campaignsData.stats || this.stats());
    } catch (err) {
      this.error.set(
        "Error cargando datos de campañas: " + (err as Error).message
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // ========================================
  // ACTIONS - Campaigns
  // ========================================

  createCampaign(): void {
    console.log("Crear nueva campaña");
  }

  editCampaign(id: string): void {
    console.log("Editar campaña", id);
  }

  pauseCampaign(id: string): void {
    console.log("Pausar campaña", id);
  }

  resumeCampaign(id: string): void {
    console.log("Reanudar campaña", id);
  }

  endCampaign(id: string): void {
    console.log("Finalizar campaña", id);
  }

  viewCampaignReport(id: string): void {
    console.log("Ver informe de campaña", id);
  }

  duplicateCampaign(id: string): void {
    console.log("Duplicar campaña", id);
  }

  // ========================================
  // ACTIONS - Discount Codes
  // ========================================

  createDiscountCode(): void {
    console.log("Crear código descuento");
  }

  editDiscountCode(id: string): void {
    console.log("Editar código", id);
  }

  copyCode(code: string): void {
    navigator.clipboard.writeText(code);
    console.log("Código copiado", code);
  }

  disableCode(id: string): void {
    console.log("Desactivar código", id);
  }

  // ========================================
  // ACTIONS - Packages
  // ========================================

  createPackage(): void {
    console.log("Crear paquete");
  }

  editPackage(id: string): void {
    console.log("Editar paquete", id);
  }

  viewPackageBookings(id: string): void {
    console.log("Ver reservas del paquete", id);
  }

  // ========================================
  // ACTIONS - Loyalty
  // ========================================

  editLoyaltyTier(id: string): void {
    console.log("Editar tier de fidelización", id);
  }

  viewLoyaltyMembers(tier: string): void {
    console.log("Ver miembros del tier", tier);
  }

  exportLoyaltyReport(): void {
    console.log("Exportar informe de fidelización");
  }

  // ========================================
  // HELPERS
  // ========================================

  getCampaignTypeLabel(type: Campaign["type"]): string {
    const labels: Record<Campaign["type"], string> = {
      seasonal: "Temporada",
      promotional: "Promocional",
      package: "Paquete",
      loyalty: "Fidelización",
      flash: "Flash",
    };
    return labels[type];
  }

  getCampaignTypeIcon(type: Campaign["type"]): string {
    const icons: Record<Campaign["type"], string> = {
      seasonal: "❄️",
      promotional: "🎁",
      package: "📦",
      loyalty: "⭐",
      flash: "⚡",
    };
    return icons[type];
  }

  getStatusLabel(status: Campaign["status"]): string {
    const labels: Record<Campaign["status"], string> = {
      draft: "Borrador",
      scheduled: "Programada",
      active: "Activa",
      paused: "Pausada",
      ended: "Finalizada",
    };
    return labels[status];
  }

  getStatusClass(status: Campaign["status"]): string {
    return `status-${status}`;
  }

  getDiscountTypeLabel(type: DiscountCode["type"]): string {
    const labels: Record<DiscountCode["type"], string> = {
      percentage: "Porcentaje",
      fixed: "Fijo",
      bogo: "2x1",
      free_shipping: "Envío Gratis",
    };
    return labels[type];
  }

  getPackageTypeLabel(type: Package["type"]): string {
    const labels: Record<Package["type"], string> = {
      family: "Familia",
      couple: "Pareja",
      group: "Grupo",
      beginner: "Principiante",
      advanced: "Avanzado",
    };
    return labels[type];
  }

  getLoyaltyTierLabel(tier: LoyaltyProgram["tier"]): string {
    const labels: Record<LoyaltyProgram["tier"], string> = {
      bronze: "Bronce",
      silver: "Plata",
      gold: "Oro",
      platinum: "Platino",
    };
    return labels[tier];
  }

  getTierColor(tier: LoyaltyProgram["tier"]): string {
    const colors: Record<LoyaltyProgram["tier"], string> = {
      bronze: "#CD7F32",
      silver: "#C0C0C0",
      gold: "#FFD700",
      platinum: "#E5E4E2",
    };
    return colors[tier];
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  getROIClass(roi: number): string {
    if (roi >= 200) return "roi-excellent";
    if (roi >= 100) return "roi-good";
    if (roi >= 50) return "roi-fair";
    return "roi-poor";
  }
}
