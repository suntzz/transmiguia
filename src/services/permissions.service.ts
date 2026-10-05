import { permissionsGateway } from '@/src/infrastructure/hardware/PermissionsGateway';
import type { AppPermissionsState } from '@/src/domain/gateways/IPermissionsGateway';

export type { AppPermissionsState };

export function checkAppPermissions(): Promise<AppPermissionsState> {
  return permissionsGateway.checkAppPermissions();
}

export function checkMicrophonePermission(): Promise<boolean> {
  return permissionsGateway.checkMicrophonePermission();
}

export function requestMicrophonePermission(): Promise<boolean> {
  return permissionsGateway.requestMicrophonePermission();
}

export function requestAppPermissions(): Promise<AppPermissionsState> {
  return permissionsGateway.requestAppPermissions();
}
