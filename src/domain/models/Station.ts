import type { StationStatusSource } from '@/src/services/stationStatusService';

export type StationCoordinates = {
  latitude: number;
  longitude: number;
};

export type TransferConnection = {
  stationId: string;
  type: 'walk';
  distanceMeters: number;
  isTransfer: true;
  instructions?: string[];
};

export type TransmilenioStation = {
  id: string;
  name: string;
  coordinates: StationCoordinates;
  troncal: string;
  order: number;
  aliases?: string[];
  corridor?: string;
  transferConnections?: TransferConnection[];
  isActive?: boolean;
  statusSource?: StationStatusSource;
};

export type StationMatchResult = {
  station: TransmilenioStation | null;
  transcript: string;
  candidates?: TransmilenioStation[];
  reason?: 'empty' | 'exact' | 'fuzzy' | 'ambiguous' | 'not_found';
};

export type RouteSegment = {
  routeId: string;
  stations: TransmilenioStation[];
  mode: 'troncal' | 'bus' | 'walk';
  troncal: string;
  routeCode: string;
  direction: 'Norte' | 'Sur' | 'Oriente' | 'Occidente';
  isTransfer: boolean;
  distanceMeters?: number;
  instructions?: string[];
};

export type BusTransitLeg = {
  type: 'bus';
  from: TransmilenioStation;
  to: TransmilenioStation;
  routeId: string;
  routeCode: string;
  direction: 'Norte' | 'Sur' | 'Oriente' | 'Occidente';
  troncal: string;
  stations: TransmilenioStation[];
  isTransferLeg: boolean;
};

export type WalkTransitLeg = {
  type: 'walk';
  from: TransmilenioStation;
  to: TransmilenioStation;
  routeId: string;
  routeCode: string;
  direction: 'Norte' | 'Sur' | 'Oriente' | 'Occidente';
  troncal: string;
  stations: TransmilenioStation[];
  isTransferLeg: boolean;
  distanceMeters: number;
  instructions: string[];
};

export type TransitLeg = BusTransitLeg | WalkTransitLeg;

export type RoutePlan = {
  origin: TransmilenioStation;
  destination: TransmilenioStation;
  segments: RouteSegment[];
  legs: TransitLeg[];
  transferStations: TransmilenioStation[];
  usesTransfer: boolean;
};

export type StationAvailabilityResolution = {
  requestedStation: TransmilenioStation;
  resolvedStation: TransmilenioStation;
  wasRedirected: boolean;
  message: string | null;
};

export type UserNavigationLeg =
  | {
      type: 'walk';
      to: TransmilenioStation;
    }
  | TransitLeg;

export type UserNavigationPlan = {
  originStation: TransmilenioStation;
  destinationStation: TransmilenioStation;
  routePlan: RoutePlan | null;
  legs: UserNavigationLeg[];
  userIsAlreadyAtOriginStation: boolean;
  walkingDistanceMeters: number;
};
