/**
 * Normaliza las evidencias que los drivers escriben en el árbol (`docs/snow/snow02-evidence/`).
 *
 * Problema medido: cada ejecución de un driver regenera su JSON con timestamps y
 * duraciones distintas, de modo que el árbol cambia DURANTE la verificación
 * (ENGINE-04 lo registra como `duringDrift`) y nunca queda estable para un gate
 * determinista. Aquí se vuelca de nuevo el fichero con SOLO los campos estables
 * (nombre del check y PASS/FAIL, más el recuento agregado), que es lo que el
 * informe cita. Los tiempos y las salidas crudas siguen disponibles en la consola
 * del driver y en el log descartable.
 *
 * Uso: node scripts/snow02/normalize-evidence.mjs [dir]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? join(process.cwd(), 'docs/snow/snow02-evidence');

/** Extrae de un JSON de driver el resumen estable, o null si no es un driver. */
/**
 * Resume un JSON de driver en su forma ESTABLE (sólo check + PASS/FAIL y recuentos).
 * Devuelve `null` si el JSON no tiene la forma de un driver.
 */
export function stableSummary(data) {
  if (Array.isArray(data?.results) && typeof data?.total === 'number') {
    return {
      kind: 'driver-checks',
      total: data.total,
      passed: data.passed ?? data.results.filter((r) => r.ok).length,
      failed: data.failed ?? data.results.filter((r) => !r.ok).length,
      checks: data.results.map((r) => `${r.ok ? 'PASS' : 'FAIL'} ${r.name}`),
    };
  }
  if (Array.isArray(data?.cases) && typeof data?.total === 'number') {
    return {
      kind: 'driver-cases',
      total: data.total,
      passed: data.passed,
      failed: data.failed,
      checks: data.cases.map((c) => `${c.ok ? 'PASS' : 'FAIL'} ${c.name ?? c.label ?? ''}`.trim()),
    };
  }
  if (Array.isArray(data?.checks) && typeof data?.total === 'number') {
    return {
      kind: 'driver-cases',
      total: data.total,
      passed: data.passed,
      failed: data.failed,
      checks: data.checks.map((c) => `${c.ok ? 'PASS' : 'FAIL'} ${c.name ?? c.label ?? ''}`.trim()),
    };
  }
  return null;
}

const changed = [];
if (process.argv[1] && process.argv[1].replace(/\\\\/g,'/').endsWith('normalize-evidence.mjs')) {
for (const name of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const path = join(dir, name);
  const before = readFileSync(path, 'utf8');
  let data;
  try {
    data = JSON.parse(before);
  } catch {
    continue;
  }
  const summary = stableSummary(data);
  if (summary === null) continue;
  const after = `${JSON.stringify(summary, null, 2)}\n`;
  if (after !== before) {
    writeFileSync(path, after, 'utf8');
    changed.push(`${name} (${summary.passed}/${summary.total})`);
  }
}

console.log(`EVIDENCE normalized=${changed.length}${changed.length ? ` :: ${changed.join(', ')}` : ''}`);
}
