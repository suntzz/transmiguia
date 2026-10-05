import type { TransferConnection, TransmilenioStation } from '../models/Station';

export const RICAURTE_NQS_ID = 'ricaurte-nqs';
export const RICAURTE_C13_ID = 'ricaurte-c13';
export const RICAURTE_TUNNEL_DISTANCE_METERS = 120;
export const RICAURTE_TUNNEL_INSTRUCTIONS = [
  'Haz transbordo en Ricaurte.',
  'Cambia de plataforma por el tunel.',
  'Sigue las senales hacia la otra linea.',
];

export const JIMENEZ_CARACAS_ID = 'jimenez-caracas';
export const JIMENEZ_EJE_ID = 'jimenez-eje';
export const JIMENEZ_TRANSFER_DISTANCE_METERS = 80;
export const JIMENEZ_TRANSFER_INSTRUCTIONS = [
  'Haz transbordo en Avenida Jimenez.',
  'Cambia de corredor.',
  'Sigue las senales hacia el Eje Ambiental.',
];

export const LAS_NIEVES_ID = 'las-nieves';
export const MUSEO_NACIONAL_ID = 'museo-nacional';
export const LAS_NIEVES_JIMENEZ_DISTANCE_METERS = 150;
export const LAS_NIEVES_JIMENEZ_INSTRUCTIONS = [
  'Baja en Las Nieves.',
  'Camina hacia el Eje Ambiental.',
];

export function createRicaurteTransferConnections(targetStationId: string): TransferConnection[] {
  return [
    {
      stationId: targetStationId,
      type: 'walk',
      distanceMeters: RICAURTE_TUNNEL_DISTANCE_METERS,
      isTransfer: true,
      instructions: RICAURTE_TUNNEL_INSTRUCTIONS,
    },
  ];
}

export function createJimenezTransferConnections(targetStationId: string): TransferConnection[] {
  return [
    {
      stationId: targetStationId,
      type: 'walk',
      distanceMeters: JIMENEZ_TRANSFER_DISTANCE_METERS,
      isTransfer: true,
      instructions: JIMENEZ_TRANSFER_INSTRUCTIONS,
    },
  ];
}

export function createLasNievesTransferConnections(targetStationId: string): TransferConnection[] {
  return [
    {
      stationId: targetStationId,
      type: 'walk',
      distanceMeters: LAS_NIEVES_JIMENEZ_DISTANCE_METERS,
      isTransfer: true,
      instructions: LAS_NIEVES_JIMENEZ_INSTRUCTIONS,
    },
  ];
}

export function isRicaurteTransferPair(
  origin: TransmilenioStation | undefined,
  destination: TransmilenioStation | undefined
): boolean {
  if (!origin || !destination) {
    return false;
  }

  return (
    (origin.id === RICAURTE_NQS_ID && destination.id === RICAURTE_C13_ID) ||
    (origin.id === RICAURTE_C13_ID && destination.id === RICAURTE_NQS_ID)
  );
}

export function isJimenezTransferPair(
  origin: TransmilenioStation | undefined,
  destination: TransmilenioStation | undefined
): boolean {
  if (!origin || !destination) {
    return false;
  }

  return (
    (origin.id === JIMENEZ_CARACAS_ID && destination.id === JIMENEZ_EJE_ID) ||
    (origin.id === JIMENEZ_EJE_ID && destination.id === JIMENEZ_CARACAS_ID)
  );
}

export function getAllowedAdjacentTroncalsForRicaurte(stationId: string): Set<string> | null {
  if (stationId === RICAURTE_NQS_ID) {
    return new Set([
      'Zona E - NQS Central',
      'Zona G - Sur / Soacha',
      'Zona K - Eldorado',
    ]);
  }

  if (stationId === RICAURTE_C13_ID) {
    return new Set([
      'Zona A - Caracas',
      'Zona F - Americas',
    ]);
  }

  return null;
}

export function isJimenezCaracasRouteContextValid(
  previousStation: TransmilenioStation | undefined,
  nextStation: TransmilenioStation | undefined
): boolean {
  const adjacentStations = [previousStation, nextStation].filter(
    (station): station is TransmilenioStation => Boolean(station)
  );

  if (adjacentStations.length === 0) {
    return true;
  }

  return (
    adjacentStations.some((station) => station.troncal === 'Zona A - Caracas') &&
    adjacentStations.every((station) =>
      ['Zona A - Caracas', 'Zona L - Carrera 10'].includes(station.troncal)
    )
  );
}

