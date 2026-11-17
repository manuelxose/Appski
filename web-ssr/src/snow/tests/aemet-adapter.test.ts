/**
 * SNOW-03b · t1 — Adapter REAL de AEMET OpenData.
 *
 * ⚠️ Las fixtures de `providers/fixtures/aemet/` son **SINTÉTICAS**: reproducen
 * el formato y las trampas medidas del servicio, no son respuestas capturadas
 * (no había clave en la sesión que las generó; ver `PROVENANCE.json`). Los tests
 * NO tocan la red: inyectan un `HttpClient` que replayea esos bytes exactos.
 *
 * Lo que se demuestra:
 *   AE1  sin `AEMET_API_KEY` ⇒ `not_configured` y CERO llamadas de red (SNOW-02 intacto)
 *   AE2  flujo de DOS PASOS: sobre → `datos` → documento; ISO-8859-15 con BOM;
 *        `observedAt`/`updatedAt` = `elaborado` REAL de AEMET
 *   AE3  200 con cuerpo VACÍO (sin clave) ⇒ no_data, nunca ok/error
 *   AE4  429 con cuerpo HTML ⇒ rate_limited (por STATUS, no por cuerpo) y se respeta `Retry-After`
 *   AE5  JSON roto / forma inesperada ⇒ no_data; 5xx ⇒ error retryable
 *   AE6  centinela `-99` ⇒ null (nunca se sirve como temperatura)
 *   AE7  `snowLineM` siempre null; `nieve` (espesor) NO se confunde con `precipMm`
 *   AE8  estación sin municipio declarado ⇒ no_data/not-covered SIN tocar la red
 *   AE9  cuota propia: espaciado + bloqueo tras 429 + una sola llamada al sobre por fetch
 *   AE10 la clave NUNCA aparece en el mensaje de error ni en la procedencia
 *   AE11 el sobre del paso 2 sólo se sigue por HTTPS
 */
import test from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AEMET_DEFAULT_RATE_RETRY_MS,
  aemetAdapter,
  buildMetaUrl,
  localSpainToUtcIso,
  madridOffsetMs,
  parseElaborado,
  parsePrediccion,
  parseVientoAndRachaMax,
  readEnvelope,
  skipReasonForPeriodo,
} from '../providers/aemet.adapter.ts';
import { SnowDataService } from '../chain/chain.ts';
import { FALLBACK_CHAINS, NOT_A_FORECAST_PROVIDER } from '../chain/fallback-chains.ts';
import { resultToHttp } from '../server/http-mapping.ts';
import { aemetMunicipioFor } from '../providers/aemet-municipios.ts';
import { charsetFromContentType, decodeBody, type HttpClient, type HttpRequest } from '../providers/http-client.ts';
import type { Authorization, ProviderInput } from '../contracts/provider-contracts.ts';

const HERE = fileURLToPath(import.meta.url);
const FIXTURES = join(HERE, '..', '..', 'providers', 'fixtures', 'aemet');

const FIXED_NOW = new Date('2026-11-17T09:00:00.000Z');
const KEY_VAR = 'AEMET_API_KEY';
/** Clave CANARIA: sólo se usa para detectar fugas. Nunca es una clave real. */
const CANARY_KEY = 'canary-not-a-real-aemet-key-0000';

const readFixtureBytes = (name: string): Buffer => readFileSync(join(FIXTURES, name));
const readFixture = (name: string): string => readFixtureBytes(name).toString('latin1');

/** Autorización REAL de producción para AEMET (verificada en 05#aemet). */
const AUTH: Authorization = {
  registryRef: '05#aemet',
  licenseId: 'aemet-nota-legal',
  commercialUse: true,
  storageAllowed: true,
  attributionRequired: true,
};

const input = (over: Partial<ProviderInput> = {}): ProviderInput => ({
  stationRef: { slug: 'baqueira-beret', country: 'ES', lat: 42.6999, lng: 0.9367 },
  requestedAt: FIXED_NOW,
  dataType: 'forecast',
  ...over,
});

/**
 * Respuesta 200 con los bytes exactos de una fixture y su charset declarado.
 *
 * Reproduce `globalFetchClient` EXACTAMENTE: el cliente decodifica los BYTES
 * con el charset del `Content-Type` (AEMET: ISO-8859-15) y entrega AL ADAPTER ya
 * el texto sin BOM. Por eso el BOM se quita aquí, no en el adapter: si el doble
 * entregara el BOM (como haría un `bytes.toString('utf8')`), estaría probando un
 * camino que producción nunca recorre.
 */
const okFrom = (file: string, contentType = 'application/json;charset=ISO-8859-15') => {
  const bytes = readFixtureBytes(file);
  const charset = charsetFromContentType(contentType);
  return {
    kind: 'ok' as const,
    status: 200,
    bodyText: decodeBody(bytes, charset),
    contentType,
    bodyBytes: bytes,
    charset,
    retryAfterMs: null,
  };
};

/**
 * `true` si la petición es el PASO 1 (el sobre). El segundo GET va a la URL que
 * devuelve el sobre (`https://opendata.aemet.es/opendata/sh/...`), que NO lleva
 * `api_key`: ambos pasos viven en el mismo host, así que se distinguen por ruta.
 */
const isEnvelopeRequest = (req: HttpRequest): boolean =>
  req.url.includes('/prediccion/especifica/municipio/horaria/');

/** Cliente HTTP que responde por URL y registra TODAS las peticiones. */
function scriptedClient(routes: (req: HttpRequest) => Awaited<ReturnType<HttpClient>>) {
  const calls: HttpRequest[] = [];
  const client: HttpClient = async (req) => {
    calls.push(req);
    return routes(req);
  };
  return { client, calls };
}

