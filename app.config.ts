import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_MAPS_ANDROID_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ??
  '';

const GOOGLE_MAPS_DIRECTIONS_API_KEY =
  process.env.DIRECTIONS_API_KEY ??
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_API_KEY ??
  '';

const TM_STATION_STATUS_URL = process.env.EXPO_PUBLIC_TM_STATION_STATUS_URL ?? '';
const TM_STATION_STATUS_REFRESH_HOURS = Number(
  process.env.EXPO_PUBLIC_TM_STATION_STATUS_REFRESH_HOURS ?? 6
);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TransmiGuía',
  slug: 'tm-accesible-base',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'apptransmiexpo',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.anonymous.apptransmiexpo',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E32C24',
      foregroundImage: './assets/images/android-icon-foreground.png',
    },
    config: {
      googleMaps: {
        apiKey: GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
    ],
    package: 'com.anonymous.apptransmiexpo',
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 420,
        resizeMode: 'cover',
        backgroundColor: '#7C0C0A',
        dark: {
          backgroundColor: '#7C0C0A',
        },
      },
    ],
    [
      'expo-speech-recognition',
      {
        'androidSpeechServicePackages': [
          'com.google.android.googlequicksearchbox',
          'com.google.android.tts',
          'com.google.android.as',
        ],
      }
    ],
  ],
  extra: {
    directionsApiKey: GOOGLE_MAPS_DIRECTIONS_API_KEY,
    mapsAndroidApiKey: GOOGLE_MAPS_ANDROID_API_KEY,
    googleMapsApiKey: GOOGLE_MAPS_DIRECTIONS_API_KEY,
    googleMapsAndroidApiKey: GOOGLE_MAPS_ANDROID_API_KEY,
    tmStationStatusUrl: TM_STATION_STATUS_URL || undefined,
    tmStationStatusRefreshHours: Number.isFinite(TM_STATION_STATUS_REFRESH_HOURS)
      ? TM_STATION_STATUS_REFRESH_HOURS
      : 6,
    eas: {
      projectId: '793820c1-c96f-4ba8-8d8c-d04eea3d22c6',
    },
  },
});
