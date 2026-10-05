import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { logDemoEvent } from '@/src/services/demoService';
import {
  speakAndWait,
  stopSpeaking,
} from '@/src/services/speechService';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopDemoOnBack } from '@/src/hooks/useStopDemoOnBack';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, shadows, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutePreview'>;

export function RoutePreviewScreen({ navigation }: Props) {
  useScreenAnnouncement('Resumen de ruta. Confirma la navegación antes de comenzar.');
  useStopDemoOnBack();
  const { destinationStation, setOriginStation } = useRouteSelection();
  const {
    demoJourney,
    demoModeEnabled,
    demoRunId,
    prepareDemoJourney,
    restartDemoPresentation,
    setDemoStep,
    stopDemoPresentation,
  } = useDemoMode();
  const [statusMessage, setStatusMessage] = useState('Generando ruta simulada...');
  const hasAdvancedRef = useRef(false);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advanceToWalking = useCallback(() => {
    if (hasAdvancedRef.current) {
      return;
    }

    hasAdvancedRef.current = true;
    setDemoStep('walking');
    logDemoEvent('Step: WALKING');
    navigation.replace('WalkingGuide');
  }, [navigation, setDemoStep]);

  useEffect(() => {
    let cancelled = false;

    const runPreview = async () => {
      hasAdvancedRef.current = false;
      setDemoStep('preview');
      logDemoEvent('DEMO START', {
        destination: destinationStation.name,
        hasPreparedJourney: Boolean(demoJourney),
      });
      setStatusMessage('Simulando recorrido...');

      const preparedJourney =
        demoJourney ?? prepareDemoJourney(destinationStation);

      if (!preparedJourney) {
        logDemoEvent('Preview fallback failed', {
          destination: destinationStation.name,
        });
        setStatusMessage(
          'No pude preparar la ruta simulada. Puedes cambiar el destino o reiniciar la demo.'
        );
        return;
      }

      setOriginStation(preparedJourney.originStation);

      advanceTimeoutRef.current = setTimeout(() => {
        if (cancelled) {
          return;
        }

        advanceToWalking();
      }, 1500);

      void speakAndWait(
        `Destino confirmado: ${destinationStation.name}. Iniciare la caminata hacia ${preparedJourney.originStation.name}.`,
        {
          key: `route-preview-${destinationStation.id}`,
          minIntervalMs: 0,
          interrupt: true,
          pauseMs: 600,
        }
      );

      if (cancelled) {
        return;
      }
    };

    void runPreview();

    return () => {
      cancelled = true;
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
        advanceTimeoutRef.current = null;
      }
      void stopSpeaking();
    };
  }, [
    advanceToWalking,
    demoJourney,
    demoModeEnabled,
    demoRunId,
    destinationStation,
    navigation,
    prepareDemoJourney,
    setDemoStep,
    setOriginStation,
  ]);

  return (
    <ScreenContainer showDemoBanner={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Preparando ruta
          </Text>
          <Text style={styles.subtitle}>
            Verificando estaciones y trayecto de navegación
          </Text>
        </View>

        {/* Route Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.routePill}>
              <MaterialIcons name="alt-route" size={16} color={colors.primary} />
              <Text style={styles.label}>Destino</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{statusMessage}</Text>
            </View>
          </View>

          {/* Destination Focus Hero */}
          <View style={styles.stationBlock}>
            <Text style={styles.station}>{destinationStation.name}</Text>
            <Text style={styles.helper}>
              {demoJourney
                ? `Salida simulada desde ${demoJourney.originStation.name}. La caminata irá hasta esa estación.`
                : 'La caminata irá hacia la estación más cercana.'}
            </Text>
          </View>

          {/* Timeline Nodes */}
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.dotOrigin} />
              <Text style={styles.timelineText}>
                {demoJourney ? demoJourney.originStation.name : 'Estación de origen'}
              </Text>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineItem}>
              <View style={styles.dotDestination} />
              <Text style={[styles.timelineText, styles.timelineDestinationText]}>
                {destinationStation.name}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionGroup}>
          <AccessibleButton
            label="Iniciar Guía Peatonal"
            subtitle="Comenzar orientación paso a paso hacia la estación"
            variant="primary"
            size="large"
            icon="directions-walk"
            hint="Inicia la navegación peatonal asistida de inmediato"
            accessibilityLabel="Iniciar Guía Peatonal. Comenzar orientación paso a paso."
            onPress={() => {
              if (advanceTimeoutRef.current) {
                clearTimeout(advanceTimeoutRef.current);
                advanceTimeoutRef.current = null;
              }
              void stopSpeaking();
              advanceToWalking();
            }}
          />

          <AccessibleButton
            label="Cambiar destino"
            subtitle="Elegir otra estación del catálogo"
            variant="secondary"
            icon="edit-location"
            hint="Abrir la lista de estaciones disponibles"
            accessibilityLabel="Cambiar destino. Elegir otra estación del catálogo."
            onPress={() => {
              void stopSpeaking();
              navigation.navigate('StationSelector');
            }}
          />

          <AccessibleButton
            label="Reiniciar demo"
            subtitle="Volver al inicio de la simulación"
            variant="secondary"
            icon="replay"
            hint="Reinicia la demostración desde el inicio"
            accessibilityLabel="Reiniciar demostración"
            onPress={() => {
              if (advanceTimeoutRef.current) {
                clearTimeout(advanceTimeoutRef.current);
                advanceTimeoutRef.current = null;
              }
              void stopSpeaking();
              restartDemoPresentation();
              navigation.replace('VoicePrototype');
            }}
          />

          <AccessibleButton
            label="Detener demo"
            variant="ghost"
            icon="close"
            hint="Detiene la demostración y vuelve a la pantalla principal"
            accessibilityLabel="Detener demostración"
            onPress={() => {
              if (advanceTimeoutRef.current) {
                clearTimeout(advanceTimeoutRef.current);
                advanceTimeoutRef.current = null;
              }
              void stopSpeaking();
              stopDemoPresentation();
              navigation.popToTop();
            }}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  header: {
    gap: 4,
    paddingVertical: spacing.xs,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  routePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stationBlock: {
    gap: 4,
  },
  station: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.text,
  },
  helper: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  timeline: {
    paddingTop: spacing.xs,
    gap: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dotOrigin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  dotDestination: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.dark,
  },
  timelineLine: {
    width: 2,
    height: 18,
    backgroundColor: colors.borderSubtle,
    marginLeft: 5,
  },
  timelineText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  timelineDestinationText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  actionGroup: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