/** Hace que la clave esté "presente" durante el test y la restaura siempre. */
function withKey(fn: () => Promise<void>): () => Promise<void> {
  return async () => {
    const before = process.env[KEY_VAR];
    process.env[KEY_VAR] = CANARY_KEY;
    try {
      await fn();
    } finally {
      if (before === undefined) delete process.env[KEY_VAR];
      else process.env[KEY_VAR] = before;
    }
  };
}

// ------------------------------------------------------------------ AE10 (primero: valida las fixtures que usan los demás)

test('AE10: las fixtures son las declaradas en PROVENANCE.json (sha256) y están marcadas como sintéticas', () => {
  const prov = JSON.parse(readFileSync(join(FIXTURES, 'PROVENANCE.json'), 'utf8')) as {
    synthetic: boolean;
    records: Array<{ file: string; sha256: string; bytes: number; synthetic: boolean }>;
  };
  assert.strictEqual(prov.synthetic, true, 'las fixtures AEMET de este repo deben declararse sintéticas');
  assert.ok(prov.records.length > 0, 'PROVENANCE.json no lista fixtures');

  for (const record of prov.records) {
    const bytes = readFixtureBytes(record.file);
    assert.strictEqual(createHash('sha256').update(bytes).digest('hex'), record.sha256, `${record.file}: sha256`);
    assert.strictEqual(bytes.length, record.bytes, `${record.file}: tamaño`);
    assert.strictEqual(record.synthetic, true, `${record.file}: debe marcarse synthetic:true`);
  }
});

// ------------------------------------------------------------------ AE1

test(
  'AE1: sin AEMET_API_KEY ⇒ not_configured y NINGUNA llamada de red (SNOW-02 intacto)',
  withKey(async () => {
    delete process.env[KEY_VAR];
    const { client, calls } = scriptedClient(() => okFrom('meta-ok.json'));
    const adapter = aemetAdapter(AUTH, { http: client });

    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'not_configured');
    if (r.status !== 'not_configured') return;
    assert.deepStrictEqual([...r.missingEnv], [KEY_VAR]);
    assert.strictEqual(calls.length, 0, 'sin clave no se puede tocar la red');
    // La procedencia sigue presente aunque no haya dato (05b §1.1).
    assert.strictEqual(r.provenance.source, 'aemet');
    assert.strictEqual(r.provenance.licenseStatus, 'allowed-with-attribution');
    assert.match(String(r.provenance.attribution), /AEMET/);
  }),
);

// ------------------------------------------------------------------ AE2

test(
  'AE2: dos pasos (sobre → datos), ISO-8859-15 con BOM y observedAt = `elaborado` real',
  withKey(async () => {
    const { client, calls } = scriptedClient((req) => {
      if (isEnvelopeRequest(req)) return okFrom('meta-ok.json');
      if (req.url.startsWith('https://opendata.aemet.es/opendata/sh/')) return okFrom('prediccion-2dias.json');
      throw new Error(`URL inesperada: ${req.url}`);
    });
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });

    const r = await adapter.fetch(input({ stationRef: { ...input().stationRef, slug: 'baqueira-beret' } }));
    assert.strictEqual(r.status, 'ok', `estado inesperado: ${JSON.stringify(r)}`);
    if (r.status !== 'ok') return;

    // Dos pasos, en orden, y el sobre lleva el municipio REAL de Baqueira (Naut Aran).
    assert.strictEqual(calls.length, 2);
    assert.match(calls[0].url, /\/prediccion\/especifica\/municipio\/horaria\/25025\?api_key=/);
    assert.strictEqual(calls[1].url, 'https://opendata.aemet.es/opendata/sh/aaaaaaaaaaaaaaaa');

    // BOM retirado y acentos correctos (ISO-8859-15, no UTF-8 corrupto).
    assert.ok(!calls[1].url.includes('\uFEFF'));
    const condition = r.data.points.find((p) => p.condition !== null)?.condition;
    assert.ok(condition !== undefined, 'debe haber alguna condición de cielo');
    assert.ok(!String(condition).includes('\uFFFD'), `texto corrompido: ${String(condition)}`);

    // 2 días × 24 horas.
    assert.strictEqual(r.data.points.length, 48);
    assert.strictEqual(r.data.horizonHours, 47);

    // `elaborado: 2026-11-17T05:40:12` en hora de Madrid (CET, UTC+1) = 04:40:12Z.
    assert.strictEqual(r.provenance.observedAt, '2026-11-17T04:40:12.000Z');
    assert.strictEqual(r.provenance.updatedAt, '2026-11-17T04:40:12.000Z');
    assert.notStrictEqual(r.provenance.observedAt, FIXED_NOW.toISOString(), 'no es el instante de la petición');

    // Mapeo de magnitudes del primer tramo del segundo día (sin precipitación).
    const dia1 = r.data.points[24];
    assert.strictEqual(dia1.tempC, -1);
    // Defecto 2 (re-verificación real): velocidad y racha viven en el array
    // plano `vientoAndRachaMax` — velocidad dentro de `velocidad[]` y racha en
    // el `value` de la entrada hermana. Leer sólo `value` las dejaba en null.
    assert.strictEqual(dia1.windKmh, 12, 'la velocidad se lee de velocidad[]');
    assert.strictEqual(dia1.gustKmh, 15, 'la racha se lee del `value` hermano');
    assert.strictEqual(dia1.precipMm, 0);
    // Defecto 4: `probNieve` es DIARIA (periodo "1901") ⇒ el horario es null y el
    // valor se sirve agregado en `bundle.daily`, sin repartirlo entre horas.
    assert.strictEqual(dia1.probSnowPct, null, 'la probabilidad diaria no se reparte por horas');
    assert.deepStrictEqual(r.data.daily, [
      { day: '2026-11-17', snowProbabilityPct: 70 },
      { day: '2026-11-18', snowProbabilityPct: 0 },
    ]);
    assert.strictEqual(dia1.condition, 'Despejado');
    assert.strictEqual(dia1.snowLineM, null);

    // Atribución obligatoria de la licencia de AEMET.
    assert.match(String(r.provenance.attribution), /AEMET/);
    assert.strictEqual(r.provenance.status, 'live');
  }),
);

