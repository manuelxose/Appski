# Blog Article - Dynamic Content System

## 🎯 Funcionalidad Real: Datos Dinámicos por Slug

### **Problema Resuelto**

Anteriormente, al hacer click en cualquier tarjeta de blog, **siempre se mostraban los mismos datos** del artículo default. Ahora el sistema **genera contenido específico** para cada artículo basándose en su slug.

---

## 📋 Estrategia de Carga (3 Niveles)

### **Nivel 1: Mock Específico (Artículos Destacados)**

Para artículos con contenido completo personalizado:

```
/assets/mocks/blog-article/{slug}.mock.json
```

**Ejemplo**: `guia-completa-principiantes-esqui.mock.json` (ya existe)

### **Nivel 2: Generación Dinámica ✨ (NUEVO)**

Para el resto de artículos, el servicio:

1. **Carga metadata** desde `blog-list-page.mock.json`
2. **Encuentra el artículo** por slug
3. **Genera contenido dinámico** basado en:
   - Categoría (Consejos, Destinos, Equipamiento, etc.)
   - Tags del artículo
   - Título y excerpt
4. **Crea secciones automáticas**:
   - Introducción (excerpt)
   - Secciones específicas por categoría
   - Listas de puntos clave
   - Tips relevantes
   - Conclusión

### **Nivel 3: Fallback Default**

Si todo falla, usa el template default con mensaje de error.

---

## 🔄 Flujo de Datos

```
Usuario hace click en artículo con slug "mejores-estaciones-pirineos-2024"
        ↓
blog-article.ts: ngOnInit() recibe slug de ActivatedRoute
        ↓
BlogArticleDataService.loadArticleBySlug(slug)
        ↓
┌─────────────────────────────────────────────┐
│ 1. Busca mock específico                   │
│    ❌ No existe                             │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ 2. Carga blog-list-page.mock.json          │
│    ✅ Encuentra artículo por slug           │
│    📝 Metadata completa:                    │
│       - title, excerpt, author              │
│       - category, tags                      │
│       - coverImage, views, likes            │
└─────────────────────────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ 3. generateArticleDetail(article)           │
│    ✨ Genera contenido dinámico:            │
│       - sections[] basadas en category      │
│       - tableOfContents automático          │
│       - author bio enriquecido              │
│       - metadata SEO completa               │
│       - stats calculados                    │
└─────────────────────────────────────────────┘
        ↓
Página blog-article renderiza datos ESPECÍFICOS del artículo seleccionado
```

---

## 🎨 Contenido Generado por Categoría

### **Consejos**

```typescript
- "¿Por qué es importante?"
- "Aspectos Clave" (lista)
- Tip personalizado
- Conclusión
```

### **Destinos**

```typescript
-"Características Destacadas" - "Lo Mejor del Destino"(lista) - Conclusión;
```

### **Equipamiento**

```typescript
- "Guía de Equipamiento"
- "Elementos Esenciales" (lista)
- Tip de inversión
- Conclusión
```

---

## 📊 10 Artículos Disponibles

| Slug                                    | Categoría    | Contenido        |
| --------------------------------------- | ------------ | ---------------- |
| `guia-completa-principiantes-esqui`     | Consejos     | ✅ Mock completo |
| `mejores-estaciones-pirineos-2024`      | Destinos     | ✨ Generado      |
| `equipamiento-esencial-snowboard`       | Equipamiento | ✨ Generado      |
| `seguridad-montana-consejos-esenciales` | Seguridad    | ✨ Generado      |
| `ahorrar-forfait-trucos`                | Consejos     | ✨ Generado      |
| `mejores-pistas-nivel-avanzado`         | Consejos     | ✨ Generado      |
| `preparacion-fisica-temporada-esqui`    | Consejos     | ✨ Generado      |
| `eventos-copa-mundo-esqui-2025`         | Eventos      | ✨ Generado      |
| `esqui-familia-ninos`                   | Consejos     | ✨ Generado      |
| `mejores-destinos-sierra-nevada`        | Destinos     | ✨ Generado      |

---

## 🔧 Cómo Añadir Mock Específico

Para artículos que necesiten contenido único completo:

1. Crear archivo en `/assets/mocks/blog-article/{slug}.mock.json`
2. Usar estructura de `blog-article-default.mock.json` como template
3. El servicio lo detectará automáticamente (Nivel 1)

**Ejemplo**:

```json
// /assets/mocks/blog-article/mejores-estaciones-pirineos-2024.mock.json
{
  "data": {
    "article": { ...metadata del artículo... },
    "sections": [ ...21+ secciones personalizadas... ],
    "tableOfContents": [ ...TOC específico... ],
    "relatedArticles": [ ...3 artículos relacionados... ],
    "author": { ...bio completo con social... },
    "metadata": { ...SEO data... },
    "stats": { ...views, likes, shares... }
  },
  "meta": {
    "requestedAt": "2024-10-02T10:30:00Z",
    "slug": "mejores-estaciones-pirineos-2024"
  }
}
```

---

## ✅ Validación

**Antes**: Todos los artículos mostraban "Guía Completa para Principiantes en el Esquí"

**Ahora**:

- Click en "Las Mejores Estaciones de los Pirineos" → Muestra contenido sobre Pirineos
- Click en "Equipamiento Esencial para Snowboard" → Muestra contenido sobre equipamiento
- Click en "Seguridad en la Montaña" → Muestra contenido sobre seguridad

**Cada artículo tiene**:

- ✅ Título correcto
- ✅ Excerpt correcto
- ✅ Autor correcto
- ✅ Cover image correcto
- ✅ Categoría correcta
- ✅ Tags correctos
- ✅ Views/Likes reales
- ✅ Contenido generado relevante a su categoría

---

## 🚀 Ventajas del Sistema

1. **Escalable**: 10 artículos funcionan sin crear 10 mocks completos
2. **Mantenible**: Datos centralizados en `blog-list-page.mock.json`
3. **Flexible**: Fácil añadir mocks específicos para artículos destacados
4. **Real**: Cada artículo muestra su información única
5. **SEO-Ready**: Metadata generada automáticamente por artículo

---

## 🔜 Próximos Pasos

1. **Related Articles**: Cargar artículos relacionados reales desde blog-list
2. **Images**: Generar galerías basadas en categoría
3. **Comments**: Sistema de comentarios mock
4. **Social Sharing**: URLs específicas por artículo
