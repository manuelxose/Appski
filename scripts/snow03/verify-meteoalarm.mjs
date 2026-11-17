#!/usr/bin/env node
/**
 * VERIFICACIÓN REAL E2E de MeteoAlarm (SNOW-03) contra los feeds auténticos.
 *
 * Ejecuta el ADAPTER real (sin dobles) contra los cuatro feeds, guarda la
 * respuesta real en `docs/snow/snow03-evidence/real/meteoalarm-<fecha>.json`
 * (URL, sha256, estado HTTP, nº de entradas, avisos servidos y atribución) y
 * falla con exit 1 si algo no cuadra con lo esperado.
 *
 * Uso: node --experimental-transform-types --import ./scripts/snow/ts-loader.mjs \
 *        scripts/snow03/verify-meteoalarm.mjs
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { meteoalarmAdapter, feedUrlFor, parseMeteoalarmFeed } from '../../web-ssr/src/snow/providers/meteoalarm.adapter.ts';
import { globalFetchClient } from '../../web-ssr/src/snow/providers/http-client.ts';
import {
  authorizationFor,
  METEOALARM_DISCLAIMER,
  METEOALARM_SOURCE_URL,
  meteoalarmAttribution,
} from '../../web-ssr/src/snow/providers/authorizations.ts';

const OUT_DIR = join(process.cwd(), 'docs/snow/snow03-evidence/real');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

const COUNTRIES = ['ES', 'FR', 'PT', 'AD'];

/**
 * Atribución OBLIGATORIA por TEXTO (t8/T1). La consulta es de UN país, así que
 * los T&C exigen el NMHS de ese país, no «EUMETNET – MeteoAlarm» genérico.
 */
const expectedAttribution = (country) => meteoalarmAttribution([country]);

/** Usa el MISMO client que producción y captura el cuerpo crudo para la evidencia. */
const capturingClient = (sink) => async (request) => {
  const outcome = await globalFetchClient(request);
  if (outcome.kind === 'ok') {
    sink.raw = {
      url: request.url,
      httpStatus: outcome.status,
      contentType: outcome.contentType,
      bytes: Buffer.byteLength(outcome.bodyText, 'utf8'),
      sha256: createHash('sha256').update(outcome.bodyText).digest('hex'),
      // Se conserva para desglosar entries parseados vs vigentes servidos.
      bodyText: outcome.bodyText,
    };
  } else if (outcome.kind === 'http_error') {
    sink.raw = { url: request.url, httpStatus: outcome.status, contentType: null, bytes: null, sha256: null };
  }
  return outcome;
};

const main = async () => {
  mkdirSync(OUT_DIR, { recursive: true });
  const results = [];
  let failures = 0;

  for (const country of COUNTRIES) {
    const sink = {};
    const adapter = meteoalarmAdapter(authorizationFor('meteoalarm'), { http: capturingClient(sink) });
    const requestedAt = new Date();

    const result = await adapter.fetch({
      stationRef: { slug: `probe-${country.toLowerCase()}`, country, lat: 42.638, lng: 0.766 },
      requestedAt,
      dataType: 'weather-alert',
    });

    const raw = sink.raw ?? {};
    const served = result.status === 'ok' ? result.data.alerts.length : 0;

    // Desglose parsed/activos: el feed trae entries que pueden estar ya
    // expirados en el instante de la llamada. Se reportan ambos números para
    // que «52 servidos» no se confunda con «52 entries en el feed».
    let parsedEntries = null;
    let parsedUsable = null;
    if (raw.bodyText !== undefined) {
      const parsed = parseMeteoalarmFeed(raw.bodyText);
      if (parsed) {
        parsedEntries = parsed.entryCount;
        parsedUsable = parsed.items.length;
      }
    }

    // Criterios de aceptación medidos:
    //  - HTTP 200 en los 4 países.
    //  - ES/FR/PT: el feed trae entradas; AD: feed vacío ⇒ no_data honesto.
    //  - Nunca `error` para un feed 200.
    //  - CONFORMIDAD LEGAL (t8): si hay avisos, el bundle DEBE traer el
    //    disclaimer LITERAL y el sourceUrl, y la atribución debe ser el TEXTO
    //    obligatorio (no basta con "no vacío").
    const hasAlerts = result.status === 'ok';
    const legal = hasAlerts
      ? {
          disclaimerLiteral: result.data.disclaimer === METEOALARM_DISCLAIMER,
          sourceUrlOk: result.data.sourceUrl === METEOALARM_SOURCE_URL,
          everyAlertHasLink: result.data.alerts.every((a) => typeof a.link === 'string' && /^https?:\/\//.test(a.link)),
          attributionText: result.data.attribution === expectedAttribution(country),
        }
      : {};
    const checks = {
      http200: raw.httpStatus === 200,
      notErrorOn200: !(result.status === 'error'),
      servedOrHonestNoData:
        result.status === 'ok' ? served > 0 : result.status === 'no_data',
      ...legal,
    };
    const ok = Object.values(checks).every(Boolean);
    if (!ok) failures += 1;

    results.push({
      country,
      url: raw.url ?? feedUrlFor(country),
      requestedAt: requestedAt.toISOString(),
      raw: {
        httpStatus: raw.httpStatus ?? null,
        contentType: raw.contentType ?? null,
        bytes: raw.bytes ?? null,
        sha256: raw.sha256 ?? null,
      },
      result: {
        status: result.status,
        reason: result.reason ?? null,
        message: result.message ?? null,
        alertsServed: served,
        entriesParsed: parsedEntries,
        alertsUsable: parsedUsable,
        licenseStatus: result.provenance.licenseStatus,
        attribution: result.provenance.attribution,
      },
      checks,
      ok,
    });

    console.log(
      `METEALARM ${country} http=${raw.httpStatus} bytes=${raw.bytes} status=${result.status} ` +
        `alerts=${served} attribution=${result.data?.attribution ?? '-'} legal=${JSON.stringify(legal)} ok=${ok}`,
    );
  }

  const evidence = {
    note:
      'Verificación REAL end-to-end del adapter de MeteoAlarm contra los feeds auténticos. ' +
      'No hay dobles ni datos sintéticos: sha256 del cuerpo recibido en cada caso. ' +
      'Incluye conformidad legal (t8): disclaimer LITERAL + sourceUrl + atribución por texto.',
    generatedAt: new Date().toISOString(),
    adapter: 'meteoalarm',
    dataType: 'weather-alert',
    licenseRef: '06#meteoalarm-rights-element',
    requiredDisclaimer: METEOALARM_DISCLAIMER,
    requiredSourceUrl: METEOALARM_SOURCE_URL,
    results,
    summary: {
      countries: COUNTRIES.length,
      passed: results.filter((r) => r.ok).length,
      failed: failures,
    },
  };

  // UNA sola evidencia canónica: se borran las `meteoalarm-*.json` previas.
  // Las repeticiones no se acumulan (mismo criterio que verify-e2e).
  for (const f of existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : []) {
    if (f.startsWith('meteoalarm-') && f.endsWith('.json')) rmSync(join(OUT_DIR, f), { force: true });
  }
  const path = join(OUT_DIR, `meteoalarm-${STAMP}.json`);
  writeFileSync(path, JSON.stringify(evidence, null, 2), 'utf8');
  console.log(`EVIDENCE ${path}`);
  console.log(`SUMMARY ${evidence.summary.passed}/${evidence.summary.countries} países OK`);

  if (failures > 0) {
    console.error(`FAIL ${failures} país(es) no cumplieron los criterios`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`FAIL verify-meteoalarm: ${error.message}`);
  process.exit(1);
});
