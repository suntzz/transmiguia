import Constants from 'expo-constants';

import { calculateDistanceBetweenCoordinates } from '@/src/core/geo/distance';

export { calculateDistanceBetweenCoordinates };

type Coordinates = {
  latitude: number;
  longitude: number;
};

export type RouteStep = {
  instruction: string;
  distanceMeters: number;
  endLocation: Coordinates;
};

export type RouteSummary = {
  coordinates: Coordinates[];
  distanceText: string;
  durationText: string;
  startAddress: string;
  endAddress: string;
  steps: RouteStep[];
};

export type MapServiceError = {
  code: 'MISSING_API_KEY' | 'DIRECTIONS_FAILED' | 'NO_ROUTE_FOUND';
  message: string;
};

type GoogleDirectionsResponse = {
  status: string;
  error_message?: string;
  routes?: {
    overview_polyline?: {
      points: string;
    };
    legs?: {
      distance?: { text: string };
      duration?: { text: string };
      start_address?: string;
      end_address?: string;
      steps?: {
        html_instructions?: string;
        distance?: { value: number };
        end_location?: {
          lat: number;
          lng: number;
        };
      }[];
    }[];
  }[];
};

type GoogleDirectionsStep = {
  html_instructions?: string;
  distance?: { value: number };
  end_location?: {
    lat: number;
    lng: number;
  };
};

function buildMapError(
  code: MapServiceError['code'],
  message: string
): MapServiceError {
  return { code, message };
}

function buildDirectWalkingInstruction(distanceMeters: number) {
  const roundedDistance = Math.max(10, Math.round(distanceMeters));
  return roundedDistance > 120
    ? 'Sigue recto hasta la estacion.'
    : 'Continua hasta la estacion.';
}

function decodePolyline(encoded: string): Coordinates[] {
  const coordinates: Coordinates[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push({
      latitude: latitude / 1e5,
      longitude: longitude / 1e5,
    });
  }

  return coordinates;
}

function getDirectionsApiKey() {
  return (Constants.expoConfig?.extra?.directionsApiKey ??
    Constants.expoConfig?.extra?.googleMapsApiKey ??
    Constants.expoConfig?.extra?.mapsAndroidApiKey ??
    Constants.expoConfig?.extra?.googleMapsAndroidApiKey) as string | undefined;
}

function maskApiKey(apiKey: string) {
  if (apiKey.length <= 10) {
    return '***';
  }

  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
}

function logDirections(message: string, details?: Record<string, unknown>) {
  if (!__DEV__) {
    return;
  }

  if (details) {
    console.info(`[API DEBUG] ${message}`, details);
    return;
  }

  console.info(`[API DEBUG] ${message}`);
}

function warnDirections(message: string, details?: Record<string, unknown>) {
  if (details) {
    console.warn(`[API ERROR] ${message}`, details);
    return;
  }

  console.warn(`[API ERROR] ${message}`);
}

