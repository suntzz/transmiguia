export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calcula la distancia ortodrómica en metros entre dos puntos geográficos usando la fórmula de Haversine.
 * Acepta tanto 4 coordenadas escalares (lat1, lon1, lat2, lon2) como 2 objetos GeoPoint ({latitude, longitude}).
 */
export function calculateDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number;
export function calculateDistanceInMeters(
  origin: GeoPoint,
  destination: GeoPoint
): number;
export function calculateDistanceInMeters(
  arg1: number | GeoPoint,
  arg2: number | GeoPoint,
  arg3?: number,
  arg4?: number
): number {
  let lat1: number;
  let lon1: number;
  let lat2: number;
  let lon2: number;

  if (typeof arg1 === 'object' && typeof arg2 === 'object') {
    lat1 = arg1.latitude;
    lon1 = arg1.longitude;
    lat2 = arg2.latitude;
    lon2 = arg2.longitude;
  } else {
    lat1 = arg1 as number;
    lon1 = arg2 as number;
    lat2 = arg3 as number;
    lon2 = arg4 as number;
  }

  const earthRadius = 6371000;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lon2 - lon1);
  const originLatitude = toRadians(lat1);
  const destinationLatitude = toRadians(lat2);

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadius * arc;
}

export const getDistanceInMeters = calculateDistanceInMeters;
export const calculateDistanceBetweenCoordinates = calculateDistanceInMeters;
