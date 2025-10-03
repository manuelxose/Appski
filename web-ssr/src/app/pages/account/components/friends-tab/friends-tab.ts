import { Component, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import type {
  Friend,
  Group,
  FriendRequest,
  GroupInvitation,
  SkillLevel,
  GroupRole,
} from "../../models/account.models";
import { AccountService } from "../../services/account.service";

@Component({
  selector: "app-friends-tab",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./friends-tab.html",
  styleUrl: "./friends-tab.css",
})
export class FriendsTabComponent {
  readonly accountService = inject(AccountService);

  // Search state
  readonly searchQuery = signal<string>("");

  // Computed filtered friends
  readonly filteredFriends = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const friends = this.accountService.friends();

    if (!query) {
      return friends;
    }

    return friends.filter(
      (friend) =>
        friend.name.toLowerCase().includes(query) ||
        friend.location?.toLowerCase().includes(query) ||
        friend.favoriteStation?.toLowerCase().includes(query)
    );
  });

  // Search input handler
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  // Format time ago
  formatTimeAgo(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Hace un momento";
    if (diffMins < 60)
      return `Hace ${diffMins} minuto${diffMins > 1 ? "s" : ""}`;
    if (diffHours < 24)
      return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    if (diffDays < 30) return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;

    return this.formatDate(timestamp);
  }

  // Format date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  // Get skill level label
  getSkillLevelLabel(level: SkillLevel): string {
    const labels: Record<SkillLevel, string> = {
      beginner: "Principiante",
      intermediate: "Intermedio",
      advanced: "Avanzado",
      expert: "Experto",
    };
    return labels[level];
  }

  // Get role label
  getRoleLabel(role: GroupRole): string {
    const labels: Record<GroupRole, string> = {
      owner: "Propietario",
      admin: "Administrador",
      member: "Miembro",
    };
    return labels[role];
  }

  // ========== FRIEND REQUEST ACTIONS ==========

  async acceptFriendRequest(request: FriendRequest): Promise<void> {
    console.log("✅ Accepting friend request:", request.fromUserName);
    const response = await this.accountService.acceptFriendRequest(request.id);

    if (response.success) {
      alert(`¡Ahora eres amigo de ${request.fromUserName}!`);
    } else {
      alert(`Error: ${response.message}`);
    }
  }

  async rejectFriendRequest(request: FriendRequest): Promise<void> {
    const confirmed = confirm(
      `¿Rechazar solicitud de ${request.fromUserName}?`
    );

    if (!confirmed) return;

    console.log("❌ Rejecting friend request:", request.fromUserName);
    const response = await this.accountService.rejectFriendRequest(request.id);

    if (response.success) {
      alert("Solicitud rechazada");
    } else {
      alert(`Error: ${response.message}`);
    }
  }

  // ========== GROUP INVITATION ACTIONS ==========

  async acceptGroupInvitation(invitation: GroupInvitation): Promise<void> {
    console.log("✅ Accepting group invitation:", invitation.groupName);
    const response = await this.accountService.acceptGroupInvitation(
      invitation.id
    );

    if (response.success) {
      alert(`¡Te has unido al grupo "${invitation.groupName}"!`);
    } else {
      alert(`Error: ${response.message}`);
    }
  }

  async rejectGroupInvitation(invitation: GroupInvitation): Promise<void> {
    const confirmed = confirm(
      `¿Rechazar invitación al grupo "${invitation.groupName}"?`
    );

    if (!confirmed) return;

    console.log("❌ Rejecting group invitation:", invitation.groupName);
    const response = await this.accountService.rejectGroupInvitation(
      invitation.id
    );

    if (response.success) {
      alert("Invitación rechazada");
    } else {
      alert(`Error: ${response.message}`);
    }
  }

  // ========== FRIEND ACTIONS ==========

  sendMessage(friend: Friend): void {
    console.log("💬 Send message to:", friend.name);
    alert(
      `Función de mensajería\n\nEnviar mensaje a ${friend.name}\n\nEsta funcionalidad será implementada próximamente.`
    );
  }

  viewProfile(friend: Friend): void {
    console.log("👤 View profile:", friend.name);
    alert(
      `Ver perfil de ${friend.name}\n\nEsta funcionalidad abrirá el perfil completo del usuario.`
    );
  }

  async removeFriend(friend: Friend): Promise<void> {
    const confirmed = confirm(
      `¿Estás seguro de que deseas eliminar a ${friend.name} de tus amigos?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    console.log("🗑️ Removing friend:", friend.id);
    const response = await this.accountService.removeFriend(friend.id);

    if (response.success) {
      alert(`${friend.name} ha sido eliminado de tus amigos`);
    } else {
      alert(`Error: ${response.message}`);
    }
  }

  // ========== GROUP ACTIONS ==========

  viewGroup(group: Group): void {
    console.log("👁️ View group:", group.name);
    alert(
      `Ver grupo "${group.name}"\n\n${group.memberCount} miembros\n${
        group.upcomingTrips || 0
      } viajes próximos\n\nEsta funcionalidad abrirá la página del grupo.`
    );
  }

  async leaveGroup(group: Group): Promise<void> {
    const confirmed = confirm(
      `¿Estás seguro de que deseas salir del grupo "${group.name}"?\n\nPodrás volver a unirte más tarde si el grupo es público.`
    );

    if (!confirmed) return;

    console.log("🚪 Leaving group:", group.id);
    const response = await this.accountService.leaveGroup(group.id);

    if (response.success) {
      alert(`Has salido del grupo "${group.name}"`);
    } else {
      alert(`Error: ${response.message}`);
    }
  }

  // ========== UTILITY ==========

  retryLoad(): void {
    this.accountService.loadSocialData();
  }
}
