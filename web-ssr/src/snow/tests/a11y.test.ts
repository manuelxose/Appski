/**
 * A1/A2/A3 — Regresiones de accesibilidad WCAG 2.2 AA contra las PLANTILLAS REALES.
 *
 * Todo es E/S de fichero y aritmética de color: no necesita navegador, por tanto
 * es viable bajo C1c (sin hijos con pipe).
 *
 * A1 1.4.4 Resize Text   — el viewport no puede impedir el zoom
 * A2 1.4.3 Contrast      — colores del estado abierto/cerrado ≥ 4.5:1
 * A2 1.4.1 Use of Color  — el estado lleva glifo + PALABRA, no sólo color
 * A3 2.1.1 Keyboard      — filtros/orden del explorer son controles nativos
 */
import test from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Ancla robusta: la ruta del propio fichero de test, no el cwd ni dirname.
// <repo>/web-ssr/src/snow/tests/a11y.test.ts  ->  web-ssr/src
const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(HERE, '../../..');
const INDEX_HTML = join(ROOT, 'index.html');
const UI_DIR = join(ROOT, 'app/snow/client/ui');
const PAGES_DIR = join(ROOT, 'app/snow/pages');

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (e.endsWith('.ts') || e.endsWith('.html')) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------- A1 (1.4.4)

test('A1: el viewport NO impide el zoom (1.4.4 Resize Text)', () => {
  const html = readFileSync(INDEX_HTML, 'utf8');
  const m = html.match(/<meta[^>]+name=["']viewport["'][^>]*>/i);
  assert.ok(m, 'debe existir un meta viewport');

  const tag = m[0];
  assert.ok(!/user-scalable\s*=\s*(no|0)/i.test(tag), `viewport bloquea el zoom: ${tag}`);

  // maximum-scale < 2 limita el zoom de forma efectiva (1.4.4 exige hasta 200%).
  const maxScale = tag.match(/maximum-scale\s*=\s*([\d.]+)/i);
  if (maxScale) {
    assert.ok(
      Number(maxScale[1]) >= 2,
      `maximum-scale=${maxScale[1]} impide llegar al 200% requerido por 1.4.4`,
    );
  }
});

test('A1: ninguna plantilla de snow introduce un viewport que bloquee el zoom', () => {
  const files = [...walk(UI_DIR), ...walk(PAGES_DIR)];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    assert.ok(
      !/user-scalable\s*=\s*(no|0)/i.test(src),
      `${f} contiene user-scalable=no (el patrón de la referencia que NO copiamos)`,
    );
  }
});

// ---------------------------------------------------------------- A2 (1.4.3)

/** Luminancia relativa WCAG 2.x */
function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

test('A2: contraste de la insignia de estado ≥ 4.5:1 (1.4.3)', () => {
  const src = readFileSync(join(UI_DIR, 'status-badge.component.ts'), 'utf8');

  // Extrae pares background/color de cada bloque de estado.
  const pairs = [];
  const re = /background:\s*(var\([^)]*,\s*(#[0-9a-fA-F]{3,8})\)|#[0-9a-fA-F]{3,8})[\s\S]{0,120}?color:\s*(var\([^)]*,\s*(#[0-9a-fA-F]{3,8})\)|#[0-9a-fA-F]{3,8})/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const bg = (m[2] ?? m[1]).replace(/var\([^,]*,\s*|\s*\)/g, '');
    const fg = (m[4] ?? m[3]).replace(/var\([^,]*,\s*|\s*\)/g, '');
    if (/^#[0-9a-fA-F]{3,8}$/.test(bg) && /^#[0-9a-fA-F]{3,8}$/.test(fg)) pairs.push({ bg, fg });
  }

  assert.ok(pairs.length >= 2, `se esperaban >=2 pares de color de estado, encontrados ${pairs.length}`);

  for (const { bg, fg } of pairs) {
    const r = contrastRatio(bg, fg);
    assert.ok(r >= 4.5, `contraste insuficiente: ${fg} sobre ${bg} = ${r.toFixed(2)}:1 (< 4.5:1)`);
  }
});

test('A2: el estado NO se comunica sólo por color (1.4.1 Use of Color)', () => {
  const src = readFileSync(join(UI_DIR, 'status-badge.component.ts'), 'utf8');

  // Debe haber glifo/símbolo Y texto, además del color.
  assert.ok(/aria-label/.test(src), 'la insignia necesita aria-label para lectores de pantalla');
  assert.ok(
    /[▲●◆■✓✕◐⛔⏸]|glyph|icon/i.test(src),
    'la insignia debe incluir un glifo además del color',
  );

  // La PALABRA sale por interpolación del mapa LABEL (p. ej. "Abierta"/"Cerrada"),
  // no como literal en la plantilla. Se comprueba el binding y el diccionario reales.
  assert.ok(
    /\{\{\s*label\(\)\s*\}\}/.test(src),
    'la plantilla debe pintar la etiqueta textual ({{ label() }}), no sólo el color',
  );
  const labels = src.match(/:\s*"[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+"\s*,?/g) ?? [];
  assert.ok(
    labels.length >= 2,
    `el diccionario LABEL debe declarar al menos 2 estados con palabra; encontrados ${labels.length}`,
  );
  assert.ok(
    /(Abierta|Cerrada|Parcial|Sin servicio|Previsión)/.test(src),
    'el diccionario debe contener las palabras de estado en español',
  );
});

// ---------------------------------------------------------------- A3 (2.1.1)

test('A3: los controles del explorer son botones/inputs nativos, no div con click', () => {
  const files = [...walk(PAGES_DIR), ...walk(UI_DIR)];
  const offenders = [];

  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    // `<div ... (click)=` o `<span ... (click)=` sin role/tabindex: no operable por teclado.
    const re = /<(div|span)\b[^>]*\(click\)[^>]*>/gi;
    let m;
    while ((m = re.exec(src)) !== null) {
      const tag = m[0];
      const hasA11y = /role=["'](button|link)["']/.test(tag) && /tabindex=/.test(tag);
      if (!hasA11y) offenders.push(`${f}: ${tag.trim().slice(0, 90)}`);
    }
  }

  assert.deepStrictEqual(offenders, [], `controles no operables por teclado:\n${offenders.join('\n')}`);
});

test('A3: no hay tabindex positivo (rompe el orden de tabulación, 2.4.3)', () => {
  const files = [...walk(PAGES_DIR), ...walk(UI_DIR)];
  const offenders = [];
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const m = src.match(/tabindex=["']([1-9]\d*)["']/g);
    if (m) offenders.push(`${f}: ${m.join(', ')}`);
  }
  assert.deepStrictEqual(offenders, [], `tabindex positivo encontrado:\n${offenders.join('\n')}`);
});

test('A3: coexistencia de dos reglas anteriores: el badge no usa (click) sin teclado', () => {
  const src = readFileSync(join(UI_DIR, 'status-badge.component.ts'), 'utf8');
  // La insignia es presentacional: no debe ser clickable sin semántica.
  if (/\(click\)/.test(src)) {
    assert.ok(
      /role=["'](button|link)["']/.test(src) && /tabindex=/.test(src),
      'si la insignia es clickable, necesita role y tabindex',
    );
  }
});
