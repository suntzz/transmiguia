import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopDemoOnBack } from '@/src/hooks/useStopDemoOnBack';
import { useStopSpeechOnBlur } from '@/src/hooks/useStopSpeechOnBlur';
import { logDemoEvent } from '@/src/services/demoService';
import { triggerSuccessHaptic } from '@/src/services/hapticsService';
import {
  speakAndWait,
  stopSpeaking,
} from '@/src/services/speechService';
import { RootStackParamList } from '@/src/utils/navigation';
import { borders, colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'StationAlert'>;

export function StationAlertScreen({ navigation }: Props) {
  useScreenAnnouncement('Aviso de proximidad. Estás muy cerca de la estación.');
  useStopSpeechOnBlur();
  const { demoAutoFlowEnabled, demoRunId, demoState, setDemoStep } = useDemoMode();
  const { tripFinished } = useRouteSelection();
  useStopDemoOnBack(demoAutoFlowEnabled);

  useEffect(() => {
    if (!demoAutoFlowEnabled || tripFinished || demoState.currentStep !== 'station_alert') {
      return;
    }

    let cancelled = false;
    let nextPhaseTimeout: ReturnType<typeof setTimeout> | null = null;

    const runDemoStep = async () => {
      setDemoStep('station_alert');
      logDemoEvent('DEMO STATION', {
        currentStation: demoState.currentStationName,
        nextStation: demoState.nextStationName,
      });
      await triggerSuccessHaptic();
      await speakAndWait('Vas por buen camino. La estación está al frente, sigue recto.', {
        key: 'demo-station-alert',
        minIntervalMs: 0,
        interrupt: true,
        pauseMs: 900,
      });

      if (cancelled) {
        return;
      }

      nextPhaseTimeout = setTimeout(() => {
        if (cancelled) {
          return;
        }

        navigation.replace('StationArrival');
      }, 1400);
    };

    void runDemoStep();

    return () => {
      cancelled = true;
      if (nextPhaseTimeout) {
        clearTimeout(nextPhaseTimeout);
      }
      void stopSpeaking();
    };
  }, [
    demoAutoFlowEnabled,
    demoRunId,
    demoState.currentStationName,
    demoState.currentStep,
    demoState.nextStationName,
    navigation,
    setDemoStep,
    tripFinished,
  ]);

  return (
    <ScreenContainer>
      <View
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel="Estación muy cerca. Sigue recto, la entrada principal está al frente."
        style={styles.hero}>
        <View style={styles.badgeRow}>
          <View style={styles.proximityBadge}>
            <Text style={styles.proximityBadgeText}>PROXIMIDAD</Text>
          </View>
        </View>
        <Text allowFontScaling={true} style={styles.title}>
          Estación cerca
        </Text>
        <Text allowFontScaling={true} style={styles.subtitle}>
          Sigue recto por la rampa peatonal. La entrada está al frente.
        </Text>
      </View>

      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel="Indicación: Cuando llegues a la estación, ingresa por los torniquetes o paso accesible."
        style={styles.alertCard}>
        <Text allowFontScaling={true} style={styles.alertText}>
          Al ingresar a la estación, pasa tu tarjeta TuLlave por el torniquete o puerta accesible.
        </Text>
      </View>

      <AccessibleButton
        label="Confirmar llegada a estación"
        variant="accent"
        hint="Toca para ingresar y esperar el bus"
        accessibilityLabel="Confirmar llegada física a la estación"
        onPress={() => navigation.replace('StationArrival')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.sm,
    borderWidth: borders.standard,
    borderColor: colors.primaryPressed,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  proximityBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  proximityBadgeText: {
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    color: colors.textInverse,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 26,
    color: '#FFE4E6',
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  alertText: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
    fontWeight: '700',
  },
});
