import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { DemoJourney, buildDemoJourney, logDemoEvent } from '@/src/services/demoService';
import { LiveCoordinates } from '@/src/services/locationService';
import { TransmilenioStation, getRandomStation } from '@/src/services/transmilenioService';

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

type DemoState = {
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

type DemoModeContextValue = {
  demoModeEnabled: boolean;
  demoAutoFlowEnabled: boolean;
  demoVoiceTranscript: string | null;
  demoRunId: number;
  demoJourney: DemoJourney | null;
  demoState: DemoState;
  setDemoModeEnabled: (value: boolean) => void;
  toggleDemoMode: () => void;
  startDemoPresentation: (transcript?: string) => void;
  activateDemoAutoFlow: () => void;
  restartDemoPresentation: () => void;
  stopDemoPresentation: () => void;
  prepareDemoJourney: (destinationStation: TransmilenioStation) => DemoJourney | null;
  setDemoStep: (step: DemoStep) => void;
  updateDemoState: (patch: Partial<DemoState>) => void;
};

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

const INITIAL_DEMO_STATE: DemoState = {
  currentStep: 'idle',
  location: null,
  currentStationName: null,
  nextStationName: null,
  currentLegType: null,
  busCode: null,
  currentBusLegIndex: 0,
  hasArrived: false,
  hasSpokenArrival: false,
};

export function DemoModeProvider({ children }: PropsWithChildren) {
  const [demoModeEnabled, setDemoModeEnabled] = useState(false);
  const [demoAutoFlowEnabled, setDemoAutoFlowEnabled] = useState(false);
  const [demoVoiceTranscript, setDemoVoiceTranscript] = useState<string | null>(null);
  const [demoRunId, setDemoRunId] = useState(0);
  const [demoJourney, setDemoJourney] = useState<DemoJourney | null>(null);
  const [demoState, setDemoState] = useState<DemoState>(INITIAL_DEMO_STATE);

  const resetDemoState = useCallback(() => {
    setDemoJourney(null);
    setDemoState(INITIAL_DEMO_STATE);
  }, []);

  const setDemoStep = useCallback((step: DemoStep) => {
    setDemoState((currentState) => ({
      ...currentState,
      currentStep: step,
    }));
    logDemoEvent(`Step: ${step.toUpperCase()}`);
  }, []);

  const updateDemoState = useCallback((patch: Partial<DemoState>) => {
    setDemoState((currentState) => {
      const nextState = {
        ...currentState,
        ...patch,
      };

      if (patch.location) {
        logDemoEvent(`Location update during ${nextState.currentStep.toUpperCase()}`, {
          latitude: patch.location.latitude,
          longitude: patch.location.longitude,
          speedMps: patch.location.speedMps,
          currentStation: nextState.currentStationName,
          nextStation: nextState.nextStationName,
          legType: nextState.currentLegType,
          busCode: nextState.busCode,
        });
      }

      return nextState;
    });
  }, []);

  const startDemoPresentation = useCallback((transcript?: string) => {
    const nextTranscript = transcript?.trim() || getRandomStation().name;
    setDemoModeEnabled(true);
    setDemoAutoFlowEnabled(false);
    setDemoVoiceTranscript(nextTranscript);
    setDemoRunId((current) => current + 1);
    setDemoJourney(null);
    setDemoState({
      ...INITIAL_DEMO_STATE,
      currentStep: 'voice',
    });
    logDemoEvent('Presentation started', {
      transcript: nextTranscript,
    });
  }, []);

  const activateDemoAutoFlow = useCallback(() => {
    setDemoAutoFlowEnabled(true);
    logDemoEvent('Auto flow activated');
  }, []);

  const restartDemoPresentation = useCallback(() => {
    const nextTranscript = demoVoiceTranscript?.trim() || demoJourney?.destinationStation.name || getRandomStation().name;

    setDemoModeEnabled(true);
    setDemoAutoFlowEnabled(true);
    setDemoVoiceTranscript(nextTranscript);
    setDemoRunId((current) => current + 1);
    setDemoJourney(null);
    setDemoState({
      ...INITIAL_DEMO_STATE,
      currentStep: 'voice',
    });
    logDemoEvent('Presentation restarted', {
      transcript: nextTranscript,
    });
  }, [demoJourney?.destinationStation.name, demoVoiceTranscript]);

  const stopDemoPresentation = useCallback(() => {
    setDemoAutoFlowEnabled(false);
    setDemoModeEnabled(false);
    setDemoVoiceTranscript(null);
    setDemoRunId(0);
    resetDemoState();
    logDemoEvent('Presentation stopped');
  }, [resetDemoState]);

  const prepareDemoJourney = useCallback((destinationStation: TransmilenioStation) => {
    const nextJourney = buildDemoJourney(destinationStation, demoVoiceTranscript ?? destinationStation.name);

    if (!nextJourney) {
      logDemoEvent('Journey build failed', {
        destination: destinationStation.name,
      });
      return null;
    }

    setDemoJourney(nextJourney);
    setDemoState((currentState) => ({
      ...currentState,
      location: {
        latitude: nextJourney.walkingStart.latitude,
        longitude: nextJourney.walkingStart.longitude,
        accuracy: 5,
        speedMps: 1.2,
        timestamp: Date.now(),
      },
      currentStationName: null,
      nextStationName: nextJourney.originStation.name,
      currentLegType: 'walk',
      busCode: nextJourney.busLegs[0]?.routeCode ?? null,
      currentBusLegIndex: 0,
      hasArrived: false,
      hasSpokenArrival: false,
    }));
    logDemoEvent('Journey prepared', {
      origin: nextJourney.originStation.name,
      destination: nextJourney.destinationStation.name,
      usesTransfer: nextJourney.routePlan.usesTransfer,
      firstBus: nextJourney.busLegs[0]?.routeCode ?? null,
    });

    return nextJourney;
  }, [demoVoiceTranscript]);

  const value = useMemo(
    () => ({
      demoModeEnabled,
      demoAutoFlowEnabled,
      demoVoiceTranscript,
      demoRunId,
      demoJourney,
      demoState,
      setDemoModeEnabled,
      toggleDemoMode: () => setDemoModeEnabled((current) => !current),
      startDemoPresentation,
      activateDemoAutoFlow,
      restartDemoPresentation,
      stopDemoPresentation,
      prepareDemoJourney,
      setDemoStep,
      updateDemoState,
    }),
    [
      demoAutoFlowEnabled,
      demoJourney,
      demoModeEnabled,
      demoRunId,
      demoState,
      demoVoiceTranscript,
      activateDemoAutoFlow,
      prepareDemoJourney,
      restartDemoPresentation,
      setDemoStep,
      startDemoPresentation,
      stopDemoPresentation,
      updateDemoState,
    ]
  );

  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);

  if (!context) {
    throw new Error('useDemoMode debe usarse dentro de DemoModeProvider.');
  }

  return context;
}
