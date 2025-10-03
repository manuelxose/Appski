# 🎨 Sistema de Diseño - Nieve Platform

## 📋 Tabla de Contenidos

1. [Filosofía de Diseño](#filosofía-de-diseño)
2. [Sistema de Variables CSS](#sistema-de-variables-css)
3. [Convenciones de Estilo](#convenciones-de-estilo)
4. [Componentes y Patrones](#componentes-y-patrones)
5. [Animaciones](#animaciones)
6. [Responsive Design](#responsive-design)
7. [Ejemplos de Implementación](#ejemplos-de-implementación)

---

## 🎯 Filosofía de Diseño

### Inspiración

El diseño está inspirado en **Apple** y **Bolt** con énfasis en:

- ✨ **Minimalismo elegante**
- 🎭 **Dramatic shadows** con color
- 🌊 **Smooth animations** con spring easing
- 💎 **Glassmorphism** y efectos modernos
- 🎨 **Gradientes vibrantes**

### Principios Clave

1. **Consistencia**: Usar siempre las variables CSS del sistema
2. **Fluidez**: Todas las transiciones con cubic-bezier(0.34, 1.56, 0.64, 1)
3. **Accesibilidad**: Contraste mínimo 4.5:1, focus states visibles
4. **Performance**: Animaciones con transform/opacity, evitar reflows

---

## 🎨 Sistema de Variables CSS

### Ubicación

**Archivo**: `web-ssr/src/styles.css`
**Total**: 230+ variables CSS

### Categorías de Variables

#### 1. Colores

```css
/* Primarios (Azul/Cyan) */
--primary-50: #eff6ff;
--primary-500: #0ea5e9;
--primary-900: #0c4a6e;

/* Success (Verde) */
--success-50: #f0fdf4;
--success-500: #22c55e;
--success-900: #14532d;

/* Error (Rojo) */
--error-50: #fef2f2;
--error-500: #ef4444;
--error-900: #7f1d1d;

/* Warning (Amarillo) */
--warning-50: #fefce8;
--warning-500: #eab308;
--warning-900: #713f12;

/* Neutrales (Grises) */
--neutral-50: #f8fafc;
--neutral-900: #0f172a;

/* Teal/Cyan */
--teal-500: #14b8a6;
--cyan-500: #06b6d4;
```

#### 2. Gradientes

```css
/* Usar estos para botones y headers */
--gradient-primary: linear-gradient(135deg, #0ea5e9, #0284c7);
--gradient-success: linear-gradient(135deg, #22c55e, #16a34a);
--gradient-error: linear-gradient(135deg, #ef4444, #dc2626);
--gradient-warning: linear-gradient(135deg, #f59e0b, #d97706);
```

#### 3. Sombras

```css
/* Usar estas sombras con color para dramatic effect */
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Sombras con color (para hover states) */
--shadow-primary: 0 8px 24px rgba(14, 165, 233, 0.3);
--shadow-success: 0 8px 24px rgba(34, 197, 94, 0.3);
```

#### 4. Espaciado

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
```

#### 5. Border Radius

```css
--radius-sm: 0.25rem; /* 4px */
--radius-md: 0.375rem; /* 6px */
--radius-lg: 0.5rem; /* 8px */
--radius-xl: 0.75rem; /* 12px */
--radius-2xl: 1rem; /* 16px */
--radius-3xl: 1.5rem; /* 24px */
--radius-full: 9999px;
```

#### 6. Tipografía

```css
/* Tamaños */
--font-size-xs: 0.75rem; /* 12px */
--font-size-sm: 0.875rem; /* 14px */
--font-size-base: 1rem; /* 16px */
--font-size-lg: 1.125rem; /* 18px */
--font-size-xl: 1.25rem; /* 20px */
--font-size-2xl: 1.5rem; /* 24px */
--font-size-3xl: 1.875rem; /* 30px */

/* Pesos */
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;
--font-weight-black: 900;

/* Letter Spacing */
--letter-spacing-tight: -0.025em;
--letter-spacing-normal: 0;
--letter-spacing-wide: 0.025em;
```

#### 7. Transiciones

```css
/* Usar siempre estas transiciones */
--transition-base: all 0.3s ease;
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* PRINCIPAL */
```

---

## 📐 Convenciones de Estilo

### 1. Estructura de Archivos CSS

```css
/* ============================================
   [NOMBRE COMPONENTE] - APPLE/BOLT PREMIUM DESIGN
   ============================================ */

/* 1. Container Styles */
.container-principal {
  /* ... */
}

/* 2. Header/Hero Section */
.header-class {
  /* ... */
}

/* 3. Content Sections */
.content-class {
  /* ... */
}

/* 4. Interactive Elements (Buttons, Forms) */
button.custom-button {
  /* ... */
}

/* 5. Animations */
@keyframes animationName {
  /* ... */
}

/* 6. Responsive Design */
@media (max-width: 1024px) {
  /* ... */
}
```

### 2. Nomenclatura de Clases

#### ✅ HACER

```css
/* Usar clases descriptivas de TailwindCSS en HTML */
<div class="bg-white rounded-xl shadow-lg p-6">

/* En CSS: Targets específicos */
.bg-white.rounded-xl.shadow-lg {
  /* Estilos premium adicionales */
}
```

#### ❌ NO HACER

```css
/* No crear clases custom innecesarias */
.my-custom-card {
} /* ❌ */
.premium-box {
} /* ❌ */
```

### 3. Orden de Propiedades CSS

```css
.elemento {
  /* 1. Posicionamiento */
  position: relative;
  top: 0;
  z-index: 1;

  /* 2. Box Model */
  display: flex;
  width: 100%;
  padding: var(--space-6);
  margin: var(--space-4);

  /* 3. Tipografía */
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--neutral-900);

  /* 4. Visual */
  background: var(--gradient-primary);
  border: 2px solid var(--primary-300);
  border-radius: var(--radius-2xl);
  box-shadow: var(--shadow-xl);

  /* 5. Animación */
  transition: all var(--transition-base);
  animation: fadeIn 0.6s var(--ease-out);
}
```

---

## 🎭 Componentes y Patrones

### 1. Premium Cards

#### Patrón Estándar

```css
.bg-white.rounded-xl {
  background: white;
  border-radius: var(--radius-3xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-lg);
  border: 2px solid var(--neutral-200);
  transition: all var(--transition-base);
}

.bg-white.rounded-xl:hover {
  box-shadow: var(--shadow-2xl);
  transform: translateY(-4px);
  border-color: var(--primary-300);
}
```

#### Con Accent Bar (Left Border Animation)

```css
.card::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--gradient-primary);
  transform: scaleY(0);
  transition: transform var(--transition-base);
}

.card:hover::before {
  transform: scaleY(1);
}
```

### 2. Buttons Premium

#### Primary Button

```css
button.primary {
  padding: var(--space-3) var(--space-8);
  background: var(--gradient-primary);
  color: white;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-xl);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 2px solid transparent;
}

button.primary:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 16px 40px rgba(14, 165, 233, 0.4);
  border-color: rgba(255, 255, 255, 0.3);
}
```

#### Success Button

```css
button.success {
  background: var(--gradient-success);
  box-shadow: 0 8px 24px rgba(34, 197, 94, 0.3);
}

button.success:hover {
  box-shadow: 0 16px 40px rgba(34, 197, 94, 0.4);
}
```

### 3. Form Inputs

```css
input[type="text"],
input[type="email"],
select,
textarea {
  padding: var(--space-4);
  border: 2px solid var(--neutral-300);
  border-radius: var(--radius-xl);
  transition: all var(--transition-base);
  font-weight: var(--font-weight-medium);
}

input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1);
  transform: translateY(-2px);
}
```

### 4. Status Badges

```css
/* Success Badge */
.badge-success {
  padding: var(--space-2) var(--space-4);
  background: linear-gradient(135deg, var(--success-100), var(--success-200));
  color: var(--success-800);
  border: 2px solid var(--success-300);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.05em;
  transition: all var(--transition-base);
}

