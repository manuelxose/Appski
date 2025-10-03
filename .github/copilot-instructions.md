# Nieve Platform - AI Coding Guidelines

## Project Context

Nx monorepo with Angular 20.2 SSR (`web-ssr/`) + Ionic 8.7 mobile (`mobile-ionic/`) + 9 feature libraries. Apple/Bolt-inspired design system with 230+ CSS variables in `web-ssr/src/styles.css`.

**Main Application**: Weather/ski resort platform with:

- ✅ **8 BLOQUES Completed**: Meteorological components, radar, alerts system, station status indicator
- 📍 **Location**: `web-ssr/src/app/pages/weather/` (tiempo-page + 15+ components)
- 🗺️ **Leaflet Integration**: Radar map with CartoDB tiles + canvas overlay
- 🔔 **Alerts System**: Signal-based with localStorage persistence
- 📊 **State Management**: Signal-based stores (MeteoStateStore)

## Critical Patterns (Discoverable)

### Angular 18+ Modern Approach

- ✅ **Always use:** Standalone components, `@if/@for/@switch`, `inject()`, signals (`signal()`/`computed()`/`effect()`)
- ✅ **Input/Output:** Use `input()` and `output()` for component communication
- ✅ **ViewChild:** Use `viewChild()` signal-based API
- ❌ **Never use:** NgModules, `*ngIf/*ngFor`, constructor DI, `any` types, `@Input()`/`@Output()` decorators

```typescript
// ✅ Correct pattern (Angular 18+)
export class MyComponent {
  private readonly service = inject(MyService);

  // Signals for state
  count = signal(0);
  doubled = computed(() => this.count() * 2);

  // New input/output API
  data = input.required<MyData>();
  itemClick = output<string>();

  // ViewChild as signal
  readonly container = viewChild<ElementRef>("myDiv");

  constructor() {
    effect(() => {
      console.log("Count changed:", this.count());
    });
  }
}
```

### Weather Page Architecture Pattern

```typescript
// Services: Injectable with providedIn: 'root'
@Injectable({ providedIn: 'root' })
export class AlertsService {
  private alerts = signal<Alert[]>([]);
  readonly activeAlerts = computed(() => /* filter logic */);
}

// Components: Standalone with signal-based state
@Component({
  selector: 'app-alerts-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (alertsService.activeAlerts().length > 0) {
      @for (alert of alertsService.activeAlerts(); track alert.id) {
        <div class="alert">{{ alert.title }}</div>
      }
    } @else {
      <div class="no-alerts">No hay alertas activas</div>
    }
  `
})
export class AlertsPanelComponent {
  readonly alertsService = inject(AlertsService);
}
```

### Design System (230+ CSS Variables)

- **All styling** uses CSS variables from `web-ssr/src/styles.css`
- **Colors:** `var(--primary-500)`, `var(--neutral-800)`, `var(--success-600)`
- **Tailwind:** Available for utility classes (`bg-green-50`, `text-red-700`, `rounded-lg`)
- **Animations:** Spring physics with `cubic-bezier(0.34, 1.56, 0.64, 1)` at 600ms
- **Shadows:** Dramatic multi-layer shadows (e.g., `0 20px 50px -12px rgba(0, 0, 0, 0.25)`)
- **Glassmorphism:** `backdrop-filter: blur(20px)` with `rgba(255, 255, 255, 0.8)`
- ❌ **Never hardcode colors or use inline styles**

### Alert System Colors (BLOQUE 7)

```typescript
// Color patterns for alerts
{
  info: "bg-primary-50 border-primary-300 text-primary-700",
  warning: "bg-yellow-50 border-yellow-400 text-yellow-700",
  danger: "bg-red-50 border-red-400 text-red-700"
}
```

### Station Status Colors (BLOQUE 8)

```typescript
// Status badge in site-header
{
  open: "bg-green-50 border-green-200 text-green-700 (+ pulse animation)",
  closed: "bg-red-50 border-red-200 text-red-700",
  seasonal: "bg-yellow-50 border-yellow-200 text-yellow-700",
  maintenance: "bg-gray-50 border-gray-200 text-gray-700"
}
```

### Leaflet Maps Pattern (BLOQUE 6)

```typescript
// Dynamic import + signal-based state
import("leaflet").then((L) => {
  const map = L.map(container.nativeElement, {
    center: [42.5, -3.5],
    zoom: 8,
  });

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    attribution: "©OpenStreetMap, ©CartoDB",
  }).addTo(map);

  // Canvas overlay for radar
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  // ... draw precipitation cells
  L.imageOverlay(canvas.toDataURL(), bounds, { opacity: 0.6 }).addTo(map);
});
```

## Commands

- **Serve:** `npx nx serve web-ssr` or `npx nx serve mobile-ionic`
- **Build:** `npx nx build web-ssr --configuration=production`
- **Lint:** `npm run lint` (auto-fix with lint-staged)
- **Generate:** `npx nx generate @nx/angular:component --project=web-ssr`

## Mock Data Pattern

All weather data uses JSON mocks in `web-ssr/src/assets/mocks/`:

- `now.mock.json` - Current conditions
- `forecast72.mock.json` - 72h forecast
- `radar.mock.json` - Radar data
- `webcams.mock.json` - Webcam images
- `snow-*.json` - Snow conditions, stats, forecasts

```typescript
// Services load mocks via fetch
async loadData(): Promise<MeteoNow> {
  const response = await fetch('/assets/mocks/now.mock.json');
  return response.json();
}
```

## LocalStorage Patterns

```typescript
// Alerts dismissed state
private readonly STORAGE_KEY = 'nieve-dismissed-alerts';
private dismissedAlertIds = new Set<string>();

