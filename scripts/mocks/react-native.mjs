import React from 'react';

export const Platform = {
  OS: 'android',
  Version: 33,
  select: (obj) => (obj.android !== undefined ? obj.android : obj.default),
};

export const StyleSheet = {
  create: (styles) => styles,
  hairlineWidth: 1,
  flatten: (style) => {
    if (!style) return {};
    if (Array.isArray(style)) {
      return style
        .filter(Boolean)
        .reduce((acc, curr) => Object.assign(acc, typeof curr === 'object' ? curr : {}), {});
    }
    return typeof style === 'object' ? style : {};
  },
};

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

function normalizeProps(props) {
  if (!props) return props;
  let { style, ...rest } = props;
  if (typeof style === 'function') {
    style = style({ pressed: false });
  }
  if (!style) return rest;
  return { ...rest, style: StyleSheet.flatten(style) };
}

export const View = (props) => React.createElement('rn-view', normalizeProps(props), props.children);
export const Text = (props) => React.createElement('rn-text', normalizeProps(props), props.children);
export const Pressable = (props) => {
  const norm = normalizeProps(props);
  const children = typeof norm.children === 'function' ? norm.children({ pressed: false }) : norm.children;
  return React.createElement('rn-pressable', norm, children);
};
export const TextInput = (props) => React.createElement('rn-text-input', normalizeProps(props));
export const ScrollView = (props) => React.createElement('rn-scroll-view', normalizeProps(props), props.children);
export const StatusBar = (props) => React.createElement('rn-status-bar', normalizeProps(props));

export default {
  Platform,
  StyleSheet,
  AccessibilityInfo,
  PermissionsAndroid,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StatusBar,
};
