import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { triggerWarningHaptic } from '@/src/services/hapticsService';
import {
  speakAndWait,
  stopSpeaking,
  waitForSpeechToSettle,
} from '@/src/services/speechService';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopDemoOnBack } from '@/src/hooks/useStopDemoOnBack';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'DropAlert'>;

export function DropAlertScreen({ navigation }: Props) {
  const { destinationStation } = useRouteSelection();
  const { demoAutoFlowEnabled } = useDemoMode();
  useStopDemoOnBack(demoAutoFlowEnabled);

  useScreenAnnouncement('Una parada restante. Prepararse para bajar.');

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      const runDropAlert = async () => {
        await triggerWarningHaptic();
        await speakAndWait(
          `Preparate, estas cerca de tu parada. La proxima estacion es ${destinationStation.name}.`,
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
      <View style={styles.counterCard}>
        <Text style={styles.counter}>1</Text>
        <Text style={styles.counterLabel}>PARADA RESTANTE</Text>
      </View>

      <View style={styles.warningCard}>
        <Text accessibilityRole="header" style={styles.warningTitle}>
          Prepararse para bajar
        </Text>
        <Text style={styles.warningText}>
          Proxima parada: {destinationStation.name}. Acercate a la puerta.
        </Text>
      </View>

      <AccessibleButton
        label="Confirmar destino final"
        hint="Ir a la llegada final"
        accessibilityLabel="Confirmar llegada al destino final"
        onPress={() => navigation.replace('Destination')}
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
  },
  counter: {
    fontSize: 84,
    lineHeight: 88,
    fontWeight: '800',
    color: colors.primary,
  },
  counterLabel: {
    fontSize: 14,
    letterSpacing: 2,
    color: '#DADADA',
    fontWeight: '700',
  },
  warningCard: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  warningTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.warning,
  },
  warningText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.warning,
  },
});