export function isJimenezEjeRouteContextValid(
  previousStation: TransmilenioStation | undefined,
  nextStation: TransmilenioStation | undefined
): boolean {
  const adjacentStations = [previousStation, nextStation].filter(
    (station): station is TransmilenioStation => Boolean(station)
  );

  if (adjacentStations.length === 0) {
    return true;
  }

  return (
    adjacentStations.some((station) => station.troncal === 'Zona J - Eje Ambiental') &&
    adjacentStations.every((station) =>
      ['Zona A - Caracas', 'Zona J - Eje Ambiental', 'Zona L - Carrera 10'].includes(
        station.troncal
      )
    )
  );
}

export function isBusSegmentConsistent(stations: TransmilenioStation[]): boolean {
  return stations.every((station, index) => {
    const previousStation = stations[index - 1];
    const nextStation = stations[index + 1];
    const allowedAdjacentTroncals = getAllowedAdjacentTroncalsForRicaurte(station.id);

    if (
      isRicaurteTransferPair(previousStation, station) ||
      isRicaurteTransferPair(station, nextStation) ||
      isJimenezTransferPair(previousStation, station) ||
      isJimenezTransferPair(station, nextStation)
    ) {
      return false;
    }

    if (station.id === JIMENEZ_CARACAS_ID) {
      return isJimenezCaracasRouteContextValid(previousStation, nextStation);
    }

    if (station.id === JIMENEZ_EJE_ID) {
      return isJimenezEjeRouteContextValid(previousStation, nextStation);
    }

    if (!allowedAdjacentTroncals) {
      return true;
    }

    const previousIsAllowed =
      !previousStation || allowedAdjacentTroncals.has(previousStation.troncal);
    const nextIsAllowed =
      !nextStation || allowedAdjacentTroncals.has(nextStation.troncal);

    return previousIsAllowed && nextIsAllowed;
  });
}

export const TRANSFER_HUB_PRIORITIES: Record<string, number> = {
  [RICAURTE_NQS_ID]: 0,
  [RICAURTE_C13_ID]: 0,
  [JIMENEZ_CARACAS_ID]: 1,
  [JIMENEZ_EJE_ID]: 1,
  [MUSEO_NACIONAL_ID]: 2,
  'ciudad-universitaria': 3,
  [LAS_NIEVES_ID]: 4,
  'san-diego': 5,
  ferias: 6,
  'escuela-militar': 7,
  'avenida-68': 8,
  'calle-45': 9,
};

export const PREFERRED_TRANSFER_STATION_IDS = new Set(Object.keys(TRANSFER_HUB_PRIORITIES));

export function getTransferPriority(station: TransmilenioStation): number {
  return TRANSFER_HUB_PRIORITIES[station.id] ?? 99;
}

export function isCentralTroncal(station: TransmilenioStation): boolean {
  return [
    'Zona A - Caracas',
    'Zona J - Eje Ambiental',
    'Zona L - Carrera 10',
    'Zona M - Museo Nacional',
  ].includes(station.troncal);
}

export function isCaracasCenterTarget(station: TransmilenioStation): boolean {
  return (
    [MUSEO_NACIONAL_ID, 'san-diego', 'calle-34', 'avenida-39', 'calle-45'].includes(station.id) ||
    ['Zona A - Caracas', 'Zona M - Museo Nacional'].includes(station.troncal)
  );
}

export function isHistoricCenterTarget(station: TransmilenioStation): boolean {
  return (
    [LAS_NIEVES_ID, 'san-victorino', 'museo-del-oro', 'las-aguas', 'universidades'].includes(station.id) ||
    ['Zona J - Eje Ambiental', 'Zona L - Carrera 10'].includes(station.troncal)
  );
}

export function getTransferScoreAdjustment(
  transferStation: TransmilenioStation,
  origin: TransmilenioStation,
  destination: TransmilenioStation
): number {
  const isJimenezHub =
    transferStation.id === JIMENEZ_CARACAS_ID || transferStation.id === JIMENEZ_EJE_ID;
  const isMuseoNacionalNode = transferStation.id === MUSEO_NACIONAL_ID;
  const isLasNievesNode = transferStation.id === LAS_NIEVES_ID;

  if (isJimenezHub && (isCentralTroncal(origin) || isCentralTroncal(destination))) {
    return -3;
  }

  if (
    isMuseoNacionalNode &&
    isCaracasCenterTarget(destination) &&
    !['Zona J - Eje Ambiental', 'Zona L - Carrera 10'].includes(destination.troncal)
  ) {
    return -2;
  }

  if (
    isLasNievesNode &&
    isHistoricCenterTarget(destination) &&
    ['Zona L - Carrera 10', 'Zona J - Eje Ambiental', 'Zona N - Carrera 7'].includes(origin.troncal)
  ) {
    return -2;
  }

  return 0;
}
