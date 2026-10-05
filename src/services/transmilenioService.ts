import { allRoutes } from '../data/rutas';
import { calculateDistanceInMeters } from '@/src/core/geo/distance';
import {
  getStationStatusMap,
  getStationStatusSourceMapSync,
  registerStationCatalog,
  type StationStatusSource,
} from './stationStatusService';
import type {
  StationCoordinates,
  TransferConnection,
  TransmilenioStation,
  StationMatchResult,
  RouteSegment,
  BusTransitLeg,
  WalkTransitLeg,
  TransitLeg,
  RoutePlan,
  StationAvailabilityResolution,
  UserNavigationLeg,
  UserNavigationPlan,
} from '@/src/domain/models/Station';
import { transmilenioStations, createStation } from '@/src/data/estaciones';
import {
  RICAURTE_NQS_ID,
  RICAURTE_C13_ID,
  RICAURTE_TUNNEL_DISTANCE_METERS,
  RICAURTE_TUNNEL_INSTRUCTIONS,
  JIMENEZ_CARACAS_ID,
  JIMENEZ_EJE_ID,
  JIMENEZ_TRANSFER_DISTANCE_METERS,
  JIMENEZ_TRANSFER_INSTRUCTIONS,
  LAS_NIEVES_ID,
  MUSEO_NACIONAL_ID,
  LAS_NIEVES_JIMENEZ_DISTANCE_METERS,
  LAS_NIEVES_JIMENEZ_INSTRUCTIONS,
  createRicaurteTransferConnections,
  createJimenezTransferConnections,
  createLasNievesTransferConnections,
  isRicaurteTransferPair,
  isJimenezTransferPair,
  getAllowedAdjacentTroncalsForRicaurte,
  isJimenezCaracasRouteContextValid,
  isJimenezEjeRouteContextValid,
  isBusSegmentConsistent,
  TRANSFER_HUB_PRIORITIES,
  PREFERRED_TRANSFER_STATION_IDS,
  getTransferPriority,
  isCentralTroncal,
  isCaracasCenterTarget,
  isHistoricCenterTarget,
  getTransferScoreAdjustment,
} from '@/src/domain/rules/transferRules';
import {
  normalizeText,
  getStationSearchTerms,
  getNormalizedTokens,
  getStationMatchScore,
  stationMatchesText,
  searchStationsInList,
  resolveStationFromSpeechList,
} from '@/src/core/text/stationMatcher';

export type {
  StationCoordinates,
  TransferConnection,
  TransmilenioStation,
  StationMatchResult,
  RouteSegment,
  BusTransitLeg,
  WalkTransitLeg,
  TransitLeg,
  RoutePlan,
  StationAvailabilityResolution,
  UserNavigationLeg,
  UserNavigationPlan,
};

export { transmilenioStations, createStation };

export {
  RICAURTE_NQS_ID,
  RICAURTE_C13_ID,
  RICAURTE_TUNNEL_DISTANCE_METERS,
  RICAURTE_TUNNEL_INSTRUCTIONS,
  JIMENEZ_CARACAS_ID,
  JIMENEZ_EJE_ID,
  JIMENEZ_TRANSFER_DISTANCE_METERS,
  JIMENEZ_TRANSFER_INSTRUCTIONS,
  LAS_NIEVES_ID,
  MUSEO_NACIONAL_ID,
  LAS_NIEVES_JIMENEZ_DISTANCE_METERS,
  LAS_NIEVES_JIMENEZ_INSTRUCTIONS,
  createRicaurteTransferConnections,
  createJimenezTransferConnections,
  createLasNievesTransferConnections,
  isRicaurteTransferPair,
  isJimenezTransferPair,
  getAllowedAdjacentTroncalsForRicaurte,
  isJimenezCaracasRouteContextValid,
  isJimenezEjeRouteContextValid,
  isBusSegmentConsistent,
  TRANSFER_HUB_PRIORITIES,
  PREFERRED_TRANSFER_STATION_IDS,
  getTransferPriority,
  isCentralTroncal,
  isCaracasCenterTarget,
  isHistoricCenterTarget,
  getTransferScoreAdjustment,
};

