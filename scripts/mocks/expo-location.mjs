export const Accuracy = {
  Balanced: 3,
  High: 4,
  Highest: 5,
  BestForNavigation: 6,
};
export const ActivityType = {
  AutomotiveNavigation: 2,
  Fitness: 3,
  OtherNavigation: 4,
};
export const getForegroundPermissionsAsync = async () => ({ status: 'granted', granted: true });
export const requestForegroundPermissionsAsync = async () => ({ status: 'granted', granted: true });
export const hasServicesEnabledAsync = async () => true;
export const isLocationServicesEnabledAsync = async () => true;
export const getCurrentPositionAsync = async () => ({
  coords: {
    latitude: 4.6097,
    longitude: -74.0817,
    altitude: 2600,
    accuracy: 5,
    altitudeAccuracy: 5,
    heading: 0,
    speed: 0,
  },
  timestamp: Date.now(),
});
export const watchPositionAsync = async (_options, callback) => {
  callback({
    coords: {
      latitude: 4.6097,
      longitude: -74.0817,
      accuracy: 5,
      speed: 1.2,
    },
    timestamp: Date.now(),
  });
  return { remove: () => {} };
};

export default {
  Accuracy,
  ActivityType,
  getForegroundPermissionsAsync,
  requestForegroundPermissionsAsync,
  hasServicesEnabledAsync,
  isLocationServicesEnabledAsync,
  getCurrentPositionAsync,
  watchPositionAsync,
};
