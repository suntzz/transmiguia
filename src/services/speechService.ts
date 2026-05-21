import * as Speech from 'expo-speech';

import {
  BusTransitLeg,
  RoutePlan,
  TransmilenioStation,
  WalkTransitLeg,
  getBusLegs,
} from '@/src/services/transmilenioService';
import { RouteStep } from '@/src/services/mapService';
import { ProximityStage } from '@/src/utils/proximity';

const DEFAULT_OPTIONS: Speech.SpeechOptions = {
  language: 'es-CO',
  rate: 0.98,
  pitch: 1,
};

type SpeechMemoryEntry = {
  message: string;
  timestamp: number;
};

type QueuedSpeechEntry = {
  id: number;
  message: string;
};

type SpeakManagedOptions = {
  key?: string;
  minIntervalMs?: number;
  interrupt?: boolean;
  pauseMs?: number;
  ignoreGlobalCooldown?: boolean;
};

const speechMemory = new Map<string, SpeechMemoryEntry>();
let speechQueue = Promise.resolve(false);
let speechGeneration = 0;
let isSpeaking = false;
let queuedMessages: QueuedSpeechEntry[] = [];
let nextQueuedMessageId = 0;
let lastSpeechStartedAt = 0;
let lastSpeechFinishedAt = 0;
let lastGlobalMessageTimestamp = 0;
const GLOBAL_SPEECH_COOLDOWN_MS = 3500;

function logSpeech(message: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.info('[Speech]', message, details);
    return;
  }

  console.info('[Speech]', message);
}

function shouldSpeak(message: string, key: string, minIntervalMs: number) {
  const previous = speechMemory.get(key);

  if (!previous) {
    return true;
  }

  const enoughTimePassed = Date.now() - previous.timestamp >= minIntervalMs;
  const changedMessage = previous.message !== message;

  return enoughTimePassed || changedMessage;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function removeQueuedMessageById(queueEntryId: number) {
  const messageIndex = queuedMessages.findIndex((entry) => entry.id === queueEntryId);

  if (messageIndex === -1) {
    return;
  }

  queuedMessages = [
    ...queuedMessages.slice(0, messageIndex),
    ...queuedMessages.slice(messageIndex + 1),
  ];
}

function estimateSpeechDuration(message: string) {
  const estimatedDurationMs = message.trim().length * 82;

  return Math.min(15000, Math.max(2800, estimatedDurationMs));
}

async function speakWithPause(
  message: string,
  pauseMs: number,
  generation: number,
  ignoreGlobalCooldown = false
) {
  if (generation !== speechGeneration) {
    return false;
  }

  if (lastSpeechStartedAt > 0 || lastSpeechFinishedAt > 0) {
    const now = Date.now();
    const timeSinceLastSpeechFinished = now - lastSpeechFinishedAt;
    const timeSinceLastSpeechStarted = now - lastSpeechStartedAt;
    const pauseAfterLastSpeech =
      pauseMs > 0 ? Math.max(0, pauseMs - timeSinceLastSpeechFinished) : 0;
    const globalCooldown =
      ignoreGlobalCooldown || lastGlobalMessageTimestamp === 0
        ? 0
        : Math.max(0, GLOBAL_SPEECH_COOLDOWN_MS - timeSinceLastSpeechStarted);
    const waitTime = Math.max(pauseAfterLastSpeech, globalCooldown);

    if (waitTime > 0) {
      await wait(waitTime);
    }
  }

  if (generation !== speechGeneration) {
    return false;
  }

  await new Promise<void>((resolve) => {
    let finished = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    isSpeaking = true;
    lastSpeechStartedAt = Date.now();
    lastGlobalMessageTimestamp = lastSpeechStartedAt;

    const finish = () => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timeoutId);
      isSpeaking = false;
      lastSpeechFinishedAt = Date.now();
      resolve();
    };

    timeoutId = setTimeout(() => {
      if (__DEV__) {
        console.warn('[Speech] Se uso el timeout de respaldo para cerrar una locucion.', {
          message,
        });
      }

      finish();
    }, estimateSpeechDuration(message));

    Speech.speak(message, {
      ...DEFAULT_OPTIONS,
      onDone: finish,
      onStopped: finish,
      onError: finish,
    });
  });

  return generation === speechGeneration;
}