export {
  normalizeText,
  getStationSearchTerms,
  getNormalizedTokens,
  getStationMatchScore,
  stationMatchesText,
  searchStationsInList,
  resolveStationFromSpeechList,
};


registerStationCatalog(transmilenioStations);

let stationStatusMapSnapshot: Record<string, boolean> = {};
let stationStatusSourceMapSnapshot: Record<string, StationStatusSource> = {};

function getStationStatusKey(value: string) {
  return normalizeText(value);
}

function getStationStatusValue(station: TransmilenioStation) {
  const key = getStationStatusKey(station.name);
  const isActive = stationStatusMapSnapshot[key];

  return {
    isActive: isActive ?? true,
    statusSource: stationStatusSourceMapSnapshot[key],
  };
}

function withStationStatus(station: TransmilenioStation) {
  const status = getStationStatusValue(station);

  return {
    ...station,
    isActive: status.isActive,
    statusSource: status.statusSource,
  };
}

function getDecoratedStations(includeInactive = true) {
  const stations = transmilenioStations.map(withStationStatus);

  if (includeInactive) {
    return stations;
  }

  return stations.filter((station) => station.isActive !== false);
}

export async function refreshStationStatuses(forceRefresh = false) {
  stationStatusMapSnapshot = await getStationStatusMap(forceRefresh);
  stationStatusSourceMapSnapshot = getStationStatusSourceMapSync();
  recognizedRoutesCache = null;

  return getAllStations();
}

export function getAllStations(options?: { includeInactive?: boolean }) {
  return getDecoratedStations(options?.includeInactive ?? true);
}

export function getAllStationSpeechTerms() {
  return Array.from(
    new Set(
      transmilenioStations.flatMap((station) => [station.name, ...(station.aliases ?? [])])
    )
  );
}

export function getRandomStation(excludedStationId?: string) {
  const activeStations = getAllStations({ includeInactive: false });
  const candidates = excludedStationId
    ? activeStations.filter((station) => station.id !== excludedStationId)
    : activeStations;
  const fallbackStations =
    activeStations.length > 0 ? activeStations : getAllStations({ includeInactive: true });
  const availableStations = candidates.length > 0 ? candidates : fallbackStations;
  const randomIndex = Math.floor(Math.random() * availableStations.length);

  return availableStations[randomIndex] ?? fallbackStations[0];
}


export function searchStations(query: string, options?: { includeInactive?: boolean }) {
  const stations = getAllStations({
    includeInactive: options?.includeInactive ?? true,
  });

  return searchStationsInList(query, stations);
}

export function resolveStationFromSpeech(transcript: string): StationMatchResult {
  const stations = getAllStations({ includeInactive: true });
  return resolveStationFromSpeechList(transcript, stations);
}

export function getStationsByTroncal(
  troncal: string,
  options?: { includeInactive?: boolean }
) {
  return getAllStations({
    includeInactive: options?.includeInactive ?? false,
  })
    .filter((station) => station.troncal === troncal)
    .sort((a, b) => a.order - b.order);
}

export function getStationByName(
  name: string,
  options?: { includeInactive?: boolean }
) {
  return getAllStations({
    includeInactive: options?.includeInactive ?? true,
  }).find((station) => stationMatchesText(station, name));
}

export function findNearestStation(userCoordinates: StationCoordinates) {
  const stations = getAllStations({ includeInactive: false });
  const candidateStations = stations.length > 0 ? stations : getAllStations();

  return candidateStations.reduce((nearest, station) => {
    const currentDistance = calculateDistanceInMeters(
      userCoordinates,
      station.coordinates
    );

    if (!nearest || currentDistance < nearest.distanceMeters) {
      return {
        station,
        distanceMeters: currentDistance,
      };
    }

    return nearest;
  }, null as { station: TransmilenioStation; distanceMeters: number } | null);
}

