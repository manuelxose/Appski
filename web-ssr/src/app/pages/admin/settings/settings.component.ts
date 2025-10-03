import { Component } from "@angular/core";

@Component({
  selector: "app-admin-settings",
  standalone: true,
  imports: [],
  template: `
    <div class="admin-page">
      <div class="page-header">
        <h1>Configuración</h1>
      </div>
      <div class="page-content">
        <p class="placeholder-text">
          Página en construcción - Configuración del sistema
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .admin-page {
        padding: var(--space-6);
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--space-6);
      }
      .page-header h1 {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
        color: var(--neutral-900);
        margin: 0;
      }
      .page-content {
        background: white;
        border: 1px solid var(--neutral-200);
        border-radius: var(--radius-2xl);
        padding: var(--space-8);
      }
      .placeholder-text {
        text-align: center;
        color: var(--neutral-500);
        font-size: var(--font-size-lg);
      }
    `,
  ],
})
export class AdminSettingsComponent {}