export async function waitForSpeechQueue() {
  let pendingQueue = speechQueue;

  while (true) {
    await pendingQueue;

    if (pendingQueue === speechQueue && !isSpeaking && queuedMessages.length === 0) {
      return;
    }

    pendingQueue = speechQueue;
  }
}

export function waitForNarrationPause(ms = 2000) {
  return wait(ms);
}

export async function waitForSpeechToSettle(ms = 2000) {
  await waitForSpeechQueue();
  await waitForNarrationPause(ms);
}

function getDirectionLabel(direction: BusTransitLeg['direction']) {
  return direction.toLowerCase();
}

function isRicaurteTunnelTransfer(leg?: WalkTransitLeg | null) {
  return Boolean(
    leg &&
      leg.from.name.toLowerCase().includes('ricaurte') &&
      leg.to.name.toLowerCase().includes('ricaurte')
  );
}

function isJimenezCorridorTransfer(leg?: WalkTransitLeg | null) {
  return Boolean(
    leg &&
      leg.from.name.toLowerCase().includes('jimenez') &&
      leg.to.name.toLowerCase().includes('jimenez')
  );
}

function isLasNievesAccessTransfer(leg?: WalkTransitLeg | null) {
  return Boolean(leg && leg.from.id === 'las-nieves');
}

function buildBusInstruction(leg: BusTransitLeg, options?: { includeDestination?: boolean }) {
  const destinationSuffix = options?.includeDestination ? ` hasta ${leg.to.name}` : '';

  return `Toma el bus ${leg.routeCode} hacia el ${getDirectionLabel(leg.direction)}${destinationSuffix}.`;
}

function buildTransferInstruction(leg: BusTransitLeg) {
  return `Haz transbordo y toma el bus ${leg.routeCode} hacia el ${getDirectionLabel(
    leg.direction
  )} hasta ${leg.to.name}.`;
}

function buildWalkTransferInstruction(leg: WalkTransitLeg) {
  if (isRicaurteTunnelTransfer(leg)) {
    return 'Haz transbordo en Ricaurte. Cambia de plataforma por el tunel.';
  }

  if (isJimenezCorridorTransfer(leg)) {
    return 'Haz transbordo en Avenida Jimenez. Cambia de corredor hacia el Eje Ambiental.';
  }

  if (isLasNievesAccessTransfer(leg)) {
    return 'Baja en Las Nieves y camina hacia el Eje Ambiental.';
  }

  return `Haz transbordo caminando hasta ${leg.to.name}.`;
}

export async function speakManagedText(
  message: string,
  {
    key = message,
    minIntervalMs = 12000,
    interrupt = false,
    pauseMs = 1200,
    ignoreGlobalCooldown = false,
  }: SpeakManagedOptions = {}
) {
  if (!shouldSpeak(message, key, minIntervalMs)) {
    return false;
  }

  if (interrupt) {
    await stopSpeaking();
  }

  const generation = speechGeneration;
  const queueEntry = {
    id: (nextQueuedMessageId += 1),
    message,
  };
  queuedMessages = [...queuedMessages, queueEntry];

  speechQueue = speechQueue.then(async () => {
    const nextQueuedMessage = queuedMessages[0];

    if (generation !== speechGeneration) {
      queuedMessages =
        nextQueuedMessage?.id === queueEntry.id ? queuedMessages.slice(1) : queuedMessages;
      return false;
    }

    speechMemory.set(key, {
      message,
      timestamp: Date.now(),
    });
    logSpeech('enqueue', {
      key,
      message,
      pauseMs,
      interrupt,
      queueSize: queuedMessages.length,
    });

    try {
      return await speakWithPause(
        message,
        pauseMs,
        generation,
        ignoreGlobalCooldown || interrupt
      );
    } finally {
      if (queuedMessages[0]?.id === queueEntry.id) {
        queuedMessages = queuedMessages.slice(1);
      } else {
        removeQueuedMessageById(queueEntry.id);
      }
    }
  });

  return speechQueue;
}

