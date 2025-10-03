# Lodging Marketplace - Refactorización Completada

**Fecha**: 2 de octubre de 2025  
**Patrón aplicado**: 7 pasos (análisis → models → service → mocks → move components → integration → CSS)

---

## 📋 Resumen

Refactorización completa de la página **lodging-marketplace** siguiendo patrones Angular 18+ con:

- ✅ **Parent-to-child data flow**: Children NO tienen datos hardcoded
- ✅ **SSR-safe service**: getBaseUrl() con isPlatformBrowser
- ✅ **Mock-first strategy**: 10 alojamientos en JSON
- ✅ **CSS variables**: Reemplazados hardcoded colors por design system
- ✅ **Signal-based**: input(), computed(), inject()

---

## 🗂️ Estructura de Archivos

### **Nuevos archivos creados**

```
pages/lodging-marketplace/
├── models/
│   └── lodging-marketplace.models.ts (14 interfaces/types)
├── services/
│   └── lodging-marketplace.data.service.ts (SSR-safe, mock-first)
└── components/ (movidos desde ../../components/)
    ├── lodging-card/
    ├── lodging-filters/ (+ inputs: lodgingTypes, services)
    ├── lodging-sort-bar/ (+ input: sortOptions)
    └── lodging-map-view/

assets/mocks/lodging-marketplace/
└── lodging-marketplace-page.mock.json (10 lodgings + metadata)
```

### **Archivos modificados**

- `lodging-marketplace.ts`: Inyectado servicio, removidas 174 líneas hardcoded
- `lodging-marketplace.html`: Agregados bindings `[lodgingTypes]`, `[services]`, `[sortOptions]`
- `lodging-marketplace.css`: 2 reemplazos de rgba() por CSS variables

---

## 📊 Datos Removidos vs. Centralizados

### **Antes** (174 líneas hardcoded en lodging-marketplace.ts)

```typescript
const mockLodgings: Lodging[] = [
  { id: "1", name: "Hotel Montarto Suites", type: "hotel", ... },
  { id: "2", name: "Apartamentos Valle Nevado", type: "apartment", ... },
  // ... 6 more lodgings hardcoded (168 lines)
];
```

### **Después** (1 línea de service call)

```typescript
async ngOnInit() {
  const data = await this.dataService.loadLodgingMarketplacePageData(slug);
  this.pageData.set(data);
  this.allLodgings.set(data.lodgings);
}
```

**Resultado**: 10 alojamientos en JSON mock, fácil de extender con más datos.

---

## 🧩 Models (lodging-marketplace.models.ts)

**14 interfaces/types creados**:

1. **LodgingType**: `'hotel' | 'apartment' | 'hostel' | 'rural'`
2. **Lodging**: id, name, type, image, location, distanceToSlopes, pricePerNight, rating, reviewsCount, services[], hasOffer, offerPercentage?, freeCancellation, available
3. **LodgingFilters**: types[], priceRange{min,max}, services[], maxDistance, minRating
4. **SortOption**: `'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'distance' | 'popularity'`
5. **ViewMode**: `'grid' | 'list' | 'map'`
6. **LodgingTypeConfig**: value, label, icon
7. **ServiceConfig**: value, label, icon
8. **SortConfig**: value, label
9. **PaginationMeta**: currentPage, totalPages, totalItems, itemsPerPage
10. **StationContext**: slug, name, location
11. **PriceStats**: min, max, average
12. **LodgingMarketplacePageData**: lodgings[], lodgingTypes[], services[], sortOptions[], station?, priceStats, meta
13. **ApiResponse<T>**: data, meta

---

## 🔌 Service (lodging-marketplace.data.service.ts)

**Métodos principales**:

- ✅ `loadLodgingMarketplacePageData(stationSlug?: string)`: Carga completa de datos de la página
- ✅ `loadFromMock(stationSlug?)`: Carga desde JSON con fallback
  - Intenta: `lodging-marketplace-${stationSlug}.mock.json`
  - Fallback: `lodging-marketplace-page.mock.json`
  - Error: Retorna estructura vacía con defaults
