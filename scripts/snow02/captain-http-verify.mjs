#!/usr/bin/env node
/**
 * SNOW-02 — verificación HTTP del CAPITÁN contra el bundle de producción.
 *
 * Arranca dist/web-ssr/server/server.mjs en un puerto libre con SNOW_DATA_DIR
 * temporal y un SNOW_ADMIN_TOKEN canario de prueba (nunca un secreto real),
 * recorre TODOS los endpoints v1, ejercita seguridad de rechazos y ejecuta el
 * ciclo de persistencia: escritura autorizada por HTTP → fichero en disco →
 * reinicio del proceso → lectura posterior (F1: liftsOpen === 12 + atribución).
 *
 * Uso: node scripts/snow02/captain-http-verify.mjs [--out docs/snow/snow02-evidence]
 * Salida: exit 0 sólo si todos los checks pasan; resumen JSON en --out.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SERVER = join(ROOT, 'dist', 'web-ssr', 'server', 'server.mjs');
const TOKEN = 'snow02-captain-canary-token';
const PROV = ['source', 'observedAt', 'updatedAt', 'status', 'licenseStatus', 'freshness'];

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const outDir = outIdx >= 0 ? resolve(ROOT, args[outIdx + 1]) : join(ROOT, 'docs', 'snow', 'snow02-evidence');

const results = [];
let failures = 0;

function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  if (!ok) {
    failures += 1;
    console.error(`FAIL ${name} :: ${detail}`);
  }
}

function freePort() {
  return new Promise((res, rej) => {
    const s = createServer();
    s.unref();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });
}

async function startServer(port, dataDir) {
  // stdio 'inherit': los drivers se invocan también desde un runner confined cuyo
  // spawn con pipes puede denegarse (EPERM); heredar descriptores funciona.
  const child = spawn(process.execPath, [SERVER], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), SNOW_DATA_DIR: dataDir, SNOW_ADMIN_TOKEN: TOKEN, NODE_ENV: 'production' },
    stdio: 'inherit',
  });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i += 1) {
    try {
      const r = await fetch(`${base}/api/snow/v1/stations`);
      if (r.status > 0) return { child, base };
    } catch {
      /* aún no escucha */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  child.kill();
  throw new Error(`servidor no arrancó. log=${log.slice(-800)}`);
}

async function stopServer(srv) {
  srv.child.kill('SIGKILL');
  await new Promise((r) => srv.child.once('exit', r));
}

async function getJson(url, init) {
  const r = await fetch(url, init);
  let body = null;
  const text = await r.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _nonJson: text.slice(0, 200) };
  }
  return { status: r.status, body, text };
}

function hasProvenance(body) {
  const p = body?.provenance;
  return Boolean(p) && PROV.every((f) => f in p);
}