export async function speakAndWait(
  message: string,
  options: SpeakManagedOptions = {}
) {
  await speakManagedText(message, options);
  await waitForSpeechQueue();
}

export async function stopSpeaking() {
  speechGeneration += 1;
  const currentGen = speechGeneration;
  queuedMessages = [];
  isSpeaking = false;
  
  try {
    const currentlySpeaking = await Speech.isSpeakingAsync();
    if (currentlySpeaking) {
      Speech.stop();
    }
  } catch (err) {
    if (__DEV__) console.warn('[Speech] Error stopping speech', err);
  }

  // Overwrite the queue with a fresh start that respects the new generation
  speechQueue = Promise.resolve(false);
  lastSpeechFinishedAt = Date.now();
  
  // Return true if we successfully reached this point in the current generation
  return currentGen === speechGeneration;
}

export function speakStationProximity(
  station: TransmilenioStation,
  stage: ProximityStage,
  _distanceMeters: number
) {
  const messages: Record<ProximityStage, string> = {
    far: `Vas bien, sigue hacia ${station.name}.`,
    near: 'Vas bien, ya estas cerca.',
    very_near: 'Sigue asi, ya casi llegas.',
    arrived: 'Ya llegaste.',
  };

  return speakManagedText(messages[stage], {
    key: `station-proximity-${station.id}-${stage}`,
    minIntervalMs: 12000,
    interrupt: stage === 'arrived',
    pauseMs: 1400,
  });
}

export function speakVoiceError() {
  return speakManagedText(
    'No te escuche bien, intenta otra vez.',
    {
      key: 'voice-error',
      minIntervalMs: 8000,
      interrupt: true,
      pauseMs: 1600,
    }
  );
}

export function speakDestinationConfirmationPrompt(stationName: string) {
  return speakAndWait(`Quieres ir a ${stationName}?`, {
    key: `destination-confirmation-${stationName}`,
    minIntervalMs: 0,
    interrupt: true,
    pauseMs: 1400,
  });
}

export function speakDestinationOptions(stationNames: string[]) {
  const options = stationNames.filter(Boolean).slice(0, 3);
  const message =
    options.length > 0
      ? `No te entendi del todo. Te refieres a ${options.join(', ')}?`
      : 'No te escuche bien, intenta otra vez.';

  return speakAndWait(message, {
    key: `destination-options-${options.join('-') || 'retry'}`,
    minIntervalMs: 0,
    interrupt: true,
    pauseMs: 1500,
  });
}

export function speakDestinationConfirmed(stationName: string) {
  return speakAndWait(`Perfecto. Destino seleccionado: ${stationName}.`, {
    key: `destination-confirmed-${stationName}`,
    minIntervalMs: 0,
    interrupt: true,
    pauseMs: 1500,
  });
}

export function speakNavigationStarted(stationName?: string) {
  const message = stationName
    ? `Vamos hacia ${stationName}.`
    : 'Vamos hacia la estacion mas cercana.';

  return speakManagedText(message, {
    key: `navigation-started-${stationName ?? 'nearest-station'}`,
    minIntervalMs: 6000,
    interrupt: true,
    pauseMs: 1600,
  });
}

export function speakNavigationInstruction(
  step: RouteStep,
  options?: { stepKey?: string; interrupt?: boolean }
) {
  const stepKey =
    options?.stepKey ??
    `${step.instruction.trim().toLowerCase()}-${step.endLocation.latitude.toFixed(5)}-${step.endLocation.longitude.toFixed(5)}`;

  return speakManagedText(step.instruction, {
    key: `navigation-step-${stepKey}`,
    minIntervalMs: 8000,
    interrupt: options?.interrupt ?? false,
    pauseMs: 1800,
  });
}

