#!/usr/bin/env node
/**
 * Captura fixtures REALES de Open-Meteo para los tests del adapter (SNOW-03).
 *
 * Qué hace: llama a la API pública real, guarda el cuerpo EXACTO y escribe un
 * fichero `.meta.json` con la procedencia medida (URL, instante de captura,
 * estado HTTP, content-type, sha256 del cuerpo y tamaño). No fabrica datos: si
 * la red falla, el script falla con exit 1 y NO escribe fixtures.
 *
 * Uso: node scripts/snow03/capture-open-meteo-fixtures.mjs
 *
 * Salida: web-ssr/src/snow/providers/fixtures/*.json + fixtures/PROVENANCE.json
 *
 * Nota legal: este script sólo RECOMPILA datos para el harness de test. La
 * licencia de uso en producción se registra por separado (ver t1 / Fase A); la
 * captura no implica ninguna autorización de uso comercial.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'web-ssr/src/snow/providers/fixtures');

/** Punto real de referencia: Baqueira-Beret (ES), Pirineo catalán. */
const LAT = 42.638;
const LNG = 0.766;

const CAPTURES = [
  {
    file: 'forecast-ok.json',
    label: 'forecast-ok',
    url:
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${LAT}&longitude=${LNG}` +
      '&hourly=temperature_2m,wind_speed_10m,precipitation,snowfall,weather_code' +
      '&current=temperature_2m,wind_speed_10m,weather_code' +
      '&forecast_days=2&timezone=UTC',
  },
  {
    file: 'forecast-minimal.json',
    label: 'forecast-minimal',
    url:
      'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${LAT}&longitude=${LNG}` +
      '&hourly=temperature_2m&forecast_days=1&timezone=UTC',
  },
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

async function capture(spec) {
  const res = await fetch(spec.url, {
    headers: { 'user-agent': 'appski-snow/1.0 (fixture-capture)' },
  });
  if (!res.ok) {
    throw new Error(`${spec.label}: HTTP ${res.status} (no se escribe fixture)`);
  }
  const text = await res.text();
  JSON.parse(text); // valida JSON antes de guardar
  writeFileSync(join(OUT, spec.file), text, 'utf8');
  return {
    label: spec.label,
    file: spec.file,
    url: spec.url,
    capturedAt: new Date().toISOString(),
    httpStatus: res.status,
    contentType: res.headers.get('content-type'),
    bytes: Buffer.byteLength(text, 'utf8'),
    sha256: sha256(text),
  };
}

const main = async () => {
  mkdirSync(OUT, { recursive: true });
  const records = [];
  for (const spec of CAPTURES) {
    // Secuencial a propósito: respeta el servicio y mantiene el orden estable.
    records.push(await capture(spec));
    console.log(`CAPTURED ${spec.label} http=200 bytes=${records.at(-1).bytes}`);
  }
  const provenance = {
    note:
      'Fixtures grabadas de la API real de Open-Meteo. Replay exacto en tests; ' +
      'ningún valor está inventado. La captura NO concede ni implica licencia de uso.',
    capturedAt: new Date().toISOString(),
    coordinate: { lat: LAT, lng: LNG, note: 'Baqueira-Beret (ES)' },
    records,
  };
  writeFileSync(join(OUT, 'PROVENANCE.json'), JSON.stringify(provenance, null, 2), 'utf8');
  console.log(`OK ${records.length}/${CAPTURES.length} fixtures + PROVENANCE.json`);
};

main().catch((error) => {
  console.error(`FAIL capture: ${error.message}`);
  process.exit(1);
});
