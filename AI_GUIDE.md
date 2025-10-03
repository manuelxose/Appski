# 📝 Guía Rápida para IA - Nieve Platform

> **Propósito**: Esta guía proporciona contexto conciso para asistentes de IA que trabajen en este proyecto, evitando explicaciones innecesarias y acelerando el desarrollo.

---

## 🎯 Información Esencial

### Stack

- **Framework**: Angular 17+ (Standalone, Signals, Control Flow)
- **Styling**: TailwindCSS + 230+ CSS Variables (Apple/Bolt aesthetic)
- **Build**: Nx Monorepo
- **NO usar**: NgModules, *ngIf/*ngFor, constructor DI, any types

### Filosofía de Diseño

- **Premium/Modern**: Inspirado en Apple y Bolt
- **Dramatic shadows** con color: `0 8px 24px rgba(14, 165, 233, 0.3)`
- **Spring animations**: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- **Hover lift**: `transform: translateY(-8px) scale(1.02)`
- **Gradientes**: Siempre usar `var(--gradient-primary)`
- **Border radius**: Mínimo `var(--radius-xl)` (12px)

---

## 🚀 Comandos Rápidos

```bash
# Servir aplicación
npx nx serve web-ssr

# Build producción
npx nx build web-ssr --configuration=production

# Tests
npx nx test web-ssr

# Generar componente
npx nx g @nx/angular:component nombre --project=web-ssr --standalone
```

---

## 📁 Estructura Clave

```
web-ssr/src/app/
├── pages/              # Componentes de página
├── components/         # Componentes compartidos
├── guards/            # Route guards
├── app.routes.ts      # Routing
└── styles.css         # 230+ variables CSS (NUNCA hardcodear valores)
```

---

## ✅ Patterns a Seguir

### 1. Componente Típico

```typescript
import { Component, signal, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-feature",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./feature.html",
  styleUrls: ["./feature.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureComponent {
  // inject() - NO constructor DI
  private router = inject(Router);

  // Signals para estado
  protected data = signal<Data | null>(null);
  protected loading = signal(false);

  // Computed para derivados
  protected hasData = computed(() => !!this.data());

  // Métodos protected (template) o private (internos)
  protected handleClick(): void {}
}
```

### 2. Template Moderno

```html
<!-- Control Flow (Angular 17+) -->
@if (loading()) {
<div>Loading...</div>
} @else if (data()) {
<div>{{ data()!.name }}</div>
}

<!-- Loops con track -->
@for (item of items(); track item.id) {
<div>{{ item.name }}</div>
} @empty {
<div>Sin elementos</div>
}
```

### 3. CSS Premium

```css
/* Estructura típica */
.card {
  /* SIEMPRE usar variables */
  padding: var(--space-8);
  border-radius: var(--radius-2xl);
  background: white;
  box-shadow: var(--shadow-lg);
  border: 2px solid var(--neutral-200);

  /* Spring transition */
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 16px 40px rgba(14, 165, 233, 0.25);
  border-color: var(--primary-300);
}

/* Animación de entrada */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card {
  animation: slideUp 0.8s var(--ease-out);
}
```

---

## 🎨 Variables CSS Más Usadas

```css
/* Colores */
--primary-500: #0ea5e9;
--success-500: #22c55e;
--error-500: #ef4444;
--neutral-900: #0f172a;

