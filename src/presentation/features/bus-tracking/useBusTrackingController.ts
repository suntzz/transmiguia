import React, { useEffect, useMemo, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { RouteLegOverlay } from "@/src/components/MapView";
import { useDemoMode } from "@/src/context/DemoModeContext";
import { useRouteSelection } from "@/src/context/RouteContext";
import { useLiveLocation } from "@/src/hooks/useLiveLocation";
import { useBusTrackingSimulation } from "./useBusTrackingSimulation";
import {
  triggerMediumImpactHaptic,
  triggerSoftImpactHaptic,
  triggerStrongImpactHaptic,
  triggerWarningHaptic,
} from "@/src/services/hapticsService";
import {
  speakFinalDestinationArrival,
  speakNearFinalDestination,
  speakNextStation,
  speakPrepareForTransfer,
  speakLostRouteSequence,
  speakRouteAlert,
  speakTransferArrivalSequence,
  speakWrongStopSequence,
  stopSpeaking,
  waitForSpeechToSettle,
} from "@/src/services/speechService";
import {
  buildUserNavigationPlan,
  findNearestStation,
  findNearestStationInList,
  getBusLegs,
  getNextBusLegAfterTransferStation,
  getRouteWithTransfers,
  getStationsForRoute,
  getTransferWalkLegAtStation,
  isBusTransitLeg,
  isWalkTransitLeg,
} from "@/src/services/transmilenioService";
import { useScreenAnnouncement } from "@/src/hooks/useScreenAnnouncement";
import { useStopDemoOnBack } from "@/src/hooks/useStopDemoOnBack";
import { getAdaptiveBusAlertThresholds, getDistanceInMeters } from "@/src/utils/proximity";
import { logNavigationEvent } from "@/src/utils/navigationDebug";
import { RootStackParamList } from "@/src/utils/navigation";

export type BusTrackingNavigationProp = NativeStackNavigationProp<RootStackParamList, "BusTracking">;

export type UseBusTrackingControllerParams = {
  navigation: BusTrackingNavigationProp;
};

const LOST_COUNTER_THRESHOLD = 3;
const LOST_REROUTE_COOLDOWN_MS = 25000;
const BUS_LOST_ROUTE_DISTANCE_METERS = 150;
const BUS_STAGNANT_MOVEMENT_THRESHOLD_METERS = 220;
const BUS_MOVEMENT_SAMPLE_THRESHOLD_METERS = 20;
const WRONG_STOP_COUNTER_THRESHOLD = 2;
const WRONG_STOP_SPEED_THRESHOLD_MPS = 1.1;
const WRONG_STOP_STATION_DISTANCE_METERS = 45;
const WRONG_STOP_MIN_STEP_MOVEMENT_METERS = 4;
const WRONG_STOP_WALKING_MOVEMENT_THRESHOLD_METERS = 12;
const WRONG_STOP_MAX_STEP_MOVEMENT_METERS = 30;

export function useBusTrackingController({ navigation }: UseBusTrackingControllerParams) {
  useScreenAnnouncement('Seguimiento dentro del bus. Se muestran las paradas del recorrido.');
  const { destinationStation, originStation, setOriginStation, tripFinished, finishTrip } =
    useRouteSelection();
  const {
    demoAutoFlowEnabled,
    demoJourney,
    demoModeEnabled,
    demoRunId,
    demoState,
    setDemoStep,
    updateDemoState,
  } = useDemoMode();
  const isControlledDemo = (demoAutoFlowEnabled || demoModeEnabled) && demoJourney != null;
  useStopDemoOnBack(isControlledDemo);
  const location = useLiveLocation();
  const { startTracking, stopTracking } = location;
  const [isUserLost, setIsUserLost] = React.useState(false);
  const hasAutoNavigatedRef = useRef(false);
  const hasAnnouncedTransferRef = useRef<string | null>(null);
  const hasAnnouncedArrivalRef = useRef(false);
  const hasAnnouncedTransferApproachRef = useRef<string | null>(null);
  const hasAnnouncedFinalApproachRef = useRef(false);
  const hasHandledWrongStopRef = useRef(false);
  const lastAnnouncedStationRef = useRef<string | null>(null);
  const lastAnnouncedEventRef = useRef<string | null>(null);
  const lastRouteIssueRef = useRef<string | null>(null);
  const lastLocationIssueRef = useRef<string | null>(null);
  const lastProgressIndexRef = useRef(0);
  const lostCounterRef = useRef(0);
  const stagnantMovementMetersRef = useRef(0);
  const lastObservedCoordinatesRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const wrongStopCounterRef = useRef(0);
  const wrongStopStationRef = useRef<string | null>(null);
  const wrongStopWalkingMovementRef = useRef(0);
  const lastWrongStopSampleRef = useRef<{
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null>(null);
  const lastReRouteTimestampRef = useRef(0);
  const recalculationInProgressRef = useRef(false);
  const lastRuntimeSignalRef = useRef<string | null>(null);
  const lastRepeatedInstructionAtRef = useRef(0);
  const originName = originStation?.name ?? destinationStation.name;
  const destinationName = destinationStation.name;
  const routePlan = useMemo(
    () =>
      isControlledDemo && demoJourney
        ? demoJourney.routePlan
        : getRouteWithTransfers(originName, destinationName),
    [demoJourney, destinationName, isControlledDemo, originName]
  );
  const busLegs = useMemo(() => getBusLegs(routePlan), [routePlan]);
  const routeStations = useMemo(() => {
    if (routePlan) {
      return routePlan.segments
        .filter((segment) => segment.mode !== 'walk')
        .flatMap((segment, index) =>
          index === 0 ? segment.stations : segment.stations.slice(1)
        );
    }

    const plannedStations = getStationsForRoute(originName, destinationName);

    if (plannedStations.length > 0) {
      return plannedStations;
    }

    if (originStation && originStation.id !== destinationStation.id) {
      return [originStation, destinationStation];
    }

    return [destinationStation];
  }, [destinationName, destinationStation, originName, originStation, routePlan]);
  const activeCoordinates = isControlledDemo ? demoState.location : location.coordinates;
  const activeSpeedMps = isControlledDemo
    ? demoState.location?.speedMps ?? 6
    : location.speedMps;
  const activeAccuracy = isControlledDemo
    ? demoState.location?.accuracy ?? null
    : location.coordinates?.accuracy ?? null;

  const currentStationMatch =
    activeCoordinates && routeStations.length > 0
      ? findNearestStationInList(
          {
            latitude: activeCoordinates.latitude,
            longitude: activeCoordinates.longitude,
          },
          routeStations
        )
      : null;
  const overallNearestStationMatch =
    activeCoordinates
      ? findNearestStation({
          latitude: activeCoordinates.latitude,
          longitude: activeCoordinates.longitude,
        })
      : null;
  const currentStation =
    currentStationMatch?.station ??
    routeStations[0] ??
    originStation ??
    destinationStation;
  const currentStationName = currentStation.name;
  const currentIndex = routeStations.findIndex((station) => station.id === currentStation.id);
  const currentTransferWalkLeg =
    routePlan ? getTransferWalkLegAtStation(routePlan, currentStation.id) : null;
  const activeLeg = useMemo(() => {
    if (busLegs.length === 0) {
      return null;
    }

    const routeIndex = currentIndex === -1 ? 0 : currentIndex;

    return (
      busLegs.find((leg) => {
        const startIndex = routeStations.findIndex((station) => station.id === leg.from.id);
        const endIndex = routeStations.findIndex((station) => station.id === leg.to.id);

        return startIndex !== -1 && endIndex !== -1 && routeIndex >= startIndex && routeIndex <= endIndex;
      }) ??
      busLegs.find((leg) => {
        const endIndex = routeStations.findIndex((station) => station.id === leg.to.id);

        return endIndex !== -1 && routeIndex <= endIndex;
      }) ??
      busLegs[busLegs.length - 1]
    );
  }, [busLegs, currentIndex, routeStations]);
  const remainingStations = currentIndex !== -1 ? routeStations.length - 1 - currentIndex : 0;
  const nextStation =
    currentIndex >= 0 && currentIndex < routeStations.length - 1
      ? routeStations[currentIndex + 1]
      : null;
  const nextTransferStation =
    routePlan?.transferStations.find((station) => {
      const transferIndex = routeStations.findIndex(
        (routeStation) => routeStation.id === station.id
      );

      return transferIndex >= currentIndex && transferIndex !== -1;
    }) ?? null;
  const nextTransferLeg =
    nextTransferStation && routePlan
      ? getNextBusLegAfterTransferStation(routePlan, nextTransferStation.id)
      : null;
  const nextTransferWalkLeg =
    nextTransferStation && routePlan
      ? getTransferWalkLegAtStation(routePlan, nextTransferStation.id)
      : null;
  const isJimenezTransferWalk =
    Boolean(nextTransferWalkLeg) &&
    nextTransferWalkLeg?.from.name.toLowerCase().includes('jimenez') === true;
  const isCurrentJimenezTransferWalk =
    Boolean(currentTransferWalkLeg) &&
    currentTransferWalkLeg?.from.name.toLowerCase().includes('jimenez') === true;
  const isLasNievesTransferWalk =
    Boolean(nextTransferWalkLeg) && nextTransferWalkLeg?.from.id === 'las-nieves';
  const isCurrentLasNievesTransferWalk =
    Boolean(currentTransferWalkLeg) && currentTransferWalkLeg?.from.id === 'las-nieves';
  const isShortCenterWalkTransfer = isJimenezTransferWalk || isLasNievesTransferWalk;
  const visibleStations = routeStations.slice(
    Math.max(0, currentIndex === -1 ? 0 : currentIndex),
    Math.min(routeStations.length, (currentIndex === -1 ? 0 : currentIndex) + 4)
  );
  const statusLineBase =
    remainingStations === 0
      ? `Llegaste a ${destinationName}.`
      : currentTransferWalkLeg
        ? isCurrentJimenezTransferWalk
          ? 'Cambia de corredor hacia el Eje Ambiental.'
          : isCurrentLasNievesTransferWalk
            ? 'Camina hacia el siguiente tramo.'
          : 'Haz transbordo por el tunel hacia la otra plataforma.'
      : nextTransferStation && nextTransferStation.name !== currentStationName
        ? isJimenezTransferWalk
          ? `Transbordo en ${nextTransferStation.name}.`
          : `Transbordo en ${nextTransferStation.name}.`
        : nextStation
          ? `Proxima: ${nextStation.name}.`
          : `Sigue hasta ${destinationName}.`;
  const statusLine =
    activeLeg && remainingStations > 0
      ? `Bus ${activeLeg.routeCode} hacia el ${activeLeg.direction.toLowerCase()}. ${statusLineBase}`
      : statusLineBase;
  const activeBusLabel = activeLeg
    ? `Bus ${activeLeg.routeCode} · ${activeLeg.direction}`
    : null;
  const adaptiveBusThresholds = useMemo(
    () =>
      getAdaptiveBusAlertThresholds({
        speedMps: activeSpeedMps,
        accuracy: activeAccuracy,
      }),
    [activeAccuracy, activeSpeedMps]
  );
  const transitMapLegOverlays = useMemo(() => {
    if (!routePlan) {
      return [];
    }

    const overlays: RouteLegOverlay[] = [];

    for (const leg of routePlan.legs) {
      if (isBusTransitLeg(leg)) {
        overlays.push({
          id: `bus-leg-${leg.routeId}-${leg.from.id}-${leg.to.id}`,
          type: 'bus',
          coordinates: leg.stations.map((station) => station.coordinates),
        });
        continue;
      }

      if (isWalkTransitLeg(leg) && leg.isTransferLeg) {
        overlays.push({
          id: `walk-transfer-${leg.routeId}-${leg.from.id}-${leg.to.id}`,
          type: 'walk',
          coordinates: leg.stations.map((station) => station.coordinates),
        });
      }
    }

    return overlays;
  }, [routePlan]);
  const currentRouteStationDistance = currentStationMatch?.distanceMeters ?? Number.POSITIVE_INFINITY;
  const distanceToNextStation =
    activeCoordinates && nextStation
      ? getDistanceInMeters(
          activeCoordinates.latitude,
          activeCoordinates.longitude,
          nextStation.coordinates.latitude,
          nextStation.coordinates.longitude
        )
      : Number.POSITIVE_INFINITY;
  const isTransferStation =
    Boolean(nextTransferStation) &&
    currentStation.id === nextTransferStation?.id &&
    currentRouteStationDistance <= adaptiveBusThresholds.arrived;
  const isFinalDestination =
    currentStation.id === destinationStation.id &&
    currentRouteStationDistance <= adaptiveBusThresholds.arrived;

  const resetLostTracking = React.useCallback((
    progressIndex = 0,
    coordinates?: { latitude: number; longitude: number }
  ) => {
    lostCounterRef.current = 0;
    stagnantMovementMetersRef.current = 0;
    lastProgressIndexRef.current = progressIndex;
    if (coordinates) {
      lastObservedCoordinatesRef.current = coordinates;
    }
    setIsUserLost(false);
  }, []);

  const resetWrongStopTracking = React.useCallback(() => {
    wrongStopCounterRef.current = 0;
    wrongStopStationRef.current = null;
    wrongStopWalkingMovementRef.current = 0;
    lastWrongStopSampleRef.current = null;
    hasHandledWrongStopRef.current = false;
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (!isControlledDemo) {
        void startTracking();
      }

      return () => {
        if (!isControlledDemo) {
          stopTracking();
        }
        void stopSpeaking();
      };
    }, [isControlledDemo, startTracking, stopTracking])
  );

  useEffect(() => {
    hasAutoNavigatedRef.current = false;
    hasAnnouncedTransferRef.current = null;
    hasAnnouncedArrivalRef.current = false;
    hasAnnouncedTransferApproachRef.current = null;
    hasAnnouncedFinalApproachRef.current = false;
    hasHandledWrongStopRef.current = false;
    lastAnnouncedStationRef.current = null;
    lastAnnouncedEventRef.current = null;
    lastRouteIssueRef.current = null;
    lastLocationIssueRef.current = null;
    lastProgressIndexRef.current = 0;
    lostCounterRef.current = 0;
    stagnantMovementMetersRef.current = 0;
    lastObservedCoordinatesRef.current = null;
    wrongStopCounterRef.current = 0;
    wrongStopStationRef.current = null;
    wrongStopWalkingMovementRef.current = 0;
    lastWrongStopSampleRef.current = null;
    lastReRouteTimestampRef.current = 0;
    recalculationInProgressRef.current = false;
    setIsUserLost(false);
  }, [destinationName]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (routePlan || lastRouteIssueRef.current === destinationName) {
      return;
    }

    lastRouteIssueRef.current = destinationName;
    void triggerWarningHaptic();
    void speakRouteAlert(
      `No pude confirmar un trayecto de bus valido hasta ${destinationName}. Puedes cambiar el destino.`,
      `bus-tracking-route-issue-${destinationStation.id}`
    );
  }, [destinationName, destinationStation.id, isControlledDemo, routePlan, tripFinished]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (!location.error || lastLocationIssueRef.current === location.error.code) {
      return;
    }

    const message =
      location.error.code === 'GPS_DISABLED'
        ? 'No tengo tu ubicacion. Intenta moverte o activa el GPS.'
        : location.error.code === 'PERMISSION_DENIED'
          ? 'No puedo seguirte sin ubicacion. Activa el permiso para continuar.'
          : 'No tengo tu ubicacion en este momento. Intentare actualizarla.';

    lastLocationIssueRef.current = location.error.code;
    void triggerWarningHaptic();
    void speakRouteAlert(message, `bus-tracking-location-${location.error.code}`);
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
    logNavigationEvent('bus-location-signal', {
      signalState: location.signalState,
      lastUpdateAgeMs: location.lastUpdateAgeMs,
      speedMps: location.speedMps,
      stationaryDurationMs: location.stationaryDurationMs,
    });
    void triggerWarningHaptic();
    void speakRouteAlert(message, `bus-signal-${location.signalState}`);
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
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (!nextStation) {
      return;
    }

    const nextEvent =
      nextStation?.id === nextTransferStation?.id &&
      distanceToNextStation <= adaptiveBusThresholds.prepareDrop
        ? 'prepare-transfer'
        : nextStation?.id === destinationStation.id &&
          distanceToNextStation <= adaptiveBusThresholds.prepareDrop
          ? 'prepare-final'
          : distanceToNextStation <= adaptiveBusThresholds.nextStation
            ? 'next-station'
            : null;

    if (!nextEvent) {
      return;
    }

    if (
      nextEvent === 'prepare-transfer' &&
      hasAnnouncedTransferApproachRef.current === nextStation.id
    ) {
      return;
    }

    if (nextEvent === 'prepare-final' && hasAnnouncedFinalApproachRef.current) {
      return;
    }

    const alreadyAnnounced =
      nextEvent === 'next-station' &&
      lastAnnouncedStationRef.current === nextStation.id &&
      lastAnnouncedEventRef.current === nextEvent;

    if (alreadyAnnounced) {
      return;
    }

    if (nextEvent === 'prepare-transfer') {
      hasAnnouncedTransferApproachRef.current = nextStation.id;
      logNavigationEvent('bus-prepare-transfer', {
        station: nextStation.name,
        distanceMeters: Math.round(distanceToNextStation),
        thresholds: adaptiveBusThresholds,
        signalState: location.signalState,
        speedMps: location.speedMps,
      });
      void (isShortCenterWalkTransfer ? triggerSoftImpactHaptic() : triggerMediumImpactHaptic());
      void speakPrepareForTransfer({
        transferWalkLeg: nextTransferWalkLeg,
        nextLeg: nextTransferLeg,
        stationName: nextTransferStation?.name ?? null,
      });
      return;
    }

    if (nextEvent === 'prepare-final') {
      hasAnnouncedFinalApproachRef.current = true;
      logNavigationEvent('bus-prepare-final', {
        station: nextStation.name,
        distanceMeters: Math.round(distanceToNextStation),
        thresholds: adaptiveBusThresholds,
        signalState: location.signalState,
        speedMps: location.speedMps,
      });
      void triggerStrongImpactHaptic();
      void speakNearFinalDestination();
      return;
    }

    lastAnnouncedStationRef.current = nextStation.id;
    lastAnnouncedEventRef.current = nextEvent;
    logNavigationEvent('bus-next-station', {
      station: nextStation.name,
      distanceMeters: Math.round(distanceToNextStation),
      thresholds: adaptiveBusThresholds,
      signalState: location.signalState,
      speedMps: location.speedMps,
    });
    void triggerSoftImpactHaptic();
    void speakNextStation(nextStation.name);
  }, [
    adaptiveBusThresholds,
    destinationStation.id,
    distanceToNextStation,
    isControlledDemo,
    location.signalState,
    location.speedMps,
    nextStation,
    isShortCenterWalkTransfer,
    nextTransferLeg,
    nextTransferStation?.id,
    nextTransferStation?.name,
    nextTransferWalkLeg,
    tripFinished,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (!isTransferStation || !nextTransferStation) {
      return;
    }

    if (hasAnnouncedTransferRef.current === nextTransferStation.id) {
      return;
    }

    hasAnnouncedTransferRef.current = nextTransferStation.id;
    lastAnnouncedStationRef.current = nextTransferStation.id;
    lastAnnouncedEventRef.current = 'transfer';
    let cancelled = false;

    void (async () => {
      logNavigationEvent('bus-transfer-arrival', {
        station: nextTransferStation.name,
        distanceMeters: Math.round(currentRouteStationDistance),
        signalState: location.signalState,
        speedMps: location.speedMps,
      });
      await triggerMediumImpactHaptic();
      await speakTransferArrivalSequence(
        nextTransferLeg,
        currentTransferWalkLeg,
        nextTransferStation.name
      );

      if (cancelled) {
        return;
      }

      const continuationOriginStation =
        currentTransferWalkLeg?.to ?? nextTransferLeg?.from ?? nextTransferStation;

      if (!continuationOriginStation) {
        return;
      }

      setOriginStation(continuationOriginStation);
      await waitForSpeechToSettle(1800);

      if (cancelled) {
        return;
      }

      navigation.replace('StationArrival');
    })();

    return () => {
      cancelled = true;
    };
  }, [
    currentTransferWalkLeg,
    currentRouteStationDistance,
    isControlledDemo,
    isTransferStation,
    location.signalState,
    location.speedMps,
    navigation,
    nextTransferLeg,
    nextTransferStation,
    setOriginStation,
    tripFinished,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished || !isFinalDestination || hasAnnouncedArrivalRef.current) {
      return;
    }

    hasAnnouncedArrivalRef.current = true;
    hasAutoNavigatedRef.current = true;
    finishTrip();
    let cancelled = false;

    const finishNavigation = async () => {
      logNavigationEvent('bus-final-arrival', {
        station: destinationName,
        distanceMeters: Math.round(currentRouteStationDistance),
        signalState: location.signalState,
        speedMps: location.speedMps,
      });
      await triggerStrongImpactHaptic();
      await speakFinalDestinationArrival(destinationName);

      if (cancelled) {
        return;
      }

      stopTracking();
      await stopSpeaking();
      await waitForSpeechToSettle(1800);

      if (cancelled) {
        return;
      }

      navigation.replace('Destination', { suppressAutoSpeech: true });
    };

    void finishNavigation();

    return () => {
      cancelled = true;
    };
  }, [
    currentRouteStationDistance,
    destinationName,
    finishTrip,
    isControlledDemo,
    isFinalDestination,
    location.signalState,
    location.speedMps,
    navigation,
    stopTracking,
    tripFinished,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (
      recalculationInProgressRef.current ||
      !location.coordinates ||
      !overallNearestStationMatch ||
      !activeLeg ||
      currentTransferWalkLeg ||
      isTransferStation ||
      isFinalDestination
    ) {
      return;
    }

    const hasAdvancedOnBus = currentIndex > 0 || lastProgressIndexRef.current > 0;

    if (!hasAdvancedOnBus) {
      return;
    }

    if (
      location.coordinates.accuracy != null &&
      location.coordinates.accuracy > 40
    ) {
      return;
    }

    const wrongStopStation = overallNearestStationMatch.station;
    const expectedStopStation = activeLeg.to;

    if (
      overallNearestStationMatch.distanceMeters > WRONG_STOP_STATION_DISTANCE_METERS ||
      wrongStopStation.id === expectedStopStation.id ||
      wrongStopStation.id === destinationStation.id
    ) {
      wrongStopCounterRef.current = 0;
      wrongStopStationRef.current = null;
      wrongStopWalkingMovementRef.current = 0;
      lastWrongStopSampleRef.current = {
        latitude: location.coordinates.latitude,
        longitude: location.coordinates.longitude,
        timestamp: location.coordinates.timestamp,
      };
      return;
    }

    const previousSample = lastWrongStopSampleRef.current;
    const currentSample = {
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
      timestamp: location.coordinates.timestamp,
    };
    const stepDistance =
      previousSample == null
        ? 0
        : getDistanceInMeters(
            previousSample.latitude,
            previousSample.longitude,
            currentSample.latitude,
            currentSample.longitude
          );
    const elapsedSeconds =
      previousSample == null
        ? 0
        : Math.max(1, (currentSample.timestamp - previousSample.timestamp) / 1000);
    const speedMps = elapsedSeconds > 0 ? stepDistance / elapsedSeconds : 0;
    const sameWrongStopStation = wrongStopStationRef.current === wrongStopStation.id;
    const isLowSpeed = speedMps <= WRONG_STOP_SPEED_THRESHOLD_MPS;
    const looksLikeWalkingStep =
      stepDistance >= WRONG_STOP_MIN_STEP_MOVEMENT_METERS &&
      stepDistance <= WRONG_STOP_MAX_STEP_MOVEMENT_METERS;

    lastWrongStopSampleRef.current = currentSample;

    if (!sameWrongStopStation) {
      wrongStopStationRef.current = wrongStopStation.id;
      wrongStopCounterRef.current = 0;
      wrongStopWalkingMovementRef.current = 0;
    }

    if (!isLowSpeed) {
      wrongStopCounterRef.current = 0;
      wrongStopWalkingMovementRef.current = 0;
      return;
    }

    if (looksLikeWalkingStep) {
      wrongStopWalkingMovementRef.current += stepDistance;
    }

    wrongStopCounterRef.current = sameWrongStopStation ? wrongStopCounterRef.current + 1 : 1;

    const confirmedWrongStop =
      wrongStopCounterRef.current >= WRONG_STOP_COUNTER_THRESHOLD &&
      wrongStopWalkingMovementRef.current >= WRONG_STOP_WALKING_MOVEMENT_THRESHOLD_METERS;

    if (
      !confirmedWrongStop ||
      hasHandledWrongStopRef.current ||
      Date.now() - lastReRouteTimestampRef.current < LOST_REROUTE_COOLDOWN_MS
    ) {
      return;
    }

    hasHandledWrongStopRef.current = true;
    recalculationInProgressRef.current = true;
    lastReRouteTimestampRef.current = Date.now();

    let cancelled = false;

    const handleWrongStop = async () => {
      const continuationPlan = getRouteWithTransfers(wrongStopStation, destinationStation);
      const canContinueFromCurrentStation = Boolean(continuationPlan);
      const nextPlan = canContinueFromCurrentStation
        ? null
        : buildUserNavigationPlan(currentSample, destinationStation);

      await triggerMediumImpactHaptic();
      logNavigationEvent('bus-wrong-stop', {
        wrongStopStation: wrongStopStation.name,
        expectedStopStation: expectedStopStation.name,
        speedMps,
        signalState: location.signalState,
      });
      await speakWrongStopSequence({
        continueFromCurrentStation: canContinueFromCurrentStation,
        nearestStationName: nextPlan?.originStation.name,
      });

      if (cancelled) {
        return;
      }

      if (canContinueFromCurrentStation) {
        setOriginStation(wrongStopStation);
        resetLostTracking(
          routeStations.findIndex((station) => station.id === wrongStopStation.id),
          currentSample
        );
        resetWrongStopTracking();
        await waitForSpeechToSettle(1800);

        if (cancelled) {
          return;
        }

        navigation.replace('StationArrival');
        return;
      }

      const nextOriginStation = nextPlan?.originStation ?? wrongStopStation;
      setOriginStation(nextOriginStation);
      resetLostTracking(0, currentSample);
      resetWrongStopTracking();
      await waitForSpeechToSettle(1800);

      if (cancelled) {
        return;
      }

      navigation.replace('WalkingGuide');
    };

    void handleWrongStop();

    return () => {
      cancelled = true;
      recalculationInProgressRef.current = false;
    };
  }, [
    activeLeg,
    currentIndex,
    currentTransferWalkLeg,
    destinationStation,
    isControlledDemo,
    isFinalDestination,
    isTransferStation,
    location.coordinates,
    location.signalState,
    navigation,
    overallNearestStationMatch,
    resetLostTracking,
    resetWrongStopTracking,
    routeStations,
    setOriginStation,
    tripFinished,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (
      recalculationInProgressRef.current ||
      !overallNearestStationMatch ||
      !location.coordinates
    ) {
      return;
    }

    const isOnPlannedRoute = routeStations.some(
      (station) => station.id === overallNearestStationMatch.station.id
    );
    const currentCoordinates = {
      latitude: location.coordinates.latitude,
      longitude: location.coordinates.longitude,
    };
    const previousCoordinates = lastObservedCoordinatesRef.current;
    const movementDelta =
      previousCoordinates == null
        ? 0
        : getDistanceInMeters(
            previousCoordinates.latitude,
            previousCoordinates.longitude,
            currentCoordinates.latitude,
            currentCoordinates.longitude
          );

    lastObservedCoordinatesRef.current = currentCoordinates;

    if (currentIndex > lastProgressIndexRef.current) {
      resetLostTracking(currentIndex, currentCoordinates);
      resetWrongStopTracking();
      return;
    }

    if (movementDelta >= BUS_MOVEMENT_SAMPLE_THRESHOLD_METERS) {
      stagnantMovementMetersRef.current += movementDelta;
    }

    const offRouteProblem =
      !isOnPlannedRoute &&
      (currentRouteStationDistance > BUS_LOST_ROUTE_DISTANCE_METERS ||
        currentRouteStationDistance - overallNearestStationMatch.distanceMeters >= 40);
    const noProgressProblem =
      stagnantMovementMetersRef.current >= BUS_STAGNANT_MOVEMENT_THRESHOLD_METERS &&
      (!isOnPlannedRoute || currentRouteStationDistance > 110);
    const retrocededProblem =
      currentIndex !== -1 && currentIndex < lastProgressIndexRef.current;
    const lossReason: 'off-route' | 'no-progress' | 'retroceded' | null =
      retrocededProblem
        ? 'retroceded'
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

    if (Date.now() - lastReRouteTimestampRef.current < LOST_REROUTE_COOLDOWN_MS) {
      return;
    }

    lostCounterRef.current += 1;

    if (lostCounterRef.current < LOST_COUNTER_THRESHOLD) {
      return;
    }

    recalculationInProgressRef.current = true;
    lastReRouteTimestampRef.current = Date.now();
    setIsUserLost(true);
    let cancelled = false;

    const rerouteFromCurrentLocation = async () => {
      const nextPlan = buildUserNavigationPlan(currentCoordinates, destinationStation);
      const nextOriginStation =
        nextPlan?.originStation ?? overallNearestStationMatch.station;

      await triggerStrongImpactHaptic();
      logNavigationEvent('bus-reroute', {
        reason: lossReason,
        nextOriginStation: nextOriginStation?.name ?? null,
        signalState: location.signalState,
        speedMps: location.speedMps,
      });
      await speakLostRouteSequence(nextOriginStation?.name, lossReason);

      if (cancelled) {
        return;
      }

      setOriginStation(nextOriginStation);
      resetLostTracking(currentIndex === -1 ? 0 : currentIndex, currentCoordinates);
      resetWrongStopTracking();
      await waitForSpeechToSettle(2000);

      if (cancelled) {
        return;
      }

      navigation.replace('WalkingGuide');
    };

    void rerouteFromCurrentLocation();

    return () => {
      cancelled = true;
      recalculationInProgressRef.current = false;
    };
  }, [
    currentRouteStationDistance,
    currentIndex,
    destinationStation,
    isControlledDemo,
    isUserLost,
    location.coordinates,
    location.signalState,
    location.speedMps,
    navigation,
    overallNearestStationMatch,
    resetLostTracking,
    resetWrongStopTracking,
    routeStations,
    setOriginStation,
    tripFinished,
  ]);

  useEffect(() => {
    if (isControlledDemo) {
      return;
    }

    if (tripFinished) {
      return;
    }

    if (
      !nextStation ||
      isTransferStation ||
      isFinalDestination ||
      location.stationaryDurationMs < 18000
    ) {
      return;
    }

    if (Date.now() - lastRepeatedInstructionAtRef.current < 22000) {
      return;
    }

    lastRepeatedInstructionAtRef.current = Date.now();
    logNavigationEvent('bus-repeat-instruction', {
      nextStation: nextStation.name,
      stationaryDurationMs: location.stationaryDurationMs,
      signalState: location.signalState,
      speedMps: location.speedMps,
    });
    void triggerSoftImpactHaptic();
    void speakNextStation(nextStation.name);
  }, [
    isControlledDemo,
    isFinalDestination,
    isTransferStation,
    location.signalState,
    location.speedMps,
    location.stationaryDurationMs,
    nextStation,
    tripFinished,
  ]);

  useBusTrackingSimulation({
    isControlledDemo,
    demoJourney,
    demoRunId,
    demoState,
    tripFinished,
    navigation,
    setOriginStation,
    finishTrip,
    updateDemoState,
    setDemoStep,
  });

  const displayCurrentStationName =
    isControlledDemo && demoState.currentStationName
      ? demoState.currentStationName
      : currentStationName;
  const displayNextStationName =
    isControlledDemo && demoState.nextStationName
      ? demoState.nextStationName
      : nextStation?.name ?? destinationName;
  const displayBusLabel =
    isControlledDemo && demoState.busCode
      ? `Bus ${demoState.busCode}`
      : activeBusLabel;
  const displayStatusLine =
    isControlledDemo
      ? `${demoState.currentLegType === 'walk' ? 'Transbordo peatonal' : displayBusLabel ?? 'En bus'}. ${
          displayNextStationName ? `Siguiente: ${displayNextStationName}.` : 'Llegada final.'
        }`
      : statusLine;


  return {
    activeCoordinates,
    destinationStation,
    destinationName,
    transitMapLegOverlays,
    displayStatusLine,
    displayBusLabel,
    displayCurrentStationName,
    displayNextStationName,
    visibleStations,
    routeStations,
    currentIndex,
    nextTransferStation,
    currentStationName,
    nextTransferWalkLeg,
    isJimenezTransferWalk,
    isLasNievesTransferWalk,
    nextTransferLeg,
  };
}
