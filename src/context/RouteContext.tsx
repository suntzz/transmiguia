import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  RouteSelectionState,
  clearRouteSelection,
  createInitialRouteSelection,
  selectDestination,
} from '@/src/core/navigation/destinationFlow';
import { TransmilenioStation, getAllStations } from '@/src/services/transmilenioService';

type RouteContextValue = {
  originStation: TransmilenioStation | null;
  /**
   * Solo es un destino real cuando `hasSelectedDestination` es true. Antes de
   * eso es un valor de relleno para mantener el tipado y NO debe anunciarse.
   */
  destinationStation: TransmilenioStation;
  hasSelectedDestination: boolean;
  tripFinished: boolean;
  setOriginStation: (station: TransmilenioStation | null) => void;
  setDestinationStation: (station: TransmilenioStation) => void;
  clearDestination: () => void;
  finishTrip: () => void;
  resetTrip: () => void;
};

const placeholderDestination =
  getAllStations({ includeInactive: false })[0] ?? getAllStations({ includeInactive: true })[0];

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

export function RouteProvider({ children }: PropsWithChildren) {
  const [selection, setSelection] = useState<RouteSelectionState>(() =>
    createInitialRouteSelection(placeholderDestination!)
  );

  const setOriginStation = useCallback((station: TransmilenioStation | null) => {
    setSelection((current) => ({ ...current, originStation: station }));
  }, []);

  const setDestinationStation = useCallback((station: TransmilenioStation) => {
    setSelection((current) => selectDestination(current, station));
  }, []);

  const clearDestination = useCallback(() => {
    setSelection((current) => clearRouteSelection(current, placeholderDestination!));
  }, []);

  const finishTrip = useCallback(() => {
    setSelection((current) => ({ ...current, tripFinished: true }));
  }, []);

  // Un viaje nuevo siempre empieza sin destino ni origen heredados del anterior.
  const resetTrip = useCallback(() => {
    setSelection((current) => clearRouteSelection(current, placeholderDestination!));
  }, []);

  const value = useMemo(
    () => ({
      originStation: selection.originStation,
      destinationStation: selection.destinationStation,
      hasSelectedDestination: selection.hasSelectedDestination,
      tripFinished: selection.tripFinished,
      setOriginStation,
      setDestinationStation,
      clearDestination,
      finishTrip,
      resetTrip,
    }),
    [
      clearDestination,
      finishTrip,
      resetTrip,
      selection,
      setDestinationStation,
      setOriginStation,
    ]
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRouteSelection() {
  const context = useContext(RouteContext);

  if (!context) {
    throw new Error('useRouteSelection debe usarse dentro de RouteProvider.');
  }

  return context;
}