// ------------------------------------------------------------------ AE3

test(
  'AE3: 200 con cuerpo VACÍO (servicio sin clave válida) ⇒ no_data, nunca ok',
  withKey(async () => {
    const { client } = scriptedClient(() => ({
      kind: 'ok' as const,
      status: 200,
      bodyText: '',
      contentType: 'application/json;charset=ISO-8859-15',
      bodyBytes: Buffer.alloc(0),
      charset: 'iso-8859-15',
      retryAfterMs: null,
    }));
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });
    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'no_data');
    if (r.status !== 'no_data') return;
    assert.strictEqual(r.reason, 'not-covered');
  }),
);

test('AE3b: un cuerpo de sólo espacios/BOM no es JSON ⇒ no_data (no se decide por status)', () => {
  const parsed = parsePrediccion('\uFEFF   \n ');
  assert.strictEqual(parsed.ok, false);
  if (parsed.ok) return;
  assert.strictEqual(parsed.failure.kind, 'empty_body');
});

// ------------------------------------------------------------------ AE4

test(
  'AE4: 429 con cuerpo HTML ⇒ rate_limited (por STATUS) y se respeta Retry-After',
  withKey(async () => {
    const { client, calls } = scriptedClient(() => ({
      kind: 'http_error' as const,
      status: 429,
      retryAfterMs: 42_000,
      // El cuerpo es HTML: NO debe intentarse parsear como JSON.
      bodyText: readFixture('ratelimit-429.html'),
      contentType: 'text/html; charset=ISO-8859-1',
    }));
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });

    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'rate_limited');
    if (r.status !== 'rate_limited') return;
    assert.strictEqual(r.retryAfterMs, 42_000);
    assert.strictEqual(calls.length, 1, 'un 429 no debe provocar el segundo GET');

    // Tras un 429 la instancia queda bloqueada: no se vuelve a llamar antes.
    const again = await adapter.fetch(input());
    assert.strictEqual(again.status, 'rate_limited');
    if (again.status !== 'rate_limited') return;
    assert.ok(again.retryAfterMs <= 42_000 && again.retryAfterMs > 0, 'debe seguir bloqueado hasta la ventana');
    assert.strictEqual(calls.length, 1, 'la segunda llamada se sirve del bloqueo local');
  }),
);

test(
  'AE4b: 429 SIN Retry-After ⇒ espera el minuto que pide el propio AEMET',
  withKey(async () => {
    const { client } = scriptedClient(() => ({
      kind: 'http_error' as const,
      status: 429,
      retryAfterMs: null,
      bodyText: readFixture('ratelimit-429.html'),
      contentType: 'text/html',
    }));
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });
    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'rate_limited');
    if (r.status !== 'rate_limited') return;
    assert.strictEqual(r.retryAfterMs, AEMET_DEFAULT_RATE_RETRY_MS);
  }),
);

test(
  'AE4c: el 429 del SEGUNDO paso también es rate_limited (no error)',
  withKey(async () => {
    const { client } = scriptedClient((req) =>
      isEnvelopeRequest(req)
        ? okFrom('meta-ok.json')
        : { kind: 'http_error' as const, status: 429, retryAfterMs: 60_000, bodyText: readFixture('ratelimit-429.html'), contentType: 'text/html' },
    );
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });
    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'rate_limited');
  }),
);

// ------------------------------------------------------------------ AE5

test(
  'AE5: JSON roto en el dato ⇒ no_data/source-silent (no error de transporte)',
  withKey(async () => {
    const { client } = scriptedClient((req) =>
      isEnvelopeRequest(req) ? okFrom('meta-ok.json') : okFrom('paso2-roto.json'),
    );
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });
    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'no_data');
    if (r.status !== 'no_data') return;
    assert.strictEqual(r.reason, 'source-silent');
  }),
);

test(
  'AE5b: JSON válido con OTRA forma (objeto de error) ⇒ no_data, no se tolera',
  withKey(async () => {
    const { client } = scriptedClient((req) =>
      isEnvelopeRequest(req) ? okFrom('meta-ok.json') : okFrom('paso2-objeto.json'),
    );
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });
    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'no_data');
  }),
);

test(
  'AE5c: 5xx en el sobre ⇒ error retryable; 4xx (≠429) ⇒ error NO retryable',
  withKey(async () => {
    const server = scriptedClient(() => ({ kind: 'http_error' as const, status: 503, retryAfterMs: null }));
    const r503 = await aemetAdapter(AUTH, { http: server.client, minSpacingMs: 0 }).fetch(input());
    assert.strictEqual(r503.status, 'error');
    if (r503.status === 'error') assert.strictEqual(r503.retryable, true);

    const notFound = scriptedClient(() => ({ kind: 'http_error' as const, status: 404, retryAfterMs: null }));
    const r404 = await aemetAdapter(AUTH, { http: notFound.client, minSpacingMs: 0 }).fetch(input());
    assert.strictEqual(r404.status, 'error');
    if (r404.status === 'error') assert.strictEqual(r404.retryable, false);

    const timeout = scriptedClient(() => ({ kind: 'timeout' as const, timeoutMs: 10_000 }));
    const rt = await aemetAdapter(AUTH, { http: timeout.client, minSpacingMs: 0 }).fetch(input());
    assert.strictEqual(rt.status, 'error');
    if (rt.status === 'error') assert.strictEqual(rt.retryable, true);
  }),
);

