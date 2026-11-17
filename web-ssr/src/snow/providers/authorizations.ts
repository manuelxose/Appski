import type { Authorization, ProviderId } from '../contracts/provider-contracts';

/**
 * Veredictos de autorización copiados del registro (05 §2). Referencia de
 * trazabilidad documento↔código en `registryRef`.
 */
export const AUTHORIZATIONS: Readonly<Partial<Record<ProviderId, Authorization>>> = {
  'editorial-stations': {
    registryRef: '05#editorial',
    licenseId: 'editorial-own',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: false,
  },
  'editorial-report': {
    registryRef: '05#editorial',
    licenseId: 'editorial-own',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: false,
  },
  aemet: {
    registryRef: '05#aemet',
    licenseId: 'aemet-nota-legal',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
  'aemet-bpa': {
    registryRef: '05#aemet-bpa',
    licenseId: 'aemet-nota-legal',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
  meteofrance: {
    registryRef: '05#meteofrance',
    licenseId: 'licence-ouverte-2.0',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
  'copernicus-c3s': {
    registryRef: '05#copernicus-c3s',
    licenseId: 'copernicus-free',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
  'copernicus-clms': {
    registryRef: '05#copernicus-clms',
    licenseId: 'copernicus-free',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
  'ign-es': {
    registryRef: '05#ign-es',
    licenseId: 'cc-by-4.0',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
  'ign-fr': {
    registryRef: '05#ign-fr',
    licenseId: 'licence-ouverte',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
  osm: {
    registryRef: '05#osm',
    licenseId: 'odbl-1.0',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
  protomaps: {
    registryRef: '05#protomaps',
    licenseId: 'odbl-derived',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
  /**
   * MeteoAlarm (EUMETNET) — `weather-alert`.
   *
   * Cláusula LITERAL leída por nosotros en el propio feed Atom, elemento
   * `<rights>` (capturada en fixtures/METEOALARM-PROVENANCE.json):
   *   "Copyright © 2026 MeteoAlarm.Org. Licensed under terms equivalent to
   *    CC BY 4.0, with additional requirements for redistributing outlined in
   *    our Terms and Conditions."
   *
   * Consecuencias que aplica el adapter:
   * - atribución OBLIGATORIA (`attributionRequired: true`): "EUMETNET – MeteoAlarm"
   *   si el aviso cubre varios países, o el nombre del NMHS si es uno solo;
   * - NO modificar el contenido (se redistribuye tal cual) y conservar hora de
   *   emisión (`cap:sent`) y enlace a MeteoAlarm;
   * - latencia máxima ≤10 min ⇒ caché obligatoria de 10 min (cache-policy.ts).
   *
   * Ruta REAL verificada: feeds.meteoalarm.org/feeds/meteoalarm-legacy-atom-<país>.
   * La ruta /api/v1/warnings/feeds-XX responde 404 y NO se usa.
   */
  meteoalarm: {
    registryRef: '06#meteoalarm-rights-element',
    licenseId: 'cc-by-4.0-equivalent-meteoalarm',
    commercialUse: true,
    storageAllowed: true,
    attributionRequired: true,
  },
};

export const ATTRIBUTIONS: Readonly<Partial<Record<ProviderId, string>>> = {
  aemet: 'Datos: AEMET',
  'aemet-bpa': 'Datos: AEMET (boletín de peligro de aludes)',
  meteofrance: 'Datos: Météo-France (Licence Ouverte 2.0)',
  'copernicus-c3s': 'Datos: Copernicus Climate Data Store',
  'copernicus-clms': 'Datos: Copernicus Land Monitoring Service',
  'ign-es': 'Datos: IGN España (CC-BY 4.0)',
  'ign-fr': 'Datos: IGN France (Licence Ouverte)',
  osm: '© OpenStreetMap contributors (ODbL)',
  protomaps: '© OpenStreetMap contributors (ODbL)',
  // Atribución por defecto (multi-país). Para UN solo país se usa el NMHS
  // concreto vía `meteoalarmAttribution(country)`.
  meteoalarm: 'EUMETNET – MeteoAlarm',
};

/**
 * Nombre del servicio meteorológico nacional (NMHS) por país, tal como lo exige
 * la cláusula de atribución de MeteoAlarm cuando el aviso cubre UN solo país.
 */
export const METEOALARM_NMHS: Readonly<Record<'ES' | 'AD' | 'FR' | 'PT', string>> = {
  ES: 'AEMET',
  AD: 'Meteo Andorra / Servei Meteorològic Nacional',
  FR: 'Météo-France',
  PT: 'IPMA',
};

/**
 * Atribución de un aviso MeteoAlarm. Multi-país ⇒ "EUMETNET – MeteoAlarm";
 * un solo país ⇒ el NMHS. Nunca inventa un NMHS desconocido.
 */
export function meteoalarmAttribution(countries: readonly ('ES' | 'AD' | 'FR' | 'PT')[]): string {
  const unique = [...new Set(countries)];
  if (unique.length !== 1) return ATTRIBUTIONS.meteoalarm as string;
  return `${METEOALARM_NMHS[unique[0]]} vía EUMETNET – MeteoAlarm`;
}

/**
 * DISCLAIMER LITERAL exigido por los T&C de MeteoAlarm (Last Updated 15/03/2024).
 *
 * Texto copiado CARÁCTER A CARÁCTER del extracto literal verificado en la Fase A
 * (`docs/snow/snow03-t1-verification-cache.json`, grupo `meteoalarm_terms`):
 *
 *   «All redistributors must publish the following disclaimer: "Time delays
 *    between this website and the www.meteoalarm.org website are possible. For
 *    the most up-to-date awareness information as published by the participating
 *    National Meteorological and Hydrological Services, please refer to
 *    www.meteoalarm.org."»
 *
 * NO es una paráfrasis y NO debe reescribirse: un test compara este valor con el
 * texto de la evidencia y falla si difiere un solo carácter. Debe PUBLICARSE en
 * la respuesta de /alerts (antes sólo se definía y nunca se servía, lo que hacía
 * que la única integración operativa incumpliese su propia licencia).
 */
export const METEOALARM_DISCLAIMER =
  'Time delays between this website and the www.meteoalarm.org website are possible. ' +
  'For the most up-to-date awareness information as published by the participating ' +
  'National Meteorological and Hydrological Services, please refer to www.meteoalarm.org.';

/**
 * Enlace obligatorio: «Any Information being redistributed through internet
 * applications must include a link to the following URL: www.meteoalarm.org».
 */
export const METEOALARM_SOURCE_URL = 'https://meteoalarm.org/en/live/';

/** URL que los T&C nombran literalmente (para la obligación de enlace). */
export const METEOALARM_LINK_TARGET = 'www.meteoalarm.org';

/**
 * Alias de compatibilidad: mantiene el nombre anterior (`METEOALARM_LATENCY_DISCLAIMER`)
 * apuntando al texto LITERAL, para no dejar código que publique una paráfrasis.
 */
export const METEOALARM_LATENCY_DISCLAIMER = METEOALARM_DISCLAIMER;

export function authorizationFor(id: ProviderId): Authorization {
  return AUTHORIZATIONS[id] ?? {
    registryRef: `05#${id}`,
    licenseId: 'blocked',
    commercialUse: false,
    storageAllowed: false,
    attributionRequired: false,
  };
}

export function attributionFor(id: ProviderId): string | null {
  return ATTRIBUTIONS[id] ?? null;
}
