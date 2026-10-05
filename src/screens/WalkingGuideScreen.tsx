import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { MapView } from '@/src/components/MapView';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { triggerInfoHaptic } from '@/src/services/hapticsService';
import { speakManagedText } from '@/src/services/speechService';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, shadows, spacing } from '@/src/utils/theme';
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

      {/* Primary Pedestrian Instruction Card */}
      <View
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel={`Instrucción peatonal principal: ${activeInstruction}`}
        style={styles.primaryCard}>
        <View style={styles.badgeRow}>
          <View style={styles.phaseBadge}>
            <MaterialIcons name="directions-walk" size={16} color={colors.primary} />
            <Text style={styles.phaseBadgeText}>GUÍA PEATONAL</Text>
          </View>
        </View>

        <View style={styles.instructionRow}>
          <View style={styles.directionIconCircle}>
            <MaterialIcons name="straight" size={24} color={colors.primary} />
          </View>
          <Text allowFontScaling={true} style={styles.primaryInstruction}>
            {activeInstruction}
          </Text>
        </View>
      </View>

      {/* Secondary Status & Distance Card */}
      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Estado de la caminata: ${statusText}. ${supportText ?? ''}`}
        style={styles.secondaryCard}>
        <View style={styles.statusRow}>
          <MaterialIcons name="navigation" size={20} color={colors.primary} />
          <View style={styles.statusInfo}>
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
        </View>
      </View>

      {/* Repeat Voice Feedback Button (Essential for visual impairment) */}
      <AccessibleButton
        label="Repetir indicación por voz"
        variant="accent"
        size="large"
        icon={<MaterialIcons name="volume-up" size={22} color={colors.accentText} />}
        hint="Vuelve a escuchar la última instrucción de orientación"
        accessibilityLabel="Repetir indicación de caminata por voz"
        onPress={handleRepeatVoice}
      />

      <AccessibleButton
        label="Cambiar destino"
        variant="secondary"
        icon={<MaterialIcons name="edit-location" size={20} color={colors.text} />}
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
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.subtle,
  },
  badgeRow: {
    flexDirection: 'row',
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  phaseBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  directionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySurface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryInstruction: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },

  secondaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...shadows.subtle,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  statusInfo: {
    flex: 1,
    gap: 2,
  },
  secondaryText: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    color: colors.text,
  },
  supportText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
