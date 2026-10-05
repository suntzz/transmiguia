import React, { useEffect } from 'react';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
import { borders, colors, radius, shadows, spacing, typography } from '@/src/utils/theme';

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
      {/* Celebration Hero */}
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

        {/* Destination Card */}
        <View style={styles.destinationCard}>
          <View style={styles.badgeRow}>
            <View style={styles.destBadge}>
              <Text style={styles.destinationLabel}>ESTACIÓN FINAL</Text>
            </View>
          </View>
          <View style={styles.destContentRow}>
            <MaterialIcons name="place" size={24} color={colors.primary} />
            <Text allowFontScaling={true} style={styles.destinationName}>
              {destinationStation.name}
            </Text>
          </View>
        </View>
      </View>

      {/* Trip Summary Card */}
      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Resumen del viaje: Abordaste en ${originStation?.name ?? 'la estación de origen'}. Cantidad de paradas: ${stopCount ?? 'completado'}.`}
        style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <MaterialIcons name="receipt-long" size={20} color={colors.textSecondary} />
          <Text style={styles.summaryTitle}>Resumen del Viaje</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelGroup}>
            <MaterialIcons name="trip-origin" size={16} color={colors.textSecondary} />
            <Text style={styles.summaryLabel}>Origen:</Text>
          </View>
          <Text allowFontScaling={true} style={styles.summaryValue}>
            {originStation?.name ?? 'Estación de origen'}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryLabelGroup}>
            <MaterialIcons name="alt-route" size={16} color={colors.textSecondary} />
            <Text style={styles.summaryLabel}>Paradas recorridas:</Text>
          </View>
          <Text allowFontScaling={true} style={styles.summaryValue}>
            {stopCount != null ? `${stopCount} estaciones` : 'Recorrido finalizado'}
          </Text>
        </View>
      </View>

      {/* Primary Action Button */}
      <View style={styles.actionContainer}>
        <AccessibleButton
          label="Comenzar un nuevo viaje"
          subtitle="Regresar a la pantalla de inicio"
          variant="primary"
          size="large"
          icon="refresh"
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
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  checkCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  checkIcon: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.success,
    lineHeight: 40,
  },
  title: {
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  destinationCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    width: '100%',
    ...shadows.sm,
  },
  badgeRow: {
    marginBottom: 2,
  },
  destBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  destinationLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.8,
  },
  destContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  destinationName: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
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
    ...shadows.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xxs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  summaryLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  summaryLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  actionContainer: {
    marginTop: spacing.xs,
  },
});
