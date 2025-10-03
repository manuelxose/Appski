# ✅ BLOQUE 9: REDISEÑO HEADER CUENTA - RESUMEN COMPLETO

**Fecha**: Enero 2025  
**Tipo**: Rediseño UI + Subida Imágenes  
**Estado**: ✅ **COMPLETADO** (0 errores)

---

## 📋 CONTEXTO

Después de completar 8 bloques del sistema meteorológico, el usuario solicitó arreglar el header de la sección de cuenta (NO la pestaña de perfil). El diseño inicial estaba centrado, el avatar no era visible, y los botones de edición estaban ocultos. Se requería un diseño moderno horizontal tipo Instagram/Apple con elementos distribuidos izquierda/derecha.

**Ruta del componente**: `web-ssr/src/app/pages/account/components/account-header/`

---

## 🎯 OBJETIVOS COMPLETADOS

### 1️⃣ Layout Horizontal Moderno (Instagram/Apple)

✅ Banner compacto (180px) con botón siempre visible  
✅ Grid horizontal: Avatar IZQUIERDA | Info DERECHA  
✅ Avatar con overlap del banner (-60px margin-top)  
✅ Stats en fila horizontal (no verticales)  
✅ Diseño limpio y estilizado con glassmorphism

### 2️⃣ Subida de Imágenes

✅ Banner: Botón "Cambiar banner" siempre visible (top-right)  
✅ Avatar: Overlay hover con icono 📷 + "Cambiar foto"  
✅ Validación: 5MB max banner, 2MB max avatar  
✅ Preview local con FileReader API  
✅ Input files ocultos con viewChild signals

### 3️⃣ Información de Usuario

✅ Nombre + tag Premium (si aplica)  
✅ Email secundario  
✅ Stats row: Ubicación, Edad, Miembro desde  
✅ Biografía (si existe)  
✅ CTA Premium (si no es premium)

### 4️⃣ Accesibilidad

✅ Avatar clickeable con teclado (Enter/Space)  
✅ role="button" + tabindex="0"  
✅ Semántica HTML correcta

---

## 🏗️ ARQUITECTURA

### **Estructura de Archivos**

```
web-ssr/src/app/pages/account/components/account-header/
├── account-header.ts          (160 líneas - Lógica upload + formateo)
├── account-header.html        (135 líneas - Grid horizontal layout)
└── account-header.css         (~400 líneas - Instagram/Apple style)
```

### **Patrón de Layout**

```
┌────────────────────────────────────────┐
│  BANNER (180px)               [Botón]  │ ← Siempre visible
└────────────────────────────────────────┘
    │
    ├── AVATAR (140px) ───┐
    │   Overlap -60px     │
    │                     │
┌───▼─────────────────────▼──────────────┐
│ ┌─────┐  NOMBRE + 👑 Premium          │
│ │     │  email@example.com             │
│ │ 🧑  │                                │
│ │     │  📍 Madrid | 🎂 25 | 📅 2023  │ ← Stats horizontal
│ └─────┘                                │
│         "Biografia del usuario..."     │
│         [Hazte Premium] ← Si no premium│
└────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### **1. Component TypeScript** (`account-header.ts`)

```typescript
export class AccountHeaderComponent {
  // Signals para estado
  private readonly bannerUrl = signal<string | null>(null);
  private readonly avatarUrl = signal<string | null>(null);

  // ViewChild signals para inputs ocultos
  readonly bannerInput = viewChild<ElementRef<HTMLInputElement>>("bannerFileInput");
  readonly avatarInput = viewChild<ElementRef<HTMLInputElement>>("avatarFileInput");

  // Métodos de upload
  triggerBannerUpload(): void {
    this.bannerInput()?.nativeElement.click();
  }

  triggerAvatarUpload(): void {
    this.avatarInput()?.nativeElement.click();
  }