.badge-success:hover {
  background: var(--gradient-success);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}
```

### 5. Hero Sections

```css
.hero-section {
  background: var(--gradient-primary);
  min-height: 60vh;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(14, 165, 233, 0.25);
}

/* Pattern Overlay */
.hero-section::before {
  content: "";
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60'...");
  opacity: 0.4;
}

.hero-section .container {
  position: relative;
  z-index: 1;
}

/* Title */
.hero-section h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 900;
  letter-spacing: var(--letter-spacing-tight);
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.8s var(--ease-out);
}
```

### 6. Glassmorphism

```css
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-2xl);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

---

## 🎬 Animaciones

### 1. Animaciones Base (Siempre usar estas)

#### Fade In

```css
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.element {
  animation: fadeIn 0.6s var(--ease-out);
}
```

#### Slide Up

```css
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

.element {
  animation: slideUp 0.8s var(--ease-out);
}
```

#### Scale In

```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.element {
  animation: scaleIn 0.5s var(--ease-out);
}
```

### 2. Stagger Animations

```css
.grid > div:nth-child(1) {
  animation-delay: 0.1s;
}
.grid > div:nth-child(2) {
  animation-delay: 0.2s;
}
.grid > div:nth-child(3) {
  animation-delay: 0.3s;
}
.grid > div:nth-child(4) {
  animation-delay: 0.4s;
}
```

