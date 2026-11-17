import { timingSafeEqual } from 'node:crypto';
import express from 'express';

/**
 * Auth mínima de la API de admin. Fail-closed: sin `SNOW_ADMIN_TOKEN` definido
 * todo `/admin/**` responde 401. El cliente ve SIEMPRE el mismo cuerpo 401; la
 * distinción (token no configurado vs no válido) queda en el log del servidor.
 */
export function adminApiMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  const token = process.env['SNOW_ADMIN_TOKEN'];
  if (!token) {
    console.warn('snow admin: SNOW_ADMIN_TOKEN not set; admin API disabled (401)');
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  const header = req.headers['authorization'] ?? '';
  if (!safeEqual(header, `Bearer ${token}`)) {
    console.warn('snow admin: rejected request (token mismatch)');
    res.status(401).json({ error: 'unauthorized' });
    return;
  }
  next();
}

/** Comparación en tiempo constante; la longitud se comprueba antes (no filtra contenido). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