// ------------------------------------------------------------------ AE6

test(
  'AE6: el centinela -99 de AEMET se sirve como null, nunca como valor',
  withKey(async () => {
    const { client } = scriptedClient((req) =>
      isEnvelopeRequest(req) ? okFrom('meta-ok.json') : okFrom('prediccion-centinelas.json'),
    );
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });
    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'ok');
    if (r.status !== 'ok') return;

    const first = r.data.points[0];
    for (const field of ['tempC', 'windKmh', 'gustKmh', 'probSnowPct'] as const) {
      assert.strictEqual(first[field], null, `${field} debe ser null, no -99`);
    }
    // `precipitacion` de ese tramo es "0" REAL (no un centinela): 0 mm es un
    // valor legítimo y no puede confundirse con «sin dato».
    assert.strictEqual(first.precipMm, 0, '0 mm es un valor real, no ausencia');
    assert.strictEqual(first.condition, null, 'un estado de cielo sin descripción no se inventa');

    const second = r.data.points[1];
    assert.strictEqual(second.tempC, 3);
    assert.strictEqual(second.windKmh, 7);
    assert.strictEqual(second.gustKmh, null, 'la racha -99 del segundo tramo también es null');
  }),
);

// ------------------------------------------------------------------ AE7

test('AE7: `snowLineM` siempre null y `nieve` (espesor) NO se mapea a precipMm', () => {
  const parsed = parsePrediccion(decodeBody(readFixtureBytes('prediccion-2dias.json'), 'iso-8859-15'));
  assert.strictEqual(parsed.ok, true);
  if (!parsed.ok) return;

  for (const point of parsed.bundle.points) {
    assert.strictEqual(point.snowLineM, null, 'AEMET no publica cota de nieve en este producto');
  }
  // En el día 0 la hora 12 trae `nieve: "2"` (espesor) y `precipitacion: "0.2"`.
  const index = parsed.bundle.points.findIndex((p) => p.precipMm === 0.2);
  assert.ok(index >= 0, 'debe existir el tramo con precipitación');
  const tramo = parsed.bundle.points[index];
  assert.strictEqual(tramo.tempC, -2 + (12 % 7));
  assert.strictEqual(tramo.condition, 'Nuboso con lluvia escasa');
  // La probabilidad de nieve es DIARIA (defecto 4): no aparece por hora.
  assert.strictEqual(tramo.probSnowPct, null);
  assert.strictEqual(parsed.bundle.daily?.[0]?.snowProbabilityPct, 70);
  // Si `nieve` (2 cm de espesor) se hubiera mapeado a precipMm, este valor sería 2.
  assert.notStrictEqual(tramo.precipMm, 2);
});

// ------------------------------------------------------------------ AE8

test(
  'AE8: estación sin municipio AEMET declarado ⇒ no_data/not-covered y CERO llamadas',
  withKey(async () => {
    assert.strictEqual(aemetMunicipioFor('grandvalira'), null, 'Grandvalira está en Andorra: sin AEMET');
    const { client, calls } = scriptedClient(() => okFrom('meta-ok.json'));
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });

    const r = await adapter.fetch(input({ stationRef: { slug: 'grandvalira', country: 'AD', lat: 42.55, lng: 1.6 } }));
    assert.strictEqual(r.status, 'no_data');
    if (r.status !== 'no_data') return;
    assert.strictEqual(r.reason, 'not-covered');
    assert.strictEqual(calls.length, 0, 'no se busca un municipio vecino «razonable»');
    assert.strictEqual(adapter.canServe(input({ stationRef: { slug: 'grandvalira', country: 'AD', lat: 42.55, lng: 1.6 } })), false);
    assert.strictEqual(adapter.canServe(input()), true);
  }),
);

// ------------------------------------------------------------------ AE8b

test(
  'AE8b: `stationRef.sourceIds.aemet` manda sobre el mapa (corrección sin tocar código)',
  withKey(async () => {
    const { client, calls } = scriptedClient((req) =>
      isEnvelopeRequest(req) ? okFrom('meta-ok.json') : okFrom('prediccion-2dias.json'),
    );
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });

    // Una estación SIN mapping, con override explícito: se sirve el municipio indicado.
    await adapter.fetch(
      input({ stationRef: { slug: 'grandvalira', country: 'AD', lat: 42.55, lng: 1.6, sourceIds: { aemet: '25025' } } }),
    );
    assert.strictEqual(calls.length, 2, 'con override válido sí se llama');
    assert.match(calls[0].url, /\/horaria\/25025\?api_key=/);

    // Override con forma inválida: NO se usa (serviría el municipio equivocado).
    const before = calls.length;
    const r = await adapter.fetch(
      input({ stationRef: { slug: 'grandvalira', country: 'AD', lat: 42.55, lng: 1.6, sourceIds: { aemet: '2502' } } }),
    );
    assert.strictEqual(r.status, 'no_data');
    if (r.status === 'no_data') assert.strictEqual(r.reason, 'not-covered');
    assert.strictEqual(calls.length, before, 'un código con forma inválida no provoca llamada');

    // Y una estación CON mapping usa el suyo cuando no hay override.
    await adapter.fetch(input());
    assert.match(calls[calls.length - 2].url, /\/horaria\/25025\?api_key=/);
  }),
);

