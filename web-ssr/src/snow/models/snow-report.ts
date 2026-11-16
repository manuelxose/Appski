import type { OperationalStatus, SnowDepthReport } from '../contracts/data-type-map';

/**
 * Parte EDITORIAL (02 §3.3 tabla `snow_report`). Única fuente legal de estado
 * operativo y espesores (05b §3). Valida en el borde antes de insertar.
 */
export interface SnowReport {
  readonly id: string;
  readonly stationSlug: string;
  /** Fecha del parte (a qué se refiere el dato). */
  readonly observedAt: string;
  /** Cuándo lo transcribió el operador humano (siempre presente). */
  readonly capturedAt: string;
  /** Obligatorio: URL de la fuente consultada por el humano. */
  readonly sourceUrl: string;
  /** Obligatorio: operador humano. */
  readonly author: string;
  /** Obligatorio: confianza del transcritor, [0,1]. */
  readonly confidence: number;
  readonly operational: OperationalStatus | null;
  readonly snow: SnowDepthReport | null;
  readonly avalancheLevel: number | null; // 1..5
  readonly mood: 'draft' | 'pending' | 'published' | 'rejected';
}

/** Entrada de alta en el admin (capturedAt lo fija el servidor). */
export interface NewSnowReportInput {
  readonly stationSlug: string;
  readonly observedAt: string;
  readonly sourceUrl: string;
  readonly author: string;
  readonly confidence: number;
  readonly operational?: OperationalStatus | null;
  readonly snow?: SnowDepthReport | null;
  readonly avalancheLevel?: number | null;
  readonly mood?: 'draft' | 'pending' | 'published' | 'rejected';
}

/** DTO del borde: alias de los tipos de dominio (02 §3.2). */
export type OperationalStatusDto = OperationalStatus;
export type SnowDepthDto = SnowDepthReport;
