import { PermissionsAndroid, Platform } from 'react-native';

import {
  getLocationPermissionStatus,
  isLocationServicesEnabled,
  requestLocationPermission,
} from '@/src/services/locationService';

export type AppPermissionsState = {
  microphone: boolean;
  location: boolean;
  gpsEnabled: boolean;
};

const MICROPHONE_PERMISSION = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
const LOCATION_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
] as const;

export async function checkAppPermissions(): Promise<AppPermissionsState> {
  if (Platform.OS !== 'android') {
    return {
      microphone: true,
      location: true,
      gpsEnabled: true,
    };
  }

  const microphone = await PermissionsAndroid.check(MICROPHONE_PERMISSION);
  const location = await getLocationPermissionStatus();
  const gpsEnabled = await isLocationServicesEnabled();

  return {
    microphone,
    location,
    gpsEnabled,
  };
}

export async function checkMicrophonePermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  return PermissionsAndroid.check(MICROPHONE_PERMISSION);
}

export async function requestMicrophonePermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const response = await PermissionsAndroid.request(MICROPHONE_PERMISSION, {
    title: 'Permiso de micrófono',
    message:
      'La app necesita acceder al micrófono para reconocer el destino por voz.',
    buttonPositive: 'Permitir',
    buttonNegative: 'Cancelar',
    buttonNeutral: 'Más tarde',
  });

  return response === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestAppPermissions(): Promise<AppPermissionsState> {
  if (Platform.OS !== 'android') {
    return {
      microphone: true,
      location: true,
      gpsEnabled: true,
    };
  }

  const microphoneResponse = await PermissionsAndroid.requestMultiple([
    MICROPHONE_PERMISSION,
    ...LOCATION_PERMISSIONS,
  ]);
  const location = await requestLocationPermission();
  const gpsEnabled = await isLocationServicesEnabled();

  const microphone =
    microphoneResponse[MICROPHONE_PERMISSION] === PermissionsAndroid.RESULTS.GRANTED;
  const fallbackLocation = LOCATION_PERMISSIONS.some(
    (permission) => microphoneResponse[permission] === PermissionsAndroid.RESULTS.GRANTED
  );

  return {
    microphone,
    location: location || fallbackLocation,
    gpsEnabled,
  };
}