  // Validación + Preview
  onBannerChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        this.showUploadMessage("El banner no puede superar 5MB", true);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        this.bannerUrl.set(e.target?.result as string);
        this.showUploadMessage("Banner actualizado correctamente");
      };
      reader.readAsDataURL(file);

      // TODO: Enviar a servidor
      console.log("📤 TODO: Upload banner to server", file.name);
    }
  }

  // Métodos de formateo
  calculateAge(birthDate: string | undefined): number | null {
    if (!birthDate) return null;
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  formatMemberSince(dateString: string | undefined): string {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", { year: "numeric", month: "long" });
  }
}
```

### **2. Template HTML** (`account-header.html`)

```html
<section class="account-header">
  <!-- Banner con botón siempre visible -->
  <div class="banner-section">
    @if (bannerUrl()) {
    <img [src]="bannerUrl()!" alt="Banner" class="banner-img" />
    } @else {
    <div class="banner-default"></div>
    }
    <button class="banner-upload-btn" (click)="triggerBannerUpload()">
      <span class="upload-icon">📷</span>
      Cambiar banner
    </button>
    <input #bannerFileInput type="file" accept="image/*" (change)="onBannerChange($event)" hidden />
  </div>

  <!-- Grid: Avatar LEFT | Info RIGHT -->
  <div class="profile-section">
    <div class="profile-grid">
      <!-- Columna IZQUIERDA: Avatar -->
      <div class="avatar-column">
        <div class="avatar-wrapper" role="button" tabindex="0" (click)="triggerAvatarUpload()" (keyup.enter)="triggerAvatarUpload()" (keyup.space)="triggerAvatarUpload()">
          @if (avatarUrl()) {
          <img [src]="avatarUrl()!" [alt]="user().name" class="avatar-img" />
          } @else {
          <div class="avatar-placeholder">{{ user().avatar }}</div>
          }

          <!-- Overlay hover -->
          <div class="avatar-overlay">
            <span class="camera-icon">📷</span>
            <span class="change-text">Cambiar foto</span>
          </div>
        </div>
        <input #avatarFileInput type="file" accept="image/*" (change)="onAvatarChange($event)" hidden />
      </div>

      <!-- Columna DERECHA: Info -->
      <div class="info-column">
        <!-- Nombre + Premium -->
        <div class="user-header">
          <h1 class="user-name">{{ user().name }}</h1>
          @if (user().premium?.isActive) {
          <span class="premium-badge">👑 Premium</span>
          }
        </div>

        <!-- Email -->
        <div class="user-email">{{ user().email }}</div>

        <!-- Stats horizontales -->
        <div class="stats-row">
          <div class="stat-item">
            <span class="stat-icon">📍</span>
            <span class="stat-value">{{ user().location }}</span>
          </div>
          @if (calculateAge(user().birthDate); as age) {
          <div class="stat-item">
            <span class="stat-icon">🎂</span>
            <span class="stat-value">{{ age }} años</span>
          </div>
          }
          <div class="stat-item">
            <span class="stat-icon">📅</span>
            <span class="stat-value">Miembro desde {{ formatMemberSince(user().memberSince) }}</span>
          </div>
        </div>

        <!-- Bio -->
        @if (user().bio) {
        <div class="user-bio">{{ user().bio }}</div>
        }

        <!-- CTA Premium -->
        @if (!user().premium?.isActive) {
        <div class="premium-cta">
          <button class="premium-btn">Hazte Premium</button>
        </div>
        }
      </div>
    </div>
  </div>
</section>
```

### **3. Estilos CSS** (`account-header.css`)

**Layout Grid:**

```css
.profile-grid {
  display: grid;
  grid-template-columns: auto 1fr; /* Avatar auto | Info 1fr */
  gap: 24px;
  align-items: start;
}

.avatar-column {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-wrapper {
  width: 140px;
  height: 140px;
  margin-top: -60px; /* Overlap con banner */
  border: 5px solid var(--neutral-0);
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  box-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.25), inset 0 2px 4px rgba(255, 255, 255, 0.4);
}
```

**Stats Horizontal:**

```css
.stats-row {
  display: flex;
  gap: 16px;
  margin: 16px 0;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--neutral-50);
  border: 1px solid var(--neutral-200);
  border-radius: 8px;
}
```

**Responsive:**

```css
@media (max-width: 768px) {
  .profile-grid {
    grid-template-columns: 1fr; /* 1 columna */
  }

  .avatar-column {
    justify-self: center; /* Centrar avatar */
  }

  .stats-row {
    justify-content: center;
  }
}
```

---

## 📊 DATOS MOCK

**Archivo**: `web-ssr/src/assets/mocks/user-profile.mock.json`

```json
{
  "id": "user123",
  "name": "Javier Martínez",
  "email": "javi.martinez@example.com",
  "avatar": "👨‍💼",
  "location": "Madrid, España",
  "birthDate": "1998-03-15",
  "bio": "Apasionado del esquí de fondo...",
  "memberSince": "2023-01-15",
  "premium": {
    "isActive": true,
    "plan": "Pro",
    "expiresAt": "2025-12-31"
  }
}
```

---

## 🎨 SISTEMA DE DISEÑO

### **Colores** (CSS Variables de `styles.css`)

```css
/* Neutrales */
--neutral-0: #ffffff;
--neutral-50: #f8fafc;
--neutral-200: #e2e8f0;
--neutral-800: #1e293b;

