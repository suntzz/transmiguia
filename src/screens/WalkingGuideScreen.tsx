import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { MapView } from '@/src/components/MapView';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { useLiveLocation } from '@/src/hooks/useLiveLocation';
import {
  buildDemoMotionPoints,
  logDemoEvent,
} from '@/src/services/demoService';
import {
  triggerMediumImpactHaptic,
  triggerSoftImpactHaptic,
  triggerStrongImpactHaptic,
  triggerWarningHaptic,
} from '@/src/services/hapticsService';
import {
  calculateDistanceBetweenCoordinates,
  createFallbackWalkingRoute,
  RouteStep,
  RouteSummary,
  getRouteToStation,
} from '@/src/services/mapService';
import {
  speakNavigationInstruction,
  speakNavigationStarted,
  speakLostRouteSequence,
  speakRouteAlert,
  speakStationArrival,
  speakStationProximity,
  speakTransitPlanSummary,
  stopSpeaking,
  waitForSpeechToSettle,
} from '@/src/services/speechService';
import {
  StationCoordinates,
  TransmilenioStation,
  buildUserNavigationPlan,
  getFirstBusLeg,
} from '@/src/services/transmilenioService';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopDemoOnBack } from '@/src/hooks/useStopDemoOnBack';
import { RootStackParamList } from '@/src/utils/navigation';
import {
  DEFAULT_PROXIMITY_ALERT_SETTINGS,
  ProximityStage,
  getAdaptiveProximityThresholds,
  getDistanceInMeters,
  getProximityStage,
  shouldTriggerProximityAlert,
} from '@/src/utils/proximity';
import { logNavigationEvent } from '@/src/utils/navigationDebug';
import { colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'WalkingGuide'>;
const LOST_COUNTER_THRESHOLD = 3;
const LOST_REROUTE_COOLDOWN_MS = 25000;
const WALKING_LOST_ROUTE_DISTANCE_METERS = 130;
const WALKING_STAGNANT_MOVEMENT_THRESHOLD_METERS = 120;
const WALKING_MOVEMENT_SAMPLE_THRESHOLD_METERS = 15;

function isNearStepEnd(
  coordinates: StationCoordinates,
  step: RouteStep,
  thresholdMeters = 18
) {
  return (
    getDistanceInMeters(
      coordinates.latitude,
      coordinates.longitude,
      step.endLocation.latitude,
      step.endLocation.longitude
    ) <= thresholdMeters
  );
}

function getDistanceToRoutePath(
  coordinates: StationCoordinates,
  routeCoordinates: StationCoordinates[]
) {
  if (routeCoordinates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return routeCoordinates.reduce((nearestDistance, routeCoordinate) => {
    const currentDistance = getDistanceInMeters(
      coordinates.latitude,
      coordinates.longitude,
      routeCoordinate.latitude,
      routeCoordinate.longitude
    );

    return Math.min(nearestDistance, currentDistance);
  }, Number.POSITIVE_INFINITY);
}

export function WalkingGuideScreen({ navigation }: Props) {
  const location = useLiveLocation();
  const { startTracking, stopTracking } = location;
  const { destinationStation, setOriginStation, tripFinished } = useRouteSelection();
  const {
    demoAutoFlowEnabled,
    demoJourney,
    demoRunId,
    demoState,
    setDemoStep,
    updateDemoState,
  } = useDemoMode();
  const isControlledDemo = demoAutoFlowEnabled && demoJourney != null;
  const latitude = location.coordinates?.latitude;
  const longitude = location.coordinates?.longitude;
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [walkingTargetStation, setWalkingTargetStation] = useState<TransmilenioStation | null>(
    null
  );
  const [distanceToTargetMeters, setDistanceToTargetMeters] = useState<number | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isUserLost, setIsUserLost] = useState(false);
  const [routeRefreshToken, setRouteRefreshToken] = useState(0);
  const lastSpokenStepRef = useRef<number | null>(null);
  const lastProximityStageRef = useRef<ProximityStage | null>(null);
  const lastAlertedProximityStageRef = useRef<ProximityStage | null>(null);
  const lastProximityAlertTimestampRef = useRef(0);
  const hasStartedNavigationRef = useRef(false);
  const hasNavigatedToAlertRef = useRef(false);
  const hasSpokenTransitPlanRef = useRef(false);
  const hasSpokenLocationIssueRef = useRef(false);
  const hasSpokenTransitIssueRef = useRef(false);
  const hasSkippedWalkingRef = useRef(false);
  const closestDistanceToStationRef = useRef(Number.POSITIVE_INFINITY);
  const lastProgressIndexRef = useRef(0);
  const lostCounterRef = useRef(0);
  const stagnantMovementMetersRef = useRef(0);
  const lastRuntimeSignalRef = useRef<string | null>(null);
  const lastRepeatedInstructionAtRef = useRef(0);
  const previousDistanceToTargetRef = useRef<number | null>(null);
  const passedCounterRef = useRef(0);
  const lastObservedCoordinatesRef = useRef<StationCoordinates | null>(null);
  const lostRerouteInProgressRef = useRef(false);
  const lastReRouteTimestampRef = useRef(0);
  const lastRouteRequestRef = useRef<{
    stationId: string;
    origin: StationCoordinates;
  } | null>(null);
  const lastDemoRunKeyRef = useRef<string | null>(null);
  const controlledDemoNavigationPlan = useMemo(() => {
    if (!isControlledDemo || !demoJourney) {
      return null;
    }

    const walkingDistanceMeters = calculateDistanceBetweenCoordinates(
      demoJourney.walkingStart,
      demoJourney.originStation.coordinates
    );

    return {
      originStation: demoJourney.originStation,
      walkingDistanceMeters,
      userIsAlreadyAtOriginStation: false,
      routePlan: demoJourney.routePlan,
    };
  }, [demoJourney, isControlledDemo]);
  const navigationPlan = useMemo(
    () => {
      if (controlledDemoNavigationPlan) {
        return controlledDemoNavigationPlan;
      }

      return (
      latitude == null || longitude == null
        ? null
        : buildUserNavigationPlan(
            {
              latitude,
              longitude,
            },
            destinationStation
          )
      );
    },
    [controlledDemoNavigationPlan, destinationStation, latitude, longitude]
  );
  const busRoutePlan = navigationPlan?.routePlan ?? null;
  const proximityAlertSettings = DEFAULT_PROXIMITY_ALERT_SETTINGS;
  const adaptiveWalkThresholds = useMemo(
    () =>
      getAdaptiveProximityThresholds({
        speedMps: location.speedMps,
        accuracy: location.coordinates?.accuracy ?? null,
      }),
    [location.coordinates?.accuracy, location.speedMps]
  );
  const navigationPhase = hasNavigatedToAlertRef.current ? 'transitioning' : 'walking';
  const activeWalkingLegOverlays = useMemo(() => {
    if (navigationPhase !== 'walking' || !routeSummary?.coordinates?.length) {
      return [];
    }

    return [
      {
        id: `walk-guide-${walkingTargetStation?.id ?? 'station'}`,
        type: 'walk' as const,
        coordinates: routeSummary.coordinates,
      },
    ];
  }, [navigationPhase, routeSummary?.coordinates, walkingTargetStation?.id]);

  const resetLostTracking = useCallback((progressIndex = 0, coordinates?: StationCoordinates) => {
    lostCounterRef.current = 0;
    stagnantMovementMetersRef.current = 0;
    lastProgressIndexRef.current = progressIndex;
    if (coordinates) {
      lastObservedCoordinatesRef.current = coordinates;
    }
    setIsUserLost(false);
  }, []);

  useScreenAnnouncement('Guia peatonal activa.');
  useStopDemoOnBack(isControlledDemo);

  useFocusEffect(
    React.useCallback(() => {
      void startTracking();

      return () => {
        stopTracking();
        void stopSpeaking();
      };
    }, [startTracking, stopTracking])
  );

  useEffect(() => {
    setWalkingTargetStation(null);
    setDistanceToTargetMeters(null);
    setRouteSummary(null);
    setRouteError(null);
    setCurrentStepIndex(0);
    lastSpokenStepRef.current = null;
    lastProximityStageRef.current = null;
    lastAlertedProximityStageRef.current = null;
    lastProximityAlertTimestampRef.current = 0;
    hasStartedNavigationRef.current = false;
    hasNavigatedToAlertRef.current = false;
    hasSpokenTransitPlanRef.current = false;
    hasSpokenLocationIssueRef.current = false;
    hasSpokenTransitIssueRef.current = false;
    hasSkippedWalkingRef.current = false;
    closestDistanceToStationRef.current = Number.POSITIVE_INFINITY;
    lastProgressIndexRef.current = 0;
    lostCounterRef.current = 0;
    stagnantMovementMetersRef.current = 0;
    lastObservedCoordinatesRef.current = null;
    lostRerouteInProgressRef.current = false;
    lastReRouteTimestampRef.current = 0;
    lastRouteRequestRef.current = null;
    setIsUserLost(false);
    setRouteRefreshToken(0);
  }, [destinationStation.id]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (!location.error) {
      hasSpokenLocationIssueRef.current = false;
      return;
    }

    const message =
      location.error.code === 'GPS_DISABLED'
        ? 'No tengo tu ubicacion. Activa el GPS o intenta moverte.'
        : 'No tengo tu ubicacion en este momento. Intenta moverte para actualizarla.';

    setRouteError(message);

    if (hasSpokenLocationIssueRef.current) {
      return;
    }

    hasSpokenLocationIssueRef.current = true;
    void triggerWarningHaptic();
    void speakRouteAlert(message, `walking-location-${location.error.code}`);
  }, [isControlledDemo, location.error, tripFinished]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (location.error || location.signalState === 'ok') {
      lastRuntimeSignalRef.current = null;
      return;
    }

    if (lastRuntimeSignalRef.current === location.signalState) {
      return;
    }

    const message =
      location.signalState === 'weak'
        ? 'Senal de ubicacion debil.'
        : location.signalState === 'stale'
          ? 'No estoy recibiendo tu ubicacion.'
          : 'Tu ubicacion esta congelada. Intenta moverte.';

    lastRuntimeSignalRef.current = location.signalState;
    logNavigationEvent('walking-location-signal', {
      signalState: location.signalState,
      lastUpdateAgeMs: location.lastUpdateAgeMs,
      speedMps: location.speedMps,
      stationaryDurationMs: location.stationaryDurationMs,
    });
    void triggerWarningHaptic();
    void speakRouteAlert(message, `walking-signal-${location.signalState}`);
  }, [
    isControlledDemo,
    location.error,
    location.lastUpdateAgeMs,
    location.signalState,
    location.speedMps,
    location.stationaryDurationMs,
    tripFinished,
  ]);

  useEffect(() => {
    if (tripFinished) {
      return;
    }

    if (!navigationPlan) {
      return;
    }

    setWalkingTargetStation(navigationPlan.originStation);
    setOriginStation(navigationPlan.originStation);
    setDistanceToTargetMeters(navigationPlan.walkingDistanceMeters);
  }, [navigationPlan, setOriginStation, tripFinished]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (latitude == null || longitude == null || !walkingTargetStation) {
      return;
    }

    const nextDistance = calculateDistanceBetweenCoordinates(
      {
        latitude,
        longitude,
      },
      walkingTargetStation.coordinates
    );

    setDistanceToTargetMeters(nextDistance);
    closestDistanceToStationRef.current = Math.min(
      closestDistanceToStationRef.current,
      nextDistance
    );
  }, [isControlledDemo, latitude, longitude, tripFinished, walkingTargetStation]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (!navigationPlan || !navigationPlan.userIsAlreadyAtOriginStation || hasSkippedWalkingRef.current) {
      return;
    }

    hasSkippedWalkingRef.current = true;
    let cancelled = false;

    const skipWalkingFlow = async () => {
      await triggerMediumImpactHaptic();
      await speakTransitPlanSummary(
        navigationPlan.originStation.name,
        destinationStation.name,
        navigationPlan.routePlan,
        { userAlreadyAtOriginStation: true }
      );

      if (cancelled) {
        return;
      }

      await waitForSpeechToSettle(2000);

      if (cancelled) {
        return;
      }

      if (!navigationPlan.routePlan) {
        await speakRouteAlert(
          `No hay una ruta valida desde ${navigationPlan.originStation.name} hasta ${destinationStation.name}. Elige otro destino.`,
          `walking-skip-invalid-${destinationStation.id}`
        );
        await waitForSpeechToSettle(2000);
        navigation.replace('StationSelector');
        return;
      }

      await waitForSpeechToSettle(2000);
      navigation.replace('StationArrival');
    };

    void skipWalkingFlow();

    return () => {
      cancelled = true;
    };
  }, [
    destinationStation.id,
    destinationStation.name,
    isControlledDemo,
    navigation,
    navigationPlan,
    tripFinished,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (!walkingTargetStation) {
      return;
    }

    if (busRoutePlan) {
      hasSpokenTransitIssueRef.current = false;
      return;
    }

    const message = `No encontre una ruta de TransMilenio valida desde ${walkingTargetStation.name} hasta ${destinationStation.name}. Puedes cambiar el destino.`;
    setRouteError(message);

    if (hasSpokenTransitIssueRef.current) {
      return;
    }

    hasSpokenTransitIssueRef.current = true;
    void triggerWarningHaptic();
    void speakRouteAlert(message, `walking-transit-plan-${walkingTargetStation.id}-${destinationStation.id}`);
  }, [
    busRoutePlan,
    destinationStation.id,
    destinationStation.name,
    isControlledDemo,
    tripFinished,
    walkingTargetStation,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (
      latitude == null ||
      longitude == null ||
      !walkingTargetStation ||
      navigationPlan?.userIsAlreadyAtOriginStation
    ) {
      return;
    }

    const currentOrigin = { latitude, longitude };
    const lastRouteRequest = lastRouteRequestRef.current;
    const shouldSkipRequest =
      lastRouteRequest?.stationId === walkingTargetStation.id &&
      calculateDistanceBetweenCoordinates(lastRouteRequest.origin, currentOrigin) < 25;

    if (shouldSkipRequest) {
      return;
    }

    let active = true;

    const loadRoute = async () => {
      setLoadingRoute(true);
      setRouteError(null);

      try {
        const nextRoute = await getRouteToStation(currentOrigin, walkingTargetStation.coordinates);

        if (!active) {
          return;
        }

        setRouteSummary(nextRoute);
        setCurrentStepIndex(0);
        lastSpokenStepRef.current = null;
        lastRouteRequestRef.current = {
          stationId: walkingTargetStation.id,
          origin: currentOrigin,
        };

        if (!hasStartedNavigationRef.current) {
          hasStartedNavigationRef.current = true;
          await triggerMediumImpactHaptic();
          logNavigationEvent('walking-navigation-started', {
            station: walkingTargetStation.name,
            walkingDistanceMeters: navigationPlan?.walkingDistanceMeters ?? null,
            speedMps: location.speedMps,
            signalState: location.signalState,
          });
          await speakNavigationStarted(walkingTargetStation.name);

          if (!hasSpokenTransitPlanRef.current) {
            hasSpokenTransitPlanRef.current = true;
            await speakTransitPlanSummary(
              walkingTargetStation.name,
              destinationStation.name,
              busRoutePlan,
              { userAlreadyAtOriginStation: false }
            );
          }
        }
      } catch (error) {
        if (active) {
          const technicalMessage =
            error && typeof error === 'object' && 'message' in error
              ? String(error.message)
              : 'No fue posible calcular la ruta hasta la estacion.';

          setRouteSummary(
            createFallbackWalkingRoute(currentOrigin, walkingTargetStation.coordinates)
          );
          setCurrentStepIndex(0);
          lastSpokenStepRef.current = null;
          lastRouteRequestRef.current = {
            stationId: walkingTargetStation.id,
            origin: currentOrigin,
          };
          if (__DEV__) {
            console.warn('[WalkingGuide] Se usara una ruta peatonal simplificada.', {
              station: walkingTargetStation.name,
              message: technicalMessage,
            });
          }
          setRouteError(
            `No pudimos cargar la ruta guiada en este momento. Te mostraremos una guia directa hacia ${walkingTargetStation.name}.`
          );
        }
      } finally {
        if (active) {
          setLoadingRoute(false);
        }
      }
    };

    void loadRoute();

    return () => {
      active = false;
    };
  }, [
    busRoutePlan,
    destinationStation.name,
    isControlledDemo,
    latitude,
    longitude,
    navigationPlan?.userIsAlreadyAtOriginStation,
    navigationPlan?.walkingDistanceMeters,
    location.signalState,
    location.speedMps,
    routeRefreshToken,
    tripFinished,
    walkingTargetStation,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (
      latitude == null ||
      longitude == null ||
      !routeSummary ||
      !walkingTargetStation ||
      navigationPlan?.userIsAlreadyAtOriginStation ||
      hasNavigatedToAlertRef.current
    ) {
      return;
    }

    const userCoordinates = { latitude, longitude };
    const distanceToRoutePath = getDistanceToRoutePath(
      userCoordinates,
      routeSummary.coordinates
    );
    const closestDistance = closestDistanceToStationRef.current;
    const previousDistanceToTarget = previousDistanceToTargetRef.current;
    const distanceIncrease =
      distanceToTargetMeters == null || previousDistanceToTarget == null
        ? 0
        : distanceToTargetMeters - previousDistanceToTarget;
    previousDistanceToTargetRef.current = distanceToTargetMeters ?? null;
    passedCounterRef.current =
      distanceToTargetMeters != null &&
      closestDistance <= 35 &&
      distanceIncrease > 30
        ? passedCounterRef.current + 1
        : 0;
    const hasLikelyPassedStation =
      distanceToTargetMeters != null &&
      closestDistance <= 35 &&
      distanceToTargetMeters - closestDistance >= 45 &&
      passedCounterRef.current >= 3;
    const previousCoordinates = lastObservedCoordinatesRef.current;
    const movementDelta =
      previousCoordinates == null
        ? 0
        : calculateDistanceBetweenCoordinates(previousCoordinates, userCoordinates);

    lastObservedCoordinatesRef.current = userCoordinates;

    if (currentStepIndex > lastProgressIndexRef.current) {
      resetLostTracking(currentStepIndex, userCoordinates);
      return;
    }

    if (movementDelta >= WALKING_MOVEMENT_SAMPLE_THRESHOLD_METERS) {
      stagnantMovementMetersRef.current += movementDelta;
    }

    const offRouteProblem = distanceToRoutePath > WALKING_LOST_ROUTE_DISTANCE_METERS;
    const noProgressProblem =
      stagnantMovementMetersRef.current >= WALKING_STAGNANT_MOVEMENT_THRESHOLD_METERS &&
      distanceToRoutePath > 55;
    const lossReason: 'off-route' | 'passed' | 'no-progress' | null =
      hasLikelyPassedStation
        ? 'passed'
        : offRouteProblem
          ? 'off-route'
          : noProgressProblem
            ? 'no-progress'
            : null;

    if (!lossReason) {
      if (isUserLost) {
        setIsUserLost(false);
      }
      lostCounterRef.current = 0;
      return;
    }

    if (
      lostRerouteInProgressRef.current ||
      Date.now() - lastReRouteTimestampRef.current < LOST_REROUTE_COOLDOWN_MS
    ) {
      return;
    }

    lostCounterRef.current += 1;

    if (lostCounterRef.current < LOST_COUNTER_THRESHOLD) {
      return;
    }

    lostRerouteInProgressRef.current = true;
    lastReRouteTimestampRef.current = Date.now();
    setIsUserLost(true);
    let cancelled = false;

    const rerouteFromCurrentLocation = async () => {
      const nextPlan = buildUserNavigationPlan(userCoordinates, destinationStation);
      const nextOriginStation = nextPlan?.originStation ?? walkingTargetStation;

      await triggerStrongImpactHaptic();
      await speakLostRouteSequence(nextOriginStation?.name, lossReason);

      if (cancelled) {
        return;
      }

      if (nextPlan) {
        setOriginStation(nextPlan.originStation);
        setWalkingTargetStation(nextPlan.originStation);
        setDistanceToTargetMeters(nextPlan.walkingDistanceMeters);
      }

      hasStartedNavigationRef.current = false;
      hasSpokenTransitPlanRef.current = false;
      hasNavigatedToAlertRef.current = false;
      lastRouteRequestRef.current = null;
      lastSpokenStepRef.current = null;
      closestDistanceToStationRef.current = Number.POSITIVE_INFINITY;
      setCurrentStepIndex(0);
      setRouteError(
        nextOriginStation
          ? `Recalculando desde tu ubicacion actual hacia ${nextOriginStation.name}.`
          : 'Recalculando desde tu ubicacion actual.'
      );
      resetLostTracking(0, userCoordinates);
      setRouteRefreshToken((currentToken) => currentToken + 1);
      lostRerouteInProgressRef.current = false;
      logNavigationEvent('walking-reroute', {
        reason: lossReason,
        nextOriginStation: nextOriginStation?.name ?? null,
        signalState: location.signalState,
        speedMps: location.speedMps,
      });
    };

    void rerouteFromCurrentLocation();

    return () => {
      cancelled = true;
      lostRerouteInProgressRef.current = false;
    };
  }, [
    currentStepIndex,
    destinationStation,
    distanceToTargetMeters,
    isControlledDemo,
    isUserLost,
    latitude,
    longitude,
    navigationPlan?.userIsAlreadyAtOriginStation,
    resetLostTracking,
    routeSummary,
    setOriginStation,
    tripFinished,
    walkingTargetStation,
    location.signalState,
    location.speedMps,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    const currentStep = routeSummary?.steps[currentStepIndex];

    if (!currentStep || lastSpokenStepRef.current === currentStepIndex) {
      return;
    }

    lastSpokenStepRef.current = currentStepIndex;
    logNavigationEvent('walking-step-instruction', {
      stepIndex: currentStepIndex,
      instruction: currentStep.instruction,
      targetStation: walkingTargetStation?.name ?? null,
      speedMps: location.speedMps,
      signalState: location.signalState,
    });
    void triggerSoftImpactHaptic();
    void speakNavigationInstruction(currentStep, {
      stepKey: `${walkingTargetStation?.id ?? 'unknown'}-${currentStepIndex}`,
    });
  }, [
    currentStepIndex,
    isControlledDemo,
    routeSummary,
    tripFinished,
    walkingTargetStation?.id,
    walkingTargetStation?.name,
    location.signalState,
    location.speedMps,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    const currentStep = routeSummary?.steps[currentStepIndex];

    if (
      !currentStep ||
      hasNavigatedToAlertRef.current ||
      isUserLost ||
      location.stationaryDurationMs < 14000
    ) {
      return;
    }

    if (Date.now() - lastRepeatedInstructionAtRef.current < 18000) {
      return;
    }

    lastRepeatedInstructionAtRef.current = Date.now();
    logNavigationEvent('walking-repeat-instruction', {
      stepIndex: currentStepIndex,
      instruction: currentStep.instruction,
      stationaryDurationMs: location.stationaryDurationMs,
      signalState: location.signalState,
    });
    void triggerSoftImpactHaptic();
    void speakNavigationInstruction(currentStep, {
      stepKey: `${walkingTargetStation?.id ?? 'unknown'}-${currentStepIndex}-repeat`,
    });
  }, [
    currentStepIndex,
    hasNavigatedToAlertRef,
    isControlledDemo,
    isUserLost,
    location.signalState,
    location.stationaryDurationMs,
    routeSummary,
    tripFinished,
    walkingTargetStation?.id,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (
      latitude == null ||
      longitude == null ||
      !routeSummary ||
      routeSummary.steps.length === 0
    ) {
      return;
    }

    const currentStep = routeSummary.steps[currentStepIndex];

    let nextIndex = currentStepIndex;
    let keepChecking = true;

    // Buscar hasta qué paso el usuario ya ha avanzado, sin hacer setState múltiple
    while (keepChecking && nextIndex < routeSummary.steps.length - 1) {
      const stepToCheck = routeSummary.steps[nextIndex];
      
      if (stepToCheck && isNearStepEnd({ latitude, longitude }, stepToCheck)) {
        nextIndex++;
      } else {
        keepChecking = false;
      }
    }

    if (nextIndex > currentStepIndex) {
      setCurrentStepIndex(nextIndex);
      return;
    }

    // Si llegó al final de la ruta real
    if (currentStepIndex === routeSummary.steps.length - 1 && isNearStepEnd({ latitude, longitude }, currentStep)) {
      if (hasNavigatedToAlertRef.current) {
        return;
      }

      hasNavigatedToAlertRef.current = true;
      void (async () => {
        await triggerStrongImpactHaptic();
        await speakStationArrival(walkingTargetStation?.name ?? 'la estacion');

        if (!busRoutePlan) {
          await waitForSpeechToSettle(2000);
          await speakRouteAlert(
            'No hay una ruta en bus valida desde esta estacion. Elige otro destino.',
            `walking-invalid-plan-arrival-${destinationStation.id}`
          );
          await waitForSpeechToSettle(2000);
          navigation.replace('StationSelector');
          return;
        }

        await waitForSpeechToSettle(2000);
        navigation.replace('StationAlert');
      })();
    }
  }, [
    busRoutePlan,
    currentStepIndex,
    destinationStation.id,
    isControlledDemo,
    latitude,
    longitude,
    navigation,
    routeSummary,
    tripFinished,
    walkingTargetStation?.id,
    walkingTargetStation?.name,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (!walkingTargetStation || distanceToTargetMeters == null) {
      return;
    }

    const stage = getProximityStage(distanceToTargetMeters, adaptiveWalkThresholds);
    const previousStage = lastProximityStageRef.current;
    const shouldAlert = shouldTriggerProximityAlert({
      lastObservedStage: previousStage,
      lastAlertStage: lastAlertedProximityStageRef.current,
      nextStage: stage,
      lastAlertTimestamp: lastProximityAlertTimestampRef.current,
    });

    lastProximityStageRef.current = stage;

    if (!shouldAlert) {
      return;
    }

    lastAlertedProximityStageRef.current = stage;
    lastProximityAlertTimestampRef.current = Date.now();

    if (proximityAlertSettings.vibrationAlerts) {
      if (stage === 'near') {
        void triggerSoftImpactHaptic();
      } else if (stage === 'very_near') {
        void triggerMediumImpactHaptic();
      } else if (stage === 'arrived') {
        void triggerStrongImpactHaptic();
      }
    }

    if (proximityAlertSettings.voiceAlerts) {
      logNavigationEvent('walking-proximity-alert', {
        station: walkingTargetStation.name,
        stage,
        distanceMeters: Math.round(distanceToTargetMeters),
        thresholds: adaptiveWalkThresholds,
        signalState: location.signalState,
        speedMps: location.speedMps,
      });
      void speakStationProximity(walkingTargetStation, stage, distanceToTargetMeters);
    }
  }, [
    adaptiveWalkThresholds,
    distanceToTargetMeters,
    isControlledDemo,
    proximityAlertSettings,
    tripFinished,
    walkingTargetStation,
    location.signalState,
    location.speedMps,
  ]);

  useEffect(() => {
    if (
      !isControlledDemo ||
      !demoJourney ||
      !['preview', 'walking'].includes(demoState.currentStep)
    ) {
      return;
    }

    const demoRunKey = `walking-${demoRunId}`;

    if (lastDemoRunKeyRef.current === demoRunKey || tripFinished) {
      return;
    }

    lastDemoRunKeyRef.current = demoRunKey;
    setWalkingTargetStation(demoJourney.originStation);
    setOriginStation(demoJourney.originStation);
    setDistanceToTargetMeters(
      calculateDistanceBetweenCoordinates(
        demoJourney.walkingStart,
        demoJourney.originStation.coordinates
      )
    );
    setRouteSummary(
      createFallbackWalkingRoute(
        demoJourney.walkingStart,
        demoJourney.originStation.coordinates
      )
    );
    setCurrentStepIndex(0);
    hasNavigatedToAlertRef.current = false;
    hasStartedNavigationRef.current = false;
    hasSpokenTransitPlanRef.current = false;
    let cancelled = false;

    const runControlledDemo = async () => {
      setDemoStep('walking');
      logDemoEvent('Step: WALKING', {
        originStation: demoJourney.originStation.name,
        destinationStation: demoJourney.destinationStation.name,
      });
      await triggerMediumImpactHaptic();
      await speakNavigationStarted(demoJourney.originStation.name);

      if (cancelled) {
        return;
      }

      await speakTransitPlanSummary(
        demoJourney.originStation.name,
        demoJourney.destinationStation.name,
        demoJourney.routePlan,
        { userAlreadyAtOriginStation: false }
      );

      const walkingPoints = buildDemoMotionPoints(
        [demoJourney.walkingStart, demoJourney.originStation.coordinates],
        {
          stepsPerSegment: 5,
          speedMps: 1.2,
          accuracy: 5,
        }
      );

      for (const point of walkingPoints) {
        if (cancelled) {
          return;
        }

        const distanceMeters = calculateDistanceBetweenCoordinates(
          {
            latitude: point.latitude,
            longitude: point.longitude,
          },
          demoJourney.originStation.coordinates
        );

        updateDemoState({
          location: point,
          currentLegType: 'walk',
          currentStationName: null,
          nextStationName: demoJourney.originStation.name,
          busCode: demoJourney.busLegs[0]?.routeCode ?? null,
        });
        setDistanceToTargetMeters(distanceMeters);
        setRouteSummary(
          createFallbackWalkingRoute(
            {
              latitude: point.latitude,
              longitude: point.longitude,
            },
            demoJourney.originStation.coordinates
          )
        );
        await waitForSpeechToSettle(1200);
      }

      if (cancelled) {
        return;
      }

      updateDemoState({
        currentLegType: 'walk',
        currentStationName: demoJourney.originStation.name,
        nextStationName: demoJourney.busLegs[0]?.to.name ?? demoJourney.destinationStation.name,
      });
      setDistanceToTargetMeters(0);
      setRouteSummary(null);
      await triggerStrongImpactHaptic();
      await speakStationArrival(demoJourney.originStation.name);

      if (cancelled) {
        return;
      }

      setDemoStep('station_alert');
      logDemoEvent('Step: STATION_ALERT', {
        station: demoJourney.originStation.name,
      });
      await waitForSpeechToSettle(1600);

      if (cancelled) {
        return;
      }

      navigation.replace('StationAlert');
    };

    void runControlledDemo();

    return () => {
      cancelled = true;
    };
  }, [
    demoJourney,
    demoRunId,
    demoState.currentStep,
    isControlledDemo,
    navigation,
    setDemoStep,
    setOriginStation,
    tripFinished,
    updateDemoState,
  ]);

  const currentStep = routeSummary?.steps[currentStepIndex] ?? null;
  const firstBusLeg = getFirstBusLeg(busRoutePlan);
  const statusText = loadingRoute
    ? 'Calculando ruta'
    : routeError
      ? routeError
      : routeSummary
        ? `${routeSummary.distanceText} · ${routeSummary.durationText}`
        : walkingTargetStation
          ? `Destino peatonal: ${walkingTargetStation.name}`
          : 'Esperando ubicacion';
  const demoSupportText = isControlledDemo
    ? `Demo activa · Tramo ${demoState.currentLegType === 'bus' ? 'en bus' : 'caminando'} · Siguiente: ${demoState.nextStationName ?? walkingTargetStation?.name ?? destinationStation.name}`
    : null;
  const supportText = busRoutePlan
    ? firstBusLeg
      ? busRoutePlan.usesTransfer
        ? `Luego tomaras el bus ${firstBusLeg.routeCode} hacia el ${firstBusLeg.direction.toLowerCase()} y despues haras transbordo.`
        : `Luego tomaras el bus ${firstBusLeg.routeCode} hacia el ${firstBusLeg.direction.toLowerCase()} hasta ${destinationStation.name}.`
      : busRoutePlan.usesTransfer
        ? `Luego haras transbordo antes de llegar a ${destinationStation.name}.`
        : `Luego seguiras en bus hasta ${destinationStation.name}.`
    : walkingTargetStation
      ? 'Revisa el destino porque no hay un trayecto en bus confirmado.'
      : '';

  return (
    <ScreenContainer backgroundColor={colors.cream}>
      <MapView
        currentLocation={
          location.coordinates
            ? {
                latitude: location.coordinates.latitude,
                longitude: location.coordinates.longitude,
              }
            : null
        }
        destination={walkingTargetStation?.coordinates ?? null}
        destinationLabel={walkingTargetStation?.name}
        routeCoordinates={navigationPhase === 'walking' ? routeSummary?.coordinates ?? [] : []}
        routeLegs={activeWalkingLegOverlays}
        routeErrorMessage={routeError}
      />

      <View style={styles.primaryCard}>
        <Text accessibilityRole="header" style={styles.primaryInstruction}>
          {currentStep?.instruction ?? 'Preparando indicaciones'}
        </Text>
      </View>

      <View style={styles.secondaryCard}>
        <Text style={styles.secondaryText}>{statusText}</Text>
        {demoSupportText ? <Text style={styles.supportText}>{demoSupportText}</Text> : null}
        {supportText ? <Text style={styles.supportText}>{supportText}</Text> : null}
      </View>

      <AccessibleButton
        label="Cambiar destino"
        variant="secondary"
        hint="Abrir la lista de estaciones"
        accessibilityLabel="Cambiar destino"
        onPress={() => navigation.navigate('StationSelector')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  primaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  primaryInstruction: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  secondaryCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  supportText: {
    marginTop: spacing.xs,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSoft,
    textAlign: 'center',
    fontWeight: '600',
  },
});
