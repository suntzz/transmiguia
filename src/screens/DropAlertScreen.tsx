import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
import { borders, colors, radius, shadows, spacing, typography } from '@/src/utils/theme';

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
      {/* High-Visibility Hero Alert Card */}
      <View
        accessible={true}
        accessibilityRole="alert"
        accessibilityLabel={`Atención: Una parada restante para llegar a tu destino ${destinationStation.name}. Prepárate para descender.`}
        style={styles.heroAlertCard}>
        <View style={styles.topRow}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="notifications-active" size={26} color={colors.warning} />
          </View>
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>AVISO DE BAJADA</Text>
          </View>
        </View>

        {/* Big Countdown Number */}
        <View style={styles.counterWrapper}>
          <Text allowFontScaling={true} style={styles.counter}>
            1
          </Text>
          <Text allowFontScaling={true} style={styles.counterLabel}>
            PARADA RESTANTE
          </Text>
        </View>
      </View>

      {/* Prepare for Exit Card */}
      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Próxima parada: ${destinationStation.name}. Acércate a la puerta con precaución.`}
        style={styles.instructionCard}>
        <View style={styles.instructionHeader}>
          <MaterialIcons name="exit-to-app" size={22} color={colors.primary} />
          <Text allowFontScaling={true} style={styles.warningTitle}>
            Prepárate para bajar
          </Text>
        </View>

        <Text allowFontScaling={true} style={styles.warningText}>
          Próxima estación:{' '}
          <Text style={styles.stationHighlight}>{destinationStation.name}</Text>
        </Text>

        <View style={styles.divider} />

        <View style={styles.precautionRow}>
          <MaterialIcons name="info-outline" size={18} color={colors.textSecondary} />
          <Text allowFontScaling={true} style={styles.warningSubtext}>
            Acércate a la puerta con precaución y sujeta tus pertenencias.
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <AccessibleButton
          label="Confirmar llegada a estación"
          subtitle={`El bus se ha detenido en ${destinationStation.name}`}
          variant="primary"
          size="large"
          icon="check-circle"
          hint="Toca cuando el bus se haya detenido en tu estación"
          accessibilityLabel={`Confirmar que el bus llegó a ${destinationStation.name}. Descender con precaución.`}
          onPress={() => navigation.replace('Destination')}
        />

        <AccessibleButton
          label="Volver al seguimiento"
          subtitle="Regresar a la lista de paradas en curso"
          variant="secondary"
          icon="arrow-back"
          hint="Regresa a la pantalla de monitoreo del bus"
          accessibilityLabel="Regresar al seguimiento de paradas"
          onPress={() => navigation.navigate('BusTracking')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroAlertCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: borders.standard,
    borderColor: colors.border,
    ...shadows.sm,
    alignItems: 'center',
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  alertBadgeText: {
    color: '#92400E',
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  counterWrapper: {
    alignItems: 'center',
    gap: spacing.xxs,
    paddingVertical: spacing.sm,
  },
  counter: {
    fontSize: 84,
    lineHeight: 88,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -2,
  },
  counterLabel: {
    fontSize: typography.body.fontSize,
    letterSpacing: 1.5,
    color: colors.text,
    fontWeight: '800',
  },
  instructionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  warningTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text,
  },
  warningText: {
    fontSize: typography.h3.fontSize,
    lineHeight: typography.h3.lineHeight,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  stationHighlight: {
    fontWeight: '800',
    color: colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xxs,
  },
  precautionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  warningSubtext: {
    flex: 1,
    fontSize: typography.bodySecondary.fontSize,
    lineHeight: typography.bodySecondary.lineHeight,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
