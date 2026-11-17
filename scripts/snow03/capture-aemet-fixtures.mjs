#!/usr/bin/env node
/**
 * SNOW-03b t1 — Captura FIXTURES del formato de AEMET OpenData para los tests.
 *
 * ⚠️ ESTADO ACTUAL: las fixtures AEMET de este repo son **SINTÉTICAS**. No se
 * pudieron capturar contra el servicio real porque en la sesión del ingeniero
 * `AEMET_API_KEY` no estaba presente (ver `docs/snow/snow03-evidence/AEMET-NOTES.md`).
 *
 * Este script produce fixtures con el formato EXACTO que el adapter debe aceptar
 * —incluidas las trampas medidas del servicio: ISO-8859-15 con BOM, 200 con
 * cuerpo vacío, 429 con cuerpo HTML, `-99` como centinela de «no dato», pares
 * `{value, periodo}` y `estadoCielo` con `value` vacío en el primer tramo del
 * día— para que los tests puedan ejercitar esos caminos sin red.
 *
 * Cuando exista clave y cuota, el driver REAL (`verify-aemet.mjs`) captura
 * respuestas auténticas en `docs/snow/snow03-evidence/real/`; una vez validado
 * el formato, estas fixtures pueden re-generarse desde esas respuestas reales
 * marcando `synthetic: false`.
 *
 * Uso: node scripts/snow03/capture-aemet-fixtures.mjs
 * Salida: web-ssr/src/snow/providers/fixtures/aemet/*.json + PROVENANCE.json
 *
 * Sin claves: este script NO habla con AEMET.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'web-ssr/src/snow/providers/fixtures/aemet');

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Codificador ISO-8859-15 mínimo (sólo los caracteres que usan las fixtures). */
const LATIN15_EXTRA = {
  '€': 0xa4, 'Š': 0xa6, 'š': 0xa8, 'Ž': 0xb4, 'ž': 0xb8, 'Œ': 0xbc, 'œ': 0xbd, 'Ÿ': 0xbe,
};

/** UTF-8 → bytes ISO-8859-15. Falla si un código no es representable. */
export function encodeIsoLatin15(text) {
  const out = [];
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code < 0x100 && !(code >= 0x80 && code < 0xa0)) {
      out.push(code);
    } else if (LATIN15_EXTRA[ch] !== undefined) {
      out.push(LATIN15_EXTRA[ch]);
    } else {
      throw new Error(`carácter no representable en ISO-8859-15: ${JSON.stringify(ch)}`);
    }
  }
  return Buffer.from(out);
}

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);

/** Cuerpo AEMET realista: <BOM> + JSON en ISO-8859-15 (sin acentos raros fuera de latin-1). */
const synthBody = (value) => Buffer.concat([BOM, encodeIsoLatin15(JSON.stringify(value))]);

/** Helper de par {value, periodo}. `periodo` es "HH" o, en `dia[]`, "YYYY-MM-DD". */
const p = (value, periodo) => ({ value, periodo });

/** Día 0 (hoy): 24 tramos horarios con la estructura real de AEMET. */
function dia0(fecha) {
  const horas = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
  // estadoCielo[0] tiene value "" en el servicio real (tramo ya pasado).
  const estadoCielo = horas.map((h, i) =>
    h === '12'
      ? { value: '24n', descripcion: 'Nuboso con lluvia escasa', periodo: h }
      : i === 0
        ? { value: '', descripcion: '', periodo: h }
        : { value: '11', descripcion: 'Despejado', periodo: h },
  );
  return {
    fecha,
    orto: '08:02',
    ocaso: '17:41',
    temperatura: horas.map((h) => p(String(-2 + (Number(h) % 7)), h)),
    sensTermica: horas.map((h) => p(String(-5 + (Number(h) % 7)), h)),
    humedadRelativa: horas.map((h) => p(String(60 + (Number(h) % 30)), h)),
    precipitacion: horas.map((h) => p(h === '12' || h === '13' ? '0.2' : '0', h)),
    probPrecipitacion: horas.map((h) => p(h === '12' ? '65' : '5', h)),
    // nieve: ESPESOR acumulado en cm (no precipitación) — el adapter NO lo usa como precipMm.
    nieve: horas.map((h) => p(h === '12' ? '2' : '0', h)),
    // `probNieve` REAL: un único valor DIARIO (`periodo: "1901"`), NO por hora.
    // El adapter lo sirve en `bundle.daily`, no repartido entre las horas.
    probNieve: [p('70', '1901')],
    // `vientoAndRachaMax` con la forma REAL medida (defecto 2): la velocidad va
    // dentro de `velocidad[]` y la racha en el `value` de la entrada hermana.
    vientoAndRachaMax: horas.flatMap((h) => [
      { direccion: [h < 12 ? 'N' : 'SO'], velocidad: [String(10 + (Number(h) % 5) * 3)], periodo: h },
      { value: String(18 + Number(h)), periodo: h },
    ]),
    estadoCielo,
  };
}