// ------------------------------------------------------------------ AE9

test(
  'AE9: espaciado propio — una segunda lectura ESPERA y sirve dato (nunca rate_limited por espaciado)',
  withKey(async () => {
    const { client, calls } = scriptedClient((req) =>
      isEnvelopeRequest(req) ? okFrom('meta-ok.json') : okFrom('prediccion-2dias.json'),
    );
    // Espaciado grande y reloj controlado: la segunda llamada cae dentro de la ventana.
    //
    // CONTRATO (corregido tras el defecto semántico de la 3ª verificación real):
    // el autolimitador propio NO rechaza. Un rechazo aquí acababa en la cadena como
    // `no_data/not-covered`, es decir, el producto afirmaba «sin cobertura AEMET»
    // para una estación que SÍ está mapeada. Se espera y se sirve el dato.
    let clock = 1_000_000;
    const sleeps: number[] = [];
    const adapter = aemetAdapter(AUTH, {
      http: client,
      minSpacingMs: 20_000,
      now: () => clock,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
    });

    const first = await adapter.fetch(input());
    assert.strictEqual(first.status, 'ok');

    const second = await adapter.fetch(input());
    assert.strictEqual(second.status, 'ok', 'la segunda lectura se sirve, no se rechaza por cuota propia');

    // El espaciado se respetó ESPERANDO, no rechazando.
    assert.ok(
      sleeps.some((ms) => ms > 0),
      'debe haberse esperado para cumplir el espaciado entre llamadas',
    );
    assert.ok(
      sleeps.every((ms) => ms <= 20_000),
      'la espera no puede superar la ventana de espaciado configurada',
    );
    assert.strictEqual(calls.length, 4, 'dos fetch × dos pasos, ambos ejecutados');
  }),
);

test(
  'AE9b: entre los dos pasos se respeta el espaciado con la espera inyectable',
  withKey(async () => {
    const sleeps: number[] = [];
    let clock = 5_000_000;
    const { client } = scriptedClient((req) =>
      isEnvelopeRequest(req) ? okFrom('meta-ok.json') : okFrom('prediccion-2dias.json'),
    );
    const adapter = aemetAdapter(AUTH, {
      http: client,
      minSpacingMs: 20_000,
      now: () => clock,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock += ms;
      },
    });
    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'ok');
    assert.deepStrictEqual(sleeps, [20_000], 'el segundo GET espera el espaciado configurado');
  }),
);

// ------------------------------------------------------------------ AE10

test(
  'AE10: la clave NUNCA aparece en el mensaje de error ni en la procedencia (URL redactada)',
  withKey(async () => {
    const { client } = scriptedClient(() => ({ kind: 'http_error' as const, status: 500, retryAfterMs: null }));
    const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });
    const r = await adapter.fetch(input());
    assert.strictEqual(r.status, 'error');
    const serialized = JSON.stringify(r);
    assert.ok(!serialized.includes(CANARY_KEY), 'la clave ha aparecido en el resultado');

    // Y la URL de la petición se construye con la clave, así que redactarla es
    // obligatorio antes de publicarla.
    const url = buildMetaUrl('25025', CANARY_KEY);
    assert.ok(url.includes(CANARY_KEY), 'la URL de petición sí lleva la clave (se envía a AEMET)');
    const { redactUrl } = await import('../config/env.ts');
    assert.ok(!redactUrl(url).includes(CANARY_KEY), 'redactUrl debe ocultarla');
  }),
);

// ------------------------------------------------------------------ AE11

test('AE11: el sobre sólo se sigue por HTTPS y con forma de AEMET', () => {
  assert.deepStrictEqual(readEnvelope(''), { kind: 'no_data', detail: 'sobre vacío' });
  assert.strictEqual(readEnvelope('<html>límite</html>').kind, 'no_data');
  assert.strictEqual(readEnvelope('{"estado":429}').kind, 'limited');
  assert.strictEqual(readEnvelope('{"estado":200}').kind, 'no_data');
  assert.strictEqual(
    readEnvelope('{"estado":200,"datos":"http://opendata.aemet.es/opendata/sh/x"}').kind,
    'no_data',
    'una URL del paso 2 sin TLS no se sigue',
  );
  assert.deepStrictEqual(readEnvelope('{"estado":200,"datos":"https://opendata.aemet.es/opendata/sh/x"}'), {
    kind: 'url',
    url: 'https://opendata.aemet.es/opendata/sh/x',
  });
});

// ------------------------------------------------------------------ AE12 (REGRESIÓN del bug real de SNOW-03b)

