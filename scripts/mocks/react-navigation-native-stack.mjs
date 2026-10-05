import React from 'react';

export const createNativeStackNavigator = () => {
  return {
    Navigator: (props) => React.createElement('StackNavigator', props, props.children),
    Screen: (props) => React.createElement('StackScreen', props, null),
  };
};

export default {
  createNativeStackNavigator,
};
