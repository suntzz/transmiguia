import React, { useMemo } from 'react';
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

function generateLeafletHtml(
  currentLocation: Coordinates | null,
  destination: Coordinates | null,
  destinationLabel: string,
  routeCoordinates: Coordinates[],
  routeLegs: RouteLegOverlay[]
): string {
  const pointsJson = JSON.stringify({
    currentLocation,
    destination,
    destinationLabel,
    routeCoordinates,
    routeLegs,
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Mapa TransMilenio Accesible</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; background: #e2e8f0; font-family: system-ui, -apple-system, sans-serif; }
    .custom-icon { display: flex; align-items: center; justify-content: center; font-weight: bold; border-radius: 50%; box-shadow: 0 3px 8px rgba(0,0,0,0.35); }
    .icon-user { background: #2563EB; border: 3px solid #FFFFFF; color: #FFFFFF; width: 26px; height: 26px; font-size: 13px; }
    .icon-dest { background: #CD161E; border: 3px solid #FFFFFF; color: #FFFFFF; width: 30px; height: 30px; font-size: 14px; }
    .pulse-ring { position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 3px solid rgba(37, 99, 235, 0.6); animation: pulse 2s infinite ease-out; pointer-events: none; }
    @keyframes pulse { 0% { transform: scale(0.6); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }
    .leaflet-popup-content-wrapper { border-radius: 10px; font-weight: 700; font-size: 13px; }
    #fallback { display: none; width: 100%; height: 100%; align-items: center; justify-content: center; background: #f8fafc; color: #334155; font-size: 14px; text-align: center; padding: 16px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="fallback">
    <div>
      <p style="font-weight: 800; font-size: 16px; color: #CD161E; margin-bottom: 8px;">Mapa de ruta</p>
      <p id="fallback-info"></p>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    (function() {
      const data = ${pointsJson};
      const mapEl = document.getElementById('map');
      const fallbackEl = document.getElementById('fallback');
      const fallbackInfo = document.getElementById('fallback-info');

      if (typeof L === 'undefined') {
        mapEl.style.display = 'none';
        fallbackEl.style.display = 'flex';
        fallbackInfo.textContent = 'Destino: ' + (data.destinationLabel || 'Estación');
        return;
      }

      const defaultLat = 4.6486;
      const defaultLng = -74.1110;
      const startLat = data.currentLocation ? data.currentLocation.latitude : (data.destination ? data.destination.latitude : defaultLat);
      const startLng = data.currentLocation ? data.currentLocation.longitude : (data.destination ? data.destination.longitude : defaultLng);

      const map = L.map('map', {
        zoomControl: true,
        attributionControl: false
      }).setView([startLat, startLng], 14);

      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      const allLatLngs = [];

      // Marcador de ubicación actual (Usuario)
      if (data.currentLocation) {
        const userLatLng = [data.currentLocation.latitude, data.currentLocation.longitude];
        allLatLngs.push(userLatLng);

        const userIcon = L.divIcon({
          className: '',
          html: '<div style="position:relative; width:44px; height:44px; margin-left:-9px; margin-top:-9px; display:flex; align-items:center; justify-content:center;"><div class="pulse-ring"></div><div class="custom-icon icon-user">📍</div></div>',
          iconSize: [26, 26],
          iconAnchor: [13, 13]
        });

        L.marker(userLatLng, { icon: userIcon })
          .addTo(map)
          .bindPopup('<b>Tu ubicación</b><br>GPS Detectado');
      }

      // Marcador de destino (Estación TransMilenio)
      if (data.destination) {
        const destLatLng = [data.destination.latitude, data.destination.longitude];
        allLatLngs.push(destLatLng);

        const destIcon = L.divIcon({
          className: '',
          html: '<div class="custom-icon icon-dest">🚌</div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15]
        });

        L.marker(destLatLng, { icon: destIcon })
          .addTo(map)
          .bindPopup('<b>' + (data.destinationLabel || 'Estación TransMilenio') + '</b><br>Destino')
          .openPopup();
      }

      // Tramos de ruta (Walking o Bus)
      if (data.routeLegs && data.routeLegs.length > 0) {
        data.routeLegs.forEach(function(leg) {
          if (!leg.coordinates || leg.coordinates.length < 2) return;
          const legPoints = leg.coordinates.map(function(c) { return [c.latitude, c.longitude]; });
          legPoints.forEach(function(pt) { allLatLngs.push(pt); });

          if (leg.type === 'walk') {
            L.polyline(legPoints, {
              color: '#475569',
              weight: 4,
              opacity: 0.9,
              dashArray: '8, 8'
            }).addTo(map);
          } else {
            L.polyline(legPoints, {
              color: '#CD161E',
              weight: 5,
              opacity: 0.95
            }).addTo(map);
          }
        });
      } else if (data.routeCoordinates && data.routeCoordinates.length > 1) {
        const routePoints = data.routeCoordinates.map(function(c) { return [c.latitude, c.longitude]; });
        routePoints.forEach(function(pt) { allLatLngs.push(pt); });

        L.polyline(routePoints, {
          color: '#CD161E',
          weight: 5,
          opacity: 0.95
        }).addTo(map);
      }

      // Ajustar vista a todos los puntos relevantes
      if (allLatLngs.length >= 2) {
        map.fitBounds(allLatLngs, {
          padding: [30, 30],
          maxZoom: 16
        });
      } else if (allLatLngs.length === 1) {
        map.setView(allLatLngs[0], 15);
      }
    })();
  </script>
</body>
</html>`;
}

export function MapView({
  currentLocation,
  destination,
  destinationLabel = 'Estación cercana',
  routeCoordinates = [],
  routeLegs = [],
  routeErrorMessage = null,
}: MapViewProps) {
  const resolvedDestination = destination ?? currentLocation;

  const leafletHtml = useMemo(() => {
    return generateLeafletHtml(
      currentLocation,
      destination,
      destinationLabel,
      routeCoordinates,
      routeLegs
    );
  }, [currentLocation, destination, destinationLabel, routeCoordinates, routeLegs]);

  return (
    <View
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Mapa de ruta accesible con OpenStreetMap. Ubicación actual: ${
        currentLocation ? 'detectada' : 'sin señal'
      }. Destino: ${destinationLabel}.`}
      style={styles.wrapper}>
      {/* Header telemetry badge */}
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MAPA INTERACTIVO (WEB / OPENSTREETMAP)</Text>
        </View>
        {currentLocation ? (
          <View style={styles.gpsActivePill}>
            <Text style={styles.gpsActiveText}>GPS ACTIVO</Text>
          </View>
        ) : (
          <View style={styles.gpsSearchingPill}>
            <Text style={styles.gpsSearchingText}>BUSCANDO GPS</Text>
          </View>
        )}
      </View>

      {/* Visual Interactive Map Canvas */}
      <View style={styles.mapCanvasContainer}>
        {React.createElement('iframe', {
          title: `Mapa interactivo con ruta hacia ${destinationLabel}`,
          srcDoc: leafletHtml,
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: radius.md,
            display: 'block',
          },
        })}
      </View>

      {/* Accessible telemetry card for screen readers and visual high contrast */}
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
            {routeLegs.length} {routeLegs.length === 1 ? 'tramo' : 'tramos'} de trayecto monitoreados
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
    gap: spacing.xs,
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
  gpsSearchingPill: {
    backgroundColor: colors.surfaceHover,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gpsSearchingText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  mapCanvasContainer: {
    height: 260,
    width: '100%',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#e2e8f0',
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
    backgroundColor: '#2563EB',
  },
  dotDestination: {
    backgroundColor: colors.primary,
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
