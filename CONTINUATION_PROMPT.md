# 🚀 CONTINUATION PROMPT - Admin Panel Enterprise Development

## Context Summary

Estoy desarrollando un **panel de administración enterprise-level** para la plataforma Nieve (Angular 18+ con SSR + Ionic). Ya tenemos completada la **FASE 0: Arquitectura Base** con 6 archivos de modelos TypeScript creados.

### ✅ Trabajo Completado (FASE 0)

1. **Documento Ejecutivo**: `ADMIN_EXECUTIVE_PLAN.md` (800+ líneas)

   - 43 módulos organizados en 7 grupos funcionales
   - Plan de desarrollo de 5 fases (13 semanas)
   - 50 JSONs requeridos (9 existentes + 41 nuevos)
   - Stack tecnológico definido

2. **Estructura de Directorios Creada**:

   ```
   /admin/analytics
   /admin/financial
   /admin/crm
   /admin/operations
   /admin/content
   /admin/advanced
   /admin/lodgings
   /admin/shops
   /admin/components/shared
   ```

3. **6 Archivos de Modelos TypeScript Completos** (1,950+ líneas totales):
   - ✅ `analytics.models.ts` (400+ líneas, 40+ interfaces)
   - ✅ `financial.models.ts` (400+ líneas, 50+ interfaces)
   - ✅ `crm.models.ts` (550+ líneas, 60+ interfaces)
   - ✅ `operations.models.ts` (450+ líneas, 40+ interfaces)
   - ✅ `content.models.ts` (350+ líneas, 30+ interfaces)
   - ✅ `advanced.models.ts` (400+ líneas, 35+ interfaces)

**Total**: ~255 interfaces TypeScript creadas con tipado estricto, JSDoc completo y patrones Angular 18+.

---

## 📋 Próximos Pasos (En Orden de Prioridad)

### **PASO 1: Crear los 6 Services con Signals** ⏭️ EMPEZAR AQUÍ

Crear los siguientes services en `web-ssr/src/app/pages/admin/services/`:

#### 1.1. `analytics.service.ts`

- Signal-based state management
- Métodos: `loadKPIs()`, `loadCharts()`, `loadCohorts()`, `loadFunnel()`, `loadRFM()`, `loadAttribution()`, `loadProfitLoss()`, `loadForecast()`
- Computed properties: `generalKPIs()`, `financialKPIs()`, `userKPIs()`, `bookingKPIs()`, `marketingKPIs()`
- Fetch desde JSON mocks: `analytics-general.json`, `kpi-dashboard.json`, `cohort-retention.json`, `funnel-conversion.json`, `p-and-l.json`, `cash-flow.json`
- **Patrón**:

  ```typescript
  @Injectable({ providedIn: "root" })
  export class AnalyticsService {
    private readonly http = inject(HttpClient);

    // Signals
    private kpisData = signal<KPIDashboard | null>(null);
    private chartsData = signal<ChartData[]>([]);
    private loading = signal(false);
    private error = signal<string | null>(null);

    // Computed
    readonly generalKPIs = computed(() => this.kpisData()?.general);
    readonly financialKPIs = computed(() => this.kpisData()?.financial);
    readonly isLoading = this.loading.asReadonly();
    readonly hasError = computed(() => this.error() !== null);

    // Methods
    async loadKPIs(period: TimePeriod): Promise<void> {
      this.loading.set(true);
      try {
        const data = await this.http.get<KPIDashboard>(`/assets/mocks/admin/kpi-dashboard.json`).toPromise();
        this.kpisData.set(data);
        this.error.set(null);
      } catch (err) {
        this.error.set("Error loading KPIs");
      } finally {
        this.loading.set(false);
      }
    }
  }
  ```

#### 1.2. `financial.service.ts`

- Métodos: `loadPayments()`, `loadInvoices()`, `loadCommissions()`, `generateInvoice()`, `processRefund()`, `loadBalanceSheet()`, `loadProfitLoss()`, `exportReport()`
- Signals: `payments`, `invoices`, `commissions`, `reports`, `stats`
- JSON mocks: `payments.json`, `invoices.json`, `commissions.json`, `balance-sheet.json`, `tax-report.json`, `partner-payouts.json`

