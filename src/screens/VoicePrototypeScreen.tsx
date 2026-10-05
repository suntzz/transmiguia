import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import {
  triggerMediumImpactHaptic,
  triggerSelectionHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '@/src/services/hapticsService';
import {
  speakAndWait,
  speakDestinationConfirmationPrompt,
  speakDestinationConfirmed,
  speakDestinationOptions,
  speakManagedText,
  speakVoiceError,
  stopSpeaking,
  waitForNarrationPause,
  waitForSpeechToSettle,
} from '@/src/services/speechService';
import {
  TransmilenioStation,
  getAllStationSpeechTerms,
  refreshStationStatuses,
  resolveStationAvailability,
  resolveStationFromSpeech,
} from '@/src/services/transmilenioService';
import {
  ensureVoicePermission,
  configureVoiceRecognition,
  destroyVoiceRecognition,
  isSpeechRecognitionAvailable,
  normalizeVoiceErrorMessage,
  startVoiceRecognition,
  stopVoiceRecognition,
} from '@/src/services/voiceService';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopDemoOnBack } from '@/src/hooks/useStopDemoOnBack';
import { RootStackParamList } from '@/src/utils/navigation';
import { borders, colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'VoicePrototype'>;

function getStationResolutionMessage(
  transcript: string,
  result: ReturnType<typeof resolveStationFromSpeech>
) {
  if (result.reason === 'ambiguous') {
    const suggestions = result.candidates
      ?.slice(0, 2)
      .map((station) => station.name)
      .join(' o ');

    return suggestions
      ? `No quedo claro si dijiste ${suggestions}. Di el nombre completo o escribelo manualmente.`
      : 'No quedo clara la estacion. Di el nombre completo o escribelo manualmente.';
  }

  if (transcript.trim()) {
    return 'No se reconocio una estacion valida. Intenta decir el nombre exacto o escribelo manualmente.';
  }

  return 'No se detecto una estacion valida. Intenta de nuevo o escribe el destino manualmente.';
}

export function VoicePrototypeScreen({ navigation }: Props) {
  const {
    destinationStation,
    hasSelectedDestination,
    setOriginStation,
    setDestinationStation,
  } = useRouteSelection();
  const {
    demoModeEnabled,
    demoAutoFlowEnabled,
    demoRunId,
    demoVoiceTranscript,
    activateDemoAutoFlow,
    prepareDemoJourney,
    setDemoStep,
  } = useDemoMode();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const [isResolvingDestination, setIsResolvingDestination] = useState(false);
  const [pendingStation, setPendingStation] = useState<TransmilenioStation | null>(null);
  const [suggestedStations, setSuggestedStations] = useState<TransmilenioStation[]>([]);

  useScreenAnnouncement(
    'Destino por voz. Puedes decir una estacion de TransMilenio.'
  );
  useStopDemoOnBack();

  // Ref so the voice setup effect doesn't re-run when the callback changes
  const applyTranscriptRef = useRef<((text: string) => Promise<boolean>) | null>(null);
  const isHandlingDestinationRef = useRef(false);
  const hasNavigatedRef = useRef(false);
  const demoPromptStartedRef = useRef(false);
  const stationVoiceContext = useRef(getAllStationSpeechTerms());
  const latestTranscriptRef = useRef('');
  const latestPartialTranscriptRef = useRef('');
  const lastVoiceErrorRef = useRef<string | null>(null);

  useEffect(() => {
    void refreshStationStatuses();
  }, []);

  useEffect(() => {
    latestTranscriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    latestPartialTranscriptRef.current = partialTranscript;
  }, [partialTranscript]);

  useEffect(() => {
    lastVoiceErrorRef.current = voiceError;
  }, [voiceError]);

  const continueDemoFlow = useCallback(async () => {
    if (!demoModeEnabled || hasNavigatedRef.current) {
      return;
    }

    if (!demoAutoFlowEnabled) {
      activateDemoAutoFlow();
    }

    hasNavigatedRef.current = true;
    setDemoStep('preview');
    await waitForSpeechToSettle(2000);
    navigation.replace('RoutePreview');
  }, [activateDemoAutoFlow, demoAutoFlowEnabled, demoModeEnabled, navigation, setDemoStep]);

  const clearVoiceResolutionState = useCallback(() => {
    setPendingStation(null);
    setSuggestedStations([]);
    setSelectionMessage(null);
  }, []);

  const confirmDestinationSelection = useCallback(async (
    station: TransmilenioStation,
    options?: { fromRedirectMessage?: string | null; autoContinue?: boolean }
  ) => {
    setDestinationStation(station);
    setPendingStation(null);
    setSuggestedStations([]);
    setVoiceError(null);
    setSelectionMessage(options?.fromRedirectMessage ?? null);
    setIsResolvingDestination(false);

    if (demoModeEnabled) {
      const journey = prepareDemoJourney(station);

      if (!journey) {
        setVoiceError('No pude preparar la demostracion con ese destino.');
        isHandlingDestinationRef.current = false;
        await triggerWarningHaptic();
        await speakVoiceError();
        return;
      }

      setOriginStation(journey.originStation);
    }

    if (options?.fromRedirectMessage) {
      await triggerWarningHaptic();
    } else {
      await triggerSuccessHaptic();
    }

    await speakDestinationConfirmed(station.name);

    isHandlingDestinationRef.current = false;

    if (options?.autoContinue && demoAutoFlowEnabled) {
      await continueDemoFlow();
    }
  }, [
    continueDemoFlow,
    demoModeEnabled,
    demoAutoFlowEnabled,
    prepareDemoJourney,
    setDestinationStation,
    setOriginStation,
  ]);

  const prepareDestinationConfirmation = useCallback(async (
    station: TransmilenioStation,
    options?: { redirectMessage?: string | null; autoContinue?: boolean }
  ) => {
    setPendingStation(station);
    setSuggestedStations([]);
    setSelectionMessage(options?.redirectMessage ?? null);
    setVoiceError(null);
    await triggerSelectionHaptic();
    await speakDestinationConfirmationPrompt(station.name);

    if (options?.autoContinue) {
      await waitForNarrationPause(800);
      await confirmDestinationSelection(station, {
        fromRedirectMessage: options?.redirectMessage ?? null,
        autoContinue: true,
      });
    }
  }, [confirmDestinationSelection]);

  const applyTranscriptToDestination = useCallback(async (nextText: string) => {
    setManualInput(nextText);
    clearVoiceResolutionState();

    if (isHandlingDestinationRef.current) {
      return false;
    }

    isHandlingDestinationRef.current = true;
    setIsResolvingDestination(true);

    const match = resolveStationFromSpeech(nextText);

    if (!match.station) {
      const message =
        match.reason === 'empty'
          ? 'No te escuche bien, intenta otra vez.'
          : getStationResolutionMessage(nextText, match);
      setVoiceError(message);
      setSuggestedStations(match.candidates?.slice(0, 3) ?? []);
      setIsResolvingDestination(false);
      isHandlingDestinationRef.current = false;
      if ((match.candidates?.length ?? 0) > 0) {
        await speakDestinationOptions(
          (match.candidates ?? []).slice(0, 3).map((station) => station.name)
        );
      } else {
        await speakVoiceError();
      }
      await triggerWarningHaptic();
      return false;
    }

    await stopVoiceRecognition();
    setIsListening(false);
    const availability = resolveStationAvailability(match.station);

    if (!availability) {
      const message = 'No fue posible validar la disponibilidad de esa estacion.';
      setVoiceError(message);
      setIsResolvingDestination(false);
      isHandlingDestinationRef.current = false;
      await speakAndWait(message, {
        key: `voice-availability-error-${nextText.trim().toLowerCase()}`,
        minIntervalMs: 0,
        interrupt: true,
        pauseMs: 800,
      });
      await triggerWarningHaptic();
      return false;
    }

    setTranscript(match.transcript);
    setManualInput(availability.resolvedStation.name);
    const shouldAutoConfirmInDemo =
      demoModeEnabled &&
      !availability.wasRedirected &&
      (match.reason === 'exact' || match.reason === 'fuzzy');

    if (shouldAutoConfirmInDemo) {
      await confirmDestinationSelection(availability.resolvedStation, {
        autoContinue: true,
      });
      return true;
    }

    await prepareDestinationConfirmation(availability.resolvedStation, {
      redirectMessage: availability.wasRedirected ? availability.message : null,
      autoContinue: demoAutoFlowEnabled,
    });
    return true;
  }, [
    clearVoiceResolutionState,
    confirmDestinationSelection,
    demoModeEnabled,
    demoAutoFlowEnabled,
    prepareDestinationConfirmation,
  ]);

  // Keep ref up-to-date without re-triggering the voice setup effect
  useEffect(() => {
    applyTranscriptRef.current = applyTranscriptToDestination;
  }, [applyTranscriptToDestination]);

  // Configure Voice ONCE on mount; use ref for callbacks to avoid session destruction
  useEffect(() => {
    const setupVoice = async () => {
      await configureVoiceRecognition({
        onStart: () => {
          setIsListening(true);
          setVoiceError(null);
          clearVoiceResolutionState();
          setTranscript('');
          setPartialTranscript('');
          setManualInput('');
          setIsResolvingDestination(false);
          isHandlingDestinationRef.current = false;
        },
        onEnd: () => {
          setIsListening(false);
          if (
            !latestPartialTranscriptRef.current.trim() &&
            !latestTranscriptRef.current.trim() &&
            !lastVoiceErrorRef.current
          ) {
            const message = 'No te escuche bien, intenta otra vez.';
            setVoiceError(message);
            void triggerWarningHaptic();
            void speakVoiceError();
          }
        },
        onPartialResults: (text) => {
          setPartialTranscript(text);
        },
        onResults: (text) => {
          setTranscript(text);
          setPartialTranscript('');
          setManualInput(text);
          void applyTranscriptRef.current?.(text);
        },
        onError: (error, message) => {
          setIsListening(false);
          const normalized = normalizeVoiceErrorMessage(error, message);
          setVoiceError(normalized);

          void speakManagedText(normalized, {
            key: `voice-runtime-error-${normalized}`,
            minIntervalMs: 6000,
            interrupt: true,
          });
          void triggerWarningHaptic();
        },
      });

      const available = await isSpeechRecognitionAvailable();

      setVoiceAvailable(available);
    };

    void setupVoice();

    return () => {
      setIsListening(false);
      void destroyVoiceRecognition();
      void stopSpeaking();
    };
  }, [clearVoiceResolutionState]);

  const handleStartListening = useCallback(async () => {
    setVoiceError(null);
    clearVoiceResolutionState();
    setTranscript('');
    setPartialTranscript('');
    setIsResolvingDestination(false);
    hasNavigatedRef.current = false;
    isHandlingDestinationRef.current = false;
    const microphoneGranted = await ensureVoicePermission();

    if (!microphoneGranted) {
      const message =
        'El permiso de micrófono no fue concedido. Puedes activarlo o escribir el destino manualmente.';
      setVoiceError(message);

      await speakManagedText(message, {
        key: 'voice-microphone-permission',
        minIntervalMs: 4000,
        interrupt: true,
      });
      await triggerWarningHaptic();
      return;
    }

    try {
      await startVoiceRecognition('es-CO', stationVoiceContext.current);
      setVoiceAvailable(true);
    } catch (error) {
      setIsListening(false);
      const nextError = normalizeVoiceErrorMessage('start-error', String(error));
      setVoiceError(nextError);

      await speakManagedText(nextError, {
        key: `voice-start-error-${nextError}`,
        minIntervalMs: 4000,
        interrupt: true,
      });
      await triggerWarningHaptic();
    }
  }, [clearVoiceResolutionState]);

  const handleManualApply = async () => {
    setTranscript(manualInput);
    setPartialTranscript('');
    await applyTranscriptToDestination(manualInput);
  };

  useEffect(() => {
    if (!demoAutoFlowEnabled) {
      demoPromptStartedRef.current = false;
      hasNavigatedRef.current = false;
      return;
    }

    if (demoPromptStartedRef.current || !demoVoiceTranscript) {
      return;
    }

    demoPromptStartedRef.current = true;
    setDemoStep('voice');
    let cancelled = false;

    const runDemoVoiceFlow = async () => {
      setVoiceError(null);
      clearVoiceResolutionState();
      setTranscript('');
      setPartialTranscript('');
      setManualInput('');
      await triggerMediumImpactHaptic();
      await speakAndWait('A donde quieres ir?', {
        key: 'demo-voice-question',
        minIntervalMs: 0,
        interrupt: true,
        pauseMs: 900,
      });

      if (cancelled) {
        return;
      }

      setIsListening(true);
      const words = demoVoiceTranscript.split(/\s+/).filter(Boolean);
      let currentPartial = '';

      for (const word of words) {
        if (cancelled) {
          return;
        }

        currentPartial = currentPartial ? `${currentPartial} ${word}` : word;
        setPartialTranscript(currentPartial);
        await waitForNarrationPause(450);
      }

      if (cancelled) {
        return;
      }

      setIsListening(false);
      setPartialTranscript('');
      setTranscript(demoVoiceTranscript);
      setManualInput(demoVoiceTranscript);
      await waitForNarrationPause(500);
      await applyTranscriptRef.current?.(demoVoiceTranscript);
    };

    void runDemoVoiceFlow();

    return () => {
      cancelled = true;
    };
  }, [
    clearVoiceResolutionState,
    demoAutoFlowEnabled,
    demoRunId,
    demoVoiceTranscript,
    setDemoStep,
  ]);

  const liveTranscript = partialTranscript || transcript;
  
  // During demo, don't show the previous destination while the prompt is active
  const showStaleDestination = demoAutoFlowEnabled && !transcript && isListening;
  const currentDestinationLabel = pendingStation
    ? `Confirmar ${pendingStation.name}`
    : (hasSelectedDestination && !showStaleDestination)
      ? destinationStation.name
      : isResolvingDestination 
        ? 'Procesando...'
        : 'Aun sin destino confirmado';

  return (
    <ScreenContainer>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>🎙️</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Decir destino por voz
      </Text>
      <Text style={styles.subtitle}>
        Di una estacion o escribela si lo prefieres.
      </Text>
      <View style={[styles.liveCard, isListening && styles.transcriptCardActive]}>
        <Text style={styles.liveLabel}>
          {isListening ? 'Escuchando...' : transcript ? 'Te escuche decir' : 'Di tu destino'}
        </Text>
        <Text style={[styles.liveText, !liveTranscript && styles.transcriptPlaceholder]}>
          {liveTranscript || 'A donde quieres ir?'}
        </Text>
        {isListening ? <Text style={styles.liveBadge}>Microfono activo</Text> : null}
      </View>
      <View style={styles.transcriptCard}>
        <Text style={styles.transcriptLabel}>Resultado final</Text>
        <Text
          style={[
            styles.transcriptText,
            !transcript && styles.transcriptPlaceholder,
          ]}>
          {transcript || 'Esperando resultado final.'}
        </Text>
      </View>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Destino actual</Text>
        <Text style={styles.statusValue}>{currentDestinationLabel}</Text>
        {isListening ? <Text style={styles.listeningText}>Escuchando...</Text> : null}
        {isResolvingDestination ? (
          <Text style={styles.listeningText}>Preparando el recorrido...</Text>
        ) : null}
        {voiceAvailable === false && !demoAutoFlowEnabled ? (
          <Text style={styles.warningText}>
            No hay motor de voz disponible. Usa el campo manual.
          </Text>
        ) : null}
        {selectionMessage ? <Text style={styles.warningText}>{selectionMessage}</Text> : null}
        {voiceError ? <Text style={styles.errorText}>{voiceError}</Text> : null}
      </View>
      {pendingStation ? (
        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationLabel}>Confirmar destino</Text>
          <Text style={styles.confirmationValue}>{pendingStation.name}</Text>
          <AccessibleButton
            label="Confirmar destino"
            hint="Aceptar este destino y continuar"
            onPress={() => {
              void confirmDestinationSelection(pendingStation, {
                fromRedirectMessage: selectionMessage,
                autoContinue: demoModeEnabled,
              });
            }}
          />
          <AccessibleButton
            label="Escuchar otra vez"
            variant="secondary"
            hint="Volver a escuchar o decir otro destino"
            onPress={() => {
              clearVoiceResolutionState();
              setVoiceError(null);
              setTranscript('');
              setPartialTranscript('');
              void handleStartListening();
            }}
          />
        </View>
      ) : null}
      {!pendingStation && suggestedStations.length > 0 ? (
        <View style={styles.confirmationCard}>
          <Text style={styles.confirmationLabel}>Opciones cercanas</Text>
          {suggestedStations.slice(0, 3).map((station) => (
            <AccessibleButton
              key={station.id}
              label={station.name}
              variant="secondary"
              hint="Usar esta estacion como destino"
              onPress={() => {
                if (__DEV__) {
                  console.log('[UI] Opcion sugerida presionada', {
                    station: station.name,
                    demoModeEnabled,
                    demoAutoFlowEnabled,
                  });
                }
                void confirmDestinationSelection(station, {
                  autoContinue: demoModeEnabled,
                });
              }}
            />
          ))}
        </View>
      ) : null}
      <AccessibleButton
        label={isListening ? 'Detener escucha' : 'Escuchar destino'}
        hint="Activa o detiene el reconocimiento de voz"
        accessibilityLabel={
          isListening
            ? 'Detener reconocimiento de voz del destino'
            : 'Iniciar reconocimiento de voz del destino'
        }
        onPress={() => {
          if (__DEV__) {
            console.log('[UI] Boton voz presionado', {
              isListening,
              demoModeEnabled,
              demoAutoFlowEnabled,
            });
          }
          if (isListening) {
            void stopVoiceRecognition();
            setIsListening(false);
            return;
          }

          void handleStartListening();
        }}
      />
      <View style={styles.manualCard}>
        <Text style={styles.manualLabel}>Escribir destino manualmente</Text>
        <TextInput
          accessibilityLabel="Campo para escribir la estación destino"
          accessibilityHint="Escribe una estación y luego activa el botón usar texto escrito"
          autoCapitalize="words"
          autoCorrect={false}
          onChangeText={setManualInput}
          placeholder="Escribe una estacion"
          placeholderTextColor={colors.textSoft}
          style={styles.input}
          value={manualInput}
        />
        <AccessibleButton
          label="Usar texto escrito"
          variant="secondary"
          hint="Convierte el texto escrito en una estación válida"
          accessibilityLabel="Usar texto escrito como destino"
          onPress={() => {
            if (__DEV__) {
              console.log('[UI] Boton usar texto presionado', {
                manualInput,
                demoModeEnabled,
                demoAutoFlowEnabled,
              });
            }
            void handleManualApply();
          }}
        />
      </View>
      <AccessibleButton
        label="Cambiar destino"
        variant="secondary"
        hint="Abrir lista de estaciones disponibles"
        accessibilityLabel="Cambiar destino manualmente"
        onPress={() => {
          if (__DEV__) {
            console.log('[UI] Boton cambiar destino presionado', {
              demoModeEnabled,
              demoAutoFlowEnabled,
            });
          }
          navigation.navigate('StationSelector');
        }}
      />
      <AccessibleButton
        label="Continuar con destino detectado"
        hint="Abre el resumen de ruta"
        disabled={!hasSelectedDestination || isResolvingDestination || Boolean(pendingStation)}
        onPress={() => {
          if (__DEV__) {
            console.log('[UI] Boton continuar presionado', {
              hasSelectedDestination,
              isResolvingDestination,
              hasPendingStation: Boolean(pendingStation),
              demoModeEnabled,
              demoAutoFlowEnabled,
            });
          }
          if (!hasSelectedDestination) {
            void speakManagedText(
              'Primero di o escribe un destino para iniciar la guia.',
              {
                key: 'voice-missing-destination',
                minIntervalMs: 0,
                interrupt: true,
              }
            );
            return;
          }

          if (demoModeEnabled) {
            void continueDemoFlow();
            return;
          }

          navigation.navigate('RoutePreview');
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'center',
  },
  transcriptCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  transcriptCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSurface,
    borderWidth: borders.bold,
  },
  liveCard: {
    minHeight: 180,
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  liveLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  liveText: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  transcriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  transcriptLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textMuted,
  },
  transcriptText: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.text,
  },
  transcriptPlaceholder: {
    color: colors.textSoft,
    fontWeight: '600',
  },
  liveBadge: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
    color: colors.accentText,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  confirmationCard: {
    backgroundColor: colors.successSoft,
    borderWidth: borders.bold,
    borderColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  confirmationLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  confirmationValue: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    color: colors.text,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: colors.text,
  },
  listeningText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '800',
  },
  warningText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.warning,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.error,
    fontWeight: '800',
  },
  manualCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  manualLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  input: {
    minHeight: 64,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    backgroundColor: colors.background,
  },
});
