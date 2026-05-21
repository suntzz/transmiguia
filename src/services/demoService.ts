import { LiveCoordinates } from '@/src/services/locationService';
import {
  getAllStations,
  getBusLegs,
  getRouteWithTransfers,
  getStationByName,
  RoutePlan,
  StationCoordinates,
  TransmilenioStation,
  BusTransitLeg,
} from '@/src/services/transmilenioService';

export type DemoJourney = {
  transcript: string;
  originStation: TransmilenioStation;
  destinationStation: TransmilenioStation;
  routePlan: RoutePlan;
  busLegs: BusTransitLeg[];
  walkingStart: StationCoordinates;
};

const DEMO_PREFERRED_ORIGINS = [
  'San Mateo',
  'Portal Sur',
  'Banderas',
  'Portal Norte',
  'Museo Nacional',
];

function offsetCoordinates(coordinates: StationCoordinates): StationCoordinates {
  return {
    latitude: coordinates.latitude - 0.0011,
    longitude: coordinates.longitude + 0.0008,
  };
}

function buildDemoLocation(
  coordinates: StationCoordinates,
  speedMps: number,
  accuracy = 5
): LiveCoordinates {
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    accuracy,
    speedMps,
    timestamp: Date.now(),
  };
}

function scoreDemoPlan(
  originStation: TransmilenioStation,
  routePlan: RoutePlan,
  busLegs: BusTransitLeg[]
) {
  const preferredOriginRank = DEMO_PREFERRED_ORIGINS.indexOf(originStation.name);
  const preferredOriginScore = preferredOriginRank === -1 ? 0 : 80 - preferredOriginRank * 10;
  const transferScore = routePlan.usesTransfer ? 140 : 30;
  const legScore = busLegs.length * 24;
  const stationScore = Math.min(
    50,
    busLegs.reduce((total, leg) => total + Math.max(0, leg.stations.length - 1), 0)
  );

  return preferredOriginScore + transferScore + legScore + stationScore;
}

export function buildDemoJourney(
  destinationStation: TransmilenioStation,
  transcript?: string
): DemoJourney | null {
  const preferredOrigins = DEMO_PREFERRED_ORIGINS.reduce<TransmilenioStation[]>(
    (stations, stationName) => {
      const station = getStationByName(stationName, { includeInactive: false });

      if (station && station.id !== destinationStation.id) {
        stations.push(station);
      }

      return stations;
    },
    []
  );

  const fallbackOrigins = getAllStations({ includeInactive: false }).filter(
    (station) =>
      station.id !== destinationStation.id &&
      !preferredOrigins.some((preferredStation) => preferredStation.id === station.id)
  );

  const allCandidates = [...preferredOrigins, ...fallbackOrigins];

  let bestJourney: DemoJourney | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const originStation of allCandidates) {
    const routePlan = getRouteWithTransfers(originStation.name, destinationStation.name);

    if (!routePlan) {
      continue;
    }

    const busLegs = getBusLegs(routePlan);

    if (busLegs.length === 0) {
      continue;
    }

    const score = scoreDemoPlan(originStation, routePlan, busLegs);

    if (score <= bestScore) {
      continue;
    }

    bestScore = score;
    bestJourney = {
      transcript: transcript?.trim() || destinationStation.name,
      originStation,
      destinationStation,
      routePlan,
      busLegs,
      walkingStart: offsetCoordinates(originStation.coordinates),
    };
  }

  return bestJourney;
}

export function buildDemoMotionPoints(
  waypoints: StationCoordinates[],
  options?: {
    stepsPerSegment?: number;
    speedMps?: number;
    accuracy?: number;
  }
) {
  const stepsPerSegment = options?.stepsPerSegment ?? 4;
  const speedMps = options?.speedMps ?? 1.3;
  const accuracy = options?.accuracy ?? 5;
  const points: LiveCoordinates[] = [];

  if (waypoints.length === 0) {
    return points;
  }

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const origin = waypoints[index];
    const destination = waypoints[index + 1];

    for (let step = 0; step < stepsPerSegment; step += 1) {
      const progress = step / stepsPerSegment;

      points.push(
        buildDemoLocation(
          {
            latitude:
              origin.latitude + (destination.latitude - origin.latitude) * progress,
            longitude:
              origin.longitude + (destination.longitude - origin.longitude) * progress,
          },
          speedMps,
          accuracy
        )
      );
    }
  }

  points.push(
    buildDemoLocation(waypoints[waypoints.length - 1], speedMps, accuracy)
  );

  return points;
}

export function logDemoEvent(event: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.info(`[DEMO] ${event}`, details);
    return;
  }

  console.info(`[DEMO] ${event}`);
}
