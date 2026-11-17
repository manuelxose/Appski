import { RenderMode, ServerRoute } from "@angular/ssr";

export const serverRoutes: ServerRoute[] = [
  {
    path: "**",
    // RenderMode.Server: sin `getPrerenderParams` no se puede prerenderizar un
    // catch-all (el build pediría parámetros para infinitas rutas).
    // El estado 404 NO lo fija este modo: lo fija el componente de error con
    // RESPONSE_INIT (snow-not-found.component.ts). Comprobado en el entorno:
    // @angular/ssr 20.2 sólo expone RenderMode.Client | Server | Prerender (no
    // hay ERROR), y el motor SSR de este repo no admite middleware previo.
    renderMode: RenderMode.Server,
  },
];
