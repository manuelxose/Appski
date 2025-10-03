# Quick Start - Sección Tiempo

## 🚀 Arranque Rápido (3 pasos)

### 1. Iniciar servidor

```bash
cd nieve
npx nx serve web-ssr
```

### 2. Abrir en navegador

```
http://localhost:4200/estacion/baqueira-beret/tiempo
```

### 3. Explorar

- Ver datos actuales en tab "Ahora"
- Cambiar entre cotas (Base / Media / Cima)
- Navegar por tabs (72h, Nieve, Webcams, Radar)
- Click en webcam para ver modal
- Probar en responsive (F12 → Device Toolbar)

---

## 📁 Archivos Principales

```
web-ssr/src/app/pages/weather/
├── tiempo-page.component.ts       ← Página principal
├── services/
│   ├── meteo-state.store.ts       ← Estado global
│   └── meteo-data.service.ts      ← Obtención de datos
├── components/                     ← 10 componentes UI
│   ├── tiempo-now-panel/          ← Observación actual
│   ├── tiempo-snow-summary/       ← Resumen nieve
│   ├── tiempo-forecast-charts/    ← Gráficos 72h
│   └── ...
├── models/meteo.models.ts         ← Tipos TypeScript
└── utils/units.util.ts            ← Conversiones

src/assets/mocks/                   ← Datos mock
├── now.mock.json
├── forecast72.mock.json
├── webcams.mock.json
└── radar.mock.json
```

---

## 🔧 Comandos Útiles

```bash
# Servir app
npx nx serve web-ssr

# Build producción
npx nx build web-ssr --configuration=production

# Linting
npm run lint

# Tests (cuando estén implementados)
npx nx test web-ssr
```

---

## 📚 Documentación Completa

- **README.md** - Documentación técnica completa
- **MIGRATION_TO_HTTP.md** - Guía para conectar backend real
- **IMPLEMENTATION_SUMMARY.md** - Resumen de implementación

---

## 🎯 Pruebas Rápidas

### Test 1: Ver datos actuales

1. Ir a `/estacion/baqueira-beret/tiempo`
2. Ver panel "Ahora" con temperatura y métricas
3. ✅ Debería mostrar -5.2°C, 18 cm nieve 24h

### Test 2: Cambiar cotas

1. Click en "Base", "Media", "Cima"
2. Ver cómo cambian los datos del forecast
3. ✅ Cada cota muestra datos diferentes

### Test 3: Navegar tabs

1. Click en cada tab: Ahora / 72h / Nieve / Webcams / Radar
2. Ver contenido específico en cada uno
3. ✅ Transición smooth con animación

### Test 4: Modal webcam

1. Tab "Webcams"
2. Click en cualquier webcam
3. Ver modal fullscreen
4. Cerrar con X o Escape
5. ✅ Modal responsive y accesible

### Test 5: Responsive

1. F12 → Device Toolbar
2. Cambiar a iPhone / iPad / Desktop
3. Ver cómo se adapta el layout
4. ✅ Grid responsive, tabs optimizados

---

## 🐛 Troubleshooting

### Error: "Cannot GET /assets/mocks/..."

**Solución**: Asegurar que los archivos mock existen en `src/assets/mocks/`

### Error: "Component not found"

**Solución**: Ejecutar `npm install` y reiniciar servidor

### Layout roto

**Solución**: Verificar que TailwindCSS está configurado en `tailwind.config.js`

### Datos no cargan

**Solución**: Abrir DevTools → Network, verificar que los JSONs se cargan (200 OK)

---

## 💡 Tips

### Modificar datos mock

Editar archivos en `src/assets/mocks/` y recargar página

### Cambiar estación

Cambiar URL: `/estacion/[tu-slug]/tiempo`
(Los mocks no cambian, pero la arquitectura está lista)

### Añadir nuevo componente

```bash
# Crear en components/
# Seguir patrón standalone + signals
# Exportar en index.ts
```

### Debug estado

```typescript
// En DevTools Console:
const store = document.querySelector("app-tiempo-page")?._viewContainerRef?._data;
console.log(store.store.getSnapshot());
```

---

## 🎨 Personalización

### Cambiar colores

Editar variables CSS en `web-ssr/src/styles.css`:

```css
--primary-500: #3b82f6; /* Azul principal */
--success-500: #10b981; /* Verde */
```

### Cambiar animaciones

Buscar `cubic-bezier(0.34, 1.56, 0.64, 1)` y modificar valores

### Añadir idioma

1. Editar `meteo-data.service.ts` → `setLanguage('en')`
2. Añadir traducciones en componentes

---

## 🚢 Deploy a Producción

### 1. Migrar a HTTP

Seguir guía en `MIGRATION_TO_HTTP.md`

### 2. Build

```bash
npx nx build web-ssr --configuration=production
```

### 3. Verificar bundle

```bash
# Ver tamaño de chunks
ls -lh dist/web-ssr/browser/
```

### 4. Deploy

```bash
# Copiar dist/ a servidor
# Configurar Nginx/Apache para SSR
```

---

## 📞 Soporte

- **README.md** - Documentación completa
- **GitHub Issues** - Reportar bugs
- **Team Lead** - Consultas de arquitectura

---

**Happy Coding! 🎿❄️**
