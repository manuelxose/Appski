# Alerts Panel Component

## Descripción

Componente de panel de alertas que muestra notificaciones meteorológicas y de estación con diferentes niveles de prioridad. Integrado con `AlertsService` para gestión reactiva de estado y persistencia con LocalStorage.

## Características

✅ **3 tipos de alerta**: info (azul), warning (amarillo), danger (rojo)  
✅ **Sistema de prioridad**: 1 (más urgente) a 5 (menos urgente)  
✅ **Dismissible**: Alertas pueden ser cerradas por el usuario  
✅ **Persistencia**: LocalStorage guarda alertas cerradas entre sesiones  
✅ **Animaciones**: Entrada con `slideInRight`, salida con fade-out  
✅ **Acciones opcionales**: Botón de acción con URL configurable  
✅ **Iconos personalizables**: Emojis o íconos en cada alerta  
✅ **Responsive**: Optimizado para móvil y desktop

## Uso

```typescript
// En tiempo-page.component.ts
import { AlertsPanelComponent } from "./components/alerts-panel/alerts-panel.component";

@Component({
  imports: [AlertsPanelComponent, ...],
  template: `
    <app-alerts-panel />
  `
})
```

## Integración con AlertsService

El componente inyecta automáticamente `AlertsService` y usa sus signals reactivos:

```typescript
readonly alertsService = inject(AlertsService);

// Acceso a alertas activas (filtradas y ordenadas)
alertsService.activeAlerts() // Signal<Alert[]>

// Método para cerrar alerta
dismissAlert(alertId: string): void {
  this.alertsService.dismissAlert(alertId);
}
```

## Tipos de Alerta

### Info (azul)

- **Color**: `var(--primary-300)` border, gradient `var(--primary-50)` a white
- **Uso**: Información general, estado de estación abierta
- **Ejemplo**: "Estación Abierta ✅"

### Warning (amarillo)

- **Color**: `#fbbf24` border, gradient `#fef3c7` a white
- **Uso**: Advertencias moderadas, previsiones importantes
- **Ejemplo**: "Nevada Moderada Prevista (20-30cm) ❄️"

### Danger (rojo)

- **Color**: `#f87171` border, gradient `#fee2e2` a white
- **Uso**: Peligros críticos, condiciones extremas
- **Ejemplo**: "Vientos Fuertes (>60 km/h) 🌬️"

## Estructura de Alert

```typescript
interface Alert {
  id: string; // Identificador único
  type: "info" | "warning" | "danger";
  category: "station" | "weather" | "snow" | "safety";
  title: string; // Título principal
  message: string; // Descripción detallada
  timestamp: string; // ISO 8601 format
  priority: number; // 1 (highest) to 5 (lowest)
  dismissible: boolean; // ¿Se puede cerrar?
  actionLabel?: string; // Texto del botón de acción
  actionUrl?: string; // URL del botón de acción
  icon?: string; // Emoji o icono
}
```

## Ejemplos de Alertas Mock

El `AlertsService` incluye 4 alertas de ejemplo:

```typescript
// 1. Info - Estación Abierta
{
  id: "station-open-2025",
  type: "info",
  category: "station",
  title: "Estación Abierta",
  message: "La estación está operativa con todos los remontes funcionando.",
  priority: 3,
  dismissible: true,
  icon: "✅"
}

// 2. Warning - Nevada Prevista
{
  id: "snow-warning-2025-01",
  type: "warning",
  category: "snow",
  title: "Nevada Moderada Prevista",
  message: "Se esperan entre 20-30cm de nieve nueva en las próximas 48h.",
  priority: 2,
  dismissible: true,
  actionLabel: "Ver detalles",
  actionUrl: "#forecast",
  icon: "❄️"
}

// 3. Danger - Vientos Fuertes
{
  id: "weather-alert-wind",
  type: "danger",
  category: "weather",
  title: "Vientos Fuertes",
  message: "Rachas superiores a 60 km/h. Algunos remontes pueden cerrar.",
  priority: 1,
  dismissible: false, // ⚠️ No se puede cerrar
  icon: "🌬️"
}

// 4. Warning - Visibilidad Reducida
{
  id: "safety-visibility",
  type: "warning",
  category: "safety",
  title: "Visibilidad Reducida",
  message: "Niebla espesa en cotas altas. Extreme precauciones.",
  priority: 2,
  dismissible: true,
  icon: "⚠️"
}
```

## Animaciones

### Entrada (slideInRight)

```css
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

- Duración: 300ms
- Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring bounce)

### Salida (implícita con fade-out al cerrar)

El componente usa transiciones CSS para smooth removal del DOM cuando se cierra una alerta.

## Estilos Responsivos

### Desktop (>768px)

- Padding: `1.25rem 1.5rem`
- Icon size: `1.75rem`
- Title size: `1.125rem`
- Message size: `0.9375rem`
- Dismiss button: `28px × 28px`

### Mobile (≤768px)

- Padding: `1rem`
- Icon size: `1.5rem`
- Title size: `1rem`
- Message size: `0.875rem`
- Dismiss button: `24px × 24px`

## LocalStorage

### Clave de almacenamiento

```typescript
private readonly STORAGE_KEY = "nieve-dismissed-alerts";
```

### Persistencia automática

- Al cerrar una alerta, su ID se guarda en `Set<string>`
- Se serializa a JSON y guarda en localStorage
- Al recargar página, alertas cerradas permanecen ocultas
- Método `restoreAlerts()` limpia todas las alertas cerradas

## Estado Vacío

Cuando no hay alertas activas:

```html
<div class="no-alerts">
  <span class="no-alerts-icon">✨</span>
  <p class="no-alerts-text">No hay alertas activas</p>
</div>
```

## Testing

### Ver alertas en consola

```javascript
// Service logs on init
"📢 Alertas cargadas: 4";

// After dismissing
"❌ Alerta dismissada: snow-warning-2025-01";

// After restoring all
"🔄 Todas las alertas restauradas";
```

### Métodos de servicio útiles para testing

```typescript
// Obtener cuenta de alertas
alertsService.alertCounts();
// { total: 4, danger: 1, warning: 2, info: 1 }

// Verificar alertas críticas
alertsService.hasCriticalAlerts(); // true si hay danger alerts

// Restaurar alertas cerradas
alertsService.restoreAlerts();

// Añadir nueva alerta
alertsService.addAlert({
  id: "new-alert-001",
  type: "warning",
  category: "weather",
  title: "Nueva Alerta",
  message: "Descripción...",
  timestamp: new Date().toISOString(),
  priority: 2,
  dismissible: true,
});
```

## Accesibilidad

- ✅ `aria-label="Cerrar alerta"` en botones de cierre
- ✅ Estructura semántica con roles implícitos
- ✅ Contraste de colores WCAG AA compliant
- ✅ Tamaños de botón táctiles (≥24px)
- ✅ Focus states en botones interactivos

## Mejoras Futuras

- [ ] Sistema de notificaciones toast temporal (auto-dismiss después de X segundos)
- [ ] Sonido opcional para alertas danger
- [ ] Agrupación por categorías con filtros
- [ ] Historial de alertas cerradas
- [ ] Integración con notificaciones push (PWA)
- [ ] Prioridad visual con badges numerados
- [ ] Animación de entrada escalonada para múltiples alertas
- [ ] Scroll virtual para >20 alertas
