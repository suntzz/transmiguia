import type { StationCoordinates } from '@/src/domain/models/Station';
import {
  type LiveCoordinates,
  type LocationGatewayError,
  type LocationGatewayErrorCode,
  type LocationTrackingSubscription,
} from '@/src/domain/gateways/ILocationGateway';
import { expoLocationGateway } from '@/src/infrastructure/hardware/ExpoLocationGateway';
import { mockLocationGateway } from '@/src/infrastructure/simulation/MockLocationGateway';

export type { LiveCoordinates, LocationTrackingSubscription };

export type LocationServiceErrorCode = LocationGatewayErrorCode;
export type LocationServiceError = LocationGatewayError;

export type StartLocationTrackingParams = {
  onLocation: (coordinates: LiveCoordinates) => void;
  onError: (error: LocationServiceError) => void;
};

export type StartDemoLocationTrackingParams = {
  waypoints: StationCoordinates[];
  onLocation: (coordinates: LiveCoordinates) => void;
  onError: (error: LocationServiceError) => void;
};

export async function getLocationPermissionStatus(): Promise<boolean> {
  return expoLocationGateway.getPermissionStatus();
}

export async function requestLocationPermission(): Promise<boolean> {
  return expoLocationGateway.requestPermission();
}

export async function isLocationServicesEnabled(): Promise<boolean> {
  return expoLocationGateway.isServicesEnabled();
}

export async function getCurrentLocation(): Promise<LiveCoordinates> {
  return expoLocationGateway.getCurrentLocation();
}

export async function startLocationTracking({
  onLocation,
  onError,
}: StartLocationTrackingParams): Promise<LocationTrackingSubscription | null> {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    onError({
      code: 'PERMISSION_DENIED',
      message: 'Permiso de ubicacion denegado por el usuario.',
    });
    return null;
  }

  const servicesEnabled = await isLocationServicesEnabled();

  if (!servicesEnabled) {
    onError({
      code: 'GPS_DISABLED',
      message: 'Activa el GPS para iniciar el seguimiento en tiempo real.',
    });
    return null;
  }

  try {
    const current = await getCurrentLocation();
    onLocation(current);

    return await expoLocationGateway.startLocationTracking({
      onLocation,
      onError,
      options: {
        timeIntervalMs: 3000,
        distanceIntervalMeters: 3,
      },
    });
  } catch (error) {
    onError(error as LocationServiceError);
    return null;
  }
}

export function startDemoLocationTracking({
  waypoints,
  onLocation,
  onError,
}: StartDemoLocationTrackingParams): LocationTrackingSubscription | null {
  return mockLocationGateway.startDemoTracking({
    waypoints,
    onLocation,
    onError,
  });
}

export function stopLocationTracking(
  subscription: LocationTrackingSubscription | null
) {
  subscription?.remove();
}