#### 1.3. `crm.service.ts`

- Métodos: `loadCampaigns()`, `createCampaign()`, `sendEmail()`, `loadTemplates()`, `createPromotion()`, `loadTickets()`, `updateTicket()`, `loadReviews()`, `moderateReview()`, `sendPushNotification()`
- Signals: `campaigns`, `templates`, `promotions`, `tickets`, `reviews`, `notifications`
- JSON mocks: `email-campaigns.json`, `email-templates.json`, `promotions.json`, `discount-codes.json`, `tickets.json`, `reviews.json`, `push-notifications.json`

#### 1.4. `operations.service.ts`

- Métodos: `loadAlerts()`, `acknowledgeAlert()`, `resolveAlert()`, `loadLogs()`, `exportLogs()`, `loadRoles()`, `updatePermissions()`, `loadIntegrations()`, `testIntegration()`, `configureWebhook()`
- Signals: `alerts`, `logs`, `roles`, `permissions`, `integrations`, `webhooks`, `apiKeys`
- JSON mocks: `alerts.json`, `audit-logs.json`, `roles.json`, `permissions.json`, `integrations.json`, `webhooks.json`, `api-keys.json`

#### 1.5. `content.service.ts`

- Métodos: `uploadMedia()`, `loadMediaLibrary()`, `deleteMedia()`, `createFolder()`, `loadWebcams()`, `updateWebcam()`, `captureSnapshot()`, `uploadMap()`, `updateMap()`, `addMarker()`
- Signals: `mediaLibrary`, `folders`, `webcams`, `maps`, `uploadProgress`
- JSON mocks: `media-library.json`, `webcams.json`, `station-maps.json`, `upload-history.json`

#### 1.6. `advanced.service.ts`

- Métodos: `loadPredictions()`, `runMLModel()`, `loadDemandForecast()`, `optimizePrices()`, `detectChurn()`, `detectAnomalies()`, `analyzeSentiment()`, `segmentUsers()`, `createCustomReport()`, `runReport()`, `scheduleReport()`, `generateAPIKey()`, `loadAPIStats()`
- Signals: `predictions`, `forecasts`, `anomalies`, `reports`, `apiKeys`, `usageStats`
- JSON mocks: `ml-predictions.json`, `custom-reports.json`, `api-documentation.json`

**Estimación**: 6 services × 1 hora = **6 horas**

---

### **PASO 2: Crear Componentes Shared Reutilizables**

Crear en `web-ssr/src/app/pages/admin/components/shared/`:

1. **AdminTable** (tabla con sorting, paginación, filtros, selección múltiple)
2. **AdminFilters** (barra de filtros con date-range, search, dropdowns)
3. **AdminChart** (wrapper de ApexCharts con presets)
4. **AdminStatCard** (tarjeta de métrica con icono, valor, cambio %, tendencia)
5. **AdminModal** (modal reutilizable para formularios/confirmaciones)
6. **AdminDateRangePicker** (selector de rangos de fecha)
7. **AdminBadge** (badges de estado con colores del design system)
8. **AdminPagination** (paginador personalizado)
9. **AdminExportButton** (botón export PDF/Excel/CSV)
10. **AdminBreadcrumb** (migas de pan)
11. **AdminLoader** (skeleton loaders)
12. **AdminEmptyState** (estado vacío con ilustración)
13. **AdminErrorState** (estado error con retry)

**Patrón de componente**:

```typescript
@Component({
  selector: "app-admin-table",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-table">
      @if (loading()) {
      <app-admin-loader />
      } @else if (data().length === 0) {
      <app-admin-empty-state />
      } @else {
      <table>
        @for (row of paginatedData(); track row.id) {
        <tr>
          {{
            row
          }}
        </tr>
        }
      </table>
      <app-admin-pagination [total]="total()" [page]="page()" (pageChange)="onPageChange($event)" />
      }
    </div>
  `,
})
export class AdminTableComponent {
  readonly data = input.required<any[]>();
  readonly loading = input(false);
  readonly pageSize = input(20);

