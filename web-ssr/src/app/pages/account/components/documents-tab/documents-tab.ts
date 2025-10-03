import { Component, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { Document, DocumentType } from "../../models/account.models";
import { AccountService } from "../../services/account.service";

@Component({
  selector: "app-documents-tab",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./documents-tab.html",
  styleUrl: "./documents-tab.css",
})
export class DocumentsTabComponent {
  readonly accountService = inject(AccountService);

  // Filter state
  readonly selectedFilter = signal<DocumentType | "all">("all");

  // Computed filtered documents
  readonly filteredDocuments = computed(() => {
    const filter = this.selectedFilter();
    const documents = this.accountService.documents();

    if (filter === "all") {
      return documents;
    }

    return documents.filter((doc) => doc.type === filter);
  });

  // Set filter
  setFilter(filter: DocumentType | "all"): void {
    this.selectedFilter.set(filter);
  }

  // Get count by type
  getCountByType(type: DocumentType): number {
    return this.accountService.documents().filter((doc) => doc.type === type)
      .length;
  }

  // Check if document is expired
  isExpired(document: Document): boolean {
    if (!document.expiryDate) return false;
    return new Date(document.expiryDate) < new Date();
  }

  // Check if document is expiring soon (within 30 days)
  isExpiringSoon(document: Document): boolean {
    if (!document.expiryDate) return false;
    const expiryDate = new Date(document.expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );
    return expiryDate > now && expiryDate <= thirtyDaysFromNow;
  }

  // Format date
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  // Get type icon
  getTypeIcon(type: DocumentType): string {
    const icons: Record<DocumentType, string> = {
      invoice: "🧾",
      ticket: "🎫",
      insurance: "🛡️",
      license: "🪪",
      identification: "🪪",
      receipt: "🧾",
      certificate: "🏆",
      other: "📄",
    };
    return icons[type] || "📄";
  }

  // Get type label
  getTypeLabel(type: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      invoice: "Factura",
      ticket: "Ticket",
      insurance: "Seguro",
      license: "Licencia",
      identification: "Identificación",
      receipt: "Recibo",
      certificate: "Certificado",
      other: "Otro",
    };
    return labels[type] || "Documento";
  }

  // Download document
  async downloadDocument(document: Document): Promise<void> {
    console.log("📥 Downloading document:", document.title);
    // TODO: Implement actual download
    alert(
      `Descargando: ${document.fileName}\n\nEsta funcionalidad será implementada con la API real.`
    );
  }

  // Preview document
  previewDocument(document: Document): void {
    console.log("👁️ Previewing document:", document.title);
    // TODO: Implement preview modal
    alert(
      `Vista previa: ${document.title}\n\nEsta funcionalidad abrirá una vista previa del documento.`
    );
  }

  // Delete document
  async deleteDocument(document: Document): Promise<void> {
    const confirmed = confirm(
      `¿Estás seguro de que deseas eliminar "${document.title}"?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    console.log("🗑️ Deleting document:", document.id);
    const response = await this.accountService.deleteDocument(document.id);

    if (response.success) {
      console.log("✅ Document deleted successfully");
      alert("Documento eliminado correctamente");
    } else {
      console.error("❌ Error deleting document:", response.message);
      alert(`Error al eliminar: ${response.message}`);
    }
  }

  // Retry load
  retryLoad(): void {
    this.accountService.loadDocuments();
  }
}
