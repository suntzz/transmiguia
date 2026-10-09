import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';

export type StationCatalogEntry = {
  id: string;
  name: string;
  aliases?: string[];
};

export type StationStatusSource =
  | 'remote-json'
  | 'official-html'
  | 'heuristic'
  | 'fallback'
  | 'cache';

type StationStatusCachePayload = {
  statusMap: Record<string, boolean>;
  sourceMap: Record<string, StationStatusSource>;
  lastStatusUpdate: number;
  warnings: string[];
};

const CACHE_FILE_URI = FileSystem.cacheDirectory
  ? `${FileSystem.cacheDirectory}tm-station-status-cache.json`
  : null;

const DEFAULT_REFRESH_HOURS = 6;
const knownInactivePatterns = [
  'marly',
  'temporal',
  'cerrada',
  'cerrado',
  'fuera de servicio',
];

const OFFICIAL_STATUS_SOURCE_URLS = [
  'https://www.transmilenio.gov.co/comunicaciones/noticias-de-transmilenio/boletines-informativos',
  'https://www.transmilenio.gov.co/comunicaciones/noticias-de-transmilenio/comunicados-oficiales/transmilenio-presenta-mas-de-50-alternativas-en-rutas-zonales-por-cierre-de-la-estacion-calle-63',
];

let stationCatalog: StationCatalogEntry[] = [];
let stationStatusMapSnapshot: Record<string, boolean> = {};
let stationStatusSourceMapSnapshot: Record<string, StationStatusSource> = {};
let lastStatusWarnings: string[] = [];
let lastStatusUpdate: number | null = null;
let inFlightStatusRequest: Promise<Record<string, boolean>> | null = null;

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeStationKey(value: string) {
  return normalizeText(value);
}

function getRefreshHours() {
  const configuredValue =
    Constants.expoConfig?.extra?.tmStationStatusRefreshHours ?? DEFAULT_REFRESH_HOURS;
  const refreshHours = Number(configuredValue);

  if (!Number.isFinite(refreshHours) || refreshHours <= 0) {
    return DEFAULT_REFRESH_HOURS;
  }

  return refreshHours;
}

function getRemoteStatusUrl() {
  const configuredValue = Constants.expoConfig?.extra?.tmStationStatusUrl;

  return typeof configuredValue === 'string' && configuredValue.trim()
    ? configuredValue.trim()
    : null;
}

function logStatusWarning(message: string, payload?: unknown) {
  if (!__DEV__) {
    return;
  }

  if (payload == null) {
    console.warn('[StationStatus]', message);
  } else {
    console.warn('[StationStatus]', message, payload);
  }
}

function getStationTerms(station: StationCatalogEntry) {
  return Array.from(new Set([station.name, ...(station.aliases ?? [])]))
    .map((term) => normalizeText(term))
    .filter((term) => term.length >= 3);
}

function escapeForRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
}

function createFallbackPayload(): StationStatusCachePayload {
  const statusMap: Record<string, boolean> = {};
  const sourceMap: Record<string, StationStatusSource> = {};
  const warnings: string[] = [];
  let fallbackCount = 0;

  for (const station of stationCatalog) {
    const key = normalizeStationKey(station.name);
    const terms = getStationTerms(station);
    const matchesKnownInactivePattern = terms.some((term) =>
      knownInactivePatterns.some((pattern) => term.includes(pattern))
    );

    statusMap[key] = !matchesKnownInactivePattern;
    sourceMap[key] = matchesKnownInactivePattern ? 'heuristic' : 'fallback';

    if (!matchesKnownInactivePattern) {
      fallbackCount += 1;
    }
  }

  if (fallbackCount > 0) {
    warnings.push(
      `${fallbackCount} estaciones quedaron activas por fallback seguro al no tener confirmacion externa.`
    );
  }

  return {
    statusMap,
    sourceMap,
    lastStatusUpdate: Date.now(),
    warnings,
  };
}

function applyStatusSnapshots(payload: StationStatusCachePayload) {
  stationStatusMapSnapshot = { ...payload.statusMap };
  stationStatusSourceMapSnapshot = { ...payload.sourceMap };
  lastStatusWarnings = [...payload.warnings];
  lastStatusUpdate = payload.lastStatusUpdate;
}

async function readStatusCacheFromDisk() {
  if (!CACHE_FILE_URI) {
    return null;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(CACHE_FILE_URI);

    if (!fileInfo.exists) {
      return null;
    }

    const fileContents = await FileSystem.readAsStringAsync(CACHE_FILE_URI);
    const parsedPayload = JSON.parse(fileContents) as StationStatusCachePayload;

    if (!parsedPayload?.statusMap || !parsedPayload?.sourceMap || !parsedPayload?.lastStatusUpdate) {
      return null;
    }

    return parsedPayload;
  } catch (error) {
    logStatusWarning('No fue posible leer el cache de estaciones.', error);
    return null;
  }
}