export function findNearestStationInList(
  userCoordinates: StationCoordinates,
  stations: TransmilenioStation[]
) {
  const activeStations = stations.filter((station) => station.isActive !== false);
  const candidateStations = activeStations.length > 0 ? activeStations : stations;

  return candidateStations.reduce((nearest, station) => {
    const currentDistance = calculateDistanceInMeters(
      userCoordinates,
      station.coordinates
    );

    if (!nearest || currentDistance < nearest.distanceMeters) {
      return {
        station,
        distanceMeters: currentDistance,
      };
    }

    return nearest;
  }, null as { station: TransmilenioStation; distanceMeters: number } | null);
}

export function resolveStationAvailability(
  stationOrName: string | TransmilenioStation
): StationAvailabilityResolution | null {
  const requestedStation =
    typeof stationOrName === 'string'
      ? getStationByName(stationOrName, { includeInactive: true })
      : getStationByName(stationOrName.name, { includeInactive: true }) ?? withStationStatus(stationOrName);

  if (!requestedStation) {
    return null;
  }

  if (requestedStation.isActive !== false) {
    return {
      requestedStation,
      resolvedStation: requestedStation,
      wasRedirected: false,
      message: null,
    };
  }

  const activeStations = getAllStations({ includeInactive: false }).filter(
    (station) => station.id !== requestedStation.id
  );
  const sameTroncalAlternatives = activeStations.filter(
    (station) => station.troncal === requestedStation.troncal
  );
  const pool = sameTroncalAlternatives.length > 0 ? sameTroncalAlternatives : activeStations;
  const alternative = findNearestStationInList(requestedStation.coordinates, pool)?.station;
  const resolvedStation = alternative ?? requestedStation;
  const wasRedirected = resolvedStation.id !== requestedStation.id;

  return {
    requestedStation,
    resolvedStation,
    wasRedirected,
    message: wasRedirected
      ? `La estacion ${requestedStation.name} no esta disponible. Te mostrare ${resolvedStation.name} como alternativa cercana.`
      : `La estacion ${requestedStation.name} no esta disponible en este momento.`,
  };
}

type RecognizedRoute = {
  routeId: string;
  tipo: string;
  originLabel: string;
  destinationLabel: string;
  stations: TransmilenioStation[];
};

let recognizedRoutesCache: RecognizedRoute[] | null = null;

function dedupeConsecutiveStations(stations: TransmilenioStation[]) {
  return stations.filter((station, index) => {
    if (index === 0) {
      return true;
    }

    return stations[index - 1]?.id !== station.id;
  });
}

function inferDirectionFromStations(
  origin: TransmilenioStation,
  destination: TransmilenioStation
): 'Norte' | 'Sur' | 'Oriente' | 'Occidente' {
  const latitudeDelta = destination.coordinates.latitude - origin.coordinates.latitude;
  const longitudeDelta = destination.coordinates.longitude - origin.coordinates.longitude;

  if (Math.abs(latitudeDelta) >= Math.abs(longitudeDelta)) {
    return latitudeDelta >= 0 ? 'Norte' : 'Sur';
  }

  return longitudeDelta >= 0 ? 'Oriente' : 'Occidente';
}

function buildFallbackRouteCode(origin: TransmilenioStation) {
  const troncalMatch = origin.troncal.match(/Zona\s+([A-Z])/i);
  return troncalMatch ? `TR-${troncalMatch[1].toUpperCase()}` : 'TR';
}

function getStationById(
  stationId: string,
  options?: { includeInactive?: boolean }
) {
  return getAllStations({
    includeInactive: options?.includeInactive ?? true,
  }).find((station) => station.id === stationId);
}

function isGenericRicaurteStopName(stopName: string) {
  return normalizeText(stopName) === 'ricaurte';
}