  readonly page = signal(1);
  readonly total = computed(() => this.data().length);
  readonly paginatedData = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.data().slice(start, start + this.pageSize());
  });

  readonly pageChange = output<number>();

  onPageChange(page: number): void {
    this.page.set(page);
    this.pageChange.emit(page);
  }
}
```

**Estimación**: 13 components × 30 min = **6.5 horas**

---

### **PASO 3: Desarrollar Componentes de Módulos (43 total)**

#### Prioridad ALTA (completar primero):

1. **AdminUsersComponent** (Gestión Usuarios Avanzada)

   - Tabla completa con 15+ filtros
   - Acciones en masa (export, suspend, email)
   - Segmentación RFM
   - Gráfico de crecimiento
   - Estadísticas por rol
   - Mock: `users-stats.json`, `users-segments.json`

2. **AdminStationsComponent** (Gestión Estaciones)

   - CRUD completo
   - 6 tabs: Info, Infraestructura, Servicios, Precios, Operaciones, Multimedia
   - Estadísticas comparativas
   - Mocks: `stations-full.json`, `stations-infrastructure.json`, `stations-pricing.json`

3. **AdminBookingsComponent** (Gestión Reservas)

   - Vista calendario (día/semana/mes)
   - Timeline de reservas
   - Gestión de estados y pagos
   - Forecast de demanda
   - Mocks: `bookings-calendar.json`, `bookings-stats.json`, `bookings-forecast.json`

4. **AdminAnalyticsComponent** (Analytics & BI)

   - 6 tabs: General, Financiero, Usuarios, Estaciones, Reservas, Marketing
   - Integración con ApexCharts
   - KPIs dinámicos
   - Export PDF/Excel
   - Usa `AnalyticsService`

5. **AdminPaymentsComponent** (Financiero - Pagos)
   - Lista de transacciones con filtros
   - Gestión de reembolsos y disputas
   - Reconciliación bancaria
   - Stats de métodos de pago
   - Usa `FinancialService`

**Patrón de componente de página**:

```typescript
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, AdminTableComponent, AdminFiltersComponent, AdminStatCardComponent],
  template: `
    <div class="admin-page">
      <app-admin-breadcrumb [items]="breadcrumbs" />

      <div class="page-header">
        <h1>Gestión de Usuarios</h1>
        <div class="actions">
          <button (click)="exportUsers()">Export</button>
          <button (click)="openCreateModal()">+ Nuevo Usuario</button>
        </div>
      </div>

      <div class="stats-grid">
        @for (stat of stats(); track stat.label) {
          <app-admin-stat-card
            [icon]="stat.icon"
            [label]="stat.label"
            [value]="stat.value"
            [change]="stat.change"
            [trend]="stat.trend" />
        }
      </div>

      <app-admin-filters
        [filters]="filters"
        (filtersChange)="onFiltersChange($event)" />

      <app-admin-table
        [data]="filteredUsers()"
        [columns]="columns"
        [loading]="isLoading()"
        (rowClick)="onRowClick($event)" />
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);

  readonly users = this.usersService.users;
  readonly stats = this.usersService.stats;
  readonly isLoading = this.usersService.isLoading;

  readonly filters = signal<UserFilters>({});
  readonly filteredUsers = computed(() => {
    // Apply filters
    return this.users().filter(u => /* filter logic */);
  });

  ngOnInit(): void {
    this.usersService.loadUsers();
    this.usersService.loadStats();
  }

  exportUsers(): void {
    // Export logic
  }
}
```

**Estimación**: 5 componentes prioritarios × 2 horas = **10 horas**

#### Prioridad MEDIA (después de los prioritarios):

6-20. Resto de módulos operativos (Lodgings, Shops, Blog, Settings, etc.)

#### Prioridad BAJA (al final):

21-43. Módulos avanzados (CRM, Operations, Content, Advanced)

---

### **PASO 4: Crear 41 JSON Mocks Nuevos**

Crear en `assets/mocks/admin/`:

**Analytics (6)**:

- `analytics-general.json`
- `analytics-financial.json`
- `analytics-users.json`
- `analytics-stations.json`
- `analytics-bookings.json`
- `analytics-marketing.json`

