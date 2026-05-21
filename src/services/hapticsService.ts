import * as Haptics from 'expo-haptics';

export function triggerSelectionHaptic() {
  return Haptics.selectionAsync();
}

export function triggerSoftImpactHaptic() {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function triggerMediumImpactHaptic() {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function triggerStrongImpactHaptic() {
  return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

export function triggerSuccessHaptic() {
  return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function triggerWarningHaptic() {
  return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

export function triggerInfoHaptic() {
  return triggerSoftImpactHaptic();
}

export function triggerTransferHaptic() {
  return triggerMediumImpactHaptic();
}

export function triggerArrivalHaptic() {
  return triggerStrongImpactHaptic();
}

export function triggerErrorHaptic() {
  return triggerWarningHaptic();
}