async function writeStatusCacheToDisk(payload: StationStatusCachePayload) {
  if (!CACHE_FILE_URI) {
    return;
  }

  try {
    await FileSystem.writeAsStringAsync(CACHE_FILE_URI, JSON.stringify(payload));
  } catch (error) {
    logStatusWarning('No fue posible guardar el cache de estaciones.', error);
  }
}

function isCacheStillFresh(timestamp: number) {
  const refreshWindowMs = getRefreshHours() * 60 * 60 * 1000;
  return Date.now() - timestamp < refreshWindowMs;
}

function extractStatusMapFromRemoteJson(
  rawPayload: unknown
): { map: Record<string, boolean>; sourceMap: Record<string, StationStatusSource> } {
  const nextMap: Record<string, boolean> = {};
  const nextSourceMap: Record<string, StationStatusSource> = {};

  const assignEntry = (name: unknown, rawStatus: unknown) => {
    if (typeof name !== 'string' || !name.trim()) {
      return;
    }

    let isActive: boolean | null = null;

    if (typeof rawStatus === 'boolean') {
      isActive = rawStatus;
    } else if (typeof rawStatus === 'string') {
      const normalizedStatus = normalizeText(rawStatus);
      if (['active', 'activa', 'activo', 'open', 'operativa', 'operando'].includes(normalizedStatus)) {
        isActive = true;
      }
      if (
        ['inactive', 'inactiva', 'inactivo', 'closed', 'cerrada', 'cerrado', 'fuera de servicio'].includes(
          normalizedStatus
        )
      ) {
        isActive = false;
      }
    } else if (rawStatus && typeof rawStatus === 'object') {
      const statusObject = rawStatus as Record<string, unknown>;
      assignEntry(
        statusObject.name ?? statusObject.station ?? statusObject.stationName ?? name,
        statusObject.isActive ?? statusObject.active ?? statusObject.status
      );
      return;
    }

    if (isActive == null) {
      return;
    }

    const key = normalizeStationKey(name);
    nextMap[key] = isActive;
    nextSourceMap[key] = 'remote-json';
  };

  if (Array.isArray(rawPayload)) {
    rawPayload.forEach((entry) => {
      if (!entry || typeof entry !== 'object') {
        return;
      }

      const typedEntry = entry as Record<string, unknown>;
      assignEntry(
        typedEntry.name ?? typedEntry.station ?? typedEntry.stationName,
        typedEntry.isActive ?? typedEntry.active ?? typedEntry.status
      );
    });
  } else if (rawPayload && typeof rawPayload === 'object') {
    const typedPayload = rawPayload as Record<string, unknown>;

    if (typedPayload.data) {
      return extractStatusMapFromRemoteJson(typedPayload.data);
    }

    if (typedPayload.stations) {
      return extractStatusMapFromRemoteJson(typedPayload.stations);
    }

    Object.entries(typedPayload).forEach(([name, status]) => {
      assignEntry(name, status);
    });
  }

  return { map: nextMap, sourceMap: nextSourceMap };
}

