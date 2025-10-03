import { CanActivateFn } from "@angular/router";

/**
 * Guard para proteger rutas que requieren autenticación
 * MODO DESARROLLO: Siempre permite el acceso para visualización
 *
 * En producción, implementar lógica de autenticación:
 * - Verificar token/sesión
 * - Redirigir a /login si no está autenticado
 */
export const authGuard: CanActivateFn = () => {
  // ✅ DESARROLLO: Siempre permitir acceso para visualización
  return true;
};

/**
 * Guard para proteger rutas de administrador
 * MODO DESARROLLO: Siempre permite el acceso para visualización
 *
 * En producción, implementar lógica de autorización:
 * - Verificar autenticación
 * - Verificar rol de administrador
 * - Redirigir según corresponda
 */
export const adminGuard: CanActivateFn = () => {
  // ✅ DESARROLLO: Siempre permitir acceso para visualización
  return true;
};
