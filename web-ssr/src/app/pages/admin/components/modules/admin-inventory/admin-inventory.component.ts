import { Component, signal, computed, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { AdminStatCardComponent } from "../../shared/admin-stat-card/admin-stat-card.component";

// Interfaces
export interface InventoryProduct {
  id: string;
  name: string;
  category: "ski" | "snowboard" | "boots" | "helmet" | "poles" | "clothing";
  subcategory: string; // e.g., "All-mountain", "Freeride", "Kids"
  sku: string;
  brand: string;
  size?: string; // e.g., "165cm", "M", "42"
  condition: "new" | "excellent" | "good" | "fair" | "retired";
  stockQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitCost: number; // Precio de coste
  rentalPricePerDay: number;
  location: string; // e.g., "Almacén Principal", "Taller", "Tienda"
  lastMaintenanceDate: string;
  totalRentals: number;
  averageConditionScore: number; // 1-10
  images: string[];
  notes?: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  movementType:
    | "purchase"
    | "rental"
    | "return"
    | "transfer"
    | "maintenance"
    | "disposal";
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  date: string;
  performedBy: string;
  cost?: number;
  notes?: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  slug: "ski" | "snowboard" | "boots" | "helmet" | "poles" | "clothing";
  totalProducts: number;
  totalStockValue: number;
  averageUtilizationRate: number; // % de uso promedio
  icon: string;
}

@Component({
  selector: "app-admin-inventory",
  standalone: true,
  imports: [CommonModule, AdminStatCardComponent],
  templateUrl: "./admin-inventory.component.html",
  styleUrl: "./admin-inventory.component.css",
})
export class AdminInventoryComponent implements OnInit {
  // Signals de datos
  readonly products = signal<InventoryProduct[]>([]);
  readonly movements = signal<InventoryMovement[]>([]);
  readonly categories = signal<InventoryCategory[]>([]);

  // Signals de filtros
  readonly selectedCategory = signal<string>("all");
  readonly selectedCondition = signal<string>("all");
  readonly selectedStockLevel = signal<string>("all"); // 'all', 'low', 'ok', 'overstocked'
  readonly searchTerm = signal<string>("");

  // Signals computadas - estadísticas
  readonly totalProducts = computed(() => this.products().length);
  readonly totalStockValue = computed(() =>
    this.products().reduce((sum, p) => sum + p.stockQuantity * p.unitCost, 0)
  );
  readonly lowStockProducts = computed(() =>
    this.products().filter((p) => p.stockQuantity <= p.minStockLevel)
  );
  readonly averageUtilization = computed(() => {
    const cats = this.categories();
    if (cats.length === 0) return 0;
    return (
      cats.reduce((sum, c) => sum + c.averageUtilizationRate, 0) / cats.length
    );
  });

  // Productos filtrados
  readonly filteredProducts = computed(() => {
    let filtered = this.products();

    // Filtro por categoría
    const category = this.selectedCategory();
    if (category !== "all") {
      filtered = filtered.filter((p) => p.category === category);
    }

    // Filtro por condición
    const condition = this.selectedCondition();
    if (condition !== "all") {
      filtered = filtered.filter((p) => p.condition === condition);
    }

    // Filtro por nivel de stock
    const stockLevel = this.selectedStockLevel();
    if (stockLevel === "low") {
      filtered = filtered.filter((p) => p.stockQuantity <= p.minStockLevel);
    } else if (stockLevel === "ok") {
      filtered = filtered.filter(
        (p) =>
          p.stockQuantity > p.minStockLevel &&
          p.stockQuantity <= p.maxStockLevel
      );
    } else if (stockLevel === "overstocked") {
      filtered = filtered.filter((p) => p.stockQuantity > p.maxStockLevel);
    }

    // Filtro por búsqueda
    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.brand.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  // Top 5 productos más rotativos
  readonly topRotationProducts = computed(() =>
    [...this.products()]
      .sort((a, b) => b.totalRentals - a.totalRentals)
      .slice(0, 5)
  );

  // Movimientos recientes (últimos 10)
  readonly recentMovements = computed(() =>
    [...this.movements()]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10)
  );

  ngOnInit(): void {
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      const [productsData, movementsData, categoriesData] = await Promise.all([
        fetch("/assets/mocks/admin/inventory-products.json").then((r) =>
          r.json()
        ),
        fetch("/assets/mocks/admin/inventory-movements.json").then((r) =>
          r.json()
        ),
        fetch("/assets/mocks/admin/inventory-categories.json").then((r) =>
          r.json()
        ),
      ]);

      this.products.set(productsData);
      this.movements.set(movementsData);
      this.categories.set(categoriesData);
    } catch (error) {
      console.error("Error loading inventory data:", error);
    }
  }

  // Métodos de utilidad
  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      ski: "⛷️",
      snowboard: "🏂",
      boots: "🥾",
      helmet: "🪖",
      poles: "🎿",
      clothing: "🧥",
    };
    return icons[category] || "📦";
  }

  getConditionClass(condition: string): string {
    const classes: Record<string, string> = {
      new: "bg-green-50 border-green-200 text-green-700",
      excellent: "bg-blue-50 border-blue-200 text-blue-700",
      good: "bg-yellow-50 border-yellow-200 text-yellow-700",
      fair: "bg-orange-50 border-orange-200 text-orange-700",
      retired: "bg-red-50 border-red-200 text-red-700",
    };
    return classes[condition] || "bg-gray-50 border-gray-200 text-gray-700";
  }

  getConditionLabel(condition: string): string {
    const labels: Record<string, string> = {
      new: "Nuevo",
      excellent: "Excelente",
      good: "Bueno",
      fair: "Regular",
      retired: "Retirado",
    };
    return labels[condition] || condition;
  }

  getStockLevelClass(product: InventoryProduct): string {
    if (product.stockQuantity <= product.minStockLevel) {
      return "bg-red-50 border-red-300 text-red-700";
    } else if (product.stockQuantity > product.maxStockLevel) {
      return "bg-orange-50 border-orange-300 text-orange-700";
    } else {
      return "bg-green-50 border-green-200 text-green-700";
    }
  }

  getStockLevelLabel(product: InventoryProduct): string {
    if (product.stockQuantity <= product.minStockLevel) {
      return "Stock Bajo";
    } else if (product.stockQuantity > product.maxStockLevel) {
      return "Sobrestock";
    } else {
      return "Stock OK";
    }
  }

  getMovementTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      purchase: "📦",
      rental: "🎿",
      return: "↩️",
      transfer: "🔄",
      maintenance: "🔧",
      disposal: "🗑️",
    };
    return icons[type] || "📋";
  }

  getMovementTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      purchase: "Compra",
      rental: "Alquiler",
      return: "Devolución",
      transfer: "Transferencia",
      maintenance: "Mantenimiento",
      disposal: "Baja",
    };
    return labels[type] || type;
  }

  getMovementTypeClass(type: string): string {
    const classes: Record<string, string> = {
      purchase: "bg-green-50 border-green-200 text-green-700",
      rental: "bg-blue-50 border-blue-200 text-blue-700",
      return: "bg-indigo-50 border-indigo-200 text-indigo-700",
      transfer: "bg-purple-50 border-purple-200 text-purple-700",
      maintenance: "bg-yellow-50 border-yellow-200 text-yellow-700",
      disposal: "bg-red-50 border-red-200 text-red-700",
    };
    return classes[type] || "bg-gray-50 border-gray-200 text-gray-700";
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // Métodos de acción (placeholders para futuras implementaciones)
  addProduct(): void {
    console.log("Añadir nuevo producto");
  }

  editProduct(productId: string): void {
    console.log("Editar producto:", productId);
  }

  registerMovement(): void {
    console.log("Registrar movimiento de inventario");
  }

  viewProductHistory(productId: string): void {
    console.log("Ver historial del producto:", productId);
  }

  generateReport(): void {
    console.log("Generar informe de inventario");
  }

  exportInventory(): void {
    console.log("Exportar inventario a Excel");
  }
}