- ✅ `getBaseUrl()`: SSR-safe (window.location.origin o http://localhost:4200)

**Métodos auxiliares**:

- `getLodgingById(lodgingId)`: Console.log (futuro: navegación a detalle)
- `trackLodgingView(lodgingId)`: Console.log (futuro: analytics)
- `submitBookingInquiry(lodgingId, data)`: Console.log (futuro: API booking)

---

## 📦 Mock Data (lodging-marketplace-page.mock.json)

**Contenido**:

- **10 alojamientos**: Hotel Montarto Suites, Apartamentos Valle Nevado, Hostal La Montaña, Casa Rural Els Prats, Grand Hotel Baqueira, Aparthotel Roca Blanca, Hotel Pirineos, Casa de Montaña Aurora, Chalet Luxury Baqueira (450€), Apartamentos Vielha Center (25% oferta)
- **4 lodgingTypes**: hotel, apartment, hostel, rural
- **8 services**: wifi, parking, spa, pool, restaurant, gym, ski-storage, pets
- **6 sortOptions**: relevance, price-asc, price-desc, rating, distance, popularity
- **Station context**: Baqueira-Beret, Valle de Arán
- **Price stats**: min: 45€, max: 450€, average: 154€
- **Meta**: currentPage: 1, totalPages: 1, totalItems: 10, itemsPerPage: 20

---

## 🔄 Componentes: Parent-to-Child Flow

### **lodging-filters.component.ts**

**ANTES** (hardcoded):

```typescript
readonly lodgingTypes = [
  { value: "hotel", label: "Hotel", icon: "🏨" },
  // ... 3 more hardcoded
];
readonly services = [
  { value: "wifi", label: "WiFi", icon: "📶" },
  // ... 7 more hardcoded
];
```

**DESPUÉS** (inputs desde parent):

```typescript
lodgingTypes = input<LodgingTypeConfig[]>([]);
services = input<ServiceConfig[]>([]);
```

### **lodging-sort-bar.component.ts**

**ANTES** (hardcoded):

```typescript
readonly sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: "relevance", label: "Relevancia" },
  // ... 5 more hardcoded
];
```

**DESPUÉS** (input desde parent):

```typescript
sortOptions = input<SortConfig[]>([]);
```

### **lodging-marketplace.ts (parent)**

```typescript
// Computed properties para pasar a hijos
lodgingTypes = computed(() => this.pageData()?.lodgingTypes || []);
services = computed(() => this.pageData()?.services || []);
sortOptions = computed(() => this.pageData()?.sortOptions || []);
```

### **lodging-marketplace.html (bindings)**

```html
<!-- Desktop filters -->
<app-lodging-filters [lodgingTypes]="lodgingTypes()" [services]="services()" (filtersChanged)="onFiltersChange($event)" />

<!-- Sort bar -->
<app-lodging-sort-bar [sortOptions]="sortOptions()" (sortChanged)="onSortChange($event)" (viewModeChanged)="onViewModeChange($event)" />

<!-- Mobile filters -->
<app-lodging-filters [lodgingTypes]="lodgingTypes()" [services]="services()" (filtersChanged)="onFiltersChange($event)" />
```

---

## 🎨 CSS Variables (2 reemplazos)

### **1. Mobile filter button pulse animation**

**ANTES**:

```css
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7);
  }
  50% {
    box-shadow: 0 0 0 15px rgba(37, 99, 235, 0);
  }
}
```

**DESPUÉS**:

```css
@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgb(var(--primary-600) / 0.7);
  }
  50% {
    box-shadow: 0 0 0 15px rgb(var(--primary-600) / 0);
  }
}
```

### **2. Empty state button hover shadow**

**ANTES**:

```css
button.px-6.py-3:hover {
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
}
```

**DESPUÉS**:

```css
button.px-6.py-3:hover {
  box-shadow: var(--shadow-xl);
}
```

---

## ✅ Validación TypeScript

```bash
npx nx build web-ssr
```

**Resultado**: ✅ Solo 1 warning CSS no relacionado (article-sidebar line-clamp compatibility)

---

## 🚀 Beneficios de la Refactorización

1. **Escalabilidad**: Agregar más alojamientos solo requiere editar JSON mock
2. **Mantenibilidad**: Datos centralizados en modelos, no duplicados en componentes
3. **Testabilidad**: Service inyectable, fácil de mockear
4. **SSR-compatible**: getBaseUrl() funciona en cliente y servidor
5. **Design system compliance**: Colores y sombras usan CSS variables
6. **Type safety**: 0 `any` types, strict TypeScript
7. **Parent-to-child flow**: Children NO deciden sus datos, solo los reciben

---

## 📝 Notas Técnicas

### **Station-specific mocks (opcional)**

El servicio soporta mocks específicos por estación:

- `lodging-marketplace-baqueira.mock.json`
- `lodging-marketplace-formigal.mock.json`
- Fallback: `lodging-marketplace-page.mock.json`

### **Filtrado y ordenación**

Actualmente en `lodging-marketplace.ts`:

- `applyFiltersAndSort()`: Filtra por tipos, precio, distancia, rating, servicios
- Ordena por: relevance, price-asc, price-desc, rating, distance, popularity
- **Futuro**: Mover lógica de filtrado al servicio para reutilización

### **Map view**

`lodging-map-view.component` actualmente es placeholder:

- **Futuro**: Integrar Leaflet (como en radar-widget)
- Mostrar markers por tipo de alojamiento
- Click en marker → abrir detalle

---

## 🔮 Próximos Pasos

1. **Test en navegador**: Verificar carga de datos desde JSON mock
2. **Leaflet integration**: Map view con markers interactivos
3. **Lodging detail page**: Crear página de detalle de alojamiento
4. **Filtrado avanzado**: Fechas, número de personas, servicios premium
5. **Booking flow**: Integración con sistema de reservas

---

**Páginas refactorizadas**: 3/12 (blog-list, blog-article, lodging-marketplace) ✅
