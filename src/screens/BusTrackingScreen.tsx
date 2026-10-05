import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { MapView } from '@/src/components/MapView';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors, radius, spacing } from '@/src/utils/theme';
import { useBusTrackingController } from '@/src/presentation/features/bus-tracking/useBusTrackingController';

type Props = NativeStackScreenProps<RootStackParamList, 'BusTracking'>;

export function BusTrackingScreen({ navigation }: Props) {
  const {
    activeCoordinates,
    destinationStation,
    destinationName,
    transitMapLegOverlays,
    displayStatusLine,
    displayBusLabel,
    displayCurrentStationName,
    displayNextStationName,
    visibleStations,
    routeStations,
    currentIndex,
    nextTransferStation,
    currentStationName,
    nextTransferWalkLeg,
    isJimenezTransferWalk,
    isLasNievesTransferWalk,
    nextTransferLeg,
  } = useBusTrackingController({ navigation });

  return (
    <ScreenContainer>
      <MapView
        currentLocation={
          activeCoordinates
            ? {
                latitude: activeCoordinates.latitude,
                longitude: activeCoordinates.longitude,
              }
            : null
        }
        destination={destinationStation.coordinates}
        destinationLabel={destinationName}
        routeCoordinates={[]}
        routeLegs={transitMapLegOverlays}
      />

      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          En ruta
        </Text>
        <Text style={styles.subtitle}>{displayStatusLine}</Text>
      </View>

      <View style={styles.listCard}>
        {displayBusLabel ? (
          <View style={styles.busBanner}>
            <Text style={styles.segmentLabel}>Bus actual</Text>
            <Text style={styles.busBannerText}>{displayBusLabel}</Text>
          </View>
        ) : null}

        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text style={styles.segmentLabel}>Ahora</Text>
            <Text style={styles.stopCurrent}>{displayCurrentStationName}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.segmentLabel}>Siguiente</Text>
            <Text style={styles.stopText}>{displayNextStationName}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.segmentLabel}>Destino</Text>
            <Text style={styles.stopDestination}>{destinationName}</Text>
          </View>
        </View>

        <View style={styles.segmentBlock}>
          <Text style={styles.segmentLabel}>Proximas paradas</Text>
          {visibleStations.map((station) => {
            const routeIndex = routeStations.findIndex(
              (routeStation) => routeStation.id === station.id
            );
            const state =
              routeIndex === currentIndex
                ? 'current'
                : routeIndex === routeStations.length - 1
                  ? 'destination'
                  : 'upcoming';

            return (
              <View key={station.id} style={styles.stopRow}>
                <Text
                  style={[
                    styles.stopText,
                    state === 'current' && styles.stopCurrent,
                    state === 'destination' && styles.stopDestination,
                  ]}>
                  {station.name}
                </Text>
              </View>
            );
          })}
        </View>

        {nextTransferStation && nextTransferStation.name !== currentStationName ? (
          <View style={styles.transferBanner}>
            <Text style={styles.transferText}>
              {nextTransferWalkLeg
                ? isJimenezTransferWalk
                  ? nextTransferLeg
                    ? `Transbordo en ${nextTransferStation.name}. Cambia de corredor y toma ${nextTransferLeg.routeCode}.`
                    : `Transbordo en ${nextTransferStation.name}. Cambia de corredor.`
                  : isLasNievesTransferWalk
                    ? nextTransferLeg
                      ? `Baja en ${nextTransferStation.name}. Camina y luego toma ${nextTransferLeg.routeCode}.`
                      : `Baja en ${nextTransferStation.name}. Camina hacia tu destino.`
                  : nextTransferLeg
                    ? `Transbordo en ${nextTransferStation.name}. Cruza por el tunel y toma ${nextTransferLeg.routeCode}.`
                    : `Transbordo en ${nextTransferStation.name}. Cruza por el tunel.`
                : nextTransferLeg
                  ? `Transbordo en ${nextTransferStation.name} para tomar ${nextTransferLeg.routeCode}`
                  : `Transbordo en ${nextTransferStation.name}`}
            </Text>
          </View>
        ) : null}
      </View>

      <AccessibleButton
        label="Cambiar destino"
        variant="secondary"
        hint="Abrir la lista de estaciones disponibles"
        accessibilityLabel="Cambiar destino durante el seguimiento en bus"
        onPress={() => navigation.navigate('StationSelector')}
      />
      <AccessibleButton
        label="Simular aviso de bajada"
        hint="Ir a la alerta de una parada restante"
        accessibilityLabel="Abrir aviso de bajada"
        onPress={() => navigation.replace('DropAlert')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  busBanner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  busBannerText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusItem: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  segmentBlock: {
    gap: spacing.xs,
  },
  segmentLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  stopRow: {
    paddingVertical: spacing.xs,
  },
  stopText: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
    fontWeight: '600',
  },
  stopCurrent: {
    color: colors.primary,
    fontWeight: '800',
  },
  stopDestination: {
    color: colors.success,
    fontWeight: '800',
  },
  transferBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  transferText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    fontWeight: '600',
  },
});
