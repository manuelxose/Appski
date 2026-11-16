/**
 * Re-export del contrato que cruza el borde HTTP.
 *
 * **Por qué re-export y no una copia propia:** el backend ya implementó los DTO
 * exactos de `02` §3.2 en `web-ssr/src/snow/models/dto.ts` y
 * `web-ssr/src/snow/contracts/provider-contracts.ts`. Copiarlos aquí crearía
 * dos fuentes de verdad que divergen en silencio; t8 consume **su** definición.
 *
 * Esta es la única importación permitida desde `web-ssr/src/app/snow/**` hacia
 * `web-ssr/src/snow/**`: sólo tipos (sin `express`, sin `node:*`), y el
 * compilador la borra en runtime. No se importan constantes de caché ni
 * adaptadores (02 §3.1: son server-side).
 */
export type {
  LicenseStatus,
  NoDataReason,
  ProviderId,
} from "../../../snow/contracts/provider-contracts";

export type {
  OperationalStatus,
  SnowDepthReport,
  ForecastBundle,
  ForecastPoint,
  AvalancheBulletin,
  ImageGrant,
  StationMaster,
} from "../../../snow/contracts/data-type-map";

export type {
  ProvenanceDto,
  ReportPayload,
  SnowReportDto,
  // Directorio/ficha con nieve OBSERVADA, temporada y paginación (t3). Se
  // RE-EXPORTAN del dominio; no se copian para no tener dos fuentes de verdad.
  SnowObservationDto,
  StationDetailDto,
  StationListDto,
  PaginationDto,
  AlertsDto,
} from "../../../snow/models/dto";

export type { StationSummary } from "../../../snow/models/station";

/**
 * Campos de NIVEL SUPERIOR que el borde añade a `SnowReportDto` cuando el
 * origen es editorial (`provenance.source === "editorial-report"`), acordados
 * con backend-impl (t7, contrato F1). Van aquí y no en `SnowReportDto` porque
 * ese tipo lo posee el backend; aquí se declara sólo la vista que la UI usa.
 *
 * Reglas (05b §7.3):
 *  - presentes → se muestran como etiqueta + enlace saliente;
 *  - ausentes  → se omiten (nunca `""` ni `null`);
 *  - `sourceUrl` es un ENLACE y `author` una ETIQUETA: jamás se copia texto
 *    verbatim del operador.
 */
export interface EditorialReportFields {
  readonly sourceUrl?: string;
  readonly author?: string;
  readonly capturedAt?: string;
  readonly confidence?: number;
}

/** Forma completa que consume la UI: DTO del borde + campos editoriales. */
export type SnowReportView = import("../../../snow/models/dto").SnowReportDto &
  EditorialReportFields;
