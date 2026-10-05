import React, { useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopSpeechOnBlur } from '@/src/hooks/useStopSpeechOnBlur';
import { triggerSuccessHaptic } from '@/src/services/hapticsService';
import {
  speakFinalDestinationArrival,
  stopSpeaking,
} from '@/src/services/speechService';
import { countStationsBetween } from '@/src/services/transmilenioService';
import { RootStackParamList } from '@/src/utils/navigation';
import { borders, colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Destination'>;

export function DestinationScreen({ navigation, route }: Props) {
  const { destinationStation, originStation, tripFinished, resetTrip } = useRouteSelection();
  const { demoAutoFlowEnabled, stopDemoPresentation } = useDemoMode();
  const suppressAutoSpeech = route.params?.suppressAutoSpeech === true;
  const stopCount = originStation
    ? countStationsBetween(originStation.name, destinationStation.name)
    : null;

  useScreenAnnouncement('Llegada a destino final. Tu recorrido concluyó con éxito.');
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
      <View
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel={`Llegaste a tu destino: ${destinationStation.name}. Recorrido finalizado exitosamente.`}
        style={styles.hero}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
        <Text allowFontScaling={true} style={styles.title}>
          ¡Llegaste a tu destino!
        </Text>
        <View style={styles.destinationCard}>
          <Text style={styles.destinationLabel}>ESTACIÓN FINAL</Text>
          <Text allowFontScaling={true} style={styles.destinationName}>
            {destinationStation.name}
          </Text>
        </View>
      </View>

      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Resumen del viaje: Abordaste en ${originStation?.name ?? 'la estación de origen'}. Cantidad de paradas: ${stopCount ?? 'completado'}.`}
        style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumen del Viaje</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Origen:</Text>
          <Text allowFontScaling={true} style={styles.summaryValue}>
            {originStation?.name ?? 'Estación de origen'}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Paradas recorridas:</Text>
          <Text allowFontScaling={true} style={styles.summaryValue}>
            {stopCount != null ? `${stopCount} estaciones` : 'Recorrido finalizado'}
          </Text>
        </View>
      </View>

      <AccessibleButton
        label="Comenzar un nuevo viaje"
        subtitle="Regresar a la pantalla de inicio"
        variant="primary"
        hint="Toca para reiniciar el flujo y planear otro recorrido"
        accessibilityLabel="Comenzar un nuevo viaje. Regresa al inicio."
        onPress={() => {
          resetTrip();
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            })
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: borders.heavy,
    borderColor: colors.border,
  },
  checkIcon: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.textInverse,
    lineHeight: 46,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  destinationCard: {
    backgroundColor: colors.successSoft,
    borderWidth: borders.bold,
    borderColor: colors.success,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  destinationLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.success,
    letterSpacing: 1,
  },
  destinationName: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    paddingBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
});
