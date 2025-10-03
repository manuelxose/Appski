import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { HomeDataService } from "../../pages/home/services/home.data.service";
import { PlatformStat } from "../../pages/home/models/home.models";

@Component({
  selector: "app-stats-overview",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./stats-overview.component.html",
  styleUrls: ["./stats-overview.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatsOverviewComponent implements OnInit {
  private readonly homeDataService = inject(HomeDataService);

  stats = signal<PlatformStat[]>([]);

  async ngOnInit(): Promise<void> {
    const data = await this.homeDataService.loadStats();
    this.stats.set(data);
  }
}
