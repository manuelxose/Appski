#!/usr/bin/env node
/**
 * Captura fixtures REALES de los cuatro feeds MeteoAlarm (SNOW-03).
 *
 * Ruta verificada: `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-<pais>`.
 * La ruta `/api/v1/warnings/feeds-XX` responde 404 y NO se usa.
 *
 * Guarda el cuerpo EXACTO + metadatos de procedencia (URL, instante, HTTP,
 * content-type, sha256, tamaño, nº de <entry>, y la cláusula `<rights>` literal
 * del propio feed). No fabrica datos: si un feed falla, el script falla y no
 * escribe fixtures para ese país.
 *
 * Uso: node scripts/snow03/capture-meteoalarm-fixtures.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'web-ssr/src/snow/providers/fixtures');

const COUNTRIES = [
  { code: 'ES', slug: 'spain' },
  { code: 'FR', slug: 'france' },
  { code: 'PT', slug: 'portugal' },
  { code: 'AD', slug: 'andorra' },
];

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

const main = async () => {
  mkdirSync(OUT, { recursive: true });
  const records = [];

  for (const { code, slug } of COUNTRIES) {
    const url = `https://feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-${slug}`;
    const res = await fetch(url, { headers: { 'user-agent': 'appski-snow/1.0 (fixture-capture)' } });
    if (!res.ok) throw new Error(`${slug}: HTTP ${res.status}`);
    const text = await res.text();

    const entries = (text.match(/<entry>/g) ?? []).length;
    const rightsMatch = text.match(/<rights>([\s\S]*?)<\/rights>/);
    const rights = rightsMatch ? rightsMatch[1].replace(/\s+/g, ' ').trim() : null;

    const file = `meteoalarm-${slug}.xml`;
    writeFileSync(join(OUT, file), text, 'utf8');
    records.push({
      country: code,
      slug,
      file,
      url,
      capturedAt: new Date().toISOString(),
      httpStatus: res.status,
      contentType: res.headers.get('content-type'),
      bytes: Buffer.byteLength(text, 'utf8'),
      entries,
      sha256: sha256(text),
      rights,
    });
    console.log(`CAPTURED ${code} (${slug}) http=${res.status} bytes=${records.at(-1).bytes} entries=${entries}`);
  }

  const provenance = {
    note:
      'Fixtures grabadas de los feeds Atom reales de MeteoAlarm. Replay exacto en tests; ' +
      'ningún valor está inventado. `rights` es la cláusula LITERAL del propio feed.',
    capturedAt: new Date().toISOString(),
    records,
  };
  writeFileSync(join(OUT, 'METEOALARM-PROVENANCE.json'), JSON.stringify(provenance, null, 2), 'utf8');
  console.log(`OK ${records.length}/${COUNTRIES.length} feeds capturados`);
};

main().catch((error) => {
  console.error(`FAIL capture meteoalarm: ${error.message}`);
  process.exit(1);
});