test('AE12: `fecha` REAL de AEMET (fecha-hora local SIN sufijo) NO puede descartar los tramos', () => {
  // Bug real detectado en la verificación con clave: el parser exigía
  // `YYYY-MM-DD` y AEMET envía `YYYY-MM-DDTHH:mm:ss` en hora LOCAL sin sufijo.
  // Resultado: TODOS los tramos se descartaban ⇒ no_data con la API viva.
  // Este test falla si vuelve a pasar.
  const formasReales = ['2026-11-16T00:00:00', '2026-11-16', '2026-11-16T00:00:00Z', '2026-11-16T00:00:00+01:00'];
  for (const fecha of formasReales) {
    assert.notStrictEqual(
      localSpainToUtcIso(fecha, '19'),
      null,
      `fecha real '${fecha}' descartada: el bug de producción vuelve a estar presente`,
    );
  }

  // Hora local de Madrid: noviembre = CET (+1) ⇒ 19:00 local = 18:00Z.
  assert.strictEqual(localSpainToUtcIso('2026-11-16T00:00:00', '19'), '2026-11-16T18:00:00.000Z');
  // Con zona explícita se respeta la zona que declara la fuente.
  assert.strictEqual(localSpainToUtcIso('2026-11-16T00:00:00Z', '19'), '2026-11-16T00:00:00.000Z');

  // Periodos «todo el día»: se descartan EXPLÍCITAMENTE (no se inventa la hora).
  for (const periodo of ['1901', '0001', '0000', '2400']) {
    assert.strictEqual(localSpainToUtcIso('2026-11-16T00:00:00', periodo), null, `periodo '${periodo}' no es una hora`);
    assert.ok(skipReasonForPeriodo(periodo) !== null, `periodo '${periodo}' debe declarar motivo`);
  }
  assert.strictEqual(skipReasonForPeriodo('19'), null, 'una hora normal no se descarta');
});

test('AE12b: la fixture 2 días usa la forma REAL de `fecha` y produce 48 tramos', () => {
  const raw = decodeBody(readFixtureBytes('prediccion-2dias.json'), 'iso-8859-15');
  const doc = JSON.parse(raw) as Array<{ prediccion: { dia: Array<{ fecha: string }> } }>;
  // Si alguien «arregla» la fixture a `YYYY-MM-DD` el test lo dice: la forma
  // correcta es la que envía el servicio, no la que nos vendría mejor.
  assert.match(doc[0].prediccion.dia[0].fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, 'la fixture debe usar la forma REAL de `fecha`');

  const parsed = parsePrediccion(raw);
  assert.strictEqual(parsed.ok, true);
  if (!parsed.ok) return;
  assert.strictEqual(parsed.bundle.points.length, 48);
  // Los 48 tramos salen de las series HORARIAS. Los únicos periodos descartados
  // son los `"1901"` de `probNieve` (que es diaria y va por otra vía): si
  // apareciera cualquier otro motivo, el test lo delata.
  const motivos = [...new Set(parsed.skipped.map((s) => s.motivo))];
  assert.deepStrictEqual(motivos, ['periodo-de-dia-completo'], JSON.stringify(parsed.skipped));
  assert.ok(parsed.skipped.every((s) => s.periodo === '1901'), 'sólo se descarta el periodo diario de probNieve');
  // Primer tramo: 00:00 local del 17-nov (CET) = 23:00Z del 16-nov.
  assert.strictEqual(parsed.bundle.points[0].validAt, '2026-11-16T23:00:00.000Z');
});

test('AE12c: los periodos «todo el día» se descartan con motivo, sin inventar hora', () => {
  const raw = decodeBody(readFixtureBytes('prediccion-periodos-especiales.json'), 'iso-8859-15');
  const parsed = parsePrediccion(raw);
  assert.strictEqual(parsed.ok, true);
  if (!parsed.ok) return;

  // Sólo las horas 00 y 13 son tramos; el "1901" queda fuera.
  assert.strictEqual(parsed.bundle.points.length, 2);
  assert.deepStrictEqual(
    parsed.bundle.points.map((p) => p.validAt),
    ['2026-11-16T23:00:00.000Z', '2026-11-17T12:00:00.000Z'],
  );
  // El motivo queda REGISTRADO: que falte un tramo nunca es un silencio.
  assert.ok(parsed.skipped.length > 0, 'los periodos descartados deben reportarse');
  assert.ok(parsed.skipped.every((s) => s.periodo === '1901' && s.motivo === 'periodo-de-dia-completo'), JSON.stringify(parsed.skipped));
  // Y no se ha servido la precipitación diaria como si fuera de una hora.
  assert.ok(parsed.bundle.points.every((p) => p.precipMm !== 0.4), 'el valor diario NO puede aparecer como tramo horario');
});

// ------------------------------------------------------------------ AE13 (REGRESIÓN defectos 1, 2 y 4 de la re-verificación real)

test('AE13·D1: un proveedor de clima HISTÓRICO no puede aparecer en la procedencia de /forecast', async () => {
  // Defecto GRAVE real: `copernicus-c3s` (reanálisis ERA5) estaba al final de la
  // cadena de `forecast`; cuando AEMET no servía, `/forecast` publicaba
  // `source: 'copernicus-c3s'` y «Datos: Copernicus Climate Data Store» con 0
  // puntos. Un dato FALSO con apariencia legítima.
  assert.ok(
    !FALLBACK_CHAINS.forecast.includes('copernicus-c3s'),
    'copernicus-c3s NO puede estar en la cadena de pronóstico',
  );
  assert.strictEqual(NOT_A_FORECAST_PROVIDER['copernicus-c3s'] !== undefined, true);

  // Y aunque alguien la inyecte a mano, el orquestador no debe servirlo.
  const fakeC3s = {
    id: 'copernicus-c3s' as const,
    provides: ['forecast' as const],
    licenseByType: { forecast: 'allowed-with-attribution' as const },
    isTerminal: false,
    canServe: () => true,
    attribution: () => 'Datos: Copernicus Climate Data Store',
    fetch: async () => ({
      status: 'ok' as const,
      data: { points: [], horizonHours: 0 },
      provenance: {
        source: 'copernicus-c3s' as const,
        observedAt: FIXED_NOW.toISOString(),
        updatedAt: null,
        status: 'live' as const,
        licenseStatus: 'allowed-with-attribution' as const,
        freshness: 0,
        authorization: AUTH,
        attribution: 'Datos: Copernicus Climate Data Store',
      },
    }),
  };
  const deps = { stations: {} as never, reports: {} as never };
  const svc = new SnowDataService(deps, {
    adapters: { 'copernicus-c3s': fakeC3s } as never,
    chains: { ...FALLBACK_CHAINS, forecast: ['copernicus-c3s'] },
  });
  const r = await svc.fetch('forecast', input());
  assert.notStrictEqual(r.provenance.source, 'copernicus-c3s', 'la procedencia NO puede atribuirse a C3S');
  assert.notStrictEqual(r.status, 'ok');
  assert.ok(!/Copernicus/i.test(String(r.provenance.attribution)), 'la atribución NO puede ser de Copernicus');
});