function isGenericJimenezStopName(stopName: string) {
  const normalizedStopName = normalizeText(stopName);

  return (
    normalizedStopName === 'avenida jimenez' ||
    normalizedStopName === 'av jimenez'
  );
}

function expandRouteStopVariants(routeStops: string[]) {
  return routeStops.reduce<string[][]>((variants, stopName) => {
    if (isGenericRicaurteStopName(stopName)) {
      return variants.flatMap((variant) => [
        [...variant, 'Ricaurte (NQS)'],
        [...variant, 'Ricaurte (Calle 13)'],
      ]);
    }

    if (isGenericJimenezStopName(stopName)) {
      return variants.flatMap((variant) => [
        [...variant, 'Av. Jimenez (Caracas)'],
        [...variant, 'Av. Jimenez (Eje Ambiental)'],
      ]);
    }

    return variants.map((variant) => [...variant, stopName]);
  }, [[]]);
}


function getRecognizedRoutes() {
  if (recognizedRoutesCache) {
    return recognizedRoutesCache;
  }

  recognizedRoutesCache = allRoutes
    .flatMap((route) =>
      expandRouteStopVariants(route.paradas).map((paradas) => ({
        routeId: route.ruta,
        tipo: route.tipo,
        originLabel: route.origen,
        destinationLabel: route.destino,
        stations: dedupeConsecutiveStations(
          paradas.reduce<TransmilenioStation[]>((stations, stopName) => {
            const station = getStationByName(stopName, { includeInactive: false });

            if (station) {
              stations.push(station);
            }

            return stations;
          }, [])
        ),
      }))
    )
    .filter((route) => route.stations.length >= 2);

  return recognizedRoutesCache;
}

function buildRouteSegment(
  stations: TransmilenioStation[],
  routeId: string,
  mode: 'troncal' | 'bus' | 'walk',
  options?: {
    routeCode?: string;
    direction?: 'Norte' | 'Sur' | 'Oriente' | 'Occidente';
    isTransfer?: boolean;
    distanceMeters?: number;
    instructions?: string[];
  }
): RouteSegment {
  const firstStation = stations[0];
  const lastStation = stations[stations.length - 1] ?? firstStation;

  return {
    routeId,
    stations,
    mode,
    troncal: firstStation?.troncal ?? 'Sin troncal definida',
    routeCode: options?.routeCode ?? (firstStation ? buildFallbackRouteCode(firstStation) : routeId),
    direction:
      options?.direction ??
      (firstStation && lastStation
        ? inferDirectionFromStations(firstStation, lastStation)
        : 'Norte'),
    isTransfer: options?.isTransfer ?? false,
    distanceMeters: options?.distanceMeters,
    instructions: options?.instructions,
  };
}

function buildWalkTransferSegment(
  origin: TransmilenioStation,
  destination: TransmilenioStation,
  connection: TransferConnection
) {
  return buildRouteSegment([origin, destination], `walk:${origin.id}:${destination.id}`, 'walk', {
    routeCode: 'TRANSBORDO',
    direction: inferDirectionFromStations(origin, destination),
    isTransfer: connection.isTransfer,
    distanceMeters: connection.distanceMeters,
    instructions: connection.instructions,
  });
}

