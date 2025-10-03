# Push Notifications - Roadmap

## Contexto

El sistema de alertas (BLOQUE 7) actualmente funciona como componente visual en la web. **El usuario ha solicitado** que en el futuro se envíen notificaciones push tanto a dispositivos móviles como notificaciones del navegador.

## Arquitectura Propuesta

### 1. Service Worker (PWA)

La aplicación debe convertirse en una Progressive Web App con service worker registrado:

```typescript
// web-ssr/src/app/app.config.ts
import { provideServiceWorker } from "@angular/service-worker";

export const appConfig: ApplicationConfig = {
  providers: [
    provideServiceWorker("ngsw-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
```

### 2. Push Notification Service

Crear servicio dedicado para gestión de notificaciones:

```typescript
// web-ssr/src/app/services/push-notifications.service.ts
import { Injectable, inject } from "@angular/core";
import { SwPush } from "@angular/service-worker";

@Injectable({ providedIn: "root" })
export class PushNotificationsService {
  private readonly swPush = inject(SwPush);

  // Clave pública VAPID (generar en servidor)
  private readonly VAPID_PUBLIC_KEY = "YOUR_PUBLIC_VAPID_KEY";

  // Solicitar permiso al usuario
  async requestSubscription(): Promise<PushSubscription | null> {
    if (!this.swPush.isEnabled) {
      console.warn("Push notifications not available");
      return null;
    }

    try {
      const sub = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY,
      });

      // Enviar subscription al backend
      await this.sendSubscriptionToBackend(sub);

      return sub;
    } catch (err) {
      console.error("Could not subscribe to notifications", err);
      return null;
    }
  }

  private async sendSubscriptionToBackend(sub: PushSubscription): Promise<void> {
    // POST /api/push/subscribe con el objeto subscription
    await fetch("/api/push/subscribe", {
      method: "POST",
      body: JSON.stringify(sub),
      headers: { "Content-Type": "application/json" },
    });
  }

  // Mostrar notificación local (sin servidor)
  showLocalNotification(title: string, body: string, icon: string): void {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon,
        badge: "/assets/icons/icon-72x72.png",
        vibrate: [200, 100, 200],
        tag: "nieve-alert",
        requireInteraction: false,
      });
    }
  }
}
```

### 3. Integración con AlertsService

Modificar `alerts.service.ts` para enviar notificaciones:

```typescript
import { inject } from "@angular/core";
import { PushNotificationsService } from "./push-notifications.service";

export class AlertsService {
  private readonly pushService = inject(PushNotificationsService);

  addAlert(alert: Alert): void {
    this.alerts.update((alerts) => [...alerts, alert]);
    console.log("➕ Alerta añadida:", alert.id);

    // 🚀 NUEVO: Enviar notificación push
    if (alert.priority <= 2) {
      // Solo alertas importantes
      this.sendPushNotification(alert);
    }
  }

  private sendPushNotification(alert: Alert): void {
    const title = `${alert.icon} ${alert.title}`;
    const body = alert.message;
    const icon = "/assets/icons/alert-icon.png";

    // Notificación local inmediata
    this.pushService.showLocalNotification(title, body, icon);

    // TODO: Backend enviará push real a través de FCM/VAPID
  }
}
```

### 4. Backend API (Node.js / NestJS)

Endpoint para recibir subscriptions y enviar push:

```typescript
// backend/src/push/push.controller.ts
import { Controller, Post, Body } from "@nestjs/common";
import * as webpush from "web-push";

@Controller("push")
export class PushController {
  constructor() {
    // Configurar VAPID keys
    webpush.setVapidDetails("mailto:contact@nieveapp.com", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  }

  @Post("subscribe")
  async subscribe(@Body() subscription: PushSubscription) {
    // Guardar subscription en BD (asociado a usuario)
    await this.subscriptionsRepository.save(subscription);
    return { success: true };
  }

  @Post("send-alert")
  async sendAlert(@Body() payload: { alertId: string }) {
    const alert = await this.alertsService.findOne(payload.alertId);
    const subscriptions = await this.subscriptionsRepository.findAll();

    const notificationPayload = JSON.stringify({
      title: alert.title,
      body: alert.message,
      icon: "/assets/icons/alert-icon.png",
      badge: "/assets/icons/badge-72x72.png",
      data: {
        url: `/meteorologia/${alert.stationSlug}`,
        alertId: alert.id,
      },
    });

    // Enviar a todos los subscriptores
    await Promise.all(subscriptions.map((sub) => webpush.sendNotification(sub, notificationPayload).catch((err) => console.error("Push failed:", err))));

    return { sent: subscriptions.length };
  }
}
```

