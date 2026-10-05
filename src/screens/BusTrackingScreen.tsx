import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { MapView } from '@/src/components/MapView';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { RootStackParamList } from '@/src/utils/navigation';
import { borders, colors, radius, shadows, spacing, typography } from '@/src/utils/theme';
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
      {/* Map View */}
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

      {/* Header Status Card */}
      <View
        accessible={true}
        accessibilityRole="header"
        accessibilityLabel={`En ruta. Estado actual: ${displayStatusLine}`}
        style={styles.headerCard}>
        <View style={styles.headerTop}>
          <View style={styles.iconCircle}>
            <MaterialIcons name="directions-bus" size={24} color={colors.primary} />
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>EN RUTA</Text>
          </View>
        </View>

        <Text allowFontScaling={true} style={styles.title}>
          En ruta
        </Text>
        <Text allowFontScaling={true} style={styles.subtitle}>
          {displayStatusLine}
        </Text>

        {displayBusLabel ? (
          <View
            accessible={true}
            accessibilityLabel={`Bus actual asignado: ${displayBusLabel}`}
            style={styles.busBanner}>
            <Text style={styles.busBannerLabel}>Bus asignado</Text>
            <View style={styles.busBadge}>
              <Text allowFontScaling={true} style={styles.busBadgeText}>
                {displayBusLabel}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Trip Timeline Overview (Ahora / Siguiente / Destino) */}
      <View style={styles.journeyCard}>
        <View style={styles.statusGrid}>
          {/* Ahora */}
          <View
            accessible={true}
            accessibilityLabel={`Estación actual donde te encuentras: ${displayCurrentStationName}`}
            style={[styles.statusItem, styles.statusItemCurrent]}>
            <View style={styles.statusItemHeader}>
              <MaterialIcons name="radio-button-checked" size={14} color={colors.primary} />
              <Text style={styles.segmentLabelCurrent}>Ahora</Text>
            </View>
            <Text allowFontScaling={true} numberOfLines={2} style={styles.stopCurrent}>
              {displayCurrentStationName}
            </Text>
          </View>

          {/* Siguiente */}
          <View
            accessible={true}
            accessibilityLabel={`Siguiente parada del recorrido: ${displayNextStationName}`}
            style={styles.statusItem}>
            <View style={styles.statusItemHeader}>
              <MaterialIcons name="arrow-forward" size={14} color={colors.textSecondary} />
              <Text style={styles.segmentLabel}>Siguiente</Text>
            </View>
            <Text allowFontScaling={true} numberOfLines={2} style={styles.stopTextBold}>
              {displayNextStationName}
            </Text>
          </View>

          {/* Destino */}
          <View
            accessible={true}
            accessibilityLabel={`Estación de destino final: ${destinationName}`}
            style={styles.statusItem}>
            <View style={styles.statusItemHeader}>
              <MaterialIcons name="place" size={14} color={colors.success} />
              <Text style={styles.segmentLabel}>Destino</Text>
            </View>
            <Text allowFontScaling={true} numberOfLines={2} style={styles.stopDestination}>
              {destinationName}
            </Text>
          </View>
        </View>

        {/* Transfer Banner */}
        {nextTransferStation && nextTransferStation.name !== currentStationName ? (
          <View
            accessible={true}
            accessibilityRole="alert"
            style={styles.transferBanner}>
            <MaterialIcons name="swap-horiz" size={24} color={colors.warning} />
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

        {/* Vertical Stops List */}
        <View style={styles.segmentBlock}>
          <Text style={styles.segmentBlockTitle}>Próximas paradas</Text>

          <View style={styles.timelineList}>
            {visibleStations.map((station, index) => {
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
                  {/* Timeline indicator node */}
                  <View style={styles.nodeColumn}>
                    <View
                      style={[
                        styles.nodeDot,
                        state === 'current' && styles.nodeDotCurrent,
                        state === 'destination' && styles.nodeDotDest,
                      ]}
                    />
                    {index < visibleStations.length - 1 ? <View style={styles.nodeLine} /> : null}
                  </View>

                  <Text
                    allowFontScaling={true}
                    style={[
                      styles.stopText,
                      state === 'current' && styles.stopTextActive,
                      state === 'destination' && styles.stopTextDest,
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
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <AccessibleButton
          label="Simular aviso de bajada"
          variant="primary"
          icon="notifications-active"
          hint="Ir a la alerta de una parada restante"
          accessibilityLabel="Abrir aviso de bajada"
          onPress={() => navigation.replace('DropAlert')}
        />
        <AccessibleButton
          label="Cambiar destino"
          variant="secondary"
          icon="edit-location"
          hint="Abrir la lista de estaciones disponibles"
          accessibilityLabel="Cambiar destino durante el seguimiento en bus"
          onPress={() => navigation.navigate('StationSelector')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: borders.standard,
    borderColor: colors.border,
    ...shadows.sm,
    gap: spacing.xs,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  liveBadgeText: {
    color: colors.primary,
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  busBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  busBannerLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  busBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
  },
  busBadgeText: {
    color: colors.textInverse,
    fontSize: typography.h3.fontSize,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  journeyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: borders.standard,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.lg,
    ...shadows.sm,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusItem: {
    flex: 1,
    backgroundColor: colors.surfaceHover,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  statusItemCurrent: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  statusItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  segmentLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  segmentLabelCurrent: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  stopCurrent: {
    fontSize: typography.bodySecondary.fontSize,
    lineHeight: 18,
    color: colors.primary,
    fontWeight: '800',
  },
  stopTextBold: {
    fontSize: typography.bodySecondary.fontSize,
    lineHeight: 18,
    color: colors.text,
    fontWeight: '700',
  },
  stopDestination: {
    fontSize: typography.bodySecondary.fontSize,
    lineHeight: 18,
    color: colors.success,
    fontWeight: '800',
  },
  segmentBlock: {
    gap: spacing.sm,
  },
  segmentBlockTitle: {
    fontSize: typography.caption.fontSize,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timelineList: {
    gap: 0,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    minHeight: 48,
    borderRadius: radius.sm,
  },
  stopRowCurrent: {
    backgroundColor: colors.primaryLight,
  },
  nodeColumn: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  nodeDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  nodeDotCurrent: {
    backgroundColor: colors.primary,
    width: 12,
    height: 12,
  },
  nodeDotDest: {
    backgroundColor: colors.success,
    width: 12,
    height: 12,
  },
  nodeLine: {
    position: 'absolute',
    top: 20,
    width: 2,
    height: 28,
    backgroundColor: colors.border,
  },
  stopText: {
    fontSize: typography.body.fontSize,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  stopTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  stopTextDest: {
    color: colors.success,
    fontWeight: '800',
  },
  stopBadgeCurrent: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  stopBadgeTextCurrent: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  stopBadgeDest: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  stopBadgeTextDest: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  transferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  transferText: {
    flex: 1,
    fontSize: typography.bodySecondary.fontSize,
    lineHeight: typography.bodySecondary.lineHeight,
    color: '#92400E',
    fontWeight: '700',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
