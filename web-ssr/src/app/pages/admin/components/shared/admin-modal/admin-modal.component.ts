import { Component, input, output, signal, effect } from "@angular/core";
import { CommonModule } from "@angular/common";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

/**
 * AdminModalComponent
 *
 * Modal reutilizable para formularios, contenido personalizado
 *
 * @example
 * <app-admin-modal
 *   [open]="isOpen()"
 *   [title]="'Crear Usuario'"
 *   [size]="'md'"
 *   (close)="onClose()"
 * >
 *   <form>...</form>
 * </app-admin-modal>
 */
@Component({
  selector: "app-admin-modal",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./admin-modal.component.html",
  styleUrl: "./admin-modal.component.css",
})
export class AdminModalComponent {
  readonly open = input.required<boolean>();
  readonly title = input<string>();
  readonly size = input<ModalSize>("md");
  readonly closeOnBackdrop = input(true);
  readonly showCloseButton = input(true);

  readonly modalClose = output<void>();

  readonly isAnimating = signal(false);

  constructor() {
    effect(() => {
      if (this.open()) {
        this.isAnimating.set(true);
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    });
  }

  onBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.onClose();
    }
  }

  onClose(): void {
    this.isAnimating.set(false);
    setTimeout(() => {
      this.modalClose.emit();
    }, 200);
  }

  onContentClick(event: Event): void {
    event.stopPropagation();
  }
}
