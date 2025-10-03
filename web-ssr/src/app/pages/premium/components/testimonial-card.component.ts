import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import type { Testimonial } from "../models/premium.models";

@Component({
  selector: "app-testimonial-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./testimonial-card.component.html",
  styleUrl: "./testimonial-card.component.css",
})
export class TestimonialCardComponent {
  testimonial = input.required<Testimonial>();
}
