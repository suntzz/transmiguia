export const Platform = { OS: 'android', select: (obj) => obj.android ?? obj.default };
export const StyleSheet = { create: (styles) => styles };
export const AccessibilityInfo = {
  announceForAccessibility: () => {},
  isScreenReaderEnabled: async () => false,
};
export const PermissionsAndroid = {
  PERMISSIONS: {
    RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
    ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
  check: async () => true,
  request: async () => 'granted',
  requestMultiple: async () => ({
    'android.permission.RECORD_AUDIO': 'granted',
    'android.permission.ACCESS_FINE_LOCATION': 'granted',
  }),
};
export default {
  Platform,
  StyleSheet,
  AccessibilityInfo,
  PermissionsAndroid,
};