### 3. Hover Effects

#### Lift Effect (Más usado)

```css
.card {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-2xl);
}
```

#### Scale + Lift

```css
.button:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 16px 40px rgba(14, 165, 233, 0.4);
}
```

#### Icon Rotate

```css
.icon {
  transition: all var(--transition-base);
}

.card:hover .icon {
  transform: scale(1.2) rotate(10deg);
}
```

### 4. Continuous Animations

#### Pulse (Para badges premium)

```css
@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.premium-badge {
  animation: pulse 2s ease-in-out infinite;
}
```

#### Shimmer Effect

```css
@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 200%;
  }
}

.card::after {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}
```

---

## 📱 Responsive Design

### Breakpoints Estándar

```css
/* Desktop Large: 1200px+ */
/* Desktop: 1024px - 1199px */
@media (max-width: 1024px) {
  /* Tablet adjustments */
}

/* Tablet: 768px - 1023px */
@media (max-width: 768px) {
  /* Mobile landscape adjustments */
}

/* Mobile: 480px - 767px */
@media (max-width: 480px) {
  /* Mobile portrait adjustments */
}
```

### Patrones Responsive

#### 1. Tipografía Fluida (Usar siempre)

```css
h1 {
  font-size: clamp(2rem, 5vw, 4rem);
}

h2 {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
}

p {
  font-size: clamp(0.875rem, 2vw, 1rem);
}
```

#### 2. Spacing Responsive

```css
.section {
  padding: var(--space-12);
}

@media (max-width: 768px) {
  .section {
    padding: var(--space-8);
  }
}

@media (max-width: 480px) {
  .section {
    padding: var(--space-6);
  }
}
```

#### 3. Cards Responsive

```css
.card {
  padding: var(--space-10);
  border-radius: var(--radius-3xl);
}

@media (max-width: 768px) {
  .card {
    padding: var(--space-6);
    border-radius: var(--radius-2xl);
  }
}

@media (max-width: 480px) {
  .card {
    padding: var(--space-4);
    border-radius: var(--radius-xl);
  }
}
```

---

## 💡 Ejemplos de Implementación

### Ejemplo 1: Premium Product Card

```html
<div class="bg-white rounded-xl shadow-lg p-6 product-card">
  <img src="..." alt="..." class="w-full rounded-lg mb-4" />
  <h3 class="text-xl font-bold text-slate-900 mb-2">Producto</h3>
  <p class="text-slate-600 mb-4">Descripción</p>
  <button class="btn-primary">Ver más</button>
</div>
```

```css
.product-card {
  background: white;
  border-radius: var(--radius-2xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-lg);
  border: 2px solid var(--neutral-200);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
  overflow: hidden;
}

.product-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-primary);
  transform: scaleX(0);
  transition: transform 0.4s var(--ease-out);
}

.product-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 16px 40px rgba(14, 165, 233, 0.25);
  border-color: var(--primary-300);
}

.product-card:hover::before {
  transform: scaleX(1);
}

.product-card img {
  transition: all var(--transition-base);
}

.product-card:hover img {
  transform: scale(1.05);
}

.btn-primary {
  width: 100%;
  padding: var(--space-3) var(--space-6);
  background: var(--gradient-primary);
  color: white;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-xl);
  box-shadow: 0 8px 24px rgba(14, 165, 233, 0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-primary:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(14, 165, 233, 0.4);
}
```

