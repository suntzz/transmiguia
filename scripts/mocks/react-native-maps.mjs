import React from 'react';

export const PROVIDER_GOOGLE = 'google';

export const Marker = (props) => React.createElement('rn-marker', props, props.children);
export const Polyline = (props) => React.createElement('rn-polyline', props, props.children);

const MapViewNative = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    fitToCoordinates: () => {},
    animateToRegion: () => {},
  }));
  return React.createElement('rn-map-view', props, props.children);
});

export default MapViewNative;
