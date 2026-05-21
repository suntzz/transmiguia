import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { TransmilenioStation, getAllStations } from '@/src/services/transmilenioService';

type RouteContextValue = {
  originStation: TransmilenioStation | null;
  destinationStation: TransmilenioStation;
  hasSelectedDestination: boolean;
  tripFinished: boolean;
  setOriginStation: (station: TransmilenioStation | null) => void;
  setDestinationStation: (station: TransmilenioStation) => void;
  finishTrip: () => void;
  resetTrip: () => void;
};

const defaultDestination =
  getAllStations({ includeInactive: false })[0] ?? getAllStations({ includeInactive: true })[0];

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

export function RouteProvider({ children }: PropsWithChildren) {
  const [originStation, setOriginStation] = useState<TransmilenioStation | null>(null);
  const [destinationStation, setDestinationStationState] = useState<TransmilenioStation>(
    defaultDestination!
  );
  const [hasSelectedDestination, setHasSelectedDestination] = useState(false);
  const [tripFinished, setTripFinished] = useState(false);

  const setDestinationStation = useCallback((station: TransmilenioStation) => {
    setOriginStation(null);
    setDestinationStationState(station);
    setHasSelectedDestination(true);
    setTripFinished(false);
  }, []);

  const finishTrip = useCallback(() => {
    setTripFinished(true);
  }, []);

  const resetTrip = useCallback(() => {
    setTripFinished(false);
  }, []);

  const value = useMemo(
    () => ({
      originStation,
      destinationStation,
      hasSelectedDestination,
      tripFinished,
      setOriginStation,
      setDestinationStation,
      finishTrip,
      resetTrip,
    }),
    [
      destinationStation,
      finishTrip,
      hasSelectedDestination,
      originStation,
      resetTrip,
      setDestinationStation,
      tripFinished,
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