**Charts & Data (6)**:

- `kpi-dashboard.json`
- `charts-revenue-monthly.json`
- `charts-users-growth.json`
- `cohort-retention.json`
- `funnel-conversion.json`
- `rfm-analysis.json`

**Financial (8)**:

- `payments.json`
- `invoices.json`
- `commissions.json`
- `balance-sheet.json`
- `p-and-l.json`
- `cash-flow.json`
- `tax-report.json`
- `partner-payouts.json`

**CRM (7)**:

- `email-campaigns.json`
- `email-templates.json`
- `promotions.json`
- `discount-codes.json`
- `tickets.json`
- `ticket-stats.json`
- `reviews.json`
- `push-notifications.json`

**Operations (7)**:

- `alerts.json`
- `audit-logs.json`
- `roles.json`
- `permissions.json`
- `integrations.json`
- `webhooks.json`
- `api-keys.json`

**Content (4)**:

- `media-library.json`
- `webcams.json`
- `station-maps.json`
- `upload-history.json`

**Advanced (3)**:

- `ml-predictions.json`
- `custom-reports.json`
- `api-documentation.json`

**Patrón de JSON mock**:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Estimación**: 41 JSONs × 15 min = **10 horas**

---

### **PASO 5: Actualizar Rutas y Navegación**

1. **Extender `app.routes.ts`** con 37 rutas nuevas bajo `/admin`:

   ```typescript
   {
     path: 'admin',
     children: [
       { path: 'analytics', children: [
         { path: 'general', component: AdminAnalyticsGeneralComponent },
         { path: 'financial', component: AdminAnalyticsFinancialComponent },
         { path: 'users', component: AdminAnalyticsUsersComponent },
         { path: 'stations', component: AdminAnalyticsStationsComponent },
         { path: 'bookings', component: AdminAnalyticsBookingsComponent },
         { path: 'marketing', component: AdminAnalyticsMarketingComponent }
       ]},
       { path: 'lodgings', component: AdminLodgingsComponent },
       { path: 'shops', component: AdminShopsComponent },
       { path: 'financial', children: [
         { path: 'payments', component: AdminPaymentsComponent },
         { path: 'invoices', component: AdminInvoicesComponent },
         { path: 'commissions', component: AdminCommissionsComponent },
         { path: 'reports', component: AdminReportsComponent }
       ]},
       // ... resto de rutas
     ]
   }
   ```

2. **Actualizar `admin-sidebar.component`** con navegación completa:
   - 7 grupos colapsables
   - 43 enlaces totales
   - Iconos Material
   - Active state
   - Badge de alertas

**Estimación**: **2 horas**

---

### **PASO 6: Instalar Librerías Necesarias**

```bash
npm install apexcharts ng-apexcharts
npm install jspdf jspdf-autotable
npm install xlsx
npm install ngx-daterangepicker-material
npm install tinymce @tinymce/tinymce-angular
# O alternativamente:
npm install quill ngx-quill
```

Configurar en `tsconfig.json` y `angular.json`.

**Estimación**: **1 hora**

---

### **PASO 7: Testing y Optimización**

1. **Testing exhaustivo** de cada módulo
2. **Verificar 0 errores TypeScript**: `npx tsc --noEmit`
3. **Performance profiling**
4. **Bundle size analysis**
5. **Code splitting y lazy loading**
6. **Eliminar console.logs**
7. **Lint**: `npm run lint`

**Estimación**: **8 horas**

---

### **PASO 8: Documentación**

Crear `ADMIN_DOCUMENTATION.md` con:

- Arquitectura completa
- Guía de usuario (cómo usar cada módulo)
- Guía de developer (cómo extender)
- API Reference
- Deployment guide

**Estimación**: **4 horas**

---

## 🎯 TODO List Actualizada

