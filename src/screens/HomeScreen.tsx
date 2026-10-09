import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { useAppPermissions } from '@/src/hooks/useAppPermissions';
import { useLiveLocation } from '@/src/hooks/useLiveLocation';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopSpeechOnBlur } from '@/src/hooks/useStopSpeechOnBlur';
import {
  triggerSelectionHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '@/src/services/hapticsService';
import { speakManagedText, speakRouteAlert } from '@/src/services/speechService';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, shadows, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

let hasBootstrapped = false;

export function HomeScreen({ navigation }: Props) {
  const { requestPermissions } = useAppPermissions();
  const location = useLiveLocation();
  const { destinationStation, hasSelectedDestination } = useRouteSelection();
  const {
    demoModeEnabled,
    startDemoPresentation,
    stopDemoPresentation,
  } = useDemoMode();

  useScreenAnnouncement('Inicio. Pantalla principal de TransMilenio Accesible.');
  useStopSpeechOnBlur();

  useEffect(() => {
    if (hasBootstrapped) {
      return;
    }

    hasBootstrapped = true;

    const bootstrap = async () => {
      const result = await requestPermissions();

      if (result.location && result.gpsEnabled) {
        await location.startTracking();
        await speakManagedText(
          'Ubicación lista. Di tu destino por voz o selecciónalo de la lista.',
          {
            key: 'home-ready',
            minIntervalMs: 12000,
          }
        );
        return;
      }

      await triggerWarningHaptic();
      await speakRouteAlert(
        'No pude acceder a tu ubicación real. Puedes activar el GPS o iniciar una simulación.',
        'home-gps-fallback'
      );
    };

    void bootstrap();
  }, [location, requestPermissions]);

  const isLocationActive = Boolean(location.coordinates);

  return (
    <ScreenContainer showDemoBanner={false}>
      <View style={styles.container}>
        {/* Modern Brand Bar & GPS Indicator */}
        <View style={styles.topBar}>
          <View
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="TRANSMILENIO ACCESIBLE"
            style={styles.brandRow}>
            <View style={styles.brandIconWrap}>
              <MaterialIcons name="directions-bus" size={20} color={colors.textInverse} />
            </View>
            <Text allowFontScaling={true} style={styles.brandTitle}>
              TransMilenio Accesible
            </Text>
          </View>

          <View
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={
              isLocationActive
                ? 'Estado del sistema: GPS activo y listo.'
                : 'Estado del sistema: Buscando señal de GPS.'
            }
            style={[
              styles.gpsPill,
              isLocationActive ? styles.gpsPillActive : styles.gpsPillWaiting,
            ]}>
            <View
              style={[
                styles.gpsDot,
                isLocationActive ? styles.gpsDotActive : styles.gpsDotWaiting,
              ]}
            />
            <Text
              allowFontScaling={true}
              style={[
                styles.gpsText,
                isLocationActive ? styles.gpsTextActive : styles.gpsTextWaiting,
              ]}>
              {isLocationActive ? 'GPS Activo' : 'Buscando GPS'}
            </Text>
          </View>
        </View>

        {/* Hero Context / Saludo */}
        <View style={styles.heroSection}>
          <Text allowFontScaling={true} style={styles.greetingTitle}>
            ¿A dónde quieres ir?
          </Text>
          <Text allowFontScaling={true} style={styles.greetingSubtitle}>
            Orientación y navegación sensorial por voz, sonido y vibración
          </Text>
        </View>

        {/* Saved Destination Card */}
        {hasSelectedDestination ? (
          <View
            accessible={true}
            accessibilityRole="summary"
            accessibilityLabel={`Destino guardado: ${destinationStation.name}.`}
            style={styles.savedCard}>
            <View style={styles.savedIconWrap}>
              <MaterialIcons name="place" size={20} color={colors.primary} />
            </View>
            <View style={styles.savedInfo}>
              <Text allowFontScaling={true} style={styles.savedLabel}>
                Destino guardado
              </Text>
              <Text allowFontScaling={true} style={styles.savedStation}>
                {destinationStation.name}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Primary Action: Hero Voice Button */}
        <View style={styles.primaryActionSection}>
          <AccessibleButton
            label="Hablar para navegar"
            subtitle="Presiona y di el nombre de tu estación"
            variant="primary"
            size="large"
            icon={<MaterialIcons name="mic" size={24} color={colors.textInverse} />}
            hint="Abre el micrófono para indicar tu destino hablando"
            accessibilityLabel="Navegación por Voz. Toca para decir tu estación de destino con el micrófono."
            onPress={() => navigation.navigate('VoicePrototype')}
          />
        </View>

        {/* Secondary Actions with Refined Hierarchy */}
        <View style={styles.secondaryActions}>
          <Text allowFontScaling={true} style={styles.sectionHeading}>
            Otras opciones
          </Text>

          <AccessibleButton
            label="Seleccionar Destino"
            subtitle="Buscar o explorar estaciones en el catálogo"
            variant="secondary"
            icon={<MaterialIcons name="format-list-bulleted" size={20} color={colors.text} />}
            hint="Abre la lista completa de estaciones organizadas por troncales"
            accessibilityLabel="Seleccionar destino manual. Abre la lista de estaciones de TransMilenio."
            onPress={() => navigation.navigate('StationSelector')}
          />

          <AccessibleButton
            label={demoModeEnabled ? 'Detener Demostración' : 'Modo Demostración'}
            subtitle={demoModeEnabled ? 'Detener recorrido simulado' : 'Simular viaje paso a paso'}
            variant="secondary"
            icon={
              <MaterialIcons
                name={demoModeEnabled ? 'stop-circle' : 'play-circle-outline'}
                size={20}
                color={colors.textSecondary}
              />
            }
            hint="Inicia o detiene una simulación guiada completa del viaje"
            accessibilityLabel={
              demoModeEnabled
                ? 'Detener simulación de prueba'
                : 'Iniciar modo demostración paso a paso'
            }
            onPress={() => {
              if (demoModeEnabled) {
                stopDemoPresentation();
                void triggerSelectionHaptic();
                return;
              }

              startDemoPresentation();
              void triggerSuccessHaptic();
              navigation.navigate('VoicePrototype');
            }}
          />
        </View>

        {/* Subdued Status Card for TalkBack / GPS Information */}
        <View
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={
            isLocationActive
              ? 'Estado del sistema: GPS activo y listo para guiarte en Bogotá.'
              : 'Estado del sistema: Esperando señal de satélites GPS.'
          }
          style={styles.systemStatusCard}>
          <MaterialIcons
            name={isLocationActive ? 'my-location' : 'location-searching'}
            size={18}
            color={isLocationActive ? colors.success : colors.warning}
          />
          <Text allowFontScaling={true} style={styles.systemStatusText}>
            {isLocationActive
              ? 'GPS conectado y calibrado para Bogotá'
              : 'Esperando señal GPS para ubicación en tiempo real'}
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  brandIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  gpsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  gpsPillActive: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
  },
  gpsPillWaiting: {
    backgroundColor: colors.warningLight,
    borderColor: colors.warning,
  },
  gpsDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gpsDotActive: {
    backgroundColor: colors.success,
  },
  gpsDotWaiting: {
    backgroundColor: colors.warning,
  },
  gpsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gpsTextActive: {
    color: colors.success,
  },
  gpsTextWaiting: {
    color: colors.warning,
  },

  heroSection: {
    paddingVertical: spacing.xs,
    gap: 4,
  },
  greetingTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.text,
  },
  greetingSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    fontWeight: '400',
  },

  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  savedIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedInfo: {
    flex: 1,
  },
  savedLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savedStation: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },

  primaryActionSection: {
    marginTop: spacing.xs,
  },

  secondaryActions: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },

  systemStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  systemStatusText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
});