test('AE13·D1b: un `ok` con CERO puntos no se sirve como pronóstico', async () => {
  const emptyOk = {
    id: 'aemet' as const,
    provides: ['forecast' as const],
    licenseByType: { forecast: 'allowed-with-attribution' as const },
    isTerminal: false,
    canServe: () => true,
    attribution: () => 'Datos: AEMET',
    fetch: async () => ({
      status: 'ok' as const,
      data: { points: [], horizonHours: 0 },
      provenance: {
        source: 'aemet' as const,
        observedAt: FIXED_NOW.toISOString(),
        updatedAt: null,
        status: 'live' as const,
        licenseStatus: 'allowed-with-attribution' as const,
        freshness: 0,
        authorization: AUTH,
        attribution: 'Datos: AEMET',
      },
    }),
  };
  const svc = new SnowDataService({ stations: {} as never, reports: {} as never }, {
    adapters: { aemet: emptyOk } as never,
    chains: { ...FALLBACK_CHAINS, forecast: ['aemet'] },
  });
  const r = await svc.fetch('forecast', input());
  assert.strictEqual(r.status, 'no_data', 'un bundle vacío nunca es `ok`');
});

test('AE13·D2: la estructura REAL de `vientoAndRachaMax` produce velocidad y racha', () => {
  // Forma EXACTA medida contra el servicio (defecto 2).
  const entrada = [
    { direccion: ['SO'], velocidad: ['8'], periodo: '20' },
    { value: '27', periodo: '20' },
    { direccion: ['SO'], velocidad: ['6'], periodo: '21' },
    { value: '20', periodo: '21' },
    // Hora con sólo racha: la velocidad NO se rellena con la racha.
    { value: '31', periodo: '22' },
  ];
  const { velocidad, racha } = parseVientoAndRachaMax(entrada);
  assert.strictEqual(velocidad.get('20'), '8', 'la velocidad se lee de velocidad[]');
  assert.strictEqual(racha.get('20'), '27', 'la racha se lee del `value` hermano');
  assert.strictEqual(velocidad.get('21'), '6');
  assert.strictEqual(racha.get('21'), '20');
  assert.strictEqual(velocidad.get('22'), undefined, 'sin velocidad[] no se copia la racha a la velocidad');
  assert.strictEqual(racha.get('22'), '31');

  // Y de punta a punta: 2 tramos, no 1, con viento y racha reales.
  const parsed = parsePrediccion(
    JSON.stringify([
      {
        elaborado: '2026-11-16T21:05:09',
        nombre: 'Naut Aran',
        prediccion: {
          dia: [
            {
              fecha: '2026-11-16T00:00:00',
              temperatura: [{ value: '4', periodo: '20' }],
              vientoAndRachaMax: entrada,
              estadoCielo: [{ value: '11', descripcion: 'Despejado', periodo: '20' }],
            },
          ],
        },
      },
    ]),
  );
  assert.strictEqual(parsed.ok, true);
  if (!parsed.ok) return;
  assert.strictEqual(parsed.bundle.points.length, 3);
  assert.strictEqual(parsed.bundle.points[0].windKmh, 8);
  assert.strictEqual(parsed.bundle.points[0].gustKmh, 27);
  assert.strictEqual(parsed.bundle.points[1].windKmh, 6);
  assert.strictEqual(parsed.bundle.points[1].gustKmh, 20);
});

test('AE13·D4: `probNieve` diaria se expone en `bundle.daily`, nunca como horaria ni en null silencioso', () => {
  const parsed = parsePrediccion(
    JSON.stringify([
      {
        elaborado: '2026-11-16T21:05:09',
        nombre: 'Naut Aran',
        prediccion: {
          dia: [
            {
              fecha: '2026-11-16T00:00:00',
              temperatura: [{ value: '4', periodo: '20' }],
              // Forma REAL: probabilidad de nieve DIARIA.
              probNieve: [{ value: '35', periodo: '1901' }],
              estadoCielo: [{ value: '11', descripcion: 'Despejado', periodo: '20' }],
            },
          ],
        },
      },
    ]),
  );
  assert.strictEqual(parsed.ok, true);
  if (!parsed.ok) return;
  // Horaria: null (no se inventa precisión).
  assert.strictEqual(parsed.bundle.points[0].probSnowPct, null);
  // Pero el valor SÍ se sirve, como agregado diario: no es un null silencioso.
  assert.deepStrictEqual(parsed.bundle.daily, [{ day: '2026-11-16', snowProbabilityPct: 35 }]);
  // Y queda declarado en el diagnóstico de periodos descartados.
  assert.ok(parsed.skipped.some((s) => s.periodo === '1901'));
});

// ------------------------------------------------------------------ AE14 (REGRESIÓN defecto semántico de la 3ª verificación real)

