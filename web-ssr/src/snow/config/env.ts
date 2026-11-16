import type { ConfigStatus, ProviderId } from '../contracts/provider-contracts';

/** Ningún adapter lanza por falta de config: devuelve not_configured (05b §6). */
export function requireEnv(id: ProviderId, names: readonly string[]): ConfigStatus {
  const missingEnv = names.filter((n) => !process.env[n]);
  return { id, configured: missingEnv.length === 0, missingEnv };
}

/** Redacta API keys y credenciales de una URL antes de loguearla. */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const p of ['api_key', 'apikey', 'key', 'token']) {
      if (u.searchParams.has(p)) u.searchParams.set(p, 'REDACTED');
    }
    if (u.username) u.username = 'REDACTED';
    if (u.password) u.password = 'REDACTED';
    return u.toString();
  } catch {
    return '(invalid-url)';
  }
}

/** User-Agent obligatorio (05b §4.3). */
export function buildUserAgent(siteUrl: string, contactEmail: string): string {
  return `appski-snow/1.0 (+${siteUrl}; contact: ${contactEmail})`;
}
