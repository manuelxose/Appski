import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "app-planner-banner",
  standalone: true,
  templateUrl: "./planner-banner.component.html",
  styleUrls: ["./planner-banner.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerBannerComponent {}
