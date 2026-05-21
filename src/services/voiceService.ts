import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type VoiceServiceCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onResults?: (text: string) => void;
  onPartialResults?: (text: string) => void;
  onError?: (error: string, message: string) => void;
};

// Re-export the hook so screens can use it directly
export { useSpeechRecognitionEvent };

let activeListeners: { remove: () => void }[] = [];
let ignoreAbortErrorsUntil = 0;

type SupportedLocalesResult = {
  locales: string[];
  installedLocales: string[];
};

type VoiceRecognitionCandidate = {
  locale: string;
  servicePackage?: string;
  requiresOnDeviceRecognition?: boolean;
  supportedLocales: string[];
  installedLocales: string[];
};

function removeAllListeners() {
  activeListeners.forEach((l) => l.remove());
  activeListeners = [];
}

async function resetRecognizerSession(removeListeners = false) {
  try {
    ignoreAbortErrorsUntil = Date.now() + 1500;
    ExpoSpeechRecognitionModule.abort();
    logVoice('VOICE RESET');
  } catch (error) {
    logVoiceError('VOICE RESET FAILED', error);
  }

  if (removeListeners) {
    removeAllListeners();
  }
}

function logVoice(message: string, payload?: unknown) {
  if (!__DEV__) {
    return;
  }

  if (payload == null) {
    console.info('[Voice]', message);
  } else {
    console.info('[Voice]', message, payload);
  }
}

function logVoiceError(message: string, payload?: unknown) {
  if (!__DEV__) {
    return;
  }

  if (payload == null) {
    console.warn('[Voice]', message);
  } else {
    console.warn('[Voice]', message, payload);
  }
}

function getBestTranscript(results: unknown): string {
  if (!results) {
    return '';
  }

  // Common format: array of strings or array of objects with transcript property
  if (Array.isArray(results)) {
    // Some engines return a nested array like [["transcript1", "transcript2"]]
    const flatResults = results.flat(2);

    for (const item of flatResults) {
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }
      if (item && typeof (item as any) === 'object' && 'transcript' in (item as any)) {
        const transcript = (item as any).transcript;
        if (typeof transcript === 'string' && transcript.trim()) {
          return transcript.trim();
        }
      }
    }
  }

  // Fallback for unexpected single-object results
  if (typeof results === 'string') {
    return results.trim();
  }

  return '';
}

export function normalizeVoiceErrorMessage(error: string, message?: string): string {
  const combined = `${error} ${message ?? ''}`.toLowerCase();

  if (combined.includes('no-speech') || combined.includes('no speech')) {
    return 'No se detectó voz. Acerca el dispositivo e inténtalo de nuevo.';
  }

  if (combined.includes('aborted')) {
    return 'El reconocimiento fue cancelado.';
  }

  if (combined.includes('audio-capture') || combined.includes('audio capture')) {
    return 'No fue posible capturar audio. Verifica el micrófono.';
  }

  if (combined.includes('not-allowed') || combined.includes('not allowed')) {
    return 'Permiso de micrófono denegado. Ve a Configuración y actívalo.';
  }

  if (combined.includes('network')) {
    return 'Error de red. Verifica tu conexión a internet e inténtalo de nuevo.';
  }

  if (combined.includes('nomatch') || combined.includes('no match')) {
    return 'No pude identificar una estación clara. Di el nombre completo o escríbelo manualmente.';
  }

  if (
    combined.includes('engine-no-results') ||
    combined.includes('not returning results') ||
    combined.includes('sin resultados')
  ) {
    return 'El motor de reconocimiento escuchó, pero no devolvió resultados. Verifica que el motor de voz de Google esté activo o escribe el destino manualmente.';
  }

  if (
    combined.includes('language-not-supported') ||
    combined.includes('language not supported')
  ) {
    return 'El motor de voz no tiene disponible el idioma español en este momento. Verifica Speech Services de Google o descarga el paquete de español.';
  }

  if (combined.includes('service-not-allowed') || combined.includes('service not allowed')) {
    return 'El servicio de reconocimiento de voz no está disponible en este dispositivo.';
  }

  return (
    message ||
    'Ocurrió un error al iniciar el reconocimiento de voz. Intenta de nuevo o escribe el destino.'
  );
}

function dedupeCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(trimmed);
  });

  return result;
}

