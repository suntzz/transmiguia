export type AppPermissionsState = {
  microphone: boolean;
  location: boolean;
  gpsEnabled: boolean;
};

export interface IPermissionsGateway {
  checkAppPermissions(): Promise<AppPermissionsState>;
  requestAppPermissions(): Promise<AppPermissionsState>;
  checkMicrophonePermission(): Promise<boolean>;
  requestMicrophonePermission(): Promise<boolean>;
}