function buildRoutePlan(
  origin: TransmilenioStation,
  destination: TransmilenioStation,
  segments: RouteSegment[]
): RoutePlan {
  const transferStations = segments
    .flatMap((segment, index) => {
      const nextSegment = segments[index + 1];

      if (segment.mode === 'walk') {
        return [];
      }

      if (nextSegment?.mode === 'walk') {
        return [nextSegment.stations[0] ?? segment.stations[segment.stations.length - 1]];
      }

      if (nextSegment) {
        return [segment.stations[segment.stations.length - 1]];
      }

      return [];
    })
    .filter(
      (station): station is TransmilenioStation =>
        Boolean(station) && station.id !== origin.id && station.id !== destination.id
    );

  return {
    origin,
    destination,
    segments,
    legs: segments.map((segment, index) => ({
      ...(segment.mode === 'walk'
        ? {
            type: 'walk' as const,
            from: segment.stations[0] ?? origin,
            to: segment.stations[segment.stations.length - 1] ?? destination,
            routeId: segment.routeId,
            routeCode: segment.routeCode,
            direction: segment.direction,
            troncal: segment.troncal,
            stations: segment.stations,
            isTransferLeg: true,
            distanceMeters: segment.distanceMeters ?? 0,
            instructions: segment.instructions ?? [],
          }
        : {
            type: 'bus' as const,
            from: segment.stations[0] ?? origin,
            to: segment.stations[segment.stations.length - 1] ?? destination,
            routeId: segment.routeId,
            routeCode: segment.routeCode,
            direction: segment.direction,
            troncal: segment.troncal,
            stations: segment.stations,
            isTransferLeg: index > 0,
          }),
    })),
    transferStations,
    usesTransfer: transferStations.length > 0,
  };
}

function findBestDirectRouteSegment(
  origin: TransmilenioStation,
  destination: TransmilenioStation
) {
  const candidates = getRecognizedRoutes()
    .flatMap((route) => {
      const originIndex = route.stations.findIndex((station) => station.id === origin.id);
      const destinationIndex = route.stations.findIndex(
        (station) => station.id === destination.id
      );

      if (
        originIndex === -1 ||
        destinationIndex === -1 ||
        destinationIndex <= originIndex
      ) {
        return [];
      }

      const candidateStations = route.stations.slice(originIndex, destinationIndex + 1);

      if (!isBusSegmentConsistent(candidateStations)) {
        return [];
      }

      return [
        buildRouteSegment(
          candidateStations,
          route.routeId,
          'bus',
          {
            routeCode: route.routeId,
            direction: inferDirectionFromStations(origin, destination),
          }
        ),
      ];
    })
    .sort((left, right) => left.stations.length - right.stations.length);

  return candidates[0] ?? null;
}

export function countStationsBetween(
  originStationName: string,
  destinationStationName: string
) {
  const plan = planRoute(originStationName, destinationStationName);
  if (plan) {
    const flattenedStations = plan.segments
      .filter((segment) => segment.mode !== 'walk')
      .flatMap((segment, index) =>
        index === 0 ? segment.stations : segment.stations.slice(1)
      );

    return Math.max(0, flattenedStations.length - 1);
  }

  const origin = getStationByName(originStationName);
  const destination = getStationByName(destinationStationName);

  if (!origin || !destination || origin.troncal !== destination.troncal) {
    return null;
  }

  return Math.abs(destination.order - origin.order);
}

export function getRemainingStations(
  currentStationName: string,
  destinationStationName: string
) {
  return countStationsBetween(currentStationName, destinationStationName);
}

function getOrderedStationsWithinTroncal(
  origin: TransmilenioStation,
  destination: TransmilenioStation
) {
  const stations = getStationsByTroncal(origin.troncal);
  const isForward = origin.order <= destination.order;

  return stations.filter((station) =>
    isForward
      ? station.order >= origin.order && station.order <= destination.order
      : station.order <= origin.order && station.order >= destination.order
  ).sort((left, right) => (isForward ? left.order - right.order : right.order - left.order));
}

function findSegmentBetweenStations(
  origin: TransmilenioStation,
  destination: TransmilenioStation
) {
  if (isRicaurteTransferPair(origin, destination) || isJimenezTransferPair(origin, destination)) {
    return null;
  }

  if (origin.id === destination.id) {
    return buildRouteSegment([origin], `troncal:${origin.troncal}`, 'troncal');
  }

  const directRecognizedSegment = findBestDirectRouteSegment(origin, destination);

  if (directRecognizedSegment) {
    return directRecognizedSegment;
  }

  if (origin.troncal === destination.troncal) {
    return buildRouteSegment(
      getOrderedStationsWithinTroncal(origin, destination),
      `troncal:${origin.troncal}`,
      'troncal',
      {
        routeCode: buildFallbackRouteCode(origin),
        direction: inferDirectionFromStations(origin, destination),
      }
    );
  }

  return null;
}


