import React from 'react';
import {
  CommonActions,
  createNavigationContainerRef,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BusTrackingScreen } from '@/src/screens/BusTrackingScreen';
import { DestinationScreen } from '@/src/screens/DestinationScreen';
import { DropAlertScreen } from '@/src/screens/DropAlertScreen';
import { HomeScreen } from '@/src/screens/HomeScreen';
import { RoutePreviewScreen } from '@/src/screens/RoutePreviewScreen';
import { StationSelectorScreen } from '@/src/screens/StationSelectorScreen';
import { StationAlertScreen } from '@/src/screens/StationAlertScreen';
import { StationArrivalScreen } from '@/src/screens/StationArrivalScreen';
import { VoicePrototypeScreen } from '@/src/screens/VoicePrototypeScreen';
import { WalkingGuideScreen } from '@/src/screens/WalkingGuideScreen';
import { destroyVoiceRecognition } from '@/src/services/voiceService';
import { RootStackParamList } from '@/src/utils/navigation';
import { colors } from '@/src/utils/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToDemoStart() {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [{ name: 'Home' }, { name: 'VoicePrototype' }],
    })
  );
}

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
  },
};

export function AppNavigator() {
  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onStateChange={() => {
        void destroyVoiceRecognition();
      }}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '800',
            color: colors.surface,
          },
          headerStyle: {
            backgroundColor: colors.primary,
          },
          headerTintColor: colors.surface,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'Guia TransMilenio',
          }}
        />
        <Stack.Screen
          name="StationSelector"
          component={StationSelectorScreen}
          options={{
            title: 'Seleccionar estacion',
          }}
        />
        <Stack.Screen
          name="VoicePrototype"
          component={VoicePrototypeScreen}
          options={{
            title: 'Simulacion de voz',
          }}
        />
        <Stack.Screen
          name="RoutePreview"
          component={RoutePreviewScreen}
          options={{
            title: 'Resumen de ruta',
          }}
        />
        <Stack.Screen
          name="WalkingGuide"
          component={WalkingGuideScreen}
          options={{
            title: 'Guia peatonal',
          }}
        />
        <Stack.Screen
          name="StationAlert"
          component={StationAlertScreen}
          options={{
            title: 'Proximidad',
          }}
        />
        <Stack.Screen
          name="StationArrival"
          component={StationArrivalScreen}
          options={{
            title: 'Llegada a estacion',
          }}
        />
        <Stack.Screen
          name="BusTracking"
          component={BusTrackingScreen}
          options={{
            title: 'Seguimiento en bus',
          }}
        />
        <Stack.Screen
          name="DropAlert"
          component={DropAlertScreen}
          options={{
            title: 'Aviso de bajada',
          }}
        />
        <Stack.Screen
          name="Destination"
          component={DestinationScreen}
          options={{
            title: 'Destino final',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
