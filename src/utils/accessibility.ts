import { AccessibilityInfo } from 'react-native';

export async function announce(message: string) {
  await AccessibilityInfo.announceForAccessibility(message);
}