loadFromStorage(): void {
  const stored = localStorage.getItem(this.STORAGE_KEY);
  if (stored) {
    this.dismissedAlertIds = new Set(JSON.parse(stored));
  }
}

saveToStorage(): void {
  localStorage.setItem(
    this.STORAGE_KEY,
    JSON.stringify([...this.dismissedAlertIds])
  );
}
```

## Anti-Patterns

❌ Importing entire modules when only one component needed  
❌ Constructor injection (`constructor(private service)`) - Use `inject()` instead  
❌ Old control flow (`*ngIf`, `*ngFor`) - Use `@if`, `@for` instead  
❌ Old Input/Output (`@Input()`, `@Output()`) - Use `input()`, `output()` instead  
❌ Hardcoded colors/sizes instead of CSS variables or Tailwind classes  
❌ Missing `track` in `@for` loops - Always use `track item.id`  
❌ `any` types or weak typing - Use strict TypeScript  
❌ Inline styles - Use CSS variables or Tailwind utilities  
❌ Animation loops in components - Removed from radar to prevent infinite console logs  
❌ aspect-ratio CSS for Leaflet maps - Use fixed height instead (`height: 500px`)

## Common Mistakes to Avoid (Learned from BLOQUE 6)

1. **Leaflet containers**: Always use explicit height, never `aspect-ratio`

   ```css
   ✅ .map-container {
     height: 500px;
   }
   ❌ .map-container {
     aspect-ratio: 16/9;
   }
   ```

2. **Animation cleanup**: Remove intervals/timeouts in `ngOnDestroy()`

   ```typescript
   ✅ ngOnDestroy() { this.map?.remove(); }
   ❌ // Forgetting cleanup causes memory leaks
   ```

3. **Removed properties**: Delete all references when removing properties
   ```typescript
   ❌ this.radarLayer = null; // If radarLayer property deleted, remove ALL references
   ```

## Project-Specific Models

```typescript
// meteo.models.ts - Key interfaces
export interface SkiStation {
  slug: string;
  name: string;
  status?: "open" | "closed" | "seasonal" | "maintenance";
  altitudes: { base: number; mid: number; top: number };
}

export type AlertType = "info" | "warning" | "danger";
export type AlertCategory = "station" | "weather" | "snow" | "safety";

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  message: string;
  timestamp: string;
  priority: number; // 1 (highest) to 5 (lowest)
  dismissible: boolean;
  actionLabel?: string;
  actionUrl?: string;
  icon?: string;
}
```

## Future Roadmap (DO NOT IMPLEMENT YET)

📝 **Push Notifications** (documented in `PUSH_NOTIFICATIONS_ROADMAP.md`):

- Angular Service Worker + PWA
- Web Push API + VAPID keys
- Backend with `web-push` npm package
- Firebase Cloud Messaging for mobile
- **Note from user**: "las alertas deben enviarse en un futuro al móvil y por notificación del navegador"

## References

- **Quick Start:** `AI_GUIDE.md` (300+ lines: stack, commands, patterns, checklists)
- **Design System:** `DESIGN_SYSTEM.md` (230+ variables, animations, component patterns)
- **Architecture:** `ARCHITECTURE.md` (Angular 17+ patterns, Nx structure, best practices)
- **Weather System:** `web-ssr/src/app/pages/weather/README.md` (complete implementation docs)
- **Alerts System:** `web-ssr/src/app/pages/weather/components/alerts-panel/README.md`
- **Radar Component:** `web-ssr/src/app/pages/weather/components/tiempo-radar-widget/README.md`
- **Station Status:** `web-ssr/src/app/components/site-header/README-station-status.md`
- **Push Roadmap:** `PUSH_NOTIFICATIONS_ROADMAP.md` (future implementation plan)
- **BLOQUE 8 Summary:** `BLOQUE_8_RESUMEN.md` (latest completed feature)

## Completed Features (8 BLOQUES)

1. ✅ **BLOQUE 1-5**: Weather components (now panel, forecast charts, snow summary, webcams)
2. ✅ **BLOQUE 6**: Radar Meteorológico (static Leaflet map with CartoDB + canvas overlay)
3. ✅ **BLOQUE 7**: Sistema de Alertas (AlertsService + AlertsPanelComponent with localStorage)
4. ✅ **BLOQUE 8**: Estado Apertura Estación (site-header status badge with 4 states + pulse animation)