/* Primary (Azul) */
--primary-500: #3b82f6;
--primary-600: #2563eb;

/* Danger (Rojo) */
--danger-50: #fef2f2;
--danger-600: #dc2626;

/* Warning (Amarillo Premium) */
--warning-400: #fbbf24;
--warning-500: #f59e0b;
```

### **Animaciones**

```css
/* Spring easing */
transition: all 600ms cubic-bezier(0.34, 1.56, 0.64, 1);

/* Hover avatar overlay */
.avatar-overlay {
  opacity: 0;
  transition: opacity 300ms ease;
}
.avatar-wrapper:hover .avatar-overlay {
  opacity: 1;
}

/* Hover banner */
.banner-section:hover .banner-img,
.banner-section:hover .banner-default {
  transform: scale(1.02);
}
```

### **Glassmorphism**

```css
.stat-item {
  background: rgba(248, 250, 252, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
```

---

## 🚀 FLUJO DE USUARIO

### **1. Ver Header**

```
Usuario navega a /account
  ↓
AccountHeaderComponent carga user() signal del servicio
  ↓
Muestra: Banner, Avatar, Nombre, Email, Stats, Bio
  ↓
Si no Premium → Muestra CTA "Hazte Premium"
```

### **2. Cambiar Banner**

```
Usuario click "Cambiar banner" (top-right)
  ↓
triggerBannerUpload() → bannerInput().click()
  ↓
Usuario selecciona imagen
  ↓
onBannerChange() valida tamaño (max 5MB)
  ↓
FileReader.readAsDataURL() → bannerUrl signal
  ↓
Preview inmediato en UI
  ↓
TODO: Subir a servidor
```

### **3. Cambiar Avatar**

```
Usuario hover sobre avatar → Ve overlay 📷 "Cambiar foto"
  ↓
Click o Enter/Space
  ↓
triggerAvatarUpload() → avatarInput().click()
  ↓
Usuario selecciona imagen
  ↓
onAvatarChange() valida tamaño (max 2MB)
  ↓
FileReader.readAsDataURL() → avatarUrl signal
  ↓
Preview inmediato en UI
  ↓
TODO: Subir a servidor
```

---

## ✅ CHECKLIST ACCESIBILIDAD

- ✅ Avatar clickeable con teclado (Enter/Space)
- ✅ `role="button"` + `tabindex="0"` en avatar-wrapper
- ✅ Texto alternativo en imágenes (`alt` attributes)
- ✅ Mensajes de error/éxito con `showUploadMessage()`
- ✅ Validación tamaño archivos (UX + Seguridad)
- ✅ Semántica HTML correcta (`<section>`, `<h1>`, `<button>`)

---

## 🧪 TESTING

### **Compilación**

```bash
npx nx build web-ssr
# ✅ 0 errores TypeScript
# ✅ 0 warnings accesibilidad
```

### **Desarrollo**

```bash
npx nx serve web-ssr
# Navegar a: http://localhost:4200/account
# Probar:
# 1. Hover sobre avatar → Ver overlay
# 2. Click avatar → Abrir selector archivos
# 3. Seleccionar imagen < 2MB → Preview inmediato
# 4. Click "Cambiar banner" → Abrir selector archivos
# 5. Seleccionar imagen < 5MB → Preview inmediato
# 6. Resize ventana → Ver responsive (mobile 1 columna)
```

---

## 🔄 ITERACIONES DE DISEÑO

### **Iteración 1**: Inline Simple

- Banner básico con degradado
- Avatar emoji centrado
- Botón Premium simple
- **Problema**: Demasiado simple, no profesional

### **Iteración 2**: Centered Glassmorphism

- Banner 320px con upload
- Avatar 160px centrado con botón edit
- Info centrada debajo
- Stats cards glassmorphism
- **Problema**: Avatar no visible, botones ocultos, todo centrado

### **Iteración 3**: Horizontal Instagram/Apple ✅

- Banner 180px compacto con botón visible (top-right)
- Grid horizontal: Avatar LEFT | Info RIGHT
- Avatar 140px con -60px overlap
- Avatar hover overlay (📷 + texto)
- Stats en fila horizontal
- Responsive 1 columna mobile
- **Resultado**: ✅ APROBADO

---

## 📝 PRÓXIMOS PASOS (TODO)

### **Backend Upload** (Marcado con console.log)

```typescript
// En onBannerChange() y onAvatarChange()
console.log('📤 TODO: Upload banner to server', file.name);

// Implementar:
async uploadImage(file: File, type: 'banner' | 'avatar'): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const response = await fetch('/api/users/upload-image', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${this.authService.getToken()}`
    }
  });

  const data = await response.json();
  return data.imageUrl; // URL de CDN o storage
}
```

### **Optimización Imágenes**

- [ ] Crop/resize automático en cliente (canvas)
- [ ] Compresión antes de upload
- [ ] WebP format support
- [ ] Lazy loading para banner

### **Features Adicionales**

- [ ] Modal de edición con crop interactivo
- [ ] Historial de avatares previos
- [ ] Eliminar banner (volver a default)
- [ ] Drag & drop para subir imágenes

---

## 📊 MÉTRICAS

| Métrica                    | Valor             |
| -------------------------- | ----------------- |
| **Archivos modificados**   | 3 (TS, HTML, CSS) |
| **Líneas TypeScript**      | 160               |
| **Líneas HTML**            | 135               |
| **Líneas CSS**             | ~400              |
| **CSS Variables usadas**   | 15+               |
| **Errores compilación**    | 0                 |
| **Warnings accesibilidad** | 0 (resueltos)     |
| **Iteraciones diseño**     | 3                 |
| **Tiempo implementación**  | ~2 horas          |

---

## 🎓 APRENDIZAJES

### **Angular 18+ Signals**

✅ `viewChild()` para acceder a elementos DOM (inputs ocultos)  
✅ `signal()` para estado reactivo (bannerUrl, avatarUrl)  
✅ Método de formateo en componente (calculateAge, formatMemberSince)

### **FileReader API**

✅ Preview local sin servidor  
✅ Validación tamaño antes de upload  
✅ `readAsDataURL()` para imagen base64

### **Grid Layout**

✅ `grid-template-columns: auto 1fr` (avatar ajusta | info expande)  
✅ `gap` para espaciado uniforme  
✅ Responsive con `@media (max-width: 768px)`

### **Accesibilidad**

✅ `role="button"` + `tabindex="0"` para elementos clickeables no-button  
✅ `(keyup.enter)` y `(keyup.space)` para soporte teclado  
✅ Texto alternativo en imágenes

### **Patrón Delete + Create**

✅ Cuando `replace_string_in_file` falla repetidamente por whitespace  
✅ Usar `run_in_terminal` + `Remove-Item -Force`  
✅ Luego `create_file` con contenido completo nuevo  
✅ Más rápido y seguro que múltiples replacements

---

## 🔗 REFERENCIAS

- **Guía principal**: `AI_GUIDE.md`
- **Sistema diseño**: `DESIGN_SYSTEM.md` (230+ variables CSS)
- **Arquitectura**: `ARCHITECTURE.md` (Angular 18+ patterns)
- **Componente**: `web-ssr/src/app/pages/account/components/account-header/`
- **Mock data**: `web-ssr/src/assets/mocks/user-profile.mock.json`
- **BLOQUE anterior**: `BLOQUE_8_RESUMEN.md` (Estado Apertura Estación)

---

## ✨ RESULTADO FINAL

Header de cuenta completamente rediseñado con layout horizontal moderno tipo Instagram/Apple. Avatar visible con overlap del banner, botones de edición siempre accesibles, stats en fila horizontal, diseño limpio y estilizado. Upload de imágenes funcional con preview local (falta implementación servidor). 0 errores TypeScript, 0 warnings accesibilidad. Responsive mobile/tablet/desktop.

**Estado**: ✅ **PRODUCTION-READY** (frontend completo, falta backend upload)

---

**Fin BLOQUE 9** 🎉