async function main() {
  if (!existsSync(SERVER)) {
    console.error(`No existe ${SERVER}: ejecuta antes npx nx build web-ssr --configuration=production --skip-nx-cache`);
    process.exit(2);
  }
  const dataDir = mkdtempSync(join(tmpdir(), 'snow02-captain-'));
  const port = await freePort();
  const srv = await startServer(port, dataDir);
  const S = `${srv.base}/api/snow/v1`;
  console.log(`servidor ${srv.base} · SNOW_DATA_DIR=${dataDir} · token canario cargado`);

  try {
    // ---- 1. Endpoints públicos ----
    const stations = await getJson(`${S}/stations`);
    check('GET /v1/stations => 200', stations.status === 200, `status=${stations.status}`);
    check('GET /v1/stations trae stations[]', Array.isArray(stations.body?.stations), `len=${stations.body?.stations?.length}`);
    check('GET /v1/stations con procedencia completa', hasProvenance(stations.body), JSON.stringify(stations.body?.provenance ?? null).slice(0, 160));

    const filtered = await getJson(`${S}/stations?country=ES&sort=name&sortDir=asc&page=1&pageSize=2`);
    check('GET /v1/stations filtrado/ordenado/paginado => 200', filtered.status === 200, `status=${filtered.status}`);
    check('filtro country=ES sólo devuelve ES', (filtered.body?.stations ?? []).every((s) => s.country === 'ES'), JSON.stringify(filtered.body?.stations?.map((s) => s.slug)));
    check('paginación presente y coherente', typeof filtered.body?.pagination?.total === 'number', JSON.stringify(filtered.body?.pagination));

    const badPage = await getJson(`${S}/stations?pageSize=1000`);
    check('pageSize fuera de tope => 400 tipado', badPage.status === 400, `status=${badPage.status} body=${badPage.text.slice(0, 120)}`);
    const badCountry = await getJson(`${S}/stations?country=XX`);
    check('country inválido => 400', badCountry.status === 400, `status=${badCountry.status}`);
    const unknownParam = await getJson(`${S}/stations?bogus=1`);
    check('query no declarada => 400', unknownParam.status === 400, `status=${unknownParam.status}`);

    const searchOk = await getJson(`${S}/search?q=baqueira`);
    check('GET /v1/search?q= => 200', searchOk.status === 200, `status=${searchOk.status}`);
    const searchNoQ = await getJson(`${S}/search`);
    check('GET /v1/search sin q => 400', searchNoQ.status === 400, `status=${searchNoQ.status} body=${searchNoQ.text.slice(0, 120)}`);

    const station = await getJson(`${S}/stations/baqueira-beret`);
    check('GET /v1/stations/:slug => 200', station.status === 200, `status=${station.status}`);
    const station404 = await getJson(`${S}/stations/no-existe`);
    check('slug desconocido => 404 con procedencia', station404.status === 404 && hasProvenance(station404.body), `status=${station404.status}`);

    const report = await getJson(`${S}/stations/baqueira-beret/report`);
    check('GET /report => 200', report.status === 200, `status=${report.status}`);
    check('/report sin parte => status no_data (no 0, no null→0)', report.body?.status === 'no_data', `status=${report.body?.status} reason=${report.body?.reason}`);
    check('/report expone noDataFields', Array.isArray(report.body?.report?.noDataFields), JSON.stringify(report.body?.report ?? null).slice(0, 160));
    check('/report no inventa cifras', report.body?.report?.operational === null && report.body?.report?.snow === null, JSON.stringify(report.body?.report ?? null).slice(0, 160));

    const forecast = await getJson(`${S}/stations/baqueira-beret/forecast`);
    check('GET /forecast => estado tipado not_configured/no_data', [200, 404].includes(forecast.status) && ['not_configured', 'no_data'].includes(forecast.body?.status), `status=${forecast.status} body=${forecast.body?.status}`);
    check('/forecast con procedencia', hasProvenance(forecast.body), JSON.stringify(forecast.body?.provenance ?? null).slice(0, 120));

    const alerts = await getJson(`${S}/stations/baqueira-beret/alerts`);
    check('GET /alerts existe => 200', alerts.status === 200, `status=${alerts.status}`);
    check('/alerts no inventa alertas', Array.isArray(alerts.body?.alerts) && alerts.body.alerts.length === 0, JSON.stringify(alerts.body?.alerts ?? null).slice(0, 160));
    check('/alerts estado tipado de indisponibilidad', ['not_configured', 'no_data'].includes(alerts.body?.status), `status=${alerts.body?.status}`);
    check('/alerts con procedencia', hasProvenance(alerts.body), JSON.stringify(alerts.body?.provenance ?? null).slice(0, 120));

    const webcams = await getJson(`${S}/stations/baqueira-beret/webcams`);
    check('GET /webcams => 200 blocked/license', webcams.status === 200 && webcams.body?.status === 'blocked', `status=${webcams.status} body=${webcams.body?.status}`);
    check('/webcams sin enlaces no autorizados', Array.isArray(webcams.body?.grants) && webcams.body.grants.length === 0, JSON.stringify(webcams.body?.grants ?? null).slice(0, 120));

    const aval = await getJson(`${S}/avalanche`);
    check('GET /avalanche => estado tipado', aval.status === 200 && ['not_configured', 'no_data'].includes(aval.body?.status), `status=${aval.status} body=${aval.body?.status}`);

    for (const path of ['/rankings/nieve', '/rankings/km']) {
      const r = await getJson(`${S}${path}`);
      check(`GET ${path} => 200 con estado`, r.status === 200 && ['ok', 'no_data'].includes(r.body?.status), `status=${r.status} body=${r.body?.status}`);
      check(`GET ${path} sin datos inventados`, r.body?.status !== 'ok' || (r.body?.ranking ?? []).length > 0, JSON.stringify(r.body?.ranking ?? null).slice(0, 120));
    }

    const season = await getJson(`${S}/season-dates`);
    check('GET /season-dates => 200', season.status === 200, `status=${season.status}`);
    check('temporada sin confirmar NO se presenta como confirmada', (season.body?.dates ?? []).every((d) => d.confirmed === true || d.seasonOpen === null), JSON.stringify(season.body?.dates ?? null).slice(0, 160));

    // ---- 2. Seguridad administrativa ----
    const cfgNoAuth = await getJson(`${S}/config`);
    check('GET /config sin token => 401', cfgNoAuth.status === 401, `status=${cfgNoAuth.status}`);
    const badTokens = ['', 'Bearer', 'Bearer wrong', `Basic ${TOKEN}`, `bearer ${TOKEN}`, `Bearer ${TOKEN}x`];
    for (const t of badTokens) {
      const r = await getJson(`${S}/config`, { headers: { authorization: t } });
      check(`GET /config con token "${t.slice(0, 14)}" => 401`, r.status === 401, `status=${r.status}`);
    }
    const before = (await getJson(`${S}/admin/reports`, { headers: { authorization: `Bearer ${TOKEN}` } })).body?.reports?.length;
    check('GET /admin/reports con token => 200', typeof before === 'number', `reports=${before}`);
    const cfg = await getJson(`${S}/config`, { headers: { authorization: `Bearer ${TOKEN}` } });
    check('GET /config con token => 200 y estado de fuentes', cfg.status === 200 && Array.isArray(cfg.body?.providers), JSON.stringify(cfg.body ?? null).slice(0, 200));
    check('el token NO aparece en /config', !cfg.text.includes(TOKEN), 'search token in body');

    const goodBody = {
      stationSlug: 'baqueira-beret',
      observedAt: '2026-11-16T08:00:00.000Z',
      sourceUrl: 'https://www.baqueira.es/parte-de-nieve',
      author: 'Servicio de nieve Baqueira',
      confidence: 1,
      operational: { liftsOpen: 12, liftsTotal: 33, slopesOpen: 40, slopesTotal: 120, kmOpen: 35, kmTotal: 160 },
      snow: { baseCm: 60, midCm: 90, topCm: 120, quality: 'powder', lastSnowAt: '2026-11-15T22:00:00.000Z' },
      avalancheLevel: 2,
      mood: 'published',
    };
    const rejects = [
      ['sin token', {}, '401'],
      ['token inválido', { authorization: 'Bearer nope' }, '401'],
      ['token vacío', { authorization: '' }, '401'],
      ['JSON malformado', { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, '400', '{"stationSlug":'],
      ['author vacío', { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, '400', null, { ...goodBody, author: '  ' }],
      ['sourceUrl no http', { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, '400', null, { ...goodBody, sourceUrl: 'ftp://x' }],
      ['observedAt no ISO', { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, '400', null, { ...goodBody, observedAt: 'ayer' }],
      ['confidence fuera de rango', { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, '400', null, { ...goodBody, confidence: 7 }],
      ['avalancheLevel fuera de 1..5', { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, '400', null, { ...goodBody, avalancheLevel: 9 }],
      ['centinela negativo (-99)', { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' }, '400', null, { ...goodBody, snow: { baseCm: -99 } }],
    ];
    for (const [label, headers, expected, raw, body] of rejects) {
      const r = await getJson(`${S}/admin/reports`, {
        method: 'POST',
        headers,
        body: raw ?? JSON.stringify(body ?? goodBody),
      });
      check(`POST /admin/reports rechaza ${label} => ${expected}`, r.status === Number(expected), `status=${r.status} body=${r.text.slice(0, 140)}`);
    }
    const putNoAuth = await getJson(`${S}/admin/stations/baqueira-beret`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Intruso' }),
    });
    check('PUT /admin/stations sin token => 401', putNoAuth.status === 401, `status=${putNoAuth.status}`);
    const afterRejects = (await getJson(`${S}/admin/reports`, { headers: { authorization: `Bearer ${TOKEN}` } })).body?.reports?.length;
    check('los rechazos NO crearon registros', afterRejects === before, `before=${before} after=${afterRejects}`);

    // ---- 3. Escritura autorizada ----
    const created = await getJson(`${S}/admin/reports`, {
      method: 'POST',
      headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify(goodBody),
    });
    check('POST /admin/reports autorizado => 201', created.status === 201, `status=${created.status} body=${created.text.slice(0, 200)}`);
    const createdId = created.body?.report?.id;
    check('el 201 devuelve el parte con id interno', typeof createdId === 'string' && createdId.length > 0, `id=${createdId}`);

    const fileAfter = readdirSync(dataDir).filter((f) => f.endsWith('.json'));
    const reportFile = fileAfter.find((f) => f.includes('report'));
    const onDisk = reportFile ? readFileSync(join(dataDir, reportFile), 'utf8') : '';
    check('el parte está en DISCO tras la escritura', onDisk.includes('baqueira-beret') && onDisk.includes('12'), `ficheros=${fileAfter.join(',')}`);
    check('el token canario NO se escribe en disco', !onDisk.includes(TOKEN), 'search token in store');

    // ---- 4. Reinicio del proceso ----
    await stopServer(srv);
    const port2 = await freePort();
    const srv2 = await startServer(port2, dataDir);
    const S2 = `${srv2.base}/api/snow/v1`;
    try {
      const persisted = await getJson(`${S2}/admin/reports`, { headers: { authorization: `Bearer ${TOKEN}` } });
      check('tras reinicio: lista de partes => 200', persisted.status === 200, `status=${persisted.status}`);
      check('tras reinicio: el parte sigue en la lista', (persisted.body?.reports ?? []).some((r) => r.id === createdId), `ids=${(persisted.body?.reports ?? []).map((r) => r.id).join(',')}`);

      const reread = await getJson(`${S2}/stations/baqueira-beret/report`);
      check('tras reinicio: /report => 200 ok', reread.status === 200 && reread.body?.status === 'ok', `status=${reread.status} body=${reread.body?.status}`);
      check('F1: liftsOpen === 12 tras reinicio', reread.body?.report?.operational?.liftsOpen === 12, `liftsOpen=${reread.body?.report?.operational?.liftsOpen}`);
      check('F1: atribución completa tras reinicio', typeof reread.body?.author === 'string' && reread.body.author.length > 0 && typeof reread.body?.sourceUrl === 'string' && typeof reread.body?.capturedAt === 'string' && typeof reread.body?.confidence === 'number', JSON.stringify({ author: reread.body?.author, sourceUrl: reread.body?.sourceUrl, capturedAt: reread.body?.capturedAt, confidence: reread.body?.confidence }));
      // null ≠ 0: lo ENVIADO se conserva, lo AUSENTE llega como null explícito
      // (nunca 0). No se exige null en un campo que el test sí envió (midCm=90).
      const rsnow = reread.body?.report?.snow ?? null;
      check(
        'null no convertido en 0: enviado=60/90/120 se conserva y ausente newSnow24hCm es null',
        rsnow?.baseCm === 60 && rsnow?.midCm === 90 && rsnow?.topCm === 120 && rsnow?.['newSnow24hCm'] === null,
        JSON.stringify(rsnow ?? null).slice(0, 200),
      );

      const ranking = await getJson(`${S2}/rankings/nieve`);
      check('tras reinicio: ranking nieve usa el dato escrito', ranking.body?.status === 'ok' && (ranking.body?.ranking ?? []).some((r) => r.stationSlug === 'baqueira-beret' && r.baseCm === 60), JSON.stringify(ranking.body?.ranking ?? null).slice(0, 200));

      // PUT = reemplazo TOTAL (decisión §9): un cuerpo PARCIAL debe rechazarse con
      // 400 que lo declare explícitamente; un cuerpo COMPLETO debe aceptarse con 200.
      const putPartial = await getJson(`${S2}/admin/stations/baqueira-beret`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ website: 'https://www.baqueira.es/' }),
      });
      const partialMsg = JSON.stringify(putPartial.body?.fields ?? []);
      check(
        'PUT /admin/stations parcial => 400 declarando reemplazo total',
        putPartial.status === 400 && /replac/i.test(partialMsg),
        `status=${putPartial.status} fields=${partialMsg.slice(0, 200)}`,
      );
      const putOk = await getJson(`${S2}/admin/stations/baqueira-beret`, {
        method: 'PUT',
        headers: { authorization: `Bearer ${TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: 'baqueira-beret',
          name: 'Baqueira Beret',
          country: 'ES',
          region: 'Pirineo Catalán',
          discipline: 'alpine',
          lat: 42.6999,
          lng: 0.9367,
          altitudeBaseM: 1500,
          altitudeTopM: 2610,
          website: 'https://www.baqueira.es/',
          seasonOpen: null,
          seasonClose: null,
          seasonConfirmed: false,
        }),
      });
      check('PUT /admin/stations completo => 200', putOk.status === 200, `status=${putOk.status} body=${putOk.text.slice(0, 200)}`);

      const leaks = ['Error:', 'at Object.', 'node_modules', TOKEN, 'AEMET_API_KEY'];
      const surfaces = [cfg.text, forecast.text, alerts.text, report.text, aval.text];
      const leaked = leaks.filter((l) => surfaces.some((s) => (s ?? '').includes(l)));
      check('errores no filtran stack/credenciales', leaked.length === 0, `filtrado=${leaked.join(',')}`);
    } finally {
      await stopServer(srv2);
    }

    rmSync(dataDir, { recursive: true, force: true });
  } catch (err) {
    check('ejecución sin excepción', false, err instanceof Error ? err.message : String(err));
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    server: 'dist/web-ssr/server/server.mjs',
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failures,
    results,
  };
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'captain-http-verify.json');
  writeFileSync(outFile, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`\nchecks=${summary.total} passed=${summary.passed} failed=${summary.failed}`);
  console.log(`evidencia: ${outFile}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
