/**
 * Errores TIPADOS del borde v1 (SNOW-02 §4.3). Cada uno lleva su código HTTP y
 * su cuerpo; el router no decide códigos a mano, los recibe de aquí.
 *
 * Contrato: un parámetro o cuerpo inválido NUNCA produce 500. Solo `error:
 * 'internal'` (500) refleja un defecto propio del servidor.
 */
import type { EditorialValidationError } from '../store/repository';
import type { ProvenanceDto } from '../models/dto';

export interface ErrorBody {
  readonly status?: string;
  readonly error: string;
  readonly fields?: readonly EditorialValidationError[];
  readonly provenance?: ProvenanceDto;
}

export type SnowHttpError =
  | { readonly kind: 'invalid'; readonly code: 400; readonly body: ErrorBody }
  | { readonly kind: 'not-found'; readonly code: 404; readonly body: ErrorBody };

export function invalidError(
  errors: readonly EditorialValidationError[],
  provenance: ProvenanceDto,
): SnowHttpError {
  return {
    kind: 'invalid',
    code: 400,
    body: { status: 'invalid', error: 'invalid', fields: errors, provenance },
  };
}

export function notFoundError(provenance: ProvenanceDto): SnowHttpError {
  return { kind: 'not-found', code: 404, body: { status: 'not_found', error: 'station-not-found', provenance } };
}
