import express from 'express';
import { SnowService } from './snow.service';
import { resultToHttp } from './http-mapping';
import { adminApiMiddleware } from './admin-auth';

/**
 * Fuente única de verdad del borde HTTP público (C22). El router se construye
 * mapeando sobre esta lista, de modo que una ruta no puede existir en un sitio
 * y no en el otro.
 */
export type SnowRouteHandler = (
  service: SnowService,
  req: express.Request,
  res: express.Response,
) => Promise<void>;

export interface SnowRoute {
  readonly method: 'GET' | 'POST';
  /** Plantilla de ruta tal como la monta Express. */
  readonly path: string;
  /** Ruta concreta sin parámetros, para que los tests la invoquen. */
  readonly sample: string;
  /** true ⇒ requiere auth de admin (excluida de C22). */
  readonly admin: boolean;
  /** Estado esperado SIN credenciales (para C22). Irrelevante en rutas admin. */
  readonly expectedNoCredential: 'ok' | 'no_data' | 'not_configured' | 'blocked';
  readonly handler: SnowRouteHandler;
}

export const SNOW_ROUTES: readonly SnowRoute[] = [
  {
    method: 'GET',
    path: '/v1/stations',
    sample: '/v1/stations',
    admin: false,
    expectedNoCredential: 'ok',
    handler: async (service, _req, res) => {
      res.json(await service.listStations());
    },
  },
  {
    method: 'GET',
    path: '/v1/search',
    sample: '/v1/search',
    admin: false,
    expectedNoCredential: 'ok',
    handler: async (service, req, res) => {
      const q = typeof req.query['q'] === 'string' ? req.query['q'] : '';
      res.json(await service.searchStations(q));
    },
  },
  {
    method: 'GET',
    path: '/v1/stations/:slug/report',
    sample: '/v1/stations/baqueira-beret/report',
    admin: false,
    expectedNoCredential: 'no_data',
    handler: async (service, req, res) => {
      const dto = await service.getReport(req.params['slug']);
      if (dto === 'not-found') {
        res.status(404).json(service.notFound());
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
    handler: async (service, req, res) => {
      const r = await service.getForecast(req.params['slug']);
      if (r === 'not-found') {
        res.status(404).json(service.notFound());
        return;
      }
      const out = resultToHttp(r);
      res.status(out.status).json(out.body);
    },
  },
  {
    method: 'GET',
    path: '/v1/stations/:slug/webcams',
    sample: '/v1/stations/baqueira-beret/webcams',
    admin: false,
    expectedNoCredential: 'blocked',
    handler: async (service, req, res) => {
      res.json(await service.getWebcams(req.params['slug']));
    },
  },
  {
    method: 'GET',
    path: '/v1/avalanche',
    sample: '/v1/avalanche',
    admin: false,
    expectedNoCredential: 'not_configured',
    handler: async (service, _req, res) => {
      const out = resultToHttp(await service.getAvalanche());
      res.status(out.status).json(out.body);
    },
  },
  {
    method: 'GET',
    path: '/v1/rankings/nieve',
    sample: '/v1/rankings/nieve',
    admin: false,
    expectedNoCredential: 'no_data',
    handler: async (service, _req, res) => {
      res.json(await service.rankingNieve());
    },
  },
  {
    method: 'GET',
    path: '/v1/rankings/km',
    sample: '/v1/rankings/km',
    admin: false,
    expectedNoCredential: 'no_data',
    handler: async (service, _req, res) => {
      res.json(await service.rankingKm());
    },
  },
  {
    method: 'GET',
    path: '/v1/season-dates',
    sample: '/v1/season-dates',
    admin: false,
    expectedNoCredential: 'ok',
    handler: async (service, _req, res) => {
      res.json(await service.seasonDates());
    },
  },
  {
    method: 'GET',
    path: '/v1/stations/:slug',
    sample: '/v1/stations/baqueira-beret',
    admin: false,
    expectedNoCredential: 'ok',
    handler: async (service, req, res) => {
      const station = await service.getStation(req.params['slug']);
      if (station === 'not-found') {
        res.status(404).json(service.notFound());
        return;
      }
      res.json(station);
    },
  },
  // ---- admin (excluidas de C22; auth propia) ----
  {
    method: 'GET',
    path: '/v1/config',
    sample: '/v1/config',
    admin: true,
    expectedNoCredential: 'not_configured',
    handler: async (service, _req, res) => {
      res.json(service.config());
    },
  },
  {
    method: 'GET',
    path: '/v1/admin/reports',
    sample: '/v1/admin/reports',
    admin: true,
    expectedNoCredential: 'not_configured',
    handler: async (service, _req, res) => {
      res.json({ reports: await service.listReports() });
    },
  },
  {
    method: 'POST',
    path: '/v1/admin/reports',
    sample: '/v1/admin/reports',
    admin: true,
    expectedNoCredential: 'not_configured',
    handler: async (service, req, res) => {
      const result = await service.createReport(req.body);
      if (!result.ok) {
        res.status(400).json({ status: 'invalid', fields: result.errors });
        return;
      }
      res.status(201).json({ report: result.report });
    },
  },
];

export function snowRouter(service: SnowService): express.Router {
  const router = express.Router();
  router.use(express.json({ limit: '64kb' }));
  for (const route of SNOW_ROUTES) {
    const handler = wrap((req, res) => route.handler(service, req, res));
    if (route.method === 'GET') {
      if (route.admin) router.get(route.path, adminApiMiddleware, handler);
      else router.get(route.path, handler);
    } else {
      router.post(route.path, adminApiMiddleware, handler);
    }
  }
  return router;
}

function wrap(h: (req: express.Request, res: express.Response) => Promise<void>): (req: express.Request, res: express.Response) => void {
  return (req, res) => {
    h(req, res).catch((err: unknown) => {
      console.error('snow route error:', err instanceof Error ? err.message : String(err));
      res.status(500).json({ error: 'internal' });
    });
  };
}