### Ejemplo 2: Hero Section con Pattern

```html
<div class="hero-premium">
  <div class="container mx-auto px-4 py-16">
    <h1 class="hero-title">Bienvenido</h1>
    <p class="hero-subtitle">La mejor experiencia</p>
    <button class="hero-cta">Comenzar</button>
  </div>
</div>
```

```css
.hero-premium {
  background: var(--gradient-primary);
  min-height: 60vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  box-shadow: 0 8px 32px rgba(14, 165, 233, 0.25);
}

.hero-premium::before {
  content: "";
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.5;
}

.hero-premium .container {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  font-weight: 900;
  letter-spacing: var(--letter-spacing-tight);
  color: white;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.8s var(--ease-out);
  margin-bottom: var(--space-6);
}

.hero-subtitle {
  font-size: var(--font-size-xl);
  color: rgba(255, 255, 255, 0.9);
  animation: slideUp 0.8s var(--ease-out);
  animation-delay: 0.1s;
  opacity: 0;
  animation-fill-mode: forwards;
  margin-bottom: var(--space-8);
}

.hero-cta {
  padding: var(--space-4) var(--space-10);
  background: white;
  color: var(--primary-600);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-lg);
  border-radius: var(--radius-xl);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: slideUp 0.8s var(--ease-out);
  animation-delay: 0.2s;
  opacity: 0;
  animation-fill-mode: forwards;
}

.hero-cta:hover {
  transform: translateY(-6px) scale(1.05);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
}
```

---

## ✅ Checklist para Nuevos Componentes

Cuando crees un nuevo componente, verifica:

- [ ] Usa variables CSS del sistema (NO valores hardcoded)
- [ ] Transiciones con `cubic-bezier(0.34, 1.56, 0.64, 1)`
- [ ] Hover states con `translateY` + `scale`
- [ ] Sombras dramáticas con color en hover
- [ ] Border radius mínimo `--radius-xl` (12px)
- [ ] Spacing con variables `--space-*`
- [ ] Tipografía con `clamp()` para responsive
- [ ] Animación de entrada (fadeIn, slideUp, etc.)
- [ ] Stagger delays en grids/listas
- [ ] Responsive design (1024px, 768px, 480px)
- [ ] Focus states visibles para accesibilidad
- [ ] Border de 2px en cards
- [ ] Gradient en al menos un elemento

---

## 🚫 Anti-Patrones (NO HACER)

### ❌ NO usar valores hardcoded

```css
/* MAL */
.card {
  padding: 32px;
  border-radius: 16px;
  color: #0ea5e9;
}

/* BIEN */
.card {
  padding: var(--space-8);
  border-radius: var(--radius-2xl);
  color: var(--primary-500);
}
```

### ❌ NO usar transiciones lentas

```css
/* MAL */
.button {
  transition: all 1s ease;
}

/* BIEN */
.button {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

### ❌ NO olvidar hover states

```css
/* MAL */
.card {
  box-shadow: var(--shadow-lg);
}

/* BIEN */
.card {
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-2xl);
}
```

### ❌ NO usar animaciones pesadas

```css
/* MAL - Causa reflow */
.card:hover {
  width: 110%;
  height: 110%;
}

/* BIEN - Solo transform/opacity */
.card:hover {
  transform: scale(1.05);
}
```

---

## 📚 Recursos Adicionales

### SVG Patterns para Backgrounds

```html
<!-- Usar en hero sections -->
background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
```

### Material Icons

```html
<!-- Ya integrado en el proyecto -->
<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="..." />
</svg>
```

---

## 🔄 Actualizaciones

**Última actualización**: Octubre 2025

**Próximas mejoras planificadas**:

- Dark mode support
- Animation performance optimizations
- A11y improvements
- Component library documentation

---

**¿Preguntas?** Consulta los componentes existentes como referencia:

- `shop-detail.component.css` - Ejemplo completo de hero + cards
- `rental-marketplace.component.css` - Ejemplo de grid + filters
- `station-snow-report.component.css` - Ejemplo de data cards
- `blog-article.css` - Ejemplo de typography + comments

🎨 **¡Mantén el diseño consistente y premium en todo el proyecto!**
