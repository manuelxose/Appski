import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { ViewMode } from "../stations-sort-bar/stations-sort-bar.component";
import type { Station } from "../../models/stations-list.models";

@Component({
  selector: "app-station-card-grid",
  standalone: true,
  imports: [RouterLink],
  templateUrl: "./station-card-grid.component.html",
  styleUrls: ["./station-card-grid.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StationCardGridComponent {
  // Inputs
  stations = input<Station[]>([]);
  viewMode = input<ViewMode>("grid");
  loading = input<boolean>(false);

  // Outputs
  stationClick = output<Station>();

  onStationClick(station: Station): void {
    this.stationClick.emit(station);
  }
}
