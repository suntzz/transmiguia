import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DemoModeProvider } from '@/src/context/DemoModeContext';
import { RouteProvider } from '@/src/context/RouteContext';
import { AppNavigator } from '@/src/navigation/AppNavigator';
import { refreshStationStatuses } from '@/src/services/transmilenioService';
import { colors } from '@/src/utils/theme';

export default function App() {
  useEffect(() => {
    void refreshStationStatuses().catch(() => undefined);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <DemoModeProvider>
          <RouteProvider>
            <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
            <AppNavigator />
          </RouteProvider>
        </DemoModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
