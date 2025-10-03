import { Component, signal } from "@angular/core";
import { CommonModule } from "@angular/common";

interface EquipmentItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  available: number;
  pricePerDay: number;
  condition: "excellent" | "good" | "fair";
  image: string;
  brand: string;
}

interface Booking {
  id: number;
  customerName: string;
  equipment: string;
  startDate: string;
  endDate: string;
  status: "pending" | "confirmed" | "active" | "completed" | "cancelled";
  totalPrice: number;
}

interface ShopStats {
  totalRevenue: number;
  activeBookings: number;
  totalEquipment: number;
  averageRating: number;
  pendingOrders: number;
  utilizationRate: number;
}

@Component({
  selector: "app-shop-owner-dashboard",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./shop-owner-dashboard.component.html",
  styleUrls: ["./shop-owner-dashboard.component.css"],
})
export class ShopOwnerDashboardComponent {
  activeTab = signal<"inventory" | "bookings" | "stats">("inventory");

  // Mock stats
  stats = signal<ShopStats>({
    totalRevenue: 15420,
    activeBookings: 12,
    totalEquipment: 45,
    averageRating: 4.8,
    pendingOrders: 3,
    utilizationRate: 68,
  });

  // Mock inventory
  inventory = signal<EquipmentItem[]>([
    {
      id: 1,
      name: "Rossignol Hero Elite Plus",
      category: "Esquís",
      quantity: 10,
      available: 7,
      pricePerDay: 35,
      condition: "excellent",
      image: "https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400",
      brand: "Rossignol",
    },
    {
      id: 2,
      name: "Burton Custom X",
      category: "Snowboard",
      quantity: 8,
      available: 5,
      pricePerDay: 40,
      condition: "excellent",
      image:
        "https://images.unsplash.com/photo-1519315657929-88e1ffad1e88?w=400",
      brand: "Burton",
    },
    {
      id: 3,
      name: "Atomic Redster Pro",
      category: "Esquís",
      quantity: 6,
      available: 2,
      pricePerDay: 45,
      condition: "good",
      image: "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=400",
      brand: "Atomic",
    },
    {
      id: 4,
      name: "TSG Arctic Nipper Maxi",
      category: "Cascos",
      quantity: 15,
      available: 12,
      pricePerDay: 8,
      condition: "excellent",
      image:
        "https://images.unsplash.com/photo-1608632449155-a9d5a6c3bfad?w=400",
      brand: "TSG",
    },
    {
      id: 5,
      name: "Salomon QST 106",
      category: "Esquís",
      quantity: 5,
      available: 0,
      pricePerDay: 50,
      condition: "excellent",
      image:
        "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=400",
      brand: "Salomon",
    },
  ]);

  // Mock bookings
  bookings = signal<Booking[]>([
    {
      id: 1001,
      customerName: "Ana García",
      equipment: "Rossignol Hero Elite Plus",
      startDate: "2024-01-15",
      endDate: "2024-01-20",
      status: "active",
      totalPrice: 175,
    },
    {
      id: 1002,
      customerName: "Carlos Ruiz",
      equipment: "Burton Custom X",
      startDate: "2024-01-16",
      endDate: "2024-01-18",
      status: "pending",
      totalPrice: 80,
    },
    {
      id: 1003,
      customerName: "María López",
      equipment: "Atomic Redster Pro",
      startDate: "2024-01-14",
      endDate: "2024-01-21",
      status: "confirmed",
      totalPrice: 315,
    },
    {
      id: 1004,
      customerName: "Juan Martínez",
      equipment: "TSG Arctic Nipper Maxi",
      startDate: "2024-01-12",
      endDate: "2024-01-15",
      status: "completed",
      totalPrice: 24,
    },
    {
      id: 1005,
      customerName: "Laura Sánchez",
      equipment: "Salomon QST 106",
      startDate: "2024-01-17",
      endDate: "2024-01-22",
      status: "confirmed",
      totalPrice: 250,
    },
  ]);

  setActiveTab(tab: "inventory" | "bookings" | "stats") {
    this.activeTab.set(tab);
  }

  getConditionColor(condition: string): string {
    switch (condition) {
      case "excellent":
        return "var(--success-500)";
      case "good":
        return "var(--info-500)";
      case "fair":
        return "var(--warning-500)";
      default:
        return "var(--neutral-500)";
    }
  }

  getConditionText(condition: string): string {
    switch (condition) {
      case "excellent":
        return "Excelente";
      case "good":
        return "Bueno";
      case "fair":
        return "Aceptable";
      default:
        return "Desconocido";
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case "active":
        return "var(--success-500)";
      case "confirmed":
        return "var(--info-500)";
      case "pending":
        return "var(--warning-500)";
      case "completed":
        return "var(--neutral-500)";
      case "cancelled":
        return "var(--error-500)";
      default:
        return "var(--neutral-500)";
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case "active":
        return "En curso";
      case "confirmed":
        return "Confirmado";
      case "pending":
        return "Pendiente";
      case "completed":
        return "Completado";
      case "cancelled":
        return "Cancelado";
      default:
        return "Desconocido";
    }
  }

  getAvailabilityPercentage(item: EquipmentItem): number {
    return (item.available / item.quantity) * 100;
  }
}
