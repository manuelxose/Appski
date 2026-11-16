import type { ProviderId } from '../../contracts/provider-contracts';
import type { ProviderState, ProviderRepository } from '../repository-v2';
import { COLLECTIONS } from './file-io';
import {
  TypedCollection,
  requireBoolean,
  requireNullableString,
  requireProviderId,
  requireString,
  type EntityObject,
} from './typed-collection';

function shapeProvider(e: EntityObject, collection: string, id: string): ProviderState {
  const missing = e['missingEnv'];
  const missingEnv = Array.isArray(missing) ? missing.filter((m): m is string => typeof m === 'string') : [];
  return {
    providerId: requireProviderId(e, 'providerId', collection, id),
    configured: requireBoolean(e, 'configured', collection, id),
    missingEnv,
    note: requireNullableString(e, 'note', collection, id),
    disabled: requireBoolean(e, 'disabled', collection, id),
    updatedAt: requireString(e, 'updatedAt', collection, id),
  };
}

/**
 * Estado operativo de proveedores (`providers.json`). ADOSADO a la tabla legal
 * estática (`providers/authorizations.ts`), que NO se sustituye: el veredicto
 * jurídico sigue siendo código. Aquí sólo vive lo mutable (configurado/denegado).
 */
export class JsonProviderRepository implements ProviderRepository {
  private readonly providers: TypedCollection<ProviderState>;

  constructor(private readonly dir: string) {
    this.providers = new TypedCollection<ProviderState>(dir, COLLECTIONS.providers, shapeProvider);
  }

  async get(providerId: ProviderId): Promise<ProviderState | null> {
    return this.providers.findByKey(providerId)?.value ?? null;
  }

  async list(): Promise<readonly ProviderState[]> {
    return this.providers.all().map((x) => x.value);
  }

  async upsert(p: ProviderState): Promise<void> {
    this.providers.upsertByKey({
      providerId: p.providerId,
      configured: p.configured,
      missingEnv: [...p.missingEnv],
      note: p.note,
      disabled: p.disabled,
      updatedAt: p.updatedAt,
    });
  }
}