async function tryRemoteJsonStatusSource() {
  const remoteUrl = getRemoteStatusUrl();

  if (!remoteUrl) {
    return null;
  }

  const response = await fetch(remoteUrl, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al consultar el estado remoto de estaciones.`);
  }

  const jsonPayload = (await response.json()) as unknown;
  const parsedPayload = extractStatusMapFromRemoteJson(jsonPayload);

  if (Object.keys(parsedPayload.map).length === 0) {
    throw new Error('La fuente remota no devolvio estados de estaciones interpretables.');
  }

  return parsedPayload;
}

function getInactiveStationIdsFromOfficialHtml(html: string) {
  const normalizedHtml = normalizeText(html);
  const inactiveStationIds = new Set<string>();

  for (const station of stationCatalog) {
    const terms = getStationTerms(station);

    const matchesInactiveContext = terms.some((term) => {
      const escapedTerm = escapeForRegex(term);
      const patterns = [
        new RegExp(`${escapedTerm}.{0,90}(sin operacion|deja de operar|dejara de operar|fuera de servicio|cerrara|cierra|cerrada|cerrado)`),
        new RegExp(`(sin operacion|deja de operar|dejara de operar|fuera de servicio|cerrara|cierra|cerrada|cerrado).{0,90}${escapedTerm}`),
        new RegExp(`estacion temporal\\s+${escapedTerm}`),
      ];

      return patterns.some((pattern) => pattern.test(normalizedHtml));
    });

    if (matchesInactiveContext) {
      inactiveStationIds.add(station.id);
    }
  }

  return inactiveStationIds;
}

async function tryOfficialHtmlStatusSource() {
  if (Platform.OS === 'web') {
    // Las peticiones del navegador a transmilenio.gov.co son bloqueadas por CORS.
    // En la web usamos el catálogo oficial verificado local sin disparar fallos en consola.
    return null;
  }

  const inactiveStationIds = new Set<string>();

  for (const url of OFFICIAL_STATUS_SOURCE_URLS) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        continue;
      }

      const html = await response.text();
      const matches = getInactiveStationIdsFromOfficialHtml(html);
      matches.forEach((stationId) => inactiveStationIds.add(stationId));
    } catch (error) {
      logStatusWarning(`No fue posible consultar la fuente oficial ${url}.`, error);
    }
  }

  if (inactiveStationIds.size === 0) {
    return null;
  }

  const map: Record<string, boolean> = {};
  const sourceMap: Record<string, StationStatusSource> = {};

  stationCatalog.forEach((station) => {
    if (!inactiveStationIds.has(station.id)) {
      return;
    }

    map[normalizeStationKey(station.name)] = false;
    sourceMap[normalizeStationKey(station.name)] = 'official-html';
  });

  return { map, sourceMap };
}

function mergePayloadSources(
  basePayload: StationStatusCachePayload,
  nextSource: { map: Record<string, boolean>; sourceMap: Record<string, StationStatusSource> } | null
) {
  if (!nextSource) {
    return basePayload;
  }

  const mergedPayload: StationStatusCachePayload = {
    statusMap: { ...basePayload.statusMap, ...nextSource.map },
    sourceMap: { ...basePayload.sourceMap, ...nextSource.sourceMap },
    lastStatusUpdate: Date.now(),
    warnings: [...basePayload.warnings],
  };

  return mergedPayload;
}

function ensureCatalogReady() {
  if (stationCatalog.length === 0) {
    logStatusWarning('No hay catalogo de estaciones registrado. Se usara un mapa vacio.');
    return false;
  }

  return true;
}

export function registerStationCatalog(stations: StationCatalogEntry[]) {
  stationCatalog = stations.map((station) => ({
    id: station.id,
    name: station.name,
    aliases: [...(station.aliases ?? [])],
  }));
}

export function getStationStatusMapSync() {
  return { ...stationStatusMapSnapshot };
}

export function getStationStatusSourceMapSync() {
  return { ...stationStatusSourceMapSnapshot };
}

export function getLastStationStatusUpdate() {
  return lastStatusUpdate;
}

export function getStationStatusWarnings() {
  return [...lastStatusWarnings];
}

export async function getStationStatusMap(forceRefresh = false): Promise<Record<string, boolean>> {
  if (!ensureCatalogReady()) {
    return {};
  }

  if (!forceRefresh && lastStatusUpdate != null && isCacheStillFresh(lastStatusUpdate)) {
    return getStationStatusMapSync();
  }

  if (!forceRefresh) {
    const cachedPayload = await readStatusCacheFromDisk();

    if (cachedPayload && isCacheStillFresh(cachedPayload.lastStatusUpdate)) {
      applyStatusSnapshots(cachedPayload);
      return getStationStatusMapSync();
    }
  }

  if (inFlightStatusRequest) {
    return inFlightStatusRequest;
  }

  inFlightStatusRequest = (async () => {
    let nextPayload = createFallbackPayload();

    try {
      const remotePayload = await tryRemoteJsonStatusSource();
      nextPayload = mergePayloadSources(nextPayload, remotePayload);
    } catch (error) {
      logStatusWarning('La fuente remota de estado de estaciones no estuvo disponible.', error);
    }

    try {
      const officialPayload = await tryOfficialHtmlStatusSource();
      nextPayload = mergePayloadSources(nextPayload, officialPayload);
    } catch (error) {
      logStatusWarning('No fue posible interpretar las fuentes oficiales de estaciones.', error);
    }

    nextPayload.lastStatusUpdate = Date.now();
    applyStatusSnapshots(nextPayload);
    await writeStatusCacheToDisk(nextPayload);

    if (nextPayload.warnings.length > 0) {
      logStatusWarning('Se aplicaron advertencias en el estado de estaciones.', nextPayload.warnings);
    }

    return getStationStatusMapSync();
  })();

  try {
    return await inFlightStatusRequest;
  } finally {
    inFlightStatusRequest = null;
  }
}
