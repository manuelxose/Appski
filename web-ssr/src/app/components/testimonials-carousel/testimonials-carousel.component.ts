import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HomeDataService } from "../../pages/home/services/home.data.service";
import { Testimonial } from "../../pages/home/models/home.models";

@Component({
  selector: "app-testimonials-carousel",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./testimonials-carousel.component.html",
  styleUrls: ["./testimonials-carousel.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestimonialsCarouselComponent implements OnInit {
  private readonly homeDataService = inject(HomeDataService);

  testimonials = signal<Testimonial[]>([]);

  async ngOnInit(): Promise<void> {
    const data = await this.homeDataService.loadTestimonials();
    this.testimonials.set(data);
  }

  // Helper para generar array de estrellas
  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
