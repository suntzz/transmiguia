import { useEffect, useRef } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { DemoState, DemoStep } from '@/src/domain/gateways/ISimulationGateway';
import { simulationScenarioRunner } from '@/src/infrastructure/simulation/SimulationScenarioRunner';
import { DemoJourney } from '@/src/services/demoService';
import { RouteSummary } from '@/src/services/mapService';
import { TransmilenioStation } from '@/src/services/transmilenioService';
import { RootStackParamList } from '@/src/utils/navigation';

export type UseWalkingGuideSimulationOptions = {
  isControlledDemo: boolean;
  demoJourney: DemoJourney | null;
  demoRunId: number;
  demoStep: DemoStep;
  tripFinished: boolean;
  navigation: NativeStackNavigationProp<RootStackParamList, 'WalkingGuide'>;
  setWalkingTargetStation: (station: TransmilenioStation) => void;
  setOriginStation: (station: TransmilenioStation) => void;
  setDistanceToTargetMeters: (distance: number) => void;
  setRouteSummary: (route: RouteSummary | null) => void;
  updateDemoState: (patch: Partial<DemoState>) => void;
  setDemoStep: (step: DemoStep) => void;
};

export function useWalkingGuideSimulation(options: UseWalkingGuideSimulationOptions) {
  const {
    isControlledDemo,
    demoJourney,
    demoRunId,
    demoStep,
    tripFinished,
    navigation,
    setWalkingTargetStation,
    setOriginStation,
    setDistanceToTargetMeters,
    setRouteSummary,
    updateDemoState,
    setDemoStep,
  } = options;

  const lastDemoRunKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !isControlledDemo ||
      !demoJourney ||
      demoStep === 'station_alert' ||
      demoStep === 'station_arrival' ||
      demoStep === 'in_bus' ||
      demoStep === 'arrived'
    ) {
      return;
    }

    const demoRunKey = `walking-${demoRunId}`;

    if (lastDemoRunKeyRef.current === demoRunKey || tripFinished) {
      return;
    }

    lastDemoRunKeyRef.current = demoRunKey;
    let cancelled = false;

    void simulationScenarioRunner.runWalkingSimulation({
      demoJourney,
      isCancelled: () => cancelled,
      setWalkingTargetStation,
      setOriginStation,
      setDistanceToTargetMeters,
      setRouteSummary,
      updateDemoState,
      setDemoStep,
      onNavigateToStationAlert: () => navigation.replace('StationAlert'),
    });

    return () => {
      cancelled = true;
    };
  }, [
    demoJourney,
    demoRunId,
    demoStep,
    isControlledDemo,
    navigation,
    setDemoStep,
    setDistanceToTargetMeters,
    setOriginStation,
    setRouteSummary,
    setWalkingTargetStation,
    tripFinished,
    updateDemoState,
  ]);
}
