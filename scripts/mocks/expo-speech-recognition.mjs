import React from 'react';

export const ExpoSpeechRecognitionModule = {
  abort: () => {},
  stop: () => {},
  start: () => {},
  isRecognitionAvailable: () => true,
  requestPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  getPermissionsAsync: async () => ({ status: 'granted', granted: true }),
  getSupportedLocales: async () => ({
    locales: ['es-CO', 'es-419', 'es-ES'],
    installedLocales: ['es-CO'],
  }),
  getDefaultRecognitionService: () => ({ packageName: 'com.google.android.googlequicksearchbox' }),
  getSpeechRecognitionServices: () => ['com.google.android.googlequicksearchbox'],
  addListener: () => ({ remove: () => {} }),
  getStateAsync: async () => 'inactive',
};

export const useSpeechRecognitionEvent = (event, handler) => {};

export default {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
};