export function speakStationArrival(stationName: string) {
  return speakManagedText(`Has llegado a ${stationName}.`, {
    key: `station-arrival-${stationName}`,
    minIntervalMs: 10000,
    interrupt: true,
    pauseMs: 1800,
  });
}

export function speakNextStation(stationName: string) {
  return speakManagedText(`Vas bien, proxima estacion: ${stationName}.`, {
    key: `bus-next-station-${stationName}`,
    minIntervalMs: 8000,
    pauseMs: 1600,
  });
}

export function speakPrepareToDrop() {
  return speakManagedText('Preparate, estas cerca de tu parada.', {
    key: 'bus-prepare-to-drop',
    minIntervalMs: 9000,
    interrupt: true,
    pauseMs: 1700,
  });
}

export function speakPrepareForTransfer(options?: {
  transferWalkLeg?: WalkTransitLeg | null;
  nextLeg?: BusTransitLeg | null;
  stationName?: string | null;
}) {
  const message = isRicaurteTunnelTransfer(options?.transferWalkLeg)
    ? 'Preparate para bajar, haras transbordo en Ricaurte.'
    : isJimenezCorridorTransfer(options?.transferWalkLeg)
      ? 'Preparate para bajar, haras transbordo en Avenida Jimenez.'
      : options?.stationName === 'Museo Nacional'
        ? 'Preparate para bajar en Museo Nacional.'
        : options?.stationName === 'Las Nieves'
          ? 'Preparate para bajar en Las Nieves.'
      : 'Preparate para bajar, haras transbordo.';

  return speakManagedText(message, {
    key: `bus-prepare-transfer-${options?.transferWalkLeg?.from.id ?? options?.nextLeg?.routeCode ?? 'generic'}`,
    minIntervalMs: 9000,
    interrupt: true,
    pauseMs: 1700,
  });
}

export function speakNearFinalDestination() {
  return speakManagedText('Estas cerca de tu destino.', {
    key: 'bus-near-final-destination',
    minIntervalMs: 9000,
    interrupt: true,
    pauseMs: 1700,
  });
}

export async function speakTransitPlanSummary(
  originStationName: string,
  destinationStationName: string,
  routePlan: RoutePlan | null,
  options?: { userAlreadyAtOriginStation?: boolean }
) {
  const busLegs = getBusLegs(routePlan);
  const messages = [
    options?.userAlreadyAtOriginStation
      ? `Ya estas en la estacion ${originStationName}.`
      : `Dirigete a la estacion mas cercana: ${originStationName}.`,
  ];

  if (!routePlan || busLegs.length === 0) {
    messages.push(`No encontre una ruta valida hasta ${destinationStationName}.`);
  } else {
    const [firstLeg] = busLegs;

    if (firstLeg) {
      messages.push(buildBusInstruction(firstLeg, { includeDestination: true }));
    }

    let previousLegWasWalkTransfer = false;

    for (const leg of routePlan.legs.slice(1)) {
      if (leg.type === 'walk' && leg.isTransferLeg) {
        messages.push(buildWalkTransferInstruction(leg));
        previousLegWasWalkTransfer = true;
        continue;
      }

      if (leg.type !== 'bus') {
        continue;
      }

      messages.push(
        previousLegWasWalkTransfer
          ? buildBusInstruction(leg, { includeDestination: true })
          : buildTransferInstruction(leg)
      );
      previousLegWasWalkTransfer = false;
    }
  }

  for (const [index, message] of messages.entries()) {
    await speakAndWait(message, {
      key: `transit-plan-${originStationName}-${destinationStationName}-${index}`,
      minIntervalMs: 0,
      pauseMs: 1800,
    });
  }
}

