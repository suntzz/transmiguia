import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
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
import { borders, colors, radius, shadows, spacing, typography } from '@/src/utils/theme';

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
      ? `No quedó claro si dijiste ${suggestions}. Di el nombre completo o escríbelo manualmente.`
      : 'No quedó clara la estación. Di el nombre completo o escríbelo manualmente.';
  }

  if (transcript.trim()) {
    return 'No se reconoció una estación válida. Intenta decir el nombre exacto o escríbelo manualmente.';
  }

  return 'No se detectó una estación válida. Intenta de nuevo o escribe el destino manualmente.';
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
    'Destino por voz. Puedes decir una estación de TransMilenio.'
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
        setVoiceError('No pude preparar la demostración con ese destino.');
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
          ? 'No te escuché bien, intenta otra vez.'
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
      const message = 'No fue posible validar la disponibilidad de esa estación.';
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
            const message = 'No te escuché bien, intenta otra vez.';
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
      await speakAndWait('¿A dónde quieres ir?', {
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
    : hasSelectedDestination && !showStaleDestination
      ? destinationStation.name
      : isResolvingDestination
        ? 'Procesando...'
        : 'Aún sin destino confirmado';

  return (
    <ScreenContainer>
      {/* Header and Mic Visual Indicator */}
      <View style={styles.header}>
        <View style={[styles.micIconCircle, isListening && styles.micIconCircleActive]}>
          <MaterialIcons
            name={isListening ? 'graphic-eq' : 'mic'}
            size={36}
            color={isListening ? colors.primary : colors.textSecondary}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Decir destino por voz
        </Text>
        <Text style={styles.subtitle}>
          Di una estación o escríbela si lo prefieres.
        </Text>
      </View>

      {/* Live Voice Assistant Card */}
      <View
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={
          isListening
            ? `Escuchando tu voz. Texto detectado: ${liveTranscript || 'habla ahora'}`
            : `Voz inactiva. Último texto: ${liveTranscript || 'sin grabación'}`
        }
        style={[styles.liveCard, isListening && styles.liveCardActive]}>
        <View style={styles.liveCardTop}>
          <View style={styles.liveStatusRow}>
            {isListening ? <View style={styles.recordingDot} /> : null}
            <Text style={[styles.liveLabel, isListening && styles.liveLabelActive]}>
              {isListening ? 'Escuchando...' : transcript ? 'Te escuché decir' : 'Di tu destino'}
            </Text>
          </View>
          {isListening ? (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>Micrófono activo</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.liveText, !liveTranscript && styles.transcriptPlaceholder]}>
          {liveTranscript || '¿A dónde quieres ir?'}
        </Text>
      </View>

      {/* Final Recognized Transcript */}
      <View
        accessible={true}
        accessibilityRole="text"
        accessibilityLabel={`Resultado final reconocido: ${transcript || 'esperando resultado'}`}
        style={styles.transcriptCard}>
        <Text style={styles.transcriptLabel}>Resultado final</Text>
        <Text
          style={[
            styles.transcriptText,
            !transcript && styles.transcriptPlaceholder,
          ]}>
          {transcript || 'Esperando resultado final.'}
        </Text>
      </View>

      {/* Voice Action Hero Button */}
      <AccessibleButton
        label={isListening ? 'Detener escucha' : 'Escuchar destino'}
        icon={isListening ? 'stop' : 'mic'}
        variant={isListening ? 'danger' : 'primary'}
        hint="Activa o detiene el reconocimiento de voz"
        accessibilityLabel={
          isListening
            ? 'Detener reconocimiento de voz del destino'
            : 'Iniciar reconocimiento de voz del destino'
        }
        onPress={() => {
          if (isListening) {
            void stopVoiceRecognition();
            setIsListening(false);
            return;
          }

          void handleStartListening();
        }}
      />

      {/* Current Destination Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <MaterialIcons name="place" size={18} color={colors.primary} />
          <Text style={styles.statusLabel}>Destino actual</Text>
        </View>
        <Text style={styles.statusValue}>{currentDestinationLabel}</Text>

        {isListening ? (
          <View style={styles.statusHelperRow}>
            <MaterialIcons name="record-voice-over" size={16} color={colors.primary} />
            <Text style={styles.listeningText}>Escuchando...</Text>
          </View>
        ) : null}

        {isResolvingDestination ? (
          <View style={styles.statusHelperRow}>
            <MaterialIcons name="sync" size={16} color={colors.primary} />
            <Text style={styles.listeningText}>Preparando el recorrido...</Text>
          </View>
        ) : null}

        {voiceAvailable === false && !demoAutoFlowEnabled ? (
          <View style={styles.alertNotice}>
            <MaterialIcons name="warning" size={16} color={colors.warning} />
            <Text style={styles.warningText}>
              No hay motor de voz disponible. Usa el campo manual.
            </Text>
          </View>
        ) : null}

        {selectionMessage ? (
          <View style={styles.alertNotice}>
            <MaterialIcons name="info" size={16} color={colors.info} />
            <Text style={styles.infoNoticeText}>{selectionMessage}</Text>
          </View>
        ) : null}

        {voiceError ? (
          <View style={styles.alertNoticeError}>
            <MaterialIcons name="error-outline" size={16} color={colors.error} />
            <Text style={styles.errorText}>{voiceError}</Text>
          </View>
        ) : null}
      </View>

      {/* Pending Confirmation Modal / Card */}
      {pendingStation ? (
        <View style={styles.confirmationCard}>
          <View style={styles.confirmationHeader}>
            <MaterialIcons name="check-circle" size={22} color={colors.success} />
            <Text style={styles.confirmationLabel}>Confirmar destino</Text>
          </View>
          <Text style={styles.confirmationValue}>{pendingStation.name}</Text>
          <AccessibleButton
            label="Confirmar destino"
            icon="check"
            variant="primary"
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
            icon="replay"
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

      {/* Suggested Options */}
      {!pendingStation && suggestedStations.length > 0 ? (
        <View style={styles.suggestionsCard}>
          <Text style={styles.suggestionsTitle}>Opciones cercanas</Text>
          <View style={styles.suggestionsList}>
            {suggestedStations.slice(0, 3).map((station) => (
              <AccessibleButton
                key={station.id}
                label={station.name}
                variant="secondary"
                icon="place"
                hint="Usar esta estación como destino"
                onPress={() => {
                  void confirmDestinationSelection(station, {
                    autoContinue: demoModeEnabled,
                  });
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Manual Fallback Input Card */}
      <View style={styles.manualCard}>
        <View style={styles.manualHeader}>
          <MaterialIcons name="keyboard" size={20} color={colors.textSecondary} />
          <Text style={styles.manualLabel}>Escribir destino manualmente</Text>
        </View>
        <TextInput
          accessibilityLabel="Campo para escribir la estación destino"
          accessibilityHint="Escribe una estación y luego activa el botón usar texto escrito"
          autoCapitalize="words"
          autoCorrect={false}
          onChangeText={setManualInput}
          placeholder="Escribe una estación"
          placeholderTextColor={colors.textSoft}
          style={styles.input}
          value={manualInput}
        />
        <AccessibleButton
          label="Usar texto escrito"
          variant="secondary"
          icon="check"
          hint="Convierte el texto escrito en una estación válida"
          accessibilityLabel="Usar texto escrito como destino"
          onPress={() => {
            void handleManualApply();
          }}
        />
      </View>

      {/* Navigation and Next Actions */}
      <View style={styles.footerActions}>
        <AccessibleButton
          label="Continuar con destino detectado"
          icon="arrow-forward"
          variant="primary"
          hint="Abre el resumen de ruta"
          disabled={!hasSelectedDestination || isResolvingDestination || Boolean(pendingStation)}
          onPress={() => {
            if (!hasSelectedDestination) {
              void speakManagedText(
                'Primero di o escribe un destino para iniciar la guía.',
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

        <AccessibleButton
          label="Cambiar destino"
          variant="secondary"
          icon="list"
          hint="Abrir lista de estaciones disponibles"
          accessibilityLabel="Cambiar destino manualmente"
          onPress={() => {
            navigation.navigate('StationSelector');
          }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  micIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  micIconCircleActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  liveCard: {
    minHeight: 140,
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'space-between',
    gap: spacing.md,
    ...shadows.sm,
  },
  liveCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFF5F5',
  },
  liveCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  liveLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  liveLabelActive: {
    color: colors.primary,
  },
  liveBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.4,
  },
  liveText: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  transcriptCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xxs,
    ...shadows.sm,
  },
  transcriptLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transcriptText: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    fontWeight: '700',
    color: colors.text,
  },
  transcriptPlaceholder: {
    color: colors.textSoft,
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.sm,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text,
  },
  statusHelperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  listeningText: {
    fontSize: typography.bodySecondary.fontSize,
    color: colors.primary,
    fontWeight: '700',
  },
  alertNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFFBEB',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xxs,
  },
  alertNoticeError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FEF2F2',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xxs,
  },
  warningText: {
    fontSize: typography.bodySecondary.fontSize,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  infoNoticeText: {
    fontSize: typography.bodySecondary.fontSize,
    color: '#1E40AF',
    fontWeight: '600',
    flex: 1,
  },
  errorText: {
    fontSize: typography.bodySecondary.fontSize,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },
  confirmationCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  confirmationLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    color: '#065F46',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  confirmationValue: {
    fontSize: typography.h2.fontSize,
    lineHeight: typography.h2.lineHeight,
    fontWeight: '900',
    color: '#065F46',
  },
  suggestionsCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.sm,
  },
  suggestionsTitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionsList: {
    gap: spacing.xs,
  },
  manualCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  manualLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surfaceHover,
  },
  footerActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
