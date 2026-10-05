import React, { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDemoMode } from '@/src/context/DemoModeContext';
import { navigateToDemoStart } from '@/src/navigation/AppNavigator';
import { triggerSelectionHaptic } from '@/src/services/hapticsService';
import { stopSpeaking } from '@/src/services/speechService';
import { borders, colors, radius, spacing, touchTargets } from '@/src/utils/theme';

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
        showsVerticalScrollIndicator={true}>
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
            style={styles.demoBanner}>
            <View style={styles.demoBadgeRow}>
              <View style={styles.demoIndicatorDot} />
              <Text allowFontScaling={true} style={styles.demoBannerText}>
                {demoAutoFlowEnabled
                  ? 'SIMULACIÓN AUTOMÁTICA ACTIVA'
                  : 'SIMULACIÓN DE UBICACIÓN ACTIVA'}
              </Text>
            </View>
            <View style={styles.demoBannerActions}>
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
                <Text allowFontScaling={true} style={styles.demoRestartButtonText}>
                  Reiniciar demo
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
                <Text allowFontScaling={true} style={styles.demoStopButtonText}>
                  Detener demo
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  inner: {
    gap: spacing.md,
  },
  innerCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  demoBanner: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySurface,
    borderWidth: borders.standard,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  demoBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  demoIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  demoBannerText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  demoBannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  demoButton: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: borders.standard,
  },
  demoRestartButton: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  demoStopButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryPressed,
  },
  demoButtonPressed: {
    opacity: 0.8,
  },
  demoRestartButtonText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  demoStopButtonText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: 14,
  },
});
