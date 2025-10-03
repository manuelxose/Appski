import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HomeDataService } from "../../pages/home/services/home.data.service";
import { Feature } from "../../pages/home/models/home.models";

@Component({
  selector: "app-features-grid",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./features-grid.component.html",
  styleUrls: ["./features-grid.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesGridComponent implements OnInit {
  private readonly homeDataService = inject(HomeDataService);

  features = signal<Feature[]>([]);

  async ngOnInit(): Promise<void> {
    const data = await this.homeDataService.loadFeatures();
    this.features.set(data);
  }
}
