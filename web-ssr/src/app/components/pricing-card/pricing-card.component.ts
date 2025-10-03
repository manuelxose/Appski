import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import type { PricingPlan } from "../../pages/premium/models/premium.models";

@Component({
  selector: "app-pricing-card",
  templateUrl: "./pricing-card.component.html",
  styleUrls: ["./pricing-card.component.css"],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class PricingCardComponent {
  plan = input.required<PricingPlan>();
}
