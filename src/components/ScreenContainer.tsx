import React, { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import { useDemoMode } from '@/src/context/DemoModeContext';
import { navigateToDemoStart } from '@/src/navigation/AppNavigator';
import { triggerSelectionHaptic } from '@/src/services/hapticsService';
import { stopSpeaking } from '@/src/services/speechService';
import { colors, radius, shadows, spacing, touchTargets } from '@/src/utils/theme';

type ScreenContainerProps = PropsWithChildren<{
  backgroundColor?: string;
  centered?: boolean;
  showDemoBanner?: boolean;
}>;

export function ScreenContainer({
  children,
  backgroundColor = colors.background,
  centered = false,
  showDemoBanner = true,
}: ScreenContainerProps) {
  const {
    demoModeEnabled,
    demoAutoFlowEnabled,
    restartDemoPresentation,
    stopDemoPresentation,
  } = useDemoMode();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={[styles.inner, centered && styles.innerCentered]}>{children}</View>

        {demoModeEnabled && showDemoBanner ? (
          <View
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={
              demoAutoFlowEnabled
                ? 'Modo demostración automático activo. Puedes reiniciar o detener la simulación.'
                : 'Modo demostración de ubicación activo. Puedes reiniciar o detener la simulación.'
            }
            style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <View style={styles.demoIndicatorDot} />
              <Text allowFontScaling={true} style={styles.demoTitle}>
                {demoAutoFlowEnabled ? 'Simulación Automática' : 'Simulación Activa'}
              </Text>
            </View>

            <View style={styles.demoActions}>
              <Pressable
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Reiniciar simulación desde el inicio"
                accessibilityHint="Vuelve al primer paso de la prueba"
                hitSlop={touchTargets.hitSlop}
                onPress={() => {
                  void triggerSelectionHaptic();
                  void stopSpeaking();
                  restartDemoPresentation();
                  navigateToDemoStart();
                }}
                style={({ pressed }) => [
                  styles.demoButton,
                  styles.demoRestartButton,
                  pressed && styles.demoButtonPressed,
                ]}>
                <MaterialIcons name="replay" size={16} color={colors.primary} />
                <Text allowFontScaling={true} style={styles.demoRestartText}>
                  Reiniciar
                </Text>
              </Pressable>

              <Pressable
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Detener simulación actual"
                accessibilityHint="Desactiva el modo de prueba"
                hitSlop={touchTargets.hitSlop}
                onPress={() => {
                  void triggerSelectionHaptic();
                  void stopSpeaking();
                  stopDemoPresentation();
                }}
                style={({ pressed }) => [
                  styles.demoButton,
                  styles.demoStopButton,
                  pressed && styles.demoButtonPressed,
                ]}>
                <MaterialIcons name="stop" size={16} color={colors.textInverse} />
                <Text allowFontScaling={true} style={styles.demoStopText}>
                  Detener
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xxl,
  },
  inner: {
    gap: spacing.md,
  },
  innerCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  demoCard: {
    marginTop: spacing.lg,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    ...shadows.subtle,
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  demoIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  demoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  demoRestartButton: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  demoStopButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  demoButtonPressed: {
    opacity: 0.85,
  },
  demoRestartText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  demoStopText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
});
