import React, { useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { triggerSuccessHaptic } from '@/src/services/hapticsService';
import {
  speakFinalDestinationArrival,
  stopSpeaking,
} from '@/src/services/speechService';
import { countStationsBetween } from '@/src/services/transmilenioService';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopSpeechOnBlur } from '@/src/hooks/useStopSpeechOnBlur';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Destination'>;

export function DestinationScreen({ navigation, route }: Props) {
  const { destinationStation, originStation, tripFinished, resetTrip } = useRouteSelection();
  const { demoAutoFlowEnabled, stopDemoPresentation } = useDemoMode();
  const suppressAutoSpeech = route.params?.suppressAutoSpeech === true;
  const stopCount = originStation
    ? countStationsBetween(originStation.name, destinationStation.name)
    : null;

  useScreenAnnouncement('Llegada final. El recorrido termino correctamente.');
  useStopSpeechOnBlur();

  useEffect(() => {
    let cancelled = false;

    const announceArrival = async () => {
      if (!suppressAutoSpeech && !tripFinished) {
        await triggerSuccessHaptic();
        await speakFinalDestinationArrival(destinationStation.name);
      }

      if (cancelled) {
        return;
      }

      if (demoAutoFlowEnabled) {
        stopDemoPresentation();
      }
    };

    void announceArrival();

    return () => {
      cancelled = true;
      void stopSpeaking();
    };
  }, [
    demoAutoFlowEnabled,
    destinationStation.id,
    destinationStation.name,
    stopDemoPresentation,
    suppressAutoSpeech,
    tripFinished,
  ]);

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🎉</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Llegaste
        </Text>
        <Text style={styles.subtitle}>{destinationStation.name}</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>
          Destino completado.
        </Text>
        <Text style={styles.summaryText}>
          Abordaste en {originStation?.name ?? 'la estacion cercana'}
        </Text>
        <Text style={styles.summaryText}>
          Paradas: {stopCount != null ? stopCount : 'No disponible'}
        </Text>
      </View>

      <AccessibleButton
        label="Volver al inicio"
        hint="Reiniciar el flujo desde la pantalla principal"
        onPress={() =>
          (resetTrip(),
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          ))
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.success,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
});
