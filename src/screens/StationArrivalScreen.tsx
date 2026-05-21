import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { logDemoEvent } from '@/src/services/demoService';
import {
  triggerInfoHaptic,
  triggerSelectionHaptic,
  triggerTransferHaptic,
} from '@/src/services/hapticsService';
import {
  speakAndWait,
  speakBoardingReady,
  speakBoardingReminder,
  speakBusSuitability,
  speakBusApproaching,
  stopSpeaking,
  waitForNarrationPause,
  waitForSpeechToSettle,
} from '@/src/services/speechService';
import { getFirstBusLeg, getRouteWithTransfers } from '@/src/services/transmilenioService';
import { useStopSpeechOnBlur } from '@/src/hooks/useStopSpeechOnBlur';
import { useStopDemoOnBack } from '@/src/hooks/useStopDemoOnBack';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'StationArrival'>;

export function StationArrivalScreen({ navigation }: Props) {
  useScreenAnnouncement('Llegaste a la estacion. Siguiente paso: abordar el bus.');
  useStopSpeechOnBlur();
  const {
    demoAutoFlowEnabled,
    demoJourney,
    demoRunId,
    demoState,
    setDemoStep,
    updateDemoState,
  } = useDemoMode();
  const { destinationStation, originStation, tripFinished } = useRouteSelection();
  useStopDemoOnBack(demoAutoFlowEnabled);
  const [busReady, setBusReady] = useState(false);
  const [detectedBusCode, setDetectedBusCode] = useState<string | null>(null);
  const hasSpokenBoardingReminderRef = useRef(false);
  const routePlan = useMemo(
    () =>
      originStation ? getRouteWithTransfers(originStation.name, destinationStation.name) : null,
    [destinationStation.name, originStation]
  );
  const firstLeg =
    (demoAutoFlowEnabled
      ? demoJourney?.busLegs[demoState.currentBusLegIndex] ?? null
      : null) ?? getFirstBusLeg(routePlan);

  useEffect(() => {
    if (tripFinished || (demoAutoFlowEnabled && demoState.currentStep === 'arrived')) {
      return;
    }

    let cancelled = false;
    let autoBoardTimeout: ReturnType<typeof setTimeout> | null = null;

    const runBoardingSequence = async () => {
      setBusReady(false);
      setDetectedBusCode(null);
      setDemoStep('station_arrival');
      updateDemoState({
        currentLegType: 'walk',
        currentStationName: originStation?.name ?? firstLeg?.from.name ?? destinationStation.name,
        nextStationName: firstLeg?.to.name ?? destinationStation.name,
        busCode: firstLeg?.routeCode ?? null,
      });
      logDemoEvent('DEMO BOARDING READY', {
        station: originStation?.name ?? firstLeg?.from.name ?? destinationStation.name,
        busCode: firstLeg?.routeCode ?? null,
        nextStation: firstLeg?.to.name ?? destinationStation.name,
      });

      await triggerTransferHaptic();
      await speakAndWait('Has llegado a la estacion. Espera aqui para abordar.', {
        key: `station-arrival-${destinationStation.id}`,
        minIntervalMs: 0,
        interrupt: true,
        pauseMs: 1400,
      });

      if (cancelled) {
        return;
      }

      await waitForNarrationPause(2200);

      if (cancelled) {
        return;
      }

      setDemoStep('boarding');
      await triggerSelectionHaptic();
      await speakBusApproaching(firstLeg);

      if (cancelled) {
        return;
      }

      const arrivingBusCode = firstLeg?.routeCode ?? null;
      const busMatchesExpected = !firstLeg || arrivingBusCode === firstLeg.routeCode;
      setDetectedBusCode(arrivingBusCode);
      await speakBusSuitability({
        expectedBusCode: firstLeg?.routeCode ?? null,
        detectedBusCode: arrivingBusCode,
        isCorrectBus: busMatchesExpected,
      });

      if (cancelled) {
        return;
      }

      await waitForNarrationPause(2600);

      if (cancelled) {
        return;
      }

      setBusReady(true);
      await triggerSelectionHaptic();
      await speakBoardingReady(firstLeg);

      if (!demoAutoFlowEnabled || cancelled) {
        return;
      }

      autoBoardTimeout = setTimeout(() => {
        if (cancelled) {
          return;
        }

        logDemoEvent('DEMO ON BUS', {
          busCode: firstLeg?.routeCode ?? null,
          from: firstLeg?.from.name ?? originStation?.name ?? null,
          to: firstLeg?.to.name ?? destinationStation.name,
        });
        navigation.replace('BusTracking');
      }, 1500);
    };

    void runBoardingSequence();

    return () => {
      cancelled = true;
      if (autoBoardTimeout) {
        clearTimeout(autoBoardTimeout);
      }
      void stopSpeaking();
    };
  }, [
    demoAutoFlowEnabled,
    demoJourney,
    demoRunId,
    demoState.currentStep,
    demoState.currentBusLegIndex,
    destinationStation.id,
    destinationStation.name,
    firstLeg,
    navigation,
    originStation?.name,
    setDemoStep,
    tripFinished,
    updateDemoState,
  ]);

  useEffect(() => {
    if (!busReady || demoAutoFlowEnabled) {
      hasSpokenBoardingReminderRef.current = false;
      return;
    }

    if (hasSpokenBoardingReminderRef.current) {
      return;
    }

    hasSpokenBoardingReminderRef.current = true;
    const reminderTimeout = setTimeout(() => {
      void triggerInfoHaptic();
      void speakBoardingReminder(firstLeg);
    }, 11000);

    return () => {
      clearTimeout(reminderTimeout);
    };
  }, [busReady, demoAutoFlowEnabled, firstLeg]);

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.check}>✓</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Bus en camino
        </Text>
        <Text style={styles.subtitle}>
          {firstLeg
            ? `Bus ${firstLeg.routeCode} hacia el ${firstLeg.direction.toLowerCase()}`
            : 'Espera el momento de abordar'}
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Siguiente tramo</Text>
        <Text style={styles.infoValue}>
          {firstLeg ? `${firstLeg.from.name} a ${firstLeg.to.name}` : destinationStation.name}
        </Text>
        <Text style={styles.infoHelper}>
          {busReady
            ? 'Ya puedes subir al bus y continuar el seguimiento.'
            : 'Te avisaremos cuando puedas abordar.'}
        </Text>
        {detectedBusCode ? (
          <Text style={styles.infoHelper}>
            Bus detectado: {detectedBusCode === 'otro' ? 'No coincide con tu ruta' : detectedBusCode}
          </Text>
        ) : null}
      </View>
      <AccessibleButton
        label={busReady ? 'Abordar ahora' : 'Esperando el bus'}
        hint={
          busReady
            ? 'Continuar al seguimiento de paradas'
            : 'Espera unos segundos mientras llega el bus'
        }
        disabled={!busReady}
        onPress={() => navigation.replace('BusTracking')}
      />
      {busReady && firstLeg ? (
        <AccessibleButton
          label="Este no es mi bus"
          variant="secondary"
          hint="Pedir ayuda para esperar el bus correcto"
          onPress={() => {
            setBusReady(false);
            setDetectedBusCode('otro');
            void triggerTransferHaptic();
            void speakBusSuitability({
              expectedBusCode: firstLeg.routeCode,
              detectedBusCode: 'otro',
              isCorrectBus: false,
            }).then(async () => {
              await waitForSpeechToSettle(1800);
              setDetectedBusCode(firstLeg.routeCode);
              setBusReady(true);
              await speakBusApproaching(firstLeg);
              await speakBusSuitability({
                expectedBusCode: firstLeg.routeCode,
                detectedBusCode: firstLeg.routeCode,
                isCorrectBus: true,
              });
              await speakBoardingReady(firstLeg);
            });
          }}
        />
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.dark,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
  },
  check: {
    fontSize: 44,
    color: colors.surface,
    fontWeight: '800',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.surface,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#E2E2E2',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.text,
  },
  infoHelper: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
