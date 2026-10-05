import { LiveCoordinates } from '@/src/domain/gateways/ILocationGateway';
import { DemoJourney } from '@/src/services/demoService';
import { RouteSummary } from '@/src/services/mapService';
import {
  BusTransitLeg,
  TransmilenioStation,
} from '@/src/services/transmilenioService';

export type DemoStep =
  | 'idle'
  | 'voice'
  | 'preview'
  | 'walking'
  | 'station_alert'
  | 'station_arrival'
  | 'boarding'
  | 'in_bus'
  | 'transfer'
  | 'arrived';

export type DemoState = {
  currentStep: DemoStep;
  location: LiveCoordinates | null;
  currentStationName: string | null;
  nextStationName: string | null;
  currentLegType: 'walk' | 'bus' | null;
  busCode: string | null;
  currentBusLegIndex: number;
  hasArrived: boolean;
  hasSpokenArrival: boolean;
};

export type RunWalkingSimulationOptions = {
  demoJourney: DemoJourney;
  isCancelled: () => boolean;
  setWalkingTargetStation: (station: TransmilenioStation) => void;
  setOriginStation: (station: TransmilenioStation) => void;
  setDistanceToTargetMeters: (distance: number) => void;
  setRouteSummary: (route: RouteSummary | null) => void;
  updateDemoState: (patch: Partial<DemoState>) => void;
  setDemoStep: (step: DemoStep) => void;
  onNavigateToStationAlert: () => void;
};

export type RunBusRideSimulationOptions = {
  demoJourney: DemoJourney;
  activeDemoLeg: BusTransitLeg;
  currentBusLegIndex: number;
  hasArrived: boolean;
  hasSpokenArrival: boolean;
  isCancelled: () => boolean;
  setOriginStation: (station: TransmilenioStation) => void;
  finishTrip: () => void;
  updateDemoState: (patch: Partial<DemoState>) => void;
  setDemoStep: (step: DemoStep) => void;
  onNavigateToTransfer: () => void;
  onNavigateToDestination: () => void;
};

export interface ISimulationScenarioRunner {
  runWalkingSimulation(options: RunWalkingSimulationOptions): Promise<void>;
  runBusRideSimulation(options: RunBusRideSimulationOptions): Promise<void>;
}
