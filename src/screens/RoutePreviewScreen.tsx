import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

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
import { colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RoutePreview'>;

export function RoutePreviewScreen({ navigation }: Props) {
  useScreenAnnouncement('Resumen de ruta. Confirma la navegacion antes de comenzar.');
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
      <Text accessibilityRole="header" style={styles.title}>
        Preparando ruta
      </Text>
      <View style={styles.card}>
        <Text style={styles.label}>Destino</Text>
        <Text style={styles.station}>{destinationStation.name}</Text>
        <Text style={styles.helper}>
          {demoJourney
            ? `Salida simulada desde ${demoJourney.originStation.name}. La caminata ira solo hasta esa estacion.`
            : 'La caminata ira solo hasta la estacion mas cercana.'}
        </Text>
        <Text style={styles.status}>{statusMessage}</Text>
      </View>
      <AccessibleButton
        label="Cambiar destino"
        variant="secondary"
        hint="Abrir la lista de estaciones"
        onPress={() => {
          if (__DEV__) {
            console.log('[UI] Boton cambiar destino demo presionado');
          }
          void stopSpeaking();
          navigation.navigate('StationSelector');
        }}
      />
      <AccessibleButton
        label="Reiniciar demo"
        variant="secondary"
        hint="Reinicia la demostracion desde el inicio"
        onPress={() => {
          if (__DEV__) {
            console.log('[UI] Boton reiniciar demo presionado');
          }
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
        variant="secondary"
        hint="Detiene la demostracion y vuelve al inicio"
        onPress={() => {
          if (__DEV__) {
            console.log('[UI] Boton detener demo presionado');
          }
          if (advanceTimeoutRef.current) {
            clearTimeout(advanceTimeoutRef.current);
            advanceTimeoutRef.current = null;
          }
          void stopSpeaking();
          stopDemoPresentation();
          navigation.popToTop();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  station: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: colors.text,
  },
  helper: {
    fontSize: 15,
    lineHeight: 21,
    color: colors.textMuted,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.primary,
    fontWeight: '700',
  },
});
