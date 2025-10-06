import { Component, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";

// ========================================
// INTERFACES
// ========================================

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  priority: "low" | "medium" | "high" | "urgent";
  status:
    | "new"
    | "assigned"
    | "in_progress"
    | "waiting_customer"
    | "resolved"
    | "closed";
  category: "booking" | "payment" | "technical" | "general" | "complaint";
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  responseTime?: number; // minutos
  resolutionTime?: number; // horas
  satisfaction?: number; // 1-5
  tags?: string[];
  messagesCount: number;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  sender: "customer" | "agent";
  senderName: string;
  message: string;
  timestamp: string;
  attachments?: string[];
  isInternal?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: "available" | "busy" | "offline";
  specialties: string[];
  activeTickets: number;
  resolvedToday: number;
  avgResponseTime: number; // minutos
  avgSatisfaction: number; // 1-5
}

export interface SLAMetrics {
  firstResponseTime: {
    target: number; // minutos
    current: number;
    compliance: number; // %
  };
  resolutionTime: {
    target: number; // horas
    current: number;
    compliance: number; // %
  };
  customerSatisfaction: {
    target: number; // 1-5
    current: number;
    compliance: number; // %
  };
}

export interface SupportStats {
  totalTickets: number;
  newTickets: number;
  assignedTickets: number;
  inProgressTickets: number;
  resolvedToday: number;
  avgResponseTime: number; // minutos
  avgResolutionTime: number; // horas
  avgSatisfaction: number; // 1-5
  slaCompliance: number; // %
}

// ========================================
// COMPONENT
// ========================================

@Component({
  selector: "app-admin-support",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-support.component.html",
  styleUrl: "./admin-support.component.css",
})
export class AdminSupportComponent implements OnInit {
  // Math para uso en template
  protected readonly Math = Math;

  // Data Signals
  tickets = signal<Ticket[]>([]);
  agents = signal<Agent[]>([]);
  slaMetrics = signal<SLAMetrics | null>(null);
  stats = signal<SupportStats>({
    totalTickets: 0,
    newTickets: 0,
    assignedTickets: 0,
    inProgressTickets: 0,
    resolvedToday: 0,
    avgResponseTime: 0,
    avgResolutionTime: 0,
    avgSatisfaction: 0,
    slaCompliance: 0,
  });
  isLoading = signal(true);
  error = signal<string | null>(null);

  // Filter Signals
  selectedStatus = signal<
    | "all"
    | "new"
    | "assigned"
    | "in_progress"
    | "waiting_customer"
    | "resolved"
    | "closed"
  >("all");
  selectedPriority = signal<"all" | "low" | "medium" | "high" | "urgent">(
    "all"
  );
  selectedCategory = signal<
    "all" | "booking" | "payment" | "technical" | "general" | "complaint"
  >("all");
  selectedAgent = signal<string>("all");
  searchTerm = signal("");

