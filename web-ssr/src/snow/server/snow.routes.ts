import express from 'express';
import { SnowService } from './snow.service';
import { resultToHttp } from './http-mapping';
import { adminApiMiddleware } from './admin-auth';
import { invalidError, notFoundError } from './snow.errors';
import { parseStationQuery } from './station-query';
import { MAX_Q_LENGTH, checkKeys, type QueryParse } from './query';
import { RateLimiter, type RateLimitWindow } from '../cache/rate-limit';
import type { EditorialValidationError } from '../store/repository';
import type { ConfigDto } from '../models/dto';

/**
 * Fuente única de verdad del borde HTTP público (C22). El router se construye
 * mapeando sobre esta lista, de modo que una ruta no puede existir en un sitio
 * y no en el otro.
 *
 * Contrato de errores (SNOW-02 §4.3):
 *   400 `invalid` + `fields[]`  → query/cuerpo no válidos (NUNCA 500)
 *   404 `station-not-found` + provenance → slug desconocido
 *   500 `internal`              → solo defecto propio (adapter `error`)
 */
export type SnowRouteHandler = (
  service: SnowService,
  req: express.Request,
  res: express.Response,
) => Promise<void>;

export interface SnowRoute {
  readonly method: 'GET' | 'POST' | 'PUT';
  /** Plantilla de ruta tal como la monta Express. */
  readonly path: string;
  /** Ruta concreta sin parámetros, para que los tests la invoquen. */
  readonly sample: string;
  /** true ⇒ requiere auth de admin (excluida de C22). */
  readonly admin: boolean;
  /** true ⇒ lectura costosa O(n·m): lleva límite de tasa propio (antiabuso). */
  readonly costly?: boolean;
  /** Estado esperado SIN credenciales (para C22). Irrelevante en rutas admin. */
  readonly expectedNoCredential: 'ok' | 'no_data' | 'not_configured' | 'blocked';
  /** Query params que el contrato admite. Cualquier otro ⇒ 400. */
  readonly query: readonly string[];
  readonly handler: SnowRouteHandler;
}

/** Query vacía: la ruta no admite parámetros. */
const NO_QUERY: readonly string[] = [];

/** 400 tipado con la procedencia del maestro y los campos culpables. */
function sendInvalid(service: SnowService, res: express.Response, errors: readonly EditorialValidationError[]): void {
  const e = invalidError(errors, service.editorialProvenance());
  res.status(e.code).json(e.body);
}

/** 404 tipado con cuerpo en forma de procedencia (C23). */
function sendNotFound(service: SnowService, res: express.Response): void {
  const e = notFoundError(service.editorialProvenance());
  res.status(e.code).json(e.body);
}

/**
 * Anti-filtración B1: `GET /v1/config` no sirve NOMBRES de variables de entorno.
 * `missingEnv`/`requiredEnv` se reducen a su recuento y los `limitations[].detail`
 * se sanean. La decisión vive en el borde (ruta), sin tocar el DTO del servicio.
 */
const ENV_NAME_RE = /\b[A-Z][A-Z0-9_]*(?:_API_KEY|_TOKEN|_BASE_URL|_SECRET|_PASSWORD)\b/g;

function redactEnvNames(text: string): string {
  return text.replace(ENV_NAME_RE, '<redacted>');
}

function redactConfig(cfg: ConfigDto): Record<string, unknown> {
  return {
    ...cfg,
    providers: cfg.providers.map((p) => ({
      ...p,
      missingEnv: p.missingEnv.length,
      requiredEnv: p.requiredEnv.length,
    })),
    limitations: cfg.limitations.map((l) => ({ ...l, detail: redactEnvNames(l.detail) })),
  };
}

/** Query de `/v1/search`: solo `q`, obligatorio, normalizado y acotado. */
function parseSearchQuery(raw: express.Request['query']): QueryParse<{ q: string }> {
  const errors: EditorialValidationError[] = [...checkKeys(raw, ['q'])];
  const q = raw['q'];
  if (q === undefined) {
    errors.push({ field: 'q', message: 'is required (non-empty search string)' });
  } else if (typeof q !== 'string') {
    errors.push({ field: 'q', message: 'must be given at most once, as a plain value' });
  } else if (q.length > MAX_Q_LENGTH) {
    errors.push({ field: 'q', message: `must be at most ${MAX_Q_LENGTH} characters` });
  } else if (q.trim().length === 0) {
    errors.push({ field: 'q', message: 'must not be blank (use /v1/stations for the full directory)' });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { q: (q as string).trim() } };
}

