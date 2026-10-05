import type { StationCoordinates } from '../models/Station';

export type LiveCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speedMps: number | null;
  timestamp: number;
};

export type LocationGatewayErrorCode =
  | 'PERMISSION_DENIED'
  | 'GPS_DISABLED'
  | 'POSITION_UNAVAILABLE'
  | 'UNKNOWN';

export type LocationGatewayError = {
  code: LocationGatewayErrorCode;
  message: string;
};

export type LocationTrackingSubscription = {
  remove: () => void;
};

export type LocationTrackingParams = {
  onLocation: (coordinates: LiveCoordinates) => void;
  onError: (error: LocationGatewayError) => void;
  options?: {
    distanceIntervalMeters?: number;
    timeIntervalMs?: number;
  };
};

export interface ILocationGateway {
  getPermissionStatus(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  isServicesEnabled(): Promise<boolean>;
  getCurrentLocation(): Promise<LiveCoordinates>;
  startLocationTracking(params: LocationTrackingParams): Promise<LocationTrackingSubscription>;
}

export type DemoLocationTrackingParams = {
  waypoints: StationCoordinates[];
  onLocation: (coordinates: LiveCoordinates) => void;
  onError: (error: LocationGatewayError) => void;
};

export interface IMockLocationGateway {
  startDemoTracking(params: DemoLocationTrackingParams): LocationTrackingSubscription;
  stopDemoTracking(): void;
  isDemoActive(): boolean;
}
