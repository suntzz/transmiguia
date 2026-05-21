import React, { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDemoMode } from '@/src/context/DemoModeContext';
import { navigateToDemoStart } from '@/src/navigation/AppNavigator';
import { stopSpeaking } from '@/src/services/speechService';
import { colors, spacing } from '@/src/utils/theme';

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
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.inner, centered && styles.innerCentered]}>{children}</View>
        {demoModeEnabled && showDemoBanner ? (
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>
              {demoAutoFlowEnabled
                ? 'Modo demo automatico activo'
                : 'Modo demo de ubicacion activo'}
            </Text>
            <View style={styles.demoBannerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reiniciar modo demostracion"
                onPress={() => {
                  void stopSpeaking();
                  restartDemoPresentation();
                  navigateToDemoStart();
                }}
                style={[styles.demoBannerButton, styles.demoRestartButton]}>
                <Text style={styles.demoRestartButtonText}>Reiniciar demo</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Detener modo demostracion"
                onPress={() => {
                  void stopSpeaking();
                  stopDemoPresentation();
                }}
                style={styles.demoBannerButton}>
                <Text style={styles.demoBannerButtonText}>Detener demo</Text>
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
  },
  inner: {
    gap: spacing.md,
  },
  innerCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  demoBanner: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: '#FFF1F3',
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.sm,
  },
  demoBannerText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  demoBannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  demoBannerButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  demoRestartButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  demoBannerButtonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 13,
  },
  demoRestartButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
});
