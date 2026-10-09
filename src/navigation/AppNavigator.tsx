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
import { OnboardingScreen } from '@/src/screens/OnboardingScreen';
import { PermissionsScreen } from '@/src/screens/PermissionsScreen';
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

export function returnToHomeFromDemo() {
  if (!navigationRef.isReady()) {
    return;
  }

  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Home' }],
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
            fontSize: 18,
            fontWeight: '700',
            color: colors.text,
          },
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.primary,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          contentStyle: {
            backgroundColor: colors.background,
          },
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            title: 'TransMilenio Accesible',
            headerShown: false, // The new HomeScreen has a custom, modern accessible header built-in!
          }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{
            title: 'Bienvenida',
          }}
        />
        <Stack.Screen
          name="Permissions"
          component={PermissionsScreen}
          options={{
            title: 'Permisos de Acceso',
          }}
        />
        <Stack.Screen
          name="StationSelector"
          component={StationSelectorScreen}
          options={{
            title: 'Seleccionar Estación',
          }}
        />
        <Stack.Screen
          name="VoicePrototype"
          component={VoicePrototypeScreen}
          options={{
            title: 'Navegación por Voz',
          }}
        />
        <Stack.Screen
          name="RoutePreview"
          component={RoutePreviewScreen}
          options={{
            title: 'Resumen de Ruta',
          }}
        />
        <Stack.Screen
          name="WalkingGuide"
          component={WalkingGuideScreen}
          options={{
            title: 'Guía Peatonal',
          }}
        />
        <Stack.Screen
          name="StationAlert"
          component={StationAlertScreen}
          options={{
            title: 'Aviso de Proximidad',
          }}
        />
        <Stack.Screen
          name="StationArrival"
          component={StationArrivalScreen}
          options={{
            title: 'Llegada a Estación',
          }}
        />
        <Stack.Screen
          name="BusTracking"
          component={BusTrackingScreen}
          options={{
            title: 'Seguimiento en Bus',
          }}
        />
        <Stack.Screen
          name="DropAlert"
          component={DropAlertScreen}
          options={{
            title: 'Aviso de Bajada',
          }}
        />
        <Stack.Screen
          name="Destination"
          component={DestinationScreen}
          options={{
            title: 'Destino Final',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
