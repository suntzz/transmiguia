import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
import { borders, colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

let hasBootstrapped = false;

export function HomeScreen({ navigation }: Props) {
  const { requestPermissions } = useAppPermissions();
  const location = useLiveLocation();
  const { destinationStation, hasSelectedDestination } = useRouteSelection();
  const {
    demoModeEnabled,
    demoAutoFlowEnabled,
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
    <ScreenContainer centered showDemoBanner={false}>
      <View style={styles.container}>
        {/* Header Accesible */}
        <View
          accessible={true}
          accessibilityRole="header"
          accessibilityLabel="TransMilenio Accesible. Guía de transporte para personas con discapacidad visual."
          style={styles.header}>
          <View style={styles.badgeRow}>
            <View style={styles.appBadge}>
              <Text style={styles.appBadgeText}>TRANSMILENIO ACCESIBLE</Text>
            </View>
          </View>
          <Text allowFontScaling={true} style={styles.title}>
            Guía de Transporte
          </Text>
          <Text allowFontScaling={true} style={styles.subtitle}>
            Navegación asistida por voz, sonido y vibración
          </Text>
        </View>

        {/* Estado del Sistema */}
        <View
          accessible={true}
          accessibilityRole="text"
          accessibilityLabel={
            isLocationActive
              ? 'Estado del sistema: GPS activo y listo para guiarte.'
              : 'Estado del sistema: Buscando señal de GPS.'
          }
          style={styles.statusCard}>
          <View style={styles.statusIndicatorRow}>
            <View
              style={[
                styles.statusDot,
                isLocationActive ? styles.statusDotActive : styles.statusDotWaiting,
              ]}
            />
            <Text allowFontScaling={true} style={styles.statusTitle}>
              {isLocationActive ? 'GPS Activo y Listo' : 'Esperando Señal GPS'}
            </Text>
          </View>
          {hasSelectedDestination ? (
            <View style={styles.destinationNotice}>
              <Text allowFontScaling={true} style={styles.destinationNoticeLabel}>
                Destino guardado:
              </Text>
              <Text allowFontScaling={true} style={styles.destinationNoticeName}>
                {destinationStation.name}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Acciones Principales en orden de prioridad para baja visión y ceguera */}
        <View style={styles.actions}>
          {/* Botón 1: Reconocimiento de Voz (Prioridad para ciegos) */}
          <AccessibleButton
            label="Navegación por Voz"
            subtitle="Di el nombre de tu estación"
            variant="accent"
            hint="Abre el micrófono para indicar tu destino hablando"
            accessibilityLabel="Navegación por voz. Toca para decir tu estación de destino con el micrófono."
            onPress={() => navigation.navigate('VoicePrototype')}
          />

          {/* Botón 2: Selector Manual de Estaciones */}
          <AccessibleButton
            label="Seleccionar Destino"
            subtitle="Buscar o explorar estaciones"
            variant="primary"
            hint="Abre la lista completa de estaciones organizadas por troncales"
            accessibilityLabel="Seleccionar destino manual. Abre la lista de estaciones de TransMilenio."
            onPress={() => navigation.navigate('StationSelector')}
          />

          {/* Botón 3: Modo Demostración / Simulación */}
          <AccessibleButton
            label={demoModeEnabled ? 'Detener Demostración' : 'Modo Demostración'}
            subtitle={demoModeEnabled ? 'Detener recorrido simulado' : 'Simular viaje paso a paso'}
            variant="secondary"
            hint="Inicia o detiene una simulación guiada completa del viaje"
            accessibilityLabel={
              demoModeEnabled
                ? 'Detener simulación de prueba'
                : 'Iniciar modo demostración paso a paso'
            }
            onPress={() => {
              if (__DEV__) {
                console.log('[UI] Botón demo presionado', {
                  demoModeEnabled,
                  demoAutoFlowEnabled,
                  hasSelectedDestination,
                  destinationStation: destinationStation.name,
                });
              }

              if (demoModeEnabled) {
                stopDemoPresentation();
                void triggerSelectionHaptic();
                return;
              }

              startDemoPresentation(
                hasSelectedDestination ? destinationStation.name : undefined
              );
              void triggerSuccessHaptic();
              navigation.navigate('VoicePrototype');
            }}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: spacing.lg,
  },
  header: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.xxs,
  },
  appBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  appBadgeText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusDotWaiting: {
    backgroundColor: colors.warning,
  },
  statusTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.text,
  },
  destinationNotice: {
    marginTop: spacing.xxs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  destinationNoticeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  destinationNoticeName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
});
