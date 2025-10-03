import { Component, signal, computed, inject, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { PlannerFormComponent } from "./components/planner-form/planner-form.component";
import { TripSummaryComponent } from "./components/trip-summary/trip-summary.component";
import { PlannerDataService } from "./services/planner.data.service";
import {
  TripPlanData,
  SavedPlan,
  PlannerStep,
  PlannerPageData,
} from "./models/planner.models";

@Component({
  selector: "app-planner",
  templateUrl: "./planner.html",
  styleUrls: ["./planner.css"],
  standalone: true,
  imports: [
    CommonModule,
    SiteHeaderComponent,
    SiteFooterComponent,
    PlannerFormComponent,
    TripSummaryComponent,
  ],
})
export class Planner implements OnInit {
  private readonly dataService = inject(PlannerDataService);

  // State
  currentStep = signal<PlannerStep>("form");
  tripPlan = signal<TripPlanData | null>(null);
  savedPlans = signal<SavedPlan[]>([]);
  showSavedPlans = signal(false);
  shareSuccess = signal(false);
  exportSuccess = signal(false);
  showBookingModal = signal(false);

  // Data inicial (aunque planner-form tiene sus propios datos hardcoded)
  pageData = signal<PlannerPageData | null>(null);

  async ngOnInit(): Promise<void> {
    // Cargar datos iniciales del servicio
    try {
      const data = await this.dataService.loadInitialData();
      this.pageData.set(data);
    } catch (error) {
      console.error("Error loading planner data:", error);
    }

    // Cargar planes guardados desde localStorage (solo en browser)
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      const plans = this.dataService.loadSavedPlansFromStorage();
      this.savedPlans.set(plans);
    }
  }

  // Computed
  hasPlans = computed(() => this.savedPlans().length > 0);
  planProgress = computed(() => {
    const step = this.currentStep();
    if (step === "form") return 33;
    if (step === "review") return 66;
    return 100;
  });

  onPlanSubmitted(plan: TripPlanData): void {
    this.tripPlan.set(plan);
    this.currentStep.set("review");
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  goToSummary(): void {
    this.currentStep.set("summary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  editPlan(): void {
    this.currentStep.set("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  resetPlanner(): void {
    this.tripPlan.set(null);
    this.currentStep.set("form");
    this.shareSuccess.set(false);
    this.exportSuccess.set(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  savePlan(): void {
    const plan = this.tripPlan();
    if (!plan) return;

    const savedPlan: SavedPlan = {
      ...plan,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      totalCost: this.calculateTotalCost(plan),
    };

    const plans = [...this.savedPlans(), savedPlan];
    this.savedPlans.set(plans);

    // Usar servicio para guardar en localStorage
    this.dataService.savePlansToStorage(plans);

    // Show success message
    alert("✅ Plan guardado correctamente");
  }

  loadSavedPlan(plan: SavedPlan): void {
    this.tripPlan.set(plan);
    this.currentStep.set("summary");
    this.showSavedPlans.set(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  deleteSavedPlan(id: string): void {
    const plans = this.savedPlans().filter((p) => p.id !== id);
    this.savedPlans.set(plans);

    // Usar servicio para guardar en localStorage
    this.dataService.savePlansToStorage(plans);
  }

  toggleSavedPlans(): void {
    this.showSavedPlans.set(!this.showSavedPlans());
  }

  exportPlan(): void {
    const plan = this.tripPlan();
    if (!plan) return;

    // Only available in browser
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // Create text summary
    const duration = this.calculateDuration(plan.startDate, plan.endDate);
    const totalCost = this.calculateTotalCost(plan);

    const summary = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎿 MI PLAN DE VIAJE A LA NIEVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Destino: ${plan.destination}
📅 Fechas: ${this.formatDate(plan.startDate)} - ${this.formatDate(plan.endDate)}
⏱️ Duración: ${duration} días

👥 Personas:
   • Adultos: ${plan.adults}
   • Niños: ${plan.children}

🏨 Alojamiento: ${this.getAccommodationLabel(plan.accommodationType)}
⛷️ Nivel: ${this.getSkillLabel(plan.skillLevel)}
💰 Presupuesto: ${plan.budget}€
💵 Coste estimado: ${totalCost}€

🎯 Actividades seleccionadas:
${plan.activities.map((activity: string) => `   • ${activity}`).join("\n")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Creado con ❤️ en Nieve App
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;

    // Create downloadable file
    const blob = new Blob([summary], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-viaje-${plan.destination
      .toLowerCase()
      .replace(/\s/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.exportSuccess.set(true);
    setTimeout(() => this.exportSuccess.set(false), 3000);
  }

  sharePlan(): void {
    const plan = this.tripPlan();
    if (!plan) return;

    // Only available in browser
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const duration = this.calculateDuration(plan.startDate, plan.endDate);
    const shareText = `🎿 ¡Mi plan de viaje a ${
      plan.destination
    }!\n\n📅 ${this.formatDate(plan.startDate)} - ${this.formatDate(
      plan.endDate
    )} (${duration} días)\n👥 ${
      plan.adults + plan.children
    } personas\n💰 Presupuesto: ${
      plan.budget
    }€\n\n¡Organiza tu viaje perfecto en Nieve App!`;

    if (navigator.share) {
      navigator
        .share({
          title: `Mi Plan de Viaje - ${plan.destination}`,
          text: shareText,
          url: window.location.href,
        })
        .then(() => {
          this.shareSuccess.set(true);
          setTimeout(() => this.shareSuccess.set(false), 3000);
        })
        .catch((error) => console.log("Error sharing:", error));
    } else if (navigator.clipboard) {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText).then(() => {
        this.shareSuccess.set(true);
        setTimeout(() => this.shareSuccess.set(false), 3000);
      });
    }
  }

  calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  private calculateTotalCost(plan: TripPlanData): number {
    const duration = this.calculateDuration(plan.startDate, plan.endDate);
    const totalPeople = plan.adults + plan.children;

    const skiPassCost = duration * totalPeople * 45;
    const accommodationCost =
      duration *
      (plan.accommodationType === "hotel"
        ? 120
        : plan.accommodationType === "apartment"
        ? 80
        : 60) *
      Math.ceil(totalPeople / 2);
    const equipmentCost = duration * totalPeople * 25;
    const extrasCost = duration * totalPeople * 30;

    return skiPassCost + accommodationCost + equipmentCost + extrasCost;
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  private getAccommodationLabel(type: string): string {
    const labels: Record<string, string> = {
      hotel: "🏨 Hotel",
      apartment: "🏢 Apartamento",
      hostel: "🛏️ Hostal",
      rural: "🏡 Casa Rural",
    };
    return labels[type] || type;
  }

  private getSkillLabel(level: string): string {
    const labels: Record<string, string> = {
      beginner: "🌱 Principiante",
      intermediate: "⛷️ Intermedio",
      advanced: "🏂 Avanzado",
      expert: "🏔️ Experto",
    };
    return labels[level] || level;
  }
}
