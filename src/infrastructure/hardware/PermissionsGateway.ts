import { PermissionsAndroid, Platform } from 'react-native';
import type {
  AppPermissionsState,
  IPermissionsGateway,
} from '@/src/domain/gateways/IPermissionsGateway';
import { expoLocationGateway } from './ExpoLocationGateway';

const MICROPHONE_PERMISSION =
  Platform.OS === 'android' && PermissionsAndroid?.PERMISSIONS
    ? PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    : '';

const LOCATION_PERMISSIONS =
  Platform.OS === 'android' && PermissionsAndroid?.PERMISSIONS
    ? [
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]
    : [];

export class PermissionsGateway implements IPermissionsGateway {
  async checkAppPermissions(): Promise<AppPermissionsState> {
    if (Platform.OS !== 'android' || !PermissionsAndroid) {
      return {
        microphone: true,
        location: true,
        gpsEnabled: true,
      };
    }

    const microphone = MICROPHONE_PERMISSION
      ? await PermissionsAndroid.check(MICROPHONE_PERMISSION)
      : true;
    const location = await expoLocationGateway.getPermissionStatus();
    const gpsEnabled = await expoLocationGateway.isServicesEnabled();

    return {
      microphone,
      location,
      gpsEnabled,
    };
  }

  async checkMicrophonePermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !PermissionsAndroid || !MICROPHONE_PERMISSION) {
      return true;
    }

    return PermissionsAndroid.check(MICROPHONE_PERMISSION);
  }

  async requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !PermissionsAndroid || !MICROPHONE_PERMISSION) {
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

  async requestAppPermissions(): Promise<AppPermissionsState> {
    if (Platform.OS !== 'android' || !PermissionsAndroid) {
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
    const location = await expoLocationGateway.requestPermission();
    const gpsEnabled = await expoLocationGateway.isServicesEnabled();

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
}

export const permissionsGateway = new PermissionsGateway();
