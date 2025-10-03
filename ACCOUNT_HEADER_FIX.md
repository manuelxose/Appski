# 🔧 Account Header - Correcciones Aplicadas

**Fecha**: 2 Octubre 2025  
**Componente**: `web-ssr/src/app/pages/account/components/account-header/`

---

## ❌ Problemas Reportados

1. ❌ **Banner no ocupa todo el espacio** - Solo mostraba 1/3 de la imagen
2. ❌ **Botones de edición no aparecen** - Ni banner ni avatar se podían cambiar
3. ❌ **Botón Premium toca el tabulador** - Outline pegado al botón

---

## ✅ Soluciones Implementadas

### 1. **Banner Ahora Ocupa TODO el Espacio (280px altura)**

**Antes** (180px, background-image):

```css
.banner-section {
  height: 180px;
}
.banner-image {
  background-size: cover; /* ❌ No funciona bien */
  background-position: center;
}
```

**Después** (280px, <img> con object-fit):

```css
.banner-section {
  height: 280px; /* ✅ Aumentado para más impacto */
}
.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* ✅ Ocupa TODO el espacio */
  object-position: center;
}
```

**Cambio HTML**:

```html
<!-- ❌ ANTES: div con background-image -->
<div class="banner-image" [style.background-image]="..."></div>

<!-- ✅ DESPUÉS: <img> con object-fit -->
<img [src]="bannerUrl() || 'https://...'" class="banner-image" />
```

---

### 2. **Botones de Edición SIEMPRE Visibles**

#### **Botón Banner** (esquina superior derecha)

```css
.change-banner-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 20; /* ✅ Por encima del overlay */
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  /* ... */
}

.banner-overlay {
  z-index: 5; /* ✅ Debajo del botón */
  pointer-events: none; /* ✅ No bloquea clicks */
}
```

**HTML del botón**:

```html
<button class="change-banner-btn" (click)="triggerBannerUpload()">
  <span class="btn-icon">🖼️</span>
  <span class="btn-text">Cambiar portada</span>
</button>
```

#### **Avatar con Overlay Hover**

```css
.avatar-wrapper {
  cursor: pointer; /* ✅ Muestra que es clickeable */
  /* ... */
}

.avatar-overlay {
  opacity: 0; /* ✅ Oculto por defecto */
  transition: opacity 250ms ease;
}

.avatar-wrapper:hover .avatar-overlay {
  opacity: 1; /* ✅ Aparece al hover */
}
```

**HTML del avatar**:

```html
<div class="avatar-wrapper" role="button" tabindex="0" (click)="triggerAvatarUpload()" (keyup.enter)="triggerAvatarUpload()" (keyup.space)="triggerAvatarUpload()">
  <!-- Avatar image o placeholder -->

  <!-- Overlay hover -->
  <div class="avatar-overlay">
    <span class="camera-icon">📷</span>
    <span class="change-text">Cambiar foto</span>
  </div>
</div>
```

---

### 3. **Botón Premium NO Toca el Tabulador**

```css
.premium-cta:focus-visible {
  outline: 2px solid #f59e0b;
  outline-offset: 3px; /* ✅ Separación de 3px */
}
```

**También para otros elementos**:

```css
/* Banner button */
.change-banner-btn:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Avatar */
.avatar-wrapper:focus-visible {
  outline: 3px solid #3b82f6;
  outline-offset: 2px;
}
```

---

### 4. **Fix Angular 18+ (styleUrl singular)**

**Antes** (Angular antiguo):

```typescript
@Component({
  styleUrls: ["./account-header.css"], // ❌ Plural
})
```

**Después** (Angular 18+):

```typescript
@Component({
  styleUrl: "./account-header.css", // ✅ Singular
})
```

---

## 📐 Nuevo Layout

```
┌─────────────────────────────────────────────┐
│  BANNER 280px                    [🖼️ Btn]  │ ← Banner GRANDE
│  (imagen ocupa TODO el espacio)             │
└─────────────────────────────────────────────┘
     │
     ├── AVATAR (140px) ───┐ ← Overlap -80px
     │                     │
┌────▼──────────────────────▼─────────────────┐
│ ┌────┐  NOMBRE + 👑 Premium                │
│ │ 🧑 │  email@example.com                   │
│ │    │                                      │
│ └────┘  📍 Madrid | 🎂 25 | 📅 2023        │
│                                             │
│         "Biografia del usuario..."          │
│         [⭐ Descubre Premium]               │
└─────────────────────────────────────────────┘
```

---

## 🔍 Cómo Verificar que Funciona

