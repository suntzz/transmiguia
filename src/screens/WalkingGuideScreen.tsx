import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { MapView } from '@/src/components/MapView';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { triggerInfoHaptic } from '@/src/services/hapticsService';
import { speakManagedText } from '@/src/services/speechService';
import { RootStackParamList } from '@/src/utils/navigation';
import { borders, colors, radius, spacing } from '@/src/utils/theme';
import { useWalkingGuideController } from '@/src/presentation/features/walking-guide/useWalkingGuideController';

type Props = NativeStackScreenProps<RootStackParamList, 'WalkingGuide'>;

export function WalkingGuideScreen({ navigation }: Props) {
  useScreenAnnouncement('Guía peatonal activa. Avanza con precaución siguiendo las indicaciones.');

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

  const activeInstruction = currentStep?.instruction ?? 'Preparando indicaciones';

  const handleRepeatVoice = async () => {
    void triggerInfoHaptic();
    await speakManagedText(`${activeInstruction}. ${statusText}`, {
      key: 'walking-repeat',
      minIntervalMs: 0,
      interrupt: true,
    });
  };

  return (
    <ScreenContainer backgroundColor={colors.background}>
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

      {/* Tarjeta Primaria de Instrucción Peatonal */}
      <View
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel={`Instrucción peatonal principal: ${activeInstruction}`}
        style={styles.primaryCard}>
        <View style={styles.badgeRow}>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseBadgeText}>GUÍA PEATONAL</Text>
          </View>
        </View>
        <Text allowFontScaling={true} style={styles.primaryInstruction}>
          {activeInstruction}
        </Text>
      </View>

      {/* Tarjeta Secundaria de Estado y Distancia */}
      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Estado de la caminata: ${statusText}. ${supportText ?? ''}`}
        style={styles.secondaryCard}>
        <Text allowFontScaling={true} style={styles.secondaryText}>
          {statusText}
        </Text>
        {demoSupportText ? (
          <Text allowFontScaling={true} style={styles.supportText}>
            {demoSupportText}
          </Text>
        ) : null}
        {supportText ? (
          <Text allowFontScaling={true} style={styles.supportText}>
            {supportText}
          </Text>
        ) : null}
      </View>

      {/* Botón para Repetir Indicación por Voz (Vital para ciegos) */}
      <AccessibleButton
        label="Repetir indicación por voz"
        variant="accent"
        hint="Vuelve a escuchar la última instrucción de orientación"
        accessibilityLabel="Repetir indicación de caminata por voz"
        onPress={handleRepeatVoice}
      />

      <AccessibleButton
        label="Cambiar destino"
        variant="secondary"
        hint="Abrir la lista de estaciones"
        accessibilityLabel="Cambiar destino de la caminata"
        onPress={() => navigation.navigate('StationSelector')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  primaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  phaseBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  phaseBadgeText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  primaryInstruction: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '900',
    color: colors.text,
  },
  secondaryCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  secondaryText: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.text,
    fontWeight: '800',
  },
  supportText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    fontWeight: '700',
  },
});
