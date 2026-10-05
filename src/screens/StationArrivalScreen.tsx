import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
import { borders, colors, radius, shadows, spacing, typography } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'StationArrival'>;

export function StationArrivalScreen({ navigation }: Props) {
  useScreenAnnouncement('Llegaste a la estación. Siguiente paso: abordar el bus.');
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
      await speakAndWait('Has llegado a la estación. Espera aquí para abordar.', {
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
      {/* Hero Waiting/Boarding Card */}
      <View style={styles.heroCard}>
        <View style={styles.topRow}>
          <View style={[styles.iconCircle, busReady ? styles.iconCircleReady : styles.iconCircleWaiting]}>
            <MaterialIcons
              name="directions-bus"
              size={26}
              color={busReady ? colors.success : colors.primary}
            />
          </View>
          <View style={[styles.statusBadge, busReady ? styles.statusBadgeReady : styles.statusBadgeWaiting]}>
            <Text style={[styles.statusBadgeText, busReady ? styles.statusBadgeTextReady : styles.statusBadgeTextWaiting]}>
              {busReady ? 'LISTO PARA ABORDAR' : 'ESPERANDO EN PLATAFORMA'}
            </Text>
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          Bus en camino
        </Text>
        <Text style={styles.subtitle}>
          {firstLeg
            ? `Bus ${firstLeg.routeCode} hacia el ${firstLeg.direction.toLowerCase()}`
            : 'Espera en plataforma el momento de abordar'}
        </Text>
      </View>

      {/* Leg Segment Details Card */}
      <View style={styles.infoCard}>
        <View style={styles.segmentHeader}>
          <MaterialIcons name="timeline" size={18} color={colors.primary} />
          <Text style={styles.infoLabel}>Siguiente tramo</Text>
        </View>
        <Text style={styles.infoValue}>
          {firstLeg ? `${firstLeg.from.name} a ${firstLeg.to.name}` : destinationStation.name}
        </Text>

        <View style={styles.divider} />

        <View style={styles.helperRow}>
          <MaterialIcons
            name={busReady ? 'check-circle' : 'info'}
            size={18}
            color={busReady ? colors.success : colors.textSecondary}
          />
          <Text style={styles.infoHelper}>
            {busReady
              ? 'Ya puedes subir al bus y continuar el seguimiento.'
              : 'Te avisaremos cuando el bus se detenga y abra puertas.'}
          </Text>
        </View>

        {detectedBusCode ? (
          <View style={[styles.detectedBadge, detectedBusCode === 'otro' ? styles.detectedMismatch : styles.detectedMatch]}>
            <MaterialIcons
              name={detectedBusCode === 'otro' ? 'warning' : 'verified'}
              size={18}
              color={detectedBusCode === 'otro' ? colors.warning : colors.success}
            />
            <Text style={styles.detectedText}>
              Bus detectado: {detectedBusCode === 'otro' ? 'No coincide con tu ruta' : detectedBusCode}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <AccessibleButton
          label={busReady ? 'Abordar ahora' : 'Esperando el bus'}
          icon={busReady ? 'login' : 'schedule'}
          variant={busReady ? 'primary' : 'secondary'}
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
            variant="ghost"
            icon="help-outline"
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
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: borders.standard,
    borderColor: colors.border,
    ...shadows.sm,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleWaiting: {
    backgroundColor: colors.primaryLight,
  },
  iconCircleReady: {
    backgroundColor: '#E8F5E9',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusBadgeWaiting: {
    backgroundColor: colors.accentLight,
    borderColor: colors.accent,
  },
  statusBadgeReady: {
    backgroundColor: '#E8F5E9',
    borderColor: colors.success,
  },
  statusBadgeText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadgeTextWaiting: {
    color: colors.accentText,
  },
  statusBadgeTextReady: {
    color: colors.success,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xxs,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  infoHelper: {
    flex: 1,
    fontSize: typography.bodySecondary.fontSize,
    lineHeight: typography.bodySecondary.lineHeight,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xxs,
  },
  detectedMatch: {
    backgroundColor: '#E8F5E9',
  },
  detectedMismatch: {
    backgroundColor: '#FFF8E1',
  },
  detectedText: {
    fontSize: typography.bodySecondary.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
