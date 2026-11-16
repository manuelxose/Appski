import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CANDIDATES = ['.ts', '.mjs', '.js', '/index.ts', '/index.mjs', '/index.js'];

/**
 * Hook de RESOLUCIÓN (solo `resolve`, sin `load`): el *type stripping* /
 * `--experimental-transform-types` de Node ya se encarga de transformar el
 * `.ts`; aquí solo se añade lo que el resolver ESM no hace:
 *   - extensión opcional en imports relativos (`'../chain/chain'`), y
 *   - importar un directorio resuelve a su `index.ts` (`'./snow/server'`).
 */
export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith('.') || specifier.startsWith('/');
  if (!isRelative) return nextResolve(specifier, context);

  const base = context.parentURL
    ? new URL(specifier, context.parentURL)
    : new URL(specifier, 'file://' + process.cwd() + '/');

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const code = err?.code;
    const recoverable = code === 'ERR_MODULE_NOT_FOUND' || code === 'ERR_UNSUPPORTED_DIR_IMPORT';
    if (!recoverable) throw err;

    // 1) Directorio → probar index.* primero.
    try {
      if (existsSync(fileURLToPath(base)) && statSync(fileURLToPath(base)).isDirectory()) {
        for (const ext of ['/index.ts', '/index.mjs', '/index.js']) {
          const url = new URL(base.href.replace(/\/$/, '') + ext);
          if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
        }
      }
    } catch {
      /* cae al bucle de extensiones */
    }

    // 2) Extensiones explícitas y luego index.* dentro de la ruta.
    for (const ext of CANDIDATES) {
      const url = new URL(base.href.replace(/\/$/, '') + ext);
      if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
    }

    throw err;
  }
}
