export type TTSOptions = {
  language?: string;
  rate?: number;
  pitch?: number;
};

export type SpeakManagedOptions = {
  key?: string;
  minIntervalMs?: number;
  interrupt?: boolean;
  pauseMs?: number;
  ignoreGlobalCooldown?: boolean;
};

export interface ITTSGateway {
  speak(message: string, options?: SpeakManagedOptions): Promise<boolean>;
  stop(): Promise<boolean>;
  isSpeaking(): boolean;

  getQueuedCount(): number;
  getCurrentQueuedMessages(): string[];
  waitForNarrationPause(ms?: number): Promise<void>;
  clearMemory(): void;
}
