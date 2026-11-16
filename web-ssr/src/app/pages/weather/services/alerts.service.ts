import { Injectable, signal, computed, inject } from "@angular/core";
import { SnowApi } from "../../../snow/client/snow-api.service";
import type { Alert, AlertCategory, AlertType } from "../models/meteo.models";
import { reasonText } from "./meteo-data.service";

/**
 * Alertas meteorológicas contra el BORDE REAL (`/stations/:slug/alerts`).
 *
 * Antes: 4 alertas INVENTADAS en memoria ("Estación Abierta", "Nevada Moderada
 * Prevista", "Vientos Fuertes", "Visibilidad Reducida") que se pintaban como si
 * fueran avisos oficiales. Se eliminan: sin proveedor A1/A2 el borde responde
 * `no_data`/`not_covered` con `alerts: []`, y aquí eso se expone como estado.
 *
 * `status` es DATO, no error: la UI muestra "sin alertas" o el motivo, nunca un
 * aviso fabricado.
 */
@Injectable({ providedIn: "root" })
export class AlertsService {
  private readonly STORAGE_KEY = "nieve-dismissed-alerts";
  private readonly api = inject(SnowApi);
  private readonly alerts = signal<Alert[]>([]);
  private dismissedAlertIds = new Set<string>();

  /** Estado del último refresco: `ok`, `no_data`, `not_covered`, `blocked`… */
  readonly status = signal<string>("no_data");
  readonly detail = signal<string>("Sin alertas publicadas para esta estación.");

  readonly activeAlerts = computed(() =>
    this.alerts()
      .filter((alert) => !this.dismissedAlertIds.has(alert.id))
      .sort((a, b) => a.priority - b.priority),
  );

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
  }

  /**
   * Consulta las alertas reales de la estación. Sin proveedor ⇒ lista vacía con
   * estado tipado; nunca avisos de ejemplo.
   */
  async loadForStation(stationSlug: string): Promise<void> {
    const res = await this.api.alerts(stationSlug);
    if (!res.ok) {
      this.alerts.set([]);
      this.status.set("unavailable");
      this.detail.set("No se pudo consultar el estado de alertas.");
      return;
    }
    const body = res.body;
    this.status.set(body.status);
    if (body.status === "ok" || body.status === "stale") {
      const mapped = body.alerts
        .filter((a) => !a.expired) // un aviso caducado no se muestra como vigente
        .map(toAlert);
      this.alerts.set(mapped);
      this.detail.set(
        mapped.length === 0 ? "No hay alertas vigentes para esta estación." : "",
      );
      return;
    }
    this.alerts.set([]);
    this.detail.set(
      body.status === "blocked"
        ? "La licencia del proveedor impide publicar alertas."
        : reasonText(body.reason),
    );
  }

  private loadDismissedAlerts(): void {
    if (typeof localStorage === "undefined") return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) this.dismissedAlertIds = new Set(JSON.parse(stored) as string[]);
    } catch (error) {
      console.error("Error cargando alertas dismissadas:", error);
    }
  }

  private saveDismissedAlerts(): void {
    if (typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(Array.from(this.dismissedAlertIds)));
    } catch (error) {
      console.error("Error guardando alertas dismissadas:", error);
    }
  }

  /** Añade una alerta recibida por otra vía (p.ej. push interno). */
  addAlert(alert: Alert): void {
    this.alerts.update((alerts) => [...alerts, alert]);
  }

  dismissAlert(alertId: string): void {
    this.dismissedAlertIds.add(alertId);
    this.saveDismissedAlerts();
  }

  restoreAlerts(): void {
    this.dismissedAlertIds.clear();
    this.saveDismissedAlerts();
  }

  getAlert(id: string): Alert | undefined {
    return this.alerts().find((alert) => alert.id === id);
  }

  getAlertsByType(type: AlertType): Alert[] {
    return this.activeAlerts().filter((alert) => alert.type === type);
  }

  getAlertsByCategory(category: AlertCategory): Alert[] {
    return this.activeAlerts().filter((alert) => alert.category === category);
  }

  hasCriticalAlerts(): boolean {
    return this.activeAlerts().some((alert) => alert.type === "danger");
  }
}

/**
 * `WeatherAlertItem` del borde → `Alert` de la página. Sin textos inventados:
 * `title` es el fenómeno tal como lo publica la fuente y `message` su área.
 */
function toAlert(a: {
  id: string;
  level: "yellow" | "orange" | "red" | "green";
  phenomenon: string;
  validFrom: string;
  validUntil: string;
  area: string;
}): Alert {
  const type: AlertType = a.level === "red" ? "danger" : a.level === "yellow" || a.level === "orange" ? "warning" : "info";
  const priority = a.level === "red" ? 1 : a.level === "orange" ? 2 : a.level === "yellow" ? 3 : 4;
  return {
    id: a.id,
    type,
    category: "weather",
    title: a.phenomenon,
    message: `Área: ${a.area}. Válido hasta ${a.validUntil}.`,
    timestamp: a.validFrom,
    priority,
    dismissible: true,
    icon: type === "danger" ? "⛔" : type === "warning" ? "⚠️" : "ℹ️",
  };
}
