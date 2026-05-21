import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopDemoOnBack } from '@/src/hooks/useStopDemoOnBack';
import {
  speakAndWait,
  stopSpeaking,
} from '@/src/services/speechService';
import { logDemoEvent } from '@/src/services/demoService';
import { useStopSpeechOnBlur } from '@/src/hooks/useStopSpeechOnBlur';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'StationAlert'>;

export function StationAlertScreen({ navigation }: Props) {
  useScreenAnnouncement('Avisos de proximidad. La estacion esta cerca.');
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
      await speakAndWait('Vas bien. La estacion esta cerca, sigue recto.', {
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
      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.title}>
          Estacion cerca
        </Text>
        <Text style={styles.subtitle}>Sigue recto. La entrada esta al frente.</Text>
      </View>

      <View style={styles.alertCard}>
        <Text style={styles.alertText}>Cuando llegues, entra por los torniquetes.</Text>
      </View>

      <AccessibleButton
        label="Confirmar llegada"
        hint="Ir a la pantalla de llegada a estacion"
        accessibilityLabel="Confirmar llegada a la estacion"
        onPress={() => navigation.replace('StationArrival')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.surface,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#FCE9EC',
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  alertText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '600',
  },
});
