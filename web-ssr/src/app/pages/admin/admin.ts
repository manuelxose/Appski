import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import { AdminSidebarComponent } from "../../components/admin-sidebar/admin-sidebar.component";
import { AdminHeaderComponent } from "../../components/admin-header/admin-header.component";

@Component({
  selector: "app-admin",
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent, AdminHeaderComponent],
  templateUrl: "./admin.html",
  styleUrls: ["./admin.css"],
})
export class Admin {}
