import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import { useAppPermissions } from '@/src/hooks/useAppPermissions';
import { useLiveLocation } from '@/src/hooks/useLiveLocation';
import {
  triggerSelectionHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '@/src/services/hapticsService';
import { speakManagedText, speakRouteAlert } from '@/src/services/speechService';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopSpeechOnBlur } from '@/src/hooks/useStopSpeechOnBlur';
import { RootStackParamList } from '@/src/utils/navigation';
import { spacing } from '@/src/utils/theme';

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

  useScreenAnnouncement('Inicio. Pantalla principal de accesibilidad.');
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
          'Ubicacion lista. Selecciona un destino o inicia la demostracion.',
          {
            key: 'home-ready',
            minIntervalMs: 12000,
          }
        );
        return;
      }

      await triggerWarningHaptic();
      await speakRouteAlert(
        'No pude usar tu ubicacion real. Puedes activar el GPS o iniciar la demostracion.',
        'home-gps-fallback'
      );
    };

    void bootstrap();
  }, [location, requestPermissions]);

  return (
    <ScreenContainer centered showDemoBanner={false}>
      <View style={styles.actions}>
        <AccessibleButton
          label="Seleccionar destino"
          hint="Abre la lista de estaciones disponibles"
          accessibilityLabel="Seleccionar destino del recorrido"
          onPress={() => navigation.navigate('StationSelector')}
        />
        <AccessibleButton
          label={
            demoModeEnabled ? 'Detener demostracion' : 'Iniciar demostracion'
          }
          variant="secondary"
          hint="Inicia o detiene una simulacion completa del recorrido"
          accessibilityLabel={
            demoModeEnabled
              ? 'Detener demostracion automatica'
              : 'Iniciar demostracion automatica'
          }
          onPress={() => {
            if (__DEV__) {
              console.log('[UI] Boton demo presionado', {
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: spacing.md,
  },
});