/** Día 1: 24 tramos sin precipitación (bundle de varios días). */
function dia1(fecha) {
  const horas = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
  return {
    fecha,
    orto: '08:03',
    ocaso: '17:41',
    temperatura: horas.map((h) => p(String(-1 + (Number(h) % 6)), h)),
    sensTermica: horas.map((h) => p(String(-4 + (Number(h) % 6)), h)),
    humedadRelativa: horas.map((h) => p('70', h)),
    precipitacion: horas.map((h) => p('0', h)),
    probPrecipitacion: horas.map((h) => p('0', h)),
    nieve: horas.map((h) => p('0', h)),
    probNieve: [p('0', '1901')],
    vientoAndRachaMax: horas.flatMap((h) => [
      { direccion: ['N'], velocidad: ['12'], periodo: h },
      { value: String(15 + (Number(h) % 4)), periodo: h },
    ]),
    estadoCielo: horas.map((h) => ({ value: '11', descripcion: 'Despejado', periodo: h })),
  };
}

/** Documento `[0]` completo tal como lo sirve el endpoint `datos` de AEMET. */
function payload({ id, nombre, provincia, elaborado, dias }) {
  return [
    {
      origen: {
        productor: 'Agencia Estatal de Meteorología (AEMET)',
        web: 'http://www.aemet.es',
        language: 'es',
        copyright: 'AEMET',
        notaLegal: 'http://www.aemet.es/es/nota_legal',
      },
      elaborado,
      nombre,
      provincia,
      id,
      version: 1.0,
      prediccion: { dia: dias },
    },
  ];
}

const FIXTURES = [
  {
    file: 'meta-ok.json',
    label: 'meta-ok',
    note: 'Paso 1 OK: sobre {estado, datos, metadatos} con la URL del segundo paso.',
    body: synthBody({
      descripcion: 'exito',
      estado: 200,
      datos: 'https://opendata.aemet.es/opendata/sh/aaaaaaaaaaaaaaaa',
      metadatos: 'https://opendata.aemet.es/opendata/sh/bbbbbbbbbbbbbbbb',
    }),
  },
  {
    file: 'prediccion-2dias.json',
    label: 'prediccion-2dias',
    note:
      'Paso 2: [0].prediccion.dia[] de 2 días × 24 horas, ISO-8859-15 con BOM. ' +
      '`fecha` usa la forma REAL medida contra el servicio (2026-11-16T00:00:00, hora LOCAL sin sufijo).',
    body: synthBody(
      payload({
        id: '25025',
        nombre: 'Naut Aran',
        provincia: 'Lleida',
        elaborado: '2026-11-17T05:40:12',
        dias: [dia0('2026-11-17T00:00:00'), dia1('2026-11-18T00:00:00')],
      }),
    ),
  },
  {
    file: 'prediccion-periodos-especiales.json',
    label: 'prediccion-periodos-especiales',
    note:
      'Paso 2 con los periodos ESPECIALES de AEMET: "1901" (todo el día) en precipitación y ' +
      'probNieve, junto a horas normales. El adapter debe descartarlos con motivo, no inventar la hora.',
    body: synthBody(
      payload({
        id: '25025',
        nombre: 'Naut Aran',
        provincia: 'Lleida',
        elaborado: '2026-11-17T05:40:12',
        dias: [
          {
            fecha: '2026-11-17T00:00:00',
            temperatura: [p('1', '00'), p('9', '13')],
            precipitacion: [p('0.4', '1901'), p('0', '00')],
            probPrecipitacion: [p('80', '1901'), p('10', '00')],
            // probNieve REAL: sólo DIARIA (periodo "1901").
            probNieve: [p('55', '1901')],
            nieve: [p('3', '1901')],
            estadoCielo: [
              { value: '24', descripcion: 'Nuboso con lluvia', periodo: '1901' },
              { value: '11', descripcion: 'Despejado', periodo: '00' },
            ],
          },
        ],
      }),
    ),
  },
  {
    file: 'prediccion-centinelas.json',
    label: 'prediccion-centinelas',
    note: 'Paso 2 con -99 (centinela de «no dato») en temperatura, viento y racha.',
    body: synthBody(
      payload({
        id: '25025',
        nombre: 'Naut Aran',
        provincia: 'Lleida',
        elaborado: '2026-11-17T05:40:12',
        dias: [
          {
            fecha: '2026-11-17T00:00:00',
            temperatura: [p('-99', '00'), p('3', '01')],
            sensTermica: [p('-99', '00'), p('1', '01')],
            humedadRelativa: [p('-99', '00'), p('80', '01')],
            precipitacion: [p('0', '00'), p('0', '01')],
            probPrecipitacion: [p('-99', '00'), p('0', '01')],
            nieve: [p('-99', '00'), p('0', '01')],
            // probNieve DIARIA (forma real) con el centinela -99.
            probNieve: [p('-99', '1901')],
            // viento/racha con la forma REAL: velocidad[] + `value` hermano.
            vientoAndRachaMax: [
              { direccion: ['-99'], velocidad: ['-99'], periodo: '00' },
              { value: '-99', periodo: '00' },
              { direccion: ['N'], velocidad: ['7'], periodo: '01' },
              { value: '-99', periodo: '01' },
            ],
            estadoCielo: [
              { value: '-99', descripcion: '', periodo: '00' },
              { value: '11', descripcion: 'Despejado', periodo: '01' },
            ],
          },
        ],
      }),
    ),
  },
  {
    file: 'paso2-vacio.json',
    label: 'paso2-vacio',
    note: 'Paso 2 con cuerpo VACÍO (sin clave el servicio responde 200 y 0 bytes).',
    body: Buffer.alloc(0),
  },
  {
    file: 'paso2-roto.json',
    label: 'paso2-roto',
    note: 'Paso 2 con JSON truncado (respuesta cortada a mitad de escritura).',
    body: Buffer.concat([BOM, encodeIsoLatin15('[{"id":"25025","prediccion":{"dia":[{"fecha"')]),
  },
  {
    file: 'paso2-objeto.json',
    label: 'paso2-objeto',
    note: 'Paso 2 con JSON válido pero de forma distinta (no es el array que se espera).',
    body: synthBody({ error: 404, descripcion: 'No hay datos que satisfagan esos criterios' }),
  },
];

