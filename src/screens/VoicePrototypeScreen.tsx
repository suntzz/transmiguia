import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { DEFAULT_DEMO_DESTINATION_NAME, useDemoMode } from '@/src/context/DemoModeContext';
import { useRouteSelection } from '@/src/context/RouteContext';
import {
  triggerMediumImpactHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '@/src/services/hapticsService';
import {
  speakAndWait,
  speakManagedText,
  stopSpeaking,
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

type VoiceFlowState =
  | 'INITIAL'
  | 'ANNOUNCING_PROMPT'
  | 'LISTENING'
  | 'USER_SPEAKING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'CONFIRMATION_PENDING'
  | 'NO_SPEECH'
  | 'NOT_RECOGNIZED'
  | 'PERMISSION_DENIED'
  | 'ENGINE_UNAVAILABLE';

export function VoicePrototypeScreen({ navigation }: Props) {
  const {
    destinationStation,
    hasSelectedDestination,
    clearDestination,
    setOriginStation,
    setDestinationStation,
  } = useRouteSelection();

  const {
    demoModeEnabled,
    demoVoiceTranscript,
    activateDemoAutoFlow,
    prepareDemoJourney,
    setDemoStep,
  } = useDemoMode();

  const [flowState, setFlowState] = useState<VoiceFlowState>('INITIAL');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recognizedStation, setRecognizedStation] = useState<TransmilenioStation | null>(null);
  const [candidateStations, setCandidateStations] = useState<TransmilenioStation[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);

  useScreenAnnouncement('Destino por voz. Puedes decir una estación de TransMilenio.');
  useStopDemoOnBack();

  // Pulse animation for subtle listening indicator (GPU accelerated transform & opacity)
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Lifecycle & guard refs
  const isMountedRef = useRef(true);
  const hasNavigatedRef = useRef(false);
  const isProcessingRef = useRef(false);
  const stationVoiceContext = useRef(getAllStationSpeechTerms());

  // Check reduced motion setting
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMountedRef.current) {
        setReducedMotion(Boolean(enabled));
      }
    });

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (isMountedRef.current) {
        setReducedMotion(Boolean(enabled));
      }
    });

    return () => {
      sub?.remove();
    };
  }, []);

  // Subtle pulse animation loop when listening
  useEffect(() => {
    if (flowState === 'LISTENING' || flowState === 'USER_SPEAKING') {
      if (reducedMotion) {
        pulseAnim.setValue(0);
        return;
      }

      pulseAnim.setValue(0);
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimationRef.current = loop;
      loop.start();
    } else {
      pulseAnimationRef.current?.stop();
      pulseAnim.setValue(0);
    }

    return () => {
      pulseAnimationRef.current?.stop();
    };
  }, [flowState, pulseAnim, reducedMotion]);

  // Initial station statuses refresh
  useEffect(() => {
    void refreshStationStatuses();
  }, []);

  // Un recorrido nuevo nunca hereda el destino/origen de uno anterior:
  // el destino solo existe cuando el usuario lo dice o lo selecciona.
  useEffect(() => {
    clearDestination();
  }, [clearDestination]);

  // Safe navigation helper: awaits TTS completion before advancing
  const navigateToRoutePreview = useCallback(
    async (station: TransmilenioStation) => {
      if (hasNavigatedRef.current || !isMountedRef.current) {
        return;
      }

      hasNavigatedRef.current = true;
      if (!demoModeEnabled) {
        setDestinationStation(station);
      }

      if (demoModeEnabled) {
        const journey = prepareDemoJourney(station);
        if (journey) {
          setOriginStation(journey.originStation);
        }
        activateDemoAutoFlow();
        setDemoStep('preview');
      }

      // Final screen replacement after speech has completely finished
      navigation.replace('RoutePreview');
    },
    [
      activateDemoAutoFlow,
      demoModeEnabled,
      navigation,
      prepareDemoJourney,
      setDemoStep,
      setDestinationStation,
      setOriginStation,
    ]
  );

  // Handle destination match result and execute the confirmation speech
  const handleMatchedDestination = useCallback(
    async (station: TransmilenioStation) => {
      if (isProcessingRef.current || hasNavigatedRef.current) {
        return;
      }
      isProcessingRef.current = true;

      // Stop recognition completely
      await stopVoiceRecognition();

      // Check station availability (maintenance / temporary closures)
      const availability = resolveStationAvailability(station);
      const targetStation = availability?.resolvedStation ?? station;

      setRecognizedStation(targetStation);
      setFlowState('SUCCESS');
      await triggerSuccessHaptic();

      // Formulate natural, conversational spoken confirmation
      const confirmationSpeech = availability?.wasRedirected
        ? `${availability.message} Preparando tu ruta.`
        : `Entendí ${targetStation.name}. Preparando tu ruta.`;

      // CRITICAL: Strictly await the Text-to-Speech completion callback (onDone)
      // The screen will NOT navigate until the phone has finished speaking every word!
      await speakAndWait(confirmationSpeech, {
        key: `voice-confirm-${targetStation.id}`,
        interrupt: true,
        pauseMs: 300,
        ignoreGlobalCooldown: true,
      });

      if (!isMountedRef.current) {
        return;
      }

      // Navigate ONLY after speech has genuinely completed
      await navigateToRoutePreview(targetStation);
    },
    [navigateToRoutePreview]
  );

  // Interpret speech transcript from real microphone
  const processRecognizedSpeech = useCallback(
    async (heardText: string) => {
      if (!heardText.trim()) {
        setFlowState('NO_SPEECH');
        setErrorMessage('No te escuché bien. Di el nombre de tu estación.');
        await triggerWarningHaptic();
        await speakAndWait('No te escuché bien. Di el nombre de tu estación.', {
          key: 'voice-no-speech',
          interrupt: true,
          pauseMs: 400,
          ignoreGlobalCooldown: true,
        });
        return;
      }

      setFlowState('PROCESSING');
      setTranscript(heardText);
      setManualInput(heardText);

      const match = resolveStationFromSpeech(heardText);

      if (match.station) {
        // Successful station match
        await handleMatchedDestination(match.station);
      } else if (match.reason === 'ambiguous' && match.candidates && match.candidates.length > 0) {
        // Multiple candidate stations found
        setCandidateStations(match.candidates.slice(0, 3));
        setFlowState('CONFIRMATION_PENDING');
        await triggerWarningHaptic();

        const candidateNames = match.candidates.slice(0, 2).map((s) => s.name).join(' o ');
        await speakAndWait(`No entendí bien. ¿Te refieres a ${candidateNames}?`, {
          key: 'voice-ambiguous-prompt',
          interrupt: true,
          pauseMs: 500,
          ignoreGlobalCooldown: true,
        });
      } else {
        // No match found in the TransMilenio catalog
        setFlowState('NOT_RECOGNIZED');
        setErrorMessage(`No reconocí la estación "${heardText}". Di el nombre completo o escríbelo abajo.`);
        await triggerWarningHaptic();

        await speakAndWait(
          'No reconocí esa estación. Intenta decir el nombre completo o escríbela abajo.',
          {
            key: 'voice-unrecognized-station',
            interrupt: true,
            pauseMs: 500,
            ignoreGlobalCooldown: true,
          }
        );
      }
    },
    [handleMatchedDestination]
  );

  // Activate microphone listening
  const startListeningSession = useCallback(async () => {
    if (!isMountedRef.current || hasNavigatedRef.current) {
      return;
    }

    setTranscript('');
    setPartialTranscript('');
    setErrorMessage(null);
    setCandidateStations([]);
    isProcessingRef.current = false;

    // Check microphone permission
    const granted = await ensureVoicePermission();
    if (!granted) {
      setFlowState('PERMISSION_DENIED');
      const permMsg =
        Platform.OS === 'web'
          ? 'Permiso de micrófono no concedido en el navegador. Haz clic en el icono de permisos en la barra de direcciones o escribe tu destino.'
          : 'Permiso de micrófono no concedido. Puedes activarlo o escribir tu destino.';
      setErrorMessage(permMsg);
      await triggerWarningHaptic();
      await speakManagedText(permMsg, {
        key: 'voice-permission-denied',
        interrupt: true,
        pauseMs: 400,
      });
      return;
    }

    try {
      await startVoiceRecognition('es-CO', stationVoiceContext.current);
      setFlowState('LISTENING');
      await triggerMediumImpactHaptic();
    } catch (err) {
      const normalized = normalizeVoiceErrorMessage('start-error', String(err));
      setErrorMessage(normalized);
      setFlowState('NOT_RECOGNIZED');
      await triggerWarningHaptic();
    }
  }, []);

  // Stop active listening
  const stopListeningSession = useCallback(async () => {
    try {
      await stopVoiceRecognition();
    } catch {
      // Ignore
    }
    if (isMountedRef.current && flowState === 'LISTENING') {
      setFlowState('INITIAL');
    }
  }, [flowState]);

  // Main entry effect: Configures recognition listeners and starts the initial prompt
  useEffect(() => {
    isMountedRef.current = true;
    hasNavigatedRef.current = false;
    isProcessingRef.current = false;

    const setupAndPrompt = async () => {
      // Configure native voice recognition event callbacks
      await configureVoiceRecognition({
        onStart: () => {
          if (isMountedRef.current) {
            setFlowState('LISTENING');
            setErrorMessage(null);
          }
        },
        onSpeechStart: () => {
          if (isMountedRef.current) {
            setFlowState('USER_SPEAKING');
          }
        },
        onSpeechEnd: () => {
          if (isMountedRef.current) {
            setFlowState('PROCESSING');
          }
        },
        onPartialResults: (partial) => {
          if (isMountedRef.current) {
            setPartialTranscript(partial);
            setFlowState('USER_SPEAKING');
          }
        },
        onResults: (finalText) => {
          if (isMountedRef.current && !hasNavigatedRef.current) {
            void processRecognizedSpeech(finalText);
          }
        },
        onError: (errCode, rawMessage) => {
          if (!isMountedRef.current || hasNavigatedRef.current) {
            return;
          }

          if (errCode === 'no-speech' || errCode === 'nomatch') {
            setFlowState('NO_SPEECH');
            setErrorMessage('No te escuché bien. Toca el botón para hablar de nuevo.');
            void triggerWarningHaptic();
            void speakManagedText('No te escuché bien. Di el nombre de tu estación.', {
              key: 'voice-no-speech-err',
              interrupt: true,
              pauseMs: 400,
            });
            return;
          }

          const normalized = normalizeVoiceErrorMessage(errCode, rawMessage);
          setErrorMessage(normalized);
          setFlowState('NOT_RECOGNIZED');
          void triggerWarningHaptic();
        },
      });

      // STEP 1: Announce prompt clearly to the visually impaired user
      if (isMountedRef.current) {
        setFlowState('ANNOUNCING_PROMPT');
      }

      await speakAndWait('¿A qué estación de TransMilenio quieres ir?', {
        key: 'voice-initial-prompt',
        interrupt: true,
        pauseMs: 400,
        ignoreGlobalCooldown: true,
      });

      if (!isMountedRef.current || hasNavigatedRef.current) {
        return;
      }

      // En modo demostración no se bloquea al usuario si no tiene permisos o motor de voz.
      // Se simula la escucha y reconocimiento de la estación de prueba.
      if (demoModeEnabled) {
        const demoPhrase = demoVoiceTranscript?.trim() || DEFAULT_DEMO_DESTINATION_NAME;
        setFlowState('LISTENING');
        setPartialTranscript(demoPhrase);

        await new Promise((resolve) => setTimeout(resolve, 800));

        if (!isMountedRef.current || hasNavigatedRef.current) {
          return;
        }

        await processRecognizedSpeech(demoPhrase);
        return;
      }

      // Verify speech engine availability in normal mode
      const available = await isSpeechRecognitionAvailable();
      if (!available) {
        if (isMountedRef.current) {
          setFlowState('ENGINE_UNAVAILABLE');
          setErrorMessage(
            Platform.OS === 'web'
              ? 'Tu navegador actual no tiene soporte para reconocimiento de voz continuo. Te recomendamos Google Chrome o escribir tu estación manualmente abajo.'
              : 'Reconocimiento de voz no disponible en este dispositivo. Usa el campo manual.'
          );
        }
        return;
      }

      // STEP 2: Only after the spoken announcement completes, activate the real microphone
      if (isMountedRef.current && !hasNavigatedRef.current) {
        await startListeningSession();
      }
    };

    void setupAndPrompt();

    return () => {
      isMountedRef.current = false;
      void destroyVoiceRecognition();
      void stopSpeaking();
    };
  }, [demoModeEnabled, demoVoiceTranscript, processRecognizedSpeech, startListeningSession]);

  // Handle manual destination submission
  const handleManualSubmit = async () => {
    if (!manualInput.trim()) {
      return;
    }
    await stopListeningSession();
    await processRecognizedSpeech(manualInput.trim());
  };

  const isMicListening = flowState === 'LISTENING' || flowState === 'USER_SPEAKING';
  const liveDisplayText = partialTranscript || transcript;

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.25],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.7, 0.35, 0],
  });

  return (
    <ScreenContainer>
      {/* Header with Title and Accessible Context */}
      <View style={styles.header}>
        <View style={styles.micContainer}>
          {isMicListening ? (
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
          ) : null}

          <View
            style={[
              styles.micIconCircle,
              isMicListening && styles.micIconCircleActive,
              flowState === 'SUCCESS' && styles.micIconCircleSuccess,
              flowState === 'PROCESSING' && styles.micIconCircleProcessing,
            ]}>
            <MaterialIcons
              name={
                flowState === 'SUCCESS'
                  ? 'check'
                  : isMicListening
                    ? 'graphic-eq'
                    : flowState === 'PROCESSING'
                      ? 'hourglass-empty'
                      : 'mic'
              }
              size={36}
              color={
                flowState === 'SUCCESS'
                  ? colors.success
                  : isMicListening
                    ? colors.primary
                    : colors.textSecondary
              }
            />
          </View>
        </View>

        <Text accessibilityRole="header" style={styles.title}>
          Decir destino por voz
        </Text>
        <Text style={styles.subtitle}>
          {flowState === 'ANNOUNCING_PROMPT'
            ? 'Preparando asistente de voz...'
            : isMicListening
              ? 'Te estoy escuchando... Di tu estación'
              : flowState === 'PROCESSING'
                ? 'Procesando tu estación...'
                : flowState === 'SUCCESS'
                  ? 'Estación confirmada'
                  : 'Di una estación o escríbela si lo prefieres.'}
        </Text>
      </View>

      {/* Main Real-Time Voice Card */}
      <View
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={
          isMicListening
            ? `Micrófono activo. Te estoy escuchando. Texto detectado: ${liveDisplayText || 'habla ahora'}`
            : flowState === 'PROCESSING'
              ? 'Procesando estación dicha'
              : flowState === 'SUCCESS' && recognizedStation
                ? `Estación reconocida: ${recognizedStation.name}. Preparando ruta.`
                : `Asistente de voz inactivo. Último texto: ${liveDisplayText || 'sin grabación'}`
        }
        style={[
          styles.liveCard,
          isMicListening && styles.liveCardActive,
          flowState === 'SUCCESS' && styles.liveCardSuccess,
        ]}>
        <View style={styles.liveCardTop}>
          <View style={styles.liveStatusRow}>
            {isMicListening ? <View style={styles.recordingDot} /> : null}
            <Text
              style={[
                styles.liveLabel,
                isMicListening && styles.liveLabelActive,
                flowState === 'SUCCESS' && styles.liveLabelSuccess,
              ]}>
              {isMicListening
                ? 'Te estoy escuchando'
                : flowState === 'PROCESSING'
                  ? 'Procesando...'
                  : flowState === 'SUCCESS'
                    ? 'Te escuché decir'
                    : transcript
                      ? 'Último texto detectado'
                      : 'Asistente de voz'}
            </Text>
          </View>

          {isMicListening ? (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>Micrófono activo</Text>
            </View>
          ) : flowState === 'SUCCESS' ? (
            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>Confirmado</Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[
            styles.liveText,
            !liveDisplayText && !recognizedStation && styles.transcriptPlaceholder,
            flowState === 'SUCCESS' && styles.liveTextSuccess,
          ]}>
          {flowState === 'SUCCESS' && recognizedStation
            ? recognizedStation.name
            : liveDisplayText || (isMicListening ? 'Habla ahora...' : '¿A qué estación quieres ir?')}
        </Text>

        {flowState === 'SUCCESS' ? (
          <Text style={styles.successHelperText}>
            Preparando tu ruta... Un momento por favor.
          </Text>
        ) : null}
      </View>

      {/* Hero Voice Control Button */}
      <AccessibleButton
        label={isMicListening ? 'Detener escucha' : 'Escuchar destino'}
        subtitle={
          isMicListening
            ? 'Toca para detener el micrófono'
            : 'Toca y di el nombre de tu estación'
        }
        size="large"
        icon={isMicListening ? 'stop' : 'mic'}
        variant={isMicListening ? 'danger' : 'primary'}
        hint="Activa o detiene el reconocimiento de voz por micrófono"
        accessibilityLabel={
          isMicListening
            ? 'Detener escucha del micrófono'
            : 'Escuchar destino. Activar micrófono'
        }
        disabled={flowState === 'PROCESSING' || flowState === 'SUCCESS'}
        onPress={() => {
          if (isMicListening) {
            void stopListeningSession();
          } else {
            void startListeningSession();
          }
        }}
      />

      {/* Candidate Disambiguation Cards */}
      {flowState === 'CONFIRMATION_PENDING' && candidateStations.length > 0 ? (
        <View style={styles.candidatesCard}>
          <Text style={styles.candidatesTitle}>¿Te refieres a alguna de estas?</Text>
          <View style={styles.candidatesList}>
            {candidateStations.map((station) => (
              <AccessibleButton
                key={station.id}
                label={station.name}
                subtitle={`Troncal ${station.troncal}`}
                variant="secondary"
                icon="place"
                hint="Seleccionar esta estación como destino"
                onPress={() => {
                  void handleMatchedDestination(station);
                }}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* Error or Silence Notice Banner */}
      {errorMessage ? (
        <View
          accessible={true}
          accessibilityRole="alert"
          accessibilityLabel={`Aviso: ${errorMessage}`}
          style={styles.alertNoticeError}>
          <MaterialIcons name="info-outline" size={20} color={colors.error} />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {/* Current Destination Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <MaterialIcons name="place" size={18} color={colors.primary} />
          <Text style={styles.statusLabel}>Destino actual</Text>
        </View>
        <Text style={styles.statusValue}>
          {recognizedStation
            ? recognizedStation.name
            : hasSelectedDestination
              ? destinationStation.name
              : 'Aún sin destino confirmado'}
        </Text>
      </View>

      {/* Accessible Manual Fallback Section */}
      <View style={styles.manualCard}>
        <View style={styles.manualHeader}>
          <MaterialIcons name="keyboard" size={20} color={colors.textSecondary} />
          <Text style={styles.manualLabel}>Escribir destino manualmente</Text>
        </View>
        <TextInput
          accessibilityLabel="Campo para escribir la estación destino"
          accessibilityHint="Escribe una estación y luego presiona Usar texto escrito"
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
          hint="Valida y confirma el texto escrito como estación destino"
          accessibilityLabel="Usar texto escrito como destino"
          disabled={!manualInput.trim() || flowState === 'PROCESSING' || flowState === 'SUCCESS'}
          onPress={() => {
            void handleManualSubmit();
          }}
        />
      </View>

      {/* Bottom Navigation Buttons */}
      <View style={styles.footerActions}>
        <AccessibleButton
          label="Seleccionar de la lista"
          subtitle="Explorar todas las estaciones por troncales"
          variant="secondary"
          icon="list"
          hint="Abre la lista de estaciones de TransMilenio"
          accessibilityLabel="Seleccionar de la lista. Abrir catálogo completo de estaciones."
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
  micContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: spacing.xs,
  },
  pulseRing: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  micIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceHover,
    borderWidth: borders.standard,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micIconCircleActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  micIconCircleProcessing: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  micIconCircleSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: colors.success,
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
    borderWidth: 2,
    backgroundColor: '#FFF5F5',
  },
  liveCardSuccess: {
    borderColor: colors.success,
    borderWidth: 2,
    backgroundColor: '#ECFDF5',
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
    width: 10,
    height: 10,
    borderRadius: 5,
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
  liveLabelSuccess: {
    color: colors.success,
  },
  liveBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
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
  successBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.success,
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.4,
  },
  liveText: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  liveTextSuccess: {
    color: '#065F46',
  },
  successHelperText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: '#047857',
    textAlign: 'center',
  },
  transcriptPlaceholder: {
    color: colors.textSoft,
    fontWeight: '500',
  },
  candidatesCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.sm,
  },
  candidatesTitle: {
    fontSize: typography.body.fontSize,
    fontWeight: '700',
    color: colors.text,
  },
  candidatesList: {
    gap: spacing.xs,
  },
  alertNoticeError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  errorText: {
    fontSize: typography.bodySecondary.fontSize,
    color: colors.error,
    fontWeight: '700',
    flex: 1,
  },
  statusCard: {
    backgroundColor: colors.surface,
    borderWidth: borders.standard,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xxs,
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
