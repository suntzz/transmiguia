import React from 'react';

export const CommonActions = {
  reset: (args) => ({ type: 'RESET', ...args }),
  navigate: (name, params) => ({ type: 'NAVIGATE', name, params }),
};

export const useFocusEffect = (cb) => {
  React.useEffect(() => {
    if (typeof cb === 'function') {
      return cb();
    }
  }, [cb]);
};

export const useNavigation = () => ({
  navigate: () => {},
  replace: () => {},
  dispatch: () => {},
  goBack: () => {},
  popToTop: () => {},
});

export const DefaultTheme = {
  colors: {
    primary: '#D0021B',
    background: '#F3F4F6',
    card: '#FFFFFF',
    text: '#0A0A0A',
    border: '#111827',
    notification: '#D0021B',
  },
};

export const NavigationContainer = (props) =>
  React.createElement('NavigationContainer', props, props.children);

export const createNavigationContainerRef = () => ({
  isReady: () => true,
  dispatch: () => {},
  navigate: () => {},
});

export default {
  CommonActions,
  useFocusEffect,
  useNavigation,
  DefaultTheme,
  NavigationContainer,
  createNavigationContainerRef,
};
