import { useEffect, useRef } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DemoState, DemoStep } from '@/src/domain/gateways/ISimulationGateway';
import { simulationScenarioRunner } from '@/src/infrastructure/simulation/SimulationScenarioRunner';
import { DemoJourney } from '@/src/services/demoService';
import { TransmilenioStation } from '@/src/services/transmilenioService';
import { RootStackParamList } from '@/src/utils/navigation';

export type UseBusTrackingSimulationOptions = {
  isControlledDemo: boolean;
  demoJourney: DemoJourney | null;
  demoRunId: number;
  demoState: DemoState;
  tripFinished: boolean;
  navigation: NativeStackNavigationProp<RootStackParamList, 'BusTracking'>;
  setOriginStation: (station: TransmilenioStation) => void;
  finishTrip: () => void;
  updateDemoState: (patch: Partial<DemoState>) => void;
  setDemoStep: (step: DemoStep) => void;
};

export function useBusTrackingSimulation(options: UseBusTrackingSimulationOptions) {
  const {
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
  } = options;

  const lastDemoRunKeyRef = useRef<string | null>(null);
  const hasAutoNavigatedRef = useRef(false);

  useEffect(() => {
    if (
      !isControlledDemo ||
      !demoJourney ||
      tripFinished ||
      demoState.currentStep === 'arrived' ||
      demoState.currentStep === 'station_alert'
    ) {
      return;
    }

    const runKey = `bus-${demoRunId}-${demoState.currentBusLegIndex}`;

    if (lastDemoRunKeyRef.current === runKey || hasAutoNavigatedRef.current) {
      return;
    }

    const activeDemoLeg = demoJourney.busLegs[demoState.currentBusLegIndex] ?? null;

    if (!activeDemoLeg) {
      return;
    }

    lastDemoRunKeyRef.current = runKey;
    let cancelled = false;

    void simulationScenarioRunner.runBusRideSimulation({
      demoJourney,
      activeDemoLeg,
      currentBusLegIndex: demoState.currentBusLegIndex,
      hasArrived: demoState.hasArrived,
      hasSpokenArrival: demoState.hasSpokenArrival,
      isCancelled: () => cancelled,
      setOriginStation,
      finishTrip,
      updateDemoState,
      setDemoStep,
      onNavigateToTransfer: () => {
        navigation.replace('StationArrival');
      },
      onNavigateToDestination: () => {
        hasAutoNavigatedRef.current = true;
        navigation.replace('Destination', { suppressAutoSpeech: true });
      },
    });

    return () => {
      cancelled = true;
    };
  }, [
    demoJourney,
    demoRunId,
    demoState.currentBusLegIndex,
    demoState.currentStep,
    demoState.hasArrived,
    demoState.hasSpokenArrival,
    finishTrip,
    isControlledDemo,
    navigation,
    setDemoStep,
    setOriginStation,
    tripFinished,
    updateDemoState,
  ]);
}
