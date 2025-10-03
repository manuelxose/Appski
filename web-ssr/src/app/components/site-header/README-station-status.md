# Station Status Indicator - Site Header

## Descripción

Indicador visual en el site-header que muestra el estado actual de la estación de esquí. Se muestra tanto en desktop como en móvil con animaciones y colores diferenciados.

## Estados Disponibles

### 1. ✅ Estación Abierta (open)

- **Color**: Verde (`bg-green-500`)
- **Icono**: ✅
- **Animación**: Pulse dot animado (latido)
- **Uso**: Estación operativa con remontes funcionando

### 2. 🔴 Estación Cerrada (closed)

- **Color**: Rojo (`bg-red-500`)
- **Icono**: 🔴
- **Animación**: Dot estático
- **Uso**: Estación cerrada, fuera de temporada

### 3. ☀️ Temporada Turística (seasonal)

- **Color**: Amarillo (`bg-yellow-500`)
- **Icono**: ☀️
- **Animación**: Dot estático
- **Uso**: Verano, actividades turísticas sin esquí

### 4. 🔧 Mantenimiento (maintenance)

- **Color**: Gris (`bg-gray-500`)
- **Icono**: 🔧
- **Animación**: Dot estático
- **Uso**: Trabajos de mantenimiento, pre-temporada

## Implementación

### 1. Tipo de datos (site-header.component.ts)

```typescript
export type StationStatus = "open" | "closed" | "seasonal" | "maintenance";

export class SiteHeaderComponent {
  // Inputs opcionales
  stationStatus = input<StationStatus | null>(null);
  stationName = input<string | null>(null);

  // Computed signal con información de estilo
  readonly statusInfo = computed(() => {
    const status = this.stationStatus();
    // Returns: { label, icon, color, textColor, bgColor, borderColor, pulseColor }
  });
}
```

### 2. Uso en página de tiempo

```typescript
// tiempo-page.component.ts
template: `
  <app-site-header 
    [stationStatus]="store.station()?.status || null"
    [stationName]="stationName()"
  />
`;
```

### 3. Modelo de datos (meteo.models.ts)

```typescript
export interface SkiStation {
  slug: string;
  name: string;
  // ... otros campos
  status?: "open" | "closed" | "seasonal" | "maintenance";
}
```

## Diseño Visual

### Desktop

- **Posición**: Entre logo y navegación principal
- **Layout**: Horizontal con dot + icon + texto en 2 líneas
- **Border**: Border-left separator + rounded badge
- **Hover**: Shadow elevation (`hover:shadow-md`)
- **Responsive**: `hidden md:flex` (oculto en móvil)

```html
<div class="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-gray-200">
  <div class="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border">
    <!-- Pulse dot (solo si open) -->
    <div class="relative">
      <div class="absolute animate-ping"></div>
      <div class="relative"></div>
    </div>

    <!-- Icon + Text -->
    <span>✅</span>
    <div>
      <span class="text-xs font-semibold">Estación Abierta</span>
      <span class="text-[10px]">Baqueira Beret</span>
    </div>
  </div>
</div>
```

### Mobile (Menu desplegable)

- **Posición**: Bajo header del menú móvil
- **Layout**: Badge horizontal más grande
- **Padding**: `px-4 pt-4` (spacing superior)
- **Border**: Border-2 más prominente

```html
@if (statusInfo()) {
<div class="px-4 pt-4">
  <div class="flex items-center gap-2 p-3 rounded-xl border-2">
    <!-- Same structure pero más grande -->
  </div>
</div>
}
```

## Animaciones

### Pulse Animation (solo para "open")

```css
@keyframes ping {
  0%,
  100% {
    opacity: 1;
  }
  75%,
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}
```

- **Duración**: 1 segundo
- **Loop**: Infinito
- **Efecto**: Expand + fade out (latido continuo)

## Colores CSS

```typescript
// Status info object
{
  open: {
    color: "bg-green-500",
    textColor: "text-green-700",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    pulseColor: "bg-green-400",
  },
  closed: {
    color: "bg-red-500",
    textColor: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    pulseColor: "bg-red-400",
  },
  seasonal: {
    color: "bg-yellow-500",
    textColor: "text-yellow-700",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    pulseColor: "bg-yellow-400",
  },
  maintenance: {
    color: "bg-gray-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    pulseColor: "bg-gray-400",
  }
}
```

## Datos Mock

Todas las estaciones en `stations.service.ts` tienen actualmente:

```typescript
status: "open";
```

Para testing, cambiar temporalmente a otros estados:

```typescript
// Probar estado cerrado
status: "closed";

// Probar temporada turística
status: "seasonal";

// Probar mantenimiento
status: "maintenance";
```

## Condicional de Renderizado

El badge solo se muestra si hay status:

```html
@if (statusInfo()) {
<!-- Badge UI -->
}
```

Si `stationStatus = null`, el indicador no aparece (páginas sin contexto de estación).

## Accesibilidad

- ✅ Contraste de colores WCAG AA compliant
- ✅ Semántica clara con labels descriptivos
- ✅ Iconos emoji nativos (universal, no requiere fuentes)
- ✅ Animation respeta `prefers-reduced-motion` (Tailwind por defecto)

## Integración con Otras Páginas

### Página de Estaciones (/estaciones)

```typescript
// En station-detail.component.ts
<app-site-header
  [stationStatus]="station()?.status || null"
  [stationName]="station()?.name || null"
/>
```

### Página Principal (/)

```typescript
// Sin status (null)
<app-site-header />
```

### Planner, Blog, etc.

```typescript
// Sin status (null)
<app-site-header />
```

## Testing

### Verificar estados visualmente

1. **Estado Open**: Debe verse dot verde pulsante + ✅
2. **Estado Closed**: Debe verse dot rojo estático + 🔴
3. **Estado Seasonal**: Debe verse dot amarillo estático + ☀️
4. **Estado Maintenance**: Debe verse dot gris estático + 🔧

### Responsive testing

1. **Desktop (≥768px)**: Badge a la derecha del logo
2. **Mobile (<768px)**: Badge en menu desplegable (no en navbar)
3. **Hover**: Shadow elevation suave
4. **Pulse**: Solo activo en estado "open"

## Mejoras Futuras

- [ ] Tooltip con información adicional al hover (horarios, estado de remontes)
- [ ] Click en badge → scroll a sección de estado detallado
- [ ] Integración con tiempo real desde API de estaciones
- [ ] Badge de alerta si hay peligro (avalanchas, clima extremo)
- [ ] Historial de cambios de estado (timeline)
- [ ] Notificación cuando cambia el estado (push notification)
- [ ] Predicción de apertura/cierre basada en condiciones
- [ ] Estado de remontes individuales (expandible)

## Relacionado

- **BLOQUE 7**: Sistema de Alertas (notificaciones meteorológicas)
- **TODO FUTURO**: Push notifications para móvil + navegador cuando cambie el estado
- **stations.service.ts**: Fuente de datos de estaciones
- **meteo.models.ts**: Definición de `SkiStation` interface
