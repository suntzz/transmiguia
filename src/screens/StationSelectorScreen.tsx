import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AccessibleButton } from '@/src/components/AccessibleButton';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useRouteSelection } from '@/src/context/RouteContext';
import { useScreenAnnouncement } from '@/src/hooks/useScreenAnnouncement';
import { useStopSpeechOnBlur } from '@/src/hooks/useStopSpeechOnBlur';
import {
  triggerSelectionHaptic,
  triggerSuccessHaptic,
  triggerWarningHaptic,
} from '@/src/services/hapticsService';
import {
  speakManagedText,
  speakVoiceError,
} from '@/src/services/speechService';
import {
  TransmilenioStation,
  getAllStations,
  getAllStationSpeechTerms,
  refreshStationStatuses,
  resolveStationAvailability,
  resolveStationFromSpeech,
  searchStations,
} from '@/src/services/transmilenioService';
import {
  configureVoiceRecognition,
  destroyVoiceRecognition,
  ensureVoicePermission,
  normalizeVoiceErrorMessage,
  startVoiceRecognition,
  stopVoiceRecognition,
} from '@/src/services/voiceService';
import { RootStackParamList } from '@/src/utils/navigation';
import { borders, colors, radius, spacing } from '@/src/utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'StationSelector'>;

function getStationResolutionMessage(result: ReturnType<typeof resolveStationFromSpeech>) {
  if (result.reason === 'ambiguous') {
    const suggestions = result.candidates
      ?.slice(0, 2)
      .map((station) => station.name)
      .join(' o ');

    return suggestions
      ? `No quedo claro si dijiste ${suggestions}. Di el nombre completo o usa la lista manual.`
      : 'No quedo clara la estacion. Di el nombre completo o usa la lista manual.';
  }

  return 'No se reconocio una estacion valida. Intenta nuevamente o usa la lista manual.';
}

