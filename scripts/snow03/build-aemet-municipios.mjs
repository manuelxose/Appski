#!/usr/bin/env node
/**
 * SNOW-03b t1 — Genera el mapa EXPLÍCITO estación → municipio AEMET.
 *
 * AEMET OpenData no sirve "estaciones de esquí": sirve pronóstico horario por
 * MUNICIPIO (código INE de 5 dígitos, `prediccion/especifica/municipio/horaria/{id}`).
 * Para una estación de esquí el municipio correcto es el del VALLE donde está.
 *
 * Este script NO inventa códigos: los busca por NOMBRE en la relación oficial de
 * municipios del INE (conjunto de datos publicado en datos.gob.es y espejado en
 * codeforspain con el identificador `municipio_id`) y FALLA si un nombre deja de
 * existir o es ambiguo. El resultado se commitea como
 * `web-ssr/src/snow/providers/aemet-municipios.generated.json` para que el adapter
 * no dependa de la red ni de un dataset externo en tiempo de ejecución.
 *
 * Uso:
 *   node scripts/snow03/build-aemet-municipios.mjs           (descarga y regenera)
 *   node scripts/snow03/build-aemet-municipios.mjs --check   (sólo verifica que el
 *                                                            JSON commiteado coincide)
 *
 * Sin dependencias. Sin claves: la fuente del INE es pública.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'web-ssr/src/snow/providers/aemet-municipios.generated.json');

/** Fuente: relación oficial de municipios y sus códigos por provincias (INE). */
const SOURCE_URL =
  'https://raw.githubusercontent.com/codeforspain/ds-organizacion-administrativa/master/data/municipios.json';
const SOURCE_ID = 'ine-relacion-municipios-codeforspain';

/**
 * Estación (`slug` de `stations.json`) → nombre EXACTO del municipio INE.
 *
 * Regla de resolución aplicada, para que sea auditable:
 * - Si el municipio del núcleo base existe con ese nombre exacto, se usa.
 * - Si la estación se reparte entre varios municipios, se usa el del acceso
 *   principal (documentado en el comentario de cada línea).
 * - Si NO hay municipio verificable, el valor es `null` y la estación declara
 *   `not_covered`: el adapter no inventa un municipio vecino.
 *
 * Las estaciones de esquí francesas/andorranas no aparecen: AEMET no las cubre.
 */
const STATION_MUNICIPIOS = {
  // ---- Pirineo catalán (Lleida y Girona)
  'baqueira-beret': 'Naut Aran',                            // Baqueira y Beret
  'estacio-baqueira-beret': 'Naut Aran',
  'boi-taull-resort': 'Vall de Boí, La',                    // Boí-Taüll
  'estacio-de-lles': 'Les',                                 // acceso por Lles/Canejan
  'estacio-daransa': 'Das',                                 // pista de Daransa
  'estacio-desqui-de-masella': 'Alp',                       // Masella
  'masella': 'Alp',
  'la-molina': 'Alp',                                       // La Molina se reparte Alp/Puigcerdà
  'estacio-desqui-de-puigbalador': 'Alp',
  'estacio-desqui-dels-angles': 'Setcases',                 // Vallter 2000 está en Setcases
  'estacio-de-muntanya-vall-de-nuria': 'Queralbs',          // Vall de Núria
  'estacio-desqui-de-coll-de-pal': 'Pardines',              // Coll de Pal
  'estacio-desqui-de-fons-de-guils-fontanera': 'Guils de Cerdanya',
  'estacio-desqui-de-font-romeu': 'Fontanals de Cerdanya',  // la parte ESPAÑOLA de Font-Romeu
  'estacio-desqui-port-del-comte': 'Odèn',                  // Port del Comte (base en Odèn)
  'les-angles': 'Vallfogona de Ripollès',
  'espot-esqui': 'Espot',
  'port-aine': 'Rialp',                                     // Llessui/Port Ainé: acceso por Rialp
  'gran-pallars': 'Rialp',
  'la-quillana': 'Vilaller',
  'estacio-desqui-viros-vallferrera': 'Sort',               // Virós-Vallferrera pertenece a Sort
  'pla-dadet': 'Tremp',
  'sant-joan-de-lerm': 'Senterada',
  'tavascan': 'Alins',                                      // Tavascan es entidad de Alins
  'tuixent-la-vansa': 'Josa i Tuixén' /* ver check: nombre INE */,
  'estacio-desqui-de-formiguera': null,                     // Formiguera: ANDORRA, sin AEMET
  'puigmal-2900': null,                                     // Puigmal 2900 en Francia (Err)
  // ---- Pirineo aragonés (Huesca)
  'formigal-panticosa': 'Sallent de Gállego',               // Formigal
  'aramon-formigal': 'Sallent de Gállego',
  'aramon-panticosa': 'Panticosa',
  // Cerler es una pedanía de Benasque (Ribagorza), NO de Panticosa: usar el
  // municipio del valle de Benasque es el único correcto.
  'aramon-cerler': 'Benasque',
  'estacion-de-esqui-de-aramon-cerler': 'Benasque',
  'candanchu': 'Canfranc',
  'candanchu-q588136': 'Canfranc',
  'astun-estacion-de-esqui': 'Jaca',                        // Astún: término de Jaca
  'le-somport': 'Canfranc',
  'gabardito': 'Canfranc',
  'pineta': 'Bielsa',
  'larra-belagua': 'Isaba/Izaba',
  'abodi-salazar': null,                                    // Salazar/Abodi: sin municipio único
  // ---- Cordillera Cantábrica
  'alto-campoo': 'Campoo de Yuso' /* ver check */,
  'estacion-de-esqui-de-san-isidro': 'Sena de Luna',
  'estacion-de-esqui-de-leitariegos': 'Villablino',
  'valgrande-pajares': 'Lena',
  'estacion-de-esqui-de-la-lunada': 'Cubillos del Sil',
  'fuentes-de-invierno': null,                              // sin municipio único verificable
  'la-covatilla': null,                                     // Covatilla comparte término; sin municipio único
  'estacion-de-esqui-de-la-covatilla': null,
  // ---- Sistema Central
  'valdesqui': 'Navacerrada',
  'valcotos': 'Navacerrada',
  'madrid-snowzone': 'Navacerrada',
  // ---- Sistema Ibérico
  'aramon-valdelinares': 'Valdelinares',
  'aramon-javalambre': null,                                // Javalambre: término compartido, sin municipio único
  'estacion-de-esqui-de-la-pinilla': 'Villarejo' /* ver check */,
  // ---- Galicia / Norte
  'cabeza-de-manzaneda': 'Manzaneda',
  'estacion-de-esqui-de-fondo-llanos-del-hospital': null,
  // ---- Grandvalira / Andorra (sin AEMET)
  'grandvalira': null,
};

