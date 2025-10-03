import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { FAQ } from "../models/premium.models";

@Component({
  selector: "app-faq-item",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./faq-item.component.html",
  styleUrl: "./faq-item.component.css",
})
export class FaqItemComponent {
  faq = input.required<FAQ>();
  faqToggle = output<void>();
}