test('AE14·S: dos estaciones MAPEADAS consultadas seguidas ⇒ las dos sirven dato, NUNCA not-covered', withKey(async () => {
  // Defecto real: el autolimitador de espaciado devolvía `rate_limited` sin tocar
  // la red; el orquestador lo reducía a `no_data/not-covered`, y el producto
  // afirmaba que Formigal NO tiene cobertura AEMET cuando sí la tiene (22204).
  // Con 48 estaciones mapeadas, casi todas parecerían sin cobertura.
  const { client } = scriptedClient((req) =>
    isEnvelopeRequest(req) ? okFrom('meta-ok.json') : okFrom('prediccion-2dias.json'),
  );
  let clock = 1_000_000;
  const sleeps: number[] = [];
  const adapter = aemetAdapter(AUTH, {
    http: client,
    minSpacingMs: 20_000,
    now: () => clock,
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
  });
  const svc = new SnowDataService(
    { stations: {} as never, reports: {} as never },
    { adapters: { aemet: adapter } as never, chains: { ...FALLBACK_CHAINS, forecast: ['aemet'] } },
  );

  const slugs = ['baqueira-beret', 'formigal-panticosa', 'candanchu', 'espot-esqui'];
  for (const slug of slugs) {
    const r = await svc.fetch('forecast', {
      stationRef: { slug, country: 'ES', lat: 42.7, lng: 0.9 },
      requestedAt: new Date(clock),
      dataType: 'forecast',
    });
    assert.notStrictEqual(r.status, 'no_data', `${slug}: no puede ser no_data`);
    if (r.status === 'no_data') assert.notStrictEqual(r.reason, 'not-covered', `${slug}: «not-covered» sería FALSO`);
    assert.strictEqual(r.status, 'ok', `${slug}: debe servir dato (el espaciado se ESPERA, no se rechaza)`);
    // Y el borde HTTP tampoco puede decir «sin cobertura».
    const httpOut = resultToHttp(r);
    assert.strictEqual(httpOut.status, 200);
    assert.notStrictEqual(httpOut.body['reason'], 'not-covered', `${slug}: el borde no puede mentir sobre la cobertura`);
  }
  // Se ha esperado el espaciado entre llamadas, no se han rechazado.
  assert.ok(sleeps.length >= slugs.length - 1, `debe esperar el espaciado, no rechazar (sleeps=${sleeps.length})`);
  assert.ok(sleeps.every((ms) => ms > 0 && ms <= 20_000), `esperas acotadas por minSpacing: ${JSON.stringify(sleeps)}`);
}));

test('AE14·S2: un 429 REAL del servicio se propaga como rate_limited, no como not-covered', withKey(async () => {
  const { client } = scriptedClient(() => ({
    kind: 'http_error' as const,
    status: 429,
    retryAfterMs: 42_000,
    bodyText: readFixture('ratelimit-429.html'),
    contentType: 'text/html',
  }));
  const adapter = aemetAdapter(AUTH, { http: client, minSpacingMs: 0 });
  const svc = new SnowDataService(
    { stations: {} as never, reports: {} as never },
    { adapters: { aemet: adapter } as never, chains: { ...FALLBACK_CHAINS, forecast: ['aemet'] } },
  );
  const r = await svc.fetch('forecast', input());
  assert.strictEqual(r.status, 'rate_limited', 'la cuota es un estado propio');
  if (r.status !== 'rate_limited') return;
  assert.strictEqual(r.retryAfterMs, 42_000, 'se propaga la ventana para poder reintentar');

  const httpOut = resultToHttp(r);
  assert.strictEqual(httpOut.status, 200, 'no es un error de transporte');
  assert.strictEqual(httpOut.body['status'], 'rate_limited');
  assert.strictEqual(httpOut.body['retryAfterMs'], 42_000);
  assert.notStrictEqual(httpOut.body['reason'], 'not-covered');
}));

test('AE14·S3: `not-covered` queda RESERVADO a estaciones sin municipio en el mapa', async () => {
  let calls = 0;
  const adapter = aemetAdapter(AUTH, {
    http: async () => {
      calls += 1;
      throw new Error('no debe tocarse la red');
    },
    minSpacingMs: 0,
  });
  const svc = new SnowDataService(
    { stations: {} as never, reports: {} as never },
    { adapters: { aemet: adapter } as never, chains: { ...FALLBACK_CHAINS, forecast: ['aemet'] } },
  );
  const r = await svc.fetch('forecast', {
    stationRef: { slug: 'grandvalira', country: 'AD', lat: 42.55, lng: 1.6 },
    requestedAt: FIXED_NOW,
    dataType: 'forecast',
  });
  assert.strictEqual(r.status, 'no_data');
  if (r.status !== 'no_data') return;
  assert.strictEqual(r.reason, 'not-covered', 'sin municipio SÍ es «sin cobertura»');
  assert.strictEqual(calls, 0, 'y no se inventa un municipio vecino');
});

// ------------------------------------------------------------------ utilidades de fecha

test('horas locales de AEMET se convierten con el desplazamiento real de Madrid (CET y CEST)', () => {
  // Invierno: UTC+1.
  assert.strictEqual(madridOffsetMs(Date.UTC(2026, 10, 17, 12, 0, 0)), 3_600_000);
  // Verano: UTC+2.
  assert.strictEqual(madridOffsetMs(Date.UTC(2026, 6, 17, 12, 0, 0)), 7_200_000);
  assert.strictEqual(parseElaborado('2026-11-17T05:40:12'), '2026-11-17T04:40:12.000Z');
  assert.strictEqual(parseElaborado('2026-07-17T05:40:12'), '2026-07-17T03:40:12.000Z');
  assert.strictEqual(parseElaborado('no es fecha'), null, 'una emisión ilegible no se sustituye por el reloj del proceso');
});