export function speakTransferNotice(
  transferStationName: string,
  destinationStationName: string,
  nextLeg?: BusTransitLeg | null,
  transferWalkLeg?: WalkTransitLeg | null
) {
  const message = isRicaurteTunnelTransfer(transferWalkLeg)
    ? nextLeg
      ? `Baja en Ricaurte y cambia de plataforma por el tunel. Luego toma el bus ${nextLeg.routeCode} hacia el ${getDirectionLabel(
          nextLeg.direction
        )}.`
      : 'Baja en Ricaurte y cambia de plataforma por el tunel.'
    : isJimenezCorridorTransfer(transferWalkLeg)
      ? nextLeg
        ? `Baja en Avenida Jimenez y cambia de corredor. Sigue las senales hacia el Eje Ambiental. Luego toma el bus ${nextLeg.routeCode} hacia el ${getDirectionLabel(
            nextLeg.direction
          )}.`
        : 'Baja en Avenida Jimenez y cambia de corredor hacia el Eje Ambiental.'
    : nextLeg
      ? `Baja aqui y toma el siguiente bus ${nextLeg.routeCode} hacia el ${getDirectionLabel(
          nextLeg.direction
        )}.`
      : `Baja aqui y continua el transbordo hacia ${destinationStationName}.`;

  return speakManagedText(
    message,
    {
      key: `transfer-notice-${transferStationName}-${nextLeg?.routeCode ?? transferWalkLeg?.to.id ?? destinationStationName}`,
      minIntervalMs: 8000,
      interrupt: true,
      pauseMs: 1800,
    }
  );
}

export async function speakTransferArrivalSequence(
  nextLeg?: BusTransitLeg | null,
  transferWalkLeg?: WalkTransitLeg | null,
  stationName?: string | null
) {
  const isRicaurteTransfer = isRicaurteTunnelTransfer(transferWalkLeg);
  const isJimenezTransfer = isJimenezCorridorTransfer(transferWalkLeg);
  const isLasNievesTransfer = isLasNievesAccessTransfer(transferWalkLeg) || stationName === 'Las Nieves';
  const isMuseoNacionalTransfer = stationName === 'Museo Nacional';

  await speakAndWait(
    isRicaurteTransfer
      ? 'Baja en Ricaurte.'
      : isJimenezTransfer
        ? 'Baja en Avenida Jimenez.'
        : isLasNievesTransfer
          ? 'Baja en Las Nieves.'
          : isMuseoNacionalTransfer
            ? 'Baja en Museo Nacional.'
        : 'Baja aqui.',
    {
    key: `transfer-arrival-exit-${nextLeg?.routeCode ?? transferWalkLeg?.to.id ?? 'generic'}`,
    minIntervalMs: 0,
    interrupt: true,
    pauseMs: 1200,
    ignoreGlobalCooldown: true,
    }
  );

  if (isRicaurteTransfer) {
    await speakAndWait('Haz transbordo por el tunel.', {
      key: `transfer-arrival-tunnel-${nextLeg?.routeCode ?? 'ricaurte'}`,
      minIntervalMs: 0,
      pauseMs: 1300,
      ignoreGlobalCooldown: true,
    });

    await speakAndWait('Sigue las senales hacia la otra linea.', {
      key: `transfer-arrival-signals-${nextLeg?.routeCode ?? 'ricaurte'}`,
      minIntervalMs: 0,
      pauseMs: 1400,
      ignoreGlobalCooldown: true,
    });
  }

  if (isJimenezTransfer) {
    await speakAndWait('Cambia de corredor.', {
      key: `transfer-arrival-corridor-${nextLeg?.routeCode ?? 'jimenez'}`,
      minIntervalMs: 0,
      pauseMs: 1300,
      ignoreGlobalCooldown: true,
    });

    await speakAndWait('Sigue las senales hacia el Eje Ambiental.', {
      key: `transfer-arrival-eje-${nextLeg?.routeCode ?? 'jimenez'}`,
      minIntervalMs: 0,
      pauseMs: 1400,
      ignoreGlobalCooldown: true,
    });
  }

  if (isLasNievesTransfer) {
    await speakAndWait(
      nextLeg ? 'Camina hacia el siguiente tramo.' : 'Camina hacia tu destino.',
      {
        key: `transfer-arrival-las-nieves-${nextLeg?.routeCode ?? 'walk'}`,
        minIntervalMs: 0,
        pauseMs: 1300,
        ignoreGlobalCooldown: true,
      }
    );
  }

  if (isMuseoNacionalTransfer) {
    await speakAndWait(
      nextLeg ? 'Continua el recorrido desde Museo Nacional.' : 'Continua hacia tu destino.',
      {
        key: `transfer-arrival-museo-nacional-${nextLeg?.routeCode ?? 'final'}`,
        minIntervalMs: 0,
        pauseMs: 1300,
        ignoreGlobalCooldown: true,
      }
    );
  }

  await speakAndWait(
    nextLeg
      ? `Ahora toma el bus ${nextLeg.routeCode} hacia el ${getDirectionLabel(nextLeg.direction)}.`
      : 'Ahora continua con el siguiente tramo.',
    {
      key: `transfer-arrival-next-leg-${nextLeg?.routeCode ?? 'generic'}`,
      minIntervalMs: 0,
      pauseMs: 1500,
      ignoreGlobalCooldown: true,
    }
  );
}

