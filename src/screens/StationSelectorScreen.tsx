import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';

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
import { colors, radius, shadows, spacing, touchTargets } from '@/src/utils/theme';

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
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Elegir estación de destino
        </Text>
        <Text style={styles.subtitle}>
          Busca por nombre, explora por troncal o usa tu voz
        </Text>
      </View>

      {/* Selected Route Summary Card */}
      <View style={styles.routeCard}>
        <View style={styles.routeHeader}>
          <MaterialIcons name="route" size={18} color={colors.primary} />
          <Text style={styles.routeLabel}>Trayecto planeado</Text>
        </View>
        <View style={styles.routeRow}>
          <View style={styles.originBadge}>
            <Text style={styles.badgeSublabel}>ORIGEN</Text>
            <Text numberOfLines={1} style={styles.originBadgeText}>Ubicación actual</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={18} color={colors.primary} />
          <View style={[styles.destinationBadge, hasSelectedDestination && styles.destinationBadgeSelected]}>
            <Text style={[styles.badgeSublabel, hasSelectedDestination && styles.badgeSublabelSelected]}>DESTINO</Text>
            <Text numberOfLines={1} style={[styles.destinationBadgeText, hasSelectedDestination && styles.destinationBadgeTextSelected]}>
              {hasSelectedDestination ? destinationStation.name : 'Sin seleccionar'}
            </Text>
          </View>
        </View>
      </View>

      {/* Voice Assistant Search Button */}
      <AccessibleButton
        label={isListening ? 'Detener escucha' : 'Buscar destino por voz'}
        variant={isListening ? 'accent' : 'secondary'}
        icon={<MaterialIcons name={isListening ? 'mic-off' : 'mic'} size={20} color={isListening ? colors.accentText : colors.primary} />}
        hint="Activa el micrófono para decir el nombre de una estación"
        accessibilityLabel={
          isListening
            ? 'Detener escucha del destino'
            : 'Buscar destino por voz con micrófono'
        }
        onPress={() => {
          void handleListen();
        }}
      />

      {isListening || partialHeardText || finalHeardText || voiceError ? (
        <View style={styles.voiceCard}>
          <View style={styles.voiceHeader}>
            <View style={styles.voiceHeaderTitleRow}>
              <MaterialIcons name="hearing" size={18} color={colors.primary} />
              <Text style={styles.voiceLabel}>Transcripción en vivo</Text>
            </View>
            {isListening ? (
              <View style={styles.listeningBadge}>
                <View style={styles.listeningDot} />
                <Text style={styles.voiceBadge}>Escuchando</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.voiceValue, !partialHeardText && styles.voicePlaceholder]}>
            {isListening
              ? partialHeardText || 'Habla ahora claro y cerca al micrófono...'
              : 'Resultado de voz procesado.'}
          </Text>
          {finalHeardText ? (
            <View style={styles.voiceFinalRow}>
              <Text style={styles.voiceFinalLabel}>Detectado:</Text>
              <Text style={styles.voiceFinalValue}>{finalHeardText}</Text>
            </View>
          ) : null}
          {voiceError ? (
            <View style={styles.voiceErrorRow}>
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text style={styles.voiceError}>{voiceError}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Search Input Container */}
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={22} color={colors.textSecondary} style={styles.searchIcon} />
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
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Buscar estación de TransMilenio por texto"
          accessibilityHint="Escribe el nombre de la estación para filtrar la lista"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
            onPress={() => setQuery('')}
            hitSlop={touchTargets.hitSlop}
            style={styles.clearSearchButton}>
            <MaterialIcons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {/* Troncal Filter Chips */}
      {!query ? (
        <View style={styles.zoneSliderContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.zoneSlider}>
            {zones.map((zone) => {
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

      {/* Station List */}
      <View style={styles.list}>
        {displayedStations.length === 0 && !query ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="map" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyText}>Selecciona una troncal arriba para explorar sus estaciones.</Text>
          </View>
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
              <View style={styles.stationContentRow}>
                <View style={[styles.stationIconCircle, selected && styles.stationIconCircleSelected]}>
                  <MaterialIcons
                    name={selected ? 'place' : 'directions-bus'}
                    size={20}
                    color={selected ? colors.primary : colors.textSecondary}
                  />
                </View>
                <View style={styles.stationDetails}>
                  <Text
                    allowFontScaling={true}
                    style={[styles.stationName, selected && styles.stationNameSelected]}>
                    {station.name}
                  </Text>
                  <Text allowFontScaling={true} style={styles.stationMeta}>
                    {station.troncal} • Parada #{station.order}
                  </Text>
                </View>
                {station.isActive === false ? (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Cerrada</Text>
                  </View>
                ) : selected ? (
                  <View style={styles.selectedBadge}>
                    <MaterialIcons name="check" size={14} color={colors.textInverse} />
                    <Text style={styles.selectedBadgeText}>Destino</Text>
                  </View>
                ) : (
                  <MaterialIcons name="chevron-right" size={22} color={colors.borderMedium} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      <AccessibleButton
        label="Volver al inicio"
        variant="secondary"
        icon={<MaterialIcons name="arrow-back" size={20} color={colors.text} />}
        hint="Regresa a la pantalla principal sin cambiar el flujo"
        accessibilityLabel="Volver al inicio"
        onPress={() => navigation.navigate('Home')}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    paddingVertical: spacing.xs,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },

  // Route Summary Card
  routeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.subtle,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  originBadge: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  destinationBadge: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  destinationBadgeSelected: {
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  badgeSublabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.4,
  },
  badgeSublabelSelected: {
    color: colors.primary,
  },
  originBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  destinationBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  destinationBadgeTextSelected: {
    color: colors.primary,
  },

  // Search Input Container
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: 52,
    ...shadows.subtle,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  clearSearchButton: {
    padding: spacing.xs,
  },

  // Troncal Slider
  zoneSliderContainer: {
    marginVertical: spacing.xxs,
  },
  zoneSlider: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  zonePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zonePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  zonePillText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  zonePillTextActive: {
    color: colors.textInverse,
  },

  // Voice Feedback Card
  voiceCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.md,
    gap: spacing.xs,
    ...shadows.subtle,
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  voiceLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  listeningDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warning,
  },
  voiceBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  voiceValue: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.text,
  },
  voicePlaceholder: {
    color: colors.textSecondary,
    fontWeight: '400',
  },
  voiceFinalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  voiceFinalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  voiceFinalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  voiceErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  voiceError: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
    flex: 1,
  },

  // Station List
  list: {
    gap: spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 280,
  },
  stationButton: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
    ...shadows.subtle,
  },
  stationButtonInactive: {
    opacity: 0.6,
    backgroundColor: colors.surfaceSubtle,
  },
  stationButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  stationButtonPressed: {
    opacity: 0.88,
  },
  stationContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationIconCircleSelected: {
    backgroundColor: colors.primaryLight,
  },
  stationDetails: {
    flex: 1,
    gap: 2,
  },
  stationName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  stationNameSelected: {
    color: colors.primary,
  },
  stationMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '400',
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: colors.primary,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
    textTransform: 'uppercase',
  },
  inactiveBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: colors.surfaceSubtle,
  },
  inactiveBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