function findBestTransferRoutePlan(
  origin: TransmilenioStation,
  destination: TransmilenioStation,
  candidates: TransmilenioStation[]
) {
  return candidates
    .filter((station) => station.id !== origin.id && station.id !== destination.id)
    .flatMap((transferStation) => {
      const firstSegment = findSegmentBetweenStations(origin, transferStation);
      const secondSegment = findSegmentBetweenStations(transferStation, destination);
      const plans: { score: number; plan: RoutePlan }[] = [];

      if (firstSegment && secondSegment) {
        const totalStops =
          firstSegment.stations.length + secondSegment.stations.length - 1;
        const score =
          totalStops +
          getTransferPriority(transferStation) * 2 +
          (transferStation.troncal === origin.troncal ? 6 : 0) +
          getTransferScoreAdjustment(transferStation, origin, destination);

        plans.push({
          score,
          plan: buildRoutePlan(origin, destination, [firstSegment, secondSegment]),
        });
      }

      for (const connection of transferStation.transferConnections ?? []) {
        const connectedStation = getStationById(connection.stationId, {
          includeInactive: false,
        });

        if (!firstSegment || !connectedStation) {
          continue;
        }

        const connectedSegment = findSegmentBetweenStations(connectedStation, destination);

        if (!connectedSegment) {
          continue;
        }

        const tunnelPenalty = Math.max(1, Math.round(connection.distanceMeters / 80));
        const totalStops =
          firstSegment.stations.length + connectedSegment.stations.length - 1;
        const score =
          totalStops +
          getTransferPriority(transferStation) * 2 +
          tunnelPenalty +
          (transferStation.troncal === origin.troncal ? 4 : 0) +
          getTransferScoreAdjustment(transferStation, origin, destination);

        plans.push({
          score,
          plan: buildRoutePlan(origin, destination, [
            firstSegment,
            buildWalkTransferSegment(transferStation, connectedStation, connection),
            connectedSegment,
          ]),
        });
      }

      return plans;
    })
    .sort((left, right) => left.score - right.score)[0]?.plan ?? null;
}

export function getRouteWithTransfers(
  originStationInput: string | TransmilenioStation,
  destinationStationInput: string | TransmilenioStation
): RoutePlan | null {
  const originResolution = resolveStationAvailability(originStationInput);
  const destinationResolution = resolveStationAvailability(destinationStationInput);
  const origin = originResolution?.resolvedStation ?? null;
  const destination = destinationResolution?.resolvedStation ?? null;

  if (!origin || !destination) {
    return null;
  }

  if (origin.id === destination.id) {
    return buildRoutePlan(origin, destination, [
      buildRouteSegment([origin], `troncal:${origin.troncal}`, 'troncal'),
    ]);
  }

  if (origin.troncal === destination.troncal) {
    const directSegment = findSegmentBetweenStations(origin, destination);

    if (directSegment) {
      return buildRoutePlan(origin, destination, [directSegment]);
    }
  }

  const activeStations = getAllStations({ includeInactive: false });
  const preferredTransfers = activeStations.filter((station) =>
    PREFERRED_TRANSFER_STATION_IDS.has(station.id)
  );

  const preferredPlan = findBestTransferRoutePlan(origin, destination, preferredTransfers);

  if (preferredPlan) {
    return preferredPlan;
  }

  const fallbackTransferPlan = findBestTransferRoutePlan(origin, destination, activeStations);

  if (fallbackTransferPlan) {
    return fallbackTransferPlan;
  }

  const directCrossTroncalSegment = findBestDirectRouteSegment(origin, destination);

  if (directCrossTroncalSegment) {
    return buildRoutePlan(origin, destination, [directCrossTroncalSegment]);
  }

  return null;
}

