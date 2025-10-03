/**
 * Account Page - Nieve Platform
 * Componente principal de cuenta de usuario refactorizado con arquitectura signal-based
 */

import { Component, inject, signal, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

// Services
import { AccountService } from "./services/account.service";

// Components
import { SiteHeaderComponent } from "../../components/site-header/site-header.component";
import { SiteFooterComponent } from "../../components/site-footer/site-footer.component";
import { AccountHeaderComponent } from "./components/account-header/account-header.component";
import {
  AccountTabsComponent,
  type AccountTab,
} from "./components/account-tabs/account-tabs";
import { ProfileTabComponent } from "./components/profile-tab/profile-tab";
import { BookingsTabComponent } from "./components/bookings-tab/bookings-tab";
import { PreferencesTabComponent } from "./components/preferences-tab/preferences-tab";
import { SecurityTabComponent } from "./components/security-tab/security-tab";
import { NotificationsTabComponent } from "./components/notifications-tab/notifications-tab";
import { PremiumTabComponent } from "./components/premium-tab/premium-tab";
import { ActivityTabComponent } from "./components/activity-tab/activity-tab";
import { DocumentsTabComponent } from "./components/documents-tab/documents-tab";
import { FriendsTabComponent } from "./components/friends-tab/friends-tab";

@Component({
  selector: "app-account",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    SiteHeaderComponent,
    SiteFooterComponent,
    AccountHeaderComponent,
    AccountTabsComponent,
    ProfileTabComponent,
    BookingsTabComponent,
    PreferencesTabComponent,
    SecurityTabComponent,
    NotificationsTabComponent,
    PremiumTabComponent,
    ActivityTabComponent,
    DocumentsTabComponent,
    FriendsTabComponent,
  ],
  templateUrl: "./account.html",
  styleUrls: ["./account.css"],
})
export class Account implements OnInit {
  private readonly accountService = inject(AccountService);

  // Local state
  readonly activeTab = signal<AccountTab>("profile");
  readonly isInitializing = signal(true);
  readonly initError = signal<string | null>(null);

  // Expose service signals
  readonly userProfile = this.accountService.userProfile;
  readonly bookings = this.accountService.bookings;
  readonly preferences = this.accountService.preferences;
  readonly sessions = this.accountService.sessions;
  readonly stats = this.accountService.stats;

  // Loading states
  readonly isLoadingProfile = this.accountService.isLoadingProfile;
  readonly isLoadingBookings = this.accountService.isLoadingBookings;
  readonly isLoadingPreferences = this.accountService.isLoadingPreferences;
  readonly isLoadingSessions = this.accountService.isLoadingSessions;

  async ngOnInit(): Promise<void> {
    await this.initializeAccount();
  }

  private async initializeAccount(): Promise<void> {
    this.isInitializing.set(true);
    this.initError.set(null);

    try {
      await this.accountService.initializeAccount();
    } catch (error) {
      console.error("Error initializing account:", error);
      this.initError.set("Error al cargar los datos de la cuenta");
    } finally {
      this.isInitializing.set(false);
    }
  }

  changeTab(tab: AccountTab): void {
    this.activeTab.set(tab);
  }
}