export const SNOW_ROUTES: readonly SnowRoute[] = [
  {
    method: 'GET',
    path: '/v1/stations',
    sample: '/v1/stations',
    admin: false,
    expectedNoCredential: 'ok',
    query: ['country', 'region', 'discipline', 'status', 'snowMin', 'sort', 'sortDir', 'page', 'pageSize'],
    handler: async (service, req, res) => {
      const parsed = parseStationQuery(req.query);
      if (!parsed.ok) {
        sendInvalid(service, res, parsed.errors);
        return;
      }
      res.json(await service.listStations(parsed.value));
    },
  },
  {
    method: 'GET',
    path: '/v1/search',
    // `q` es OBLIGATORIO (SNOW-02 §4.1 fila 11): el sample de una ruta válida lo
    // incluye para que C22 (200 con cero credenciales) siga siendo cierto. El 400
    // de `/v1/search` sin `q` tiene su propio test (`http-contract.test.ts`).
    sample: '/v1/search?q=baqueira',
    admin: false,
    costly: true,
    expectedNoCredential: 'ok',
    query: ['q'],
    handler: async (service, req, res) => {
      const parsed = parseSearchQuery(req.query);
      if (!parsed.ok) {
        sendInvalid(service, res, parsed.errors);
        return;
      }
      res.json(await service.searchStations(parsed.value.q));
    },
  },
  {
    method: 'GET',
    path: '/v1/stations/:slug/report',
    sample: '/v1/stations/baqueira-beret/report',
    admin: false,
    expectedNoCredential: 'no_data',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      const dto = await service.getReport(req.params['slug']);
      if (dto === 'not-found') {
        sendNotFound(service, res);
        return;
      }
      res.json(dto);
    },
  },
  {
    method: 'GET',
    path: '/v1/stations/:slug/forecast',
    sample: '/v1/stations/baqueira-beret/forecast',
    admin: false,
    expectedNoCredential: 'not_configured',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      const r = await service.getForecast(req.params['slug']);
      if (r === 'not-found') {
        sendNotFound(service, res);
        return;
      }
      const out = resultToHttp(r);
      res.status(out.status).json(out.body);
    },
  },
  {
    method: 'GET',
    path: '/v1/stations/:slug/alerts',
    sample: '/v1/stations/baqueira-beret/alerts',
    admin: false,
    expectedNoCredential: 'not_configured',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      const dto = await service.getAlerts(req.params['slug']);
      if (dto === 'not-found') {
        sendNotFound(service, res);
        return;
      }
      res.json(dto);
    },
  },
  {
    method: 'GET',
    path: '/v1/stations/:slug/webcams',
    sample: '/v1/stations/baqueira-beret/webcams',
    admin: false,
    expectedNoCredential: 'blocked',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      const dto = await service.getWebcams(req.params['slug']);
      if (dto === 'not-found') {
        sendNotFound(service, res);
        return;
      }
      res.json(dto);
    },
  },
  {
    method: 'GET',
    path: '/v1/avalanche',
    sample: '/v1/avalanche',
    admin: false,
    expectedNoCredential: 'not_configured',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      const out = resultToHttp(await service.getAvalanche());
      res.status(out.status).json(out.body);
    },
  },
  {
    method: 'GET',
    path: '/v1/rankings/nieve',
    sample: '/v1/rankings/nieve',
    admin: false,
    costly: true,
    expectedNoCredential: 'no_data',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      res.json(await service.rankingNieve());
    },
  },
  {
    method: 'GET',
    path: '/v1/rankings/km',
    sample: '/v1/rankings/km',
    admin: false,
    costly: true,
    expectedNoCredential: 'no_data',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      res.json(await service.rankingKm());
    },
  },
  {
    method: 'GET',
    path: '/v1/season-dates',
    sample: '/v1/season-dates',
    admin: false,
    expectedNoCredential: 'ok',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      res.json(await service.seasonDates());
    },
  },
  {
    method: 'GET',
    path: '/v1/stations/:slug',
    sample: '/v1/stations/baqueira-beret',
    admin: false,
    expectedNoCredential: 'ok',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      const station = await service.getStation(req.params['slug']);
      if (station === 'not-found') {
        sendNotFound(service, res);
        return;
      }
      res.json(station);
    },
  },
  // ---- admin (excluidas de C22; auth propia vía adminApiMiddleware) ----
  {
    method: 'GET',
    path: '/v1/config',
    sample: '/v1/config',
    admin: true,
    expectedNoCredential: 'not_configured',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      res.json(redactConfig(service.config()));
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/reports',
    sample: '/v1/admin/reports',
    admin: true,
    expectedNoCredential: 'not_configured',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      res.json({ status: 'ok', provenance: service.editorialProvenance(), reports: await service.listReports() });
    },
  },
  {
    method: 'POST',
    path: '/v1/admin/reports',
    sample: '/v1/admin/reports',
    admin: true,
    expectedNoCredential: 'not_configured',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const result = await service.createReport(req.body);
      if (!result.ok) {
        sendInvalid(service, res, result.errors);
        return;
      }
      res.status(201).json({ status: 'ok', provenance: service.editorialProvenance(), report: result.report });
    },
  },
  {
    method: 'PUT',
    path: '/v1/admin/stations/:slug',
    sample: '/v1/admin/stations/baqueira-beret',
    admin: true,
    expectedNoCredential: 'not_configured',
    query: NO_QUERY,
    handler: async (service, req, res) => {
      const errors = checkKeys(req.query, NO_QUERY);
      if (errors.length > 0) {
        sendInvalid(service, res, errors);
        return;
      }
      const result = await service.upsertStation(req.params['slug'], req.body);
      if (!result.ok) {
        sendInvalid(service, res, result.errors);
        return;
      }
      res.status(result.created ? 201 : 200).json({
        status: 'ok',
        created: result.created,
        station: result.station,
        provenance: result.provenance,
      });
    },
  },
];

