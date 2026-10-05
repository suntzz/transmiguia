import type { StationCoordinates } from '@/src/domain/models/Station';
import type {
  DemoLocationTrackingParams,
  IMockLocationGateway,
  LiveCoordinates,
  LocationTrackingSubscription,
} from '@/src/domain/gateways/ILocationGateway';

function createLiveCoordinates(coordinates: StationCoordinates): LiveCoordinates {
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    accuracy: 5,
    speedMps: 1.4,
    timestamp: Date.now(),
  };
}

export function buildDemoRoutePoints(waypoints: StationCoordinates[]): LiveCoordinates[] {
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

export class MockLocationGateway implements IMockLocationGateway {
  private timer: ReturnType<typeof setInterval> | null = null;
  private routeSignature = '';
  private routePoints: LiveCoordinates[] = [];
  private routeIndex = 0;
  private subscribers = new Set<(coordinates: LiveCoordinates) => void>();

  startDemoTracking({
    waypoints,
    onLocation,
    onError,
  }: DemoLocationTrackingParams): LocationTrackingSubscription {
    if (waypoints.length === 0) {
      onError({
        code: 'POSITION_UNAVAILABLE',
        message: 'No hay estaciones suficientes para simular el recorrido.',
      });
      return { remove: () => {} };
    }

    const signature = JSON.stringify(waypoints);

    if (signature !== this.routeSignature) {
      this.routeSignature = signature;
      this.routePoints = buildDemoRoutePoints(waypoints);
      this.routeIndex = 0;
    }

    const emitCurrentPoint = () => {
      const currentPoint =
        this.routePoints[Math.min(this.routeIndex, this.routePoints.length - 1)];

      if (currentPoint) {
        this.subscribers.forEach((subscriber) => subscriber(currentPoint));
      }
    };

    this.subscribers.add(onLocation);
    emitCurrentPoint();

    if (!this.timer) {
      this.timer = setInterval(() => {
        if (this.routeIndex < this.routePoints.length - 1) {
          this.routeIndex += 1;
        }

        emitCurrentPoint();
      }, 1800);
    }

    return {
      remove: () => {
        this.subscribers.delete(onLocation);

        if (this.subscribers.size === 0 && this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
      },
    };
  }

  stopDemoTracking(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.subscribers.clear();
  }

  isDemoActive(): boolean {
    return this.timer !== null;
  }
}

export const mockLocationGateway = new MockLocationGateway();