function buildLocalePriority(preferredLocale: string) {
  const normalizedPreferred = preferredLocale.trim() || 'es-CO';
  const primaryLanguage = normalizedPreferred.split('-')[0]?.toLowerCase();

  if (primaryLanguage === 'es') {
    return dedupeCaseInsensitive([
      normalizedPreferred,
      'es-CO',
      'es-US',
      'es-ES',
      'en-US',
    ]);
  }

  return dedupeCaseInsensitive([normalizedPreferred, ...LOCALE_FALLBACKS]);
}

function pickBestLocaleFromPool(
  preferredLocale: string,
  localePool: string[]
): string | null {
  const normalizedPool = dedupeCaseInsensitive(localePool);

  if (normalizedPool.length === 0) {
    return null;
  }

  const localePriority = buildLocalePriority(preferredLocale);

  for (const candidate of localePriority) {
    const exactMatch = normalizedPool.find(
      (locale) => locale.toLowerCase() === candidate.toLowerCase()
    );

    if (exactMatch) {
      return exactMatch;
    }
  }

  const preferredLanguage = preferredLocale.split('-')[0]?.toLowerCase();
  const sameLanguageMatch = normalizedPool.find((locale) =>
    locale.toLowerCase().startsWith(`${preferredLanguage}-`)
  );

  if (sameLanguageMatch) {
    return sameLanguageMatch;
  }

  const anySpanishMatch = normalizedPool.find((locale) =>
    locale.toLowerCase().startsWith('es-')
  );

  return anySpanishMatch ?? normalizedPool[0] ?? null;
}

async function getSupportedLocalesForService(
  servicePackage?: string
): Promise<SupportedLocalesResult> {
  try {
    const result = await ExpoSpeechRecognitionModule.getSupportedLocales(
      servicePackage ? { androidRecognitionServicePackage: servicePackage } : {}
    );

    return {
      locales: Array.isArray(result?.locales) ? result.locales : [],
      installedLocales: Array.isArray(result?.installedLocales)
        ? result.installedLocales
        : [],
    };
  } catch (error) {
    logVoiceError('Failed to get supported locales for service', {
      servicePackage: servicePackage ?? 'system-default',
      error,
    });

    return {
      locales: [],
      installedLocales: [],
    };
  }
}

async function selectRecognitionCandidate(
  preferredLocale: string
): Promise<VoiceRecognitionCandidate> {
  const availableServices = await getSpeechRecognitionServices();
  const defaultService = ExpoSpeechRecognitionModule.getDefaultRecognitionService();
  const defaultServicePackage =
    typeof defaultService?.packageName === 'string' ? defaultService.packageName : '';
  const servicePriority = dedupeCaseInsensitive([
    defaultServicePackage,
    'com.google.android.tts',
    'com.google.android.googlequicksearchbox',
    'com.google.android.as',
  ]).filter((servicePackage) => availableServices.includes(servicePackage));

  for (const servicePackage of servicePriority) {
    const support = await getSupportedLocalesForService(servicePackage);
    const localePool =
      servicePackage === 'com.google.android.as'
        ? support.installedLocales
        : support.locales;
    const locale = pickBestLocaleFromPool(preferredLocale, localePool);

    logVoice('VOICE SERVICE SUPPORT', {
      servicePackage,
      locales: support.locales,
      installedLocales: support.installedLocales,
      chosenLocale: locale,
    });

    if (!locale) {
      continue;
    }

    return {
      locale,
      servicePackage,
      requiresOnDeviceRecognition: servicePackage === 'com.google.android.as',
      supportedLocales: support.locales,
      installedLocales: support.installedLocales,
    };
  }

  const fallbackSupport = await getSupportedLocalesForService(
    defaultServicePackage || undefined
  );
  const fallbackLocale =
    pickBestLocaleFromPool(preferredLocale, fallbackSupport.locales) ??
    buildLocalePriority(preferredLocale)[0] ??
    preferredLocale;

  return {
    locale: fallbackLocale,
    servicePackage:
      defaultServicePackage && availableServices.includes(defaultServicePackage)
        ? defaultServicePackage
        : undefined,
    requiresOnDeviceRecognition: false,
    supportedLocales: fallbackSupport.locales,
    installedLocales: fallbackSupport.installedLocales,
  };
}

