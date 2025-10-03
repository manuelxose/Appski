import { Component, input, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import type { Session } from "../../models/account.models";
import { AccountService } from "../../services/account.service";

@Component({
  selector: "app-security-tab",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./security-tab.html",
  styleUrls: ["./security-tab.css"],
})
export class SecurityTabComponent {
  private readonly accountService = inject(AccountService);

  readonly sessions = input<Session[]>();

  readonly isChangingPassword = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);

  readonly passwordForm = signal({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  async changePassword(): Promise<void> {
    const form = this.passwordForm();

    // Validaciones básicas
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      this.showError("Por favor, completa todos los campos");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      this.showError("Las contraseñas no coinciden");
      return;
    }

    if (form.newPassword.length < 8) {
      this.showError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    this.isChangingPassword.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const response = await this.accountService.changePassword(form);

      if (response.success) {
        this.showSuccess("Contraseña actualizada correctamente");
        this.resetPasswordForm();
      } else {
        this.showError(response.message || "Error al cambiar la contraseña");
      }
    } catch (error) {
      this.showError("Error inesperado");
      console.error("Error changing password:", error);
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  async revokeSession(sessionId: string): Promise<void> {
    const confirmed = confirm("¿Deseas cerrar esta sesión?");
    if (!confirmed) return;

    try {
      const response = await this.accountService.revokeSession(sessionId);

      if (response.success) {
        this.showSuccess(response.message || "Sesión cerrada correctamente");
      } else {
        this.showError(response.message || "Error al cerrar la sesión");
      }
    } catch (error) {
      this.showError("Error inesperado");
      console.error("Error revoking session:", error);
    }
  }

  async logout(): Promise<void> {
    const confirmed = confirm("¿Estás seguro de que deseas cerrar sesión?");
    if (!confirmed) return;

    await this.accountService.logout();
  }

  updatePasswordField(
    field: "currentPassword" | "newPassword" | "confirmPassword",
    value: string
  ): void {
    this.passwordForm.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  private resetPasswordForm(): void {
    this.passwordForm.set({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    setTimeout(() => this.errorMessage.set(null), 5000);
  }

  getDeviceIcon(device: string): string {
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes("mobile") || deviceLower.includes("phone"))
      return "📱";
    if (deviceLower.includes("tablet")) return "📱";
    return "💻";
  }

  formatLastActive(lastActive: string): string {
    const date = new Date(lastActive);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} días`;
  }
}
