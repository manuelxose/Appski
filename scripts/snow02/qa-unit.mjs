/**
 * Ejecuta la suite `node:test` de un módulo en DOS mitades equilibradas y agregados.
 *
 * Motivo (medido): dentro del runner confined de ENGINE-04 una invocación de 15
 * ficheros termina con exit 1 mientras las mismas 15 repartidas en dos grupos
 * terminan 0; un único fichero termina 0. Emparentar menos ficheros por proceso
 * `node --test` mantiene la cobertura idéntica y elimina ese fallo de entorno.
 *
 * Uso: node scripts/snow02/qa-unit.mjs
 *
 * `leak-guard` compara el contenido de %TEMP% al arrancar y al salir: si el TEMP
 * compartido del host recibe ficheros de procesos ajenos durante la ejecución, el
 * guard falla sin que falle ningún test. Por eso cada mitad se ejecuta con su
 * propio `TEMP`/`TMP`, tal como exige qa/README.md.
 */
import { spawnNoPipe } from './lib/child.mjs';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dirIdx = process.argv.indexOf('--out');
const testsDir = dirIdx >= 0 ? process.argv[dirIdx + 1] : join(process.cwd(), 'web-ssr/src/snow/tests');

// Orden determinista: la lista se ordena y se reparte por alternancia, de modo que
// la composición de cada mitad no depende del orden del sistema de ficheros.
const files = readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.ts'))
  .sort()
  .map((name) => join(testsDir, name).replace(`${process.cwd()}\\`, '').replace(`${process.cwd()}/`, ''));

if (files.length === 0) {
  console.error(`qa-unit: no hay ficheros de test en ${testsDir}`);
  process.exit(2);
}

const halves = [files.filter((_, i) => i % 2 === 0), files.filter((_, i) => i % 2 === 1)];

const COMMON = ['--experimental-transform-types', '--import', './scripts/snow/ts-loader.mjs', '--test', '--test-isolation=none'];

const codes = [];
for (const [index, half] of halves.entries()) {
  // TEMP/TMP propios de esta mitad: el leak-guard sólo debe ver lo que crea ella.
  const temp = mkdtempSync(join(tmpdir(), `snow02-unit-${index + 1}-`));
  const child = spawnNoPipe(process.execPath, [...COMMON, ...half], {
    cwd: process.cwd(),
    env: { ...process.env, TEMP: temp, TMP: temp },
    stdio: 'ignore',
  });
  const info = await child.wait();
  codes.push(info.error ? `ERR:${info.error}` : (info.code ?? 1));
  const failed = info.code !== 0;
  // Traza de UNA línea: la captura del runner confined puede recortar la salida.
  console.log(`UNIT half${index + 1} exit=${codes[index]} files=${half.length} tmp=${info.error ?? info.code}`);
  if (failed) {
    // Repetición diagnóstica ANTES de borrar el TEMP de la mitad, con la salida
    // reenviada a un fichero (el sandbox deniega pipes para capturarla).
    const keep = mkdtempSync(join(tmpdir(), `snow02-unit-trace-${index + 1}-`));
    const trace = join(keep, `half${index + 1}.log`);
    const retry = spawnNoPipe(process.execPath, [...COMMON, ...half], {
      cwd: process.cwd(),
      env: { ...process.env, TEMP: temp, TMP: temp },
      stdio: 'ignore',
      logPath: trace,
    });
    const again = await retry.wait();
    let excerpt = '';
    try {
      const raw = readFileSync(trace, 'utf8');
      const lines = raw.split(/\r?\n/u).map((line) => line.trim());
      const summary = lines.filter((line) => line.startsWith('ℹ ') || line.includes('LEAK_GUARD')).join(' ');
      const failing = lines
        .filter((line) => /^\u2716|^not ok|failing tests|^Error:|^AssertionError|ERR_/u.test(line))
        .slice(0, 5)
        .join(' ; ');
      const tail = raw.trim().split(/\r?\n/u).slice(-5).join(' / ');
      excerpt = `summary=${summary.slice(0, 200)} :: failing=${failing.slice(0, 300)} :: tail=${tail.slice(-260)}`;
    } catch (error) {
      excerpt = `(sin traza: ${error?.code ?? error})`;
    }
    console.log(`UNIT half${index + 1} retry=${again.code} trace=${excerpt.slice(0, 500)}`);
  }
}

console.log(`UNIT summary ${codes.map((c, i) => `h${i + 1}=${c}`).join(' ')} total=${files.length}`);
process.exit(codes.every((code) => code === 0) ? 0 : 1);