export function buildUserNavigationPlan(
  userCoordinates: StationCoordinates,
  destinationStationInput: string | TransmilenioStation,
  options?: { stationArrivalThresholdMeters?: number }
): UserNavigationPlan | null {
  const nearestStationMatch = findNearestStation(userCoordinates);
  const destinationResolution = resolveStationAvailability(destinationStationInput);

  if (!nearestStationMatch || !destinationResolution) {
    return null;
  }

  const routePlan = getRouteWithTransfers(
    nearestStationMatch.station,
    destinationResolution.resolvedStation
  );
  const stationArrivalThresholdMeters = options?.stationArrivalThresholdMeters ?? 65;
  const userIsAlreadyAtOriginStation =
    nearestStationMatch.distanceMeters <= stationArrivalThresholdMeters;
  const legs: UserNavigationLeg[] = [];

  if (!userIsAlreadyAtOriginStation) {
    legs.push({
      type: 'walk',
      to: nearestStationMatch.station,
    });
  }

  if (routePlan) {
    legs.push(...routePlan.legs);
  }

  return {
    originStation: nearestStationMatch.station,
    destinationStation: destinationResolution.resolvedStation,
    routePlan,
    legs,
    userIsAlreadyAtOriginStation,
    walkingDistanceMeters: nearestStationMatch.distanceMeters,
  };
}

export function planRoute(originStationName: string, destinationStationName: string): RoutePlan | null {
  return getRouteWithTransfers(originStationName, destinationStationName);
}

export function getStationsForRoute(
  originStationName: string,
  destinationStationName: string
) {
  const plan = planRoute(originStationName, destinationStationName);
  if (plan) {
    return plan.segments
      .filter((segment) => segment.mode !== 'walk')
      .flatMap((segment, index) =>
        index === 0 ? segment.stations : segment.stations.slice(1)
      );
  }

  const origin = getStationByName(originStationName);
  const destination = getStationByName(destinationStationName);

  if (!origin || !destination || origin.troncal !== destination.troncal) {
    return [];
  }

  return getOrderedStationsWithinTroncal(origin, destination);
}

export function isWalkTransitLeg(leg: TransitLeg): leg is WalkTransitLeg {
  return leg.type === 'walk';
}

export function isBusTransitLeg(leg: TransitLeg): leg is BusTransitLeg {
  return leg.type === 'bus';
}

export function getBusLegs(routePlan: RoutePlan | null) {
  return (routePlan?.legs ?? []).filter(isBusTransitLeg);
}

export function getFirstBusLeg(routePlan: RoutePlan | null) {
  return getBusLegs(routePlan)[0] ?? null;
}

export function getTransferWalkLegAtStation(
  routePlan: RoutePlan | null,
  stationId: string
) {
  return (
    routePlan?.legs.find(
      (leg): leg is WalkTransitLeg =>
        isWalkTransitLeg(leg) && leg.isTransferLeg && leg.from.id === stationId
    ) ?? null
  );
}

export function getNextBusLegAfterTransferStation(
  routePlan: RoutePlan | null,
  stationId: string
) {
  const legs = routePlan?.legs ?? [];
  const transferWalkLegIndex = legs.findIndex(
    (leg) => isWalkTransitLeg(leg) && leg.isTransferLeg && leg.from.id === stationId
  );

  if (transferWalkLegIndex >= 0) {
    return (
      legs.slice(transferWalkLegIndex + 1).find(
        (leg): leg is BusTransitLeg => isBusTransitLeg(leg)
      ) ?? null
    );
  }

  return (
    legs.find(
      (leg): leg is BusTransitLeg =>
        isBusTransitLeg(leg) && leg.isTransferLeg && leg.from.id === stationId
    ) ?? null
  );
}
