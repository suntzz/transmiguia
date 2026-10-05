import * as Speech from 'expo-speech';
import type {
  ITTSGateway,
  SpeakManagedOptions,
  TTSOptions,
} from '@/src/domain/gateways/ITTSGateway';

const DEFAULT_OPTIONS: Speech.SpeechOptions = {
  language: 'es-CO',
  rate: 0.98,
  pitch: 1,
};

type SpeechMemoryEntry = {
  message: string;
  timestamp: number;
};

type QueuedSpeechEntry = {
  id: number;
  message: string;
};

const GLOBAL_SPEECH_COOLDOWN_MS = 3500;

export class ExpoSpeechTTSGateway implements ITTSGateway {
  private speechMemory = new Map<string, SpeechMemoryEntry>();
  private speechQueue: Promise<boolean> = Promise.resolve(false);
  private speechGeneration = 0;
  private isSpeakingInternal = false;
  private queuedMessages: QueuedSpeechEntry[] = [];
  private nextQueuedMessageId = 0;
  private lastSpeechStartedAt = 0;
  private lastSpeechFinishedAt = 0;
  private lastGlobalMessageTimestamp = 0;
  private defaultOptions: TTSOptions;

  constructor(options?: TTSOptions) {
    this.defaultOptions = { ...DEFAULT_OPTIONS, ...options };
  }

  private log(message: string, details?: Record<string, unknown>) {
    if (typeof __DEV__ === 'undefined' || !__DEV__) {
      return;
    }


    if (details) {
      console.info('[SpeechGateway]', message, details);
      return;
    }

    console.info('[SpeechGateway]', message);
  }

  private shouldSpeak(message: string, key: string, minIntervalMs: number): boolean {
    const previous = this.speechMemory.get(key);

    if (!previous) {
      return true;
    }

    const enoughTimePassed = Date.now() - previous.timestamp >= minIntervalMs;
    const changedMessage = previous.message !== message;

    return enoughTimePassed || changedMessage;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private removeQueuedMessageById(queueEntryId: number) {
    const messageIndex = this.queuedMessages.findIndex((entry) => entry.id === queueEntryId);

    if (messageIndex === -1) {
      return;
    }

    this.queuedMessages = [
      ...this.queuedMessages.slice(0, messageIndex),
      ...this.queuedMessages.slice(messageIndex + 1),
    ];
  }

  private estimateSpeechDuration(message: string): number {
    const estimatedDurationMs = message.trim().length * 82;
    return Math.min(15000, Math.max(2800, estimatedDurationMs));
  }

  private async speakWithPause(
    message: string,
    pauseMs: number,
    generation: number,
    ignoreGlobalCooldown = false
  ): Promise<boolean> {
    if (generation !== this.speechGeneration) {
      return false;
    }

    if (this.lastSpeechStartedAt > 0 || this.lastSpeechFinishedAt > 0) {
      const now = Date.now();
      const timeSinceLastSpeechFinished = now - this.lastSpeechFinishedAt;
      const timeSinceLastSpeechStarted = now - this.lastSpeechStartedAt;
      const pauseAfterLastSpeech =
        pauseMs > 0 ? Math.max(0, pauseMs - timeSinceLastSpeechFinished) : 0;
      const globalCooldown =
        ignoreGlobalCooldown || this.lastGlobalMessageTimestamp === 0
          ? 0
          : Math.max(0, GLOBAL_SPEECH_COOLDOWN_MS - timeSinceLastSpeechStarted);
      const waitTime = Math.max(pauseAfterLastSpeech, globalCooldown);

      if (waitTime > 0) {
        await this.wait(waitTime);
      }
    }

    if (generation !== this.speechGeneration) {
      return false;
    }

    await new Promise<void>((resolve) => {
      let finished = false;
      let timeoutId: ReturnType<typeof setTimeout>;

      this.isSpeakingInternal = true;
      this.lastSpeechStartedAt = Date.now();
      this.lastGlobalMessageTimestamp = this.lastSpeechStartedAt;

      const finish = () => {
        if (finished) {
          return;
        }

        finished = true;
        clearTimeout(timeoutId);
        this.isSpeakingInternal = false;
        this.lastSpeechFinishedAt = Date.now();
        resolve();
      };

      timeoutId = setTimeout(() => {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('[SpeechGateway] Se uso el timeout de respaldo para cerrar una locucion.', {
            message,
          });
        }


        finish();
      }, this.estimateSpeechDuration(message));

      Speech.speak(message, {
        ...DEFAULT_OPTIONS,
        ...this.defaultOptions,
        onDone: finish,
        onStopped: finish,
        onError: finish,
      });
    });

    return generation === this.speechGeneration;
  }

