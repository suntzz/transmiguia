import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { stopSpeaking } from '@/src/services/speechService';

/**
 * Stops any ongoing TTS when the screen loses focus (back navigation, tab switch, etc.)
 */
export function useStopSpeechOnBlur() {
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      void stopSpeaking();
    });

    return unsubscribe;
  }, [navigation]);
}
