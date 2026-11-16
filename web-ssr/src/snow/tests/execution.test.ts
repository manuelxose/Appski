/**
 * P1 — Comprobación que EJECUTA el módulo en lugar de leer su texto.
 *
 * Motivo: los tres falsos positivos de `t9` (import.meta.dirname, "Abierto" vs
 * "Abierta", T7 autoincriminándose) y la fragilidad de los 49 imports sin
 * extensión son todos de la misma clase: **una aserción textual no puede
 * distinguir "el código hace X" de "el código contiene el texto X"**.
 *
 * P1 no inspecciona fuente: importa realmente el grafo de módulos y llama a las
 * funciones. Si el grafo no resolviera, este fichero no cargaría — el propio
 * fallo es la evidencia.
 */
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Si estos imports fallan, el grafo de módulos está roto: P1 lo demuestra
// ejecutando, no buscando cadenas.
import { FALLBACK_CHAINS } from '../chain/fallback-chains.ts';
import { createSnowRouter, SNOW_ROUTES } from '../server/index.ts';
import { makeProvenance } from '../providers/provenance.ts';
import { toProvenanceDto } from '../server/http-mapping.ts';
import { authorizationFor } from '../providers/authorizations.ts';

const FIXED = new Date('2026-11-16T12:00:00.000Z');

const HERE = fileURLToPath(import.meta.url);
const SNOW_SRC = join(HERE, '../..');

test('P1: el grafo de módulos de snow/ se resuelve y es ejecutable', () => {
  // Si el import del encabezado hubiera fallado, este test no se ejecutaría.
  assert.strictEqual(typeof createSnowRouter, 'function', 'createSnowRouter debe ser invocable');
  assert.strictEqual(typeof SNOW_ROUTES.length, 'number', 'SNOW_ROUTES debe ser enumerable');
  assert.ok(SNOW_ROUTES.length >= 10, `SNOW_ROUTES debe tener rutas reales, tiene ${SNOW_ROUTES.length}`);
  assert.strictEqual(typeof toProvenanceDto, 'function', 'toProvenanceDto debe ser invocable');
});

test('P1: createSnowRouter EJECUTA y devuelve un router montable', () => {
  // Se invoca de verdad (no se busca su nombre en el texto).
  const router = createSnowRouter(SNOW_SRC, () => FIXED);
  assert.ok(router, 'createSnowRouter debe devolver algo');
  assert.strictEqual(typeof router.handle, 'function', 'el resultado debe ser un handler Express montable');
});

test('P1: makeProvenance produce la tupla completa al EJECUTARSE', () => {
  const auth = authorizationFor('editorial-stations');
  assert.ok(auth, 'authorizationFor debe devolver una autorización para una fuente conocida');

  const prov = toProvenanceDto(
    makeProvenance(
      'editorial-stations',
      'allowed',
      FIXED.toISOString(),
      FIXED.toISOString(),
      FIXED,
      auth,
      null,
    ),
  );

  for (const f of ['source', 'observedAt', 'updatedAt', 'status', 'licenseStatus', 'freshness', 'authorization', 'attribution']) {
    assert.ok(f in prov, `la procedencia ejecutada no expone '${f}'`);
  }
  assert.strictEqual(prov.freshness, 0, 'con reloj fijo y misma fecha, freshness debe ser 0');
  assert.strictEqual(prov.source, 'editorial-stations');
});

test('P1: FALLBACK_CHAINS se evalúa como dato real, no como texto', () => {
  // Un grep encontraría 'image: []' en un comentario; esto evalúa el valor.
  assert.deepStrictEqual([...FALLBACK_CHAINS.image], [], 'image debe ser un array vacío en tiempo de ejecución');
  assert.ok(Array.isArray(FALLBACK_CHAINS['snow-depth']), 'snow-depth debe ser array en runtime');
  assert.deepStrictEqual([...FALLBACK_CHAINS['snow-depth']], ['editorial-report']);
});

test('P1: todo módulo de snow/ es importable individualmente (grafo completo)', async () => {
  const walk = (d, out = []) => {
    for (const e of readdirSync(d)) {
      const f = join(d, e);
      if (statSync(f).isDirectory()) {
        if (!/tests|node_modules/.test(f)) walk(f, out);
      } else if (e.endsWith('.ts') && !/\.test\.ts$/.test(e)) {
        out.push(f);
      }
    }
    return out;
  };

  const files = walk(SNOW_SRC);
  assert.ok(files.length >= 15, `se esperaban >=15 módulos, hay ${files.length}`);

  const failures = [];
  for (const f of files) {
    try {
      await import(f.startsWith('file:') ? f : `file://${f}`);
    } catch (err) {
      // Sólo cuenta como fallo de grafo si NO es un error de resolución ya cubierto.
      failures.push(`${f}: ${err?.code ?? ''} ${String(err?.message).slice(0, 120)}`);
    }
  }
  assert.deepStrictEqual(failures, [], `módulos no importables:\n${failures.join('\n')}`);
});
