import * as Haptics from 'expo-haptics';
import type { IHapticsGateway } from '@/src/domain/gateways/IHapticsGateway';

export class ExpoHapticsGateway implements IHapticsGateway {
  triggerSelection(): Promise<void> {
    return Haptics.selectionAsync();
  }

  triggerSoftImpact(): Promise<void> {
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  triggerMediumImpact(): Promise<void> {
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  triggerStrongImpact(): Promise<void> {
    return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  triggerSuccess(): Promise<void> {
    return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  triggerWarning(): Promise<void> {
    return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }

  triggerInfo(): Promise<void> {
    return this.triggerSoftImpact();
  }

  triggerTransfer(): Promise<void> {
    return this.triggerMediumImpact();
  }

  triggerArrival(): Promise<void> {
    return this.triggerStrongImpact();
  }

  triggerError(): Promise<void> {
    return this.triggerWarning();
  }
}

export const expoHapticsGateway = new ExpoHapticsGateway();
