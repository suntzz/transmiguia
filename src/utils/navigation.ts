export type RootStackParamList = {
  Home: undefined;
  StationSelector: undefined;
  VoicePrototype: undefined;
  RoutePreview: undefined;
  WalkingGuide: undefined;
  StationAlert: undefined;
  StationArrival: undefined;
  BusTracking: undefined;
  DropAlert: undefined;
  Destination:
    | {
        suppressAutoSpeech?: boolean;
      }
    | undefined;
};
