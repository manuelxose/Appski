import { Component, input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import {
  TripPlanData,
  TripSummary,
  WeatherForecast,
  LodgingRecommendation,
  EquipmentItem,
} from "../../models/planner.models";

@Component({
  selector: "app-trip-summary",
  templateUrl: "./trip-summary.component.html",
  styleUrls: ["./trip-summary.component.css"],
  standalone: true,
  imports: [CommonModule, RouterLink],
})
export class TripSummaryComponent {
  tripData = input.required<TripPlanData>();

  calculateSummary(): TripSummary {
    const data = this.tripData();
    const duration = this.getDuration();
    const totalPeople = data.adults + data.children;

    // Cost calculations
    const skiPassCost = duration * totalPeople * 45; // 45€ per person per day
    const accommodationCost =
      duration *
      (data.accommodationType === "hotel"
        ? 120
        : data.accommodationType === "apartment"
        ? 80
        : 60) *
      Math.ceil(totalPeople / 2);
    const equipmentCost = duration * totalPeople * 25; // 25€ per person per day
    const extrasCost = duration * totalPeople * 30; // 30€ per person per day for food, etc.

    const totalCost =
      skiPassCost + accommodationCost + equipmentCost + extrasCost;

    return {
      duration,
      totalCost,
      costBreakdown: {
        accommodation: accommodationCost,
        skiPasses: skiPassCost,
        equipment: equipmentCost,
        extras: extrasCost,
      },
      recommendations: this.getRecommendations(data),
      weatherForecast: this.getWeatherForecast(data),
      lodgingOptions: this.getLodgingRecommendations(data),
      equipmentChecklist: this.getEquipmentChecklist(data),
    };
  }

  private getWeatherForecast(data: TripPlanData): WeatherForecast[] {
    // Simulate weather forecast for next 7 days
    const forecast: WeatherForecast[] = [];
    const startDate = new Date(data.startDate);

    const conditions = [
      "☀️ Soleado",
      "⛅ Parcialmente nublado",
      "☁️ Nublado",
      "❄️ Nevando",
    ];
    const icons = ["☀️", "⛅", "☁️", "❄️"];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const randomCondition = Math.floor(Math.random() * conditions.length);

      forecast.push({
        day: date.toLocaleDateString("es-ES", { weekday: "short" }),
        date: date.toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
        }),
        condition: conditions[randomCondition],
        temperature: Math.floor(Math.random() * 10) - 5, // -5 to 5°C
        snowfall:
          randomCondition === 3 ? Math.floor(Math.random() * 20) + 5 : 0,
        icon: icons[randomCondition],
      });
    }

    return forecast;
  }

  private getLodgingRecommendations(
    data: TripPlanData
  ): LodgingRecommendation[] {
    const typeFilter = data.accommodationType;

    const allLodgings: LodgingRecommendation[] = [
      {
        id: "1",
        name: "Hotel Montaña Premium",
        type: "hotel",
        image:
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
        price: 120,
        rating: 4.8,
        distanceToSlopes: "100m",
      },
      {
        id: "2",
        name: "Apartamentos Ski Lodge",
        type: "apartment",
        image:
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop",
        price: 80,
        rating: 4.5,
        distanceToSlopes: "200m",
      },
      {
        id: "3",
        name: "Casa Rural Valle Nevado",
        type: "rural",
        image:
          "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=300&fit=crop",
        price: 60,
        rating: 4.3,
        distanceToSlopes: "2km",
      },
      {
        id: "4",
        name: "Hostal Pistas",
        type: "hostel",
        image:
          "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&h=300&fit=crop",
        price: 45,
        rating: 4.0,
        distanceToSlopes: "500m",
      },
    ];

    return allLodgings.filter((l) => l.type === typeFilter).slice(0, 3);
  }

  private getEquipmentChecklist(data: TripPlanData): EquipmentItem[] {
    const checklist: EquipmentItem[] = [
      { name: "Esquís / Snowboard", icon: "🎿", required: true },
      { name: "Botas", icon: "🥾", required: true },
      {
        name: "Bastones",
        icon: "🏒",
        required: data.activities.includes("skiing"),
      },
      { name: "Casco", icon: "⛑️", required: true },
      { name: "Gafas de esquí", icon: "🥽", required: true },
      { name: "Guantes", icon: "🧤", required: true },
      { name: "Chaqueta impermeable", icon: "🧥", required: true },
      { name: "Pantalones de esquí", icon: "👖", required: true },
      { name: "Protector solar", icon: "🧴", required: true },
      { name: "Mochila", icon: "🎒", required: false },
      { name: "Termo", icon: "🍵", required: false },
    ];

    if (data.activities.includes("snowshoe")) {
      checklist.push({ name: "Raquetas de nieve", icon: "🥾", required: true });
    }

    return checklist;
  }

  private getDuration(): number {
    const data = this.tripData();
    if (!data.startDate || !data.endDate) return 0;
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  private getRecommendations(data: TripPlanData): string[] {
    const recs: string[] = [];

    if (data.skillLevel === "beginner") {
      recs.push("🌱 Considera tomar clases de esquí los primeros días");
      recs.push("🎿 Empieza por pistas verdes y azules");
    } else if (data.skillLevel === "expert") {
      recs.push("🏔️ Explora las pistas negras y fuera de pista");
      recs.push("🎿 Contrata un guía de montaña para experiencias únicas");
    }

    if (data.children > 0) {
      recs.push("👶 Reserva guardería o escuela infantil");
      recs.push("🎉 Busca actividades para niños fuera de las pistas");
    }

    if (data.activities.includes("spa")) {
      recs.push("💆 Reserva tu spa con antelación para mejores horarios");
    }

    recs.push(
      "📱 Descarga la app de la estación para información en tiempo real"
    );
    recs.push("🎫 Compra los forfaits online para evitar colas");

    return recs;
  }

  getPercentageOfBudget(amount: number): number {
    const budget = this.tripData().budget;
    return (amount / budget) * 100;
  }
}
