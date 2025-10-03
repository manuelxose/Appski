import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "app-site-footer",
  standalone: true,
  templateUrl: "./site-footer.component.html",
  styleUrls: ["./site-footer.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooterComponent {}
