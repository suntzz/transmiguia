export interface IHapticsGateway {
  triggerSelection(): Promise<void>;
  triggerSoftImpact(): Promise<void>;
  triggerMediumImpact(): Promise<void>;
  triggerStrongImpact(): Promise<void>;
  triggerSuccess(): Promise<void>;
  triggerWarning(): Promise<void>;
  triggerInfo(): Promise<void>;
  triggerTransfer(): Promise<void>;
  triggerArrival(): Promise<void>;
  triggerError(): Promise<void>;
}
