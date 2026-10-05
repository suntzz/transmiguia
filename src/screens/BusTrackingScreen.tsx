import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { MapView } from '@/src/components/MapView';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { RootStackParamList } from '@/src/utils/navigation';
import { borders, colors, radius, spacing } from '@/src/utils/theme';
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

      <View
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel={`En ruta. Estado actual: ${displayStatusLine}`}
        style={styles.header}>
        <Text allowFontScaling={true} style={styles.title}>
          En ruta
        </Text>
        <Text allowFontScaling={true} style={styles.subtitle}>
          {displayStatusLine}
        </Text>
      </View>

      <View style={styles.listCard}>
        {displayBusLabel ? (
          <View
            accessible={true}
            accessibilityLabel={`Bus actual asignado: ${displayBusLabel}`}
            style={styles.busBanner}>
            <Text style={styles.segmentLabel}>Bus asignado</Text>
            <Text allowFontScaling={true} style={styles.busBannerText}>
              {displayBusLabel}
            </Text>
          </View>
        ) : null}

        <View style={styles.statusGrid}>
          <View
            accessible={true}
            accessibilityLabel={`Estación actual donde te encuentras: ${displayCurrentStationName}`}
            style={styles.statusItem}>
            <Text style={styles.segmentLabel}>Ahora</Text>
            <Text allowFontScaling={true} style={styles.stopCurrent}>
              {displayCurrentStationName}
            </Text>
          </View>
          <View
            accessible={true}
            accessibilityLabel={`Siguiente parada del recorrido: ${displayNextStationName}`}
            style={styles.statusItem}>
            <Text style={styles.segmentLabel}>Siguiente</Text>
            <Text allowFontScaling={true} style={styles.stopTextBold}>
              {displayNextStationName}
            </Text>
          </View>
          <View
            accessible={true}
            accessibilityLabel={`Estación de destino final: ${destinationName}`}
            style={styles.statusItem}>
            <Text style={styles.segmentLabel}>Destino</Text>
            <Text allowFontScaling={true} style={styles.stopDestination}>
              {destinationName}
            </Text>
          </View>
        </View>

        <View style={styles.segmentBlock}>
          <Text style={styles.segmentLabel}>Próximas paradas</Text>
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
              <View
                key={station.id}
                accessible={true}
                accessibilityRole="text"
                accessibilityLabel={
                  state === 'current'
                    ? `Estación actual: ${station.name}`
                    : state === 'destination'
                      ? `Destino final: ${station.name}`
                      : `Próxima parada: ${station.name}`
                }
                style={[styles.stopRow, state === 'current' && styles.stopRowCurrent]}>
                <Text
                  allowFontScaling={true}
                  style={[
                    styles.stopText,
                    state === 'current' && styles.stopCurrent,
                    state === 'destination' && styles.stopDestination,
                  ]}>
                  {station.name}
                </Text>
                {state === 'current' ? (
                  <View style={styles.stopBadgeCurrent}>
                    <Text style={styles.stopBadgeTextCurrent}>AHORA</Text>
                  </View>
                ) : state === 'destination' ? (
                  <View style={styles.stopBadgeDest}>
                    <Text style={styles.stopBadgeTextDest}>DESTINO</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {nextTransferStation && nextTransferStation.name !== currentStationName ? (
          <View
            accessible={true}
            accessibilityRole="alert"
            style={styles.transferBanner}>
            <Text allowFontScaling={true} style={styles.transferText}>
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
                    ? `Transbordo en ${nextTransferStation.name}. Cruza por el túnel y toma ${nextTransferLeg.routeCode}.`
                    : `Transbordo en ${nextTransferStation.name}. Cruza por el túnel.`
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
    borderWidth: borders.standard,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '700',
    color: colors.textMuted,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  busBanner: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  busBannerText: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusItem: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  segmentBlock: {
    gap: spacing.sm,
  },
  segmentLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  stopRowCurrent: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
  },
  stopText: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  stopTextBold: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '800',
  },
  stopCurrent: {
    fontSize: 19,
    lineHeight: 24,
    color: colors.primary,
    fontWeight: '900',
  },
  stopDestination: {
    fontSize: 19,
    lineHeight: 24,
    color: colors.success,
    fontWeight: '900',
  },
  stopBadgeCurrent: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  stopBadgeTextCurrent: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '900',
  },
  stopBadgeDest: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  stopBadgeTextDest: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '900',
  },
  transferBanner: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: borders.bold,
    borderColor: colors.warning,
  },
  transferText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '800',
  },
});
