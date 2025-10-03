/**
 * Profile Tab Component - Enhanced with More Features
 * Avatar, stats, skills, social links, achievements
 */

import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  viewChild,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import type {
  UserProfile,
  UpdateProfileRequest,
  SkillLevel,
} from "../../models/account.models";
import { AccountService } from "../../services/account.service";

@Component({
  selector: "app-profile-tab",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: "./profile-tab.html",
  styleUrl: "./profile-tab.css",
})
export class ProfileTabComponent {
  private readonly accountService = inject(AccountService);

  // ViewChild for file inputs
  readonly bannerInput = viewChild<ElementRef<HTMLInputElement>>("bannerInput");
  readonly avatarInput = viewChild<ElementRef<HTMLInputElement>>("avatarInput");

  // Inputs
  readonly user = input<UserProfile>();

  // Outputs
  readonly profileUpdated = output<UpdateProfileRequest>();

  // Local state
  readonly isEditing = signal(false);
  readonly isSaving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Image URLs
  readonly bannerUrl = signal<string | null>(null);
  readonly avatarUrl = signal<string | null>(null);

  // Active section (for accordion)
  readonly activeSection = signal<string | null>("profile");

  // Form data
  readonly formData = signal<UpdateProfileRequest>({
    name: "",
    email: "",
    phone: "",
    bio: "",
    location: "",
    birthDate: "",
  });

  // Skills data
  readonly skillLevel = signal<SkillLevel>("beginner");
  readonly skiDays = signal<number>(0);
  readonly favoriteStyle = signal<string>("all-mountain");

  // Social links
  readonly instagram = signal<string>("");
  readonly twitter = signal<string>("");
  readonly strava = signal<string>("");

  // Computed
  readonly age = computed(() => {
    const birthDate = this.user()?.birthDate;
    if (!birthDate) return null;
    return this.calculateAge(birthDate);
  });

  readonly memberYears = computed(() => {
    const memberSince = this.user()?.memberSince;
    if (!memberSince) return 0;
    const years =
      new Date().getFullYear() - new Date(memberSince).getFullYear();
    return years;
  });

  readonly totalFriends = computed(() => {
    return this.accountService.totalFriends();
  });

  readonly totalGroups = computed(() => {
    return this.accountService.totalGroups();
  });

  constructor() {
    // Initialize formData with user data when available
    const userData = this.user();
    if (userData) {
      this.formData.set({
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        bio: userData.bio,
        location: userData.location,
        birthDate: userData.birthDate,
      });
    }
  }

  // ========== EDITING METHODS ==========

  startEditing(): void {
    const userData = this.user();
    if (!userData) return;

    this.isEditing.set(true);
    this.formData.set({
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      bio: userData.bio,
      location: userData.location,
      birthDate: userData.birthDate,
    });
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  async saveProfile(): Promise<void> {
    this.isSaving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const updates = this.formData();
      const response = await this.accountService.updateUserProfile(updates);

      if (response.success) {
        this.successMessage.set(
          response.message || "Perfil actualizado correctamente"
        );
        this.profileUpdated.emit(updates);
        this.isEditing.set(false);

        setTimeout(() => this.successMessage.set(null), 3000);
      } else {
        this.errorMessage.set(
          response.message || "Error al actualizar el perfil"
        );
      }
    } catch (error) {
      this.errorMessage.set("Error inesperado al guardar los cambios");
      console.error("Error saving profile:", error);
    } finally {
      this.isSaving.set(false);
    }
  }

  updateFormField<K extends keyof UpdateProfileRequest>(
    field: K,
    value: UpdateProfileRequest[K]
  ): void {
    this.formData.update((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // ========== IMAGE UPLOAD METHODS ==========

  triggerBannerUpload(): void {
    const input = this.bannerInput();
    if (input?.nativeElement) {
      input.nativeElement.click();
    }
  }

  triggerAvatarUpload(): void {
    const input = this.avatarInput();
    if (input?.nativeElement) {
      input.nativeElement.click();
    }
  }

  onBannerChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      this.errorMessage.set("Por favor, selecciona una imagen válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set("La imagen no debe superar los 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.bannerUrl.set(result);
      this.successMessage.set("Banner actualizado");
      setTimeout(() => this.successMessage.set(null), 3000);
    };
    reader.readAsDataURL(file);

    console.log("📤 Banner file ready for upload:", file.name);
  }

  onAvatarChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      this.errorMessage.set("Por favor, selecciona una imagen válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage.set("La imagen no debe superar los 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      this.avatarUrl.set(result);
      this.successMessage.set("Foto de perfil actualizada");
      setTimeout(() => this.successMessage.set(null), 3000);
    };
    reader.readAsDataURL(file);

    console.log("📤 Avatar file ready for upload:", file.name);
  }

  // ========== SECTION TOGGLE ==========

  toggleSection(section: string): void {
    if (this.activeSection() === section) {
      this.activeSection.set(null);
    } else {
      this.activeSection.set(section);
    }
  }

  // ========== UTILITY METHODS ==========

  calculateAge(birthDate: string): number {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  }

  formatMemberSince(dateString: string | undefined): string {
    if (!dateString) return "-";

    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return "-";

    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  getSkillLevelLabel(level: SkillLevel): string {
    const labels: Record<SkillLevel, string> = {
      beginner: "Principiante",
      intermediate: "Intermedio",
      advanced: "Avanzado",
      expert: "Experto",
    };
    return labels[level];
  }

  getSkillLevelIcon(level: SkillLevel): string {
    const icons: Record<SkillLevel, string> = {
      beginner: "🌱",
      intermediate: "⛷️",
      advanced: "🏔️",
      expert: "🏆",
    };
    return icons[level];
  }
}
