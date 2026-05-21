import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapViewNative, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';

import { colors, radius, spacing } from '@/src/utils/theme';

type Coordinates = {
  latitude: number;
  longitude: number;
};

export type RouteLegOverlay = {
  id: string;
  type: 'walk' | 'bus';
  coordinates: Coordinates[];
};

type MapViewProps = {
  currentLocation: Coordinates | null;
  destination: Coordinates | null;
  destinationLabel?: string;
  routeCoordinates: Coordinates[];
  routeLegs?: RouteLegOverlay[];
  routeErrorMessage?: string | null;
};

function buildRegion(
  currentLocation: Coordinates | null,
  destination: Coordinates | null
): Region {
  const fallback = destination ?? currentLocation ?? { latitude: 4.6486, longitude: -74.11103 };
  const baseLatitude = currentLocation?.latitude ?? fallback.latitude;
  const baseLongitude = currentLocation?.longitude ?? fallback.longitude;

  return {
    latitude: (baseLatitude + fallback.latitude) / 2,
    longitude: (baseLongitude + fallback.longitude) / 2,
    latitudeDelta: Math.max(
      Math.abs(baseLatitude - fallback.latitude) * 1.8,
      0.03
    ),
    longitudeDelta: Math.max(
      Math.abs(baseLongitude - fallback.longitude) * 1.8,
      0.03
    ),
  };
}

export function MapView({
  currentLocation,
  destination,
  destinationLabel = 'Estacion cercana',
  routeCoordinates,
  routeLegs = [],
  routeErrorMessage = null,
}: MapViewProps) {
  const mapRef = useRef<MapViewNative | null>(null);
  const mapLoadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapErrorMessage, setMapErrorMessage] = useState<string | null>(null);
  const region = buildRegion(currentLocation, destination);
  const resolvedDestination = destination ?? currentLocation;

  const handleMapReady = () => {
    setMapReady(true);

    if (__DEV__) {
      console.info('[API DEBUG] Google Maps listo en Android.');
    }
  };

  const handleMapLoaded = () => {
    setMapLoaded(true);
    setMapErrorMessage(null);

    if (__DEV__) {
      console.info('[API DEBUG] El mapa termino de cargar.');
    }
  };

  useEffect(() => {
    setMapReady(false);
    setMapLoaded(false);
    setMapErrorMessage(null);
  }, [destination?.latitude, destination?.longitude, currentLocation?.latitude, currentLocation?.longitude]);

  useEffect(() => {
    if (routeErrorMessage) {
      console.warn('[API ERROR] Directions falló y se activó el fallback visual.', {
        routeErrorMessage,
      });

      setMapErrorMessage(routeErrorMessage);
      return;
    }

    if (!mapReady || mapLoaded) {
      return;
    }

    if (mapLoadTimeoutRef.current) {
      clearTimeout(mapLoadTimeoutRef.current);
    }

    mapLoadTimeoutRef.current = setTimeout(() => {
      setMapErrorMessage(
        'Error cargando mapa. Verifica internet o la configuracion de Google Maps.'
      );

      console.warn('[API ERROR] Maps no cargó en el tiempo esperado.', {
        currentLocation,
        destination,
      });
    }, 9000);

    return () => {
      if (mapLoadTimeoutRef.current) {
        clearTimeout(mapLoadTimeoutRef.current);
        mapLoadTimeoutRef.current = null;
      }
    };
  }, [currentLocation, destination, mapLoaded, mapReady, routeErrorMessage]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    const points = [
      ...(currentLocation ? [currentLocation] : []),
      ...routeLegs.flatMap((leg) => leg.coordinates),
      ...(routeCoordinates.length > 0 ? routeCoordinates : []),
      ...(destination ? [destination] : []),
    ];

    if (points.length < 2) {
      return;
    }

    mapRef.current.fitToCoordinates(points, {
      animated: true,
      edgePadding: {
        top: 56,
        right: 56,
        bottom: 56,
        left: 56,
      },
    });
  }, [currentLocation, destination, routeCoordinates, routeLegs]);

  return (
    <View style={styles.wrapper}>
      <MapViewNative
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
        toolbarEnabled={false}
        onMapReady={handleMapReady}
        onMapLoaded={handleMapLoaded}
        accessibilityLabel="Mapa con ubicacion actual y ruta hacia la estacion">
        {currentLocation ? (
          <Marker
            coordinate={currentLocation}
            title="Tu ubicacion"
            pinColor={colors.primary}
          />
        ) : null}
        {resolvedDestination ? (
          <Marker
            coordinate={resolvedDestination}
            title={destinationLabel}
            description="Estacion de TransMilenio"
          />
        ) : null}
        {routeLegs.length > 0
          ? routeLegs.map((leg) =>
              leg.coordinates.length > 1 ? (
                <Polyline
                  key={leg.id}
                  coordinates={leg.coordinates}
                  strokeColor={leg.type === 'bus' ? colors.primary : '#7D7D7D'}
                  strokeWidth={leg.type === 'bus' ? 5 : 4}
                  lineDashPattern={leg.type === 'walk' ? [8, 8] : undefined}
                />
              ) : null
            )
          : routeCoordinates.length > 0
            ? (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={colors.primary}
                strokeWidth={5}
              />
            )
            : null}
      </MapViewNative>
      {mapErrorMessage ? (
        <View accessible accessibilityRole="alert" style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Error cargando mapa</Text>
          <Text style={styles.errorText}>{mapErrorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 280,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  map: {
    flex: 1,
  },
  errorOverlay: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  errorTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  errorText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
});
