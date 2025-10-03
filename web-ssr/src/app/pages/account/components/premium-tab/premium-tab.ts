import { Component, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import type {
  PremiumSubscription,
  SubscriptionPlanInfo,
} from "../../models/account.models";
import { AccountService } from "../../services/account.service";

@Component({
  selector: "app-premium-tab",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./premium-tab.html",
  styleUrls: ["./premium-tab.css"],
})
export class PremiumTabComponent {
  private readonly accountService = inject(AccountService);

  // State from service (combined subscription + plans + invoices)
  readonly premiumData = this.accountService.premiumSubscriptionData;
  readonly isLoading = this.accountService.isLoadingPremium;

  // Local state
  readonly successMessage = signal<string | null>(null);

  // Helper methods
  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      active: "active",
      cancelled: "cancelled",
      expired: "cancelled",
      pending: "pending",
    };
    return classes[status] || "";
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      active: "Activa",
      cancelled: "Cancelada",
      expired: "Expirada",
      pending: "Pendiente",
    };
    return labels[status] || status;
  }

  getPlanName(plan: string): string {
    const names: Record<string, string> = {
      free: "Gratis",
      basic: "Básico",
      premium: "Premium",
      pro: "Pro",
    };
    return names[plan] || plan;
  }

  getBillingCycleLabel(cycle: string): string {
    const labels: Record<string, string> = {
      monthly: "mes",
      yearly: "año",
      weekly: "semana",
    };
    return labels[cycle] || cycle;
  }

  getCardIcon(brand: string | undefined): string {
    if (!brand) return "💳";
    const icons: Record<string, string> = {
      Visa: "💳",
      Mastercard: "💳",
      "American Express": "💳",
      Discover: "💳",
    };
    return icons[brand] || "💳";
  }

  getInvoiceStatusClass(status: string): string {
    const classes: Record<string, string> = {
      paid: "paid",
      pending: "pending",
      overdue: "overdue",
      cancelled: "cancelled",
    };
    return classes[status] || "";
  }

  getInvoiceStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      paid: "Pagada",
      pending: "Pendiente",
      overdue: "Vencida",
      cancelled: "Cancelada",
    };
    return labels[status] || status;
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  isPlanCurrent(
    plan: SubscriptionPlanInfo,
    currentSubscription: PremiumSubscription
  ): boolean {
    return (
      plan.plan === currentSubscription.plan &&
      plan.billingCycle === currentSubscription.billingCycle
    );
  }

  isUpgrade(
    plan: SubscriptionPlanInfo,
    currentSubscription: PremiumSubscription
  ): boolean {
    const planHierarchy: Record<string, number> = {
      free: 0,
      basic: 1,
      premium: 2,
      pro: 3,
    };

    return planHierarchy[plan.plan] > planHierarchy[currentSubscription.plan];
  }

  isDowngrade(
    plan: SubscriptionPlanInfo,
    currentSubscription: PremiumSubscription
  ): boolean {
    const planHierarchy: Record<string, number> = {
      free: 0,
      basic: 1,
      premium: 2,
      pro: 3,
    };

    return planHierarchy[plan.plan] < planHierarchy[currentSubscription.plan];
  }

  // Actions
  async toggleAutoRenew(): Promise<void> {
    const currentData = this.premiumData();
    if (!currentData || !currentData.subscription) return;

    const newValue = !currentData.subscription.autoRenew;

    try {
      const response = await this.accountService.updateAutoRenew(newValue);
      if (response.success) {
        this.showSuccess(
          newValue
            ? "Renovación automática activada"
            : "Renovación automática desactivada"
        );
      } else {
        console.error("Error updating auto-renew:", response.message);
      }
    } catch (error) {
      console.error("Error toggling auto-renew:", error);
    }
  }

  async changePlan(plan: string, billingCycle: string): Promise<void> {
    try {
      const response = await this.accountService.changePlan(plan, billingCycle);
      if (response.success) {
        this.showSuccess(
          `Plan cambiado a ${this.getPlanName(
            plan
          )}. Los cambios se aplicarán en la próxima facturación.`
        );
      } else {
        console.error("Error changing plan:", response.message);
      }
    } catch (error) {
      console.error("Error changing plan:", error);
    }
  }

  async updatePaymentMethod(): Promise<void> {
    // En producción, esto abriría un modal o redirigiría a la página de pago
    this.showSuccess(
      "Redirigiendo a la página de actualización de método de pago..."
    );
    console.log("Update payment method clicked");
  }

  async cancelSubscription(): Promise<void> {
    if (
      !confirm(
        "¿Estás seguro de que quieres cancelar tu suscripción? Perderás acceso a todas las características premium."
      )
    ) {
      return;
    }

    try {
      const response = await this.accountService.cancelSubscription();
      if (response.success) {
        this.showSuccess(
          "Suscripción cancelada. Mantendrás el acceso hasta el final del período actual."
        );
      } else {
        console.error("Error cancelling subscription:", response.message);
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
    }
  }

  async downloadInvoice(invoiceId: string): Promise<void> {
    try {
      const response = await this.accountService.downloadInvoice(invoiceId);
      if (response.success) {
        // En producción, esto descargaría el PDF
        this.showSuccess("Descargando factura...");
        console.log("Download invoice:", invoiceId);
      } else {
        console.error("Error downloading invoice:", response.message);
      }
    } catch (error) {
      console.error("Error downloading invoice:", error);
    }
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}