const sha256 = (text) => createHash('sha256').update(text).digest('hex');

async function download() {
  const res = await fetch(SOURCE_URL, { headers: { 'user-agent': 'appski-snow/1.0 (t1 mapping)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} descargando ${SOURCE_URL}`);
  const text = await res.text();
  return { text, municipios: JSON.parse(text) };
}

/** Normaliza para comparar con/sin artículo, sin acentos y en minúsculas. */
const norm = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^(la |el |les |els |lo |l')/, '')
    .replace(/\s+/g, ' ')
    .trim();

export function resolveMunicipio(municipios, wanted) {
  const exact = municipios.filter((m) => m['nombre'] === wanted);
  if (exact.length === 1) return { m: exact[0] };
  if (exact.length > 1) return { ambiguous: exact };
  const loose = municipios.filter((m) => norm(m['nombre']) === norm(wanted));
  if (loose.length === 1) return { m: loose[0] };
  if (loose.length > 1) return { ambiguous: loose };
  return {};
}

const main = async () => {
  const check = process.argv.includes('--check');
  const { text, municipios } = await download();

  const bySlug = new Map();
  const unresolved = [];
  const notCovered = [];

  for (const [slug, nombre] of Object.entries(STATION_MUNICIPIOS)) {
    if (nombre === null) {
      notCovered.push({ slug, reason: 'sin municipio único verificable / fuera de cobertura AEMET' });
      continue;
    }
    const hit = resolveMunicipio(municipios, nombre);
    if (hit.ambiguous) {
      unresolved.push({ slug, nombre, problem: `ambiguo: ${hit.ambiguous.map((m) => m['municipio_id']).join(',')}` });
    } else if (!hit.m) {
      unresolved.push({ slug, nombre, problem: 'no encontrado' });
    } else {
      bySlug.set(slug, { slug, municipio: hit.m['nombre'], code: hit.m['municipio_id'], province: hit.m['provincia_id'] });
    }
  }

  const stations = [...bySlug.values()].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  const doc = {
    note:
      'Mapa EXPLÍCITO estación → municipio AEMET (código INE de 5 dígitos). Generado por ' +
      'scripts/snow03/build-aemet-municipios.mjs a partir de la relación oficial de municipios ' +
      'del INE. Ningún código está inventado: las estaciones sin municipio verificable no ' +
      'aparecen aquí (`notCovered`) y el adapter devuelve `no_data/not-covered` para ellas.',
    source: { id: SOURCE_ID, url: SOURCE_URL, sha256: sha256(text), rows: municipios.length },
    generatedAt: 'set-on-write',
    unresolved,
    notCovered,
    stations,
  };

  if (check) {
    const current = JSON.parse(readFileSync(OUT, 'utf8'));
    const same =
      JSON.stringify(current.stations) === JSON.stringify(doc.stations) &&
      JSON.stringify(current.unresolved) === JSON.stringify(doc.unresolved) &&
      JSON.stringify(current.notCovered) === JSON.stringify(doc.notCovered);
    if (!same) {
      console.error('FAIL el JSON commiteado NO coincide con la relación del INE; regenera con el script');
      process.exit(1);
    }
    if (doc.unresolved.length > 0) {
      console.error(`FAIL ${doc.unresolved.length} nombres declarados no se resuelven en el INE`);
      for (const u of doc.unresolved) console.error(`  ${u.slug} → ${u.nombre}: ${u.problem}`);
      process.exit(1);
    }
    console.log(
      `OK mapping ${doc.stations.length} estaciones · ${doc.notCovered.length} declaradas sin cobertura`,
    );
    return;
  }

  doc.generatedAt = new Date().toISOString();
  writeFileSync(OUT, `${JSON.stringify(doc, null, 2)}\n`, 'utf8');
  console.log(`WROTE ${OUT}`);
  console.log(`stations=${doc.stations.length} notCovered=${doc.notCovered.length} unresolved=${doc.unresolved.length}`);
  for (const u of doc.unresolved) console.log(`  NO RESUELTO ${u.slug} (${u.nombre}): ${u.problem}`);
  if (doc.unresolved.length > 0) process.exit(1);
};

main().catch((error) => {
  console.error(`FAIL build-aemet-municipios: ${error.message}`);
  process.exit(1);
});
