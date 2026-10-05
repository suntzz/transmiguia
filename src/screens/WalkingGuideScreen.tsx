import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { MapView } from '@/src/components/MapView';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, spacing } from '@/src/utils/theme';
import { useWalkingGuideController } from '@/src/presentation/features/walking-guide/useWalkingGuideController';

type Props = NativeStackScreenProps<RootStackParamList, 'WalkingGuide'>;

export function WalkingGuideScreen({ navigation }: Props) {
  const {
    location,
    walkingTargetStation,
    routeSummary,
    activeWalkingLegOverlays,
    navigationPhase,
    routeError,
    currentStep,
    statusText,
    demoSupportText,
    supportText,
  } = useWalkingGuideController({ navigation });

  return (
    <ScreenContainer backgroundColor={colors.cream}>
      <MapView
        currentLocation={
          location.coordinates
            ? {
                latitude: location.coordinates.latitude,
                longitude: location.coordinates.longitude,
              }
            : null
        }
        destination={walkingTargetStation?.coordinates ?? null}
        destinationLabel={walkingTargetStation?.name}
        routeCoordinates={navigationPhase === 'walking' ? routeSummary?.coordinates ?? [] : []}
        routeLegs={activeWalkingLegOverlays}
        routeErrorMessage={routeError}
      />

      <View style={styles.primaryCard}>
        <Text accessibilityRole="header" style={styles.primaryInstruction}>
          {currentStep?.instruction ?? 'Preparando indicaciones'}
        </Text>
      </View>

      <View style={styles.secondaryCard}>
        <Text style={styles.secondaryText}>{statusText}</Text>
        {demoSupportText ? <Text style={styles.supportText}>{demoSupportText}</Text> : null}
        {supportText ? <Text style={styles.supportText}>{supportText}</Text> : null}
      </View>

      <AccessibleButton
        label="Cambiar destino"
        variant="secondary"
        hint="Abrir la lista de estaciones"
        accessibilityLabel="Cambiar destino"
        onPress={() => navigation.navigate('StationSelector')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  primaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  primaryInstruction: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  secondaryCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  secondaryText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  supportText: {
    marginTop: spacing.xs,
    fontSize: 15,
    lineHeight: 20,
    color: colors.textSoft,
    textAlign: 'center',
    fontWeight: '600',
  },
});
