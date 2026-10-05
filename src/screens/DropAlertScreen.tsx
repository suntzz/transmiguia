import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopDemoOnBack } from '@/src/hooks/useStopDemoOnBack';
import { triggerWarningHaptic } from '@/src/services/hapticsService';
import {
  speakAndWait,
  stopSpeaking,
  waitForSpeechToSettle,
} from '@/src/services/speechService';
import { RootStackParamList } from '@/src/utils/navigation';
import { borders, colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DropAlert'>;

export function DropAlertScreen({ navigation }: Props) {
  const { destinationStation } = useRouteSelection();
  const { demoAutoFlowEnabled } = useDemoMode();
  useStopDemoOnBack(demoAutoFlowEnabled);

  useScreenAnnouncement('Alerta importante: Una parada restante. Prepárate para descender.');

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      const runDropAlert = async () => {
        await triggerWarningHaptic();
        await speakAndWait(
          `¡Prepárate! Estás cerca de tu parada. La próxima estación es ${destinationStation.name}. Acércate a la puerta con precaución.`,
          {
            key: `prepare-exit-${destinationStation.id}`,
            minIntervalMs: 0,
            interrupt: true,
            pauseMs: 900,
          }
        );

        if (!demoAutoFlowEnabled || cancelled) {
          return;
        }

        await waitForSpeechToSettle(2000);

        if (cancelled) {
          return;
        }

        navigation.replace('Destination');
      };

      void runDropAlert();

      return () => {
        cancelled = true;
        void stopSpeaking();
      };
    }, [demoAutoFlowEnabled, destinationStation.id, destinationStation.name, navigation])
  );

  return (
    <ScreenContainer>
      {/* Contador Gigante de Alto Contraste */}
      <View
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel={`Atención: Una parada restante para llegar a tu destino ${destinationStation.name}. Prepárate para descender.`}
        style={styles.counterCard}>
        <View style={styles.badgeRow}>
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>AVISO DE BAJADA</Text>
          </View>
        </View>
        <Text allowFontScaling={true} style={styles.counter}>
          1
        </Text>
        <Text allowFontScaling={true} style={styles.counterLabel}>
          PARADA RESTANTE
        </Text>
      </View>

      {/* Tarjeta de Advertencia */}
      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Próxima parada: ${destinationStation.name}. Acércate a la puerta con precaución.`}
        style={styles.warningCard}>
        <Text allowFontScaling={true} style={styles.warningTitle}>
          Prepárate para bajar
        </Text>
        <Text allowFontScaling={true} style={styles.warningText}>
          Próxima estación:{' '}
          <Text style={styles.stationHighlight}>{destinationStation.name}</Text>
        </Text>
        <Text allowFontScaling={true} style={styles.warningSubtext}>
          Acércate a la puerta con precaución y sujeta tus pertenencias.
        </Text>
      </View>

      {/* Acciones */}
      <AccessibleButton
        label="Confirmar llegada a estación"
        variant="accent"
        hint="Toca cuando el bus se haya detenido en tu estación"
        accessibilityLabel={`Confirmar que el bus llegó a ${destinationStation.name}`}
        onPress={() => navigation.replace('Destination')}
      />

      <AccessibleButton
        label="Volver al seguimiento"
        variant="secondary"
        hint="Regresa a la pantalla de monitoreo del bus"
        accessibilityLabel="Regresar al seguimiento de paradas"
        onPress={() => navigation.navigate('BusTracking')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  counterCard: {
    backgroundColor: colors.dark,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: borders.standard,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  badgeRow: {
    marginBottom: spacing.xs,
  },
  alertBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  alertBadgeText: {
    color: colors.accentText,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  counter: {
    fontSize: 96,
    lineHeight: 100,
    fontWeight: '900',
    color: colors.accent,
  },
  counterLabel: {
    fontSize: 18,
    letterSpacing: 2,
    color: colors.textInverse,
    fontWeight: '900',
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: borders.bold,
    borderColor: colors.warning,
    gap: spacing.sm,
  },
  warningTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    color: colors.warning,
  },
  warningText: {
    fontSize: 20,
    lineHeight: 28,
    color: colors.text,
    fontWeight: '700',
  },
  stationHighlight: {
    fontWeight: '900',
    color: colors.primary,
  },
  warningSubtext: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
