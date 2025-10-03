import { Component, input, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import type {
  Preferences,
  SkillLevel,
  EquipmentType,
} from "../../models/account.models";
import { AccountService } from "../../services/account.service";

@Component({
  selector: "app-preferences-tab",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./preferences-tab.html",
  styleUrls: ["./preferences-tab.css"],
})
export class PreferencesTabComponent {
  private readonly accountService = inject(AccountService);

  readonly preferences = input<Preferences>();

  readonly isSaving = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly newStationName = signal("");

  async updateSkillLevel(level: SkillLevel): Promise<void> {
    await this.savePreferences({ skillLevel: level });
  }

  async updateEquipment(equipment: EquipmentType): Promise<void> {
    await this.savePreferences({ equipment });
  }

  async toggleNotification(
    type: "email" | "sms" | "push",
    value: boolean
  ): Promise<void> {
    const prefs = this.preferences();
    if (!prefs) return;
    await this.savePreferences({
      notifications: {
        ...prefs.notifications,
        [type]: value,
      },
    });
  }

  async toggleNotificationCategory(
    category: keyof Preferences["notifications"]["categories"],
    value: boolean
  ): Promise<void> {
    const prefs = this.preferences();
    if (!prefs) return;
    await this.savePreferences({
      notifications: {
        ...prefs.notifications,
        categories: {
          ...prefs.notifications.categories,
          [category]: value,
        },
      },
    });
  }

  async removeFavoriteStation(station: string): Promise<void> {
    const response = await this.accountService.removeFavoriteStation(station);
    if (response.success) {
      this.showSuccess("Estación eliminada de favoritos");
    } else {
      this.showError(response.message || "Error al eliminar estación");
    }
  }

  async addFavoriteStation(): Promise<void> {
    const stationName = this.newStationName().trim();
    if (!stationName) return;

    const response = await this.accountService.addFavoriteStation(stationName);
    if (response.success) {
      this.showSuccess("Estación añadida a favoritos");
      this.newStationName.set("");
    } else {
      this.showError(response.message || "Error al añadir estación");
    }
  }

  private async savePreferences(updates: Partial<Preferences>): Promise<void> {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const response = await this.accountService.updatePreferences(updates);
      if (response.success) {
        this.showSuccess("Preferencias guardadas");
      } else {
        this.showError(response.message || "Error al guardar");
      }
    } catch {
      this.showError("Error inesperado");
    } finally {
      this.isSaving.set(false);
    }
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(null), 5000);
  }
}
