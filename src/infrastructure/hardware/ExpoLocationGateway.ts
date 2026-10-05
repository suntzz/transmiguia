import * as Location from 'expo-location';
import type {
  ILocationGateway,
  LiveCoordinates,
  LocationGatewayError,
  LocationGatewayErrorCode,
  LocationTrackingParams,
  LocationTrackingSubscription,
} from '@/src/domain/gateways/ILocationGateway';

function buildLocationError(
  code: LocationGatewayErrorCode,
  message: string
): LocationGatewayError {
  return { code, message };
}

function mapCoordinates(location: Location.LocationObject): LiveCoordinates {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy ?? null,
    speedMps:
      typeof location.coords.speed === 'number' && Number.isFinite(location.coords.speed)
        ? Math.max(0, location.coords.speed)
        : null,
    timestamp: location.timestamp,
  };
}

function normalizeLocationError(error: unknown): LocationGatewayError {
  if (error && typeof error === 'object' && 'message' in error) {
    return buildLocationError(
      'POSITION_UNAVAILABLE',
      String(error.message)
    );
  }

  return buildLocationError(
    'UNKNOWN',
    'No fue posible obtener la ubicacion en este momento.'
  );
}

export class ExpoLocationGateway implements ILocationGateway {
  async getPermissionStatus(): Promise<boolean> {
    const response = await Location.getForegroundPermissionsAsync();
    return response.granted;
  }

  async requestPermission(): Promise<boolean> {
    const response = await Location.requestForegroundPermissionsAsync();
    return response.granted;
  }

  async isServicesEnabled(): Promise<boolean> {
    return Location.hasServicesEnabledAsync();
  }

  async getCurrentLocation(): Promise<LiveCoordinates> {
    const hasPermission = await this.getPermissionStatus();

    if (!hasPermission) {
      throw buildLocationError(
        'PERMISSION_DENIED',
        'Debes conceder permiso de ubicacion en Android.'
      );
    }

    const servicesEnabled = await this.isServicesEnabled();

    if (!servicesEnabled) {
      throw buildLocationError(
        'GPS_DISABLED',
        'El GPS del dispositivo esta apagado.'
      );
    }

    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return mapCoordinates(location);
    } catch (error) {
      throw normalizeLocationError(error);
    }
  }

  async startLocationTracking({
    onLocation,
    onError,
    options,
  }: LocationTrackingParams): Promise<LocationTrackingSubscription> {
    const hasPermission = await this.getPermissionStatus();

    if (!hasPermission) {
      onError(
        buildLocationError(
          'PERMISSION_DENIED',
          'Debes conceder permiso de ubicacion en Android.'
        )
      );
      return { remove: () => {} };
    }

    const servicesEnabled = await this.isServicesEnabled();

    if (!servicesEnabled) {
      onError(
        buildLocationError(
          'GPS_DISABLED',
          'El GPS del dispositivo esta apagado.'
        )
      );
      return { remove: () => {} };
    }

    try {
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: options?.timeIntervalMs ?? 3000,
          distanceInterval: options?.distanceIntervalMeters ?? 3,
        },
        (location) => {
          onLocation(mapCoordinates(location));
        }
      );

      return {
        remove: () => subscription.remove(),
      };
    } catch (error) {
      onError(normalizeLocationError(error));
      return { remove: () => {} };
    }
  }
}

export const expoLocationGateway = new ExpoLocationGateway();