export async function speakFinalDestinationArrival(stationName: string) {
  await speakAndWait('Llegaste a tu destino.', {
    key: `final-destination-arrival-${stationName}-1`,
    minIntervalMs: 0,
    interrupt: true,
    pauseMs: 1200,
    ignoreGlobalCooldown: true,
  });

  await speakAndWait(`Has llegado a ${stationName}.`, {
    key: `final-destination-arrival-${stationName}-2`,
    minIntervalMs: 0,
    pauseMs: 1500,
    ignoreGlobalCooldown: true,
  });

  await speakAndWait('Buen viaje. Gracias por usar la app.', {
    key: `final-destination-arrival-${stationName}-3`,
    minIntervalMs: 0,
    pauseMs: 1500,
    ignoreGlobalCooldown: true,
  });
}

export async function speakWrongStopSequence(options: {
  continueFromCurrentStation: boolean;
  nearestStationName?: string;
}) {
  await speakAndWait('Te bajaste en una estacion incorrecta.', {
    key: 'wrong-stop-sequence-1',
    minIntervalMs: 0,
    pauseMs: 1200,
    ignoreGlobalCooldown: true,
  });

  await speakAndWait('Voy a ayudarte a retomar la ruta.', {
    key: 'wrong-stop-sequence-2',
    minIntervalMs: 0,
    pauseMs: 1400,
    ignoreGlobalCooldown: true,
  });

  await speakAndWait(
    options.continueFromCurrentStation
      ? 'Continua desde esta estacion.'
      : options.nearestStationName
        ? `Dirigete a la estacion mas cercana: ${options.nearestStationName}.`
        : 'Dirigete a la estacion mas cercana.',
    {
      key: `wrong-stop-sequence-${options.continueFromCurrentStation ? 'continue' : options.nearestStationName ?? 'walk'}-3`,
      minIntervalMs: 0,
      pauseMs: 1500,
      ignoreGlobalCooldown: true,
    }
  );
}

export function speakRouteAlert(message: string, key = 'route-alert') {
  return speakManagedText(message, {
    key,
    minIntervalMs: 6000,
    interrupt: true,
    pauseMs: 1500,
  });
}

