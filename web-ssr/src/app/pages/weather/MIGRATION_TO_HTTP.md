# Guía de Migración: De Mocks a API HTTP Real

Esta guía explica cómo migrar el sistema de datos meteorológicos desde mocks locales (JSON) a un backend HTTP real usando `HttpClient` de Angular.

## 🎯 Objetivo

Reemplazar las llamadas `fetch()` a archivos JSON locales por peticiones HTTP a endpoints REST del backend, manteniendo la misma interfaz de tipos y contratos.

---

## 📋 Pasos de Migración

### 1. Configurar Entorno y URL Base

Crear archivo de configuración de entorno si no existe:

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: "https://api.nieve.app", // URL del backend
  apiVersion: "v1",
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: "https://api.nieve.app",
  apiVersion: "v1",
};
```

### 2. Actualizar `MeteoDataService`

Reemplazar `fetch()` por `HttpClient`:

**ANTES** (Mocks):

```typescript
import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: "root" })
export class MeteoDataService {
  private lang = signal<"es" | "en">("es");

  async getNow(stationSlug: string): Promise<MeteoNow> {
    const res = await fetch("/assets/mocks/now.mock.json");
    return res.json();
  }
}
```

**DESPUÉS** (HTTP):

```typescript
import { Injectable, signal, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, firstValueFrom } from "rxjs";
import { environment } from "../../../environments/environment";
import { MeteoNow, MeteoForecast, WebcamItem, RadarInfo } from "../models/meteo.models";

@Injectable({ providedIn: "root" })
export class MeteoDataService {
  private readonly http = inject(HttpClient);
  private lang = signal<"es" | "en">("es");

  private readonly baseUrl = `${environment.apiUrl}/${environment.apiVersion}/meteo`;

  // Método síncrono (devuelve Promise)
  async getNow(stationSlug: string): Promise<MeteoNow> {
    const params = new HttpParams().set("lang", this.lang());
    const url = `${this.baseUrl}/${stationSlug}/now`;
    return firstValueFrom(this.http.get<MeteoNow>(url, { params }));
  }

  // O método reactivo (devuelve Observable)
  getNowObservable(stationSlug: string): Observable<MeteoNow> {
    const params = new HttpParams().set("lang", this.lang());
    const url = `${this.baseUrl}/${stationSlug}/now`;
    return this.http.get<MeteoNow>(url, { params });
  }

  async getForecast72(stationSlug: string): Promise<MeteoForecast> {
    const params = new HttpParams().set("hours", "72").set("lang", this.lang());
    const url = `${this.baseUrl}/${stationSlug}/forecast`;
    return firstValueFrom(this.http.get<MeteoForecast>(url, { params }));
  }

  async getWebcams(stationSlug: string): Promise<WebcamItem[]> {
    const url = `${this.baseUrl}/${stationSlug}/webcams`;
    return firstValueFrom(this.http.get<WebcamItem[]>(url));
  }

  async getRadar(stationSlug: string): Promise<RadarInfo> {
    const url = `${this.baseUrl}/${stationSlug}/radar`;
    return firstValueFrom(this.http.get<RadarInfo>(url));
  }

  setLanguage(lang: "es" | "en"): void {
    this.lang.set(lang);
  }
}
```

### 3. Crear Interceptor HTTP

Crear interceptor para manejar:

- Autenticación (tokens)
- Caché con ETag
- Manejo de errores global
- Logging

```typescript
// src/app/interceptors/meteo-http.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";

export const meteoHttpInterceptor: HttpInterceptorFn = (req, next) => {
  // 1. Añadir headers de autenticación
  const token = localStorage.getItem("auth_token");
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  // 2. Añadir Accept-Language
  const langReq = authReq.clone({
    setHeaders: {
      "Accept-Language": "es-ES",
      "Content-Type": "application/json",
    },
  });

  // 3. Manejar respuesta
  return next(langReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error("HTTP Error:", error);

      // Mapear errores HTTP a mensajes amigables
      let userMessage = "Error al cargar datos meteorológicos";

      if (error.status === 0) {
        userMessage = "No se puede conectar al servidor";
      } else if (error.status === 404) {
        userMessage = "Estación no encontrada";
      } else if (error.status === 429) {
        userMessage = "Demasiadas peticiones. Inténtalo más tarde";
      } else if (error.status >= 500) {
        userMessage = "Error del servidor. Inténtalo más tarde";
      }

      return throwError(() => new Error(userMessage));
    })
  );
};
```

**Registrar interceptor en `app.config.ts`:**

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { meteoHttpInterceptor } from "./interceptors/meteo-http.interceptor";
import { routes } from "./app.routes";

export const appConfig: ApplicationConfig = {
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideHttpClient(withInterceptors([meteoHttpInterceptor]))],
};
```

### 4. Implementar Caché con ETag

Para optimizar peticiones repetidas:

```typescript
// src/app/interceptors/cache.interceptor.ts
import { HttpInterceptorFn, HttpResponse } from "@angular/common/http";
import { tap } from "rxjs";

const cache = new Map<string, { etag: string; response: HttpResponse<any> }>();

export const cacheInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo cachear GETs
  if (req.method !== "GET") {
    return next(req);
  }

  // Obtener caché existente
  const cached = cache.get(req.url);
  if (cached) {
    // Añadir If-None-Match header
    req = req.clone({
      setHeaders: {
        "If-None-Match": cached.etag,
      },
    });
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const etag = event.headers.get("ETag");
        if (etag) {
          cache.set(req.url, { etag, response: event });
        }
      }
    })
  );
};
```

