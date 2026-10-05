import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
import { borders, colors, radius, shadows, spacing, typography } from '@/src/utils/theme';

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
      {/* Hero Proximity Card */}
      <View
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel="Estación muy cerca. Sigue recto, la entrada principal está al frente."
        style={styles.heroCard}>
        <View style={styles.topRow}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="near-me" size={24} color={colors.primary} />
          </View>
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

      {/* TuLlave Turnstile Info Card */}
      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel="Indicación: Cuando llegues a la estación, ingresa por los torniquetes o paso accesible."
        style={styles.infoCard}>
        <View style={styles.infoIconWrapper}>
          <MaterialIcons name="credit-card" size={24} color={colors.textSecondary} />
        </View>
        <View style={styles.infoContent}>
          <Text allowFontScaling={true} style={styles.infoTitle}>
            Ingreso con tarjeta
          </Text>
          <Text allowFontScaling={true} style={styles.alertText}>
            Al ingresar a la estación, pasa tu tarjeta TuLlave por el torniquete o puerta accesible.
          </Text>
        </View>
      </View>

      {/* Confirm Action Button */}
      <View style={styles.actionContainer}>
        <AccessibleButton
          label="Confirmar llegada a estación"
          subtitle="Ingresar a la plataforma para esperar el bus"
          variant="primary"
          size="large"
          icon="check-circle"
          hint="Toca para ingresar y esperar el bus"
          accessibilityLabel="Confirmar llegada física a la estación. Ingresar a la plataforma para esperar el bus."
          onPress={() => navigation.replace('StationArrival')}
        />
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
    gap: spacing.sm,
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
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proximityBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  proximityBadgeText: {
    color: colors.accentText,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    ...shadows.sm,
  },
  infoIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  infoTitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  alertText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: spacing.sm,
  },
});
