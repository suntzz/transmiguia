import { expoHapticsGateway } from '@/src/infrastructure/hardware/ExpoHapticsGateway';

export function triggerSelectionHaptic() {
  return expoHapticsGateway.triggerSelection();
}

export function triggerSoftImpactHaptic() {
  return expoHapticsGateway.triggerSoftImpact();
}

export function triggerMediumImpactHaptic() {
  return expoHapticsGateway.triggerMediumImpact();
}

export function triggerStrongImpactHaptic() {
  return expoHapticsGateway.triggerStrongImpact();
}

export function triggerSuccessHaptic() {
  return expoHapticsGateway.triggerSuccess();
}

export function triggerWarningHaptic() {
  return expoHapticsGateway.triggerWarning();
}

export function triggerInfoHaptic() {
  return expoHapticsGateway.triggerInfo();
}

export function triggerTransferHaptic() {
  return expoHapticsGateway.triggerTransfer();
}

export function triggerArrivalHaptic() {
  return expoHapticsGateway.triggerArrival();
}

export function triggerErrorHaptic() {
  return expoHapticsGateway.triggerError();
}
