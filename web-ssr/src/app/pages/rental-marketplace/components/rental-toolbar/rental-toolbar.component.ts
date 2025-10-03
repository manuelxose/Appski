import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ViewMode } from "../../models/rental-marketplace.models";

@Component({
  selector: "app-rental-toolbar",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./rental-toolbar.component.html",
  styleUrls: ["./rental-toolbar.component.css"],
})
export class RentalToolbarComponent {
  // Inputs - data from parent
  resultsCount = input<number>(0);
  viewMode = input<ViewMode>("grid");

  // Output - emit view mode change
  viewModeChange = output<ViewMode>();

  /**
   * Change view mode
   */
  setViewMode(mode: ViewMode): void {
    this.viewModeChange.emit(mode);
  }
}