### 5. Service Worker (ngsw-config.json)

Configurar service worker para Angular:

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": ["/favicon.ico", "/index.html", "/manifest.webmanifest", "/*.css", "/*.js"]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": ["/assets/**", "/*.(svg|cur|jpg|jpeg|png|apng|webp|avif|gif|otf|ttf|woff|woff2)"]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-meteo",
      "urls": ["/api/meteo/**"],
      "cacheConfig": {
        "strategy": "freshness",
        "maxSize": 100,
        "maxAge": "1h"
      }
    }
  ],
  "push": {
    "showNotifications": true
  }
}
```

### 6. Manifest para PWA (manifest.webmanifest)

```json
{
  "name": "Nieve - Ski Companion",
  "short_name": "Nieve",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "display": "standalone",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

## Tipos de Notificaciones

### 1. Alertas Meteorológicas (Danger)

- **Prioridad**: Alta (inmediata)
- **Vibración**: [200, 100, 200]
- **Sonido**: Alerta crítica
- **requireInteraction**: true (no se cierra sola)
- **Ejemplo**: "⚠️ Vientos Fuertes - Rachas >60 km/h"

### 2. Alertas de Nieve (Warning)

- **Prioridad**: Media
- **Vibración**: [100, 50, 100]
- **Sonido**: Notificación estándar
- **requireInteraction**: false
- **Ejemplo**: "❄️ Nevada Prevista - 20-30cm en 48h"

### 3. Estado de Estación (Info)

- **Prioridad**: Baja
- **Vibración**: [100]
- **Sonido**: Silencioso
- **requireInteraction**: false
- **Ejemplo**: "✅ Baqueira Beret - Estación Abierta"

## Flujo de Usuario

### Primera Vez (Onboarding)

1. Usuario entra a `/meteorologia/:slug`
2. Banner de onboarding:
   ```
   📢 ¿Quieres recibir alertas meteorológicas?
   [Activar Notificaciones] [Ahora no]
   ```
3. Si acepta → Solicitar permiso del navegador
4. Si concede permiso → Guardar subscription en backend
5. Confirmar con toast: "✅ Notificaciones activadas"

### Gestión de Notificaciones

Página de configuración `/cuenta/notificaciones`:

```typescript
interface NotificationSettings {
  enabled: boolean;
  alertTypes: {
    danger: boolean; // Alertas críticas (default: true)
    warning: boolean; // Advertencias (default: true)
    info: boolean; // Información (default: false)
  };
  categories: {
    weather: boolean; // Alertas meteorológicas (default: true)
    snow: boolean; // Alertas de nieve (default: true)
    station: boolean; // Estado de estación (default: false)
    safety: boolean; // Seguridad (default: true)
  };
  stations: string[]; // Estaciones suscritas (default: todas)
  schedule: {
    enabled: boolean; // Respetar horario (default: false)
    start: string; // "08:00"
    end: string; // "22:00"
  };
}
```

## Tecnologías Requeridas

### Frontend

- ✅ Angular Service Worker (`@angular/service-worker`)
- ✅ PWA support (manifest.webmanifest)
- ❌ FCM SDK (Firebase Cloud Messaging) - opcional
- ❌ Push API (nativo del navegador) - incluido

### Backend

- ❌ `web-push` (npm package para Node.js)
- ❌ VAPID keys (generar con `web-push generate-vapid-keys`)
- ❌ Base de datos para subscriptions (MongoDB/PostgreSQL)
- ❌ Queue system (Bull/BullMQ) para envío asíncrono
- ❌ Cron jobs para alertas programadas

### Infraestructura

- ❌ HTTPS (requerido para Push API)
- ❌ Servidor con Node.js ≥16
- ❌ Redis (para queue de notificaciones)
- ❌ Monitoring (Sentry para errores de push)

## Plan de Implementación (Fases)

### Fase 1: PWA Básica (1-2 semanas)

- [ ] Configurar Angular PWA (`ng add @angular/pwa`)
- [ ] Crear manifest.webmanifest
- [ ] Generar iconos en múltiples tamaños
- [ ] Configurar ngsw-config.json
- [ ] Testing de instalación PWA

### Fase 2: Notificaciones Locales (1 semana)

- [ ] Implementar PushNotificationsService
- [ ] Solicitar permisos al usuario
- [ ] Mostrar notificaciones locales (sin servidor)
- [ ] UI para activar/desactivar notificaciones
- [ ] Testing en Chrome/Firefox/Safari

### Fase 3: Backend Push (2-3 semanas)

- [ ] Instalar web-push en backend
- [ ] Generar VAPID keys
- [ ] Endpoint POST /api/push/subscribe
- [ ] Endpoint POST /api/push/send-alert
- [ ] BD para guardar subscriptions
- [ ] Testing de envío desde servidor

### Fase 4: Integración Completa (1-2 semanas)

- [ ] Conectar AlertsService con push
- [ ] Trigger automático en nuevas alertas
- [ ] Panel de configuración de notificaciones
- [ ] Filtros por tipo/categoría/estación
- [ ] Horarios de silencio (Do Not Disturb)

### Fase 5: Mobile (Ionic) (2-3 semanas)

- [ ] Capacitor Push Notifications plugin
- [ ] FCM (Firebase) para Android
- [ ] APNs (Apple) para iOS
- [ ] Deep linking a alertas desde notificación
- [ ] Badge count en icono de app

### Fase 6: Avanzado (Opcional)

- [ ] Rich notifications (imágenes, botones)
- [ ] Acciones en notificación (Ver detalles, Descartar)
- [ ] Geolocalización (alertas cerca del usuario)
- [ ] Machine learning (predecir alertas relevantes)
- [ ] Analytics de engagement

## Testing

### Navegadores Desktop

- ✅ Chrome 90+ (soporte completo)
- ✅ Firefox 88+ (soporte completo)
- ⚠️ Safari 16+ (limitado, requiere iOS 16.4+)
- ❌ Edge (basado en Chromium, funciona)

### Mobile

- ✅ Android Chrome (soporte completo)
- ⚠️ iOS Safari (solo desde iOS 16.4, PWA required)
- ❌ iOS Chrome (usa WebKit, limitaciones de Safari)

### Casos de Test

1. **Permiso concedido** → Notificación se muestra
2. **Permiso denegado** → Mostrar banner explicativo
3. **Offline** → Notificación se guarda y muestra al conectar
4. **App cerrada** → Notificación despierta service worker
5. **Múltiples dispositivos** → Sincronización de dismissals
6. **Horario DND** → Notificaciones silenciadas
7. **Unsubscribe** → No más notificaciones

## Métricas

### KPIs a Medir

- **Permission grant rate**: % usuarios que aceptan permisos
- **Engagement rate**: % usuarios que hacen click en notificación
- **Unsubscribe rate**: % usuarios que desactivan
- **Delivery rate**: % notificaciones entregadas con éxito
- **Open rate**: % notificaciones abiertas vs enviadas

### Analytics Events

```typescript
// Trackear eventos con Google Analytics
gtag("event", "notification_permission_granted", {
  event_category: "push",
  event_label: "alerts",
});

gtag("event", "notification_clicked", {
  event_category: "push",
  event_label: alert.type,
  value: alert.priority,
});
```

## Costos Estimados

### Desarrollo

- **PWA + Notificaciones locales**: 40-60 horas
- **Backend + Push server**: 60-80 horas
- **Mobile (Capacitor + FCM)**: 40-60 horas
- **Testing + QA**: 20-30 horas
- **Total**: 160-230 horas (~1.5-2 meses)

### Infraestructura

- **Service Worker**: Gratuito (self-hosted)
- **Firebase FCM**: Gratuito (hasta 1M mensajes/día)
- **VPS para backend**: ~$20-50/mes
- **Redis**: ~$10-30/mes
- **Monitoring (Sentry)**: ~$26/mes (plan Team)

## Seguridad

### Consideraciones

1. **VAPID keys**: Nunca exponer private key en frontend
2. **Subscriptions**: Asociar a usuario autenticado
3. **Rate limiting**: Máximo X notificaciones por usuario/día
4. **Validación**: Verificar payload antes de enviar
5. **HTTPS**: Obligatorio para Push API
6. **Tokens**: Rotar subscriptions cada 90 días

## Referencias

- [MDN - Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Angular Service Worker](https://angular.dev/ecosystem/service-workers)
- [web-push npm](https://www.npmjs.com/package/web-push)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)

## Notas del Usuario

> "las alertas deben enviarse en un futuro al móvil y por notificación del navegador"

**Prioridad**: Media-Alta  
**Timeline**: Q2 2025 (después de MVP básico)  
**Blocker**: Requiere backend y HTTPS en producción  
**Nice to have**: Geolocalización, rich notifications, acciones inline
