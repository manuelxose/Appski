import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";

export type AccountTab =
  | "profile"
  | "bookings"
  | "preferences"
  | "security"
  | "notifications"
  | "premium"
  | "activity"
  | "documents"
  | "friends";

@Component({
  selector: "app-account-tabs",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
      <div class="container mx-auto px-4">
        <nav class="flex overflow-x-auto scrollbar-hide gap-1">
          <!-- Tab: Perfil -->
          <button
            (click)="tabChange.emit('profile')"
            [class.border-blue-600]="activeTab() === 'profile'"
            [class.text-blue-600]="activeTab() === 'profile'"
            [class.text-slate-600]="activeTab() !== 'profile'"
            class="flex-shrink-0 px-5 py-4 border-b-2 font-medium transition-colors hover:text-blue-600"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>Perfil</span>
            </span>
          </button>

          <!-- Tab: Reservas -->
          <button
            (click)="tabChange.emit('bookings')"
            [class.border-blue-600]="activeTab() === 'bookings'"
            [class.text-blue-600]="activeTab() === 'bookings'"
            [class.text-slate-600]="activeTab() !== 'bookings'"
            class="flex-shrink-0 px-5 py-4 border-b-2 font-medium transition-colors hover:text-blue-600"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <span>Reservas</span>
            </span>
          </button>

          <!-- Tab: Notificaciones -->
          <button
            (click)="tabChange.emit('notifications')"
            [class.border-blue-600]="activeTab() === 'notifications'"
            [class.text-blue-600]="activeTab() === 'notifications'"
            [class.text-slate-600]="activeTab() !== 'notifications'"
            class="flex-shrink-0 px-5 py-4 border-b-2 font-medium transition-colors hover:text-blue-600 relative"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span>Notificaciones</span>
            </span>
          </button>

          <!-- Tab: Premium -->
          <button
            (click)="tabChange.emit('premium')"
            [class.border-blue-600]="activeTab() === 'premium'"
            [class.text-blue-600]="activeTab() === 'premium'"
            [class.text-slate-600]="activeTab() !== 'premium'"
            class="flex-shrink-0 px-5 py-4 border-b-2 font-medium transition-colors hover:text-blue-600"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              <span>Premium</span>
            </span>
          </button>

          <!-- Tab: Actividad -->
          <button
            (click)="tabChange.emit('activity')"
            [class.border-blue-600]="activeTab() === 'activity'"
            [class.text-blue-600]="activeTab() === 'activity'"
            [class.text-slate-600]="activeTab() !== 'activity'"
            class="flex-shrink-0 px-5 py-4 border-b-2 font-medium transition-colors hover:text-blue-600"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>Actividad</span>
            </span>
          </button>

          <!-- Tab: Documentos -->
          <button
            (click)="tabChange.emit('documents')"
            [class.border-blue-600]="activeTab() === 'documents'"
            [class.text-blue-600]="activeTab() === 'documents'"
            [class.text-slate-600]="activeTab() !== 'documents'"
            class="flex-shrink-0 px-5 py-4 border-b-2 font-medium transition-colors hover:text-blue-600"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Documentos</span>
            </span>
          </button>

          <!-- Tab: Amigos -->
          <button
            (click)="tabChange.emit('friends')"
            [class.border-blue-600]="activeTab() === 'friends'"
            [class.text-blue-600]="activeTab() === 'friends'"
            [class.text-slate-600]="activeTab() !== 'friends'"
            class="flex-shrink-0 px-5 py-4 border-b-2 font-medium transition-colors hover:text-blue-600"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <span>Amigos</span>
            </span>
          </button>

          <!-- Tab: Preferencias -->
          <button
            (click)="tabChange.emit('preferences')"
            [class.border-blue-600]="activeTab() === 'preferences'"
            [class.text-blue-600]="activeTab() === 'preferences'"
            [class.text-slate-600]="activeTab() !== 'preferences'"
            class="flex-shrink-0 px-5 py-4 border-b-2 font-medium transition-colors hover:text-blue-600"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Preferencias</span>
            </span>
          </button>

          <!-- Tab: Seguridad -->
          <button
            (click)="tabChange.emit('security')"
            [class.border-blue-600]="activeTab() === 'security'"
            [class.text-blue-600]="activeTab() === 'security'"
            [class.text-slate-600]="activeTab() !== 'security'"
            class="flex-shrink-0 px-5 py-4 border-b-2 font-medium transition-colors hover:text-blue-600"
          >
            <span class="flex items-center gap-2">
              <svg
                class="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Seguridad</span>
            </span>
          </button>
        </nav>
      </div>
    </div>
  `,
  styles: [
    `
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }

      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
})
export class AccountTabsComponent {
  readonly activeTab = input.required<AccountTab>();
  readonly tabChange = output<AccountTab>();
}