  // Computed Values
  filteredTickets = computed(() => {
    let filtered = this.tickets();

    if (this.selectedStatus() !== "all") {
      filtered = filtered.filter((t) => t.status === this.selectedStatus());
    }

    if (this.selectedPriority() !== "all") {
      filtered = filtered.filter((t) => t.priority === this.selectedPriority());
    }

    if (this.selectedCategory() !== "all") {
      filtered = filtered.filter((t) => t.category === this.selectedCategory());
    }

    if (this.selectedAgent() !== "all") {
      filtered = filtered.filter((t) => t.assignedTo === this.selectedAgent());
    }

    const search = this.searchTerm().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.subject.toLowerCase().includes(search) ||
          t.customerName.toLowerCase().includes(search) ||
          t.ticketNumber.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  newTickets = computed(
    () => this.tickets().filter((t) => t.status === "new").length
  );
  assignedTickets = computed(
    () => this.tickets().filter((t) => t.status === "assigned").length
  );
  inProgressTickets = computed(
    () => this.tickets().filter((t) => t.status === "in_progress").length
  );
  urgentTickets = computed(
    () => this.tickets().filter((t) => t.priority === "urgent").length
  );

  availableAgents = computed(() =>
    this.agents().filter((a) => a.status === "available")
  );
  busyAgents = computed(() => this.agents().filter((a) => a.status === "busy"));

  slaFirstResponseCompliance = computed(
    () => this.slaMetrics()?.firstResponseTime.compliance || 0
  );
  slaResolutionCompliance = computed(
    () => this.slaMetrics()?.resolutionTime.compliance || 0
  );
  slaSatisfactionCompliance = computed(
    () => this.slaMetrics()?.customerSatisfaction.compliance || 0
  );

  // ========================================
  // LIFECYCLE
  // ========================================

  ngOnInit(): void {
    this.loadSupportData();
  }

  async loadSupportData(): Promise<void> {
    try {
      this.isLoading.set(true);

      // Parallel fetch
      const [ticketsData, agentsData, slaData] = await Promise.all([
        fetch("/assets/mocks/admin/support-tickets.json").then((r) => r.json()),
        fetch("/assets/mocks/admin/support-agents.json").then((r) => r.json()),
        fetch("/assets/mocks/admin/support-sla.json").then((r) => r.json()),
      ]);

      this.tickets.set(ticketsData.tickets || []);
      this.agents.set(agentsData.agents || []);
      this.slaMetrics.set(slaData.metrics || null);
      this.stats.set(ticketsData.stats || this.stats());
    } catch (err) {
      this.error.set(
        "Error cargando datos de soporte: " + (err as Error).message
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  // ========================================
  // ACTIONS - Tickets
  // ========================================

  createTicket(): void {
    console.log("Crear nuevo ticket");
  }

  viewTicket(id: string): void {
    console.log("Ver ticket", id);
  }

  assignTicket(id: string, agentId: string): void {
    console.log("Asignar ticket", id, "a agente", agentId);
  }

  updateTicketStatus(id: string, status: Ticket["status"]): void {
    console.log("Actualizar estado ticket", id, "a", status);
  }

  updateTicketPriority(id: string, priority: Ticket["priority"]): void {
    console.log("Actualizar prioridad ticket", id, "a", priority);
  }

  resolveTicket(id: string): void {
    console.log("Resolver ticket", id);
  }

  closeTicket(id: string): void {
    console.log("Cerrar ticket", id);
  }

  deleteTicket(id: string): void {
    console.log("Eliminar ticket", id);
  }

  // ========================================
  // ACTIONS - Agents
  // ========================================

  viewAgentProfile(id: string): void {
    console.log("Ver perfil de agente", id);
  }

  assignTicketsToAgent(agentId: string): void {
    console.log("Auto-asignar tickets a agente", agentId);
  }

  // ========================================
  // ACTIONS - Reports
  // ========================================

  exportTicketsReport(): void {
    console.log("Exportar informe de tickets");
  }

  exportSLAReport(): void {
    console.log("Exportar informe SLA");
  }

  exportAgentPerformance(): void {
    console.log("Exportar rendimiento de agentes");
  }

  // ========================================
  // HELPERS
  // ========================================

  getStatusLabel(status: Ticket["status"]): string {
    const labels: Record<Ticket["status"], string> = {
      new: "Nuevo",
      assigned: "Asignado",
      in_progress: "En Progreso",
      waiting_customer: "Esperando Cliente",
      resolved: "Resuelto",
      closed: "Cerrado",
    };
    return labels[status];
  }

  getStatusClass(status: Ticket["status"]): string {
    return `status-${status.replace("_", "-")}`;
  }

  getPriorityLabel(priority: Ticket["priority"]): string {
    const labels: Record<Ticket["priority"], string> = {
      low: "Baja",
      medium: "Media",
      high: "Alta",
      urgent: "Urgente",
    };
    return labels[priority];
  }

  getPriorityClass(priority: Ticket["priority"]): string {
    return `priority-${priority}`;
  }

  getCategoryLabel(category: Ticket["category"]): string {
    const labels: Record<Ticket["category"], string> = {
      booking: "Reservas",
      payment: "Pagos",
      technical: "Técnico",
      general: "General",
      complaint: "Queja",
    };
    return labels[category];
  }

  getCategoryIcon(category: Ticket["category"]): string {
    const icons: Record<Ticket["category"], string> = {
      booking: "📅",
      payment: "💳",
      technical: "🔧",
      general: "❓",
      complaint: "😠",
    };
    return icons[category];
  }

  getAgentStatusLabel(status: Agent["status"]): string {
    const labels: Record<Agent["status"], string> = {
      available: "Disponible",
      busy: "Ocupado",
      offline: "Desconectado",
    };
    return labels[status];
  }

  getAgentStatusClass(status: Agent["status"]): string {
    return `agent-status-${status}`;
  }

  formatTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  formatHours(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    return `${hours.toFixed(1)}h`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  formatDateShort(date: string): string {
    return new Date(date).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
  }

  getSatisfactionStars(rating: number): string {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  }

  getSatisfactionClass(rating: number): string {
    if (rating >= 4) return "satisfaction-excellent";
    if (rating >= 3) return "satisfaction-good";
    if (rating >= 2) return "satisfaction-fair";
    return "satisfaction-poor";
  }

  getComplianceClass(compliance: number): string {
    if (compliance >= 90) return "compliance-excellent";
    if (compliance >= 75) return "compliance-good";
    if (compliance >= 60) return "compliance-fair";
    return "compliance-poor";
  }
}
