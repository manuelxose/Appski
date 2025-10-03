import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { Benefit } from "../models/premium.models";

@Component({
  selector: "app-benefit-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./benefit-card.component.html",
  styleUrl: "./benefit-card.component.css",
})
export class BenefitCardComponent {
  benefit = input.required<Benefit>();
}