function stripHtml(html: string) {
  return html
    .replace(/<div[^>]*>/gi, '. ')
    .replace(/<\/div>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, ' y ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeInstructionText(instruction: string) {
  return stripHtml(instruction)
    .replace(/\b(north|south|east|west|northwest|northeast|southwest|southeast)\b/gi, '')
    .replace(/\bmeters\b/gi, 'metros')
    .replace(/\bmeter\b/gi, 'metro')
    .replace(/\bkilometers\b/gi, 'kilometros')
    .replace(/\bkilometer\b/gi, 'kilometro')
    .replace(/\s+,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStreetReference(instruction: string) {
  const cleanedInstruction = instruction
    .replace(/\b(toward|towards|hacia)\b.*$/i, '')
    .replace(/\b(destination will be on the left|destination will be on the right)\b.*$/i, '')
    .replace(/\b(arrive at|llega a)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const referenceMatch =
    cleanedInstruction.match(/\b(?:onto|on|via|por|en)\s+([^,]+)$/i) ??
    cleanedInstruction.match(/\b(?:onto|on|via)\s+(.+)$/i);

  const reference = referenceMatch?.[1]
    ?.replace(/^the\s+/i, '')
    .replace(/\b(exit|salida)\b.*$/i, '')
    .trim();

  return reference && reference.length > 1 ? reference : null;
}

function appendStreetReference(baseInstruction: string, reference: string | null) {
  if (!reference) {
    return baseInstruction;
  }

  if (/^Sigue recto|^Continua recto|^Continua/i.test(baseInstruction)) {
    return `${baseInstruction} por ${reference}`;
  }

  if (/^Gira|^Mantente/i.test(baseInstruction)) {
    return `${baseInstruction} hacia ${reference}`;
  }

  return `${baseInstruction} por ${reference}`;
}

function simplifyInstruction(instruction: string) {
  const normalizedInstruction = normalizeInstructionText(instruction);
  const lowerInstruction = normalizedInstruction.toLowerCase();
  const streetReference = extractStreetReference(normalizedInstruction);

  if (
    /destination will be on the left|destination will be on the right|arrive at|llega a/.test(
      lowerInstruction
    )
  ) {
    return 'Continua hasta la estacion.';
  }

  if (/take the stairs|stairs|escaleras/.test(lowerInstruction)) {
    return 'Usa las escaleras.';
  }

  if (/cross|cruza/.test(lowerInstruction)) {
    return 'Cruza la via.';
  }

  if (/keep left|slight left|turn left|gira a la izquierda/.test(lowerInstruction)) {
    return appendStreetReference('Gira a la izquierda', streetReference);
  }

  if (/keep right|slight right|turn right|gira a la derecha/.test(lowerInstruction)) {
    return appendStreetReference('Gira a la derecha', streetReference);
  }

  if (/walk|head|camina/.test(lowerInstruction)) {
    return appendStreetReference('Sigue recto', streetReference);
  }

  if (/continue|straight|continua|mantente/.test(lowerInstruction)) {
    return appendStreetReference('Continua recto', streetReference);
  }

  if (streetReference) {
    return `Continua por ${streetReference}`;
  }

  return 'Continua hasta la estacion.';
}

function mapStepToInstruction(step: GoogleDirectionsStep): RouteStep | null {
  if (!step.end_location) {
    return null;
  }

  return {
    instruction: simplifyInstruction(step.html_instructions ?? 'Continua por la via.'),
    distanceMeters: step.distance?.value ?? 0,
    endLocation: {
      latitude: step.end_location.lat,
      longitude: step.end_location.lng,
    },
  };
}

export function createFallbackWalkingRoute(
  origin: Coordinates,
  destination: Coordinates
): RouteSummary {
  const distanceMeters = calculateDistanceBetweenCoordinates(origin, destination);
  const roundedMinutes = Math.max(1, Math.round(distanceMeters / 75));

  return {
    coordinates: [origin, destination],
    distanceText: `${Math.round(distanceMeters)} m`,
    durationText: `${roundedMinutes} min`,
    startAddress: 'Ubicacion actual',
    endAddress: 'Estacion cercana',
    steps: [
      {
        instruction: buildDirectWalkingInstruction(distanceMeters),
        distanceMeters,
        endLocation: destination,
      },
    ],
  };
}

export async function getRouteToStation(
  origin: Coordinates,
  destination: Coordinates
): Promise<RouteSummary> {
  const apiKey = getDirectionsApiKey();

  if (!apiKey) {
    throw buildMapError(
      'MISSING_API_KEY',
      'Falta configurar DIRECTIONS_API_KEY o EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_API_KEY.'
    );
  }

  const query = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    mode: 'walking',
    language: 'es',
    region: 'co',
    units: 'metric',
    key: apiKey,
  });

  const requestUrl = `https://maps.googleapis.com/maps/api/directions/json?${query.toString()}`;

  logDirections('Solicitando ruta peatonal', {
    origin,
    destination,
    key: maskApiKey(apiKey),
  });

  let response: Response;

  try {
    response = await fetch(requestUrl);
  } catch (error) {
    warnDirections('Fallo de red al consultar Google Directions', {
      message: String(error),
    });
    throw buildMapError(
      'DIRECTIONS_FAILED',
      'No fue posible conectarse con Google Directions.'
    );
  }

  let data: GoogleDirectionsResponse | null = null;

  try {
    data = (await response.json()) as GoogleDirectionsResponse;
  } catch (error) {
    warnDirections('No se pudo interpretar la respuesta de Directions', {
      httpStatus: response.status,
      message: String(error),
    });
  }

  logDirections('Respuesta recibida', {
    httpStatus: response.status,
    googleStatus: data?.status ?? 'UNKNOWN',
    routes: data?.routes?.length ?? 0,
    errorMessage: data?.error_message ?? null,
  });

  if (!response.ok) {
    warnDirections('HTTP no exitoso desde Google Directions', {
      httpStatus: response.status,
      errorMessage: data?.error_message ?? null,
    });
    throw buildMapError(
      'DIRECTIONS_FAILED',
      data?.error_message ?? 'La API de Google Directions no respondio correctamente.'
    );
  }

  if (!data) {
    throw buildMapError(
      'DIRECTIONS_FAILED',
      'Google Directions respondio sin un cuerpo valido.'
    );
  }

  if (data.status !== 'OK') {
    warnDirections('Google Directions devolvio un estado distinto de OK', {
      status: data.status,
      errorMessage: data.error_message ?? null,
    });

    const requestDeniedMessage =
      data.status === 'REQUEST_DENIED'
        ? 'Google Directions rechazo la solicitud. Revisa si la llave tiene restricciones y si Directions API y Maps SDK for Android estan habilitados.'
        : null;

    throw buildMapError(
      'DIRECTIONS_FAILED',
      requestDeniedMessage ??
        data.error_message ??
        `Google Directions devolvio estado ${data.status}.`
    );
  }

  const route = data.routes?.[0];
  const leg = route?.legs?.[0];
  const polyline = route?.overview_polyline?.points;

  if (!route || !leg || !polyline) {
    warnDirections('Google Directions no devolvio una ruta utilizable');
    throw buildMapError(
      'NO_ROUTE_FOUND',
      'No se encontro una ruta valida hacia la estacion seleccionada.'
    );
  }

  const coordinates = decodePolyline(polyline);
  const steps = (leg.steps ?? [])
    .map((step) => mapStepToInstruction(step))
    .filter((step): step is RouteStep => step != null);

  logDirections('Ruta procesada correctamente', {
    polylinePoints: coordinates.length,
    steps: steps.length,
    distanceText: leg.distance?.text ?? null,
    durationText: leg.duration?.text ?? null,
  });

  return {
    coordinates,
    distanceText: leg.distance?.text ?? 'Sin distancia',
    durationText: leg.duration?.text ?? 'Sin tiempo',
    startAddress: leg.start_address ?? 'Origen',
    endAddress: leg.end_address ?? 'Destino',
    steps,
  };
}