/* Gradientes (USAR ESTOS) */
--gradient-primary: linear-gradient(135deg, #0ea5e9, #0284c7);
--gradient-success: linear-gradient(135deg, #22c55e, #16a34a);

/* Espaciado */
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-12: 3rem;

/* Border Radius */
--radius-xl: 0.75rem; /* Mínimo para cards */
--radius-2xl: 1rem;
--radius-3xl: 1.5rem; /* Hero sections */
--radius-full: 9999px;

/* Sombras */
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Transiciones */
--transition-base: all 0.3s ease;
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* PRINCIPAL */
```

---

## 🎯 Checklist Rápido para Nuevos Componentes

```typescript
// Component.ts
- [ ] Standalone: true
- [ ] ChangeDetection: OnPush
- [ ] inject() (NO constructor DI)
- [ ] Signals para estado
- [ ] Computed para derivados
- [ ] Tipos estrictos (NO any)
```

```html
<!-- Template.html -->
- [ ] @if/@for/@switch (NO *ngIf/*ngFor) - [ ] track by en @for - [ ] Llamar signals: {{ data() }}
```

```css
/* Component.css */
- [ ] Variables CSS (NO valores hardcoded)
- [ ] cubic-bezier(0.34, 1.56, 0.64, 1) en transitions
- [ ] Hover: translateY(-8px) + scale
- [ ] Sombras con color en hover
- [ ] Animación de entrada (fadeIn, slideUp)
- [ ] Responsive (1024px, 768px, 480px)
- [ ] Border radius mín --radius-xl
```

---

## ❌ Anti-Patterns Comunes

```typescript
// ❌ NO HACER
export class BadComponent {
  constructor(private service: Service) {} // ❌ Constructor DI
  public data: any; // ❌ any + public innecesario
  items = []; // ❌ No usar signals
}

// ✅ HACER
export class GoodComponent {
  private service = inject(Service); // ✅ inject()
  protected data = signal<Data[]>([]); // ✅ Signal tipado
  protected count = computed(() => this.data().length); // ✅ Computed
}
```

```html
<!-- ❌ NO HACER -->
<div *ngIf="data">{{ data.name }}</div>
<div *ngFor="let item of items">{{ item }}</div>

<!-- ✅ HACER -->
@if (data()) {
<div>{{ data()!.name }}</div>
} @for (item of items(); track item.id) {
<div>{{ item.name }}</div>
}
```

```css
/* ❌ NO HACER */
.card {
  padding: 32px; /* ❌ Hardcoded */
  border-radius: 16px; /* ❌ Hardcoded */
  background: #0ea5e9; /* ❌ Hardcoded */
  transition: all 0.3s ease; /* ❌ ease básico */
}

/* ✅ HACER */
.card {
  padding: var(--space-8); /* ✅ Variable */
  border-radius: var(--radius-2xl); /* ✅ Variable */
  background: var(--gradient-primary); /* ✅ Variable */
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); /* ✅ Spring */
}
```

---

## 🎨 Componentes de Referencia

**Revisar estos para ejemplos completos**:

| Componente                          | Ejemplo de                        |
| ----------------------------------- | --------------------------------- |
| `shop-detail.component.css`         | Hero premium, cards, buttons      |
| `rental-marketplace.component.css`  | Grid layouts, filters, search     |
| `station-snow-report.component.css` | Data cards, gradients, badges     |
| `blog-article.css`                  | Typography, comments, navigation  |
| `account.css`                       | Forms, tabs, status badges        |
| `planner.css`                       | Steps, action buttons, tips cards |

---

## 🔧 Responsive Breakpoints

```css
/* Desktop Large: 1200px+ (default) */

@media (max-width: 1024px) {
  /* Tablet */
  .section {
    padding: var(--space-8);
  }
}

@media (max-width: 768px) {
  /* Mobile landscape */
  .section {
    padding: var(--space-6);
  }
  h1 {
    font-size: var(--font-size-3xl);
  }
}

@media (max-width: 480px) {
  /* Mobile portrait */
  .section {
    padding: var(--space-4);
  }
  .card {
    border-radius: var(--radius-xl);
  }
}
```

---

## 💡 Tips Específicos del Proyecto

### Routing

- **Lazy loading**: Siempre usar `loadComponent: () => import()`
- **Guards**: Usar functional guards `CanActivateFn`

### Estado

- **Local**: Signals en componentes
- **Compartido**: Services con signals readonly
- **Async**: Observables → convertir a signals con tap()

### Styling

- **TailwindCSS**: Para layout y utilidades básicas
- **CSS Custom**: Para efectos premium (hover, animations)
- **NUNCA**: Mezclar valores hardcoded con variables

### Performance

- **OnPush**: Siempre en componentes
- **track by**: Siempre en @for
- **Computed**: Para valores derivados (NO funciones en template)

---

## 📚 Documentación Completa

Si necesitas más detalles:

- 🎨 **DESIGN_SYSTEM.md**: Sistema de diseño completo (230+ variables, patterns, ejemplos)
- 🏗️ **ARCHITECTURE.md**: Arquitectura técnica detallada (Angular 17+, estructura, buenas prácticas)

---

## 🚦 Workflow Típico

1. **Crear componente**: `npx nx g @nx/angular:component nombre --project=web-ssr --standalone`
2. **Implementar lógica**: Signals + computed + inject()
3. **Template**: @if/@for con TailwindCSS
4. **CSS Premium**: Variables + spring animations + hover effects
5. **Responsive**: Breakpoints 1024/768/480
6. **Test**: Verificar errores con `npx nx lint web-ssr`

---

## ⚡ Reglas de Oro

1. **SIEMPRE** usar variables CSS (NUNCA hardcodear)
2. **SIEMPRE** usar `cubic-bezier(0.34, 1.56, 0.64, 1)` para transitions
3. **SIEMPRE** añadir hover states (lift + scale)
4. **SIEMPRE** incluir animación de entrada (fadeIn/slideUp)
5. **SIEMPRE** usar Signals + inject() (NO constructor DI)
6. **SIEMPRE** usar @if/@for (NO *ngIf/*ngFor)
7. **SIEMPRE** añadir responsive breakpoints
8. **SIEMPRE** usar border mínimo `--radius-xl`

---

**Última actualización**: Octubre 2025

🤖 **Para asistentes de IA**: Con esta guía tienes todo el contexto necesario. No preguntes por convenciones de código, usa estos patterns directamente.