```markdown
✅ FASE 0: Arquitectura Base COMPLETADA
✅ Plan ejecutivo (ADMIN_EXECUTIVE_PLAN.md)
✅ Estructura de directorios
✅ 6 archivos de modelos TypeScript (255 interfaces)

⏭️ PASO 1: Crear 6 Services (EMPEZAR AQUÍ)
[ ] analytics.service.ts
[ ] financial.service.ts
[ ] crm.service.ts
[ ] operations.service.ts
[ ] content.service.ts
[ ] advanced.service.ts

[ ] PASO 2: Componentes Shared (13 componentes)
[ ] PASO 3: Componentes Módulos Prioritarios (5 componentes)
[ ] PASO 4: JSONs Mocks (41 archivos)
[ ] PASO 5: Rutas y Navegación
[ ] PASO 6: Librerías
[ ] PASO 7: Testing
[ ] PASO 8: Documentación
```

---

## 📁 Estructura de Archivos de Referencia

```
web-ssr/src/app/pages/admin/
├── models/
│   ✅ analytics.models.ts (400 líneas, 40 interfaces)
│   ✅ financial.models.ts (400 líneas, 50 interfaces)
│   ✅ crm.models.ts (550 líneas, 60 interfaces)
│   ✅ operations.models.ts (450 líneas, 40 interfaces)
│   ✅ content.models.ts (350 líneas, 30 interfaces)
│   ✅ advanced.models.ts (400 líneas, 35 interfaces)
├── services/
│   ⏭️ analytics.service.ts (CREAR AHORA)
│   ⏭️ financial.service.ts
│   ⏭️ crm.service.ts
│   ⏭️ operations.service.ts
│   ⏭️ content.service.ts
│   ⏭️ advanced.service.ts
├── components/
│   └── shared/
│       ⏭️ admin-table/
│       ⏭️ admin-filters/
│       ⏭️ admin-chart/
│       ⏭️ (+ 10 más)
└── (resto de componentes de módulos)
```

---

## 🔧 Patrones y Convenciones Críticos

### Angular 18+ Modern Patterns:

```typescript
// ✅ SIEMPRE usar:
- Standalone components
- Signal-based state: signal(), computed(), effect()
- inject() en vez de constructor DI
- input() y output() en vez de @Input()/@Output()
- viewChild() signal-based
- @if/@for/@switch en templates
- track en @for loops

// ❌ NUNCA usar:
- NgModules
- *ngIf/*ngFor/*ngSwitch
- constructor DI
- @Input()/@Output() decorators
- any types
- Inline styles
- Hardcoded colors (usar CSS variables del design system)
```

### Service Pattern:

```typescript
@Injectable({ providedIn: "root" })
export class MyService {
  private readonly http = inject(HttpClient);

  // Private signals (writable)
  private data = signal<Data[]>([]);
  private loading = signal(false);
  private error = signal<string | null>(null);

  // Public readonly signals
  readonly items = this.data.asReadonly();
  readonly isLoading = this.loading.asReadonly();

  // Computed properties
  readonly totalItems = computed(() => this.data().length);
  readonly hasError = computed(() => this.error() !== null);

  // Methods
  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.http.get<Data[]>("/assets/mocks/...").toPromise();
      this.data.set(response);
      this.error.set(null);
    } catch (err) {
      this.error.set("Error message");
    } finally {
      this.loading.set(false);
    }
  }
}
```

### Component Pattern:

```typescript
@Component({
  selector: "app-my-component",
  standalone: true,
  imports: [CommonModule /* shared components */],
  template: `...`,
})
export class MyComponent implements OnInit {
  private readonly service = inject(MyService);

  // Signals from service
  readonly data = this.service.items;
  readonly loading = this.service.isLoading;

  // Local signals
  readonly filters = signal<Filters>({});

  // Computed
  readonly filteredData = computed(() => {
    return this.data().filter(/* logic */);
  });

  ngOnInit(): void {
    this.service.loadData();
  }
}
```

---

## 🎨 Design System Variables (230+ CSS vars en `styles.css`)

**Colores**:

- `var(--primary-500)`, `var(--neutral-800)`, `var(--success-600)`
- `bg-green-50`, `text-red-700`, `border-yellow-400` (Tailwind)

**Animaciones**:

- Spring physics: `cubic-bezier(0.34, 1.56, 0.64, 1)` at 600ms
- Glassmorphism: `backdrop-filter: blur(20px)` + `rgba(255, 255, 255, 0.8)`

