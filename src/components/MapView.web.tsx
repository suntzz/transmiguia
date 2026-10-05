import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { borders, colors, radius, spacing } from '@/src/utils/theme';

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

export function MapView({
  currentLocation,
  destination,
  destinationLabel = 'Estación cercana',
  routeLegs = [],
  routeErrorMessage = null,
}: MapViewProps) {
  const resolvedDestination = destination ?? currentLocation;

  return (
    <View
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Mapa de ruta accesible. Ubicación actual: ${
        currentLocation ? 'detectada' : 'sin señal'
      }. Destino: ${destinationLabel}.`}
      style={styles.wrapper}>
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MAPA ACCESIBLE WEB</Text>
        </View>
        {currentLocation ? (
          <View style={styles.gpsActivePill}>
            <Text style={styles.gpsActiveText}>GPS ACTIVO</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoCard}>
        <View style={styles.pointRow}>
          <View style={[styles.dot, styles.dotOrigin]} />
          <View style={styles.pointInfo}>
            <Text style={styles.pointLabel}>Tu Ubicación Actual</Text>
            <Text style={styles.pointValue}>
              {currentLocation
                ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                : 'Buscando posición GPS...'}
            </Text>
          </View>
        </View>

        <View style={styles.connectorLine} />

        <View style={styles.pointRow}>
          <View style={[styles.dot, styles.dotDestination]} />
          <View style={styles.pointInfo}>
            <Text style={styles.pointLabel}>Estación de Destino</Text>
            <Text style={styles.pointValue}>{destinationLabel}</Text>
            {resolvedDestination ? (
              <Text style={styles.pointCoords}>
                {resolvedDestination.latitude.toFixed(4)}, {resolvedDestination.longitude.toFixed(4)}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {routeLegs.length > 0 ? (
        <View style={styles.legsBadge}>
          <Text style={styles.legsBadgeText}>
            {routeLegs.length} tramos de trayecto monitoreados
          </Text>
        </View>
      ) : null}

      {routeErrorMessage ? (
        <View accessible accessibilityRole="alert" style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>Aviso de Mapa</Text>
          <Text style={styles.errorText}>{routeErrorMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.dark,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  badgeText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  gpsActivePill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.success,
  },
  gpsActiveText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 4,
  },
  dotOrigin: {
    backgroundColor: colors.primary,
  },
  dotDestination: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.dark,
  },
  connectorLine: {
    width: 2,
    height: 16,
    backgroundColor: colors.borderSubtle,
    marginLeft: 6,
    marginVertical: 2,
  },
  pointInfo: {
    flex: 1,
  },
  pointLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  pointValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  pointCoords: {
    fontSize: 12,
    color: colors.textSoft,
  },
  legsBadge: {
    backgroundColor: colors.accentSurface,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  legsBadgeText: {
    color: colors.dark,
    fontSize: 12,
    fontWeight: '700',
  },
  errorOverlay: {
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  errorTitle: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: colors.text,
    fontSize: 13,
  },
});
