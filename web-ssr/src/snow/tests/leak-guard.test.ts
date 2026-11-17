/**
 * C25 — Guarda anti-fuga del runner in-process.
 *
 * Con `--test-isolation=none` todos los ficheros comparten un proceso. Una suite
 * que muta `process.env` o deja ficheros temporales envenena a las siguientes y
 * el primer fallo intermitente parecerá un bug del producto.
 *
 * Diseño (§2ter.3): instantánea al cargar ESTE fichero, comparación en el hook
 * `exit` del proceso. Funciona con independencia del orden de ejecución de los
 * ficheros (verificado: el orden de la CLI no determina el orden de ejecución).
 *
 * Límite declarado: sin dependencias no se detecta de forma fiable un listener
 * abierto tras `exit`; el cierre se exige por contrato (`t.after`) en cada test.
 */
import test from 'node:test';
import assert from 'node:assert';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';

const TMP = process.env['TMPDIR'] ?? process.env['TEMP'] ?? tmpdir();

const ENV0 = Object.keys(process.env).sort().join(',');
const TMP0 = new Set(safeReaddir(TMP));

/** Claves de entorno que este propio runner fija a propósito (no son fugas). */
const INTENTIONAL = new Set(['SNOW_ADMIN_TOKEN', 'AEMET_API_KEY', 'METEOFRANCE_API_KEY', 'PROTOMAPS_BASE_URL']);

function safeReaddir(d) {
  try {
    return readdirSync(d);
  } catch {
    return [];
  }
}

/** Ficheros de este runner (no cuentan como residuo). */
const OWN_PREFIXES = ['snow-c22-', 'snow-c23-', 'snow-c24-', 'snow-c26-'];

process.on('exit', () => {
  const problems = [];

  // 1. Entorno: comparar sólo claves no intencionales.
  const env1 = new Set(Object.keys(process.env));
  const env0 = new Set(ENV0.split(','));
  for (const k of env1) {
    if (!env0.has(k) && !INTENTIONAL.has(k)) problems.push(`process.env ganó '${k}'`);
  }
  for (const k of env0) {
    if (k && !env1.has(k) && !INTENTIONAL.has(k)) problems.push(`process.env perdió '${k}'`);
  }

  // 2. Temporales: ficheros nuevos que no son de este runner.
  for (const f of safeReaddir(TMP)) {
    if (TMP0.has(f)) continue;
    if (OWN_PREFIXES.some((p) => f.startsWith(p))) continue;
    problems.push(`fichero temporal residual: ${f}`);
  }

  if (problems.length) {
    console.error('LEAK_GUARD_FAIL ' + problems.join('; '));
    process.exitCode = 1;
  } else {
    console.error('LEAK_GUARD_OK');
  }
});

test('C25: el runner arranca limpio (la verificación ocurre al salir del proceso)', () => {
  assert.ok(ENV0.length > 0, 'la instantánea de entorno debe tener contenido');
});