  async speak(
    message: string,
    {
      key = message,
      minIntervalMs = 12000,
      interrupt = false,
      pauseMs = 1200,
      ignoreGlobalCooldown = false,
    }: SpeakManagedOptions = {}
  ): Promise<boolean> {
    if (!this.shouldSpeak(message, key, minIntervalMs)) {
      return false;
    }

    if (interrupt) {
      await this.stop();
    }

    const generation = this.speechGeneration;
    const queueEntry = {
      id: (this.nextQueuedMessageId += 1),
      message,
    };
    this.queuedMessages = [...this.queuedMessages, queueEntry];

    this.speechQueue = this.speechQueue.then(async () => {
      const nextQueuedMessage = this.queuedMessages[0];

      if (generation !== this.speechGeneration) {
        this.queuedMessages =
          nextQueuedMessage?.id === queueEntry.id ? this.queuedMessages.slice(1) : this.queuedMessages;
        return false;
      }

      this.speechMemory.set(key, {
        message,
        timestamp: Date.now(),
      });
      this.log('enqueue', {
        key,
        message,
        pauseMs,
        interrupt,
        queueSize: this.queuedMessages.length,
      });

      try {
        return await this.speakWithPause(
          message,
          pauseMs,
          generation,
          ignoreGlobalCooldown || interrupt
        );
      } finally {
        if (this.queuedMessages[0]?.id === queueEntry.id) {
          this.queuedMessages = this.queuedMessages.slice(1);
        } else {
          this.removeQueuedMessageById(queueEntry.id);
        }
      }
    });

    return this.speechQueue;
  }

  async speakAndWait(message: string, options: SpeakManagedOptions = {}): Promise<void> {
    await this.speak(message, options);
    await this.waitForQueue();
  }

  async stop(): Promise<boolean> {
    this.speechGeneration += 1;
    const currentGen = this.speechGeneration;
    this.queuedMessages = [];
    this.isSpeakingInternal = false;

    try {
      const currentlySpeaking = await Speech.isSpeakingAsync();
      if (currentlySpeaking) {
        Speech.stop();
      }
    } catch (err) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn('[SpeechGateway] Error stopping speech', err);
    }


    this.speechQueue = Promise.resolve(false);
    this.lastSpeechFinishedAt = Date.now();

    return currentGen === this.speechGeneration;
  }

  isSpeaking(): boolean {
    return this.isSpeakingInternal;
  }

  getQueuedCount(): number {
    return this.queuedMessages.length;
  }

  getCurrentQueuedMessages(): string[] {
    return this.queuedMessages.map((entry) => entry.message);
  }

  async waitForQueue(): Promise<void> {
    let pendingQueue = this.speechQueue;

    while (true) {
      await pendingQueue;

      if (pendingQueue === this.speechQueue && !this.isSpeakingInternal && this.queuedMessages.length === 0) {
        return;
      }

      pendingQueue = this.speechQueue;
    }
  }

  waitForNarrationPause(ms = 2000): Promise<void> {
    return this.wait(ms);
  }

  async waitForSpeechToSettle(ms = 2000): Promise<void> {
    await this.waitForQueue();
    await this.waitForNarrationPause(ms);
  }

  clearMemory(): void {
    this.speechMemory.clear();
  }
}

export const expoSpeechTTSGateway = new ExpoSpeechTTSGateway();
