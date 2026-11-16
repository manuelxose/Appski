import type { AlertRepository, StoredAlert, StoredAlertInput } from '../repository-v2';
import { COLLECTIONS } from './file-io';
import {
  TypedCollection,
  requireLicenseStatus,
  requireNullableString,
  requireProviderId,
  requireString,
  type EntityObject,
} from './typed-collection';

const LEVELS = ['green', 'yellow', 'orange', 'red'] as const;
const LEVEL_WEIGHT: Readonly<Record<(typeof LEVELS)[number], number>> = { red: 4, orange: 3, yellow: 2, green: 1 };

function shapeLevel(e: EntityObject, collection: string, id: string): (typeof LEVELS)[number] {
  const v = requireString(e, 'level', collection, id);
  const known = LEVELS.find((l) => l === v);
  if (known === undefined) throw new Error(`${collection}#${id}: level inválido '${v}'`);
  return known;
}

function shapeAlert(e: EntityObject, collection: string, id: string): StoredAlertInput {
  return {
    id: requireString(e, 'id', collection, id),
    stationSlug: requireString(e, 'stationSlug', collection, id),
    source: requireProviderId(e, 'source', collection, id),
    level: shapeLevel(e, collection, id),
    phenomenon: requireString(e, 'phenomenon', collection, id),
    validFrom: requireString(e, 'validFrom', collection, id),
    validUntil: requireString(e, 'validUntil', collection, id),
    area: requireString(e, 'area', collection, id),
    observedAt: requireString(e, 'observedAt', collection, id),
    updatedAt: requireString(e, 'updatedAt', collection, id),
    expiresAt: requireNullableString(e, 'expiresAt', collection, id),
    licenseStatus: requireLicenseStatus(e, 'licenseStatus', collection, id),
    attribution: requireNullableString(e, 'attribution', collection, id),
  };
}

function alertRecord(a: StoredAlertInput): EntityObject {
  return {
    id: a.id,
    stationSlug: a.stationSlug,
    source: a.source,
    level: a.level,
    phenomenon: a.phenomenon,
    validFrom: a.validFrom,
    validUntil: a.validUntil,
    area: a.area,
    observedAt: a.observedAt,
    updatedAt: a.updatedAt,
    expiresAt: a.expiresAt,
    licenseStatus: a.licenseStatus,
    attribution: a.attribution,
  };
}

/**
 * Alertas persistidas (`alerts.json`). Colección ADOSADA por SNOW-02 (§3.1).
 *
 * La clave lógica es el id del PROVEEDOR: un upsert del mismo id actualiza la
 * alerta y CONSERVA su id interno. `expiresAt: null` significa "la fuente no
 * declara caducidad"; se compara con el reloj del llamador y `validUntil` decide.
 * Una alerta caducada no se sirve como vigente (nunca se "revive").
 */
export class JsonAlertRepository implements AlertRepository {
  private readonly alerts: TypedCollection<StoredAlertInput>;

  constructor(private readonly dir: string) {
    this.alerts = new TypedCollection<StoredAlertInput>(dir, COLLECTIONS.alerts, shapeAlert);
  }

  private isActive(a: StoredAlertInput, at: Date): boolean {
    const now = at.getTime();
    if (a.expiresAt !== null) {
      const exp = Date.parse(a.expiresAt);
      if (Number.isFinite(exp) && now >= exp) return false;
    }
    const until = Date.parse(a.validUntil);
    return Number.isFinite(until) ? now < until : true;
  }

  async listActive(stationSlug: string, at: Date): Promise<readonly StoredAlert[]> {
    return this.alerts
      .find((e) => e['stationSlug'] === stationSlug)
      .map((x) => ({ ...x.value, internalId: x.id }))
      .filter((a) => this.isActive(a, at))
      .sort((a, b) => LEVEL_WEIGHT[b.level] - LEVEL_WEIGHT[a.level] || Date.parse(a.validUntil) - Date.parse(b.validUntil));
  }

  async upsert(a: StoredAlertInput): Promise<StoredAlert> {
    const hit = this.alerts.findByKey(a.id);
    if (!hit) {
      const created = this.alerts.insert(alertRecord(a));
      return { ...created.value, internalId: created.id };
    }
    const updated = this.alerts.upsertByKey(alertRecord(a));
    return { ...updated.value, internalId: updated.id };
  }
}