/** Límites de tasa del borde (antiabuso), en memoria y por proceso. */
const ADMIN_WRITE_LIMIT: RateLimitWindow = { windowMs: 60_000, max: 20 };
const COSTLY_READ_LIMIT: RateLimitWindow = { windowMs: 60_000, max: 100 };

/** Middleware de tasa. La clave es `ip#bucket`, así que rutas distintas no se pisan. */
function rateLimit(limiter: RateLimiter, bucket: string): express.RequestHandler {
  return (req, res, next) => {
    const key = `${req.ip ?? 'unknown'}::${bucket}`;
    const { allowed, retryAfterMs } = limiter.allow(key);
    if (!allowed) {
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: 'rate_limited', retryAfterSeconds });
      return;
    }
    next();
  };
}

/**
 * Último recurso del router: errores del parser de cuerpo (`express.json`) y
 * cualquier `next(err)`. El 400/413 es TIPADO y sin stack ni detalle interno; el
 * 500 solo revela `internal`. Los errores de handler los captura `wrap`.
 */
function bodyErrorHandler(
  err: unknown,
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  const e = err as { status?: number; type?: string } | null;
  if (e?.type === 'entity.too.large' || e?.status === 413) {
    res.status(413).json({ error: 'invalid', message: 'request body too large' });
    return;
  }
  if (e?.type === 'entity.parse.failed' || e?.status === 400) {
    res.status(400).json({ error: 'invalid', message: 'malformed JSON body' });
    return;
  }
  console.error('snow route error:', err instanceof Error ? err.message : String(err));
  res.status(500).json({ error: 'internal' });
}

export function snowRouter(service: SnowService): express.Router {
  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));
  const adminWrite = new RateLimiter(ADMIN_WRITE_LIMIT);
  const costlyRead = new RateLimiter(COSTLY_READ_LIMIT);
  for (const route of SNOW_ROUTES) {
    const handler = wrap((req, res) => route.handler(service, req, res));
    if (route.method === 'GET') {
      if (route.admin) router.get(route.path, adminApiMiddleware, handler);
      else if (route.costly) router.get(route.path, rateLimit(costlyRead, route.path), handler);
      else router.get(route.path, handler);
    } else if (route.method === 'POST') {
      // POST/PUT admin: auth SIEMPRE primero (fail-closed), luego límite de tasa.
      router.post(route.path, adminApiMiddleware, rateLimit(adminWrite, route.path), handler);
    } else {
      router.put(route.path, adminApiMiddleware, rateLimit(adminWrite, route.path), handler);
    }
  }
  router.use(bodyErrorHandler);
  return router;
}

function wrap(h: (req: express.Request, res: express.Response) => Promise<void>): (req: express.Request, res: express.Response) => void {
  return (req, res) => {
    h(req, res).catch((err: unknown) => {
      // Último recurso: esto sí es un defecto propio. Nunca se usa para validación.
      console.error('snow route error:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ error: 'internal' });
    });
  };
}