/** Fixtures HTML/texto fuera de JSON: se guardan TAL CUAL (bytes, no JSON). */
const RAW_FIXTURES = [
  {
    file: 'ratelimit-429.html',
    label: 'ratelimit-429',
    note: 'Cuerpo HTML LITERAL del 429 de AEMET (límite de uso alcanzado).',
    body: Buffer.from(
      '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Límite de uso</title></head>' +
        '<body><h1>Se ha alcanzado uno de los límites de uso</h1>' +
        '<p>Vuelva a intentarlo el próximo minuto.</p></body></html>',
      'latin1',
    ),
  },
];

const main = () => {
  mkdirSync(OUT, { recursive: true });
  const records = [];

  for (const spec of [...FIXTURES, ...RAW_FIXTURES]) {
    writeFileSync(join(OUT, spec.file), spec.body);
    records.push({
      label: spec.label,
      file: spec.file,
      synthetic: true,
      note: spec.note,
      bytes: spec.body.length,
      sha256: sha256(spec.body),
      hasBom: spec.body.length >= 3 && spec.body[0] === 0xef && spec.body[1] === 0xbb && spec.body[2] === 0xbf,
    });
    console.log(`WROTE ${spec.file} bytes=${spec.body.length}`);
  }

  const provenance = {
    note:
      '⚠️ FIXTURES SINTÉTICAS. Reproducen el formato documentado y las trampas MEDIDAS de ' +
      'AEMET OpenData (ISO-8859-15 con BOM, 200 con cuerpo vacío, 429 con cuerpo HTML, ' +
      'centinela -99, pares {value, periodo}, racha como array plano). No son respuestas ' +
      'capturadas: no había clave AEMET en la sesión que las generó. Los valores NO son un ' +
      'pronóstico real y NO deben usarse como dato operativo; sólo como contrato de formato ' +
      'para el adapter. Generadas por scripts/snow03/capture-aemet-fixtures.mjs.',
    synthetic: true,
    generatedAt: new Date().toISOString(),
    records,
  };
  writeFileSync(join(OUT, 'PROVENANCE.json'), `${JSON.stringify(provenance, null, 2)}\n`, 'utf8');
  console.log(`OK ${records.length} fixtures + PROVENANCE.json (synthetic:true)`);
};

main();