export function StationSelectorScreen({ navigation }: Props) {
  const {
    destinationStation,
    hasSelectedDestination,
    setDestinationStation,
  } = useRouteSelection();
  const [query, setQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string | null>('Zona A - Caracas');
  const [isListening, setIsListening] = useState(false);
  const [partialHeardText, setPartialHeardText] = useState('');
  const [finalHeardText, setFinalHeardText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [allStations, setAllStations] = useState<TransmilenioStation[]>(() =>
    getAllStations({ includeInactive: true })
  );

  // Ref to hold the latest applyVoiceDestination without adding it to the useEffect deps
  const applyVoiceDestinationRef = useRef<((text: string) => Promise<void>) | null>(null);

  useScreenAnnouncement(
    'Seleccion de estacion. Puedes decir un destino real, buscar por nombre, o usar el selector de zonas.'
  );
  useStopSpeechOnBlur();

  const zones = useMemo(() => Array.from(new Set(allStations.map(s => s.troncal))).sort(), [allStations]);
  const stationSpeechContext = useMemo(() => getAllStationSpeechTerms(), []);

  useEffect(() => {
    let active = true;

    const loadStationStatuses = async () => {
      const stations = await refreshStationStatuses();

      if (active) {
        setAllStations(stations);
      }
    };

    void loadStationStatuses();

    return () => {
      active = false;
    };
  }, []);

  const displayedStations = useMemo(() => {
    let base: TransmilenioStation[];
    if (query.trim()) {
      base = searchStations(query, { includeInactive: true });
    } else if (selectedZone) {
      base = allStations.filter(s => s.troncal === selectedZone);
    } else {
      return [];
    }
    // Pin the selected station to the top
    const isSelected = (s: TransmilenioStation) =>
      hasSelectedDestination && s.id === destinationStation.id;
    const selected = base.filter(isSelected);
    const rest = base.filter(s => !isSelected(s));
    return [...selected, ...rest];
  }, [allStations, destinationStation.id, hasSelectedDestination, query, selectedZone]);

  const handleSelect = useCallback(async (station: TransmilenioStation) => {
    const availability = resolveStationAvailability(station);

    if (!availability) {
      const message = 'No fue posible validar la disponibilidad de la estacion seleccionada.';
      setVoiceError(message);
      await triggerWarningHaptic();
      await speakManagedText(message, {
        key: 'station-selector-unavailable-validation',
        minIntervalMs: 0,
        interrupt: true,
      });
      return;
    }

    setPartialHeardText('');
    setFinalHeardText(availability.resolvedStation.name);
    setDestinationStation(availability.resolvedStation);

    if (availability.wasRedirected && availability.message) {
      setVoiceError(availability.message);
      await triggerWarningHaptic();
      await speakManagedText(availability.message, {
        key: `station-selector-inactive-${availability.requestedStation.id}`,
        minIntervalMs: 0,
        interrupt: true,
      });
    } else {
      setVoiceError(null);
      await triggerSuccessHaptic();
    }

    navigation.replace('RoutePreview');
  }, [navigation, setDestinationStation]);

  const applyVoiceDestination = useCallback(
    async (nextText: string) => {
      setFinalHeardText(nextText);
      const match = resolveStationFromSpeech(nextText);

      if (!match.station || match.reason === 'ambiguous' || match.reason === 'fuzzy') {
        setQuery(nextText);
        setSelectedZone(null);
        setVoiceError(
          match.reason === 'fuzzy' || match.reason === 'ambiguous'
            ? getStationResolutionMessage(match)
            : 'No te escuche bien, intenta otra vez o elige una opcion de la lista.'
        );
        await speakVoiceError();
        await triggerWarningHaptic();
        return;
      }

      setIsListening(false);
      await stopVoiceRecognition();
      await handleSelect(match.station);
    },
    [handleSelect]
  );

  // Keep the ref always pointing to the latest version of applyVoiceDestination
  // This avoids re-running the useEffect (and destroying Voice) on every render
  useEffect(() => {
    applyVoiceDestinationRef.current = applyVoiceDestination;
  }, [applyVoiceDestination]);

  // Configure Voice only ONCE on mount; use the ref for callbacks so this effect is stable
  useEffect(() => {
    const setupVoice = async () => {
      await configureVoiceRecognition({
        onStart: () => {
          setIsListening(true);
          setVoiceError(null);
          setPartialHeardText('');
          setFinalHeardText('');
        },
        onPartialResults: (text) => {
          setPartialHeardText(text);
        },
        onResults: (text) => {
          setPartialHeardText('');
          setFinalHeardText(text);
          void applyVoiceDestinationRef.current?.(text);
        },
        onEnd: () => {
          setIsListening(false);
        },
        onError: (error, message) => {
          setIsListening(false);
          const normalized = normalizeVoiceErrorMessage(error, message);
          setVoiceError(normalized);
          void speakManagedText(normalized, {
            key: `station-selector-voice-error-${normalized}`,
            minIntervalMs: 5000,
            interrupt: true,
          });
          void triggerWarningHaptic();
        },
      });
    };

    void setupVoice();

    return () => {
      setIsListening(false);
      void destroyVoiceRecognition();
    };
  }, []);

  const handleListen = async () => {
    if (isListening) {
      await stopVoiceRecognition();
      setIsListening(false);
      return;
    }

    setVoiceError(null);
    setPartialHeardText('');
    setFinalHeardText('');

    const microphoneGranted = await ensureVoicePermission();

    if (!microphoneGranted) {
      const message = 'Debes conceder permiso de micrófono para escuchar el destino.';
      setVoiceError(message);
      await speakManagedText(message, {
        key: 'station-selector-microphone',
        minIntervalMs: 5000,
        interrupt: true,
      });
      await triggerWarningHaptic();
      return;
    }

    try {
      await startVoiceRecognition('es-CO', stationSpeechContext);
    } catch (error) {
      const message = normalizeVoiceErrorMessage('start-error', String(error));
      setVoiceError(message);
      setIsListening(false);
      await speakManagedText(message, {
        key: `station-selector-start-${message}`,
        minIntervalMs: 5000,
        interrupt: true,
      });
      await triggerWarningHaptic();
    }
  };

  return (
    <ScreenContainer>
      <Text accessibilityRole="header" style={styles.title}>
        Elegir estacion de destino
      </Text>
      <View style={styles.routeCard}>
        <Text style={styles.routeLabel}>Origen → Destino</Text>
        <View style={styles.routeRow}>
          <View style={[styles.routeBadge, styles.originBadge]}>
            <Text style={styles.originBadgeText}>Ubicacion actual</Text>
          </View>
            <Text style={styles.routeArrow}>→</Text>
          <View style={[styles.routeBadge, styles.destinationBadge]}>
            <Text style={styles.destinationBadgeText}>
              {hasSelectedDestination ? destinationStation.name : 'Sin seleccionar'}
            </Text>
          </View>
        </View>
      </View>
      <AccessibleButton
        label={isListening ? 'Detener escucha' : 'Escuchar destino por voz'}
        hint="Activa el microfono para decir el nombre de una estacion"
        accessibilityLabel={
          isListening
            ? 'Detener escucha del destino'
            : 'Escuchar destino por voz'
        }
        onPress={() => {
          void handleListen();
        }}
      />

      {isListening || partialHeardText || finalHeardText || voiceError ? (
        <View style={styles.voiceCard}>
          <View style={styles.voiceHeader}>
            <Text style={styles.voiceLabel}>Texto en vivo</Text>
            {isListening ? <Text style={styles.voiceBadge}>Escuchando</Text> : null}
          </View>
          <Text style={[styles.voiceValue, !partialHeardText && styles.voicePlaceholder]}>
            {isListening
              ? partialHeardText || 'Habla ahora.'
              : 'Activa el microfono para ver lo que dices.'}
          </Text>
          <Text style={styles.voiceLabel}>Resultado final</Text>
          <Text style={[styles.voiceFinalValue, !finalHeardText && styles.voicePlaceholder]}>
            {finalHeardText || 'Esperando resultado final.'}
          </Text>
          {voiceError ? <Text style={styles.voiceError}>{voiceError}</Text> : null}
        </View>
      ) : null}

      <Text style={[styles.subtitle, { marginTop: spacing.md }]}>
        O elige el destino manualmente:
      </Text>

      <TextInput
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          if (text.trim().length > 0) {
            setSelectedZone(null);
          } else if (!selectedZone && zones.length > 0) {
            setSelectedZone(zones[0]);
          }
        }}
        placeholder="Buscar estación por nombre"
        placeholderTextColor={colors.textSoft}
        accessibilityLabel="Buscar estación de TransMilenio por texto"
        accessibilityHint="Escribe el nombre de la estación para filtrar la lista"
        style={styles.searchInput}
      />

      {!query ? (
        <View style={styles.zoneSliderContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneSlider}>
            {zones.map(zone => {
              const isActive = selectedZone === zone;
              return (
                <Pressable
                  key={zone}
                  onPress={() => {
                    void triggerSelectionHaptic();
                    setSelectedZone(isActive ? null : zone);
                  }}
                  style={[styles.zonePill, isActive && styles.zonePillActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Troncal ${zone}. ${isActive ? 'Filtro seleccionado' : 'Toca para filtrar'}`}>
                  <Text style={[styles.zonePillText, isActive && styles.zonePillTextActive]}>
                    {zone.replace('Zona ', '')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      <View style={styles.list}>
        {displayedStations.length === 0 && !query ? (
          <Text style={styles.emptyText}>Selecciona una zona arriba para ver sus estaciones.</Text>
        ) : displayedStations.map((station) => {
          const selected = hasSelectedDestination && destinationStation.id === station.id;

          return (
            <Pressable
              key={station.id}
              accessible={true}
              onPress={() => {
                void handleSelect(station);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Estación ${station.name}. Troncal ${station.troncal}.${station.isActive === false ? ' No disponible actualmente.' : ''}${selected ? ' Destino seleccionado actualmente.' : ''}`}
              accessibilityHint="Toca dos veces para elegir esta estación como tu destino de viaje"
              accessibilityState={{ selected }}
              style={({ pressed }) => [
                styles.stationButton,
                station.isActive === false && styles.stationButtonInactive,
                selected && styles.stationButtonSelected,
                pressed && styles.stationButtonPressed,
              ]}
              onPressIn={() => {
                void triggerSelectionHaptic();
              }}>
              <View style={styles.stationHeader}>
                <Text
                  allowFontScaling={true}
                  style={[styles.stationName, selected && styles.stationNameSelected]}>
                  {station.name}
                </Text>
                {station.isActive === false ? (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>No disponible</Text>
                  </View>
                ) : selected ? (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>Destino</Text>
                  </View>
                ) : null}
              </View>
              <Text allowFontScaling={true} style={styles.stationMeta}>
                {station.troncal} • Orden {station.order}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <AccessibleButton
        label="Volver al inicio"
        variant="secondary"
        hint="Regresa a la pantalla principal sin cambiar el flujo"
        accessibilityLabel="Volver al inicio"
        onPress={() => navigation.navigate('Home')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
  },
  routeCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  routeLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    color: '#FCE9EC',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routeArrow: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.surface,
    fontWeight: '800',
  },
  routeBadge: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  originBadge: {
    backgroundColor: '#8E0012',
  },
  destinationBadge: {
    backgroundColor: colors.surface,
  },
  originBadgeText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    color: colors.surface,
  },
  destinationBadgeText: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  searchInput: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  zoneSliderContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  zoneSlider: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  zonePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: borders.standard,
    borderColor: colors.border,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zonePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryPressed,
  },
  zonePillText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  zonePillTextActive: {
    color: colors.textInverse,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.lg,
  },
  voiceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.accent,
    padding: spacing.md,
    gap: spacing.xs,
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  voiceBadge: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.accentText,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  voiceLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMuted,
  },
  voiceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  voiceFinalValue: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.text,
  },
  voicePlaceholder: {
    color: colors.textSoft,
    fontWeight: '600',
  },
  voiceError: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.error,
    fontWeight: '800',
  },
  list: {
    gap: spacing.md,
  },
  stationButton: {
    minHeight: 76,
    borderRadius: radius.md,
    borderWidth: borders.standard,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    gap: 4,
  },
  stationButtonInactive: {
    borderColor: colors.borderMuted,
    backgroundColor: colors.surfaceMuted,
    opacity: 0.7,
  },
  stationButtonSelected: {
    borderColor: colors.primary,
    borderWidth: borders.bold,
    backgroundColor: colors.primarySurface,
  },
  stationButtonPressed: {
    opacity: 0.85,
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  stationName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
  },
  stationNameSelected: {
    color: colors.primary,
  },
  selectedBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.primary,
  },
  inactiveBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  selectedBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inactiveBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stationMeta: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
});
