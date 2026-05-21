import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import { useDemoMode } from '@/src/context/DemoModeContext';
import { stopSpeaking } from '@/src/services/speechService';

const BACK_ACTION_TYPES = new Set(['GO_BACK', 'POP', 'POP_TO_TOP']);

export function useStopDemoOnBack(enabled = true) {
  const navigation = useNavigation();
  const { demoModeEnabled, stopDemoPresentation } = useDemoMode();

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (!enabled || !demoModeEnabled) {
        return;
      }

      const actionType = event.data.action.type;

      if (!BACK_ACTION_TYPES.has(actionType)) {
        return;
      }

      stopDemoPresentation();
      void stopSpeaking();
    });

    return unsubscribe;
  }, [demoModeEnabled, enabled, navigation, stopDemoPresentation]);
}