export function isVoiceNativeModuleReady(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export async function ensureVoicePermission(): Promise<boolean> {
  try {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return granted;
  } catch (error) {
    logVoiceError('Permission request failed', error);
    return false;
  }
}

export async function configureVoiceRecognition(callbacks: VoiceServiceCallbacks): Promise<boolean> {
  try {
    await resetRecognizerSession(true);
    let latestHeardText = '';
    let finalResultDelivered = false;
    let partialResultDelivered = false;
    let errorDelivered = false;
    let recognitionStarted = false;
    let speechDetected = false;
    let noResultsWatchdog: ReturnType<typeof setTimeout> | null = null;

    const clearNoResultsWatchdog = () => {
      if (noResultsWatchdog) {
        clearTimeout(noResultsWatchdog);
        noResultsWatchdog = null;
      }
    };

    const armNoResultsWatchdog = () => {
      clearNoResultsWatchdog();
      noResultsWatchdog = setTimeout(() => {
        if (
          recognitionStarted &&
          !partialResultDelivered &&
          !finalResultDelivered &&
          !errorDelivered
        ) {
          logVoiceError('Speech recognition engine not returning results', {
            recognitionStarted,
            speechDetected,
          });
          callbacks.onError?.(
            'engine-no-results',
            'Speech recognition engine not returning results'
          );
        }
      }, 9000);
    };

    if (callbacks.onStart) {
      activeListeners.push(
        ExpoSpeechRecognitionModule.addListener('start', () => {
          latestHeardText = '';
          finalResultDelivered = false;
          partialResultDelivered = false;
          errorDelivered = false;
          recognitionStarted = true;
          speechDetected = false;
          logVoice('VOICE START');
          armNoResultsWatchdog();
          callbacks.onStart?.();
        })
      );
    }

    activeListeners.push(
      ExpoSpeechRecognitionModule.addListener('audiostart', (event) => {
        logVoice('VOICE AUDIO START', event);
      })
    );

    activeListeners.push(
      ExpoSpeechRecognitionModule.addListener('speechstart', (event) => {
        speechDetected = true;
        logVoice('VOICE RECOGNIZED', event);
      })
    );

    activeListeners.push(
      ExpoSpeechRecognitionModule.addListener('speechend', (event) => {
        logVoice('VOICE SPEECH END', event);
      })
    );

    activeListeners.push(
      ExpoSpeechRecognitionModule.addListener('audioend', (event) => {
        logVoice('VOICE AUDIO END', event);
      })
    );

    if (callbacks.onEnd || callbacks.onResults) {
      activeListeners.push(
        ExpoSpeechRecognitionModule.addListener('end', () => {
          clearNoResultsWatchdog();
          logVoice('VOICE END', {
            speechDetected,
            partialResultDelivered,
            finalResultDelivered,
            errorDelivered,
          });

          if (!finalResultDelivered && latestHeardText.trim()) {
            logVoice('Promoting last partial transcript to final result', latestHeardText);
            finalResultDelivered = true;
            callbacks.onResults?.(latestHeardText.trim());
          } else if (
            recognitionStarted &&
            !partialResultDelivered &&
            !finalResultDelivered &&
            !errorDelivered
          ) {
            logVoiceError('Speech recognition engine ended without results', {
              speechDetected,
              latestHeardText,
            });
            callbacks.onError?.(
              'engine-no-results',
              'Speech recognition engine not returning results'
            );
          }

          callbacks.onEnd?.();
        })
      );
    }

    if (callbacks.onResults || callbacks.onPartialResults) {
      activeListeners.push(
        ExpoSpeechRecognitionModule.addListener('result', (event) => {
          logVoice(event.isFinal ? 'VOICE FINAL' : 'VOICE PARTIAL', event.results);
          const text = getBestTranscript(event.results);

          if (!text) {
            return;
          }

          latestHeardText = text;

          if (event.isFinal) {
            logVoice('Final transcript', text);
            finalResultDelivered = true;
            clearNoResultsWatchdog();
            callbacks.onResults?.(text);
          } else {
            logVoice('Partial transcript', text);
            partialResultDelivered = true;
            callbacks.onPartialResults?.(text);
          }
        })
      );
    }

    if (callbacks.onError) {
      activeListeners.push(
        ExpoSpeechRecognitionModule.addListener('error', (event) => {
          if (event.error === 'aborted' && Date.now() <= ignoreAbortErrorsUntil) {
            logVoice('Ignoring internal abort error', event);
            return;
          }

          clearNoResultsWatchdog();
          errorDelivered = true;
          logVoiceError('VOICE ERROR', event);
          callbacks.onError?.(event.error, event.message ?? '');
        })
      );
      activeListeners.push(
        ExpoSpeechRecognitionModule.addListener('nomatch', () => {
          clearNoResultsWatchdog();
          logVoiceError('VOICE NOMATCH');
          callbacks.onError?.('nomatch', 'No se reconocio una estacion valida.');
        })
      );
    }

    return true;
  } catch (error) {
    logVoiceError('configureVoiceRecognition failed', error);
    return false;
  }
}

const LOCALE_FALLBACKS = ['es-CO', 'es-US', 'es-ES', 'en-US'];

export async function startVoiceRecognition(
  preferredLocale = 'es-CO',
  contextualStrings: string[] = []
): Promise<void> {
  if (!isVoiceNativeModuleReady()) {
    throw new Error('Voice native module unavailable');
  }

  const granted = await ensureVoicePermission();
  if (!granted) {
    throw new Error('Microphone permission not granted');
  }

  await resetRecognizerSession(false);

  const sanitizedContextualStrings = Array.from(
    new Set(contextualStrings.map((value) => value.trim()).filter(Boolean))
  ).slice(0, 150);
  const recognitionCandidate = await selectRecognitionCandidate(preferredLocale);

  const availableServices = await getSpeechRecognitionServices();
  const defaultService = ExpoSpeechRecognitionModule.getDefaultRecognitionService();
  const defaultServicePackage =
    typeof defaultService?.packageName === 'string' ? defaultService.packageName : '';

  logVoice('STARTING VOICE...');
  logVoice('VOICE ENGINES', {
    availableServices,
    defaultServicePackage,
  });
  logVoice('Starting speech recognition', {
    chosenLocale: recognitionCandidate.locale,
    supportedLocales: recognitionCandidate.supportedLocales,
    installedLocales: recognitionCandidate.installedLocales,
    contextualStrings: sanitizedContextualStrings.length,
    selectedService: recognitionCandidate.servicePackage ?? 'system-default',
    requiresOnDeviceRecognition:
      recognitionCandidate.requiresOnDeviceRecognition ?? false,
  });

  const startOptions: any = {
    lang: recognitionCandidate.locale,
    interimResults: true,
    maxAlternatives: 3,
    continuous: false,
    requiresOnDeviceRecognition:
      recognitionCandidate.requiresOnDeviceRecognition ?? false,
    addsPunctuation: false,
    contextualStrings: sanitizedContextualStrings,
    androidIntentOptions: {
      EXTRA_LANGUAGE_MODEL: 'web_search',
      EXTRA_PARTIAL_RESULTS: true,
      EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
      EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1200,
    },
  };

  if (recognitionCandidate.servicePackage) {
    logVoice('Using Android recognition service', recognitionCandidate.servicePackage);
    startOptions.androidRecognitionServicePackage = recognitionCandidate.servicePackage;
  } else {
    logVoiceError('No queryable Android recognition service found, falling back to system default', {
      availableServices,
      defaultServicePackage,
    });
  }

  ExpoSpeechRecognitionModule.start(startOptions);
}

export async function stopVoiceRecognition(): Promise<void> {
  try {
    ExpoSpeechRecognitionModule.stop();
  } catch (error) {
    logVoiceError('stopVoiceRecognition failed', error);
  }
}

export async function cancelVoiceRecognition(): Promise<void> {
  try {
    ignoreAbortErrorsUntil = Date.now() + 1500;
    ExpoSpeechRecognitionModule.abort();
  } catch (error) {
    logVoiceError('cancelVoiceRecognition failed', error);
  }
}

export async function destroyVoiceRecognition(): Promise<void> {
  try {
    ignoreAbortErrorsUntil = Date.now() + 1500;
    ExpoSpeechRecognitionModule.abort();
  } catch {
    // Ignore
  } finally {
    removeAllListeners();
  }
}

export async function isSpeechRecognitionAvailable(): Promise<boolean> {
  return isVoiceNativeModuleReady();
}

export async function getSpeechRecognitionServices(): Promise<string[]> {
  try {
    const services = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
    return Array.isArray(services) ? services : [];
  } catch {
    return [];
  }
}
