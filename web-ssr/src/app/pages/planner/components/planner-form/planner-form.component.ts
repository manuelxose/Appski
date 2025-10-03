import { Component, output, signal, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import {
  TripPlanData,
  AccommodationType,
  SkillLevel,
  StationOption,
} from "../../models/planner.models";

@Component({
  selector: "app-planner-form",
  templateUrl: "./planner-form.component.html",
  styleUrls: ["./planner-form.component.css"],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class PlannerFormComponent {
  // Input data
  stations = input<StationOption[]>([]);

  // Output event
  planSubmitted = output<TripPlanData>();

  // Form state
  destination = signal("");
  startDate = signal("");
  endDate = signal("");
  adults = signal(2);
  children = signal(0);
  budget = signal(1000);
  accommodationType = signal<AccommodationType>("hotel");
  skillLevel = signal<SkillLevel>("intermediate");
  selectedActivities = signal<string[]>([]);

  // Station data hardcoded as fallback (si no se pasa desde el padre)
  readonly defaultStations: StationOption[] = [
    {
      name: "Baqueira Beret",
      location: "Val d'Aran, Lleida",
      isOpen: true,
      snowBase: 180,
      snowFresh: 25,
      temperature: -3,
      quality: "excelente",
      image:
        "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=400&h=300&fit=crop",
    },
    {
      name: "Sierra Nevada",
      location: "Granada, Andalucía",
      isOpen: true,
      snowBase: 145,
      snowFresh: 10,
      temperature: 2,
      quality: "buena",
      image:
        "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=400&h=300&fit=crop",
    },
    {
      name: "Formigal",
      location: "Huesca, Aragón",
      isOpen: true,
      snowBase: 155,
      snowFresh: 18,
      temperature: -1,
      quality: "muy buena",
      image:
        "https://images.unsplash.com/photo-1483653364400-eedcfb9f1f88?w=400&h=300&fit=crop",
    },
    {
      name: "Candanchú",
      location: "Huesca, Aragón",
      isOpen: true,
      snowBase: 120,
      snowFresh: 15,
      temperature: 0,
      quality: "buena",
      image:
        "https://images.unsplash.com/photo-1551582045-6ec9c11d8697?w=400&h=300&fit=crop",
    },
    {
      name: "Cerler",
      location: "Huesca, Aragón",
      isOpen: true,
      snowBase: 165,
      snowFresh: 20,
      temperature: -2,
      quality: "muy buena",
      image:
        "https://images.unsplash.com/photo-1542053509-2853bb847d95?w=400&h=300&fit=crop",
    },
    {
      name: "Grandvalira",
      location: "Andorra",
      isOpen: true,
      snowBase: 175,
      snowFresh: 22,
      temperature: -4,
      quality: "excelente",
      image:
        "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop",
    },
  ];

  readonly accommodationTypes = [
    { value: "hotel", label: "🏨 Hotel" },
    { value: "apartment", label: "🏢 Apartamento" },
    { value: "hostel", label: "🛏️ Hostal" },
    { value: "rural", label: "🏡 Casa Rural" },
  ];

  readonly skillLevels = [
    { value: "beginner", label: "🌱 Principiante" },
    { value: "intermediate", label: "⛷️ Intermedio" },
    { value: "advanced", label: "🏂 Avanzado" },
    { value: "expert", label: "🏔️ Experto" },
  ];

  readonly activities = [
    { value: "skiing", label: "Esquí alpino", icon: "⛷️" },
    { value: "snowboard", label: "Snowboard", icon: "🏂" },
    { value: "cross-country", label: "Esquí de fondo", icon: "🎿" },
    { value: "snowshoe", label: "Raquetas de nieve", icon: "🥾" },
    { value: "sledding", label: "Trineo", icon: "🛷" },
    { value: "spa", label: "Spa & Relax", icon: "💆" },
    { value: "gastronomy", label: "Gastronomía", icon: "🍽️" },
    { value: "nightlife", label: "Vida nocturna", icon: "🎉" },
  ];

  onActivityToggle(activity: string): void {
    const current = this.selectedActivities();
    if (current.includes(activity)) {
      this.selectedActivities.set(current.filter((a) => a !== activity));
    } else {
      this.selectedActivities.set([...current, activity]);
    }
  }

  selectStation(stationName: string): void {
    this.destination.set(stationName);
  }

  isStationSelected(stationName: string): boolean {
    return this.destination() === stationName;
  }

  getDuration(): number {
    if (!this.startDate() || !this.endDate()) return 0;
    const start = new Date(this.startDate());
    const end = new Date(this.endDate());
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  isFormValid(): boolean {
    return !!(
      this.destination() &&
      this.startDate() &&
      this.endDate() &&
      this.adults() > 0 &&
      this.budget() > 0
    );
  }

  submitPlan(): void {
    if (!this.isFormValid()) return;

    const planData: TripPlanData = {
      destination: this.destination(),
      startDate: this.startDate(),
      endDate: this.endDate(),
      adults: this.adults(),
      children: this.children(),
      budget: this.budget(),
      accommodationType: this.accommodationType(),
      skillLevel: this.skillLevel(),
      activities: this.selectedActivities(),
    };

    this.planSubmitted.emit(planData);
  }
}
