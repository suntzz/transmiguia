import * as Location from 'expo-location';
import { StationCoordinates } from '@/src/services/transmilenioService';

export type LiveCoordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  speedMps: number | null;
  timestamp: number;
};

export type LocationServiceErrorCode =
  | 'PERMISSION_DENIED'
  | 'GPS_DISABLED'
  | 'POSITION_UNAVAILABLE'
  | 'UNKNOWN';

export type LocationServiceError = {
  code: LocationServiceErrorCode;
  message: string;
};

export type LocationTrackingSubscription = {
  remove: () => void;
};

let demoTimer: ReturnType<typeof setInterval> | null = null;
let demoRouteSignature = '';
let demoRoutePoints: LiveCoordinates[] = [];
let demoRouteIndex = 0;
const demoSubscribers = new Set<(coordinates: LiveCoordinates) => void>();

function buildLocationError(
  code: LocationServiceErrorCode,
  message: string
): LocationServiceError {
  return {
    code,
    message,
  };
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

function normalizeLocationError(error: unknown): LocationServiceError {
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

export async function getLocationPermissionStatus() {
  const response = await Location.getForegroundPermissionsAsync();
  return response.granted;
}

export async function requestLocationPermission() {
  const response = await Location.requestForegroundPermissionsAsync();
  return response.granted;
}

export async function isLocationServicesEnabled() {
  return Location.hasServicesEnabledAsync();
}

export async function getCurrentLocation() {
  const hasPermission = await getLocationPermissionStatus();

  if (!hasPermission) {
    throw buildLocationError(
      'PERMISSION_DENIED',
      'Debes conceder permiso de ubicacion en Android.'
    );
  }

  const servicesEnabled = await isLocationServicesEnabled();

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

type StartLocationTrackingParams = {
  onLocation: (coordinates: LiveCoordinates) => void;
  onError: (error: LocationServiceError) => void;
};

type StartDemoLocationTrackingParams = {
  waypoints: StationCoordinates[];
  onLocation: (coordinates: LiveCoordinates) => void;
  onError: (error: LocationServiceError) => void;
};

function createLiveCoordinates(coordinates: StationCoordinates): LiveCoordinates {
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    accuracy: 5,
    speedMps: 1.4,
    timestamp: Date.now(),
  };
}

function buildDemoRoutePoints(waypoints: StationCoordinates[]) {
  const points: LiveCoordinates[] = [];

  if (waypoints.length === 0) {
    return points;
  }

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const origin = waypoints[index];
    const destination = waypoints[index + 1];
    const steps = 6;

    for (let step = 0; step < steps; step += 1) {
      const progress = step / steps;

      points.push(
        createLiveCoordinates({
          latitude:
            origin.latitude + (destination.latitude - origin.latitude) * progress,
          longitude:
            origin.longitude + (destination.longitude - origin.longitude) * progress,
        })
      );
    }
  }

  points.push(createLiveCoordinates(waypoints[waypoints.length - 1]));
  return points;
}

export async function startLocationTracking({
  onLocation,
  onError,
}: StartLocationTrackingParams) {
  const hasPermission = await requestLocationPermission();

  if (!hasPermission) {
    onError(
      buildLocationError(
        'PERMISSION_DENIED',
        'Permiso de ubicacion denegado por el usuario.'
      )
    );
    return null;
  }

  const servicesEnabled = await isLocationServicesEnabled();

  if (!servicesEnabled) {
    onError(
      buildLocationError(
        'GPS_DISABLED',
        'Activa el GPS para iniciar el seguimiento en tiempo real.'
      )
    );
    return null;
  }

  try {
    const current = await getCurrentLocation();
    onLocation(current);

    return await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000,
        distanceInterval: 3,
      },
      (location) => {
        onLocation(mapCoordinates(location));
      }
    );
  } catch (error) {
    onError(normalizeLocationError(error));
    return null;
  }
}

export function startDemoLocationTracking({
  waypoints,
  onLocation,
  onError,
}: StartDemoLocationTrackingParams): LocationTrackingSubscription | null {
  if (waypoints.length === 0) {
    onError(
      buildLocationError(
        'POSITION_UNAVAILABLE',
        'No hay estaciones suficientes para simular el recorrido.'
      )
    );
    return null;
  }

  const signature = JSON.stringify(waypoints);

  if (signature !== demoRouteSignature) {
    demoRouteSignature = signature;
    demoRoutePoints = buildDemoRoutePoints(waypoints);
    demoRouteIndex = 0;
  }

  const emitCurrentPoint = () => {
    const currentPoint =
      demoRoutePoints[Math.min(demoRouteIndex, demoRoutePoints.length - 1)];

    if (currentPoint) {
      demoSubscribers.forEach((subscriber) => subscriber(currentPoint));
    }
  };

  demoSubscribers.add(onLocation);
  emitCurrentPoint();

  if (!demoTimer) {
    demoTimer = setInterval(() => {
      if (demoRouteIndex < demoRoutePoints.length - 1) {
        demoRouteIndex += 1;
      }

      emitCurrentPoint();
    }, 1800);
  }

  return {
    remove: () => {
      demoSubscribers.delete(onLocation);

      if (demoSubscribers.size === 0 && demoTimer) {
        clearInterval(demoTimer);
        demoTimer = null;
      }
    },
  };
}

export function stopLocationTracking(
  subscription: LocationTrackingSubscription | null
) {
  subscription?.remove();
}