export async function speakLostRouteSequence(
  nearestStationName?: string,
  reason: 'off-route' | 'passed' | 'no-progress' | 'retroceded' = 'off-route'
) {
  const firstMessage =
    reason === 'passed'
      ? 'Te pasaste, recalculando ruta.'
      : reason === 'retroceded'
        ? 'Parece que retrocediste en la ruta.'
        : reason === 'no-progress'
          ? 'Parece que te perdiste en el recorrido.'
          : 'Parece que te saliste de la ruta.';

  await speakAndWait(firstMessage, {
    key: `lost-sequence-${reason}-1`,
    minIntervalMs: 0,
    interrupt: true,
    pauseMs: 1200,
    ignoreGlobalCooldown: true,
  });

  await speakAndWait('Voy a ayudarte a reubicarte.', {
    key: `lost-sequence-${reason}-2`,
    minIntervalMs: 0,
    pauseMs: 1400,
    ignoreGlobalCooldown: true,
  });

  await speakAndWait('Recalculando desde tu ubicacion actual.', {
    key: `lost-sequence-${reason}-3`,
    minIntervalMs: 0,
    pauseMs: 1400,
    ignoreGlobalCooldown: true,
  });

  await speakAndWait(
    nearestStationName
      ? `Te dirigire a la estacion mas cercana: ${nearestStationName}.`
      : 'Te dirigire a la estacion mas cercana.',
    {
      key: `lost-sequence-${reason}-${nearestStationName ?? 'nearest'}-4`,
      minIntervalMs: 0,
      pauseMs: 1500,
      ignoreGlobalCooldown: true,
    }
  );
}

export function speakBusApproaching(leg?: BusTransitLeg | null) {
  const message = leg
    ? `El bus ${leg.routeCode} hacia el ${getDirectionLabel(leg.direction)} ya viene llegando.`
    : 'El bus ya viene llegando.';

  return speakAndWait(message, {
    key: `bus-approaching-${leg?.routeCode ?? 'generic'}-${leg?.to.id ?? 'next'}`,
    minIntervalMs: 0,
    interrupt: true,
    pauseMs: 1800,
  });
}

export function speakBoardingReady(leg?: BusTransitLeg | null) {
  const message = leg
    ? `Ya puedes abordar el bus ${leg.routeCode}.`
    : 'Ya puedes abordar.';

  return speakAndWait(message, {
    key: `bus-boarding-ready-${leg?.routeCode ?? 'generic'}-${leg?.to.id ?? 'next'}`,
    minIntervalMs: 0,
    interrupt: false,
    pauseMs: 1800,
  });
}

export function speakBusSuitability(options: {
  expectedBusCode?: string | null;
  detectedBusCode?: string | null;
  isCorrectBus: boolean;
}) {
  const message = options.isCorrectBus
    ? options.expectedBusCode
      ? `Este bus te sirve. Es el ${options.expectedBusCode}.`
      : 'Este bus te sirve.'
    : options.expectedBusCode && options.detectedBusCode
      ? `Este no es tu bus. Espera el ${options.expectedBusCode}. Ahora llego ${options.detectedBusCode}.`
      : options.expectedBusCode
        ? `Este no es tu bus. Espera el ${options.expectedBusCode}.`
        : 'Este no es tu bus.';

  return speakAndWait(message, {
    key: `bus-suitability-${options.expectedBusCode ?? 'unknown'}-${options.detectedBusCode ?? 'none'}-${options.isCorrectBus ? 'ok' : 'wrong'}`,
    minIntervalMs: 0,
    interrupt: true,
    pauseMs: 1500,
  });
}

export function speakBoardingReminder(leg?: BusTransitLeg | null) {
  const message = leg?.routeCode
    ? `El bus ${leg.routeCode} ya esta listo. Cuando puedas, aborda ahora.`
    : 'Cuando puedas, aborda ahora.';

  return speakAndWait(message, {
    key: `bus-boarding-reminder-${leg?.routeCode ?? 'generic'}-${leg?.to.id ?? 'next'}`,
    minIntervalMs: 12000,
    interrupt: false,
    pauseMs: 1800,
  });
}