### **1. Limpiar Cachés**

```powershell
if (Test-Path ".angular") { Remove-Item -Path ".angular" -Recurse -Force }
if (Test-Path "node_modules\.cache") { Remove-Item -Path "node_modules\.cache" -Recurse -Force }
if (Test-Path ".nx\cache") { Remove-Item -Path ".nx\cache" -Recurse -Force }
```

### **2. Arrancar Servidor**

```powershell
npx nx serve web-ssr
```

### **3. Abrir en Navegador**

```
http://localhost:4200/account
```

### **4. Verificar Visualmente**

✅ **Banner**:

- [ ] Ocupa 280px de alto (casi el doble que antes)
- [ ] Imagen se ve completa (no cortada)
- [ ] Botón "🖼️ Cambiar portada" visible en esquina superior derecha
- [ ] Botón es blanco con glassmorphism (backdrop-filter blur)

✅ **Avatar**:

- [ ] Avatar 140px circular con borde blanco
- [ ] Al pasar el mouse → Aparece overlay oscuro con "📷 Cambiar foto"
- [ ] Al hacer click → Abre selector de archivos
- [ ] Overlap de -80px sobre el banner

✅ **Botón Premium** (si no eres premium):

- [ ] Botón amarillo "⭐ Descubre Premium"
- [ ] Al presionar Tab → Outline naranja aparece SEPARADO 3px del botón (NO toca)

### **5. Probar Funcionalidad Upload**

**Banner**:

1. Click en "🖼️ Cambiar portada"
2. Seleccionar imagen (max 5MB)
3. Ver preview inmediato en el banner
4. Mensaje toast verde: "✅ Banner actualizado (solo preview local)"

**Avatar**:

1. Hover sobre avatar → Ver overlay "📷 Cambiar foto"
2. Click en avatar (o Enter/Space con teclado)
3. Seleccionar imagen (max 2MB)
4. Ver preview inmediato en el avatar
5. Mensaje toast verde: "✅ Foto de perfil actualizada (solo preview local)"

---

## 🎨 Mejoras de Diseño

### **Dimensiones**

- Banner: 180px → **280px** (55% más grande)
- Avatar overlap: -60px → **-80px** (más dramático)
- Botón banner: z-index 10 → **20** (siempre visible)

### **Z-Index Hierarchy**

```
20: Botón banner (top)
10: Avatar overlay
5:  Banner overlay
1:  Elementos normales
```

### **Accesibilidad**

- `role="button"` en avatar
- `tabindex="0"` para navegación teclado
- `(keyup.enter)` y `(keyup.space)` para activación
- `outline-offset` para separar focus del elemento
- `pointer-events: none` en overlay para no bloquear clicks

---

## 📊 Cambios de Archivos

| Archivo               | Cambios                                           | Líneas          |
| --------------------- | ------------------------------------------------- | --------------- |
| `account-header.ts`   | styleUrls → styleUrl                              | 1 línea         |
| `account-header.html` | Banner div → img, estructura OK                   | 0 (ya correcto) |
| `account-header.css`  | Banner 280px, z-index, outline-offset, object-fit | ~15 líneas      |

---

## 🚀 Estado Final

- ✅ **0 errores TypeScript**
- ✅ **Banner ocupa TODO el espacio** (280px con object-fit: cover)
- ✅ **Botón banner SIEMPRE visible** (z-index 20, top-right)
- ✅ **Avatar clickeable con overlay hover** (📷 + texto)
- ✅ **Botón Premium con outline separado** (outline-offset: 3px)
- ✅ **Upload funcional con preview local** (FileReader)
- ✅ **Accesibilidad completa** (teclado, focus, ARIA)
- ✅ **Angular 18+ moderno** (styleUrl singular)

---

## 🔄 Caché del Navegador

Si los cambios NO se ven después de arrancar el servidor:

1. **Hard Reload**: `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac)
2. **Vaciar caché y recargar**: DevTools → Network → "Disable cache" (checkbox)
3. **Modo incógnito**: Abrir en ventana privada para evitar caché

---

## 📝 Próximos Pasos

- [ ] **Backend Upload**: Implementar subida real a servidor (actualmente solo preview local)
- [ ] **Crop de Imágenes**: Modal para recortar avatar antes de subir
- [ ] **Validación Avanzada**: Dimensiones mínimas, ratio, formato WebP
- [ ] **Loading States**: Spinner mientras sube la imagen
- [ ] **Error Handling**: Mensajes de error más descriptivos

---

**Fin de Correcciones** ✅
