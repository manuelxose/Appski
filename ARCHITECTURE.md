# 🏗️ Arquitectura del Proyecto - Nieve Platform

## 📋 Índice

1. [Stack Tecnológico](#stack-tecnológico)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Convenciones de Código](#convenciones-de-código)
4. [Componentes Angular](#componentes-angular)
5. [Routing](#routing)
6. [Estado y Signals](#estado-y-signals)
7. [Buenas Prácticas](#buenas-prácticas)

---

## 💻 Stack Tecnológico

### Frontend

- **Framework**: Angular 17+ (Standalone Components)
- **Styling**: TailwindCSS + Custom CSS Variables
- **Icons**: Material Icons (SVG)
- **Build**: Nx Monorepo
- **SSR**: Angular Universal

### Características Angular 17+

- ✅ **Standalone Components** (NO NgModules)
- ✅ **Signals** para reactive state
- ✅ **Control Flow** (@if, @for, @switch)
- ✅ **inject()** function en lugar de constructor DI
- ✅ **DestroyRef** en lugar de OnDestroy

---

## 📁 Estructura del Proyecto

```
nieve/
├── web-ssr/                    # Aplicación principal SSR
│   ├── src/
│   │   ├── app/
│   │   │   ├── pages/         # Páginas de la aplicación
│   │   │   │   ├── home/
│   │   │   │   ├── station-detail/
│   │   │   │   ├── shop-detail/
│   │   │   │   ├── rental-marketplace/
│   │   │   │   ├── blog-list/
│   │   │   │   ├── blog-article/
│   │   │   │   ├── account/
│   │   │   │   └── planner/
│   │   │   │
│   │   │   ├── components/    # Componentes compartidos
│   │   │   │   ├── site-header/
│   │   │   │   ├── site-footer/
│   │   │   │   ├── station-snow-report/
│   │   │   │   ├── station-lifts-slopes/
│   │   │   │   └── ...
│   │   │   │
│   │   │   ├── guards/        # Route guards
│   │   │   │   └── auth.guard.ts
│   │   │   │
│   │   │   ├── app.routes.ts  # Routing configuration
│   │   │   ├── app.ts         # Root component
│   │   │   └── app.config.ts  # App configuration
│   │   │
│   │   ├── styles.css         # Sistema de variables CSS
│   │   └── index.html
│   │
│   ├── public/                # Assets estáticos
│   └── tailwind.config.js
│
├── mobile-ionic/              # Aplicación móvil (Ionic)
├── ads/                       # Módulo de publicidad
├── analytics/                 # Módulo de analytics
├── auth/                      # Módulo de autenticación
├── data-access/               # Capa de acceso a datos
├── i18n/                      # Internacionalización
├── maps/                      # Integración de mapas
├── seo/                       # SEO utilities
├── state/                     # Gestión de estado
└── ui-design-system/          # Sistema de diseño compartido

└── DESIGN_SYSTEM.md           # Documentación del diseño
└── ARCHITECTURE.md            # Este archivo
```

---

## 🎯 Convenciones de Código

### 1. Naming Conventions

#### Archivos

```
component-name.ts           # Component logic
component-name.html         # Template
component-name.css          # Styles
component-name.spec.ts      # Tests
```

#### Clases y Interfaces

```typescript
// Components
export class StationDetailComponent {}

// Services
export class DataService {}

// Interfaces
export interface Station {}
export interface SkiShop {}

// Types
export type ViewMode = "grid" | "list";
```

#### Variables y Funciones

```typescript
// camelCase para variables y funciones
const userProfile = signal<User | null>(null);
const isAuthenticated = computed(() => !!userProfile());

function fetchStationData(id: string): Observable<Station> {}

// PascalCase para tipos/interfaces
interface StationData {}
```

### 2. Estructura de Componentes Angular 17+

```typescript
import { Component, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";

@Component({
  selector: "app-component-name",
  standalone: true,
  imports: [CommonModule, RouterLink /* otros componentes */],
  templateUrl: "./component-name.html",
  styleUrls: ["./component-name.css"],
})
export class ComponentNameComponent {
  // 1. Inject dependencies (NO constructor DI)
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // 2. Signals (reactive state)
  protected data = signal<Data | null>(null);
  protected loading = signal(false);
  protected error = signal<string | null>(null);

  // 3. Computed signals (derived state)
  protected hasData = computed(() => this.data() !== null);
  protected itemCount = computed(() => this.data()?.items.length ?? 0);

  // 4. Lifecycle
  ngOnInit(): void {
    this.loadData();
  }

  // 5. Methods
  protected loadData(): void {
    // Implementation
  }

  protected handleClick(item: Item): void {
    // Implementation
  }
}
```

### 3. Templates con Control Flow

```html
<!-- ✅ USAR: @if, @for, @switch (Angular 17+) -->

<!-- Conditional Rendering -->
@if (loading()) {
<div class="loading-spinner">Cargando...</div>
} @else if (error()) {
<div class="error-message">{{ error() }}</div>
} @else if (data()) {
<div class="content">
  <!-- Content here -->
</div>
}

<!-- Loops -->
@for (item of items(); track item.id) {
<div class="item-card">
  <h3>{{ item.name }}</h3>
</div>
} @empty {
<div class="empty-state">No hay elementos</div>
}

<!-- Switch -->
@switch (status()) { @case ('loading') {
<div>Loading...</div>
} @case ('success') {
<div>Success!</div>
} @case ('error') {
<div>Error</div>
} @default {
<div>Unknown</div>
} }

<!-- ❌ NO USAR: *ngIf, *ngFor, *ngSwitch (deprecated) -->
```

### 4. Signals vs Observables

#### ✅ Usar Signals para:

- Estado local del componente
- Valores síncronos
- Computed values
- Estado que se actualiza con frecuencia

```typescript
// ✅ BIEN
protected selectedTab = signal<'profile' | 'bookings'>('profile');
protected count = signal(0);
protected doubleCount = computed(() => this.count() * 2);

// Actualizar
this.count.set(10);
this.count.update(n => n + 1);
```

#### ✅ Usar Observables para:

- HTTP requests
- Eventos asíncronos
- Streams de datos
- Integración con APIs

```typescript
// ✅ BIEN
private http = inject(HttpClient);

fetchData(): Observable<Data> {
  return this.http.get<Data>('/api/data');
}

// En el componente
ngOnInit() {
  this.fetchData().subscribe(data => {
    this.data.set(data);
  });
}
```

---

## 🧩 Componentes Angular

### Componentes de Página (Pages)

**Ubicación**: `web-ssr/src/app/pages/`

**Responsabilidades**:

- Layout de la página
- Orquestación de componentes
- Manejo de routing
- Gestión de estado de página

**Ejemplo**: `station-detail/station-detail.ts`

```typescript
@Component({
  selector: "app-station-detail",
  standalone: true,
  imports: [CommonModule, RouterLink, SiteHeaderComponent, SiteFooterComponent, StationSnowReportComponent, StationLiftsSlopesComponent],
  templateUrl: "./station-detail.html",
  styleUrls: ["./station-detail.css"],
})
export class StationDetailComponent {
  private route = inject(ActivatedRoute);

  protected station = signal<Station | null>(null);
  protected loading = signal(true);

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get("slug");
    this.loadStation(slug);
  }

  private loadStation(slug: string | null): void {
    // Cargar datos
  }
}
```

### Componentes Compartidos (Components)

**Ubicación**: `web-ssr/src/app/components/`

**Responsabilidades**:

- UI reutilizable
- Lógica de presentación
- Inputs/Outputs para comunicación
- Sin lógica de negocio compleja

**Ejemplo**: `station-snow-report/station-snow-report.component.ts`

```typescript
@Component({
  selector: "app-station-snow-report",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./station-snow-report.component.html",
  styleUrls: ["./station-snow-report.component.css"],
})
export class StationSnowReportComponent {
  // Input con signals
  protected snowReport = input.required<SnowReport>();

  // Computed values
  protected snowQuality = computed(() => {
    const base = this.snowReport().snowBase;
    if (base > 100) return "excelente";
    if (base > 50) return "buena";
    return "regular";
  });

  // Outputs
  protected alertClick = output<void>();
}
```

---

## 🛣️ Routing

### Configuración de Rutas

**Archivo**: `app.routes.ts`

```typescript
import { Routes } from "@angular/router";
import { authGuard } from "./guards/auth.guard";

export const routes: Routes = [
  // Rutas públicas
  {
    path: "",
    loadComponent: () => import("./pages/home/home").then((m) => m.HomeComponent),
  },
  {
    path: "estaciones/:slug",
    loadComponent: () => import("./pages/station-detail/station-detail").then((m) => m.StationDetailComponent),
  },
  {
    path: "tiendas/:slug",
    loadComponent: () => import("./pages/shop-detail/shop-detail").then((m) => m.ShopDetailComponent),
  },

  // Rutas protegidas
  {
    path: "cuenta",
    canActivate: [authGuard],
    loadComponent: () => import("./pages/account/account").then((m) => m.AccountComponent),
  },

  // Wildcard
  {
    path: "**",
    redirectTo: "",
  },
];
```

### Route Guards

**Archivo**: `guards/auth.guard.ts`

```typescript
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { CanActivateFn } from "@angular/router";

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isAuthenticated = checkAuth(); // Tu lógica

  if (!isAuthenticated) {
    router.navigate(["/login"], {
      queryParams: { returnUrl: state.url },
    });
    return false;
  }

  return true;
};
```

---

## 🔄 Estado y Signals

### Patrón de Estado Local

```typescript
export class ComponentWithState {
  // 1. Estado primitivo
  protected count = signal(0);
  protected name = signal("");

  // 2. Estado complejo
  protected user = signal<User | null>(null);
  protected items = signal<Item[]>([]);

  // 3. Estado de UI
  protected loading = signal(false);
  protected error = signal<string | null>(null);
  protected selectedTab = signal<TabType>("profile");

  // 4. Computed values
  protected hasUser = computed(() => this.user() !== null);
  protected itemCount = computed(() => this.items().length);
  protected isLoading = computed(() => this.loading());

  // 5. Effects (side effects)
  constructor() {
    effect(() => {
      console.log("Count changed:", this.count());
    });
  }

  // 6. Métodos de actualización
  protected updateCount(value: number): void {
    this.count.set(value);
  }

  protected incrementCount(): void {
    this.count.update((n) => n + 1);
  }

  protected addItem(item: Item): void {
    this.items.update((items) => [...items, item]);
  }
}
```

### Patrón de Servicio con Signals

```typescript
@Injectable({ providedIn: "root" })
export class DataService {
  private http = inject(HttpClient);

  // Estado compartido
  private _data = signal<Data[]>([]);
  public readonly data = this._data.asReadonly();

  // Computed
  public readonly count = computed(() => this._data().length);

  // Métodos
  fetchData(): Observable<Data[]> {
    return this.http.get<Data[]>("/api/data").pipe(tap((data) => this._data.set(data)));
  }

  addItem(item: Data): void {
    this._data.update((items) => [...items, item]);
  }
}
```

---

## ✅ Buenas Prácticas

### 1. Componentes

```typescript
// ✅ HACER
@Component({
  selector: "app-feature-name", // Prefijo consistente
  standalone: true, // Siempre standalone en Angular 17+
  imports: [
    /* solo lo necesario */
  ],
  changeDetection: ChangeDetectionStrategy.OnPush, // Mejor performance
})
export class FeatureComponent {
  // inject() en lugar de constructor
  private service = inject(DataService);

  // Signals para estado
  protected data = signal<Data | null>(null);

  // Computed para derivados
  protected hasData = computed(() => !!this.data());

  // Métodos protected (usados en template)
  protected handleClick(): void {}

  // Métodos private (lógica interna)
  private fetchData(): void {}
}

// ❌ NO HACER
export class FeatureComponent {
  // NO usar constructor DI
  constructor(private service: DataService) {}

  // NO usar variables públicas sin motivo
  public data: Data;

  // NO usar any
  someMethod(data: any) {}
}
```

### 2. Templates

```html
<!-- ✅ HACER -->
<!-- Control flow moderno -->
@if (data()) {
<div>{{ data()!.name }}</div>
}

<!-- Track by en loops -->
@for (item of items(); track item.id) {
<div>{{ item.name }}</div>
}

<!-- Event binding claro -->
<button (click)="handleClick()">Click</button>

<!-- ❌ NO HACER -->
<!-- Control flow antiguo -->
<div *ngIf="data">{{ data.name }}</div>

<!-- Loop sin track -->
<div *ngFor="let item of items">{{ item.name }}</div>

<!-- Lógica compleja en template -->
<div>{{ data ? data.items.filter(i => i.active).length : 0 }}</div>
<!-- ^ Esto debería ser un computed signal -->
```

### 3. Styling

```css
/* ✅ HACER - Usar variables CSS */
.card {
  padding: var(--space-6);
  border-radius: var(--radius-2xl);
  background: var(--gradient-primary);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ❌ NO HACER - Valores hardcoded */
.card {
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  transition: all 0.3s ease;
}
```

### 4. Performance

```typescript
// ✅ HACER - OnPush + Signals
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptimizedComponent {
  protected data = signal<Data[]>([]);
  protected filtered = computed(() =>
    this.data().filter(item => item.active)
  );
}

// ✅ HACER - Lazy loading
const routes: Routes = [
  {
    path: 'feature',
    loadComponent: () => import('./feature/feature')
      .then(m => m.FeatureComponent)
  }
];

// ❌ NO HACER - Funciones en template
<div>{{ filterItems(items) }}</div>
<!-- ^ Esto se ejecuta en cada change detection -->
```

### 5. Tipo de Seguridad

```typescript
// ✅ HACER - Tipos estrictos
interface Station {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
}

protected station = signal<Station | null>(null);

// ✅ HACER - Type guards
protected isStation(data: unknown): data is Station {
  return typeof data === 'object'
    && data !== null
    && 'id' in data;
}

// ❌ NO HACER - any
protected data = signal<any>(null);
```

---

## 🔧 Configuración del Proyecto

### tsconfig.json (Base)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "paths": {
      "@app/*": ["src/app/*"],
      "@components/*": ["src/app/components/*"],
      "@pages/*": ["src/app/pages/*"]
    }
  }
}
```

### Tailwind Config

```javascript
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "#0ea5e9",
        success: "#22c55e",
        error: "#ef4444",
        warning: "#f59e0b",
      },
    },
  },
  plugins: [],
};
```

---

## 📦 Nx Workspace

### Comandos Útiles

```bash
# Servir aplicación web
npx nx serve web-ssr

# Build para producción
npx nx build web-ssr --configuration=production

# Ejecutar tests
npx nx test web-ssr

# Lint
npx nx lint web-ssr

# Ver dependencias del proyecto
npx nx graph

# Generar componente
npx nx g @nx/angular:component feature-name --project=web-ssr
```

---

## 🚀 Deployment

### Build de Producción

```bash
# Build SSR
npx nx build web-ssr --configuration=production

# Output en: dist/web-ssr
```

### Variables de Entorno

```typescript
// environment.ts
export const environment = {
  production: true,
  apiUrl: "https://api.nieve.com",
  mapsApiKey: "YOUR_KEY",
};
```

---

## 📚 Referencias

- [Angular Documentation](https://angular.dev)
- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Nx Documentation](https://nx.dev)
- [TailwindCSS](https://tailwindcss.com)

---

**Última actualización**: Octubre 2025

**Mantenedores**: Equipo Nieve Platform

🏗️ **¡Mantén la arquitectura limpia y consistente!**
