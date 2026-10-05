import {
  ISimulationScenarioRunner,
  RunBusRideSimulationOptions,
  RunWalkingSimulationOptions,
} from '@/src/domain/gateways/ISimulationGateway';
import {
  buildDemoMotionPoints,
  logDemoEvent,
} from '@/src/services/demoService';
import {
  triggerMediumImpactHaptic,
  triggerSoftImpactHaptic,
  triggerStrongImpactHaptic,
} from '@/src/services/hapticsService';
import {
  calculateDistanceBetweenCoordinates,
  createFallbackWalkingRoute,
} from '@/src/services/mapService';
import {
  speakFinalDestinationArrival,
  speakNavigationStarted,
  speakNearFinalDestination,
  speakNextStation,
  speakPrepareForTransfer,
  speakStationArrival,
  speakTransferArrivalSequence,
  speakTransitPlanSummary,
  waitForSpeechToSettle,
} from '@/src/services/speechService';
import {
  getNextBusLegAfterTransferStation,
  getTransferWalkLegAtStation,
} from '@/src/services/transmilenioService';

function waitForDemoTick(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export class SimulationScenarioRunner implements ISimulationScenarioRunner {
  async runWalkingSimulation(options: RunWalkingSimulationOptions): Promise<void> {
    const {
      demoJourney,
      isCancelled,
      setWalkingTargetStation,
      setOriginStation,
      setDistanceToTargetMeters,
      setRouteSummary,
      updateDemoState,
      setDemoStep,
      onNavigateToStationAlert,
    } = options;

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

    setDemoStep('walking');
    logDemoEvent('Step: WALKING', {
      originStation: demoJourney.originStation.name,
      destinationStation: demoJourney.destinationStation.name,
    });
    await triggerMediumImpactHaptic();
    await speakNavigationStarted(demoJourney.originStation.name);

    if (isCancelled()) {
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
      if (isCancelled()) {
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

    if (isCancelled()) {
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

    if (isCancelled()) {
      return;
    }

    setDemoStep('station_alert');
    logDemoEvent('Step: STATION_ALERT', {
      station: demoJourney.originStation.name,
    });
    await waitForSpeechToSettle(1600);

    if (isCancelled()) {
      return;
    }

    onNavigateToStationAlert();
  }

  async runBusRideSimulation(options: RunBusRideSimulationOptions): Promise<void> {
    const {
      demoJourney,
      activeDemoLeg,
      currentBusLegIndex,
      hasArrived,
      hasSpokenArrival,
      isCancelled,
      setOriginStation,
      finishTrip,
      updateDemoState,
      setDemoStep,
      onNavigateToTransfer,
      onNavigateToDestination,
    } = options;

    setDemoStep('in_bus');
    updateDemoState({
      currentLegType: 'bus',
      currentStationName: activeDemoLeg.from.name,
      nextStationName: activeDemoLeg.stations[1]?.name ?? activeDemoLeg.to.name,
      busCode: activeDemoLeg.routeCode,
    });
    logDemoEvent('Step: IN_BUS', {
      busCode: activeDemoLeg.routeCode,
      from: activeDemoLeg.from.name,
      to: activeDemoLeg.to.name,
    });

    for (let index = 0; index < activeDemoLeg.stations.length - 1; index += 1) {
      const currentStationForLeg = activeDemoLeg.stations[index];
      const nextStationForLeg = activeDemoLeg.stations[index + 1];
      const isLastStationInLeg = nextStationForLeg.id === activeDemoLeg.to.id;

      updateDemoState({
        currentLegType: 'bus',
        currentStationName: currentStationForLeg.name,
        nextStationName: nextStationForLeg.name,
        busCode: activeDemoLeg.routeCode,
      });
      await triggerSoftImpactHaptic();
      void speakNextStation(nextStationForLeg.name);

      if (isCancelled()) {
        return;
      }

      if (isLastStationInLeg) {
        const transferWalkLegAtStop = getTransferWalkLegAtStation(
          demoJourney.routePlan,
          nextStationForLeg.id
        );
        const nextBusLegAfterTransfer = getNextBusLegAfterTransferStation(
          demoJourney.routePlan,
          nextStationForLeg.id
        );

        if (transferWalkLegAtStop && nextBusLegAfterTransfer) {
          await triggerMediumImpactHaptic();
          void speakPrepareForTransfer({
            transferWalkLeg: transferWalkLegAtStop,
            nextLeg: nextBusLegAfterTransfer,
            stationName: nextStationForLeg.name,
          });
        } else {
          await triggerStrongImpactHaptic();
          void speakNearFinalDestination();
        }

        if (isCancelled()) {
          return;
        }
      }

      await waitForDemoTick(isLastStationInLeg ? 2200 : 1800);

      if (isCancelled()) {
        return;
      }

      const motionPoints = buildDemoMotionPoints(
        [currentStationForLeg.coordinates, nextStationForLeg.coordinates],
        {
          stepsPerSegment: 4,
          speedMps: 6.5,
          accuracy: 5,
        }
      );

      for (const point of motionPoints) {
        if (isCancelled()) {
          return;
        }

        updateDemoState({
          location: point,
          currentLegType: 'bus',
          currentStationName: currentStationForLeg.name,
          nextStationName: nextStationForLeg.name,
          busCode: activeDemoLeg.routeCode,
        });
        await waitForDemoTick(700);
      }

      updateDemoState({
        currentLegType: 'bus',
        currentStationName: nextStationForLeg.name,
        nextStationName:
          activeDemoLeg.stations[index + 2]?.name ?? demoJourney.destinationStation.name,
        busCode: activeDemoLeg.routeCode,
      });
    }

    if (isCancelled()) {
      return;
    }

    const transferWalkLeg = getTransferWalkLegAtStation(
      demoJourney.routePlan,
      activeDemoLeg.to.id
    );
    const nextTransferLeg = getNextBusLegAfterTransferStation(
      demoJourney.routePlan,
      activeDemoLeg.to.id
    );

    if (transferWalkLeg && nextTransferLeg) {
      setDemoStep('transfer');
      logDemoEvent('Step: TRANSFER', {
        atStation: activeDemoLeg.to.name,
        nextBus: nextTransferLeg.routeCode,
      });
      await triggerMediumImpactHaptic();
      void speakTransferArrivalSequence(
        nextTransferLeg,
        transferWalkLeg,
        activeDemoLeg.to.name
      );
      await waitForDemoTick(2600);

      const transferPoints = buildDemoMotionPoints(
        [transferWalkLeg.from.coordinates, transferWalkLeg.to.coordinates],
        {
          stepsPerSegment: 3,
          speedMps: 1.2,
          accuracy: 5,
        }
      );

      for (const point of transferPoints) {
        if (isCancelled()) {
          return;
        }

        updateDemoState({
          location: point,
          currentLegType: 'walk',
          currentStationName: transferWalkLeg.from.name,
          nextStationName: transferWalkLeg.to.name,
          busCode: null,
        });
        await waitForDemoTick(900);
      }

      if (isCancelled()) {
        return;
      }

      setOriginStation(transferWalkLeg.to);
      updateDemoState({
        currentBusLegIndex: currentBusLegIndex + 1,
        currentLegType: 'walk',
        currentStationName: transferWalkLeg.to.name,
        nextStationName: nextTransferLeg.from.name,
        busCode: nextTransferLeg.routeCode,
      });
      await waitForDemoTick(1400);

      if (isCancelled()) {
        return;
      }

      onNavigateToTransfer();
      return;
    }

    if (hasArrived || hasSpokenArrival) {
      return;
    }

    finishTrip();
    setDemoStep('arrived');
    updateDemoState({
      hasArrived: true,
      currentLegType: 'bus',
      currentStationName: demoJourney.destinationStation.name,
      nextStationName: null,
      busCode: activeDemoLeg.routeCode,
    });
    logDemoEvent('Step: ARRIVED', {
      station: demoJourney.destinationStation.name,
    });
    await triggerStrongImpactHaptic();
    void speakFinalDestinationArrival(demoJourney.destinationStation.name);

    if (isCancelled()) {
      return;
    }

    updateDemoState({
      hasSpokenArrival: true,
    });
    await waitForDemoTick(2200);

    if (isCancelled()) {
      return;
    }

    onNavigateToDestination();
  }
}

export const simulationScenarioRunner = new SimulationScenarioRunner();
