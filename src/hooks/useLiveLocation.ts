import { useCallback, useEffect, useRef, useState } from 'react';

import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import {
  LiveCoordinates,
  LocationServiceError,
  startLocationTracking,
  startDemoLocationTracking,
  stopLocationTracking,
} from '@/src/services/locationService';
import { getRouteWithTransfers } from '@/src/services/transmilenioService';
import { announce } from '@/src/utils/accessibility';

type UseLiveLocationOptions = {
  autoStart?: boolean;
};

export type LiveLocationSignalState = 'ok' | 'weak' | 'stale' | 'frozen';

export function useLiveLocation({ autoStart = false }: UseLiveLocationOptions = {}) {
  const { demoAutoFlowEnabled, demoModeEnabled, demoState } = useDemoMode();
  const { destinationStation, originStation } = useRouteSelection();
  const [coordinates, setCoordinates] = useState<LiveCoordinates | null>(null);
  const [error, setError] = useState<LocationServiceError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [signalState, setSignalState] = useState<LiveLocationSignalState>('ok');
  const [lastUpdateAgeMs, setLastUpdateAgeMs] = useState(0);
  const [stationaryDurationMs, setStationaryDurationMs] = useState(0);
  const subscriptionRef = useRef<{ remove: () => void } | null>(null);
  const lastReceivedAtRef = useRef(0);
  const lastSampleRef = useRef<LiveCoordinates | null>(null);
  const stationaryDurationRef = useRef(0);

  const buildDemoWaypoints = useCallback(() => {
    if (!originStation) {
      return [];
    }

    const routePlan = getRouteWithTransfers(originStation.name, destinationStation.name);
    const rawWaypoints = routePlan
      ? [
          originStation.coordinates,
          ...routePlan.legs.flatMap((leg) =>
            leg.type === 'walk'
              ? [leg.to.coordinates]
              : leg.stations.map((station) => station.coordinates)
          ),
          destinationStation.coordinates,
        ]
      : [originStation.coordinates, destinationStation.coordinates];

    return rawWaypoints.filter((coordinates, index, waypoints) => {
      const previous = waypoints[index - 1];

      return (
        !previous ||
        previous.latitude !== coordinates.latitude ||
        previous.longitude !== coordinates.longitude
      );
    });
  }, [destinationStation.coordinates, destinationStation.name, originStation]);

  const stopTracking = useCallback(() => {
    stopLocationTracking(subscriptionRef.current);
    subscriptionRef.current = null;
    setIsTracking(false);
    setSignalState('ok');
    setLastUpdateAgeMs(0);
    setStationaryDurationMs(0);
    stationaryDurationRef.current = 0;
    lastReceivedAtRef.current = 0;
    lastSampleRef.current = null;
  }, []);

  const startTracking = useCallback(async () => {
    if (demoAutoFlowEnabled) {
      setError(null);
      setIsTracking(true);
      setSignalState('ok');
      setLastUpdateAgeMs(0);
      setStationaryDurationMs(0);
      return;
    }

    stopTracking();
    setError(null);

    const onLocation = (nextLocation: LiveCoordinates) => {
      const previousLocation = lastSampleRef.current;
      const elapsedMs =
        previousLocation == null ? 0 : Math.max(0, nextLocation.timestamp - previousLocation.timestamp);
      const movementMeters =
        previousLocation == null
          ? 0
          : Math.hypot(
              (nextLocation.latitude - previousLocation.latitude) * 111139,
              (nextLocation.longitude - previousLocation.longitude) * 111139
            );

      stationaryDurationRef.current =
        movementMeters <= 3 && elapsedMs > 0 ? stationaryDurationRef.current + elapsedMs : 0;
      lastSampleRef.current = nextLocation;
      lastReceivedAtRef.current = Date.now();
      setError(null);
      setCoordinates(nextLocation);
      setLastUpdateAgeMs(0);
      setStationaryDurationMs(stationaryDurationRef.current);
      setSignalState(nextLocation.accuracy != null && nextLocation.accuracy > 45 ? 'weak' : 'ok');
    };

    const onError = (serviceError: LocationServiceError) => {
      setError(serviceError);
      setIsTracking(false);
      void announce(serviceError.message);
    };

    const demoWaypoints = demoModeEnabled ? buildDemoWaypoints() : [];

    const subscription = demoModeEnabled && demoWaypoints.length > 0
      ? startDemoLocationTracking({
          waypoints: demoWaypoints,
          onLocation,
          onError,
        })
      : await startLocationTracking({
          onLocation,
          onError,
        });

    subscriptionRef.current = subscription;
    setIsTracking(Boolean(subscription));
  }, [buildDemoWaypoints, demoAutoFlowEnabled, demoModeEnabled, stopTracking]);

  useEffect(() => {
    if (!demoAutoFlowEnabled) {
      return;
    }

    stopLocationTracking(subscriptionRef.current);
    subscriptionRef.current = null;
    setIsTracking(true);
    setError(null);
    setCoordinates(demoState.location);
    setSignalState('ok');
    setLastUpdateAgeMs(0);
    setStationaryDurationMs(0);
    lastReceivedAtRef.current = Date.now();
    lastSampleRef.current = demoState.location;
    stationaryDurationRef.current = 0;
  }, [demoAutoFlowEnabled, demoState.location]);

  useEffect(() => {
    if (!isTracking) {
      return;
    }

    const intervalId = setInterval(() => {
      const ageMs =
        lastReceivedAtRef.current > 0 ? Date.now() - lastReceivedAtRef.current : 0;
      setLastUpdateAgeMs(ageMs);

      if (ageMs >= 20000) {
        setSignalState('frozen');
        return;
      }

      if (ageMs >= 12000) {
        setSignalState('stale');
        return;
      }

      const currentAccuracy = lastSampleRef.current?.accuracy ?? null;
      setSignalState(currentAccuracy != null && currentAccuracy > 45 ? 'weak' : 'ok');
    }, 4000);

    return () => {
      clearInterval(intervalId);
    };
  }, [isTracking]);

  useEffect(() => {
    if (autoStart) {
      void startTracking();
    }

    return () => {
      stopTracking();
    };
  }, [autoStart, startTracking, stopTracking]);

  return {
    coordinates: demoAutoFlowEnabled ? demoState.location : coordinates,
    error,
    isTracking: demoAutoFlowEnabled ? true : isTracking,
    signalState: demoAutoFlowEnabled ? 'ok' : signalState,
    lastUpdateAgeMs,
    stationaryDurationMs,
    speedMps: demoAutoFlowEnabled
      ? demoState.location?.speedMps ?? null
      : coordinates?.speedMps ?? null,
    startTracking,
    stopTracking,
  };
}
