import type { AuthorizedWebcam, WebcamRepository } from '../repository-v2';
import { COLLECTIONS } from './file-io';
import { TypedCollection, requireBoolean, requireString, type EntityObject } from './typed-collection';

function shapeWebcam(e: EntityObject, collection: string, id: string): AuthorizedWebcam {
  if (requireBoolean(e, 'embedAllowed', collection, id)) {
    throw new Error(`${collection}#${id}: embedAllowed=true está PROHIBIDO (05b §3: la imagen no se embebe)`);
  }
  return {
    stationSlug: requireString(e, 'stationSlug', collection, id),
    operatorName: requireString(e, 'operatorName', collection, id),
    linkUrl: requireString(e, 'linkUrl', collection, id),
    embedAllowed: false,
    addedAt: requireString(e, 'addedAt', collection, id),
    sourceUrl: requireString(e, 'sourceUrl', collection, id),
  };
}

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Webcams AUTORIZADAS (`webcams.json`). Persisten SOLO el permiso de enlace:
 * `embedAllowed` es `false` por tipo y una entrada con `true` en disco es un
 * error de datos (no se "corrige" en silencio: lanza).
 */
export class JsonWebcamRepository implements WebcamRepository {
  private readonly webcams: TypedCollection<AuthorizedWebcam>;

  constructor(private readonly dir: string) {
    this.webcams = new TypedCollection<AuthorizedWebcam>(dir, COLLECTIONS.webcams, shapeWebcam);
  }

  async listForStation(stationSlug: string): Promise<readonly AuthorizedWebcam[]> {
    return this.webcams
      .find((e) => e['stationSlug'] === stationSlug)
      .map((x) => x.value);
  }

  async add(w: AuthorizedWebcam): Promise<void> {
    if (!isHttpUrl(w.linkUrl)) throw new Error(`webcams: linkUrl debe ser http(s) ('${w.linkUrl}')`);
    if (!isHttpUrl(w.sourceUrl)) throw new Error(`webcams: sourceUrl debe ser http(s) ('${w.sourceUrl}')`);
    this.webcams.upsertByKey({
      stationSlug: w.stationSlug,
      operatorName: w.operatorName,
      linkUrl: w.linkUrl,
      embedAllowed: false,
      addedAt: w.addedAt,
      sourceUrl: w.sourceUrl,
    });
  }
}