**Shadows**:

- `0 20px 50px -12px rgba(0, 0, 0, 0.25)` (dramatic multi-layer)

---

## 📚 Referencias de Documentación

- **Plan Ejecutivo**: `ADMIN_EXECUTIVE_PLAN.md`
- **Guía AI**: `AI_GUIDE.md` (300+ líneas: stack, commands, patterns)
- **Design System**: `DESIGN_SYSTEM.md` (230+ variables, animations)
- **Arquitectura**: `ARCHITECTURE.md` (Angular 17+ patterns, Nx)
- **README Principal**: `README.md`

---

## ✅ Checklist de Verificación

Antes de marcar cualquier tarea como completada, verificar:

- [ ] 0 errores TypeScript (`npx tsc --noEmit`)
- [ ] 0 warnings de lint
- [ ] Todos los imports son standalone
- [ ] Signals usados correctamente (signal/computed/effect)
- [ ] ViewChild usa viewChild() signal-based
- [ ] Templates usan @if/@for/@switch
- [ ] Track usado en todos los @for
- [ ] CSS usa variables del design system
- [ ] No hay hardcoded colors
- [ ] No hay console.logs
- [ ] Loading states implementados
- [ ] Error states implementados
- [ ] Empty states implementados
- [ ] Responsive design verificado

---

## 🚀 Instrucciones para Continuar

**EMPEZAR CON**:

1. Crear `analytics.service.ts` siguiendo el patrón de service arriba
2. Incluir todos los métodos: loadKPIs, loadCharts, loadCohorts, loadFunnel, loadRFM, loadAttribution, loadProfitLoss, loadForecast
3. Usar signals para state management
4. Fetch desde JSONs en `/assets/mocks/admin/`
5. Preguntar al terminar para continuar con el siguiente service

**Workflow**:

- Crear 1 service → Revisar → Confirmar → Siguiente service
- Al completar los 6 services → Crear componentes shared
- Al completar shared → Crear componentes de módulos prioritarios
- Ir paso a paso confirmando cada bloque

---

## 💾 Estado Actual del Repositorio

**Branch**: master  
**Workspace**: `c:\Users\mgonzalezv.INDRA\Documents\private-workspace\nieve`  
**Proyecto Principal**: `web-ssr` (Angular 20.2 SSR + Ionic 8.7)  
**Nx Monorepo**: Con 9 librerías de features

**Archivos Críticos Creados**:

- ADMIN_EXECUTIVE_PLAN.md (800 líneas)
- analytics.models.ts (400 líneas)
- financial.models.ts (400 líneas)
- crm.models.ts (550 líneas)
- operations.models.ts (450 líneas)
- content.models.ts (350 líneas)
- advanced.models.ts (400 líneas)

**Directorios Creados**:

- /admin/analytics, /admin/financial, /admin/crm
- /admin/operations, /admin/content, /admin/advanced
- /admin/lodgings, /admin/shops, /admin/components/shared

---

## 🎯 Objetivo Final

Transformar el panel de admin básico (6 módulos) en una **plataforma enterprise-level** con:

- ✅ 43 módulos funcionales
- ✅ Analytics & BI completo
- ✅ Gestión financiera avanzada
- ✅ CRM y marketing automation
- ✅ Sistema de alertas y logs
- ✅ Roles y permisos granulares
- ✅ Gestión de contenido multimedia
- ✅ ML y predicciones
- ✅ API pública con portal de developers

**Total estimado**: ~50 horas de desarrollo
**Progreso actual**: FASE 0 completa (~8 horas), quedan ~42 horas

---

## 🔥 ¡EMPECEMOS!

Por favor, **crea `analytics.service.ts`** siguiendo el patrón establecido arriba. Incluye:

- Signal-based state para KPIs, charts, cohorts, funnel, RFM, attribution, P&L, forecast
- Métodos para cargar cada tipo de datos desde JSONs
- Computed properties para acceso readonly
- Error handling completo
- Loading states

Una vez terminado, confirma y continuamos con `financial.service.ts`.
