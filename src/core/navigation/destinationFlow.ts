import type { TransmilenioStation } from '@/src/domain/models/Station';

/**
 * Estado de seleccion de ruta compartido entre pantallas (VoicePrototype ->
 * RoutePreview -> WalkingGuide -> ...). Origen, destino y estado del viaje se
 * mantienen como conceptos separados.
 *
 * `destinationStation` conserva un valor "placeholder" para no romper los
 * consumidores tipados, pero SOLO es un destino real cuando
 * `hasSelectedDestination` es true.
 */
export type RouteSelectionState = {
  originStation: TransmilenioStation | null;
  destinationStation: TransmilenioStation;
  hasSelectedDestination: boolean;
  tripFinished: boolean;
};

export function createInitialRouteSelection(
  placeholder: TransmilenioStation
): RouteSelectionState {
  return {
    originStation: null,
    destinationStation: placeholder,
    hasSelectedDestination: false,
    tripFinished: false,
  };
}

export function selectDestination(
  state: RouteSelectionState,
  station: TransmilenioStation
): RouteSelectionState {
  return {
    originStation: null,
    destinationStation: station,
    hasSelectedDestination: true,
    tripFinished: false,
  };
}

/** Descarta destino, origen y estado de viaje: el siguiente recorrido empieza limpio. */
export function clearRouteSelection(
  _state: RouteSelectionState,
  placeholder: TransmilenioStation
): RouteSelectionState {
  return createInitialRouteSelection(placeholder);
}

type DemoJourneyLike = {
  originStation: TransmilenioStation;
  destinationStation: TransmilenioStation;
};

/** Un recorrido demo solo es valido si fue construido para el destino actual. */
export function isDemoJourneyForDestination(
  journey: DemoJourneyLike | null | undefined,
  destination: TransmilenioStation | null | undefined
): boolean {
  return Boolean(
    journey && destination && journey.destinationStation.id === destination.id
  );
}

export const MISSING_DESTINATION_PROMPT =
  'Aun no has elegido un destino. Dime a que estacion quieres ir o seleccionala en la lista.';

export type RoutePreviewPlan =
  | { kind: 'missing_destination'; spokenMessage: string }
  | { kind: 'demo_needs_journey' }
  | { kind: 'demo'; originStation: TransmilenioStation; spokenMessage: string }
  | { kind: 'live'; spokenMessage: string };

/**
 * Decide que debe anunciar RoutePreview.
 *
 * - Sin destino explicito: nunca se anuncia una caminata; se pide el destino.
 * - Modo demo: el origen anunciado es el de la salida simulada del demo y se
 *   rotula como tal (no se presenta como destino).
 * - Modo normal: no existe origen simulado; la caminata va hacia la estacion
 *   mas cercana segun el GPS real (la calcula la guia peatonal).
 */
export function buildRoutePreviewPlan(input: {
  hasSelectedDestination: boolean;
  destinationStation: TransmilenioStation;
  demoModeEnabled: boolean;
  demoJourney: DemoJourneyLike | null;
  demoTargetStation?: TransmilenioStation | null;
}): RoutePreviewPlan {
  const {
    hasSelectedDestination,
    destinationStation,
    demoModeEnabled,
    demoJourney,
    demoTargetStation,
  } = input;

  if (demoModeEnabled) {
    const target =
      demoTargetStation ??
      (hasSelectedDestination ? destinationStation : demoJourney?.destinationStation ?? null);

    if (!target?.name?.trim()) {
      return { kind: 'missing_destination', spokenMessage: MISSING_DESTINATION_PROMPT };
    }

    if (!demoJourney || !isDemoJourneyForDestination(demoJourney, target)) {
      return { kind: 'demo_needs_journey' };
    }

    return {
      kind: 'demo',
      originStation: demoJourney.originStation,
      spokenMessage: `Destino confirmado: ${target.name}. Iniciare la caminata simulada hacia la estacion de salida ${demoJourney.originStation.name}.`,
    };
  }

  if (!hasSelectedDestination || !destinationStation?.name?.trim()) {
    return { kind: 'missing_destination', spokenMessage: MISSING_DESTINATION_PROMPT };
  }

  return {
    kind: 'live',
    spokenMessage: `Destino confirmado: ${destinationStation.name}. Iniciare la caminata hacia la estacion mas cercana.`,
  };
}
