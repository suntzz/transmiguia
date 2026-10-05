import React from 'react';

const createMockIcon = (iconSetName) => {
  return function MockIcon({ name, size, color, style, ...props }) {
    return React.createElement('rn-icon', {
      name,
      size,
      color,
      iconSet: iconSetName,
      style,
      ...props,
    });
  };
};

export const MaterialIcons = createMockIcon('MaterialIcons');
export const Ionicons = createMockIcon('Ionicons');
export const Feather = createMockIcon('Feather');
export const MaterialCommunityIcons = createMockIcon('MaterialCommunityIcons');

export default {
  MaterialIcons,
  Ionicons,
  Feather,
  MaterialCommunityIcons,
};
