import { Injectable, signal, computed } from "@angular/core";
import { Alert, AlertType, AlertCategory } from "../models/meteo.models";

@Injectable({
  providedIn: "root",
})
export class AlertsService {
  private readonly STORAGE_KEY = "nieve-dismissed-alerts";
  private readonly alerts = signal<Alert[]>([]);
  private dismissedAlertIds = new Set<string>();

  // Computed: alertas activas (no dismissadas)
  readonly activeAlerts = computed(() => {
    return this.alerts()
      .filter((alert) => !this.dismissedAlertIds.has(alert.id))
      .sort((a, b) => a.priority - b.priority); // Menor número = mayor prioridad
  });

  // Computed: conteo por tipo
  readonly alertCounts = computed(() => {
    const active = this.activeAlerts();
    return {
      total: active.length,
      danger: active.filter((a) => a.type === "danger").length,
      warning: active.filter((a) => a.type === "warning").length,
      info: active.filter((a) => a.type === "info").length,
    };
  });

  constructor() {
    this.loadDismissedAlerts();
    this.loadMockAlerts();
  }

  /**
   * Cargar alertas desde localStorage
   */
  private loadDismissedAlerts(): void {
    if (typeof localStorage === "undefined") return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        this.dismissedAlertIds = new Set(ids);
      }
    } catch (error) {
      console.error("Error cargando alertas dismissadas:", error);
    }
  }

  /**
   * Guardar alertas dismissadas en localStorage
   */
  private saveDismissedAlerts(): void {
    if (typeof localStorage === "undefined") return;

    try {
      const ids = Array.from(this.dismissedAlertIds);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(ids));
    } catch (error) {
      console.error("Error guardando alertas dismissadas:", error);
    }
  }

  /**
   * Cargar alertas mock (simuladas)
   */
  private loadMockAlerts(): void {
    const mockAlerts: Alert[] = [
      {
        id: "station-open-2025",
        type: "info",
        category: "station",
        title: "Estación Abierta",
        message:
          "La estación está operativa con todas las cotas abiertas. Condiciones excelentes para esquiar.",
        timestamp: new Date().toISOString(),
        priority: 3,
        dismissible: true,
        icon: "✅",
      },
      {
        id: "snow-warning-2025-01",
        type: "warning",
        category: "snow",
        title: "Nevada Moderada Prevista",
        message:
          "Se esperan entre 20-30cm de nieve nueva en las próximas 24 horas. Consulta el parte de nieve actualizado.",
        timestamp: new Date().toISOString(),
        priority: 2,
        dismissible: true,
        icon: "❄️",
        actionLabel: "Ver Parte de Nieve",
        actionUrl: "#snow-report",
      },
      {
        id: "weather-alert-wind",
        type: "danger",
        category: "weather",
        title: "Alerta: Vientos Fuertes",
        message:
          "Vientos superiores a 60 km/h previstos en cota alta. Posible cierre de remontes expuestos.",
        timestamp: new Date().toISOString(),
        priority: 1,
        dismissible: false,
        icon: "🌬️",
      },
      {
        id: "safety-visibility",
        type: "warning",
        category: "safety",
        title: "Visibilidad Reducida",
        message:
          "Niebla y nevadas pueden reducir la visibilidad. Se recomienda precaución en pistas fuera de área.",
        timestamp: new Date().toISOString(),
        priority: 2,
        dismissible: true,
        icon: "⚠️",
      },
    ];

    this.alerts.set(mockAlerts);
    console.log("📢 Alertas cargadas:", mockAlerts.length);
  }

  /**
   * Añadir una nueva alerta
   */
  addAlert(alert: Alert): void {
    this.alerts.update((alerts) => [...alerts, alert]);
    console.log("➕ Alerta añadida:", alert.title);
  }

  /**
   * Dismissar (ocultar) una alerta
   */
  dismissAlert(alertId: string): void {
    this.dismissedAlertIds.add(alertId);
    this.saveDismissedAlerts();
    console.log("❌ Alerta dismissada:", alertId);
  }

  /**
   * Restaurar alertas dismissadas (útil para testing)
   */
  restoreAlerts(): void {
    this.dismissedAlertIds.clear();
    this.saveDismissedAlerts();
    console.log("🔄 Todas las alertas restauradas");
  }

  /**
   * Obtener alerta por ID
   */
  getAlert(id: string): Alert | undefined {
    return this.alerts().find((alert) => alert.id === id);
  }

  /**
   * Obtener alertas por tipo
   */
  getAlertsByType(type: AlertType): Alert[] {
    return this.activeAlerts().filter((alert) => alert.type === type);
  }

  /**
   * Obtener alertas por categoría
   */
  getAlertsByCategory(category: AlertCategory): Alert[] {
    return this.activeAlerts().filter((alert) => alert.category === category);
  }

  /**
   * Verificar si hay alertas críticas (danger)
   */
  hasCriticalAlerts(): boolean {
    return this.activeAlerts().some((alert) => alert.type === "danger");
  }
}
