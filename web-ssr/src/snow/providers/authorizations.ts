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
};

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
