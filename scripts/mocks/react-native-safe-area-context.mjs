import React from 'react';

export const SafeAreaView = (props) => React.createElement('rn-safe-area-view', props, props.children);
export const SafeAreaProvider = (props) => React.createElement('rn-safe-area-provider', props, props.children);
export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });

export default {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
};