### 5. Manejo de Reintentos

Implementar lógica de reintentos automáticos:

```typescript
import { HttpInterceptorFn } from "@angular/common/http";
import { retry, timer } from "rxjs";

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) => {
        // Retry exponencial: 1s, 2s, 4s
        if (error.status >= 500) {
          return timer(Math.pow(2, retryCount - 1) * 1000);
        }
        throw error;
      },
    })
  );
};
```

---

## 🔌 Endpoints Esperados del Backend

El backend debe exponer estos endpoints:

### GET `/v1/meteo/:stationSlug/now`

**Descripción:** Observación meteorológica actual fusionada.

**Query Params:**

- `lang` (opcional): `es` | `en`

**Response:**

```json
{
  "stationSlug": "baqueira-beret",
  "observedAt": "2025-10-01T09:00:00Z",
  "tempC": -5.2,
  "windKmh": 28,
  "gustKmh": 55,
  "visibilityM": 3200,
  "snowBaseCm": 90,
  "snowTopCm": 155,
  "snowNew24hCm": 18,
  "iso0M": 1100,
  "condition": "snow",
  "confidence": 0.86,
  "sources": [{ "name": "GFS", "weight": 0.5 }]
}
```

### GET `/v1/meteo/:stationSlug/forecast`

**Descripción:** Previsión meteorológica por cotas.

**Query Params:**

- `hours` (requerido): `24` | `48` | `72` | `168`
- `lang` (opcional): `es` | `en`

**Response:**

```json
{
  "stationSlug": "baqueira-beret",
  "hours": 72,
  "snowAccu24hCm": 12,
  "snowAccu72hCm": 28,
  "points": [
    {
      "validAt": "2025-10-01T10:00:00Z",
      "cota": "base",
      "tempC": -1.2,
      "windKmh": 20,
      "gustKmh": 35,
      "precipSnowCm": 0.8,
      "precipRainMm": 0,
      "iso0M": 1200,
      "cloudPct": 90,
      "visibilityM": 2500,
      "confidence": 0.8
    }
  ]
}
```

### GET `/v1/meteo/:stationSlug/webcams`

**Descripción:** Lista de webcams activas de la estación.

**Response:**

```json
[
  {
    "id": "w1",
    "name": "Cima Bonaigua",
    "snapshotUrl": "https://cdn.nieve.app/webcams/w1/latest.jpg",
    "lastUpdated": "2025-10-01T08:52:00Z",
    "freshnessS": 480,
    "active": true,
    "cota": "top"
  }
]
```

### GET `/v1/meteo/:stationSlug/radar`

**Descripción:** Información de radar meteorológico.

**Response:**

```json
{
  "tileUrlTemplate": "https://tiles.nieve.app/radar/{z}/{x}/{y}.png",
  "timestamp": "2025-10-01T08:55:00Z",
  "legendUrl": "https://cdn.nieve.app/radar-legend.png",
  "centerLat": 42.7,
  "centerLon": 0.9,
  "zoom": 9
}
```

---

## 🧪 Testing con Mocks y HTTP

Mantener ambos sistemas durante la migración:

```typescript
// src/app/pages/weather/services/meteo-data.service.ts
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: "root" })
export class MeteoDataService {
  private readonly http = inject(HttpClient);
  private readonly useMocks = !environment.production; // Flag para dev

  async getNow(stationSlug: string): Promise<MeteoNow> {
    if (this.useMocks) {
      // Modo desarrollo: usar mocks
      const res = await fetch("/assets/mocks/now.mock.json");
      return res.json();
    } else {
      // Producción: usar HTTP
      const url = `${this.baseUrl}/${stationSlug}/now`;
      return firstValueFrom(this.http.get<MeteoNow>(url));
    }
  }
}
```

---

## ✅ Checklist de Migración

- [ ] Crear archivos de entorno con `apiUrl`
- [ ] Instalar `@angular/common/http` si no está
- [ ] Actualizar `MeteoDataService` con `HttpClient`
- [ ] Crear interceptor de autenticación
- [ ] Crear interceptor de caché (ETag)
- [ ] Crear interceptor de reintentos
- [ ] Registrar interceptores en `app.config.ts`
- [ ] Probar endpoints con Postman/Insomnia
- [ ] Validar respuestas contra interfaces TypeScript
- [ ] Manejar errores de red
- [ ] Implementar loading states
- [ ] Testing E2E con backend real
- [ ] Configurar CORS en backend
- [ ] Documentar autenticación (API keys, JWT, etc.)

---

## 🚀 Ejemplo Completo

Ver implementación completa en:

- `src/app/pages/weather/services/meteo-data.service.ts` (comentarios al final del archivo)
- Seguir el patrón de otros servicios HTTP de la app

---

## 🔒 Seguridad

1. **Nunca exponer tokens en el código**

   ```typescript
   // ❌ MAL
   const token = "hardcoded-token-123";

   // ✅ BIEN
   const token = environment.apiKey; // En environment, no en Git
   ```

2. **Validar respuestas del servidor**

   ```typescript
   if (!response.stationSlug || response.stationSlug !== stationSlug) {
     throw new Error("Invalid response from server");
   }
   ```

3. **Usar HTTPS siempre en producción**

---

## 📚 Referencias

- [Angular HttpClient](https://angular.io/guide/http)
- [HTTP Interceptors](https://angular.io/guide/http-interceptor-use-cases)
- [RxJS Operators](https://rxjs.dev/guide/operators)
- [ETag y HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
